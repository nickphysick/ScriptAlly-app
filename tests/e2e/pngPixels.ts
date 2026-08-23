/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A MINIMAL PNG READER, so a lock can sample what was actually PAINTED.
 *
 * ⚠️ IT EXISTS BECAUSE `elementsFromPoint` IS NOT A PIXEL. It reports the DOM stack at a coordinate
 * — which element is on top — and says nothing about the colour that element rendered. A lock built
 * on it passed for two rounds over a header you could see through: the slab WAS topmost at every
 * point, and it was also 72% transparent. `getComputedStyle` was no better; it reported a
 * `backdrop-filter` that the browser never applied.
 *
 * No image library is installed and this needs none: PNG is `zlib` plus five scanline filters.
 */
import { inflateSync } from "node:zlib";

export type Bitmap = { width: number; height: number; at: (x: number, y: number) => [number, number, number] };

/** decode an 8-bit RGB/RGBA PNG — the only kinds a screenshot produces */
export function readPng(buf: Buffer): Bitmap {
  let p = 8;                                    /* past the signature */
  let w = 0, h = 0, colour = 6, depth = 8;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; colour = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (depth !== 8 || (colour !== 2 && colour !== 6)) throw new Error(`unsupported PNG: depth ${depth}, colour type ${colour}`);
  const bpp = colour === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  /* ⚠️ EVERY FILTER TYPE, because a screenshot uses whichever the encoder chose per row — assuming
     `None` decodes the first row and garbles the rest, which looks like noise rather than an error. */
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }
  return { width: w, height: h, at: (x, y) => {
    const i = y * stride + x * bpp;
    return [out[i], out[i + 1], out[i + 2]];
  } };
}
