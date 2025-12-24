import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', 'picture', 'recuperator.png');
const sizes = [1200, 768, 480, 320];
for (const s of sizes) {
  const jpgOut = path.join(__dirname, '..', 'picture', `about-banner-${s}.jpg`);
  const webpOut = path.join(__dirname, '..', 'picture', `about-banner-${s}.webp`);
  try {
    await sharp(src).resize({ width: s }).jpeg({ quality: 80 }).toFile(jpgOut);
    await sharp(src).resize({ width: s }).webp({ quality: 80 }).toFile(webpOut);
    console.log('generated', jpgOut, webpOut);
  } catch (e) {
    console.error('error generating for size', s, e);
    process.exitCode = 1;
  }
}
