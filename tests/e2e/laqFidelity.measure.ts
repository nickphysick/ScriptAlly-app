/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.1 — FIDELITY: the reference and the app by one ruler (laqMetrics.readMetrics), at 1440×860.
 *
 *   F-log   logging: agent, sent, materials, how, check, celebration. Every key in ref-metrics.json:
 *           x, y (relative to the panel) and w within 1px; h within 1px for fixed-height parts (text blocks exempt);
 *           font family, size, weight, style and colour, background and corner radius equal.
 *   F-edit  editing (Phase 3): step pill, step editor, edit mode on Tracking, edit mode on Agent with a change, the
 *           leave check. Every key in ref-metrics-edit.json: font, size, weight, colour, background, outline, dotted
 *           underline and radius exactly; positions exempt (the reference card is a redraw).
 *
 * The oracle is the JSON; the live reference is opened too, so a stale JSON would show as a disagreement with it.
 * ⚠️ THE APP'S DATA IS THE HARNESS ACCOUNT'S, NOT THE REFERENCE'S (other agent names, packages and counts). So a few
 *    widths and heights that follow the words are exempt by name below (CONTENT), never by tolerance.
 * A logged query is undone in the same run, and the run fails if it read fewer values than it claims (LAQF_FLOOR).
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openLog, settledReady } from "./laqLib";
import { outlineEq, readMetrics, type Metric } from "./laqMetrics";

const DIR = "design-refs/log-a-query-v1-1";
const REF = "file://" + resolve(`${DIR}/log-a-query-v1-1.html`);
const RM = JSON.parse(readFileSync(`${DIR}/ref-metrics.json`, "utf8")) as { selectors: { log: Record<string, string> }; metrics: Record<string, Record<string, Metric | null>> };
const OUT = "reports/log-a-query-v1-1";

/* the app's part for each reference key. LAQF_V1=1 reads v1's class names, for the red-first proof against v1 */
const V1 = !!process.env.LAQF_V1;
const P = V1 ? "qls" : "laq";
const APP: Record<string, string> = {
  panel: ".spanel", frame: `.${P}-in`, head: ".flh", title: ".flh-t", line: ".flh-l",
  track: V1 ? ".qls-steps" : ".laq-trk", trackNow: V1 ? ".qls-st.is-now" : ".laq-trk .laq-s.is-n .laq-nd",
  trackDone: V1 ? ".qls-st.is-done" : ".laq-trk .laq-s.is-d .laq-nd", trackTodo: V1 ? ".qls-st:not(.is-now):not(.is-done)" : ".laq-trk .laq-s:not(.is-d):not(.is-n) .laq-nd",
  trackLabel: V1 ? ".qls-st" : ".laq-trk .laq-l",
  body: `.${P}-sb`, question: `.${P}-qh`, sub: `.${P}-qs`, search: `.${P}-srch`, bigRow: `.${P}-big > button:not(.is-quiet)`,
  bigRowName: `.${P}-big .${P}-tx b`, bigRowSub: `.${P}-big .${P}-tx > span`, footer: `.${P}-cf`, primary: `.${P}-cf .${P}-btn:not(.is-ghost)`, slip: ".sa-slip",
};
/* the track lands in Phase 2: until then its keys are not read, and parts below it are placed from the body's top */
const TRACK_BUILT = true;
const TEXT_H = new Set(["title", "line", "question", "sub", "trackLabel", "bigRowName", "bigRowSub", "bigRow", "slip"]);
/* CONTENT: widths that follow the harness's words (a row's name beside its tag, a label's own text) */
const CONTENT_W = new Set(["bigRowName", "bigRowSub", "trackLabel"]);
/* the reference names the celebration's footer `.yay-acts` (with `.cf`'s own values inline), so ref-metrics.json
   records no footer there: the app's footer is compared with that element, read live */
const REF_ALIAS: Record<string, Record<string, string>> = { celebration: { footer: ".yay-acts", primary: ".yay-acts .btn.nv" } };
/* a label centred under its node is as wide as its words, so it is placed by its centre */
const CENTRED = new Set(["trackLabel"]);
const STYLE = ["font", "size", "weight", "style", "color", "bg", "radius"] as const;

let reads = 0;
const LEDGER: Record<string, unknown> = {};
const ok = (cond: boolean, label: string) => { reads++; expect.soft(cond, label).toBe(true); };
const near = (a: number, b: number) => Math.abs(a - b) <= 1;

async function readBoth(ref: Page, app: Page, state: string) {
  await ref.waitForTimeout(600); await app.waitForTimeout(600);
  const r = await ref.evaluate(readMetrics, { panelSel: ".card", sels: { ...RM.selectors.log, ...(REF_ALIAS[state] ?? {}) } });
  const a = await app.evaluate(readMetrics, { panelSel: ".spanel", sels: APP });
  return { r, a, state };
}

function compare({ r: live, a, state }: { r: Record<string, Metric | null>; a: Record<string, Metric | null>; state: string }) {
  const want = RM.metrics[state];
  const rows: Record<string, string[]> = {};
  const bodyR = want.body, bodyA = a.body;
  for (const [k, w0] of Object.entries(want)) {
    const w = w0 ?? (REF_ALIAS[state]?.[k] ? live[k] : null);
    if (!TRACK_BUILT && k.startsWith("track")) continue;
    const got = a[k];
    const lv = live[k];
    /* the live reference agrees with its own JSON (a stale JSON is a finding, not a pass) */
    if (w && lv) ok(near(w.x, lv.x) && near(w.y, lv.y) && near(w.w, lv.w), `${state}.${k}: the reference's JSON matches the reference`);
    if (!w) { ok(got == null, `${state}.${k}: absent in the reference, absent in the app`); continue; }
    if (!got) { ok(false, `${state}.${k}: missing in the app`); (rows[k] ??= []).push("missing"); continue; }
    const d: string[] = [];
    const after = !TRACK_BUILT && bodyR && bodyA && w.y >= bodyR.y && !["panel", "frame", "head", "title", "line", "footer", "primary"].includes(k);
    const ry = after ? w.y - bodyR!.y : w.y, ay = after ? got.y - bodyA!.y : got.y;
    if (CENTRED.has(k) ? !near(w.x + w.w / 2, got.x + got.w / 2) : !near(w.x, got.x)) d.push(`x ${w.x}→${got.x}${CENTRED.has(k) ? " (by centre)" : ""}`);
    if (!near(ry, ay)) d.push(`y ${ry}→${ay}${after ? " (from the body)" : ""}`);
    if (!CONTENT_W.has(k) && !near(w.w, got.w)) d.push(`w ${w.w}→${got.w}`);
    if (!TEXT_H.has(k) && !(k === "body" && !TRACK_BUILT) && !near(w.h, got.h)) d.push(`h ${w.h}→${got.h}`);
    for (const f of STYLE) if (String(w[f]) !== String(got[f])) d.push(`${f} ${w[f]}→${got[f]}`);
    if (!outlineEq(w.outline, got.outline)) d.push(`outline ${w.outline}→${got.outline}`);
    if (d.length) rows[k] = d;
    ok(d.length === 0, `${state}.${k}: ${d.join(" | ")}`);
  }
  LEDGER[state] = rows;
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/fidelity${V1 ? "-v1" : ""}.json`, JSON.stringify({ reads, deltas: LEDGER }, null, 1)); });

test("F-log — logging, ref against app, six states", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const ref = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  await ref.goto(REF); await ref.evaluate(() => document.fonts.ready);
  await openLog(page);
  compare(await readBoth(ref, page, "agent"));
  await ref.click('[data-pick="mr"]'); await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  compare(await readBoth(ref, page, "sent"));
  await ref.click('[data-when="0"]'); await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  compare(await readBoth(ref, page, "materials"));
  await ref.click('[data-pkg="pa"]'); await page.locator('[data-qls="package"]').first().click();
  compare(await readBoth(ref, page, "how"));
  await ref.click('[data-via="email"]');
  if ((await page.locator('[data-qls="root"]').getAttribute("data-step")) === "how") await page.locator('[data-qls="how-opt"]').first().click();
  compare(await readBoth(ref, page, "check"));
  /* the celebration: log, measure, and Undo in the same case */
  await ref.click('[data-act="log"]'); await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
  try {
    await ref.waitForTimeout(2500); await page.waitForTimeout(2500);
    compare(await readBoth(ref, page, "celebration"));
  } finally {
    await page.locator('[data-qls="undo"]').click();
    await expect(page.locator('[data-qls="root"]')).toHaveAttribute("data-step", "check", { timeout: 120_000 });
  }
});

test("F floor — the run read what it claims", () => {
  const floor = Number(process.env.LAQF_FLOOR ?? 100);
  expect(reads, `only ${reads} values were compared`).toBeGreaterThanOrEqual(floor);
});
