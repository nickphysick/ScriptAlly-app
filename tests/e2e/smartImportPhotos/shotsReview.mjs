/**
 * Smart Import from photos, phase 3 — the review's cut-outs and new questions, against the ref's
 * #agents and #queries, by one browser.
 *   SIP_BASE=http://127.0.0.1:4473 node tests/e2e/smartImportPhotos/shotsReview.mjs
 * The lab's real flow is fed the notebook fixture photo and a read whose `src` bands are the
 * fixture's own measured truth (functions/eval/photo-truth/hand-caveat-1p.json), then driven through
 * the overview to each new question. Screenshots + readings go to reports/smart-import-photos-v1/.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.SIP_BASE; if (!BASE) throw new Error("SIP_BASE is required");
const OUT = resolve("reports/smart-import-photos-v1");
const PAGE = resolve("functions/eval/fixtures/photos/hand-caveat-1p-sharp/page-1.jpg");
const truth = JSON.parse(readFileSync(resolve("functions/eval/photo-truth/hand-caveat-1p.json"), "utf8"));
const iso = { "23/5": "2026-05-23", "23/4/2026": "2026-04-23", "11/4/2026": "2026-04-11", "23 Aug": "2026-08-23", "21/9": "2026-09-21", "16/8": "2026-08-16", "3/8/26": "2026-08-03", "3/6": "2026-06-03", "13/4": "2026-04-13", "15 Apr": "2026-04-15" };
const agents = [], queries = [];
truth.entries.forEach((e, i) => {
  const ref = `a${i + 1}`, reasons = [];
  const agency = e.illegibleAgency ? e.agency.slice(0, e.illegibleAgency.legible) : e.agency;
  const a = { ref, name: e.name, agency };
  if (e.name === "Leo Kowalski") { reasons.push("check-reading"); a.readings = ["Leo Kowalski, Fairbairn Associates", "Leo Kowalsky, Fairbairn Associates"]; }
  if (e.illegibleAgency) reasons.push("illegible-agency");
  if (e.crossed) reasons.push("crossed-out");
  if (e.mark === "✗") reasons.push("mark-unclear");
  agents.push(a);
  queries.push({ agentRef: ref, status: e.crossed ? "Rejected" : e.expect, sentDate: iso[e.date] ?? null, sentDateRaw: e.date, timeline: [], reasons,
    src: { p: 1, y: e.band }, lineRaw: e.line, ...(e.mark === "✗" ? { markRaw: "✗" } : {}) });
});
const MOCK = { agents, queries };

const readings = {};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(`${BASE}/#/onb-lab?s=photos`);
await page.waitForSelector('[data-act="photos"]');
await page.setInputFiles('[data-picker="photos"]', [PAGE]);
await page.waitForSelector('[data-sf="photo"][data-status="ready"]');
await page.evaluate((m) => { window.__SA_SMART_IMPORT_MOCK = m; }, MOCK);
await page.click('[data-act="read"]');
await page.waitForSelector('[data-im="primary"]', { timeout: 60000 });
await page.click('[data-im="primary"]');
await page.waitForSelector('[data-im="deck"]');
const card = async (name) => {
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const c = document.querySelector('[data-im="deck-card"]');
    const snip = c?.querySelector('[data-im="deck-snip"] canvas');
    return { chip: c?.querySelector('[data-im="deck-chip"]')?.textContent, ask: c?.querySelector('[data-im="deck-ask"]')?.textContent, why: c?.querySelector('[data-im="deck-why"]')?.textContent,
      snip: snip ? { w: snip.width, h: snip.height, inked: (() => { const d = snip.getContext("2d").getImageData(0, 0, snip.width, snip.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 90) n++; return n; })() } : null,
      caption: c?.querySelector('[data-im="deck-snip"] figcaption')?.textContent, pos: document.querySelector('[data-im="deck-pos"]')?.textContent,
      primary: document.querySelector('[data-im="primary"]')?.textContent };
  });
  readings[name] = r;
  await page.screenshot({ path: `${OUT}/deck-${name}-1440.png`, fullPage: true });
  return r;
};
await card("agency-to-check");
await page.click('[data-im="deck-next"]');
await card("name-to-check");
await page.click('[data-reading="Leo Kowalski, Fairbairn Associates"]');
await page.click('[data-im="deck-dots"] button >> nth=0');
// See the whole page
await page.click('[data-im="deck-card"] [data-act="see-page"]');
await page.waitForSelector('[data-im="page-view"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/deck-whole-page-1440.png` });
readings.wholePage = await page.evaluate(() => ({ focused: document.activeElement?.getAttribute("data-act"), img: document.querySelector('[data-im="page-view"] img')?.naturalWidth }));
await page.keyboard.press("Escape");
readings.wholePageClosed = await page.locator('[data-im="page-view"]').count() === 0;
// answer the rest of the agents step
await page.locator('[data-im="deck-card"] .o9-esc button').first().click(); // Carry on without an agency
for (let i = 0; i < 6; i++) {
  const esc = page.locator('[data-im="deck-card"][data-answered="0"] .o9-esc button');
  if (await esc.count() === 0) break;
  await esc.first().click(); await page.waitForTimeout(200);
}
readings.agentsPrimary = await page.locator('[data-im="primary"]').textContent();
await page.click('[data-im="primary"]');
await page.waitForSelector('[data-im="deck"]');
await card("crossed-out");
readings.crossedCount = { before: await page.locator('[data-im="deck-pos"]').textContent() };
await page.click('[data-crossed="rejected"]');
await card("mark-to-explain");
readings.crossedCount.after = readings["mark-to-explain"].pos;
await ctx.close();
// the ref, same size
const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const id of ["agents", "queries"]) {
  const r = await rctx.newPage(); await r.goto("file://" + resolve("design-refs/smart-import-photos-v1.html") + "#" + id); await r.waitForTimeout(1200);
  await r.screenshot({ path: `${OUT}/ref-${id}-1440.png`, fullPage: true }); await r.close();
}
await browser.close();
writeFileSync(`${OUT}/phase3-readings.json`, JSON.stringify(readings, null, 2) + "\n");
console.log(JSON.stringify(readings, null, 2));
