/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.2 — FIDELITY: the reference (design-refs/log-a-query-v1-2/log-a-query-v1-2.html, on its navy header)
 * and the build at 1440×900, side by side, for the states in screens 01, 02, 03 (= 06), 07 and 08:
 *   01  Marcus · Today · the packages under "What Marcus asks for"
 *   02  the pieces, the opening pages opened and set to 3 chapters (differs)
 *   03  the pieces as Marcus asks (matches) — 06 is the same image (the navy header chosen)
 *   07  Joanna · the pieces, Opening pages ticked into the sample control, 25 pages from page 40
 *   08  07 over the page, dimmed (the reference's "Over the Dashboard, dimmed"; the app's Dashboard door)
 * For each: every named part's box relative to the panel (x, y, w, h within 1px) and its font, size, weight, style,
 * colour, background and corner radius, by one ruler (laqMetrics.readMetrics); then both panels as PNGs, side by side,
 * with an in-browser pixel diff (a pixel differs when a channel is more than 32 of 255 apart).
 * The app runs over the reference's own data (seedLaq12.mjs, written before and removed after).
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn } from "./measure";
import { readMetrics, type Metric } from "./laqMetrics";

const REF = "file://" + resolve("design-refs/log-a-query-v1-2/log-a-query-v1-2.html");
const OUT = "reports/log-a-query-v1-2";
const SHOTS = `${OUT}/shots`, SBS = `${OUT}/side-by-side`;
const W = 1440, H = 900;

/* one name per part; the reference's selector, then the app's */
const PARTS: Record<string, [string, string]> = {
  panel: [".card", ".spanel"],
  head: [".flh", ".flh"], title: [".flh-t", ".flh-t"], line: [".flh-l", ".flh-l"], close: [".flh-x", ".flh-x"],
  track: [".ltrk", ".laq-trk"],
  trackDone: [".ltrk .s.d .nd", ".laq-trk .laq-s.is-d .laq-nd"], trackNow: [".ltrk .s.n .nd", ".laq-trk .laq-s.is-n .laq-nd"],
  trackTodo: [".ltrk .s:not(.d):not(.n) .nd", ".laq-trk .laq-s:not(.is-d):not(.is-n) .laq-nd"],
  trackLabelDone: [".ltrk .s.d .l", ".laq-trk .laq-s.is-d .laq-l"], trackLabelTodo: [".ltrk .s:not(.d):not(.n) .l", ".laq-trk .laq-s:not(.is-d):not(.is-n) .laq-l"],
  body: [".sb", ".laq-sb"], question: [".sb .qh", ".laq-qh"],
  asks: [".asks", ".laq-asks"], asksHead: [".asks .ah b", ".laq-ah b"], asksFrom: [".asks .ah span", ".laq-ah span"],
  askItem: [".asks li b", ".laq-asks li b"], askMark: [".asks .mk", ".laq-mk"],
  askFoot: [".asks .af", ".laq-af"], askWhy: [".asks .af .why", ".laq-af .laq-why"], askBtn: [".asks .af .btn", ".laq-af .laq-btn"],
  asksNil: [".asks.nil p", ".laq-asks.is-nil p"],
  pkgRow: [".big > button:not(.quiet)", ".laq-big > button:not(.is-quiet)"],
  pieceRow: [".pcs > .pc", ".laq-pcs > .laq-pc"], pieceName: [".pcs > .pc .tx b", ".laq-pcs > .laq-pc .laq-tx b"], pieceVr: [".pcs > .pc .vr", ".laq-pcs > .laq-pc .laq-vr"],
  sampleBlock: [".pcw", ".laq-pcw"], sampleVr: [".pcw .vr", ".laq-pcw .laq-vr"],
  sampleCtl: [".qsamp", ".laq-qsamp"], sampleLabel: [".qsamp .srow b", ".laq-qsamp .qad-srow b"], sampleSeg: [".qsamp .srow .sseg", ".laq-qsamp .qad-srow .qad-seg"],
  sampleSegOn: [".qsamp .srow .sseg button.on", ".laq-qsamp .qad-srow .qad-seg button.on"],
  stepper: [".qsamp .amt .stp", ".laq-qsamp .qad-amt .qad-step"], stepperNum: [".qsamp .amt .stp b", ".laq-qsamp .qad-amt .qad-step b"],
  unit: [".qsamp .ul", ".laq-qsamp .qad-unitl"], chip: [".qsamp .chip", ".laq-qsamp .qad-presets .qad-chip"], chipOn: [".qsamp .chip.on", ".laq-qsamp .qad-presets .qad-chip.on"],
  fromSeg: [".qsamp .from > .sseg", ".laq-qsamp .qad-from > .qad-seg"], sectLine: [".qsamp .sectl", ".laq-qsamp .qad-sectline"],
  versionRow: [".qsamp .vrow", ".laq-vrow"], versionSeg: [".qsamp .vrow .sseg", ".laq-vrow .qad-seg"],
  backLink: [".sb .ask .lk", ".laq-ask .laq-lk"],
  footer: [".cf", ".laq-cf"], primary: [".cf .btn.nv", ".laq-cf .laq-btn"], backFoot: [".cf .lnk", ".laq-cf .laq-lnk"],
};
const STYLE = ["font", "size", "weight", "style", "color", "bg", "radius"] as const;
/* text blocks whose width follows their own words are placed by their left edge and compared by font, not width */
const TEXT_W = new Set(["line", "question", "asksHead", "asksFrom", "askItem", "askFoot", "askWhy", "pieceName", "unit", "sectLine", "trackLabelDone", "trackLabelTodo", "asksNil"]);

const LEDGER: Record<string, unknown> = {};
let reads = 0;
const ok = (cond: boolean, label: string) => { reads++; expect.soft(cond, label).toBe(true); };

test.beforeAll(() => { execSync("node tests/e2e/seedLaq12.mjs --clean && node tests/e2e/seedLaq12.mjs", { stdio: "ignore" }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedLaq12.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/fidelity.json`, JSON.stringify({ reads, ...LEDGER }, null, 1));
});

/* ── the reference ── */
async function refOpen(page: Page) {
  await page.setViewportSize({ width: W, height: H });
  await page.goto(REF);
  await page.evaluate(() => document.fonts.ready);
  /* the app's journey is always over a page, so every state is read with the reference "Over the Dashboard, dimmed" */
  await page.locator('#where button[data-w="1"]').click();
}
const refClick = (page: Page, sel: string) => page.locator(`#ci ${sel}`).first().click();
async function refToMaterials(page: Page, journey: string, agent: string) {
  /* the reference's fake Dashboard covers its own controls while "over the page", so the journey is chosen by script */
  await page.evaluate((j) => (document.querySelector(`#journeys button[data-j="${j}"]`) as HTMLElement).click(), journey);
  await refClick(page, `[data-pick="${agent}"]`);
  await refClick(page, '[data-when="0"]');
}

/* ── the app ── */
async function appOpen(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq12-ms"); } catch { /* none */ } });
  await page.setViewportSize({ width: W, height: H });
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  await page.goto("/dashboard");
}
async function appToMaterials(page: Page, agent: string) {
  const door = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await door.waitFor({ state: "visible", timeout: 60_000 });
  await door.click();
  await page.locator(`[data-qls="agent"][data-id="${agent}"]`).click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expect(page.locator('[data-qls="root"]')).toHaveAttribute("data-step", "what");
}
const closeApp = async (page: Page) => { await page.keyboard.press("Escape"); await expect(page.locator('[data-qls="root"]')).toHaveCount(0); };

async function settle(page: Page) {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
}
/* the screens show each stage from its top: a click lower down scrolls the stage body, so both are put back first */
const toTop = (page: Page, sel: string) => page.evaluate((s) => { for (const e of document.querySelectorAll<HTMLElement>(s)) e.scrollTop = 0; }, sel);
async function measure(ref: Page, app: Page, state: string) {
  await toTop(ref, ".sb"); await toTop(app, ".laq-sb");
  await settle(ref); await settle(app);
  const r = await ref.evaluate(readMetrics, { panelSel: ".card", sels: Object.fromEntries(Object.entries(PARTS).map(([k, [s]]) => [k, s])) });
  const a = await app.evaluate(readMetrics, { panelSel: ".spanel", sels: Object.fromEntries(Object.entries(PARTS).map(([k, [, s]]) => [k, s])) });
  const rows: Record<string, string[]> = {};
  for (const k of Object.keys(PARTS)) {
    const w = r[k] as Metric | null, g = a[k] as Metric | null;
    if (!w && !g) continue;
    if (!w || !g) { ok(false, `${state}.${k}: ${w ? "missing in the app" : "absent in the reference, present in the app"}`); rows[k] = [w ? "missing" : "extra"]; continue; }
    const d: string[] = [];
    if (Math.abs(w.x - g.x) > 1) d.push(`x ${w.x}→${g.x}`);
    if (Math.abs(w.y - g.y) > 1) d.push(`y ${w.y}→${g.y}`);
    if (!TEXT_W.has(k) && Math.abs(w.w - g.w) > 1) d.push(`w ${w.w}→${g.w}`);
    if (!TEXT_W.has(k) && Math.abs(w.h - g.h) > 1) d.push(`h ${w.h}→${g.h}`);
    for (const s of STYLE) if (String(w[s]) !== String(g[s])) d.push(`${s} ${w[s]}→${g[s]}`);
    ok(d.length === 0, `${state}.${k}: ${d.join("; ") || "equal"}`);
    rows[k] = d;
  }
  LEDGER[state] = { rows, ref: r, app: a };
}
async function shot(ref: Page, app: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await settle(ref); await settle(app);
  await ref.locator(".card").screenshot({ path: `${SHOTS}/${name}-ref.png`, animations: "disabled" });
  await app.locator(".spanel:has([data-qls='root'])").screenshot({ path: `${SHOTS}/${name}-build.png`, animations: "disabled" });
}

test("fidelity — 01, 02, 03/06, 07 and 08 against the reference", async ({ browser }) => {
  test.setTimeout(900_000);
  const ref = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage();
  const app = await browser.newPage();
  await refOpen(ref);
  await appOpen(app);

  /* 01 — Marcus, over the packages */
  await refToMaterials(ref, "asks", "mr");
  await appToMaterials(app, "laq12-mr");
  await measure(ref, app, "01"); await shot(ref, app, "01-asks-over-packages");

  /* 02 — the pieces, the opening pages open and set to 3 chapters */
  await refClick(ref, '[data-act="custom"]');
  await refClick(ref, '[data-vr="sample"]');
  await refClick(ref, '[data-su="chapters"]');
  await app.locator('[data-qls="choose-pieces"]').click();
  await app.locator('[data-qls="vr"][data-k="sample"]').click();
  await app.locator('[data-qls="sample-control"] .qad-srow button', { hasText: "Chapters" }).click();
  await app.locator('[data-qls="sample-control"] .qad-presets button', { hasText: /^3$/ }).click();
  await measure(ref, app, "02"); await shot(ref, app, "02-asks-differs-sample-open");

  /* 03 = 06 — matches, the control closed */
  await refClick(ref, '[data-act="matchask"]');
  await app.locator('[data-qls="use-ask"]').click();
  await app.locator('[data-qls="vr"][data-k="sample"]').click();
  await measure(ref, app, "03"); await shot(ref, app, "03-asks-matches");
  await closeApp(app);

  /* 07 — Joanna, Opening pages ticked into the control, 25 pages from page 40 */
  await refToMaterials(ref, "none", "jl");
  await refClick(ref, '[data-act="custom"]');
  await refClick(ref, '[data-su="pages"]');
  await refClick(ref, '[data-sp="25"]');
  await refClick(ref, '[data-sf="sect"]');
  await appToMaterials(app, "laq12-jl");
  await app.locator('[data-qls="choose-pieces"]').click();
  await app.locator('[data-qls="piece"][data-k="sample"]').click();
  const ctl = app.locator('[data-qls="sample-control"]');
  await ctl.locator(".qad-srow button", { hasText: "Pages" }).click();
  await ctl.locator(".qad-presets button", { hasText: /^25$/ }).click();
  await ctl.locator(".qad-from button", { hasText: "A specific section" }).click();
  await measure(ref, app, "07"); await shot(ref, app, "07-no-asks-sample-control");

  /* 08 — 07 over the page, dimmed: the whole viewport, and the scrim's colour */
  await settle(ref); await settle(app);
  mkdirSync(SHOTS, { recursive: true });
  await ref.screenshot({ path: `${SHOTS}/08-over-the-page-dimmed-ref.png` });
  await app.screenshot({ path: `${SHOTS}/08-over-the-page-dimmed-build.png` });
  const scrim = await app.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-side-scrim]")].find((x) => x.dataset.on === "true"); return s ? getComputedStyle(s).backgroundColor : null; });
  const refScrim = await ref.evaluate(() => getComputedStyle(document.getElementById("scrim")!).backgroundColor);
  LEDGER["08"] = { scrim, refScrim };
  ok(scrim === refScrim, `08: the scrim is the reference's (${refScrim} / ${scrim})`);
  await closeApp(app);
  /* the floor: a run that measured fewer parts than this read the wrong page (a worker restarts after a failure, so the
     count is asserted here, in the same test, never in one of its own) */
  expect(reads).toBeGreaterThanOrEqual(80);
});

const PAIRS = ["01-asks-over-packages", "02-asks-differs-sample-open", "03-asks-matches", "07-no-asks-sample-control", "08-over-the-page-dimmed"];
const uri = (p: string) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

test("side by side, and the diffs", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(SBS, { recursive: true });
  await page.setViewportSize({ width: 3600, height: 1100 });
  const table: Record<string, number> = {};
  for (const k of PAIRS) {
    /* 08 is compared in the drawer's own box: 540 wide, 16px in from the window's top, right and bottom, in both */
    const crop = k.startsWith("08") ? { x: W - 16 - 540, y: 16, w: 540, h: H - 32 } : null;
    await page.setContent(`<body style="margin:0;background:#f4f0ea;font:14px Georgia,serif;color:#1c130f">
      <div id="w" style="display:flex;gap:24px;padding:20px;align-items:flex-start">
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Reference · ${k}</figcaption><img id="a" src="${uri(`${SHOTS}/${k}-ref.png`)}"></figure>
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Build · ${k}</figcaption><img id="b" src="${uri(`${SHOTS}/${k}-build.png`)}"></figure>
        <figure style="margin:0"><figcaption id="dc" style="margin:0 0 8px">Diff</figcaption><canvas id="d"></canvas></figure>
      </div></body>`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    table[k] = await page.evaluate((c) => {
      const a = document.getElementById("a") as HTMLImageElement, b = document.getElementById("b") as HTMLImageElement;
      const x0 = c ? c.x : 0, y0 = c ? c.y : 0, w = c ? c.w : Math.max(a.naturalWidth, b.naturalWidth), h = c ? c.h : Math.max(a.naturalHeight, b.naturalHeight);
      const px = (img: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const x = cv.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, -x0, -y0); return x.getImageData(0, 0, w, h).data; };
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
      document.getElementById("dc")!.textContent = `Diff · ${pct}% of pixels differ${c ? " (the drawer's area)" : ""}`;
      return pct;
    }, crop);
    await page.locator("#w").screenshot({ path: `${SBS}/${k}.png` });
  }
  writeFileSync(`${OUT}/diffs.json`, JSON.stringify(table, null, 1));
  console.log("[diffs]", JSON.stringify(table));
});


