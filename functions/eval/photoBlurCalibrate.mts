/**
 * Smart Import from photos — calibrate the blur threshold (smart-import-photos-v1, phase 4).
 *
 *   npx tsx functions/eval/photoBlurCalibrate.mts
 *
 * Runs the app's own blur measure (src/lib/photoImport.ts blurScore over a 512px greyscale copy, the
 * way src/lib/photoPrepare.ts measureBlur draws it) in Chromium over every rendered fixture page,
 * sharp and blurred, and prints both ranges. The threshold goes between them.
 */
import { chromium } from "playwright";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { blurScore, toGrey, BLUR_EDGE, BLUR_THRESHOLD } from "../../src/lib/photoImport.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "fixtures", "photos");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
const rows: { set: string; page: string; blurred: boolean; score: number }[] = [];
for (const set of readdirSync(dir).sort()) {
  for (const f of readdirSync(join(dir, set)).filter((x) => x.endsWith(".jpg")).sort()) {
    const b64 = readFileSync(join(dir, set, f)).toString("base64");
    const { w, h, data } = await page.evaluate(async ({ b64, edge }) => {
      const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      const s = Math.min(1, edge / Math.max(bmp.width, bmp.height));
      const w = Math.max(3, Math.round(bmp.width * s)), h = Math.max(3, Math.round(bmp.height * s));
      const c = new OffscreenCanvas(w, h); const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0, w, h);
      return { w, h, data: Array.from(ctx.getImageData(0, 0, w, h).data) };
    }, { b64, edge: BLUR_EDGE });
    rows.push({ set, page: f, blurred: set.endsWith("-blur"), score: blurScore(toGrey(data, w, h), w, h) });
  }
}
await browser.close();
const sharp = rows.filter((r) => !r.blurred).map((r) => r.score), blur = rows.filter((r) => r.blurred).map((r) => r.score);
const out = { threshold: BLUR_THRESHOLD, sharp: { min: Math.min(...sharp), max: Math.max(...sharp) }, blurred: { min: Math.min(...blur), max: Math.max(...blur) }, rows };
writeFileSync(join(here, "..", "..", "reports", "smart-import-photos-v1", "blur-calibration.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ threshold: out.threshold, sharp: out.sharp, blurred: out.blurred }));
for (const r of rows) console.log(`${r.blurred ? "BLUR " : "sharp"} ${r.score.toFixed(1).padStart(8)}  ${r.set}/${r.page}`);
