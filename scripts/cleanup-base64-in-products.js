#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const isDry = process.argv.includes('--dry') || process.argv.includes('--dry-run');
const repoRoot = process.cwd();
const filePath = path.join(repoRoot, 'data', 'products.json');

function isDataUri(str) {
  return typeof str === 'string' && /^data:/i.test(str.trim());
}

function loadJson(p) {
  const txt = fs.readFileSync(p, 'utf8');
  try { return JSON.parse(txt); } catch (e) { throw new Error(`Не удалось распарсить ${p}: ${e.message}`); }
}

function saveJson(p, obj) {
  const pretty = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(p, pretty, 'utf8');
}

function main() {
  if (!fs.existsSync(filePath)) {
    console.error('Файл не найден:', filePath);
    process.exit(1);
  }
  const data = loadJson(filePath);
  if (!Array.isArray(data)) {
    console.error('Ожидался массив в products.json');
    process.exit(2);
  }
  let changed = 0, removedInArrays = 0;
  const out = data.map(p => {
    const q = { ...p };
    if (isDataUri(q.image)) { q.image = ''; changed++; }
    if (Array.isArray(q.images) && q.images.length) {
      const before = q.images.length;
      q.images = q.images.filter(x => !isDataUri(x));
      removedInArrays += (before - q.images.length);
    }
    return q;
  });
  if (isDry) {
    console.log(`[DRY] Найдено base64: image fields: ${changed}, images[] removed: ${removedInArrays}`);
    process.exit(0);
  }
  saveJson(filePath, out);
  console.log(`Готово. Очищено base64: image fields: ${changed}, images[] removed: ${removedInArrays}`);
}

main();
