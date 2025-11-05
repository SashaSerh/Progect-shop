#!/usr/bin/env node
/*
  Cleanup unreferenced images in picture/ by scanning product JSON files.
  It understands our naming scheme: base.ext, base-<w>w.ext, base-<w>w.webp/avif, base-lqip.*

  Usage:
    node scripts/cleanup-pictures.js --dir picture --json data/products.local.json[,data/products.json] [--yes] [--dry-run]
*/
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { yes: false, 'dry-run': false };
  let key = null;
  for (const a of argv.slice(2)) {
    if (a.startsWith('--')) { key = a.slice(2); if (key === 'yes') out.yes = true; else if (key === 'dry-run') out['dry-run'] = true; else out[key] = true; }
    else if (key) { out[key] = a; key = null; }
  }
  return out;
}

function readProducts(jsonPath) {
  if (!fs.existsSync(jsonPath)) return [];
  const raw = fs.readFileSync(jsonPath, 'utf8');
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function collectLocalImageBases(products) {
  const set = new Set();
  const add = (p) => {
    if (typeof p !== 'string') return;
    if (!p.startsWith('picture/')) return;
    const m = p.match(/^picture\/(.*)$/);
    const rel = m ? m[1] : p;
    // drop suffixes like -320w.ext, -lqip.webp, -lqip.jpg
    const base = rel.replace(/-\d+w(?=\.[a-z0-9]+$)/i, '').replace(/-lqip(?=\.[a-z0-9]+$)/i, '');
    // remove extension
    const noext = base.replace(/\.[a-z0-9]+$/i, '');
    set.add(noext);
  };
  for (const prod of products) {
    if (!prod || typeof prod !== 'object') continue;
    if (typeof prod.image === 'string') add(prod.image);
    if (Array.isArray(prod.images)) prod.images.forEach(add);
  }
  return set;
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

function toBaseNoExtFromPath(fp) {
  const rel = fp.replace(/^picture\//, '');
  const relNoW = rel.replace(/-\d+w(?=\.[a-z0-9]+$)/i, '').replace(/-lqip(?=\.[a-z0-9]+$)/i, '');
  return relNoW.replace(/\.[a-z0-9]+$/i, '');
}

async function main() {
  const args = parseArgs(process.argv);
  const dir = args.dir || 'picture';
  const jsonArg = args.json || 'data/products.local.json';
  const jsonFiles = String(jsonArg).split(',').map(s => s.trim()).filter(Boolean);
  if (!fs.existsSync(dir)) { console.error(`Directory not found: ${dir}`); process.exit(1); }
  const usedBases = new Set();
  for (const jf of jsonFiles) {
    const list = readProducts(jf);
    const bases = collectLocalImageBases(list);
    bases.forEach(b => usedBases.add(b));
  }
  const victims = [];
  for await (const fp of walk(dir)) {
    const base = toBaseNoExtFromPath(fp);
    if (!usedBases.has(base)) {
      victims.push(fp);
    }
  }
  if (!victims.length) {
    console.log('No unreferenced files found.');
    return;
  }
  console.log(`Found ${victims.length} unreferenced files:`);
  victims.forEach(v => console.log('  ', v));
  if (args['dry-run']) { console.log('Dry run: no deletions performed.'); return; }
  if (!args.yes) {
    console.log('Run with --yes to delete these files.');
    return;
  }
  let deleted = 0;
  for (const v of victims) {
    try { fs.unlinkSync(v); deleted++; } catch (e) { console.error('Failed to delete', v, e?.message || e); }
  }
  console.log(`Deleted ${deleted} files.`);
}

main().catch(e => { console.error(e); process.exit(1); });
