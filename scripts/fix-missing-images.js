#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PRODUCTS_JSON = path.resolve('data/products.json');
const PICT_DIR = path.resolve('picture/conditioners');

function loadJson(fp) {
  const txt = fs.readFileSync(fp, 'utf8');
  return JSON.parse(txt);
}
function saveJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function firstExisting(base, exts) {
  for (const ext of exts) {
    const fp = path.join(PICT_DIR, `${base}${ext}`);
    if (fs.existsSync(fp)) return `picture/conditioners/${base}${ext}`;
  }
  return null;
}

function cleanupBrokenNames(dir) {
  const entries = fs.readdirSync(dir);
  const broken = entries.filter(n => /-\d+wjpg$|-\d+wjpeg$/i.test(n));
  for (const name of broken) {
    try { fs.unlinkSync(path.join(dir, name)); } catch {}
  }
  return broken;
}

function main() {
  if (!fs.existsSync(PRODUCTS_JSON)) {
    console.error('products.json not found'); process.exit(1);
  }
  const list = loadJson(PRODUCTS_JSON);
  let updated = 0;

  // Try to fix missing image by matching SKU as filename base
  for (const p of list) {
    if (p && (!p.image || !String(p.image).trim()) && p.sku) {
      const base = String(p.sku).trim();
      const found = firstExisting(base, ['.jpg', '.jpeg', '.png', '.webp', '.avif']);
      if (found) {
        p.image = found;
        p.images = [found];
        p.updatedAt = new Date().toISOString();
        updated++;
      }
    }
  }

  // Save only if any updated
  if (updated > 0) {
    saveJson(PRODUCTS_JSON, list);
    console.log(`Updated ${updated} product(s) with image paths.`);
  } else {
    console.log('No products needed image path fix.');
  }

  // Cleanup broken names like 1.-320wjpg
  if (fs.existsSync(PICT_DIR)) {
    const removed = cleanupBrokenNames(PICT_DIR);
    if (removed.length) console.log(`Removed broken files: ${removed.join(', ')}`);
  }
}

main();
