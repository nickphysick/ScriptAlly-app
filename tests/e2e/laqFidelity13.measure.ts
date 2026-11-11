/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.3 — FIDELITY: the reference (design-refs/log-a-query-v1-3/log-a-query-v1-3.html, navy header, "Over
 * the Dashboard, dimmed" so it sits where the app's panel sits) and the build at 1440×900, for screens 01–09:
 *   01  Joanna · the pieces · Opening pages open: 3 chapters of "Prologue cut, flashback first", the Done line in view
 *   02  01 after Done
 *   03  Joanna · Nudge · Unknown (the chips count from the send, Close it waits)
 *   04  03 slid to 6 weeks: the reply date and "Save 6 weeks to Joanna's card", ticked
 *   05  Marcus · Nudge from his card (8 weeks, a week later)
 *   06  05 slid to 10 weeks, "Update Marcus's card to 10 weeks" ticked
 *   07  Rosalind · Nudge · Close it preselected, "Rosalind's card says no reply means no"
 *   08  the slip alone: Marcus, "Reply expected by 4 Jan" · "Nudge scheduled for 11 Jan"
 *   09  the slip alone: Marcus with Close it, "Closes 5 Jan if no reply"
 * The app's clock is held at the reference's day (Monday 9 November 2026) so the dates are the reference's.
 * For each: every named part's box relative to the panel (or the slip) within 1px, and its font, size, weight, style,
 * colour, background and corner radius (laqMetrics.readMetrics); then both as PNGs, side by side, with an in-browser
 * pixel diff (a pixel differs when a channel is more than 32 of 255 apart). Fixture: seedLaq13.mjs, removed after.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn } from "./measure";
import { readMetrics, type Metric } from "./laqMetrics";

const REF = "file://" + resolve("design-refs/log-a-query-v1-3/log-a-query-v1-3.html");
const OUT = "reports/log-a-query-v1-3";
const SHOTS = `${OUT}/shots`, SBS = `${OUT}/side-by-side`;
const W = 1440, H = 900;
const TODAY = new Date(2026, 10, 9, 10, 0, 0);

const PANEL: Record<string, [string, string]> = {
  panel: [".card", ".spanel"],
  head: [".flh", ".flh"], title: [".flh-t", ".flh-t"], line: [".flh-l", ".flh-l"], close: [".flh-x", ".flh-x"],
  track: [".ltrk", ".laq-trk"],
  trackDone: [".ltrk .s.d .nd", ".laq-trk .laq-s.is-d .laq-nd"], trackNow: [".ltrk .s.n .nd", ".laq-trk .laq-s.is-n .laq-nd"],
  trackTodo: [".ltrk .s:not(.d):not(.n) .nd", ".laq-trk .laq-s:not(.is-d):not(.is-n) .laq-nd"],
  trackLabelDone: [".ltrk .s.d .l", ".laq-trk .laq-s.is-d .laq-l"], trackLabelTodo: [".ltrk .s:not(.d):not(.n) .l", ".laq-trk .laq-s:not(.is-d):not(.is-n) .laq-l"],
  body: [".sb", ".laq-sb"], question: [".sb .qh:not(.q2)", ".laq-qh:not(.is-q2)"], sub: [".sb .qs", ".laq-sb p.laq-qs"],
  asksNil: [".asks.nil p", ".laq-asks.is-nil p"],
  pieceRow: [".pcs > .pc", ".laq-pcs > .laq-pc"], pieceName: [".pcs > .pc .tx b", ".laq-pcs > .laq-pc .laq-tx b"], pieceVr: [".pcs > .pc .vr", ".laq-pcs > .laq-pc .laq-vr"],
  sampleBlock: [".pcw", ".laq-pcw"], sampleVr: [".pcw .vr", ".laq-pcw .laq-vr"],
  sampleCtl: [".qsamp", ".laq-qsamp"], sampleLabel: [".qsamp .srow b", ".laq-qsamp .qad-srow b"],
  stepper: [".qsamp .amt .stp", ".laq-qsamp .qad-amt .qad-step"], chipOn: [".qsamp .chip.on", ".laq-qsamp .qad-presets .qad-chip.on"],
  versionRow: [".qsamp .vrow", ".laq-vrow"], versionLabel: [".qsamp .vrow > span:first-child", ".laq-vrow > span:first-child"], versionPill: [".qsamp .vrow .vr2", ".laq-vr2"],
  doneRow: [".qsamp .sdone", ".laq-sdone"], doneLine: [".qsamp .sdone p", ".laq-sdone p"], doneAmt: [".qsamp .sdone p b", ".laq-sdone p b"], doneBtn: [".qsamp .sdone .btn", ".laq-sdone .laq-btn"],
  backLink: [".sb .ask .lk", ".laq-ask .laq-lk"],
  wkBox: [".wkb", ".laq-wkb"], wkLabel: [".wkh b", ".laq-wkb .sa-label"], wkRead: [".wkh .rd2", ".laq-wkb .sa-wk-read"], wkUnk: [".wkh .unk", ".laq-wkb .sa-wk-unkbtn"],
  wkSlider: [".wks", ".laq-wkb .sa-wk-slider"], wkEnds: [".wke", ".laq-wkb .sa-wk-ends"], wkBy: [".wkx", ".laq-wkx"], wkByDate: [".wkx b", ".laq-wkx b"],
  saveRow: [".svk", ".laq-svk"], saveTick: [".svk .bx3", ".laq-bx3"], saveHead: [".svk b", ".laq-svk b"], saveSub: [".svk i", ".laq-svk i"],
  q2: [".qh.q2", ".laq-qh.is-q2"],
  opt: [".nopt", ".laq-nopt"], optOn: [".nopt.on", ".laq-nopt.is-on"], optRadio: [".nopt .rd", ".laq-rd"], optTitle: [".nopt .tx b", ".laq-nopt .laq-tx b"],
  optSub: [".nopt .tx span", ".laq-nopt .laq-tx span"], optTag: [".nopt .tag", ".laq-ntag"], optDis: [".nopt.dis", ".laq-nopt.is-dis"],
  nchip: [".nch .chip:not(.on)", ".laq-chip:not(.is-on)"], nchipOn: [".nch .chip.on", ".laq-chip.is-on"],
  footer: [".cf", ".laq-cf"], primary: [".cf .btn.nv", ".laq-cf .laq-btn"], backFoot: [".cf .lnk", ".laq-cf .laq-lnk"],
};
const SLIP: Record<string, [string, string]> = {
  slip: [".frame", ".sa-slip-in"],
  name: [".top .n", ".qc153-nm"], agency: [".top .ag", ".qc153-ag"],
  queriedLabel: [".facts .fact:nth-child(1) > span", '[data-k="queried"] .qc153-fl'], queriedValue: [".facts .fact:nth-child(1) b", '[data-k="queried"] b'],
  nextBox: [".facts .fact:nth-child(3)", '[data-k="next"]'], nextLabel: [".facts .fact:nth-child(3) > span", '[data-k="next"] .qc153-fl'],
  nextValue: [".facts .fact:nth-child(3) b", '[data-k="next"] b'], nextLine: [".facts .fact:nth-child(3) em", '[data-k="next"] em'],
  nextBar: [".facts .fact:nth-child(3) u", '[data-k="next"] .qc153-win'],
  polValue: [".facts .fact.pol b", '[data-k="policy"] b'], polLine: [".facts .fact.pol em", '[data-k="policy"] em'],
};
const STYLE = ["font", "size", "weight", "style", "color", "bg", "radius"] as const;
const TEXT_W = new Set(["line", "question", "sub", "asksNil", "pieceName", "trackLabelDone", "trackLabelTodo", "versionLabel", "doneLine", "doneAmt", "wkLabel", "wkRead", "wkBy", "wkByDate",
  "saveHead", "saveSub", "q2", "optTitle", "optSub", "optTag", "name", "agency", "queriedLabel", "queriedValue", "nextLabel", "nextValue", "nextLine", "polValue", "polLine"]);

const LEDGER: Record<string, unknown> = {};
let reads = 0;
const ok = (cond: boolean, label: string) => { reads++; expect.soft(cond, label).toBe(true); };

test.beforeAll(() => { execSync("node tests/e2e/seedLaq13.mjs --clean && node tests/e2e/seedLaq13.mjs", { stdio: "ignore" }); });
test.afterAll(() => { execSync("node tests/e2e/seedLaq13.mjs --clean", { stdio: "ignore" }); });
const writeLedger = () => { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/fidelity.json`, JSON.stringify({ reads, ...LEDGER }, null, 1)); };

/* ── the reference ── */
async function refOpen(page: Page) {
  await page.setViewportSize({ width: W, height: H });
  await page.goto(REF);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#where button[data-w="1"]').click();
}
const refClick = (page: Page, sel: string) => page.locator(`#ci ${sel}`).first().click({ timeout: 10_000 });
async function refJourney(page: Page, journey: string, agent: string) {
  await page.evaluate((j) => (document.querySelector(`#journeys button[data-j="${j}"]`) as HTMLElement).click(), journey);
  await refClick(page, `[data-pick="${agent}"]`);
  await refClick(page, '[data-when="0"]');
}
const refSlide = (page: Page, n: number) => page.locator("#ci #wk").evaluate((el, v) => {
  (el as HTMLInputElement).value = String(v); el.dispatchEvent(new Event("input", { bubbles: true }));
}, n);

/* ── the app ── */
async function appOpen(page: Page) {
  await page.clock.setFixedTime(TODAY);
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq13-ms"); } catch { /* none */ } });
  await page.setViewportSize({ width: W, height: H });
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  await page.goto("/dashboard");
}
async function appStart(page: Page, agent: string) {
  const door = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await door.waitFor({ state: "visible", timeout: 60_000 });
  await door.click();
  await page.locator(`[data-qls="agent"][data-id="${agent}"]`).click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expect(page.locator('[data-qls="root"]')).toHaveAttribute("data-step", "what");
}
async function appToNudge(page: Page, agent: string) {
  await appStart(page, agent);
  await page.locator('[data-qls="package"][data-id="laq13-pa"]').click();
  if ((await page.locator('[data-qls="root"]').getAttribute("data-step")) === "how") await page.locator('[data-qls="how-opt"]').first().click();
  await expect(page.locator('[data-qls="root"]')).toHaveAttribute("data-step", "nudge");
}
const appSlide = (page: Page, n: number) => page.locator('[data-qls="weeks"] input[type="range"]').evaluate((el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, String(v));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, n);
const closeApp = async (page: Page) => { await page.keyboard.press("Escape"); await expect(page.locator('[data-qls="root"]')).toHaveCount(0); };

async function settle(page: Page) { await page.mouse.move(2, 2); await page.waitForTimeout(700); }
const scroll = (page: Page, sel: string, bottom: boolean) => page.evaluate(([s, b]) => { for (const e of document.querySelectorAll<HTMLElement>(s as string)) e.scrollTop = b ? e.scrollHeight : 0; }, [sel, bottom] as const);

async function compare(ref: Page, app: Page, state: string, parts: Record<string, [string, string]>, refPanel: string, appPanel: string) {
  const r = await ref.evaluate(readMetrics, { panelSel: refPanel, sels: Object.fromEntries(Object.entries(parts).map(([k, [s]]) => [k, s])) });
  const a = await app.evaluate(readMetrics, { panelSel: appPanel, sels: Object.fromEntries(Object.entries(parts).map(([k, [, s]]) => [k, s])) });
  const rows: Record<string, string[]> = {};
  for (const k of Object.keys(parts)) {
    const w = r[k] as Metric | null, g = a[k] as Metric | null;
    if (!w && !g) continue;
    if (!w || !g) { ok(false, `${state}.${k}: ${w ? "missing in the app" : "absent in the reference, present in the app"}`); rows[k] = [w ? "missing" : "extra"]; continue; }
    const d: string[] = [];
    if (Math.abs(w.x - g.x) > 1) d.push(`x ${w.x}→${g.x}`);
    if (Math.abs(w.y - g.y) > 1) d.push(`y ${w.y}→${g.y}`);
    if (!TEXT_W.has(k) && Math.abs(w.w - g.w) > 1) d.push(`w ${w.w}→${g.w}`);
    if (!TEXT_W.has(k) && Math.abs(w.h - g.h) > 1) d.push(`h ${w.h}→${g.h}`);
    /* a range input draws no text: its font is never seen */
    for (const s of STYLE) if (!(k === "wkSlider" && (s === "font" || s === "size" || s === "color")) && String(w[s]) !== String(g[s])) d.push(`${s} ${w[s]}→${g[s]}`);
    ok(d.length === 0, `${state}.${k}: ${d.join("; ") || "equal"}`);
    rows[k] = d;
  }
  LEDGER[state] = { rows, ref: r, app: a };
}
async function panel(ref: Page, app: Page, state: string, name: string, bottom = false) {
  await scroll(ref, ".sb", bottom); await scroll(app, ".laq-sb", bottom);
  await settle(ref); await settle(app);
  await compare(ref, app, state, PANEL, ".card", ".spanel");
  mkdirSync(SHOTS, { recursive: true });
  await ref.locator(".card").screenshot({ path: `${SHOTS}/${name}-ref.png`, animations: "disabled" });
  await app.locator(".spanel:has([data-qls='root'])").screenshot({ path: `${SHOTS}/${name}-build.png`, animations: "disabled" });
}
async function slip(ref: Page, app: Page, state: string, name: string) {
  await settle(ref); await settle(app);
  await compare(ref, app, state, SLIP, ".qslip .frame", "[data-qls='preview'] .sa-slip-in");
  mkdirSync(SHOTS, { recursive: true });
  await ref.locator(".qslip").screenshot({ path: `${SHOTS}/${name}-ref.png`, animations: "disabled" });
  await app.locator("[data-qls='preview']").screenshot({ path: `${SHOTS}/${name}-build.png`, animations: "disabled" });
  const words = async (p: Page, sel: string) => ((await p.locator(sel).first().textContent()) ?? "").replace(/\s+/g, " ").trim();
  const rw = { label: await words(ref, ".qslip .facts .fact:nth-child(3) > span"), value: await words(ref, ".qslip .facts .fact:nth-child(3) b"), line: await words(ref, ".qslip .facts .fact:nth-child(3) em") };
  const aw = { label: await words(app, "[data-qls='preview'] [data-k='next'] .qc153-fl"), value: await words(app, "[data-qls='preview'] [data-k='next'] b"), line: await words(app, "[data-qls='preview'] [data-k='next'] em") };
  (LEDGER[state] as Record<string, unknown>).words = { ref: rw, app: aw };
  ok(JSON.stringify(rw) === JSON.stringify(aw), `${state}: the Next fact's words (${JSON.stringify(rw)} / ${JSON.stringify(aw)})`);
}

test("fidelity — 01 to 09 against the reference", async ({ browser }) => {
  test.setTimeout(900_000);
  const ref = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage();
  const app = await browser.newPage();
  await refOpen(ref);
  await appOpen(app);

  /* 01 — Joanna, the pieces, Opening pages open: 3 chapters of "Prologue cut, flashback first", scrolled to the Done line */
  await refJourney(ref, "log", "jl");
  await refClick(ref, '[data-act="custom"]');
  /* the reference's pieces view opens with Opening pages already ticked and its control open; the app's ticks it here */
  /* Joanna's card asks for nothing, so the sample opens at 3 chapters in both: nothing to set */
  await refClick(ref, '[data-vr="ver"]'); await refClick(ref, '[data-set="ver:v3"]');
  await appStart(app, "laq13-jl");
  await app.locator('[data-qls="choose-pieces"]').click();
  await app.locator('[data-qls="piece"][data-k="sample"]').click();
  const ctl = app.locator('[data-qls="sample-control"]');
  await expect(ctl.locator(".qad-srow .qad-seg button.on")).toHaveText("Chapters");
  await app.locator('[data-qls="vr"][data-k="ver"]').click();
  await app.locator('[data-qls="menu"] [data-qls="menu-item"]', { hasText: "Prologue cut, flashback first" }).click();
  await panel(ref, app, "01", "01-sample-control-done", true);

  /* 02 — after Done */
  await refClick(ref, '[data-act="sampdone"]');
  await app.locator('[data-qls="sample-done-btn"]').click();
  await panel(ref, app, "02", "02-materials-after-done");

  /* 03 — on to Nudge: Unknown */
  await refClick(ref, '[data-act="pieces"]'); await refClick(ref, '[data-via="email"]');
  await app.locator('[data-qls="pieces-continue"]').click();
  await app.locator('[data-qls="how-opt"][data-k="Email"]').click();
  await expect(app.locator('[data-qls="root"]')).toHaveAttribute("data-step", "nudge");
  await panel(ref, app, "03", "03-nudge-no-card-unknown");

  /* 04 — 6 weeks */
  await refSlide(ref, 6); await appSlide(app, 6);
  await panel(ref, app, "04", "04-nudge-no-card-6-weeks");
  await closeApp(app);

  /* 05 — Marcus, from his card */
  await refJourney(ref, "nudge", "mr");
  await refClick(ref, '[data-pkg="pa"]'); await refClick(ref, '[data-via="email"]');
  await appToNudge(app, "laq13-mr");
  await panel(ref, app, "05", "05-nudge-from-card");

  /* 06 — 10 weeks, the update ticked */
  await refSlide(ref, 10); await refClick(ref, '[data-act="savewk"]');
  await appSlide(app, 10); await app.locator('[data-qls="save-weeks"]').click();
  await panel(ref, app, "06", "06-nudge-update-card");
  await closeApp(app);

  /* 07 — Rosalind: Close it */
  await refJourney(ref, "nudge", "ra");
  await refClick(ref, '[data-pkg="pa"]'); await refClick(ref, '[data-via="qm"]');
  await appToNudge(app, "laq13-ra");
  await panel(ref, app, "07", "07-nudge-no-reply-means-no");
  await closeApp(app);

  /* 08 — Marcus's slip with a nudge a week after the reply date */
  await refJourney(ref, "nudge", "mr");
  await refClick(ref, '[data-pkg="pa"]'); await refClick(ref, '[data-via="email"]');
  await refClick(ref, '[data-act="nudgedone"]');
  await appToNudge(app, "laq13-mr");
  await app.locator('[data-qls="nudge-continue"]').click();
  await expect(app.locator('[data-qls="root"]')).toHaveAttribute("data-step", "check");
  await slip(ref, app, "08", "08-slip-reply-expected-nudge");

  /* 09 — back to Nudge, Close it */
  await refClick(ref, '[data-goto="nudge"]'); await refClick(ref, '[data-ifno="close"]'); await refClick(ref, '[data-act="nudgedone"]');
  await app.locator('[data-qls="step"][data-k="nudge"]').click();
  await app.locator('[data-qls="nudge-opt"][data-k="close"] button').click();
  await app.locator('[data-qls="nudge-continue"]').click();
  await expect(app.locator('[data-qls="root"]')).toHaveAttribute("data-step", "check");
  await slip(ref, app, "09", "09-slip-reply-expected-close");
  await closeApp(app);

  writeLedger();
  expect(reads).toBeGreaterThanOrEqual(150);
});

const PAIRS = ["01-sample-control-done", "02-materials-after-done", "03-nudge-no-card-unknown", "04-nudge-no-card-6-weeks", "05-nudge-from-card",
  "06-nudge-update-card", "07-nudge-no-reply-means-no", "08-slip-reply-expected-nudge", "09-slip-reply-expected-close"];
const uri = (p: string) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

test("side by side, and the diffs", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(SBS, { recursive: true });
  await page.setViewportSize({ width: 2000, height: 1100 });
  const table: Record<string, number> = {};
  for (const k of PAIRS) {
    await page.setContent(`<body style="margin:0;background:#f4f0ea;font:14px Georgia,serif;color:#1c130f">
      <div id="w" style="display:flex;gap:24px;padding:20px;align-items:flex-start">
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Reference · ${k}</figcaption><img id="a" src="${uri(`${SHOTS}/${k}-ref.png`)}"></figure>
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Build · ${k}</figcaption><img id="b" src="${uri(`${SHOTS}/${k}-build.png`)}"></figure>
        <figure style="margin:0"><figcaption id="dc" style="margin:0 0 8px">Diff</figcaption><canvas id="d"></canvas></figure>
      </div></body>`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    table[k] = await page.evaluate(() => {
      const a = document.getElementById("a") as HTMLImageElement, b = document.getElementById("b") as HTMLImageElement;
      const w = Math.max(a.naturalWidth, b.naturalWidth), h = Math.max(a.naturalHeight, b.naturalHeight);
      const px = (img: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const x = cv.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
      const A = px(a), B = px(b);
      const d = document.getElementById("d") as HTMLCanvasElement; d.width = w; d.height = h;
      const dx = d.getContext("2d")!; const out = dx.createImageData(w, h);
      let bad = 0;
      for (let i = 0; i < A.length; i += 4) {
        const m = Math.abs(A[i] - B[i]) > 32 || Math.abs(A[i + 1] - B[i + 1]) > 32 || Math.abs(A[i + 2] - B[i + 2]) > 32;
        if (m) { bad++; out.data[i] = 220; out.data[i + 1] = 30; out.data[i + 2] = 30; out.data[i + 3] = 255; }
        else { const g = 255 - (255 - (A[i] + A[i + 1] + A[i + 2]) / 3) * 0.25; out.data[i] = out.data[i + 1] = out.data[i + 2] = g; out.data[i + 3] = 255; }
      }
      dx.putImageData(out, 0, 0);
      const pct = Math.round((bad / (w * h)) * 10000) / 100;
      document.getElementById("dc")!.textContent = `Diff · ${pct}% of pixels differ`;
      return pct;
    });
    await page.locator("#w").screenshot({ path: `${SBS}/${k}.png` });
  }
  writeFileSync(`${OUT}/diffs.json`, JSON.stringify(table, null, 1));
  console.log("[diffs]", JSON.stringify(table));
});
