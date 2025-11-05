#!/usr/bin/env node
/*
  Generate responsive variants for images under a folder (default: picture/).
  For each *.jpg|jpeg|png|webp that doesn't already have -<w>w suffix, produce:
  -320w, -480w, -768w, -1200w siblings.

  Usage:
    node scripts/generate-responsive-images.js --dir picture
*/
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const SIZES = [320, 480, 768, 1200];

function parseArgs(argv) {
  const out = {}; let key = null;
  for (const a of argv.slice(2)) {
    if (a.startsWith('--')) { key = a.slice(2); out[key] = true; }
    else if (key) { out[key] = a; key = null; }
  }
  return out;
}

function isVariant(filename) {
  return /-\d+w\.[a-z0-9]+$/i.test(filename);
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED.has(ext)) return;
  const name = path.basename(filePath);
  if (isVariant(name)) return; // skip generated variants
  const dir = path.dirname(filePath);
  const base = path.join(dir, path.basename(filePath, ext));
  const buf = fs.readFileSync(filePath);
  const image = sharp(buf, { failOn: 'none' });
  const meta = await image.metadata();
  const srcWidth = meta.width || 0;
  for (const w of SIZES) {
    // original format variant
    const outOrig = `${base}-${w}w${ext}`;
    if (!fs.existsSync(outOrig)) {
      if (srcWidth && w >= srcWidth) {
        fs.copyFileSync(filePath, outOrig);
      } else {
        await sharp(buf).resize({ width: w, withoutEnlargement: true }).toFile(outOrig);
      }
    }
    // webp variant
    const outWebp = `${base}-${w}w.webp`;
    if (!fs.existsSync(outWebp)) {
      await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outWebp);
    }
    // avif variant
    const outAvif = `${base}-${w}w.avif`;
    if (!fs.existsSync(outAvif)) {
      await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .avif({ quality: 50 })
        .toFile(outAvif);
    }
  }
  // LQIP (very small preview): generate 24px width webp and original format copy
  const lqipWebp = `${base}-lqip.webp`;
  if (!fs.existsSync(lqipWebp)) {
    await sharp(buf).resize({ width: 24, withoutEnlargement: true }).webp({ quality: 45 }).toFile(lqipWebp);
  }
  const lqipOrig = `${base}-lqip${ext}`;
  if (!fs.existsSync(lqipOrig)) {
    await sharp(buf).resize({ width: 24, withoutEnlargement: true }).toFile(lqipOrig);
  }
}

async function* walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const dir = args.dir || 'picture';
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }
  let count = 0;
  for await (const fp of walk(dir)) {
    const ext = path.extname(fp).toLowerCase();
    if (!SUPPORTED.has(ext)) continue;
    await processFile(fp).catch(err => console.error('Error processing', fp, err?.message || err));
    count++;
  }
  console.log(`Responsive variants generated for ~${count} original images in ${dir}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
