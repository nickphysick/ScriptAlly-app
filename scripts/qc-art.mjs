#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trim, downscale and quantise the Query Centre's two artworks for shipping.
 *
 * ⚠️ IT WRITES PNG-8, NOT WebP, AND THAT IS A SUBSTITUTION RATHER THAN A CHOICE. This machine has
 * no WebP encoder: `cwebp` is absent, `sips -s format webp` fails with "Can't write format:
 * org.webmproject.webp", and neither Pillow nor sharp is installed. The repo has been here before —
 * CLAUDE.md records "no useful recompression was available on this machine" — and the answer that
 * worked was the same one: a quantiser in node's own zlib. `public/images/dash/*.png` are its
 * output, ~70KB each. The size budget is met; the format is not the one asked for, and the report
 * says so.
 *
 * ⚠️ AND IT TRIMS TO THE ALPHA BOX BEFORE ANYTHING ELSE. Both source files carry transparent margin
 * — the hero 18px at the left, the head 60px at the top — and every later number (the display size,
 * the 2× cap, the position the head is clipped at) is about the DRAWN area. Scaling a padded image
 * scales its padding too, and the drawing then lands somewhere nobody measured.
 *
 *   node scripts/qc-art.mjs <in.png> <out.png> <maxWidth> [maxColours]
 */
import { readFileSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

/* ── decode: 8-bit PNG, non-interlaced, greyscale/RGB/palette/alpha ───────────────────────────── */
function decode(raw) {
  let pos = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [], plte = null, trns = null;
  while (pos < raw.length) {
    const len = raw.readUInt32BE(pos); const typ = raw.toString("ascii", pos + 4, pos + 8);
    const data = raw.subarray(pos + 8, pos + 8 + len); pos += 12 + len;
    if (typ === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; if (data[12]) throw new Error("interlaced PNG"); }
    else if (typ === "IDAT") idat.push(data);
    else if (typ === "PLTE") plte = data;
    else if (typ === "tRNS") trns = data;
    else if (typ === "IEND") break;
  }
  if (bd !== 8) throw new Error(`bit depth ${bd} unsupported`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  const d = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch; const px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride); let i = 0;
  for (let y = 0; y < h; y++) {
    const f = d[i++]; const line = Buffer.from(d.subarray(i, i + stride)); i += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      if (f === 1) line[x] = (line[x] + a) & 255;
      else if (f === 2) line[x] = (line[x] + b) & 255;
      else if (f === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4; const s = x * ch;
      if (ct === 6) { px[o] = line[s]; px[o + 1] = line[s + 1]; px[o + 2] = line[s + 2]; px[o + 3] = line[s + 3]; }
      else if (ct === 2) { px[o] = line[s]; px[o + 1] = line[s + 1]; px[o + 2] = line[s + 2]; px[o + 3] = 255; }
      else if (ct === 4) { px[o] = px[o + 1] = px[o + 2] = line[s]; px[o + 3] = line[s + 1]; }
      else if (ct === 0) { px[o] = px[o + 1] = px[o + 2] = line[s]; px[o + 3] = 255; }
      else { const idx = line[s]; px[o] = plte[idx * 3]; px[o + 1] = plte[idx * 3 + 1]; px[o + 2] = plte[idx * 3 + 2]; px[o + 3] = trns && idx < trns.length ? trns[idx] : 255; }
    }
    prev = line;
  }
  return { w, h, px };
}

/** the alpha bounding box — the DRAWN area, which is what every measured number is about */
function trim(img) {
  const { w, h, px } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 4) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < x0) return img;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1; const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) px.copy(out, y * nw * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + nw) * 4);
  return { w: nw, h: nh, px: out, trimmed: { x0, y0, from: [w, h] } };
}

/** box-filter downscale, premultiplied so soft edges do not darken */
function scale(img, maxW) {
  if (img.w <= maxW) return img;
  const s = maxW / img.w; const nw = maxW; const nh = Math.max(1, Math.round(img.h * s));
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor(y / s), sy1 = Math.min(img.h, Math.max(sy0 + 1, Math.floor((y + 1) / s)));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor(x / s), sx1 = Math.min(img.w, Math.max(sx0 + 1, Math.floor((x + 1) / s)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) {
        const o = (yy * img.w + xx) * 4; const al = img.px[o + 3] / 255;
        r += img.px[o] * al; g += img.px[o + 1] * al; b += img.px[o + 2] * al; a += img.px[o + 3]; n++;
      }
      const o = (y * nw + x) * 4; const am = a / n;
      out[o + 3] = Math.round(am);
      const un = am > 0 ? (n * 255) / a : 0;
      out[o] = Math.min(255, Math.round((r / n) * un)); out[o + 1] = Math.min(255, Math.round((g / n) * un)); out[o + 2] = Math.min(255, Math.round((b / n) * un));
    }
  }
  return { w: nw, h: nh, px: out, scaledFrom: [img.w, img.h] };
}

/** median cut over RGBA — alpha is a dimension, so a soft edge keeps its gradient */
function quantise(img, maxCols) {
  const { w, h, px } = img; const n = w * h;
  let boxes = [{ idx: Array.from({ length: n }, (_, i) => i) }];
  const span = (box, c) => { let lo = 255, hi = 0; for (const i of box.idx) { const v = px[i * 4 + c]; if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; };
  while (boxes.length < maxCols) {
    let bi = -1, bs = 0, bc = 0;
    boxes.forEach((box, i) => { if (box.idx.length < 2) return; for (let c = 0; c < 4; c++) { const s = span(box, c) * (c === 3 ? 1.4 : 1); if (s > bs) { bs = s; bi = i; bc = c; } } });
    if (bi < 0 || bs === 0) break;
    const box = boxes[bi]; box.idx.sort((a, b) => px[a * 4 + bc] - px[b * 4 + bc]);
    const mid = box.idx.length >> 1;
    boxes.splice(bi, 1, { idx: box.idx.slice(0, mid) }, { idx: box.idx.slice(mid) });
  }
  const pal = boxes.map((box) => {
    let r = 0, g = 0, b = 0, a = 0;
    for (const i of box.idx) { const al = px[i * 4 + 3] / 255; r += px[i * 4] * al; g += px[i * 4 + 1] * al; b += px[i * 4 + 2] * al; a += px[i * 4 + 3]; }
    const am = a / box.idx.length; const un = am > 0 ? (box.idx.length * 255) / a : 0;
    return [Math.min(255, Math.round((r / box.idx.length) * un)), Math.min(255, Math.round((g / box.idx.length) * un)), Math.min(255, Math.round((b / box.idx.length) * un)), Math.round(am)];
  });
  const map = Buffer.alloc(n);
  const cache = new Map();
  for (let i = 0; i < n; i++) {
    const key = px.readUInt32BE(i * 4);
    let best = cache.get(key);
    if (best === undefined) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
      let bd = Infinity; best = 0;
      for (let p = 0; p < pal.length; p++) {
        const d = (pal[p][0] - r) ** 2 + (pal[p][1] - g) ** 2 + (pal[p][2] - b) ** 2 + 2 * (pal[p][3] - a) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      cache.set(key, best);
    }
    map[i] = best;
  }
  return { pal, map };
}

function encode(w, h, pal, map) {
  const chunk = (typ, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(typ, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3;
  const plte = Buffer.alloc(pal.length * 3); pal.forEach((p, i) => { plte[i * 3] = p[0]; plte[i * 3 + 1] = p[1]; plte[i * 3 + 2] = p[2]; });
  const trns = Buffer.from(pal.map((p) => p[3]));
  /* one filter byte per row; filter 0 compresses best on indexed data */
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; map.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("PLTE", plte), chunk("tRNS", trns), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return c ^ -1; }

const [, , inPath, outPath, maxW, maxCols] = process.argv;
if (!inPath || !outPath) { console.error("usage: qc-art.mjs <in.png> <out.png> <maxWidth> [maxColours]"); process.exit(1); }
const src = decode(readFileSync(inPath));
const t = trim(src);
const s = scale(t, Number(maxW) || t.w);
const { pal, map } = quantise(s, Number(maxCols) || 200);
/**
 * ⚠️ THE QUANTISATION ERROR IS REPORTED, BECAUSE "IT LOOKS RIGHT" IS NOT A READING. Measured
 * against the scaled image it came from, over pixels the eye can see (alpha > 96), so a palette
 * that flattened a wash shows up as a number rather than as something somebody notices later.
 */
const err = (() => {
  let n = 0, sum = 0, worst = 0;
  for (let i = 0; i < s.w * s.h; i++) {
    if (s.px[i * 4 + 3] <= 96) continue;
    const p = pal[map[i]];
    const d = (Math.abs(p[0] - s.px[i * 4]) + Math.abs(p[1] - s.px[i * 4 + 1]) + Math.abs(p[2] - s.px[i * 4 + 2])) / 3;
    sum += d; if (d > worst) worst = d; n++;
  }
  return { meanRgb: Math.round((sum / Math.max(1, n)) * 100) / 100, worstRgb: Math.round(worst), pixels: n };
})();
const out = encode(s.w, s.h, pal, map);
writeFileSync(outPath, out);
console.log(JSON.stringify({
  in: inPath, out: outPath,
  source: [src.w, src.h], drawn: [t.w, t.h], trimmedAt: t.trimmed?.trimmed ?? t.trimmed, shipped: [s.w, s.h],
  colours: pal.length, bytes: out.length, kb: Math.round(out.length / 102.4) / 10, err,
}));
