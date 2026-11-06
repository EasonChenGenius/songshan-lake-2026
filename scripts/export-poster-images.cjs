/* Export the two immutable poster routes to separately downloadable long images.
 * Intended for the GitHub Actions Chromium runner; no changes to poster markup.
 */
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const baseURL = process.env.POSTER_BASE_URL || 'http://127.0.0.1:4173';
const outputDirectory = path.resolve(process.env.POSTER_OUTPUT_DIR || 'dist/poster-exports');
const variants = [
  { name: 'poster-desktop', route: '/poster-desktop/', width: 1680, height: 950, dpr: 1 },
  { name: 'poster-mobile', route: '/poster-mobile/', width: 402, height: 874, dpr: 2 },
];

async function exportVariant(browser, variant) {
  const context = await browser.newContext({
    viewport: { width: variant.width, height: variant.height },
    deviceScaleFactor: variant.dpr,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const address = new URL(variant.route, baseURL).href;
  await page.goto(address, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(async () => {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    for (const img of document.images) {
      img.loading = 'eager';
    }
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, async (img) => {
      try { await img.decode(); } catch (_) { /* preserve the rest of the poster */ }
    }));
  });

  // Resolve any late layout changes before taking coordinate-based tiles.
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  const height = await page.evaluate(() => Math.ceil(Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  )));
  const width = variant.width * variant.dpr;
  const pixelsHigh = height * variant.dpr;
  const maxTiles = 100;
  const tileHeight = 1200;
  const tiles = [];
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `${variant.name}-`));

  try {
    for (let offset = 0; offset < height; offset += tileHeight) {
      const tileIndex = tiles.length;
      if (tileIndex >= maxTiles) throw new Error(`Too many tiles: ${variant.name} height=${height}`);
      const currentTileHeight = Math.min(tileHeight, height - offset);
      const file = path.join(temporaryDirectory, `${tileIndex.toString().padStart(3, '0')}.png`);
      await page.screenshot({
        path: file,
        type: 'png',
        clip: { x: 0, y: offset, width: variant.width, height: currentTileHeight },
        animations: 'disabled',
        caret: 'hide',
        scale: 'device',
        timeout: 120000,
      });
      tiles.push({ input: file, top: offset * variant.dpr, left: 0 });
    }

    await fs.mkdir(outputDirectory, { recursive: true });
    const pngFile = path.join(outputDirectory, `${variant.name}.png`);
    const jpgFile = path.join(outputDirectory, `${variant.name}.jpg`);
    // Sharp composites the tiles into one real, lossless PNG without page-height limits.
    const composite = () => sharp({
      create: { width, height: pixelsHigh, channels: 3, background: '#f3f0eb' },
      limitInputPixels: false,
    }).composite(tiles);
    await composite().png({ compressionLevel: 9, effort: 8 }).toFile(pngFile);
    await composite().jpeg({ quality: 94, mozjpeg: true }).toFile(jpgFile);

    const pngStats = await fs.stat(pngFile);
    const jpegStats = await fs.stat(jpgFile);
    const githubLimit = 95 * 1024 * 1024;
    if (pngStats.size > githubLimit) {
      await fs.unlink(pngFile);
      console.log(`${variant.name}: PNG over 95 MiB limit, high-quality JPG retained`);
    }
    console.log(`${variant.name}: ${width} × ${pixelsHigh}px, ${tiles.length} tiles, PNG=${Math.round(pngStats.size / 1048576)} MiB, JPG=${Math.round(jpegStats.size / 1048576)} MiB`);
  } finally {
    await context.close();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const variant of variants) {
      await exportVariant(browser, variant);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
