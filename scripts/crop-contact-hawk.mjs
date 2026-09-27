/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's header art (page header v2 §4): the hawk alone, cropped from
 * `public/images/contact/hero-archivist.png` with the drawn card erased, on transparency.
 *
 *   node scripts/crop-contact-hawk.mjs clean /tmp/hawk.png public/images/contact/contact-hawk.webp
 *
 * ⚠️ THE CARD IS ERASED ALONG A FITTED LINE, NOT BY COLOUR: where the pink wash begins (a run of four
 * pink pixels, so the card's anti-aliased rust hairline is not mistaken for it) is fitted as one
 * straight line, and everything left of it goes — except in the rows the quill's nib crosses, where
 * only card-like pixels are erased inward from both ends of the span, stopping at ink, so the nib
 * and its pale fill survive. Then the result is trimmed to its own alpha, so the lowest ink is the
 * image's bottom edge and it stands on the header's rule.
 *
 * ⚠️ THE SOURCE HOLDS ONLY ~1.25× THE DRAWN SIZE (the crop is 389×344; the header draws it 276 tall),
 * so the export is native and never upscaled. A 2× export needs the illustrator's original: point
 * the crop box at it and re-run. Runs in Chromium via Playwright, because this machine has no image
 * library — the same reason the repo's other raster work is done in a browser canvas.
 */
import { chromium } from "@playwright/test";
import fs from "fs";
const [X0, Y0, X1, Y1] = [360, 18, 764, 364];
const src = "data:image/png;base64," + fs.readFileSync("public/images/contact/hero-archivist.png").toString("base64");
const b = await chromium.launch(); const p = await b.newPage();
const res = await p.evaluate(async ({ src, X0, Y0, X1, Y1, clean }) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = X1 - X0, H = Y1 - Y0;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); x.drawImage(img, X0, Y0, W, H, 0, 0, W, H);
  const id = x.getImageData(0, 0, W, H); const d = id.data;
  const edges = [];
  if (clean) {
    /* where the pink wash begins — a RUN of 4 pink pixels, so a pinkish anti-aliased pixel of the
       card's rust hairline is not taken for it — then a straight line fitted through those rows:
       the card's edge is straight, and the fit carries it through rows the wash does not reach */
    const isPink = (i, j) => { const k = (j * W + i) * 4; return d[k+3] > 0 && d[k] - d[k+2] > 14 && d[k] > 200 && d[k+1] > 170; };
    const pts = [];
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < 80; i++) {
        if (isPink(i, j) && isPink(i+1, j) && isPink(i+2, j) && isPink(i+3, j)) { pts.push([j, i]); break; }
      }
    }
    /* robust-ish fit: least squares, drop the worst 20%, fit again */
    const fit = (ps) => { const n = ps.length; let sy=0, sx=0, syy=0, syx=0; for (const [y, x] of ps) { sy+=y; sx+=x; syy+=y*y; syx+=y*x; } const b = (n*syx - sy*sx) / (n*syy - sy*sy); return [ (sx - b*sy) / n, b ]; };
    let [a0, b0] = fit(pts);
    const kept = pts.map((q) => [q, Math.abs(q[1] - (a0 + b0*q[0]))]).sort((u, v) => u[1] - v[1]).slice(0, Math.floor(pts.length * 0.8)).map((u) => u[0]);
    [a0, b0] = fit(kept);
    const edgeAt = (j) => Math.floor(a0 + b0 * j);
    for (let j = 0; j < H; j++) edges.push(edgeAt(j));
    const N0 = 140, N1 = 184; // the rows the nib crosses the card's border in
    /* outside the nib's rows the card is simply everything left of the line */
    for (let j = 0; j < H; j++) {
      if (j >= N0 && j <= N1) continue;
      for (let i = 0; i < Math.min(W, edgeAt(j)); i++) d[(j * W + i) * 4 + 3] = 0;
    }
    /* inside them, erase CARD-LIKE pixels (pale, rust, blue, clear) inward from both ends of the
       span — the image's left edge and the card's line — stopping at the first ink either way, so
       whatever lies between the nib's two outlines survives, however gappy the outline is */
    const cardLike = (i, j) => { const k = (j * W + i) * 4, r = d[k], g = d[k+1], bb = d[k+2], a = d[k+3];
      if (a === 0) return true; const lum = 0.3*r + 0.59*g + 0.11*bb;
      return lum > 222 || (r - g > 8 && r - bb > 8) || bb > r + 6; };
    const ink = (i, j) => { const k = (j * W + i) * 4; return d[k+3] > 0 && 0.3*d[k] + 0.59*d[k+1] + 0.11*d[k+2] < 150; };
    for (let j = N0; j <= N1; j++) {
      const e = Math.min(W, edgeAt(j));
      let i = 0; while (i < e && !ink(i, j)) { if (cardLike(i, j)) d[(j * W + i) * 4 + 3] = 0; i++; }
      let r = e - 1; while (r > i && !ink(r, j)) { if (cardLike(r, j)) d[(j * W + r) * 4 + 3] = 0; r--; }
    }
    x.putImageData(id, 0, 0);
  }
  /* trim to the drawing's own alpha bounds, so its lowest ink is the image's bottom edge */
  const dd = x.getImageData(0, 0, W, H).data; let t = H, bt = 0, l = W, rt = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (dd[(j * W + i) * 4 + 3] > 8) { t = Math.min(t, j); bt = Math.max(bt, j); l = Math.min(l, i); rt = Math.max(rt, i); }
  const o = document.createElement("canvas"); o.width = rt - l + 1; o.height = bt - t + 1;
  o.getContext("2d").drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height);
  const cc = o;
  return { box: [l, t, rt, bt], png: cc.toDataURL("image/png"), webp: cc.toDataURL("image/webp", 0.95), edges, W: cc.width, H: cc.height };
}, { src, X0, Y0, X1, Y1, clean: process.argv[2] === "clean" });
fs.writeFileSync(process.argv[3], Buffer.from(res.png.split(",")[1], "base64"));
if (process.argv[4]) fs.writeFileSync(process.argv[4], Buffer.from(res.webp.split(",")[1], "base64"));
console.log(res.W, res.H, "box", res.box, "edge top", res.edges[0], "bottom", res.edges[res.edges.length-1]);
await b.close();
