#!/usr/bin/env node
/*
  Create a demo product image using sharp into picture/conditioners/demo-01.jpg.
*/
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function createDemoImage(outPath) {
  const width = 800; const height = 600;
  const bg = { r: 30, g: 80, b: 200, alpha: 1 };
  const img = sharp({ create: { width, height, channels: 3, background: bg } });
  // Add a simple overlay gradient bar at the bottom to make it less plain
  const barHeight = 80;
  const overlay = Buffer.alloc(width * barHeight * 3);
  for (let y = 0; y < barHeight; y++) {
    const t = y / (barHeight - 1);
    const r = Math.round(30 + (230 - 30) * t);
    const g = Math.round(80 + (230 - 80) * t);
    const b = Math.round(200 + (230 - 200) * t);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      overlay[idx] = r; overlay[idx + 1] = g; overlay[idx + 2] = b;
    }
  }
  const overlayImg = sharp(overlay, { raw: { width, height: barHeight, channels: 3 } });
  const composite = await img
    .composite([{ input: await overlayImg.jpeg({ quality: 90 }).toBuffer(), top: height - barHeight, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
  await fs.promises.writeFile(outPath, composite);
}

async function main() {
  const outDir = path.join('picture', 'conditioners');
  const outPath = path.join(outDir, 'demo-01.jpg');
  await ensureDir(outDir);
  await createDemoImage(outPath);
  console.log('Created demo image at', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });
