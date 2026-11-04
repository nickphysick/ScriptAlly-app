/**
 * Smart Import from photos — the largest payload the browser's preparation can produce
 * (smart-import-photos-v1, phase 4). Ten 4032×3024 photos of pure noise (the worst case for JPEG:
 * nothing compresses) go through the same steps as photoPrepare.ts — 1568px on the long edge, JPEG
 * at each quality in turn — and the total base64 is set against the callable's cap.
 *   npx tsx functions/eval/photoPayloadWorst.mts
 */
import { chromium } from "playwright";
import { LONG_EDGE, JPEG_QUALITY, FALLBACK_QUALITIES, MAX_PAGES_CHARS, MAX_PAGE_CHARS } from "../../src/lib/photoImport.ts";
const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(async ({ edge, qs }) => {
  const W = 4032, H = 3024;
  const src = new OffscreenCanvas(W, H); const sctx = src.getContext("2d")!;
  const img = sctx.createImageData(W, H);
  let s = 12345; for (let i = 0; i < img.data.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; img.data[i] = i % 4 === 3 ? 255 : s & 255; }
  sctx.putImageData(img, 0, 0);
  const bmp = await createImageBitmap(src);
  const sc = Math.min(1, edge / Math.max(W, H)); const w = Math.round(W * sc), h = Math.round(H * sc);
  const res: Record<string, number> = {};
  for (const q of qs) {
    const c = new OffscreenCanvas(w, h); c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const n = (await (await c.convertToBlob({ type: "image/jpeg", quality: q })).arrayBuffer()).byteLength;
    res[String(q)] = Math.ceil(n / 3) * 4;
  }
  return { w, h, res };
}, { edge: LONG_EDGE, qs: [JPEG_QUALITY, ...FALLBACK_QUALITIES] });
await browser.close();
const rows = Object.entries(out.res).map(([q, page]) => ({ quality: Number(q), perPage: page, tenPages: page * 10, fits: page * 10 <= MAX_PAGES_CHARS && page <= MAX_PAGE_CHARS }));
console.log(JSON.stringify({ size: `${out.w}x${out.h}`, cap: MAX_PAGES_CHARS, rows }, null, 2));
