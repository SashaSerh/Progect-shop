import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';
const iPhone = devices['iPhone 12'];
const outDir = path.join(process.cwd(), 'tests', 'visual', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ ...iPhone, viewport: iPhone.viewport });
const page = await context.newPage();
await page.goto('http://localhost:8000/#about', { waitUntil: 'networkidle' });
const el = await page.$('.about-page');
const filePath = path.join(outDir, 'about-mobile.png');
if (el) {
  await el.screenshot({ path: filePath });
} else {
  await page.screenshot({ path: filePath, fullPage: true });
}
console.log('Saved screenshot to', filePath);
await browser.close();
process.exit(0);
