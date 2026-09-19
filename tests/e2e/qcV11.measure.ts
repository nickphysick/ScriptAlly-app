/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcV11 — the Query Centre against design-refs/query-centre-v11.html, measured on a rendered page.
 *
 * THE REF IS MEASURED BY THE SAME RULER, IN THE SAME BROWSER. Every expected size is read off the
 * mockup at the same viewport rather than typed here, so a number cannot be mis-copied; the numbers
 * the brief states in brackets are then used ONLY to check the ref reading itself (a wrong ref
 * selector would otherwise make the app agree with a box nobody meant).
 *
 * ⚠️ CARD-RELATIVE, NEVER PAGE-RELATIVE. The mockup draws a 224px sidebar and its own type stack;
 * the app keeps its sidebar, its 22px inset and its stack. Sizes and offsets inside a card compare;
 * page x/y do not.
 *
 * ⚠️ A SUBJECT THAT IS NOT FOUND IS A FAILURE, NOT A SKIP. `need()` throws in the language of a red
 * when a probe is absent — this file was written BEFORE the page and proved red against it, and a
 * probe that quietly measured nothing would have gone green on the old page.
 *
 * ⚠️ EVERY RUN WRITES ITS ASSERTION COUNT, and the last case refuses a run that made fewer than the
 * floor. The report is deleted at the start of the run so a stale one cannot stand in for this one.
 *
 * The app's probes are `data-qcv` attributes, read inside the ONE visible `.qcv-page` (every
 * workspace page stays mounted, so `document` reaches the others too).
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const OUT = resolve("test-results/qc-v11");
const REPORT = resolve(OUT, "report.json");
const REF = "file://" + resolve("design-refs/query-centre-v11.html");
const TOL = 2;
const MIN_ASSERTIONS = 60;

/* ── the run's own ledger ──
   ⚠️ FILE-BACKED, NOT MODULE STATE. Playwright restarts the worker after a failed case, which would
   reset an in-memory ledger and let the last case count only what ran since the restart. */
type Entry = { area: string; what: string; got: unknown; want: unknown };
type Report = { assertions: number; tally: Record<string, Record<string, number>>; ledger: Entry[] };
const load = (): Report => (existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, "utf8")) : { assertions: 0, tally: {}, ledger: [] });
const save = (r: Report) => { mkdirSync(OUT, { recursive: true }); r.assertions = r.ledger.filter((e) => e.want !== "reported").length; writeFileSync(REPORT, JSON.stringify(r, null, 2)); };
const record = (e: Entry) => { const r = load(); r.ledger.push(e); save(r); };
function near(area: string, what: string, got: number | null | undefined, want: number | null | undefined, tol = TOL) {
  record({ area, what, got, want });
  expect(got, `${area}: ${what} — not found on the page`).not.toBeNull();
  expect(got, `${area}: ${what} — not found on the page`).not.toBeUndefined();
  expect(want, `${area}: ${what} — not found in the REF (the ref selector is wrong, not the page)`).not.toBeNull();
  expect(Math.abs((got as number) - (want as number)), `${area}: ${what} is ${got}, the ref's is ${want}`).toBeLessThanOrEqual(tol);
}
function is(area: string, what: string, got: unknown, want: unknown) {
  record({ area, what, got, want });
  expect(got, `${area}: ${what}`).toEqual(want);
}
function yes(area: string, what: string, cond: boolean, detail = "") {
  record({ area, what, got: cond, want: true });
  expect(cond, `${area}: ${what}${detail ? " — " + detail : ""}`).toBe(true);
}
function seen(area: string, key: string) { const r = load(); (r.tally[area] ??= {})[key] = (r.tally[area][key] ?? 0) + 1; save(r); }

/* ── one ruler, two pages. `sel` maps a probe name to a selector; the reading is identical. ── */
type Sel = Record<string, string>;
const APP = (name: string) => `[data-qcv="${name}"]`;
const APP_SEL: Sel = Object.fromEntries([
  "head", "head-title", "head-line", "head-cta",
  "sum", "sum-live", "sum-live-band", "sum-closed", "sum-closed-band", "stage", "stage-graphic", "gauge", "notch", "closed-grid",
  "ctl", "sentence", "views",
  "stagegrid", "ledger", "open", "open-band", "open-foot", "open-action",
  "list-head", "row", "row-chip", "row-stand", "row-sent", "row-date",
  "cal-bar", "cal-box", "cal-axis", "cal-group", "cal-lane", "cal-seg", "ledger-frame",
  "tile", "tile-band",
].map((n) => [n, APP(n)]));
const REF_SEL: Sel = {
  "head": ".head", "head-title": ".head h1", "head-line": ".head .facts", "head-cta": ".head .inkpill",
  "sum": ".sum", "sum-live": ".s-act", "sum-live-band": ".s-act .hd", "sum-closed": ".s-cl", "sum-closed-band": ".s-cl .hd",
  "stage": ".stg", "stage-graphic": ".stg .ub", "gauge": ".ub .ga", "notch": ".ub > s", "closed-grid": ".mx",
  "ctl": ".ctl", "sentence": ".sentence", "views": ".views",
  "stagegrid": ".stage", "ledger": ".ledger", "open": ".open", "open-band": ".open .bd", "open-foot": ".open .ft", "open-action": ".open .ft button",
  "list-head": ".cols", "row": "#list .row", "row-chip": "#list .row .chip", "row-stand": "#list .row .st", "row-sent": "#list .row .mat", "row-date": "#list .row .date",
  "cal-bar": ".calbar", "cal-box": ".cal", "cal-axis": ".axis", "cal-group": ".grp2", "cal-lane": ".lane", "cal-seg": ".bar:not(.hist)", "ledger-frame": ".ledger > .frame",
  "tile": ".tile", "tile-band": ".tile .bd",
};

/** Runs IN THE PAGE. A real function (no template literal), so no escape is eaten on the way in. */
function readAll(arg: { sel: Record<string, string>; root: string | null }) {
  const roots = arg.root
    ? [...document.querySelectorAll(arg.root)].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; })
    : [document.body];
  if (roots.length !== 1) return { error: `expected one visible "${arg.root}", found ${roots.length}` } as const;
  const root = roots[0];
  const rd = (n: number) => Math.round(n * 10) / 10;
  const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const out: Record<string, { n: number; x: number; y: number; w: number; h: number; r: number; b: number } | null> = {};
  for (const [name, s] of Object.entries(arg.sel)) {
    const all = [...root.querySelectorAll(s)].filter(vis);
    const el = all[0];
    if (!el) { out[name] = null; continue; }
    const b = el.getBoundingClientRect();
    out[name] = { n: all.length, x: rd(b.x), y: rd(b.y), w: rd(b.width), h: rd(b.height), r: rd(b.right), b: rd(b.bottom) };
  }
  return { boxes: out, vw: window.innerWidth, vh: window.innerHeight } as const;
}
type Reading = { boxes: Record<string, { n: number; x: number; y: number; w: number; h: number; r: number; b: number } | null>; vw: number; vh: number };

async function readRef(page: Page, w: number, h: number, prep?: (p: Page) => Promise<void>): Promise<Reading> {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(REF);
  /* ⚠️ WAIT FOR THE FACES. Three widths here are set by text (the head button, the view switch, the
     stage names); read before Special Elite lands they are the fallback's, 5px out. */
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600); /* the mockup holds its own skeleton for 1.1s, then enters */
  await page.evaluate(() => document.fonts.ready);
  if (prep) await prep(page);
  await page.waitForTimeout(400);
  const r = await page.evaluate(readAll, { sel: REF_SEL, root: null });
  if ("error" in r) throw new Error("ref: " + r.error);
  return r as Reading;
}
async function openApp(page: Page, w: number, h: number, view: "list" | "calendar" | "grid" = "list") {
  await page.addInitScript((v) => { try { localStorage.setItem("sa.qcView", v); } catch { /* fine */ } }, view);
  await openRoute(page, view === "list" ? "/queries" : `/queries?view=${view}`, { width: w, height: h });
  /* the page has landed when it says it is no longer busy */
  await expect.poll(() => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    return p ? p.getAttribute("aria-busy") : "absent";
  }), { timeout: 30_000, message: "the v11 page root (.qcv-page) never rendered, or never stopped being busy" }).toBe("false");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1300); /* past the entrance, which is done inside 800ms */
}
async function readApp(page: Page): Promise<Reading> {
  const r = await page.evaluate(readAll, { sel: APP_SEL, root: ".qcv-page" });
  if ("error" in r) throw new Error("app: " + r.error);
  return r as Reading;
}
const need = (r: Reading, who: string, name: string) => {
  const b = r.boxes[name];
  if (!b) throw new Error(`${who}: probe "${name}" found nothing — a subject that cannot be found has FAILED, not skipped`);
  return b;
};
function sameSize(area: string, app: Reading, ref: Reading, name: string, dims: ("w" | "h")[]) {
  const a = app.boxes[name], f = need(ref, "ref", name);
  for (const d of dims) near(area, `${name}.${d}`, a ? a[d] : null, f[d]);
}
function sameOffset(area: string, app: Reading, ref: Reading, name: string, within: string, dims: ("x" | "y")[]) {
  const a = app.boxes[name], ac = app.boxes[within], f = need(ref, "ref", name), fc = need(ref, "ref", within);
  for (const d of dims) near(area, `${name}.${d} inside ${within}`, a && ac ? Math.round((a[d] - ac[d]) * 10) / 10 : null, Math.round((f[d] - fc[d]) * 10) / 10);
}

test("0 · the report is this run's", async () => {
  if (existsSync(REPORT)) rmSync(REPORT);
  expect(existsSync(REPORT)).toBe(false);
});

test("the ref reads as the brief says it does (1440×860) — or every comparison below is against the wrong box", async ({ page }) => {
  const ref = await readRef(page, 1440, 860);
  const want: [string, "w" | "h", number][] = [
    ["head-cta", "w", 154], ["head-cta", "h", 50], ["sum", "h", 185], ["sum-live", "w", 866], ["sum-closed", "w", 286],
    ["sum-live-band", "h", 48], ["stage", "w", 134], ["stage", "h", 84], ["gauge", "h", 3], ["closed-grid", "w", 236], ["closed-grid", "h", 94],
    ["ctl", "h", 42], ["views", "w", 240], ["views", "h", 42], ["ledger", "w", 756], ["open", "w", 396], ["open-band", "h", 37],
    ["open-foot", "h", 80], ["open-action", "h", 38], ["list-head", "h", 29], ["row", "h", 67], ["row-chip", "w", 32], ["row-date", "w", 46],
  ];
  /* ⚠️ TWO OF THESE ARE SET BY TEXT, and the brief's figures for them came from another browser: the
     view switch reads 235.1 here against a stated 240 with Special Elite demonstrably loaded. This
     check exists to catch a wrong SELECTOR, which is out by tens of pixels, so text-set widths get
     6px. The app is compared with the ref as read HERE, in one browser, at the usual 2. */
  const TEXT_SET = new Set(["views.w", "head-cta.w"]);
  for (const [n, d, v] of want) near("ref", `${n}.${d}`, need(ref, "ref", n)[d], v, TEXT_SET.has(`${n}.${d}`) ? 6 : TOL);
});

test("top bar — + New is gone app-wide and Give feedback is anthracite", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 860 });
  const r = await page.evaluate(() => {
    const bar = [...document.querySelectorAll(".ws-pagebar")].find((e) => e.getBoundingClientRect().height > 0);
    const fb = bar?.querySelector("[data-probe='feedback']") as HTMLElement | null;
    const key = bar?.querySelector(".sp-search-k") as HTMLElement | null;
    return { bar: !!bar, newBtn: bar ? bar.querySelectorAll(".ws-nbtn").length : -1, fbBg: fb ? getComputedStyle(fb).backgroundColor : null,
      fbInk: fb ? getComputedStyle(fb).color : null, keyBg: key ? getComputedStyle(key).backgroundColor : null };
  });
  yes("topbar", "the bar is on screen (the precondition)", r.bar);
  is("topbar", "+ New buttons in the bar", r.newBtn, 0);
  is("topbar", "Give feedback's fill", r.fbBg, "rgb(42, 58, 82)");
  is("topbar", "Give feedback's text", r.fbInk, "rgb(255, 255, 255)");
  is("topbar", "the keycap stays ink", r.keyBg, "rgb(28, 19, 15)");
});

test("head and control row — 1440×860", async ({ page }) => {
  const ref = await readRef(page, 1440, 860);
  await openApp(page, 1440, 860);
  const app = await readApp(page);
  sameSize("head", app, ref, "head-cta", ["w", "h"]);
  sameSize("head", app, ref, "head-title", ["h"]);
  sameSize("head", app, ref, "head", ["h"]);
  sameOffset("head", app, ref, "head-line", "head", ["y"]);
  sameOffset("head", app, ref, "head-cta", "head", ["y"]);
  sameSize("control", app, ref, "ctl", ["h"]);
  sameSize("control", app, ref, "views", ["w", "h"]);
  /* the page shares the dashboard's left edge and measure: same shell, same 22px inset */
  const pg = await page.evaluate(() => { const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!; const b = p.getBoundingClientRect(); const bar = [...document.querySelectorAll(".ws-pagebar .sp-help")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect(); const t = p.querySelector("[data-qcv='head-title']")!.getBoundingClientRect(); return { x: b.x, w: b.width, gap: Math.round((t.y - bar.bottom) * 10) / 10 }; });
  near("head", "the page's left edge (the dashboard's is 268 at 1440)", pg.x, 268, 1);
  near("head", "the page's measure (the dashboard's is 1128 at 1440)", pg.w, 1128, 1);
  near("head", "title sits 25px under the bar's controls, as the dashboard's greeting does", pg.gap, 25, 1.5);
  /* no masthead, no tiles, no toolbar, no page search, no Board */
  const gone = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const vis = (s: string) => [...p.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().height > 0).length;
    const wpg = p.closest(".wpg")!;
    return { masthead: [...wpg.querySelectorAll(".wsh, .wpg-chrome, .wpg-bar")].filter((e) => e.getBoundingClientRect().height > 0).length, tiles: vis(".qct-tile, .sts-tile"), toolbar: vis(".qcc-tb"), search: vis(".qcc-tb-search"), views: [...p.querySelectorAll("[data-qcv='views'] button")].map((b) => b.textContent?.trim()),
      windowBg: getComputedStyle(document.querySelector(".ws-window")!).backgroundColor, title: getComputedStyle(p.querySelector("[data-qcv='head-title']")!).fontFamily, sentence: getComputedStyle(p.querySelector("[data-qcv='pk-filter']")!).fontFamily, cta: getComputedStyle(p.querySelector("[data-qcv='head-cta'] span")!).fontFamily };
  });
  is("control", "the old masthead, its chrome slab and its collapsed bar", gone.masthead, 0);
  is("control", "the five tiles", gone.tiles, 0);
  is("control", "the Filter / Group / Sort toolbar", gone.toolbar, 0);
  is("control", "the view switch's segments", gone.views, ["List", "Calendar", "Grid"]);
  is("control", "the window sheet behind the page", gone.windowBg, "rgba(0, 0, 0, 0)");
  for (const [k, f] of [["title", gone.title], ["sentence", gone.sentence], ["log button", gone.cta]] as const) yes("head", `${k} is drawn in the typewriter face, not brand.tsx's`, /Special Elite/.test(f), f);
  await page.screenshot({ path: resolve(OUT, "list-1440.png") });
});

test("the sentence — the two phrases are the page's only filter and sort", async ({ page }) => {
  await openApp(page, 1440, 860);
  const vis = ".qcv-page";
  const phrase = () => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelector("[data-qcv='pk-filter']")!.textContent);
  const rows = () => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelectorAll("[data-qcv='row'], .qlv-row, [data-qcc-id]").length);
  yes("sentence", "it opens on All", /^All \d+ quer/.test((await phrase()) ?? ""), String(await phrase()));
  await page.locator(`${vis} [data-qcv='pk-filter']`).first().click();
  const menu = await page.evaluate(() => { const m = document.querySelector("[data-qcv='menu']"); return m ? { role: m.getAttribute("role"), items: [...m.querySelectorAll("[role='menuitemradio']")].map((b) => ({ label: b.querySelector(".qcv-menu-l")?.textContent, n: Number(b.querySelector(".qcv-menu-n")?.textContent), on: b.getAttribute("aria-checked") })) } : null; });
  yes("sentence", "the filter menu opened", !!menu);
  is("sentence", "role", menu?.role, "menu");
  const labels = (menu?.items ?? []).map((i) => i.label);
  is("sentence", "the menu leads with the five fixed rows", labels.slice(0, 5), ["All queries", "With you", "With the agent", "Offers", "Past expected"]);
  yes("sentence", "…ends with Closed (before any manuscript group)", labels.includes("Closed"));
  const get = (l: string) => (menu?.items ?? []).find((i) => i.label === l)?.n ?? -1;
  is("sentence", "the three courts and Closed partition All", get("With you") + get("With the agent") + get("Offers") + get("Closed"), get("All queries"));
  record({ area: "sentence", what: "menu counts (Past expected is the NEW clock's)", got: Object.fromEntries((menu?.items ?? []).map((i) => [i.label, i.n])), want: "reported" });
  await page.locator("[data-qcv='menu'] [role='menuitemradio']", { hasText: "With the agent" }).first().click();
  await page.waitForTimeout(300);
  is("sentence", "the phrase rewrites itself", await phrase(), `${get("With the agent")} with the agent`);
  is("sentence", "the menu closes on a choice", await page.locator("[data-qcv='menu']").count(), 0);
  yes("sentence", "the view narrowed", (await rows()) > 0 && (await rows()) <= get("With the agent") * 2, String(await rows()));
  await page.locator(`${vis} [data-qcv='pk-sort']`).first().click();
  const sorts = await page.evaluate(() => [...document.querySelectorAll("[data-qcv='menu'] .qcv-menu-l")].map((e) => e.textContent));
  is("sentence", "six sorts, in order", sorts, ["Latest activity first", "Newest query first", "Next reply date first", "With you first", "Agents A to Z", "Agencies A to Z"]);
  await page.keyboard.press("Escape");
  is("sentence", "Escape closes the menu", await page.locator("[data-qcv='menu']").count(), 0);
});

test("summary row — 1440×860", async ({ page }) => {
  const ref = await readRef(page, 1440, 860);
  await openApp(page, 1440, 860);
  const app = await readApp(page);
  sameSize("summary", app, ref, "sum", ["h"]);
  sameSize("summary", app, ref, "sum-closed", ["w", "h"]);
  sameSize("summary", app, ref, "sum-live-band", ["h"]);
  sameSize("summary", app, ref, "sum-closed-band", ["h"]);
  sameSize("summary", app, ref, "stage", ["h"]);
  sameSize("summary", app, ref, "stage-graphic", ["h"]);
  sameSize("summary", app, ref, "sum-live", ["h"]);
  sameSize("summary", app, ref, "gauge", ["h"]);
  /* ⚠️ THE ONE PLACE THE PAGE DELIBERATELY DIFFERS FROM THE REF: the ref has no "+N withdrawn" line.
     Where this account has one, the grid gives back exactly 6px (three row gaps, 6 → 4) so the ROW
     stays the ref's height — which is asserted above, and is the claim that matters. */
  const wd = await page.evaluate(() => !![...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelector("[data-qcv='withdrawn-line']"));
  seen("closed-grid", wd ? "with the withdrawn line" : "without it");
  near("summary", `closed-grid.h (${wd ? "ref − 6, the withdrawn line is present" : "the ref's"})`, app.boxes["closed-grid"]?.h, need(ref, "ref", "closed-grid").h - (wd ? 6 : 0));
  /* the live card and the closed card share the row's width with a 20px gap, in both */
  const s = need(app, "app", "sum"), l = need(app, "app", "sum-live"), c = need(app, "app", "sum-closed");
  near("summary", "live + 20 + closed fills the row", l.w + 20 + c.w, s.w, 1);
  /* the notch is at 70% of the graphic's width */
  const g = app.boxes["stage-graphic"], n = app.boxes["notch"];
  near("summary", "notch at 70% of the column's graphic", g && n ? ((n.x - g.x) / g.w) * 100 : null, 70, 1.5);
});

test("summary row at a 1280 window — the stage name never collides with its count, six columns or seven", async ({ page }) => {
  const ref = await readRef(page, 1280, 800);
  await openApp(page, 1280, 800);
  const app = await readApp(page);
  sameSize("summary@1280", app, ref, "sum", ["h"]);
  const cols = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...p.querySelectorAll("[data-qcv='stage']")].map((s) => {
      const l = s.querySelector(".qcv-stg-l")!, n = s.querySelector(".qcv-stg-n")!.getBoundingClientRect(), box = s.getBoundingClientRect();
      const r = document.createRange(); r.selectNodeContents(l);
      const ink = [...r.getClientRects()];
      /* a 2D test: the header may STACK, so "to the right of" is not the question — "on top of" is */
      const hit = ink.some((k) => k.left < n.right - 0.5 && k.right > n.left + 0.5 && k.top < n.bottom - 0.5 && k.bottom > n.top + 0.5);
      const out = ink.some((k) => k.right > box.right + 0.5 || k.left < box.left - 0.5);
      return { stage: (s as HTMLElement).dataset.stage, w: Math.round(box.width), h: Math.round(box.height), lines: ink.length, hit, out };
    });
  });
  seen("summary@1280", `${cols.length} columns`);
  yes("summary@1280", "there are stage columns (the population)", cols.length >= 6, String(cols.length));
  for (const c of cols) {
    yes("summary@1280", `${c.stage}: the name's ink does not sit on the count`, !c.hit, JSON.stringify(c));
    yes("summary@1280", `${c.stage}: the name's ink stays inside its column`, !c.out, JSON.stringify(c));
    is("summary@1280", `${c.stage}: the column is still 84 tall`, c.h, 84);
  }
  await page.locator(".qcv-page [data-qcv='sum']").first().screenshot({ path: resolve(OUT, `summary-1280-${cols.length}col.png`) });
});

test("the summary's gauges — geometry, and which branches this account entered", async ({ page }) => {
  await openApp(page, 1440, 860);
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const stages = [...p.querySelectorAll("[data-qcv='stage']")] as HTMLElement[];
    return stages.map((s) => {
      const gr = s.querySelector("[data-qcv='stage-graphic']") as HTMLElement | null;
      const gw = gr ? gr.getBoundingClientRect().width : 0, gx = gr ? gr.getBoundingClientRect().x : 0;
      return {
        stage: s.getAttribute("data-stage"), count: Number(s.getAttribute("data-count")), h: s.getBoundingClientRect().height,
        /* the FIXED area is the content box (27); the rect adds the 6px pad and the hairline */
        graphicH: gr ? parseFloat(getComputedStyle(gr).height) : null,
        gauges: [...s.querySelectorAll("[data-qcv='gauge']")].map((g) => {
          const fill = g.querySelector("[data-qcv='gauge-fill']") as HTMLElement | null, over = g.querySelector("[data-qcv='gauge-over']") as HTMLElement | null;
          const fb = fill?.getBoundingClientRect(), ob = over?.getBoundingClientRect();
          return { kind: g.getAttribute("data-kind"), title: g.getAttribute("title"), name: g.getAttribute("aria-label"),
            fillPc: fb ? (fb.width / gw) * 100 : null, overFromPc: ob ? ((ob.x - gx) / gw) * 100 : null, overPc: ob ? (ob.width / gw) * 100 : null,
            fillBg: fill ? getComputedStyle(fill).backgroundColor : null, overBg: over ? getComputedStyle(over).backgroundColor : null };
        }),
        more: s.querySelector("[data-qcv='gauge-more']")?.textContent ?? null,
      };
    });
  });
  yes("gauges", "six or seven stage columns (the population)", r.length === 6 || r.length === 7, `found ${r.length}`);
  for (const s of r) {
    yes("gauges", `${s.stage}: at most four gauges`, s.gauges.length <= 4, `${s.gauges.length}`);
    yes("gauges", `${s.stage}: the graphic is a fixed 27px`, s.graphicH != null && Math.abs(s.graphicH - 27) <= 1, `${s.graphicH}`);
    yes("gauges", `${s.stage}: shows min(count, 4) gauges`, s.gauges.length === Math.min(s.count, 4), `${s.gauges.length} of ${s.count}`);
    if (s.count > 4) yes("gauges", `${s.stage}: the overflow line says +${s.count - 4}`, (s.more ?? "").includes(`+${s.count - 4}`), s.more ?? "absent");
    for (const g of s.gauges) {
      seen("gauge-kind", g.kind ?? "null");
      yes("gauges", `${s.stage}: a gauge carries a title and the same accessible name`, !!g.title && g.title === g.name, String(g.title));
      if (g.kind === "within") { yes("gauges", "a within-window fill stops at or before the notch", g.fillPc != null && g.fillPc <= 70.5, String(g.fillPc)); is("gauges", "fill is navy", g.fillBg, "rgb(42, 58, 82)"); }
      if (g.kind === "past") {
        near("gauges", "a past gauge's navy runs to the notch", g.fillPc, 70, 1);
        near("gauges", "its ink starts at the notch", g.overFromPc, 70, 1);
        yes("gauges", "the ink overrun is capped at 30%", g.overPc != null && g.overPc <= 30.5, String(g.overPc));
        is("gauges", "overrun is ink", g.overBg, "rgb(28, 19, 15)");
      }
      if (g.kind === "nodate") yes("gauges", "no date: no fill at all", g.fillPc == null && g.overPc == null);
    }
  }
  const hs = [...new Set(r.map((s) => Math.round(s.h)))];
  is("gauges", "every column is one height whatever it holds", hs.length, 1);
});

test("list and the docked card — 1440, 1280 and 1720", async ({ page }) => {
  for (const [w, h] of [[1440, 860], [1280, 800], [1720, 900]] as const) {
    const ref = await readRef(page, w, h);
    await openApp(page, w, h);
    const app = await readApp(page);
    const area = `list@${w}`;
    sameSize(area, app, ref, "open", ["w"]);
    sameSize(area, app, ref, "list-head", ["h"]);
    sameSize(area, app, ref, "row", ["h"]);
    sameSize(area, app, ref, "row-chip", ["w", "h"]);
    sameSize(area, app, ref, "row-date", ["w"]);
    for (const c of ["row-chip", "row-stand", "row-sent", "row-date"]) sameOffset(area, app, ref, c, "ledger", ["x"]);
    sameSize(area, app, ref, "row-stand", ["w"]);
    sameSize(area, app, ref, "row-sent", ["w"]);
    if (w === 1440) {
      sameSize(area, app, ref, "open-band", ["h"]);
      sameSize(area, app, ref, "open-action", ["h"]);
      /* the ledger and the card share the stage with a 20px gap */
      const st = need(app, "app", "stagegrid"), le = need(app, "app", "ledger"), op = need(app, "app", "open");
      near(area, "ledger + 20 + card fills the stage", le.w + 20 + op.w, st.w, 1);
    }
    const facts = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...p.querySelectorAll("[data-qcv='row']")] as HTMLElement[];
      const lefts = (s: string) => [...new Set(rows.map((r) => { const e = r.querySelector(s); return e ? Math.round(e.getBoundingClientRect().x) : -1; }))];
      const open = p.querySelector("[data-qcv='open']") as HTMLElement | null;
      return { rows: rows.length, selected: rows.filter((r) => r.getAttribute("aria-selected") === "true").length,
        standLefts: lefts("[data-qcv='row-stand']"), sentLefts: lefts("[data-qcv='row-sent']"),
        rowButtons: rows.reduce((n, r) => n + r.querySelectorAll("button").length, 0),
        openPos: open ? getComputedStyle(open).position : null, overlay: document.querySelectorAll(".qpn-scrim").length,
        you: rows.filter((r) => r.getAttribute("data-you") === "true").map((r) => r.getAttribute("data-status")) };
    });
    yes(area, "there are rows (the population)", facts.rows > 3, String(facts.rows));
    is(area, "exactly one row is selected on load", facts.selected, 1);
    is(area, "every row's second column starts at one x — tracks sized by rule, not content", facts.standLefts.length, 1);
    is(area, "every row's third column starts at one x", facts.sentLefts.length, 1);
    is(area, "row buttons", facts.rowButtons, 0);
    is(area, "the card is sticky, not an overlay", facts.openPos, "sticky");
    is(area, "no scrim at desktop widths", facts.overlay, 0);
    for (const s of facts.you) { seen("rust-row", String(s)); yes(area, "rust follows 'with you' exactly — never an offer", ["Partial Requested", "Full Requested", "Revise & Resubmit"].includes(String(s)), String(s)); }
    await page.screenshot({ path: resolve(OUT, `list-${w}.png`) });
  }
});

test("calendar — expanded and compact, the inset, one bar per stage", async ({ page }) => {
  const toCal = async (p: Page) => { await p.click(".views button[data-v='cal']"); };
  const ref = await readRef(page, 1440, 860, toCal);
  await openApp(page, 1440, 860, "calendar");
  let app = await readApp(page);
  sameSize("calendar", app, ref, "cal-bar", ["h"]);
  sameSize("calendar", app, ref, "cal-axis", ["h"]);
  sameSize("calendar", app, ref, "cal-group", ["h"]);
  sameSize("calendar", app, ref, "cal-lane", ["h"]);
  sameSize("calendar", app, ref, "cal-seg", ["h"]);
  sameSize("calendar", app, ref, "open", ["w"]);
  const box = need(app, "app", "cal-box"), fr = need(app, "app", "ledger-frame");
  near("calendar", "the scrolling box is inset 14px from the frame's left (inside its 1px line)", box.x - fr.x - 1, 14, 1);
  near("calendar", "…and from its right", fr.r - 1 - box.r, 14, 1);
  near("calendar", "…and from its bottom", fr.b - 1 - box.b, 14, 1);
  const facts = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const b = p.querySelector("[data-qcv='cal-box']") as HTMLElement;
    const lanes = [...p.querySelectorAll("[data-qcv='cal-lane']")] as HTMLElement[];
    const segs = lanes.map((l) => [...l.querySelectorAll("[data-qcv='cal-seg'], [data-qcv='cal-hist']")] as HTMLElement[]);
    const today = p.querySelector("[data-qcv='cal-today']") as HTMLElement | null;
    const gaps: number[] = [];
    for (const s of segs) for (let i = 1; i < s.length; i++) gaps.push(Math.round((s[i].getBoundingClientRect().x - s[i - 1].getBoundingClientRect().right) * 10) / 10);
    const hist = p.querySelector("[data-qcv='cal-hist']") as HTMLElement | null;
    return { lanes: lanes.length, maxSegs: Math.max(0, ...segs.map((s) => s.length)), gaps,
      todayPc: today ? ((today.getBoundingClientRect().x - b.getBoundingClientRect().x) / b.clientWidth) * 100 : null,
      histOpacity: hist ? getComputedStyle(hist).opacity : null, histOverflow: hist ? getComputedStyle(hist).overflowX : null,
      groups: [...p.querySelectorAll("[data-qcv='cal-group']")].map((g) => g.getAttribute("data-group")),
      rings: p.querySelectorAll(".tl-actbtn, .tl-act").length, range: p.querySelector("[data-qcv='cal-range']")?.textContent ?? null };
  });
  yes("calendar", "there are lanes (the population)", facts.lanes > 3, String(facts.lanes));
  near("calendar", "it opens with today 46% of the way across", facts.todayPc, 46, 2);
  yes("calendar", "some lane has more than one stage — or 'one bar per stage' was never exercised", facts.maxSegs > 1, String(facts.maxSegs));
  yes("calendar", "4px of daylight wherever the status changes", facts.gaps.length > 0 && facts.gaps.every((g) => g >= 3 && g <= 5.5), JSON.stringify(facts.gaps.slice(0, 8)));
  is("calendar", "a past stage rests at .42", facts.histOpacity, "0.42");
  is("calendar", "…and clips with `clip`, never `hidden` (a scroll container kills the sticky label)", facts.histOverflow, "clip");
  is("calendar", "the To-do board's action rings", facts.rings, 0);
  yes("calendar", "the range is stated as text", /\d+ \w{3} to \d+ \w{3}/.test(facts.range ?? ""), String(facts.range));
  await page.screenshot({ path: resolve(OUT, "calendar-expanded-1440.png") });

  /* compact */
  const refC = await readRef(page, 1440, 860, async (p) => { await toCal(p); await p.click(".dens button[data-d='c']"); });
  await openApp(page, 1440, 860, "calendar");
  await page.locator(".qcv-page [data-qcv='cal-dens'] button", { hasText: "Compact" }).first().click();
  await page.waitForTimeout(400);
  app = await readApp(page);
  sameSize("calendar-compact", app, refC, "cal-lane", ["h"]);
  sameSize("calendar-compact", app, refC, "cal-seg", ["h"]);
  await page.screenshot({ path: resolve(OUT, "calendar-compact-1440.png") });
  /* put the density back — it is remembered per device, and the next case reads expanded */
  await page.locator(".qcv-page [data-qcv='cal-dens'] button", { hasText: "Expanded" }).first().click();
});

test("calendar — the sticky heading tracks the box's width through 1280 → 2000 → 1280, and the summary row does not move", async ({ page }) => {
  await openApp(page, 1280, 800, "calendar");
  const stop = async () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const b = p.querySelector("[data-qcv='cal-box']") as HTMLElement, g = p.querySelector("[data-qcv='cal-group']") as HTMLElement, s = p.querySelector("[data-qcv='sum']") as HTMLElement;
    return { box: b.clientWidth, head: Math.round(g.getBoundingClientRect().width), sum: Math.round(s.getBoundingClientRect().height * 10) / 10 };
  });
  const a = await stop();
  await page.setViewportSize({ width: 2000, height: 800 }); await page.waitForTimeout(500);
  const b = await stop();
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(500);
  const c = await stop();
  for (const [n, s] of [["1280", a], ["2000", b], ["1280 again", c]] as const) near("drag", `heading width is the box's visible width at ${n}`, s.head, s.box, 2);
  yes("drag", "the box really changed width (the precondition)", b.box > a.box + 200, `${a.box} → ${b.box}`);
  is("drag", "the summary row's height at 2000", b.sum, a.sum);
  is("drag", "the summary row's height back at 1280", c.sum, a.sum);
  is("drag", "the heading's width returns", c.head, a.head);
  record({ area: "drag", what: "stops", got: { a, b, c }, want: "reported" });
});

test("grid — two tiles across beside the docked card", async ({ page }) => {
  const toGrid = async (p: Page) => { await p.click(".views button[data-v='grid']"); };
  for (const [w, h] of [[1440, 860], [1280, 800]] as const) {
    const ref = await readRef(page, w, h, toGrid);
    await openApp(page, w, h, "grid");
    const app = await readApp(page);
    sameSize(`grid@${w}`, app, ref, "tile", ["w", "h"]);
    sameSize(`grid@${w}`, app, ref, "tile-band", ["h"]);
    sameSize(`grid@${w}`, app, ref, "open", ["w"]);
    const f = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
      const t = [...p.querySelectorAll("[data-qcv='tile']")] as HTMLElement[];
      return { n: t.length, across: new Set(t.slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().x))).size, buttons: t.reduce((n, e) => n + e.querySelectorAll("button").length, 0) };
    });
    yes(`grid@${w}`, "there are tiles (the population)", f.n > 3, String(f.n));
    is(`grid@${w}`, "tiles across", f.across, 2);
    is(`grid@${w}`, "tile actions", f.buttons, 0);
    await page.screenshot({ path: resolve(OUT, `grid-${w}.png`) });
  }
});

test("loading — the frames never move, and nothing is interactive", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 6000; });
  await page.addInitScript(() => { try { localStorage.setItem("sa.qcView", "list"); } catch { /* fine */ } });
  await openRoute(page, "/queries", { width: 1440, height: 860 });
  const busy = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    return p ? p.getAttribute("aria-busy") : "absent";
  });
  is("loading", "the page is busy while held (the precondition — or this compares the loaded page with itself)", busy, "true");
  const held = await readApp(page);
  await page.screenshot({ path: resolve(OUT, "skeleton-list-1440.png") });
  const inert = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return { rows: p.querySelectorAll("[data-qcv='row']").length, skRows: p.querySelectorAll("[data-qcv='sk-row']").length, enabled: [...p.querySelectorAll("[data-qcv='sum'] button, [data-qcv='sentence'] button")].filter((b) => !(b as HTMLButtonElement).disabled).length };
  });
  is("loading", "real rows while loading", inert.rows, 0);
  is("loading", "placeholder rows", inert.skRows, 8);
  is("loading", "enabled summary / sentence controls while loading", inert.enabled, 0);
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-busy")), { timeout: 20_000 }).toBe("false");
  await page.waitForTimeout(1300);
  const done = await readApp(page);
  for (const n of ["head-cta", "sum", "sum-live", "sum-closed", "sum-live-band", "ctl", "views", "ledger", "open", "list-head"]) {
    const a = held.boxes[n], b = done.boxes[n];
    for (const d of ["x", "y", "w", "h"] as const) near("loading", `${n}.${d} held → loaded`, a ? a[d] : null, b ? b[d] : null, 1);
  }
});

test("reduced motion — no entrance and no pulse", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 860 }, storageState: "tests/e2e/.auth/state.json" });
  const page = await ctx.newPage();
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 3000; });
  await openRoute(page, "/queries", { width: 1440, height: 860 });
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    if (!p) return null;
    const running = p.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length;
    return { busy: p.getAttribute("aria-busy"), running };
  });
  yes("reduced", "the v11 page rendered", !!r);
  is("reduced", "running animations while the skeleton is held", r?.running, 0);
  await page.screenshot({ path: resolve(OUT, "reduced-motion-1440.png") });
  await ctx.close();
});

test("Ω · the run measured enough to be believed", async () => {
  const n = existsSync(REPORT) ? (JSON.parse(readFileSync(REPORT, "utf8")).assertions as number) : 0;
  expect(n, `only ${n} assertions ran; the floor is ${MIN_ASSERTIONS}. A run that measured half of itself is a red.`).toBeGreaterThanOrEqual(MIN_ASSERTIONS);
});
