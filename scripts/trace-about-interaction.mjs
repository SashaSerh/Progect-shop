import { chromium, devices } from 'playwright';
const iphone = devices['iPhone 12'];
const browser = await chromium.launch();
const context = await browser.newContext({ ...iphone });
const page = await context.newPage();
page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
// Ensure mobile menu is available
await page.waitForSelector('.main-nav-mobile');
// Open mobile menu
await page.click('.header__mobile .minimal-menu-btn');
await page.waitForTimeout(200);
// Attach mutation observer in page context
await page.evaluate(() => {
  const main = document.getElementById('main-container');
  window.__trace = { events: [] };
  const obs = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.type === 'attributes') {
        window.__trace.events.push({ type: 'attr', attrName: m.attributeName, class: main.className, display: main.style.display, time: Date.now() });
        console.log('MUTATION attr', m.attributeName, 'class=', main.className, 'display=', main.style.display);
      }
      if (m.type === 'childList') {
        window.__trace.events.push({ type: 'child', added: m.addedNodes.length, removed: m.removedNodes.length, time: Date.now() });
        console.log('MUTATION childList added=', m.addedNodes.length, 'removed=', m.removedNodes.length);
      }
    });
  });
  obs.observe(main, { attributes: true, childList: true, subtree: false, attributeFilter: ['style', 'class'] });
});
// Click About link in mobile nav
await page.click('.mobile-nav__link[href="#about"]');
await page.waitForTimeout(1500);
// Get trace events
const events = await page.evaluate(() => window.__trace.events);
console.log('TRACE EVENTS:', events);
await browser.close();
process.exit(0);
