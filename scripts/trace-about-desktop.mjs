import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
await page.waitForSelector('.header__nav-link[href="#about"]');
await page.evaluate(() => {
  window.__trace = [];
  const main = document.getElementById('main-container');
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'attributes') {
        console.log('MUTATION attr', m.attributeName, main.className, main.style.display);
        window.__trace.push({ type: 'attr', attr: m.attributeName, class: main.className, display: main.style.display, t: Date.now() });
      }
      if (m.type === 'childList') {
        console.log('MUTATION childList', m.addedNodes.length, m.removedNodes.length);
        window.__trace.push({ type: 'child', added: m.addedNodes.length, removed: m.removedNodes.length, t: Date.now() });
      }
    }
  });
  obs.observe(main, { attributes: true, childList: true, attributeFilter: ['style','class'] });
});
// Click about link
await page.click('.header__nav-link[href="#about"]');
await page.waitForTimeout(2000);
const trace = await page.evaluate(() => window.__trace);
console.log('TRACE:', trace);
await browser.close();
process.exit(0);
