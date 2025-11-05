#!/usr/bin/env node
/*
  Export products JSON by extracting base64 images into local folder and rewriting paths.
  Usage:
    node scripts/export-to-pictures.js --in <input.json> --out <output.json> --dir picture
  Defaults:
    --in data/products.json
    --out data/products.local.json
    --dir picture
*/
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {}; let key = null;
  for (const a of argv.slice(2)) {
    if (a.startsWith('--')) { key = a.slice(2); out[key] = true; }
    else if (key) { out[key] = a; key = null; }
  }
  return out;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fromDataUrl(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const buf = Buffer.from(b64, 'base64');
  return { mime, buf };
}

function extFromMime(mime) {
  if (!mime) return '.bin';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  const sub = mime.split('/')[1] || 'bin';
  return '.' + sub.replace(/[^a-z0-9]/gi, '').slice(0, 8);
}

function safeName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
}

function processProducts(list, outDir) {
  const result = [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const id = safeName(p.id || 'item');
    const next = { ...p };

    // images array
    const imgs = Array.isArray(p.images) ? p.images : [];
    const newImgs = [];
    imgs.forEach((val, idx) => {
      const parsed = fromDataUrl(val);
      if (parsed) {
        const ext = extFromMime(parsed.mime);
        const fileName = `${id}-${idx}${ext}`;
        const filePath = path.join(outDir, fileName);
        fs.writeFileSync(filePath, parsed.buf);
        newImgs.push(path.join(path.basename(outDir), fileName).replace(/\\/g, '/'));
      } else {
        // keep as-is (URL or relative path)
        newImgs.push(val);
      }
    });

    // single image field
    if (p.image) {
      const parsed = fromDataUrl(p.image);
      if (parsed) {
        const ext = extFromMime(parsed.mime);
        const fileName = `${id}-0${ext}`;
        const filePath = path.join(outDir, fileName);
        fs.writeFileSync(filePath, parsed.buf);
        next.image = path.join(path.basename(outDir), fileName).replace(/\\/g, '/');
        if (!newImgs.length) newImgs.push(next.image);
      } else {
        next.image = p.image;
        if (!newImgs.length && typeof p.image === 'string') newImgs.push(p.image);
      }
    }

    if (newImgs.length) next.images = newImgs;
    result.push(next);
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  const inPath = args.in || 'data/products.json';
  const outPath = args.out || 'data/products.local.json';
  const dir = args.dir || 'picture';

  if (!fs.existsSync(inPath)) {
    console.error(`Input not found: ${inPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(inPath, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) {
    console.error('Invalid JSON in input:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('Input JSON must be an array of products');
    process.exit(1);
  }
  ensureDir(dir);
  const outList = processProducts(data, dir);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, JSON.stringify(outList, null, 2));
  console.log(`Wrote ${outList.length} products to ${outPath} with images under ${dir}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
