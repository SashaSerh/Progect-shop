#!/usr/bin/env node
/* Visual test using Playwright + pixelmatch
 * Usage: node visual-test.js [--baseline]
 * - With --baseline: writes baseline screenshots to tests/visual/baseline
 * - Otherwise: creates screenshots to tests/visual/latest and compares them
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const BASE_DIR = path.resolve(new URL('.', import.meta.url).pathname);
const OUT_DIR = path.resolve(BASE_DIR, 'latest');
const BASELINE_DIR = path.resolve(BASE_DIR, 'baseline');
const INDEX_HTML = path.resolve(process.cwd(), 'index.html');

const args = process.argv.slice(2);
const createBaseline = args.includes('--baseline');

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function savePNG(buffer, dest) {
  fs.writeFileSync(dest, buffer);
}

async function run() {
  ensureDir(OUT_DIR);
  ensureDir(BASELINE_DIR);

  // Start a local static server so fetch() and components can load correctly
  const server = spawn('python3', ['-m', 'http.server', '8080'], { cwd: process.cwd(), stdio: 'ignore' });

  // Wait for server to be available
  const serverUrl = 'http://localhost:8080';
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const resp = await fetch(serverUrl);
      if (resp.ok) { ready = true; break; }
    } catch(_) {}
    await new Promise(r => setTimeout(r, 200));
  }
  if (!ready) {
    server.kill();
    throw new Error('Local server did not start on port 8080');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, userAgent: 'mobile', deviceScaleFactor: 1 });
  const page = await context.newPage();

  const fileUrl = serverUrl + '/';
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Force system font and disable transitions/animations for deterministic screenshots
  await page.addStyleTag({ content: '* { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; } * { transition: none !important; animation: none !important; }' });

  // Force lazy-loading images to eager so they load in headless mode
  await page.evaluate(() => { document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager'); });

  // Wait for mobile main nav
  await page.waitForSelector('.main-nav-mobile');

  // Click services -> open service list
  await page.click('.main-nav-mobile a[href="#services-page"]');
  // Wait for slide animation to finish and service list links appear
  await page.waitForSelector('.main-nav-mobile__link[href="#service-ac-install"]', { timeout: 2000 });
  // Wait for menu animation class to finish
  // Stabilize rendering after animation and ensure images are decoded
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete), { timeout: 10000 });

  // Take screenshot of the main nav area
  const navEl = await page.locator('.main-nav-mobile').elementHandle();
  const navBuffer = await navEl.screenshot({ type: 'png' });
  const navTarget = path.join(OUT_DIR, 'mobile-nav.png');
  savePNG(navBuffer, navTarget);

  if (createBaseline) {
    fs.copyFileSync(navTarget, path.join(BASELINE_DIR, 'mobile-nav.png'));
    console.log('Baseline created:', path.join(BASELINE_DIR, 'mobile-nav.png'));
  }

  // Click first service
  await page.click('.main-nav-mobile__link[href="#service-ac-install"]');
  // Wait for page slide animation and content load, ensure images are loaded
  await page.waitForSelector('#service-ac-install .service-page__title', { timeout: 4000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete), { timeout: 10000 });
  // screenshot service page content
  const serviceEl = await page.locator('#service-ac-install').elementHandle();
  const serviceBuffer = await serviceEl.screenshot({ type: 'png' });
  const serviceTarget = path.join(OUT_DIR, 'service-ac-install.png');
  savePNG(serviceBuffer, serviceTarget);

  if (createBaseline) {
    fs.copyFileSync(serviceTarget, path.join(BASELINE_DIR, 'service-ac-install.png'));
    console.log('Baseline created:', path.join(BASELINE_DIR, 'service-ac-install.png'));
  }

  await browser.close();
  // Kill local server
  if (server) server.kill();

  if (!createBaseline) {
    // Compare images
    const navBaseline = path.join(BASELINE_DIR, 'mobile-nav.png');
    const serviceBaseline = path.join(BASELINE_DIR, 'service-ac-install.png');
    if (!fs.existsSync(navBaseline) || !fs.existsSync(serviceBaseline)) {
      console.warn('Baseline images not found. Run: npm run visual:create-baseline');
      process.exit(0);
    }

    function compare(imgA, imgB, out) {
      const a = PNG.sync.read(fs.readFileSync(imgA));
      const b = PNG.sync.read(fs.readFileSync(imgB));
      const { width, height } = a;
      const diff = new PNG({ width, height });
      const mismatch = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.14, includeAA: true });
      fs.writeFileSync(out, PNG.sync.write(diff));
      return mismatch;
    }

    const navDiff = compare(navBaseline, path.join(OUT_DIR, 'mobile-nav.png'), path.join(OUT_DIR, 'mobile-nav-diff.png'));
    const serviceDiff = compare(serviceBaseline, path.join(OUT_DIR, 'service-ac-install.png'), path.join(OUT_DIR, 'service-ac-install-diff.png'));

    console.log('nav mismatch pixels:', navDiff);
    console.log('service mismatch pixels:', serviceDiff);
    const navImg = PNG.sync.read(fs.readFileSync(navBaseline));
    const serviceImg = PNG.sync.read(fs.readFileSync(serviceBaseline));
    console.log('nav image size:', navImg.width, 'x', navImg.height, '(' + (navImg.width * navImg.height) + 'px)');
    console.log('service image size:', serviceImg.width, 'x', serviceImg.height, '(' + (serviceImg.width * serviceImg.height) + 'px)');
    console.log('nav mismatch %:', ((navDiff / (navImg.width * navImg.height)) * 100).toFixed(2) + '%');
    console.log('service mismatch %:', ((serviceDiff / (serviceImg.width * serviceImg.height)) * 100).toFixed(2) + '%');

    const totalMismatch = navDiff + serviceDiff;
    // Accept some mismatch due to antialiasing / browser differences on CI
    const ALLOWED_MISMATCH_PERCENT = 0.06; // allow 6% mismatch per image
    const allowedNavMismatch = Math.floor(navImg.width * navImg.height * ALLOWED_MISMATCH_PERCENT);
    const allowedServiceMismatch = Math.floor(serviceImg.width * serviceImg.height * ALLOWED_MISMATCH_PERCENT);
    console.log('allowed nav mismatch', allowedNavMismatch, 'allowed service mismatch', allowedServiceMismatch);
    if (navDiff > allowedNavMismatch || serviceDiff > allowedServiceMismatch) {
      console.error('Visual differences exceed allowed percent threshold. See latest diffs in', OUT_DIR);
      process.exit(2);
    }
    console.log('Visual test passed');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
