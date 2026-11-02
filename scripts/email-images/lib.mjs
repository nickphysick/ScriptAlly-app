/**
 * The email images' renderer (privacy page v1, phase 2): the pass, the headings and the signature, drawn
 * by headless Chromium at 2× from one HTML template per type, in the site's own fonts (Special Elite,
 * Source Serif 4, Source Sans 3), then written as PNG-8.
 *
 * Why images: email clients don't load web fonts, so the typewriter heading and the pass fell back to
 * Courier. The brand moves into images; every sentence stays real text.
 *
 * ⚠️ NO IMAGE LIBRARY: this machine has none (no pngquant, sharp, pngjs), so the decode happens in
 * Chromium's canvas and the quantiser and encoder are below, on node's own zlib. Palette PNGs are what
 * get a 1120×300 pass with a drawn bird under 60 KB; truecolour is ~135 KB.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, "../..");
const require = createRequire(join(ROOT, "package.json"));
const { chromium } = require("playwright");

export const OUT_DIR = join(ROOT, "public/images/email");
export const MAX_BYTES = 60 * 1024;
/* The landing ticket's fledgling, inlined: a page made with setContent cannot load a file:// image. */
const BIRD = `data:image/webp;base64,${readFileSync(join(ROOT, "public/images/founding-pass-bird.webp")).toString("base64")}`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fill = (file, vars) =>
  readFileSync(join(here, "templates", file), "utf8").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

/* ══════════════ What to draw ══════════════ */

export const CAP = 50;
const passNo = (n) => ({
  name: `pass-${String(n).padStart(2, "0")}`, file: "pass.html",
  vars: { BIG: `No. ${n}`, OF: `<em>of ${CAP}</em>`, STAMP: "Confirmed", STAMP_CLASS: "stamp" },
  alt: `Founding writer pass: No. ${n} of ${CAP}`,
});
export const SPECS = [
  { name: "pass-pending", file: "pass.html",
    vars: { BIG: "Almost yours", OF: "", STAMP: "One click to go", STAMP_CLASS: "pill" },
    alt: "Founding writer pass: almost yours. One click to go." },
  ...Array.from({ length: CAP }, (_, i) => passNo(i + 1)),
  { name: "pass-waiting", file: "pass.html",
    vars: { BIG: "Waiting list", OF: "", STAMP: "Reserve", STAMP_CLASS: "stamp" },
    alt: "Founding writer pass: Waiting list" },
  /* The picture sets a typographic apostrophe; the alt is the email copy's own words, word for word. */
  { name: "heading-confirm", file: "heading.html", vars: { TEXT: "One click and you’re on the list." },
    alt: "One click and you're on the list." },
  { name: "heading-welcome", file: "heading.html", vars: { TEXT: "That’s your place confirmed." },
    alt: "That's your place confirmed." },
  { name: "heading-waiting", file: "heading.html", vars: { TEXT: "The fifty places went, but you’re next in line." },
    alt: "The fifty places went, but you're next in line." },
  { name: "signature-nick", file: "signature.html", vars: { TEXT: "Nick" }, alt: "Nick" },
];

/* ══════════════ Rendering ══════════════ */

export const launch = () => chromium.launch();

/** Renders one spec at 2× and returns its RGBA pixels (decoded in the browser's own canvas). */
export async function render(browser, spec) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 700, height: 400 } });
  const vars = Object.fromEntries(Object.entries(spec.vars).map(([k, v]) => [k, k === "OF" ? v : esc(v)]));
  await page.setContent(fill(spec.file, { ...vars, BIRD }), { waitUntil: "load" });
  await page.evaluate(async () => { await document.fonts.ready; for (const i of document.images) await i.decode().catch(() => {}); });
  /* The faces that actually loaded: a render in a fallback face is not the brand, so the caller refuses it. */
  const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")))]);
  const png = await page.locator("#shot").screenshot();
  const px = await decodeInPage(page, png);
  await page.close();
  return { ...px, fonts };
}

/** PNG bytes → RGBA, through the page's canvas. */
export async function decodeInPage(page, png) {
  const r = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let s = ""; const CH = 0x8000;
    for (let i = 0; i < d.length; i += CH) s += String.fromCharCode.apply(null, d.subarray(i, i + CH));
    return { w: c.width, h: c.height, b64: btoa(s) };
  }, Buffer.from(png).toString("base64"));
  return { w: r.w, h: r.h, rgba: Buffer.from(r.b64, "base64") };
}

/* ══════════════ Quantising (median cut) and PNG-8 ══════════════ */

/**
 * The palette: median cut for a start, then k-means to settle it.
 *
 * ⚠️ THE CUTS USE CAPPED COUNTS. A flat background is most of the pixels; weighted by raw counts every
 * median lands on it, the background's box never closes, and the palette fills with near-blacks while
 * the label's rust gets no entry at all (measured: the label came out 11,22,26). Capping each colour's
 * weight at 64 for the cuts, then refining with the true counts, gives every visible colour its entry.
 */
function palette(rgba, n) {
  const counts = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    const k = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const cols = [...counts.entries()].map(([k, c]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255, c, Math.min(c, 64)]);
  let boxes = [cols];
  const range = (b, ch) => { let lo = 255, hi = 0; for (const c of b) { if (c[ch] < lo) lo = c[ch]; if (c[ch] > hi) hi = c[ch]; } return hi - lo; };
  while (boxes.length < Math.min(n, cols.length)) {
    let bi = -1, best = 0, bch = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      const w = Math.sqrt(b.reduce((s, c) => s + c[4], 0));
      for (const ch of [0, 1, 2]) { const r = range(b, ch) * w; if (r > best) { best = r; bi = i; bch = ch; } }
    });
    if (bi < 0) break;
    const b = boxes[bi].sort((x, y) => x[bch] - y[bch]);
    const total = b.reduce((s, c) => s + c[4], 0);
    let acc = 0, cut = 1;
    for (let i = 0; i < b.length - 1; i++) { acc += b[i][4]; if (acc >= total / 2) { cut = i + 1; break; } }
    boxes.splice(bi, 1, b.slice(0, cut), b.slice(cut));
  }
  let pal = boxes.map((b) => {
    let r = 0, g = 0, bl = 0, t = 0;
    for (const c of b) { r += c[0] * c[3]; g += c[1] * c[3]; bl += c[2] * c[3]; t += c[3]; }
    return [r / t, g / t, bl / t];
  });
  /* k-means: each colour to its nearest entry, each entry to the weighted mean of its colours. */
  for (let it = 0; it < 6; it++) {
    const sum = pal.map(() => [0, 0, 0, 0]);
    for (const c of cols) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < pal.length; i++) { const p = pal[i]; const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = i; } }
      const s = sum[bi]; s[0] += c[0] * c[3]; s[1] += c[1] * c[3]; s[2] += c[2] * c[3]; s[3] += c[3];
    }
    pal = pal.map((p, i) => (sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : p));
  }
  return pal.map((p) => p.map((v) => Math.round(v)));
}

/** RGBA (opaque) → PNG-8 bytes with `colours` palette entries. */
export function encodePng8(w, h, rgba, colours = 256) {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) throw new Error("encodePng8: the images are opaque by design");
  const pal = palette(rgba, colours);
  const cache = new Map();
  const nearest = (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    let hit = cache.get(k);
    if (hit !== undefined) return hit;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) { const p = pal[i]; const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } }
    cache.set(k, bi); return bi;
  };
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; raw[y * (w + 1) + 1 + x] = nearest(rgba[k], rgba[k + 1], rgba[k + 2]); }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("PLTE", Buffer.from(pal.flat())),
    chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ══════════════ Comparing ══════════════ */

/** The share of pixels that differ by more than `tol` on any channel (two images of one size). */
export function diffShare(a, b, tol = 24) {
  if (a.w !== b.w || a.h !== b.h) return { share: 1, why: `size ${a.w}×${a.h} vs ${b.w}×${b.h}` };
  let n = 0;
  for (let i = 0; i < a.rgba.length; i += 4) {
    if (Math.abs(a.rgba[i] - b.rgba[i]) > tol || Math.abs(a.rgba[i + 1] - b.rgba[i + 1]) > tol || Math.abs(a.rgba[i + 2] - b.rgba[i + 2]) > tol) n++;
  }
  return { share: n / (a.w * a.h) };
}
