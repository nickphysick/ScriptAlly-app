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
import { ensureSignedIn, openRoute } from "./measure";

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
/**
 * ⚠️ THE LIST'S TRACK RULE IS READ OUT OF THE SHEET, because the app deliberately DIVERGES from the
 * mockup here. The ref's floors drop the date tile at a 1280 window on the app's narrower column;
 * Nick's call (20 Sep) was to bring the floors down so it survives, which necessarily moves the
 * three right-hand columns away from the ref's x at every width. So those edges are asserted
 * against the app's OWN declared floors and ceilings, and the ref's are recorded beside them.
 */
function listTemplate() {
  const css = readFileSync(resolve("src/components/queries/centre/qcvList.css"), "utf8");
  const tpl = /--qcv-tpl:\s*([^;]+);/.exec(css)?.[1] ?? "";
  const flex = [...tpl.matchAll(/minmax\((\d+(?:\.\d+)?)px,\s*(\d+(?:\.\d+)?)px\)/g)].map((m) => ({ floor: +m[1], ceiling: +m[2] }));
  const fixed = [...tpl.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
  const gap = +(/--qcv-tpl-gap:\s*(\d+(?:\.\d+)?)px/.exec(css)?.[1] ?? 0);
  const drop = +(/@container \(max-width: (\d+)px\)/.exec(css)?.[1] ?? 0);
  return { flex, fixed, gap, drop, boundary: drop + 1 };
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
/**
 * ⚠️ THE APP'S PAGE IS NARROWER THAN THE MOCKUP'S AT THE SAME WINDOW — by 44px at 1440 (the shell's
 * own insets; the brief keeps the app's sidebar and its 22px inset). Anything that depends on the
 * LEDGER's width — the list's column edges, a grid tile's width — must therefore be compared at the
 * same CONTENT width, not the same window. The mockup's column is `window − 268` (its 224px sidebar
 * and 22px insets) up to its 1440 cap, so this opens the ref at the window that gives it the app's
 * measured column.
 */
async function appColumn(page: Page): Promise<number> {
  return page.evaluate(() => Math.round([...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect().width));
}
const refWindowFor = (column: number) => column + 268;

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

test("summary row with 56 live queries — the row is the height it is with 39, and no column draws a fifth gauge", async ({ page }) => {
  /**
   * ⚠️ THE HARNESS ACCOUNT HOLDS FEWER THAN FIFTY LIVE QUERIES, so the brief's question — what does
   * the row do on a busy account — is asked with `qcReviewAid`: the account's OWN live rows repeated
   * in memory until 56 are live. Nothing is written. The claim is a comparison of the page with
   * itself: the same window, unpadded then padded, and the row's height must not move.
   */
  await openApp(page, 1440, 860);
  const read = () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const sum = p.querySelector("[data-qcv='sum']") as HTMLElement;
    const stages = [...p.querySelectorAll("[data-qcv='stage']")] as HTMLElement[];
    return {
      h: Math.round(sum.getBoundingClientRect().height * 10) / 10,
      title: (p.querySelector("[data-qcv='sum-live-band']")?.textContent || "").replace(/\s+/g, " ").trim(),
      cols: stages.map((st) => ({
        gauges: st.querySelectorAll("[data-qcv='gauge']").length,
        more: (st.querySelector("[data-qcv='gauge-more']")?.getAttribute("title") || "").trim(),
        /* the INK of the line, not its box: the line is `nowrap` and is allowed to run on past its
           own column where the neighbour is empty, so only a Range says where the words end */
        moreInk: (() => { const m = st.querySelector("[data-qcv='gauge-more']"); if (!m) return null; const r = document.createRange(); r.selectNodeContents(m); const b = [...r.getClientRects()].filter((c) => c.width > 0); return b.length ? { x0: Math.min(...b.map((c) => c.left)), x1: Math.max(...b.map((c) => c.right)) } : null; })(),
        h: Math.round(st.getBoundingClientRect().height * 10) / 10,
      })),
    };
  });
  const plain = await read();
  await page.addInitScript(() => { (window as unknown as { __SA_QC_PAD_LIVE?: number }).__SA_QC_PAD_LIVE = 56; });
  await openApp(page, 1440, 860);
  const padded = await read();
  record({ area: "summary-56", what: "unpadded", got: plain, want: "reported" });
  record({ area: "summary-56", what: "padded to 56 live", got: padded, want: "reported" });
  /* precondition FIRST: the padding took, or the comparison is the page against itself */
  const liveN = (t: string) => { const m = /(\d+)/.exec(t); return m ? Number(m[1]) : -1; };
  yes("summary-56", `the padded page says 56 live (it says "${padded.title}")`, liveN(padded.title) === 56);
  yes("summary-56", "the unpadded page holds fewer than fifty — otherwise the aid measured nothing", liveN(plain.title) > 0 && liveN(plain.title) < 50);
  near("summary-56", "the row's height with 56 live is its height without", padded.h, plain.h, 0.6);
  yes("summary-56", "no column draws more than four gauges", padded.cols.every((c) => c.gauges <= 4));
  yes("summary-56", "a column holding more than four says how many it is not drawing", padded.cols.some((c) => /^\+\d+ earlier in the window$/.test(c.more)));
  /* ⚠️ THE FAULT THIS CASE FOUND THE FIRST TIME IT RAN: with several columns over four, the
     "+N earlier in the window" lines ran into one another (124px of ink in a 98px column). Asserted
     over the INK of consecutive lines, and the population first — a run with fewer than two such
     lines proves nothing about collisions. */
  const inks = padded.cols.map((c) => c.moreInk).filter((m): m is { x0: number; x1: number } => !!m);
  yes("summary-56", `at least two columns carry the line (${inks.length}) — otherwise nothing could collide`, inks.length >= 2);
  for (let i = 1; i < inks.length; i++) yes("summary-56", `line ${i} ends before line ${i + 1} begins`, inks[i - 1].x1 <= inks[i].x0 - 2, `${inks[i - 1].x1.toFixed(1)} → ${inks[i].x0.toFixed(1)}`);
  const cardRight = await page.evaluate(() => { const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!; return (p.querySelector("[data-qcv='sum-live']") as HTMLElement).getBoundingClientRect().right; });
  yes("summary-56", "no line runs out of the card", inks.every((m) => m.x1 <= cardRight - 6));
  await page.locator(".qcv-page [data-qcv='sum']").first().screenshot({ path: resolve(OUT, "summary-56-live-1440.png") });
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
        more: s.querySelector("[data-qcv='gauge-more']")?.getAttribute("title") ?? null,
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
  /**
   * ⚠️ WHICH BRANCHES THIS PAGE ENTERED IS ASSERTED PER BRANCH, NOT IMPLIED BY A GREEN. The phase 6
   * commit message said this account entered `within`, `past` and `nodate`. As it stands it enters
   * TWO: a column draws its four FURTHEST-THROUGH gauges, an open window is behind every overrun,
   * and every agent's-turn query here with an expected date is already past it. The third branch is
   * asserted in the case below, on a page given different INPUT rather than a different reading.
   */
  const kinds = r.flatMap((s) => s.gauges.map((g) => g.kind));
  yes("gauges", "the `past` branch was entered on the rendered page", kinds.includes("past"));
  yes("gauges", "the `nodate` branch was entered on the rendered page", kinds.includes("nodate"));
  record({ area: "gauges", what: "`within` gauges on the account as it stands", got: kinds.filter((k) => k === "within").length, want: "reported" });
});

test("the summary's gauges — the OPEN-WINDOW branch, on queries re-dated inside their agency's window", async ({ page }) => {
  /**
   * ⚠️ THE THIRD BRANCH IS THE ONE A REAL ACCOUNT WILL SHOW MOST, AND THIS ACCOUNT CANNOT SHOW IT.
   * `qcReviewAid` moves a handful of agent's-turn queries' SEND dates inside their agency's stated
   * window — an input, at the top of the same pipe — and `expectedFor` → `gaugeFor` then derive the
   * open window for real. Nothing is written and no expected date is set by hand; if the aid ever
   * reaches past the send dates, the lock in `useQcLoad.test.ts` fails first.
   */
  await page.addInitScript(() => { (window as unknown as { __SA_QC_AHEAD?: number }).__SA_QC_AHEAD = 6; });
  await openApp(page, 1440, 860);
  const g = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...p.querySelectorAll("[data-qcv='gauge']")].map((el) => {
      const fill = el.querySelector("[data-qcv='gauge-fill']") as HTMLElement | null;
      const over = el.querySelector("[data-qcv='gauge-over']") as HTMLElement | null;
      const notch = (el.parentElement as HTMLElement).querySelector("[data-qcv='notch']") as HTMLElement | null;
      const box = el.getBoundingClientRect();
      return {
        kind: el.getAttribute("data-kind"), title: el.getAttribute("title") ?? "",
        fillPc: fill ? (fill.getBoundingClientRect().width / box.width) * 100 : null,
        fillBg: fill ? getComputedStyle(fill).backgroundColor : null,
        overPc: over ? (over.getBoundingClientRect().width / box.width) * 100 : null,
        notchPc: notch ? ((notch.getBoundingClientRect().x - box.x) / box.width) * 100 : null,
      };
    });
  });
  const within = g.filter((x) => x.kind === "within");
  const kinds = new Set(g.map((x) => x.kind));
  /* the precondition FIRST: the aid took, and the other two branches are still on the page beside it */
  yes("within", `the aid put open windows on the page (${within.length})`, within.length >= 3);
  for (const k of ["past", "nodate"]) yes("within", `the \`${k}\` branch is still on the page beside them`, kinds.has(k));
  /* and the geometry of the branch itself, measured as RENDERED WIDTH rather than read off a style */
  for (const w of within) {
    yes("within", `an open window's navy stops at or before the notch — ${w.title}`, w.fillPc != null && w.notchPc != null && w.fillPc <= w.notchPc + 0.6, `${w.fillPc?.toFixed(1)} vs notch ${w.notchPc?.toFixed(1)}`);
    yes("within", `an open window draws NO overrun — ${w.title}`, !w.overPc, String(w.overPc));
    is("within", "an open window's fill is navy", w.fillBg, "rgb(42, 58, 82)");
    /* ⚠️ THREE WORDINGS, NOT ONE — and the re-seeded fixture is what proved it. `gaugeFor` names
       what is being counted down to: "the expected date" on the agent's turn, "your send-by date"
       where the writer set one, "the decision date" on an offer. The old fixture held no
       writer's-turn query with an `expectedSendDate`, so this branch had only ever been seen in
       its agent's-turn form and the assertion had quietly narrowed to it. */
    yes("within", `an open window's title counts DOWN to a named date — ${w.title}`,
      /until (the expected date|your send-by date|the decision date)$/.test(w.title));
  }
  /* the spread is the point of the aid: early in the window through to the notch */
  const spread = Math.max(...within.map((w) => w.fillPc ?? 0)) - Math.min(...within.map((w) => w.fillPc ?? 0));
  yes("within", `the open windows span the track rather than sitting at one fraction (${spread.toFixed(1)}pp)`, spread > 15);
  record({ area: "within", what: "open-window fills, % of track", got: within.map((w) => +(w.fillPc ?? 0).toFixed(1)), want: "reported" });
  /* which of the three countdowns the fixture actually exercised — a monoculture here is the
     fault this case just had, so it is printed rather than inferred */
  for (const w of within) seen("within-countdown", (/until (.+)$/.exec(w.title)?.[1]) ?? "none");
  await page.locator(".qcv-page [data-qcv='sum']").first().screenshot({ path: resolve(OUT, "summary-open-window-1440.png") });
});

test("list and the docked card — 1440, 1280 and 1720", async ({ page }) => {
  for (const [w, h] of [[1440, 860], [1280, 800], [1720, 900]] as const) {
    await openApp(page, w, h);
    const app = await readApp(page);
    const column = await appColumn(page);
    const refPage = await page.context().newPage();
    const ref = await readRef(refPage, refWindowFor(column), h);
    await refPage.close();
    const area = `list@${w}`;
    const dated = !!app.boxes["row-date"];
    near(area, "the ref was opened at the app's content width", need(ref, "ref", "stagegrid").w, need(app, "app", "stagegrid").w, 1);
    sameSize(area, app, ref, "ledger", ["w"]);
    record({ area, what: "column edges from the ledger's left [chip, stands, sent, date] and the ledger's width", got: { app: ["row-chip", "row-stand", "row-sent", "row-date"].map((c) => (app.boxes[c] && app.boxes["ledger"] ? Math.round((app.boxes[c]!.x - app.boxes["ledger"]!.x) * 10) / 10 : "not drawn")), widths: ["row-stand", "row-sent", "row-date"].map((c) => app.boxes[c]?.w ?? "not drawn"), ledger: app.boxes["ledger"]?.w ?? null, column }, want: "reported" });
    /* ⚠️ THE DATE TILE IS A BRANCH, AND WHICH SIDE RAN IS STATED. Under 568px of ledger it is not drawn —
       in the app AND in the ref at that width — so its size and edge are compared only where both draw it. */
    const T = listTemplate();
    seen("list-date-tile", `${w}: ${dated ? "drawn" : `dropped (container under ${T.boundary})`}`);
    /* the container is the ledger's CARD content box — the ledger's border box less its 6px rim each side */
    is(area, "the date tile is drawn exactly where the four floors fit the container", dated, need(app, "app", "ledger").w - 12 >= T.boundary);
    /**
     * ⚠️ AND AT 1280 IT IS DRAWN, FULL STOP — the line above cannot say this. Its expected value is
     * derived from the same stylesheet the page is rendered from, so floors that rise take the
     * threshold and the tile with them and BOTH sides move together: the check passes while the
     * Queried column quietly disappears at the everyday window. That is the whole reason this pass
     * happened (Nick, 20 Sep), so it is asserted flatly, against the window rather than the CSS.
     */
    if (w === 1280) yes(area, "the date tile is drawn at a 1280 window — the column this pass exists to keep", dated);
    sameSize(area, app, ref, "open", ["w"]);
    sameSize(area, app, ref, "list-head", ["h"]);
    /* ⚠️ THE ROW IS 67 IN BOTH LAYOUTS HERE. The ref's row is auto-height and the 45px date tile is what
       makes it 67; with the tile gone its row falls to 60.8, incidentally. The app states the height,
       so the list does not change rhythm when the window crosses the threshold. */
    /* ⚠️ AND THE HEIGHT IS COMPARED TO THE REF ONLY WHERE BOTH DRAW THE TILE. At 1280 the app now
       does and the ref still does not, so the two are in different layouts: the ref's row falls to
       60.8 without the tile while the app STATES 67 in both, which is the point — the list keeps its
       rhythm across the threshold. Comparing them there measures the divergence, not the height. */
    if (dated && ref.boxes["row-date"]) sameSize(area, app, ref, "row", ["h"]);
    else near(area, "row.h (stated, tile or no tile)", app.boxes["row"]?.h, 67, 0.5);
    sameSize(area, app, ref, "row-chip", ["w", "h"]);
    /* the chip sits at the row's own padding and still matches the ref exactly */
    sameOffset(area, app, ref, "row-chip", "ledger", ["x"]);
    /**
     * ⚠️ THE THREE RIGHT-HAND COLUMNS ARE ASSERTED AGAINST THE APP'S OWN TEMPLATE, NOT THE REF'S —
     * see `listTemplate`. Every track between its declared floor and ceiling, equal gaps at or above
     * the declared minimum, and the four adding up to the width they were given: that is the whole
     * of the rule, and it cannot be satisfied by a row whose columns drifted.
     */
    const cells = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
      const row = p.querySelector("[data-qcv='row']") as HTMLElement;
      const cs = getComputedStyle(row);
      const tracks = cs.gridTemplateColumns.split(" ").map(parseFloat);
      const r = row.getBoundingClientRect();
      return { tracks, inner: r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
    });
    const want = dated ? [...T.flex, { floor: T.fixed[0], ceiling: T.fixed[0] }] : null;
    if (want) {
      is(area, "four tracks are drawn", cells.tracks.length, 4);
      cells.tracks.forEach((t, i) => yes(area, `track ${i} sits between its floor and ceiling (${want[i].floor}–${want[i].ceiling})`, t >= want[i].floor - 0.6 && t <= want[i].ceiling + 0.6, t.toFixed(1)));
      const gaps = (cells.inner - cells.tracks.reduce((x, y) => x + y, 0)) / 3;
      yes(area, `the three gaps are at or above the declared ${T.gap}px minimum`, gaps >= T.gap - 0.6, gaps.toFixed(1));
    }
    record({ area, what: "app vs REF column edges [chip, stands, sent, date] — the floors diverge deliberately (20 Sep)", got: {
      app: ["row-chip", "row-stand", "row-sent", "row-date"].map((c) => (app.boxes[c] && app.boxes["ledger"] ? Math.round((app.boxes[c]!.x - app.boxes["ledger"]!.x) * 10) / 10 : "not drawn")),
      ref: ["row-chip", "row-stand", "row-sent", "row-date"].map((c) => (ref.boxes[c] && ref.boxes["ledger"] ? Math.round((ref.boxes[c]!.x - ref.boxes["ledger"]!.x) * 10) / 10 : "not drawn")),
    }, want: "reported" });
    /* no row is wider than the ledger's frame: the floors fit, or the tile has gone */
    const spill = await page.evaluate(() => { const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!; const f = p.querySelector("[data-qcv='ledger-frame']")!.getBoundingClientRect(); return [...p.querySelectorAll("[data-qcv='row'] > *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > f.right - 1 + 0.5; }).length; });
    is(area, "cells running out past the frame's right edge", spill, 0);
    record({ area, what: "app vs REF column widths [stands, sent]", got: { app: ["row-stand", "row-sent"].map((c) => app.boxes[c]?.w ?? null), ref: ["row-stand", "row-sent"].map((c) => ref.boxes[c]?.w ?? null) }, want: "reported" });
    if (w === 1440) {
      sameSize(area, app, ref, "open-band", ["h"]);
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
    /* ── select a LIVE query: the first row on load may be closed, and a closed query has no action ── */
    await page.locator(".qcv-page [data-qcv='row'][data-status='Queried']").first().click();
    await page.waitForTimeout(700);
    const sel = await readApp(page);
    const card = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
      const o = p.querySelector("[data-qcv='open']") as HTMLElement, rows = [...p.querySelectorAll("[data-qcv='row']")] as HTMLElement[];
      const on = rows.filter((r) => r.getAttribute("aria-selected") === "true");
      const act = o.querySelector("[data-qcv='open-action']") as HTMLElement | null;
      return { same: on.length === 1 && on[0].dataset.id === o.dataset.id, status: o.dataset.status, action: act?.textContent ?? null, actBg: act ? getComputedStyle(act).backgroundColor : null,
        tabs: [...o.querySelectorAll("[role='tab']")].map((t) => t.textContent?.replace(/\d+$/, "").trim()), url: location.search, court: o.querySelector("[data-qcv='open-court']")?.textContent, rust: o.querySelector("[data-qcv='open-court']")?.getAttribute("data-you") };
    });
    yes(area, "the card shows the row that is selected", card.same, JSON.stringify(card));
    is(area, "a Queried query's one action", card.action, "Record a response");
    is(area, "…is anthracite", card.actBg, "rgb(42, 58, 82)");
    is(area, "the drawer's own three tabs, kept", card.tabs, ["Tracking", "Agent", "Notes"]);
    is(area, "a Queried query is with the agent, and wears no rust", [card.court, card.rust], ["With the agent", "false"]);
    yes(area, "choosing a row writes ?q= (a user's act)", /[?&]q=/.test(card.url), card.url);
    if (w === 1440) { sameSize(area, sel, ref, "open-action", ["h"]); sameSize(area, sel, ref, "open-foot", ["h"]); }
    await page.screenshot({ path: resolve(OUT, `list-${w}.png`) });
  }
});

test("under 900px of column — nothing selects implicitly, and a chosen row opens today's drawer", async ({ page }) => {
  await openApp(page, 1100, 800);
  const at = async () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const drawer = [...document.querySelectorAll(".qpn")].find((e) => e.getAttribute("data-on") === "true" && e.getBoundingClientRect().width > 0);
    const sum = p.querySelector("[data-qcv='sum']")!.getBoundingClientRect(), live = p.querySelector("[data-qcv='sum-live']")!.getBoundingClientRect(), cl = p.querySelector("[data-qcv='sum-closed']")!.getBoundingClientRect();
    return { column: Math.round(p.getBoundingClientRect().width), narrow: p.classList.contains("qcv-page--narrow"), docked: p.querySelectorAll("[data-qcv='open']").length,
      selected: p.querySelectorAll("[data-qcv='row'][aria-selected='true']").length, drawer: !!drawer, url: location.search, closedUnderLive: cl.top >= live.bottom - 1 && Math.abs(cl.left - live.left) < 1, sumW: Math.round(sum.width) };
  });
  const load = await at();
  yes("narrow", "the column really is under 900 (the precondition)", load.column < 900, String(load.column));
  is("narrow", "the page knows it", load.narrow, true);
  is("narrow", "docked cards", load.docked, 0);
  is("narrow", "⚠️ rows selected on load — an implicit selection here would open a drawer over the page", load.selected, 0);
  is("narrow", "a drawer open on load", load.drawer, false);
  is("narrow", "the URL on load", load.url.includes("q="), false);
  is("narrow", "the closed card sits under the live one", load.closedUnderLive, true);
  await page.locator(".qcv-page [data-qcv='row']").nth(2).click();
  await page.waitForTimeout(900);
  const chosen = await at();
  is("narrow", "a chosen row opens today's drawer", chosen.drawer, true);
  is("narrow", "…and is the one selected row", chosen.selected, 1);
  yes("narrow", "…by writing ?q=", chosen.url.includes("q="), chosen.url);
  await page.screenshot({ path: resolve(OUT, "narrow-1100-drawer.png") });
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

test("calendar — scrolled back to a lane with three or more stages: a past bar comes to full strength on hover, and its name stays readable", async ({ page }) => {
  await openApp(page, 1440, 860, "calendar");
  const found = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const box = p.querySelector("[data-qcv='cal-box']") as HTMLElement;
    const lanes = [...p.querySelectorAll("[data-qcv='cal-lane']")] as HTMLElement[];
    const lane = lanes.find((l) => l.querySelectorAll("[data-qcv='cal-hist']").length >= 2);
    if (!lane) return { stages: Math.max(0, ...lanes.map((l) => l.children.length)), ok: false };
    const first = lane.querySelector("[data-qcv='cal-hist']") as HTMLElement;
    box.scrollLeft = Math.max(0, first.offsetLeft - 40);
    box.scrollTop = Math.max(0, lane.offsetTop - 120);
    lane.setAttribute("data-e2e", "lane");
    return { stages: lane.children.length, ok: true };
  });
  yes("history", "some lane on this account has three or more stages (or the history was never exercised)", found.ok, JSON.stringify(found));
  await page.waitForTimeout(400);
  const hist = page.locator(".qcv-page [data-e2e='lane'] [data-qcv='cal-hist']").first();
  const rest = await hist.evaluate((e) => ({ op: getComputedStyle(e).opacity, title: e.getAttribute("title") }));
  is("history", "at rest a past bar is .42", rest.op, "0.42");
  yes("history", "its title states the stage and its dates", /^[A-Z][^,]+, \d{1,2} [A-Z][a-z]{2} to \d{1,2} [A-Z][a-z]{2}$/.test(rest.title ?? ""), String(rest.title));
  await hist.hover();
  await page.waitForTimeout(300);
  is("history", "hovered, it is at full strength", await hist.evaluate((e) => getComputedStyle(e).opacity), "1");
  /* the agent's name stays readable when the CURRENT bar starts off-screen: scroll so its left edge is cut */
  const sticky = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const box = p.querySelector("[data-qcv='cal-box']") as HTMLElement;
    const cur = p.querySelector("[data-e2e='lane'] [data-qcv='cal-seg']") as HTMLElement;
    if (cur.offsetWidth < 220) return null;
    box.scrollLeft = cur.offsetLeft + 60;
    const b = box.getBoundingClientRect(), nm = (cur.querySelector(".qcv-bar-nm") as HTMLElement).getBoundingClientRect();
    return { barLeftOfBox: Math.round(cur.getBoundingClientRect().left - b.left), nameLeftOfBox: Math.round(nm.left - b.left) };
  });
  if (sticky) { seen("history", "sticky name exercised"); yes("history", "the bar starts off-screen (the precondition)", sticky.barLeftOfBox < 0, JSON.stringify(sticky)); yes("history", "…and the agent's name is still inside the box", sticky.nameLeftOfBox >= 0, JSON.stringify(sticky)); }
  else seen("history", "sticky name NOT exercised — the current bar is under 220px");
  await hist.hover().catch(() => {});
  await page.screenshot({ path: resolve(OUT, "calendar-history-hover-1440.png") });
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
    await openApp(page, w, h, "grid");
    const app = await readApp(page);
    const refPage = await page.context().newPage();
    const ref = await readRef(refPage, refWindowFor(await appColumn(page)), h, toGrid);
    await refPage.close();
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
  near("loading", "a placeholder row is the real row's height", await page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelector("[data-qcv='sk-row']")!.getBoundingClientRect().height), 67, 0.5);
  is("loading", "enabled summary / sentence controls while loading", inert.enabled, 0);
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-busy")), { timeout: 20_000 }).toBe("false");
  await page.waitForTimeout(1300);
  const done = await readApp(page);
  /* ⚠️ THE LEDGER AND THE CARD KEEP THEIR PLACE AND WIDTH, NOT THEIR HEIGHT: eight placeholder rows are
     not fifty-four real ones, and a card's height is its query's. Everything ABOVE them keeps all four. */
  for (const n of ["head-cta", "sum", "sum-live", "sum-closed", "sum-live-band", "sum-closed-band", "ctl", "views", "list-head", "open-band"]) {
    const a = held.boxes[n], b = done.boxes[n];
    for (const d of ["x", "y", "w", "h"] as const) near("loading", `${n}.${d} held → loaded`, a ? a[d] : null, b ? b[d] : null, 1);
  }
  for (const n of ["ledger", "open"]) {
    const a = held.boxes[n], b = done.boxes[n];
    for (const d of ["x", "y", "w"] as const) near("loading", `${n}.${d} held → loaded`, a ? a[d] : null, b ? b[d] : null, 1);
  }

});

test("loading — the calendar's skeleton, held at the current density", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 6000; try { localStorage.setItem("sa.qcView", "calendar"); } catch { /* fine */ } });
  await openRoute(page, "/queries?view=calendar", { width: 1440, height: 860 });
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const bars = [...p.querySelectorAll(".qcv-cal-barsk")].map((b) => Math.round(b.getBoundingClientRect().height));
    return { busy: p.getAttribute("aria-busy"), bars, lanes: p.querySelectorAll("[data-qcv='cal-lane']").length, controls: p.querySelectorAll("[data-qcv='cal-bar'] button").length };
  });
  is("loading-cal", "busy while held (the precondition)", r.busy, "true");
  is("loading-cal", "six lanes of placeholder bars at the expanded bar's height", r.bars, [76, 76, 76, 76, 76, 76]);
  is("loading-cal", "real lanes", r.lanes, 0);
  is("loading-cal", "the control row is blank", r.controls, 0);
  await page.screenshot({ path: resolve(OUT, "skeleton-calendar-1440.png") });
});

test("the entrance — it runs once when the data lands, is over inside 800ms, and is recorded", async ({ browser }) => {
  /* ⚠️ NO MOTION SUPPRESSION HERE. `openRoute` kills animation for every static measurement; an
     entrance measured under it is measured not happening. This context is its own. */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, storageState: "tests/e2e/.auth/state.json", recordVideo: { dir: resolve(OUT, "video"), size: { width: 1440, height: 860 } } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 1500; try { localStorage.setItem("sa.qcView", "list"); } catch { /* fine */ } });
  await page.goto("/queries");
  await ensureSignedIn(page);
  await page.goto("/queries");
  const visible = () => page.evaluate(() => { const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0); return p ? { busy: p.getAttribute("aria-busy"), entering: p.classList.contains("qcv-page--enter"), running: p.getAnimations({ subtree: true }).filter((a) => a.playState === "running" && (a as CSSAnimation).animationName?.startsWith("qcv-") && (a as CSSAnimation).animationName !== "qcv-pulse").length, sk: p.querySelectorAll(".qcv-sk").length } : null; });
  await expect.poll(async () => (await visible())?.busy, { timeout: 30_000 }).toBe("true");
  await expect.poll(async () => (await visible())?.busy, { timeout: 30_000, intervals: [25] }).toBe("false");
  const landed = await visible();
  is("entrance", "placeholders are removed AT ONCE — none beside the content (never a cross-fade)", landed?.sk, 0);
  is("entrance", "the page is entering", landed?.entering, true);
  yes("entrance", "entrance animations are running (the precondition — or 'over by 800ms' is trivially true)", (landed?.running ?? 0) > 5, String(landed?.running));
  await page.waitForTimeout(900);
  const after = await visible();
  is("entrance", "running entrance animations 900ms later", after?.running, 0);
  is("entrance", "the entering class came off by timer", after?.entering, false);
  /* a filter, a view change and a selection do not replay it */
  await page.locator(".qcv-page [data-qcv='views'] button", { hasText: "Grid" }).first().click();
  await page.waitForTimeout(120);
  is("entrance", "replayed on a view change", (await visible())?.entering, false);
  await page.locator(".qcv-page [data-qcv='views'] button", { hasText: "List" }).first().click();
  await page.waitForTimeout(400);
  await ctx.close();
  record({ area: "entrance", what: "video", got: "test-results/qc-v11/video/*.webm", want: "reported" });
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
  await page.screenshot({ path: resolve(OUT, "reduced-motion-skeleton-1440.png") });
  /* ⚠️ AND THE LOADED PAGE, WHICH IS WHAT "THE PAGE WITH REDUCED MOTION ON" MEANS. The first version
     of this case photographed the held skeleton and called it the page. The precondition is that
     the hold has ENDED; then nothing may be running and the entrance class must never have been on. */
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-busy")), { timeout: 30_000 }).toBe("false");
  const landed = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    return { running: p.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length, rows: p.querySelectorAll("[data-qcv='row']").length, cls: p.className };
  });
  yes("reduced", `the loaded page drew its rows (${landed.rows})`, landed.rows > 3);
  is("reduced", "running animations the moment the data lands", landed.running, 0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(OUT, "reduced-motion-1440.png") });
  await ctx.close();
});

test("Ω · the run measured enough to be believed", async () => {
  const n = existsSync(REPORT) ? (JSON.parse(readFileSync(REPORT, "utf8")).assertions as number) : 0;
  expect(n, `only ${n} assertions ran; the floor is ${MIN_ASSERTIONS}. A run that measured half of itself is a red.`).toBeGreaterThanOrEqual(MIN_ASSERTIONS);
});
