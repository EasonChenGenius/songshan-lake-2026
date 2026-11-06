/* True high-resolution exports of the four independent poster editions.
 * Preserve the source CSS layout and render at high device pixel ratio.
 * Desktop: 3840 physical pixels wide. Mobile: 2160 physical pixels wide.
 */
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const baseURL = process.env.POSTER_BASE_URL || 'http://127.0.0.1:4173';
const outputDirectory = path.resolve(process.env.POSTER_OUTPUT_DIR || 'dist/poster-exports-4k');
const options = [
  { name: 'poster-desktop', cssWidth: 1680, cssHeight: 950, targetWidth: 3840 },
  { name: 'poster-mobile', cssWidth: 402, cssHeight: 874, targetWidth: 2160 },
  { name: 'poster-desktop-real-photo', cssWidth: 1680, cssHeight: 950, targetWidth: 3840 },
  { name: 'poster-mobile-real-photo', cssWidth: 402, cssHeight: 874, targetWidth: 2160 },
];
const requested = (process.env.POSTER_EXPORT_VARIANTS || '').split(',').map(x => x.trim()).filter(Boolean);
const variants = options.filter(x => !requested.length || requested.includes(x.name));

async function exportVariant(browser, variant) {
  const scale = variant.targetWidth / variant.cssWidth;
  const context = await browser.newContext({
    viewport: { width: variant.cssWidth, height: variant.cssHeight },
    deviceScaleFactor: scale,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `songshan-4k-${variant.name}-`));
  try {
    await page.goto(new URL(`/${variant.name}/?export=1`, baseURL).href, {
      waitUntil: 'load',
      timeout: 120000,
    });
    const cssPageHeight = await page.evaluate(async () => {
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.overflowX = 'hidden';
      for (const image of document.images) image.loading = 'eager';
      await document.fonts.ready;
      await Promise.all([...document.images].map(async image => {
        try { await image.decode(); } catch (_) { /* Keep the rest of the poster. */ }
      }));
      return Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    });
    await page.waitForTimeout(400);
    const totalHeight = Math.round(cssPageHeight * scale);
    const tiles = [];
    const maxTiles = 350;
    for (let offset = 0; offset < cssPageHeight; offset += variant.cssHeight) {
      if (tiles.length >= maxTiles) throw new Error(`Too many screenshot tiles for ${variant.name}`);
      const currentHeight = Math.min(variant.cssHeight, cssPageHeight - offset);
      const scrollTop = Math.min(offset, Math.max(0, cssPageHeight - variant.cssHeight));
      await page.evaluate(y => window.scrollTo(0, y), scrollTop);
      await page.waitForTimeout(55);
      const shot = await page.screenshot({
        type: 'png',
        scale: 'device',
        animations: 'disabled',
        caret: 'hide',
        timeout: 120000,
      });
      const meta = await sharp(shot).metadata();
      const top = Math.round((offset - scrollTop) * scale);
      const targetY = Math.round(offset * scale);
      const targetH = Math.round((offset + currentHeight) * scale) - targetY;
      const sourceH = Math.min(meta.height - top, Math.round(currentHeight * scale));
      if (sourceH <= 0) throw new Error(`Invalid crop in ${variant.name} at ${offset}`);
      const file = path.join(work, `${tiles.length.toString().padStart(3, '0')}.png`);
      await sharp(shot)
        .extract({ left: 0, top, width: meta.width, height: sourceH })
        .resize({ width: variant.targetWidth, height: targetH, fit: 'fill' })
        .png({ compressionLevel: 4 })
        .toFile(file);
      tiles.push({ input: file, left: 0, top: targetY });
      if (tiles.length % 10 === 0) console.log(`${variant.name}: ${tiles.length} tiles completed`);
    }
    await fs.mkdir(outputDirectory, { recursive: true });
    const pngPath = path.join(outputDirectory, `${variant.name}-4k.png`);
    const jpgPath = path.join(outputDirectory, `${variant.name}-4k.jpg`);
    const composite = () => sharp({
      create: {
        width: variant.targetWidth, height: totalHeight,
        channels: 3, background: '#f3f0eb',
      },
      limitInputPixels: false,
    }).composite(tiles);
    await composite().png({ compressionLevel: 9, effort: 8 }).toFile(pngPath);
    const pngStats = await fs.stat(pngPath);
    // JPEG encodes dimensions as 16-bit values, so exceptionally tall
    // mobile posters must stay PNG to preserve their full 4K-width length.
    let jpgStats = null;
    if (totalHeight <= 65535) {
      await composite().jpeg({ quality: 92, mozjpeg: true }).toFile(jpgPath);
      jpgStats = await fs.stat(jpgPath);
    } else {
      console.log(`${variant.name}: height ${totalHeight} exceeds JPEG's 65535-pixel limit; preserving full-length PNG`);
    }
    if (pngStats.size > 95 * 1024 * 1024 && jpgStats) {
      await fs.unlink(pngPath);
      console.log(`${variant.name}: lossless PNG exceeded GitHub's per-file limit; high-quality JPEG kept`);
    }
    console.log(`${variant.name}: ${variant.targetWidth} × ${totalHeight}, ${tiles.length} tiles, PNG ${Math.round(pngStats.size / 1048576)} MiB${jpgStats ? `, JPEG ${Math.round(jpgStats.size / 1048576)} MiB` : ''}`);
  } finally {
    await context.close();
    await fs.rm(work, { recursive: true, force: true });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const variant of variants) await exportVariant(browser, variant);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
