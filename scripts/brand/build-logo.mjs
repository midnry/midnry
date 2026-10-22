#!/usr/bin/env node
/**
 * Midnry brand generator: the editable source of the logo, the favicons and the
 * path data the site's <BrandLogo> component draws.
 *
 *   node scripts/brand/build-logo.mjs          (from the repo root)
 *
 * Writes
 *   public/brand/midnry-{symbol,logo,lockup}{,-black,-white,-inverse}.svg
 *   public/brand/midnry-symbol-small{,-black,-white}.svg   (16–32 px: wider gaps)
 *   public/brand/midnry-symbol-{512,1024}.png
 *   public/favicon.svg, favicon.ico (16/32/48), favicon-96x96.png, favicon.png (32),
 *   apple-touch-icon.png (180), web-app-manifest-{192x192,512x512}.png, logo.png (512),
 *   public/site.webmanifest
 *   src/components/brand-art.ts   (generated: paths + sizes for src/components/brand.tsx)
 *
 * Everything is drawn from PARAMS below, so tweak a number and run it again.
 *
 * Symbol: four rounded tiles. Upper-left and lower-right are big, the other two
 * small. Where the two big tiles meet, the upper-left one is carved by a circle
 * that follows the lower-right tile's rounded corner at the same gap, so the
 * spacing stays even around the centre; small fillets soften the joins.
 *
 * Wordmark: "Midnry" in Newsreader ExtraBold (wght 800) at its display optical
 * size (opsz 72), converted to outlines with kerning. Tagline: Outfit Light.
 * Both fonts are SIL OFL 1.1 (licences next to them in scripts/brand/fonts/).
 * Newsreader-ExtraBold-opsz72.ttf is a static instance of the
 * @fontsource-variable/newsreader 5.3.0 latin opsz file, made with fontTools:
 *   instancer.instantiateVariableFont(TTFont(woff2), {"wght": 800, "opsz": 72})
 * (this fontkit build can't apply variations to WOFF2 itself).
 *
 * PNGs are rasterised by Chromium (Playwright) at their exact pixel size.
 * Set CHROMIUM_PATH to override the browser binary.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const FONTS = join(ROOT, "scripts/brand/fonts");

export const PARAMS = {
  colors: {
    // Keep in step with --color-brand / --color-ink in src/styles.css (checked below).
    brand: "#1d55e4", // between the approved board's #1c59f0 and the site's pine #1d4ed8
    brandOnDark: "#5a8dee", // dark-mode brand (= dark-mode pine)
    ink: "#102033", // --color-ink
    inkSoft: "#1e3a5f", // --color-ink-soft, for the tagline
    onDark: "#ffffff",
    onDarkSoft: "#c4d3e8",
    iconBackground: "#ffffff", // apple-touch / manifest icons
  },
  // Symbol on a 100×100 grid.
  symbol: { big: 53, gap: 6, inset: 3, rBig: 12, rSmall: 9, fillet: 3.5 },
  // 16–32 px: 16 px grid (6.25 units per pixel): big 8 px, gap 2 px, small 6 px.
  symbolSmall: { big: 50, gap: 12.5, inset: 0, rBig: 15, rSmall: 12.5, fillet: 4 },
  // Symbol + wordmark (site header). Units: symbol height = 100.
  logo: { gap: 28, capHeight: 60, tracking: -0.015 },
  // Symbol + wordmark + tagline (footer, About).
  lockup: { gap: 22, capHeight: 56, capTop: 6, tracking: -0.015, tagline: "A desk of web apps", tagCapHeight: 17, tagBaseline: 101, tagTracking: 0.035 },
  // Padding around the symbol in square app icons (fraction of the icon size).
  iconPadding: { apple: 0.17, manifest: 0.17, maskable: 0.24 },
};

const r2 = (n) => Math.round(n * 100) / 100;
const fmt = (n) => String(r2(n));

/* ---------- symbol geometry ---------- */

function roundedRect(x0, y0, x1, y1, r) {
  return `M${fmt(x0 + r)} ${fmt(y0)}H${fmt(x1 - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x1)} ${fmt(y0 + r)}V${fmt(y1 - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x1 - r)} ${fmt(y1)}H${fmt(x0 + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0)} ${fmt(y1 - r)}V${fmt(y0 + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0 + r)} ${fmt(y0)}Z`;
}

/** Upper-left tile with its lower-right corner carved around the lower-right tile. */
function notchedTile(big, cut, f, r) {
  // cut = { cx, cy, R }: the lower-right tile's corner circle grown by the gap.
  const { cx, cy, R } = cut;
  // Fillet on the right edge (x = big): centre (big - f, yc), externally tangent to the cut circle.
  const dx = big - f - cx;
  const yc = cy - Math.sqrt((R + f) ** 2 - dx ** 2);
  if (!(yc >= r)) throw new Error(`notch too deep for the corner radius (yc=${yc})`);
  const k = R / (R + f);
  const p1 = [cx + (big - f - cx) * k, cy + (yc - cy) * k]; // on the cut circle
  const p2 = [p1[1], p1[0]]; // mirrored across the diagonal
  return (
    `M${fmt(r)} 0H${fmt(big - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(big)} ${fmt(r)}` +
    `V${fmt(yc)}A${fmt(f)} ${fmt(f)} 0 0 1 ${fmt(p1[0])} ${fmt(p1[1])}` +
    `A${fmt(R)} ${fmt(R)} 0 0 0 ${fmt(p2[0])} ${fmt(p2[1])}` +
    `A${fmt(f)} ${fmt(f)} 0 0 1 ${fmt(yc)} ${fmt(big)}` +
    `H${fmt(r)}A${fmt(r)} ${fmt(r)} 0 0 1 0 ${fmt(big - r)}V${fmt(r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(r)} 0Z`
  );
}

function symbolPath({ big, gap, inset, rBig, rSmall, fillet }) {
  const lr0 = 100 - big;
  const cut = { cx: lr0 + rBig, cy: lr0 + rBig, R: rBig + gap };
  const smallEnd = lr0 - gap; // small tiles stop one gap before the lower-right tile
  const smallStart = big + gap; // and start one gap after the upper-left tile
  return [
    notchedTile(big, cut, fillet, rBig),
    roundedRect(smallStart, inset, 100 - inset, smallEnd, rSmall), // upper right
    roundedRect(inset, smallStart, smallEnd, 100 - inset, rSmall), // lower left
    roundedRect(lr0, lr0, 100, 100, rBig), // lower right
  ].join("");
}

/* ---------- type ---------- */

function loadFont(file) {
  return fontkit.create(readFileSync(join(FONTS, file)));
}

/** Text → one SVG path (y down), scaled so the font's cap height = capHeight, baseline at y = 0. */
function textPath(font, text, capHeight, tracking = 0) {
  const s = capHeight / font.capHeight;
  const run = font.layout(text); // applies the font's kerning
  let x = 0;
  let d = "";
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  run.glyphs.forEach((g, i) => {
    const p = g.path.scale(s, -s).translate(x, 0);
    d += p.toSVG();
    const b = p.bbox;
    if (Number.isFinite(b.minX)) {
      minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
      minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
    }
    x += run.positions[i].xAdvance * s + tracking * font.unitsPerEm * s;
  });
  // fontkit's toSVG prints long decimals: round them.
  d = d.replace(/-?\d*\.\d+(?:e-?\d+)?/g, (n) => fmt(Number(n)));
  return { d, bbox: { minX, maxX, minY, maxY }, glyphs: run.glyphs, positions: run.positions, scale: s };
}

/** Moves every coordinate in a path made only of M/L/Q/C/Z commands (fontkit output). */
function shift(d, dx, dy) {
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd, args) => {
    const nums = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    return cmd + nums.map((n, i) => fmt(i % 2 ? n + dy : n + dx)).join(" ");
  });
}

/* ---------- compose ---------- */

const serif = loadFont("Newsreader-ExtraBold-opsz72.ttf");
const sans = loadFont("Outfit-Light.woff");

const SYMBOL = symbolPath(PARAMS.symbol);
const SYMBOL_SMALL = symbolPath(PARAMS.symbolSmall);

function buildLogo() {
  const { gap, capHeight, tracking } = PARAMS.logo;
  const w = textPath(serif, "Midnry", capHeight, tracking);
  const x0 = 100 + gap - w.bbox.minX;
  const baseline = 50 + capHeight / 2; // cap height centred on the symbol
  const top = Math.min(0, baseline + w.bbox.minY);
  const bottom = Math.max(100, baseline + w.bbox.maxY);
  const word = shift(w.d, x0, baseline - top);
  return { width: r2(x0 + w.bbox.maxX), height: r2(bottom - top), word, symbolY: r2(-top) };
}

function buildLockup() {
  const L = PARAMS.lockup;
  const w = textPath(serif, "Midnry", L.capHeight, L.tracking);
  const t = textPath(sans, L.tagline, L.tagCapHeight, L.tagTracking);
  const x0 = 100 + L.gap - w.bbox.minX;
  const baseline = L.capTop + L.capHeight;
  const tx = 100 + L.gap - t.bbox.minX + 1.5; // optically under the M's stem
  // The tagline must clear the y's descender.
  const yIndex = w.glyphs.length - 1;
  const yStart = x0 + w.positions.slice(0, yIndex).reduce((a, p) => a + p.xAdvance * w.scale, 0);
  if (tx + t.bbox.maxX > yStart + 4) console.warn("tagline runs under the y's tail: shorten tagCapHeight or tracking");
  const top = Math.min(0, baseline + w.bbox.minY);
  const bottom = Math.max(100, baseline + w.bbox.maxY, L.tagBaseline + t.bbox.maxY);
  return {
    width: r2(Math.max(x0 + w.bbox.maxX, tx + t.bbox.maxX)),
    height: r2(bottom - top),
    word: shift(w.d, x0, baseline - top),
    tag: shift(t.d, tx, L.tagBaseline - top),
    symbolY: r2(-top),
  };
}

const LOGO = buildLogo();
const LOCKUP = buildLockup();

/* ---------- SVG files ---------- */

const C = PARAMS.colors;
const TONES = {
  "": { symbol: C.brand, word: C.ink, tag: C.inkSoft },
  "-black": { symbol: "#000000", word: "#000000", tag: "#000000" },
  "-white": { symbol: "#ffffff", word: "#ffffff", tag: "#ffffff" },
  "-inverse": { symbol: C.brandOnDark, word: C.onDark, tag: C.onDarkSoft },
};

function svg(width, height, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 2}" height="${height * 2}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
}
// The symbol path uses H/V/A, which shift() can't move, so it is offset with a transform.
const group = (y, d, fill) => (y ? `<path transform="translate(0 ${y})" fill="${fill}" d="${d}"/>` : `<path fill="${fill}" d="${d}"/>`);

const files = {};
for (const [suffix, t] of Object.entries(TONES)) {
  if (suffix !== "-inverse") {
    files[`public/brand/midnry-symbol${suffix}.svg`] = svg(100, 100, group(0, SYMBOL, t.symbol), "Midnry");
    files[`public/brand/midnry-symbol-small${suffix}.svg`] = svg(100, 100, group(0, SYMBOL_SMALL, t.symbol), "Midnry");
  }
  files[`public/brand/midnry-logo${suffix}.svg`] = svg(
    LOGO.width, LOGO.height,
    group(LOGO.symbolY, SYMBOL, t.symbol) + `<path fill="${t.word}" d="${LOGO.word}"/>`,
    "Midnry",
  );
  files[`public/brand/midnry-lockup${suffix}.svg`] = svg(
    LOCKUP.width, LOCKUP.height,
    group(LOCKUP.symbolY, SYMBOL, t.symbol) + `<path fill="${t.word}" d="${LOCKUP.word}"/><path fill="${t.tag}" d="${LOCKUP.tag}"/>`,
    "Midnry — A desk of web apps",
  );
}
// Browser tab icon: the small-size cut, slightly inset so it doesn't touch the tab's edges.
// A lighter blue on a dark browser theme, like the site's dark mode.
files["public/favicon.svg"] =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 104 104"><style>path{fill:${C.brand}}@media (prefers-color-scheme:dark){path{fill:${C.brandOnDark}}}</style><path d="${SYMBOL_SMALL}"/></svg>\n`;

files["public/site.webmanifest"] = JSON.stringify(
  {
    name: "Midnry",
    short_name: "Midnry",
    description: "A desk of web apps",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#f4f7fb",
    icons: [
      { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/web-app-manifest-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  null,
  2,
) + "\n";

files["src/components/brand-art.ts"] = `// Generated by scripts/brand/build-logo.mjs. Edit the generator, not this file.
// Units: the symbol is 100 × 100; logo and lockup are laid out around it.

/** Symbol tiles (100 × 100). */
export const SYMBOL_PATH = ${JSON.stringify(SYMBOL)};
/** The same symbol with wider gaps, for 16–32 px. */
export const SYMBOL_SMALL_PATH = ${JSON.stringify(SYMBOL_SMALL)};

/** Symbol + "Midnry". */
export const LOGO_ART = {
  width: ${LOGO.width},
  height: ${LOGO.height},
  symbolY: ${LOGO.symbolY},
  word: ${JSON.stringify(LOGO.word)},
} as const;

/** Symbol + "Midnry" + tagline. */
export const LOCKUP_ART = {
  width: ${LOCKUP.width},
  height: ${LOCKUP.height},
  symbolY: ${LOCKUP.symbolY},
  word: ${JSON.stringify(LOCKUP.word)},
  tag: ${JSON.stringify(LOCKUP.tag)},
} as const;

/** Fixed colours for the inverse tone (on a dark surface in any mode). */
export const INVERSE = ${JSON.stringify({ symbol: C.brandOnDark, word: C.onDark, tag: C.onDarkSoft })} as const;
`;

for (const [rel, body] of Object.entries(files)) {
  mkdirSync(dirname(join(ROOT, rel)), { recursive: true });
  writeFileSync(join(ROOT, rel), body);
}

/* ---------- PNG + ICO ---------- */

function iconHtml(size, { path, padding = 0, background = "transparent" }) {
  const inner = size * (1 - 2 * padding);
  return `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">
<rect width="${size}" height="${size}" fill="${background}"/>
<g transform="translate(${size * padding} ${size * padding}) scale(${inner / 100})"><path fill="${C.brand}" d="${path}"/></g>
</svg></body></html>`;
}

const PNGS = [
  // [file, size, art]
  ["public/favicon-96x96.png", 96, { path: SYMBOL }],
  ["public/favicon.png", 32, { path: SYMBOL_SMALL }],
  ["public/apple-touch-icon.png", 180, { path: SYMBOL, padding: PARAMS.iconPadding.apple, background: C.iconBackground }],
  ["public/web-app-manifest-192x192.png", 192, { path: SYMBOL, padding: PARAMS.iconPadding.manifest, background: C.iconBackground }],
  ["public/web-app-manifest-512x512.png", 512, { path: SYMBOL, padding: PARAMS.iconPadding.manifest, background: C.iconBackground }],
  ["public/web-app-manifest-maskable-512x512.png", 512, { path: SYMBOL, padding: PARAMS.iconPadding.maskable, background: C.iconBackground }],
  ["public/logo.png", 512, { path: SYMBOL }],
  ["public/brand/midnry-symbol-512.png", 512, { path: SYMBOL }],
  ["public/brand/midnry-symbol-1024.png", 1024, { path: SYMBOL }],
  ["ico:16", 16, { path: SYMBOL_SMALL }],
  ["ico:32", 32, { path: SYMBOL_SMALL }],
  ["ico:48", 48, { path: SYMBOL }],
];

const executablePath = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const ico = [];
for (const [file, size, art] of PNGS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(iconHtml(size, art));
  const png = await page.locator("svg").screenshot({ omitBackground: true, type: "png" });
  if (file.startsWith("ico:")) ico.push({ size, png });
  else writeFileSync(join(ROOT, file), png);
}
await browser.close();

/** PNG-in-ICO container (Vista+ and every current browser read PNG entries). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = entries.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.png)]);
}
writeFileSync(join(ROOT, "public/favicon.ico"), buildIco(ico));

/* ---------- checks ---------- */

const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
for (const [token, value] of [["--color-brand", C.brand], ["--color-ink", C.ink]]) {
  if (!new RegExp(`${token}:\\s*${value}`, "i").test(css)) console.warn(`src/styles.css: ${token} is not ${value}; keep them in step`);
}
console.log(`logo ${LOGO.width}×${LOGO.height}, lockup ${LOCKUP.width}×${LOCKUP.height}; wrote ${Object.keys(files).length} files, ${PNGS.length - 3} PNGs and favicon.ico`);
