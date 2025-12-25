import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await context.newPage();
await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
// Trigger route to #about
await page.evaluate(() => { location.hash = '#about'; });
await page.evaluate(() => { location.hash = '#about'; });
// Wait until about-title exists in DOM (guard for race conditions)
await page.waitForFunction(() => !!document.getElementById('about-title'), { timeout: 7000 });
await page.evaluate(() => { if (typeof switchLanguage === 'function') switchLanguage('uk'); });
await page.waitForTimeout(200);
const title = await page.evaluate(() => document.getElementById('about-title')?.textContent.trim());
const lead = await page.$eval('.about-page__lead', el => el.textContent.trim());
const val1 = await page.$eval('.about-values__item:nth-child(1) h3', el => el.textContent.trim());
const cta = await page.$eval('.about-page__cta .btn', el => el.textContent.trim());
const alt = await page.$eval('.about-values__item:nth-child(1) img', el => el.alt);
console.log('title:', title);
console.log('lead:', lead);
console.log('val1:', val1);
console.log('cta:', cta);
console.log('alt:', alt);
await browser.close();
process.exit(0);
