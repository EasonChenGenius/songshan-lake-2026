// Builds a lightweight editorial relief layer from the OSM Songshan Lake water polygon.
// Source: https://www.openstreetmap.org/relation/1113501 (ODbL), snapshot 2026-10-27.
// The location labels in the page are intentionally approximate and not for navigation.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(readFileSync(join(root, 'data/songshan-lake-osm.json'), 'utf8'));
const vertices = data[0].geojson.coordinates[0];
const bounds = { minLon: 113.835, maxLon: 113.929, minLat: 22.852, maxLat: 22.946 };
const size = 640;
const project = ([lon, lat]) => [
  ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * size,
  ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * size,
];

function distToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = dx * dx + dy * dy;
  const t = d ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let farthest = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > farthest) { farthest = distance; index = i; }
  }
  if (farthest <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

const contour = simplify(vertices.map(project), 1.55);
const d = `M ${contour.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="lakeTitle lakeDesc">
  <title id="lakeTitle">松山湖真实湖岸轮廓的艺术化浮雕示意</title>
  <desc id="lakeDesc">水域轮廓基于 OpenStreetMap 简化绘制，色彩、阴影及环境线条均为艺术表现。</desc>
  <defs>
    <linearGradient id="land" x1=".05" y1="0" x2=".96" y2="1"><stop stop-color="#29423f"/><stop offset=".54" stop-color="#1d3434"/><stop offset="1" stop-color="#172a31"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#74b8b2"/><stop offset=".47" stop-color="#387f94"/><stop offset="1" stop-color="#1c4d74"/></linearGradient>
    <radialGradient id="waterLight"><stop stop-color="#dcf6e5" stop-opacity=".46"/><stop offset=".92" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="road" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bdc6a6" stop-opacity=".34"/><stop offset="1" stop-color="#e4d4a6" stop-opacity=".06"/></linearGradient>
    <filter id="landShadow" x="-.2" y="-.2" width="1.4" height="1.5"><feGaussianBlur stdDeviation="13"/></filter>
    <filter id="lakeGlow" x="-.4" y="-.4" width="1.8" height="1.8"><feGaussianBlur stdDeviation="17"/></filter>
    <clipPath id="waterClip"><path d="${d}"/></clipPath>
  </defs>
  <rect width="640" height="640" rx="26" fill="url(#land)"/>
  <g fill="none" stroke="#a5c19e" stroke-opacity=".11" stroke-width="1.25">
    <path d="M-58 82 C120 -40 295 12 370 79 S630 148 695 72"/>
    <path d="M-65 105 C112 -17 292 37 362 105 S641 179 699 99"/>
    <path d="M-72 132 C109 15 285 65 354 133 S650 203 701 124"/>
    <path d="M-56 517 C85 424 226 468 318 558 S568 659 690 533"/>
    <path d="M-56 542 C92 448 229 493 319 587 S574 681 686 558"/>
    <path d="M-56 568 C95 482 242 527 331 607 S568 704 685 586"/>
    <path d="M478 -35 C430 90 462 195 558 256 S657 427 587 526"/>
    <path d="M500 -35 C455 90 487 183 584 243 S686 421 613 537"/>
  </g>
  <g fill="none" stroke="url(#road)" stroke-width="5" stroke-linecap="round" opacity=".62">
    <path d="M36 192 C84 137 151 118 213 80 S350 27 439 61"/>
    <path d="M71 539 C165 555 231 572 297 603 S484 630 620 576"/>
    <path d="M508 92 C538 191 564 267 604 335 S620 466 603 515"/>
  </g>
  <path d="${d}" transform="translate(0 25)" fill="#0b293c" fill-opacity=".95" filter="url(#landShadow)"/>
  <path d="${d}" transform="translate(0 12)" fill="#1b5262" stroke="#143c4a" stroke-width="5"/>
  <path d="${d}" fill="url(#water)" stroke="#b0ddd1" stroke-width="2"/>
  <path d="${d}" fill="none" stroke="#d6f4df" stroke-opacity=".24" stroke-width="12"/>
  <g clip-path="url(#waterClip)">
    <ellipse cx="206" cy="242" rx="230" ry="190" fill="url(#waterLight)"/>
    <path d="M84 147 C181 199 244 182 375 246 S511 367 525 441" fill="none" stroke="#dff3e7" stroke-opacity=".18" stroke-width="5"/>
    <path d="M119 212 C189 246 254 267 382 321" fill="none" stroke="#dff3e7" stroke-opacity=".12" stroke-width="3"/>
  </g>
  <g stroke="#d5e5ce" stroke-opacity=".19" fill="none" stroke-linecap="round">
    <path d="M30 348 L70 348 M50 328 L50 368"/>
    <path d="M535 38 L559 38 M547 26 L547 50"/>
  </g>
  <text x="35" y="46" fill="#ebf1e4" font-size="12" font-family="Georgia,serif" letter-spacing="3" opacity=".65">SONGSHAN LAKE</text>
  <text x="33" y="61" fill="#b7c5bc" font-size="8" font-family="sans-serif" letter-spacing="1.6" opacity=".72">RELIEF FIELD ATLAS / 2026</text>
  <path d="M591 93 L591 44" stroke="#d8e6d5" stroke-opacity=".7" stroke-width="1.4"/>
  <path d="M584 55 L591 42 L598 55" fill="none" stroke="#d8e6d5" stroke-opacity=".75" stroke-width="1.4"/>
  <text x="590" y="31" text-anchor="middle" fill="#e9f0e6" font-family="Georgia,serif" font-size="12" opacity=".75">N</text>
</svg>`;

writeFileSync(join(root, 'dist/assets/songshan-lake-relief.svg'), svg, 'utf8');
process.stdout.write(`Created lake relief SVG with ${contour.length} of ${vertices.length} shoreline vertices.\n`);
