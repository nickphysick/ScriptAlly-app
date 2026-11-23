/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — THE FIDELITY SHEET. Each of the ref's 42 screens (design-refs/record-a-response-v2/screens, the
 * panel at 1440 × 900, 2x) beside the build's shot of the same screen (reports/record-a-response-v2/after, written by
 * tests/e2e/recordResponse2.shots.measure.ts), with a pixel diff and the share of pixels that differ.
 *
 * The diff runs in a headless page's canvas (Playwright's own Chromium), so it needs no image package: the build's shot is
 * drawn at the ref's size, and a pixel counts as different when any channel differs by more than 40 of 255.
 *
 *   node tests/e2e/rar2compare.mjs   → reports/record-a-response-v2/compare/index.html, diff/*.png, diffs.json
 *
 * ⚠️ A screen with no build shot is listed as "not captured", never as 0%. Reads files only; writes under reports/.
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const REF = "design-refs/record-a-response-v2/screens";
const AFTER = "reports/record-a-response-v2/after";
const OUT = "reports/record-a-response-v2/compare";
const refs = readdirSync(REF).filter((f) => f.endsWith(".png")).sort();
if (refs.length !== 42) throw new Error(`expected 42 reference screens, found ${refs.length}`);
mkdirSync(`${OUT}/diff`, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=a></canvas><canvas id=b></canvas>");
const rows = [];
for (const f of refs) {
  const built = `${AFTER}/${f}`;
  if (!existsSync(built)) { rows.push({ screen: f, pct: null }); continue; }
  const a = `data:image/png;base64,${readFileSync(`${REF}/${f}`).toString("base64")}`;
  const b = `data:image/png;base64,${readFileSync(built).toString("base64")}`;
  const r = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = ia.naturalWidth, h = ia.naturalHeight;
    const ca = new OffscreenCanvas(w, h), cb = new OffscreenCanvas(w, h);
    const xa = ca.getContext("2d"), xb = cb.getContext("2d");
    xa.drawImage(ia, 0, 0);
    xb.fillStyle = "#fff"; xb.fillRect(0, 0, w, h);
    xb.drawImage(ib, 0, 0, w, Math.round(ib.naturalHeight * (w / ib.naturalWidth)));
    const da = xa.getImageData(0, 0, w, h), db = xb.getImageData(0, 0, w, h);
    const out = new ImageData(w, h);
    let diff = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
      const g = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3;
      if (d > 40) { diff++; out.data.set([220, 40, 60, 255], i); } else out.data.set([g, g, g, 70], i);
    }
    const co = new OffscreenCanvas(w, h); co.getContext("2d").putImageData(out, 0, 0);
    const blob = await co.convertToBlob({ type: "image/png" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { pct: (diff / (w * h)) * 100, png: btoa(s), w, h, bw: ib.naturalWidth, bh: ib.naturalHeight };
  }, [a, b]);
  writeFileSync(`${OUT}/diff/${f}`, Buffer.from(r.png, "base64"));
  rows.push({ screen: f, pct: Math.round(r.pct * 10) / 10, ref: `${r.w}×${r.h}`, built: `${r.bw}×${r.bh}` });
}
await browser.close();
writeFileSync(`${OUT}/diffs.json`, JSON.stringify(rows, null, 1));

const fig = (src, cap) => `<figure><img src="${src}" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const body = rows.map((r) => `<section><h2>${r.screen.replace(".png", "")} · ${r.pct == null ? "not captured" : `${r.pct}% of pixels differ`}</h2><div class="trio">
${fig(`../../../${REF}/${r.screen}`, "Reference")}${r.pct == null ? '<p class="none">No build shot.</p><p></p>' : `${fig(`../after/${r.screen}`, `Build (${r.built})`)}${fig(`diff/${r.screen}`, "Diff (red: differs)")}`}</div></section>`).join("\n");
const table = rows.map((r) => `<tr><td>${r.screen.replace(".png", "")}</td><td>${r.pct == null ? "not captured" : `${r.pct}%`}</td></tr>`).join("");
writeFileSync(`${OUT}/index.html`, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Record a response v2 · ref beside build</title>
<style>
:root{--ink:#1c130f;--mut:#5b4f47;--page:#f2eee8;--line:#e2d9cc}
@media (prefers-color-scheme:dark){:root{--ink:#f2eee8;--mut:#c9bfb4;--page:#1b2433;--line:#3a4558}}
body{margin:0;padding:24px 16px 60px;background:var(--page);color:var(--ink);font:16px/1.45 Georgia,serif}
h1{font-size:24px;margin:0 0 6px}p.lead{margin:0 0 18px;color:var(--mut)}
table{border-collapse:collapse;margin:0 0 28px}td{padding:2px 14px 2px 0;border-bottom:1px solid var(--line);font-size:14px}
section{margin:0 0 36px;padding-top:16px;border-top:1px solid var(--line)}h2{font-size:17px;margin:0 0 12px}
.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0}
img{display:block;width:100%;height:auto;border-radius:10px;box-shadow:0 0 0 1px var(--line)}
figcaption{font-size:13px;color:var(--mut);margin-top:6px}.none{color:var(--mut);font-style:italic}
@media (max-width:760px){.trio{grid-template-columns:1fr}}
</style></head><body><h1>Record a response v2 · the reference beside the build</h1>
<p class="lead">The panel at 1440 × 900. A pixel counts as different when a channel differs by more than 40 of 255; the build's shot is drawn at the reference's width. The preview card is the app's own grid card, not the reference's drawing of it, and the data is the emulator's harness account, not the reference's sample queries, so names, dates and counts differ by design.</p>
<table><tbody>${table}</tbody></table>
${body}
</body></html>
`);
console.log(`compare: ${rows.filter((r) => r.pct != null).length}/${rows.length} screens captured → ${OUT}/index.html`);
