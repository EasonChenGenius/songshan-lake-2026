/* Lossless chapter slices from the actual 4K browser render of V15.
 * No AI redraw, no re-typesetting, no manual screenshot crop.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const sharp = require('sharp');

const repoRoot = process.cwd();
const fullPng = path.join(repoRoot, 'dist/poster-exports-4k/poster-mobile-real-photo-4k.png');
const outputDir = path.join(repoRoot, 'exports/mobile-real-photo-v15-4k');
const zipPath = path.join(outputDir, 'poster-mobile-real-photo-v15-sections-4k.zip');
const baseURL = process.env.POSTER_BASE_URL || 'http://127.0.0.1:4173';
const cssWidth = 402;
const targetWidth = 2160;
const sourceSelectors = [
  { filename: '01-before-chapter-01-prologue-4k.png', title: '第一章之前（封面、参访地图、导读）', begins: null },
  { filename: '02-chapter-01-discovery-4k.png', title: '第一章｜发现', begins: '#discovery' },
  { filename: '03-chapter-02-research-4k.png', title: '第二章｜研究', begins: '#materials' },
  { filename: '04-chapter-03-transformation-4k.png', title: '第三章｜转化', begins: '#robotics' },
  { filename: '05-chapter-04-life-4k.png', title: '第四章｜生活', begins: '#life' },
  { filename: '06-chapter-05-people-4k.png', title: '第五章｜人才', begins: '#people' },
  { filename: '07-epilogue-4k.png', title: '尾页｜写在最后', begins: 'section.epilogue' },
];

async function getPageBoundaries() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      viewport: { width: cssWidth, height: 874 },
      deviceScaleFactor: targetWidth / cssWidth,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(new URL('/poster-mobile-real-photo/?export=1&v=15', baseURL).href, {
      waitUntil: 'load', timeout: 120000,
    });
    const positions = await page.evaluate(async (selectors) => {
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.overflowX = 'hidden';
      for (const img of document.images) img.loading = 'eager';
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, async img => {
        try { await img.decode(); } catch (_) { /* report with remaining images */ }
      }));
      const total = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
      const positions = selectors.map(selector => {
        if (!selector) return 0;
        const el = document.querySelector(selector);
        if (!el) throw Error('Missing section anchor: ' + selector);
        return el.getBoundingClientRect().top + window.scrollY;
      });
      return { total, positions };
    }, sourceSelectors.map(x => x.begins));
    await context.close();
    return positions;
  } finally {
    await browser.close();
  }
}

async function main() {
  const imageMeta = await sharp(fullPng, { limitInputPixels: false }).metadata();
  if (imageMeta.format !== 'png' || imageMeta.width !== targetWidth) {
    throw Error('Expected a full, true-size 2160px-wide PNG from the existing 4K browser exporter.');
  }
  const layout = await getPageBoundaries();
  const cssHeightFromExport = imageMeta.height / (targetWidth / cssWidth);
  if (Math.abs(layout.total - cssHeightFromExport) > 12) {
    throw Error('Page height changed between full capture and cutting: ' +
      layout.total + ' CSS px measured vs ' + cssHeightFromExport.toFixed(1) + ' exported.');
  }
  const scale = imageMeta.height / layout.total;
  const cuts = layout.positions.map((cssTop, idx) => idx ? Math.round(cssTop * scale) : 0);
  cuts.push(imageMeta.height);
  if (cuts.some((px, i) => i && px <= cuts[i - 1])) throw Error('Section boundaries out of order.');
  await fs.mkdir(outputDir, { recursive: true });
  const records = [];
  for (let i = 0; i < sourceSelectors.length; i++) {
    const start = cuts[i], height = cuts[i + 1] - start;
    const item = sourceSelectors[i];
    const file = path.join(outputDir, item.filename);
    await sharp(fullPng, { limitInputPixels: false })
      .extract({ left: 0, top: start, width: imageMeta.width, height })
      .png({ compressionLevel: 9, effort: 8, palette: false })
      .toFile(file);
    const result = await sharp(file, { limitInputPixels: false }).metadata();
    if (result.width !== targetWidth || result.height !== height) throw Error('Invalid crop dimensions: ' + file);
    records.push({ file: item.filename, title: item.title, width: result.width,
      height: result.height, starts_at_pixel: start, ends_before_pixel: cuts[i + 1] });
    console.log(item.filename + ': ' + targetWidth + ' x ' + height);
  }
  const manifest = {
    edition: 'Poster Mobile 原图实拍 V15',
    source: 'dist/poster-mobile-real-photo/index.html',
    url: 'https://easonchengenius.github.io/songshan-lake-2026/poster-mobile-real-photo/?v=15',
    full_image: 'dist/poster-exports-4k/poster-mobile-real-photo-4k.png',
    css_viewport_width: cssWidth,
    physical_width: targetWidth,
    physical_full_height: imageMeta.height,
    chapter_count: records.length,
    note: 'The 7 real page sections are 00 prologue, chapters 01–05, and epilogue. Pixel-perfect crops, no artificial image generation.',
    sections: records,
  };
  await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(outputDir, 'README.txt'),
    '看见不可见｜Poster Mobile 原图实拍 V15｜网页原版 4K 无损截取\n' +
    '完整长图（单独提供）：dist/poster-exports-4k/poster-mobile-real-photo-4k.png\n' +
    '这个 ZIP 中包含 7 张 PNG：第一章之前 + 1—5 章 + 尾页。\n' +
    '全部来自相同一次浏览器渲染的 2160px 宽网页截图，仅按原文档章节边界裁切，未作 AI 重绘或修改原文。\n' +
    '详细尺寸参见 manifest.json。\n');
  const python = [
    'import os, sys, zipfile',
    'folder, target = sys.argv[1:3]',
    'with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as z:',
    ' for fn in sorted(os.listdir(folder)):',
    '  if fn.endswith(".png") or fn in ("README.txt", "manifest.json"):',
    '   z.write(os.path.join(folder, fn), arcname=fn)',
  ].join('\n');
  execFileSync('python3', ['-c', python, outputDir, zipPath], { stdio: 'inherit' });
  const stat = await fs.stat(zipPath);
  console.log('Full V15 original 4K PNG: ' + targetWidth + ' x ' + imageMeta.height);
  console.log('ZIP: ' + zipPath + ', ' + Math.round(stat.size / 1048576) + ' MiB');
  if (stat.size > 98 * 1024 * 1024) {
    throw Error('ZIP exceeds GitHub single-file limit; do not claim it was published.');
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
