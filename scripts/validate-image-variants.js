#!/usr/bin/env node
/**
 * Scan products and check local images under picture/conditioners/ have responsive variants:
 * -320w -480w -768w -1200w with same extension.
 * Usage: node scripts/validate-image-variants.js [--fix]
 * If --fix is passed, it will propose (not generate) commands to create missing copies (no real image processing here).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const PRODUCTS_FILE = path.join(ROOT, 'data', 'products.json');
const TARGET_DIR = path.join(ROOT, 'picture', 'conditioners');
const REQUIRED_WIDTHS = [320,480,768,1200];

function loadProducts(){
  try { return JSON.parse(fs.readFileSync(PRODUCTS_FILE,'utf8')); } catch(e){
    console.error('Failed to read products.json', e.message); process.exit(1);
  }
}

function collectImagePaths(product){
  const arr = [];
  if (product.image) arr.push(product.image);
  if (Array.isArray(product.images)) arr.push(...product.images);
  return arr.filter(src => typeof src === 'string' && src.startsWith('picture/conditioners/'));
}

function variantPath(original, width){
  const dot = original.lastIndexOf('.');
  if (dot < 0) return null;
  const base = original.slice(0, dot);
  const ext = original.slice(dot);
  return `${base}-${width}w${ext}`;
}

function fileExists(rel){
  return fs.existsSync(path.join(ROOT, rel));
}

const products = loadProducts();
let totalImages = 0; let missingTotal = 0;
const report = [];

for (const p of products){
  const images = collectImagePaths(p);
  for (const img of images){
    totalImages++;
    const missing = [];
    for (const w of REQUIRED_WIDTHS){
      const v = variantPath(img, w);
      if (!v) continue;
      if (!fileExists(v)) missing.push(v);
    }
    if (missing.length){
      missingTotal += missing.length;
      report.push({ productId: p.id, base: img, missing });
    }
  }
}

if (!report.length){
  console.log(`All responsive variants present for ${totalImages} base image references.`);
  process.exit(0);
}

console.log(`Missing ${missingTotal} variant files across ${report.length} base images.\n`);
for (const r of report){
  console.log(`Product ${r.productId} :: ${r.base}`);
  r.missing.forEach(m => console.log('  - missing', m));
}

if (process.argv.includes('--fix')){
  console.log('\nProposed commands to create placeholder copies (adjust/replace with real resizing logic):');
  for (const r of report){
    const dot = r.base.lastIndexOf('.');
    const baseVariant = r.base; // use existing original (assumed largest) as source
    r.missing.forEach(m => {
      console.log(`# cp ${baseVariant} ${m}`);
    });
  }
  console.log('\n(No files were modified. Implement real image processing if needed.)');
}
