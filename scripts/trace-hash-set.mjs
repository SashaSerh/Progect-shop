import { chromium, devices } from 'playwright';
const iPhone = devices['iPhone 12'];
const browser = await chromium.launch();
const context = await browser.newContext({ ...iPhone });
const page = await context.newPage();
page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(200);
await page.evaluate(() => {
  window.__events = [];
  const main = document.getElementById('main-container');
  const obs = new MutationObserver(ms => ms.forEach(m => {
    if (m.type === 'attributes') {
      console.log('MUT_ATTR', m.attributeName, main.className, main.style.display);
      window.__events.push({type:'attr',attr:m.attributeName,class:main.className,display:main.style.display, t:Date.now()});
    }
  }));
  obs.observe(main, { attributes: true, attributeFilter: ['style','class'] });
});
console.log('Setting hash to #about');
await page.evaluate(() => { location.hash = '#about'; });
await page.waitForTimeout(1500);
const events = await page.evaluate(() => window.__events);
console.log('EVENTS', events);
await browser.close();
process.exit(0);
