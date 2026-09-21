/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcV21 — the Query Centre against design-refs/query-centre-v21.html, measured on a rendered page.
 *
 * ⚠️ REPOINTED FROM v11 TO v21 AT THE TOP OF THE REBUILD, AND EXPECTED RED UNTIL IT FINISHES.
 * The app is mid-migration between two refs: the cases that compare it to the ref describe v21,
 * which the page does not yet draw. That is a STATED, TEMPORARY red belonging to this build — not
 * the known-red backlog — and each phase's commit says which cases it turns green. The unit gates
 * (tsc, Vitest, the production build) stay green throughout; those are what "no worse than
 * baseline" governs.
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

const OUT = resolve("test-results/qc-v21");
const REPORT = resolve(OUT, "report.json");
const REF = "file://" + resolve("design-refs/query-centre-v21.html");
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
  "head", "head-title", "head-line", "head-cta", "back-overview",
  "overview", "ov-stats", "ov-card", "ov-portal", "ov-tile",
  "fan", "fan-deck", "fan-card", "fan-title",
  "ctl", "sentence",
  "stagegrid", "ledger", "open", "open-band", "open-foot", "open-action",
  "list-head", "row", "row-chip", "row-stand", "row-sent", "row-date",
  "cal-bar", "cal-box", "cal-axis", "cal-group", "cal-lane", "cal-seg", "ledger-frame",
  "tile", "tile-band",
].map((n) => [n, APP(n)]));
const REF_SEL: Sel = {
  "head": ".head", "head-title": ".head h1", "head-line": ".head .facts", "head-cta": ".head .inkpill",
  "back-overview": ".backov",
  "overview": "#ovpage", "ov-stats": ".ovstats", "ov-card": ".ovs", "ov-portal": ".vt3", "ov-tile": ".vt",
  "fan": "#fan", "fan-deck": "#fan .deck", "fan-card": "#fan .deck > *", "fan-title": "#fan .fh b",
  "ctl": ".ctl", "sentence": ".sentence",
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

/**
 * ⚠️ THE REF LANDS ON ITS OVERVIEW, AS THE APP DOES (§1.1), so every case that compares a VIEW must
 * enter one first. Before v21 the mockup opened straight into the ledger and no prep was needed;
 * without this the ref's `.ledger`, `.cols` and `#list .row` are simply absent and `need()` would
 * report the app's probes as the missing ones.
 */
const toView = (v: "list" | "cal" | "grid") => async (p: Page) => { await p.click(`.vt3 .vt[data-v='${v}']`); await p.waitForTimeout(500); };
/** …and §7 again: the ref opens a view with nothing selected too, so its open card must be ASKED for. */
/**
 * ⚠️ SCOPED TO THE VISIBLE VIEW. The ref keeps all three views in the DOM and hides two, and EVERY
 * row, tile and bar carries `data-i` — so a bare `[data-i]` resolves to a hidden list row and
 * Playwright waits out the whole test timeout for it to become visible. Seven minutes, reported as
 * a click that would not land.
 */
const toViewPicked = (v: "list" | "cal" | "grid") => async (p: Page) => { await toView(v)(p); await p.click(`.view.v-${v} [data-i]`); await p.waitForTimeout(500); };
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

/**
 * ⚠️ A VIEW IS ALWAYS ASKED FOR BY URL NOW (v21 §1.1). The per-device memory is gone and `/queries`
 * lands on the OVERVIEW, so the old seeding of `sa.qcView` did not merely stop working — it would
 * have left every view case measuring the Overview and reporting its probes as absent. `openOverview`
 * is the other door, and the two are separate functions so a case cannot open the wrong one by
 * forgetting an argument.
 */
async function openApp(page: Page, w: number, h: number, view: "list" | "calendar" | "grid" = "list") {
  await openRoute(page, `/queries?view=${view}`, { width: w, height: h });
  /* the page has landed when it says it is no longer busy */
  await expect.poll(() => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    return p ? p.getAttribute("aria-busy") : "absent";
  }), { timeout: 30_000, message: "the page root (.qcv-page) never rendered, or never stopped being busy" }).toBe("false");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1300); /* past the entrance, which is done inside 800ms */
}
/** The page with no view asked for: the Overview (§4). */
async function openOverview(page: Page, w: number, h: number) {
  await openRoute(page, "/queries", { width: w, height: h });
  await expect.poll(() => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    return p ? p.getAttribute("aria-busy") : "absent";
  }), { timeout: 30_000, message: "the page root never rendered, or never stopped being busy" }).toBe("false");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1300);
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
  const ref = await readRef(page, 1440, 860, toViewPicked("list"));
  const want: [string, "w" | "h", number][] = [
    ["head-cta", "w", 154], ["head-cta", "h", 50],
    ["ledger", "w", 756], ["open", "w", 396],
    ["open-foot", "h", 80], ["open-action", "h", 38], ["list-head", "h", 29], ["row", "h", 67], ["row-chip", "w", 32], ["row-date", "w", 46],
  ];
  /* ⚠️ `ctl.h` (42) AND `open-band.h` (37) ARE DROPPED FROM THIS TABLE, not re-baselined: they were
     the v11 brief's figures and the v21 ref reads 27.4 and 47. A number I would have had to take
     from the ref in order to check the ref against is not a check. Both are still compared
     app-against-ref in their own cases, which is the claim that matters; this table's job is to
     catch a wrong SELECTOR, and ten probes do that. */
  /* ⚠️ TWO OF THESE ARE SET BY TEXT, and the brief's figures for them came from another browser: the
     head's button reads a few pixels off its stated width with Special Elite demonstrably loaded.
     This check exists to catch a wrong SELECTOR, which is out by tens of pixels, so text-set widths get
     6px. The app is compared with the ref as read HERE, in one browser, at the usual 2. */
  const TEXT_SET = new Set(["head-cta.w"]);
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
  const ref = await readRef(page, 1440, 860, toView("list"));
  await openApp(page, 1440, 860);
  const app = await readApp(page);
  sameSize("head", app, ref, "head-cta", ["w", "h"]);
  sameSize("head", app, ref, "head-title", ["h"]);
  sameSize("head", app, ref, "head", ["h"]);
  sameOffset("head", app, ref, "head-line", "head", ["y"]);
  sameOffset("head", app, ref, "head-cta", "head", ["y"]);
  sameSize("control", app, ref, "ctl", ["h"]);
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
    return { masthead: [...wpg.querySelectorAll(".wsh, .wpg-chrome, .wpg-bar")].filter((e) => e.getBoundingClientRect().height > 0).length, tiles: vis(".qct-tile, .sts-tile"), toolbar: vis(".qcc-tb"), search: vis(".qcc-tb-search"),
      views: vis("[data-qcv='views']"), strip: vis("[data-qcv='sum']"), back: vis("[data-qcv='back-overview']"),
      windowBg: getComputedStyle(document.querySelector(".ws-window")!).backgroundColor, title: getComputedStyle(p.querySelector("[data-qcv='head-title']")!).fontFamily, sentence: getComputedStyle(p.querySelector("[data-qcv='pk-filter']")!).fontFamily, cta: getComputedStyle(p.querySelector("[data-qcv='head-cta'] span")!).fontFamily };
  });
  is("control", "the old masthead, its chrome slab and its collapsed bar", gone.masthead, 0);
  is("control", "the five tiles", gone.tiles, 0);
  is("control", "the Filter / Group / Sort toolbar", gone.toolbar, 0);
  /* ⚠️ ASSERTED ABSENT, NOT RESTYLED (§1.3 and §6). The portal's three tiles are the only way into
     a view and the Overview is the only summary; a switch or a strip drawn here would be a second
     of each, which is what both removals exist to prevent. */
  is("control", "the retired view switch", gone.views, 0);
  is("control", "the retired compact strip", gone.strip, 0);
  is("control", "…and inside a view, the back link IS drawn", gone.back, 1);
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

/**
 * ⚠️ FIVE CASES ARE RETIRED HERE, BY DESIGN AND NOT BECAUSE THEY BROKE (v21 §6, Nick's change of
 * plan). They measured the compact strip — the live card with its stage columns and gauges, the
 * closed band, the header's wrap at a 1280 window, the notch at 70%, the row's height with 56 live
 * queries and the "+N earlier" lines not colliding. The strip is gone from the views entirely: the
 * Overview is the only summary, and a view shows its content and nothing else.
 *
 * The claims did not lapse, they MOVED. `rowsForStage`, `rowsForClosed` and `fanHand` still feed
 * the Overview's stat row and the fan, and their unit locks are untouched; the stat row and the fan
 * are measured below. What is gone with the component is the geometry OF that component — a lock on
 * the gauges' notch has no subject once nothing draws a gauge.
 *
 * Recoverable at 2e094dd6 (the commit that built the strip) if the decision is ever revisited.
 */

test("list and the docked card — 1440, 1280 and 1720", async ({ page }) => {
  for (const [w, h] of [[1440, 860], [1280, 800], [1720, 900]] as const) {
    await openApp(page, w, h);
    const app = await readApp(page);
    const column = await appColumn(page);
    const refPage = await page.context().newPage();
    const ref = await readRef(refPage, refWindowFor(column), h, toView("list"));
    /* and the same ref with a query chosen, for everything that only exists once one is */
    const refPicked = await readRef(refPage, refWindowFor(column), h, toViewPicked("list"));
    await refPage.close();
    const area = `list@${w}`;
    const dated = !!app.boxes["row-date"];
    near(area, "the ref was opened at the app's content width", need(ref, "ref", "stagegrid").w, need(app, "app", "stagegrid").w, 1);
    /**
     * ⚠️ REVERSED BY §7, AND THE REF AGREES: the ledger is the WHOLE STAGE until a query is chosen.
     * It used to be 756 beside a 396 card on load, because the page selected the first row for you.
     * Both sides now open with nothing selected, so both open full width — and the case that the
     * ledger and the card share the stage moved down to after the click, where it belongs.
     */
    near(area, "the ledger fills the stage while nothing is selected", need(app, "app", "ledger").w, need(app, "app", "stagegrid").w, 1);
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
    const facts = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...p.querySelectorAll("[data-qcv='row']")] as HTMLElement[];
      const lefts = (s: string) => [...new Set(rows.map((r) => { const e = r.querySelector(s); return e ? Math.round(e.getBoundingClientRect().x) : -1; }))];
      const open = p.querySelector("[data-qcv='open']") as HTMLElement | null;
      return { rows: rows.length, url: location.search, selected: rows.filter((r) => r.getAttribute("aria-selected") === "true").length,
        standLefts: lefts("[data-qcv='row-stand']"), sentLefts: lefts("[data-qcv='row-sent']"),
        rowButtons: rows.reduce((n, r) => n + r.querySelectorAll("button").length, 0),
        overlay: document.querySelectorAll(".qpn-scrim").length,
        you: rows.filter((r) => r.getAttribute("data-you") === "true").map((r) => r.getAttribute("data-status")) };
    });
    yes(area, "there are rows (the population)", facts.rows > 3, String(facts.rows));
    /* ⚠️ §7: NOTHING SELECTS ITSELF, at any width. The page used to open on the first row and write
       nothing to the URL, so a reader arrived at a query they had not asked for and the ledger was
       already narrowed to make room for it. */
    is(area, "rows selected on load", facts.selected, 0);
    is(area, "a docked card on load", app.boxes["open"] ? 1 : 0, 0);
    yes(area, "…and the URL carries no ?q= (nothing was chosen, so nothing is stated)", !/[?&]q=/.test(facts.url ?? ""), String(facts.url));
    is(area, "every row's second column starts at one x — tracks sized by rule, not content", facts.standLefts.length, 1);
    is(area, "every row's third column starts at one x", facts.sentLefts.length, 1);
    is(area, "row buttons", facts.rowButtons, 0);
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
      return { same: on.length === 1 && on[0].dataset.id === o.dataset.id, status: o.dataset.status, pos: getComputedStyle(o).position, action: act?.textContent ?? null, actBg: act ? getComputedStyle(act).backgroundColor : null,
        tabs: [...o.querySelectorAll("[role='tab']")].map((t) => t.textContent?.replace(/\d+$/, "").trim()), url: location.search, court: o.querySelector("[data-qcv='open-court']")?.textContent, rust: o.querySelector("[data-qcv='open-court']")?.getAttribute("data-you") };
    });
    yes(area, "the card shows the row that is selected", card.same, JSON.stringify(card));
    /* §7's other half: the moment a query IS chosen, the ledger gives the card its column */
    const stq = need(sel, "app", "stagegrid"), leq = need(sel, "app", "ledger"), opq = need(sel, "app", "open");
    near(area, "once chosen: ledger + 20 + card fills the stage", leq.w + 20 + opq.w, stq.w, 1);
    yes(area, "…and the ledger really gave up room", leq.w < need(app, "app", "ledger").w - 200, `${need(app, "app", "ledger").w} → ${leq.w}`);
    if (w === 1440) { sameSize(area, sel, refPicked, "open-band", ["h"]); sameSize(area, sel, refPicked, "open", ["w"]); }
    is(area, "a Queried query's one action", card.action, "Record a response");
    is(area, "…is anthracite", card.actBg, "rgb(42, 58, 82)");
    is(area, "the drawer's own three tabs, kept", card.tabs, ["Tracking", "Agent", "Notes"]);
    is(area, "a Queried query is with the agent, and wears no rust", [card.court, card.rust], ["With the agent", "false"]);
    yes(area, "choosing a row writes ?q= (a user's act)", /[?&]q=/.test(card.url), card.url);
    /* ⚠️ READ AFTER THE CLICK, because there is no card before it (§7) — a `getComputedStyle` of
       nothing is not evidence that the card is not an overlay. */
    is(area, "the card is sticky, not an overlay", card.pos, "sticky");
    if (w === 1440) { sameSize(area, sel, refPicked, "open-action", ["h"]); sameSize(area, sel, refPicked, "open-foot", ["h"]); }
    await page.screenshot({ path: resolve(OUT, `list-${w}.png`) });
  }
});

test("under 900px of column — nothing selects implicitly, and a chosen row opens today's drawer", async ({ page }) => {
  await openApp(page, 1100, 800);
  const at = async () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const drawer = [...document.querySelectorAll(".qpn")].find((e) => e.getAttribute("data-on") === "true" && e.getBoundingClientRect().width > 0);
    return { column: Math.round(p.getBoundingClientRect().width), narrow: p.classList.contains("qcv-page--narrow"), docked: p.querySelectorAll("[data-qcv='open']").length,
      selected: p.querySelectorAll("[data-qcv='row'][aria-selected='true']").length, drawer: !!drawer, url: location.search };
  });
  const load = await at();
  yes("narrow", "the column really is under 900 (the precondition)", load.column < 900, String(load.column));
  is("narrow", "the page knows it", load.narrow, true);
  is("narrow", "docked cards", load.docked, 0);
  /* ⚠️ THIS IS NOW THE RULE AT EVERY WIDTH (§7), not the narrow exception it used to be. It stays
     here because the CONSEQUENCE is still peculiar to a narrow column: an implicit selection here
     would have opened a drawer over the page nobody asked for. */
  is("narrow", "rows selected on load", load.selected, 0);
  is("narrow", "a drawer open on load", load.drawer, false);
  is("narrow", "the URL on load", load.url.includes("q="), false);
  await page.locator(".qcv-page [data-qcv='row']").nth(2).click();
  await page.waitForTimeout(900);
  const chosen = await at();
  is("narrow", "a chosen row opens today's drawer", chosen.drawer, true);
  is("narrow", "…and is the one selected row", chosen.selected, 1);
  yes("narrow", "…by writing ?q=", chosen.url.includes("q="), chosen.url);
  await page.screenshot({ path: resolve(OUT, "narrow-1100-drawer.png") });
});

test("calendar — expanded and compact, the inset, one bar per stage", async ({ page }) => {
  const toCal = toView("cal");
  const ref = await readRef(page, 1440, 860, toCal);
  await openApp(page, 1440, 860, "calendar");
  let app = await readApp(page);
  sameSize("calendar", app, ref, "cal-bar", ["h"]);
  sameSize("calendar", app, ref, "cal-axis", ["h"]);
  sameSize("calendar", app, ref, "cal-group", ["h"]);
  sameSize("calendar", app, ref, "cal-lane", ["h"]);
  sameSize("calendar", app, ref, "cal-seg", ["h"]);
  /* ⚠️ THE DOCKED CARD IS NOT MEASURED HERE: nothing is selected on arrival in any view (§7), so on
     both sides there is no card to measure and "the card is 396 in the calendar too" would be a
     comparison of two absences. It is the same component the list case measures, after a pick. */
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
  const refC = await readRef(page, 1440, 860, async (p) => { await toCal(p); await p.click(".dens button[data-d='c']"); await p.waitForTimeout(300); });
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

test("calendar — the sticky heading tracks the box's width through 1280 → 2000 → 1280, and the head does not move", async ({ page }) => {
  await openApp(page, 1280, 800, "calendar");
  const stop = async () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const b = p.querySelector("[data-qcv='cal-box']") as HTMLElement, g = p.querySelector("[data-qcv='cal-group']") as HTMLElement, s = p.querySelector("[data-qcv='head']") as HTMLElement;
    /* ⚠️ THE PAGE HEAD IN PLACE OF THE RETIRED STRIP (§6). The claim was never about the strip: it
       is that a resize moves the calendar's heading and NOTHING ELSE. The head is what is still
       above the view, so it is what must hold still. */
    return { box: b.clientWidth, head: Math.round(g.getBoundingClientRect().width), sum: Math.round(s.getBoundingClientRect().height * 10) / 10 };
  });
  const a = await stop();
  await page.setViewportSize({ width: 2000, height: 800 }); await page.waitForTimeout(500);
  const b = await stop();
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(500);
  const c = await stop();
  for (const [n, s] of [["1280", a], ["2000", b], ["1280 again", c]] as const) near("drag", `heading width is the box's visible width at ${n}`, s.head, s.box, 2);
  yes("drag", "the box really changed width (the precondition)", b.box > a.box + 200, `${a.box} → ${b.box}`);
  is("drag", "the page head's height at 2000", b.sum, a.sum);
  is("drag", "the page head's height back at 1280", c.sum, a.sum);
  is("drag", "the heading's width returns", c.head, a.head);
  record({ area: "drag", what: "stops", got: { a, b, c }, want: "reported" });
});

test("grid — two tiles across beside the docked card", async ({ page }) => {
  for (const [w, h] of [[1440, 860], [1280, 800]] as const) {
    await openApp(page, w, h, "grid");
    /* ⚠️ A QUERY IS CHOSEN FIRST, ON BOTH SIDES (§7). Nothing selects itself now, so an unpicked
       grid is two tiles across the WHOLE stage and an unpicked ref is the same — but the claim
       being measured is the grid BESIDE the docked card, which neither side draws until asked. */
    await page.locator(".qcv-page [data-qcv='tile']").first().click();
    await page.waitForTimeout(600);
    const app = await readApp(page);
    const refPage = await page.context().newPage();
    const ref = await readRef(refPage, refWindowFor(await appColumn(page)), h, toViewPicked("grid"));
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
  await openRoute(page, "/queries?view=list", { width: 1440, height: 860 });
  const busy = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    return p ? p.getAttribute("aria-busy") : "absent";
  });
  is("loading", "the page is busy while held (the precondition — or this compares the loaded page with itself)", busy, "true");
  const held = await readApp(page);
  await page.screenshot({ path: resolve(OUT, "skeleton-list-1440.png") });
  const inert = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return { rows: p.querySelectorAll("[data-qcv='row']").length, skRows: p.querySelectorAll("[data-qcv='sk-row']").length, enabled: [...p.querySelectorAll("[data-qcv='head'] button, [data-qcv='sentence'] button")].filter((b) => !(b as HTMLButtonElement).disabled).length };
  });
  is("loading", "real rows while loading", inert.rows, 0);
  is("loading", "placeholder rows", inert.skRows, 8);
  near("loading", "a placeholder row is the real row's height", await page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelector("[data-qcv='sk-row']")!.getBoundingClientRect().height), 67, 0.5);
  is("loading", "enabled head / sentence controls while loading", inert.enabled, 0);
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-busy")), { timeout: 20_000 }).toBe("false");
  await page.waitForTimeout(1300);
  const done = await readApp(page);
  /* ⚠️ THE LEDGER AND THE CARD KEEP THEIR PLACE AND WIDTH, NOT THEIR HEIGHT: eight placeholder rows are
     not fifty-four real ones, and a card's height is its query's. Everything ABOVE them keeps all four. */
  /* ⚠️ `open-band` IS OFF THIS LIST: with nothing selected on load there is no card, on either side
     of the comparison, so "the frame did not move" would be a claim about two absences. */
  for (const n of ["head-cta", "ctl", "list-head"]) {
    const a = held.boxes[n], b = done.boxes[n];
    for (const d of ["x", "y", "w", "h"] as const) near("loading", `${n}.${d} held → loaded`, a ? a[d] : null, b ? b[d] : null, 1);
  }
  /* ⚠️ `open` GOES WITH `open-band`, FOR THE SAME REASON — the card is absent on BOTH sides now
     (§7), and `near` on two absences is not a claim about a frame holding still, it is a claim
     about nothing. The ledger is the frame this page has while it loads. */
  for (const n of ["ledger"]) {
    const a = held.boxes[n], b = done.boxes[n];
    for (const d of ["x", "y", "w"] as const) near("loading", `${n}.${d} held → loaded`, a ? a[d] : null, b ? b[d] : null, 1);
  }
  /* and the absence itself is the claim worth making */
  is("loading", "a docked card, held", held.boxes["open"] ? 1 : 0, 0);
  is("loading", "…and loaded", done.boxes["open"] ? 1 : 0, 0);

});

test("loading — the calendar's skeleton, held at the current density", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 6000; });
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
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 1500; });
  await page.goto("/queries?view=list");
  await ensureSignedIn(page);
  await page.goto("/queries?view=list");
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
  /* ⚠️ A VIEW CHANGE IS NOW A ROUND TRIP THROUGH THE OVERVIEW (§1.3 retired the switch), which is
     the harder case for this claim rather than the easier one: leaving a view and entering another
     is exactly where a re-run of the entrance would be easiest to miss. */
  await page.locator(".qcv-page [data-qcv='back-overview']").first().click();
  await page.waitForTimeout(150);
  is("entrance", "replayed on the way out to the Overview", (await visible())?.entering, false);
  await page.locator(".qcv-page [data-qcv='ov-tile'][data-view='grid']").first().click();
  await page.waitForTimeout(150);
  is("entrance", "replayed on entering another view", (await visible())?.entering, false);
  await page.waitForTimeout(300);
  await ctx.close();
  record({ area: "entrance", what: "video", got: "test-results/qc-v21/video/*.webm", want: "reported" });
});

test("reduced motion — no entrance and no pulse", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 860 }, storageState: "tests/e2e/.auth/state.json" });
  const page = await ctx.newPage();
  await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = 3000; });
  /* the Ledger, not the landing: this case's second half counts ROWS, and the Overview has none */
  await openRoute(page, "/queries?view=list", { width: 1440, height: 860 });
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    if (!p) return null;
    const running = p.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length;
    return { busy: p.getAttribute("aria-busy"), running };
  });
  yes("reduced", "the page rendered", !!r);
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

/* ══ v21 ══════════════════════════════════════════════════════════════════════════════════════ */

test("the Overview — the stat row, the portal, and everything below the head replaced", async ({ page }) => {
  await openOverview(page, 1440, 860);
  const app = await readApp(page);
  /* ⚠️ THE REF IS OPENED AT THE APP'S OWN COLUMN WIDTH, as every other comparison here is. Read at
     1440 flat its stat card is 157 against the app's 130 — a card 27px wider fits its name on one
     line, so the ref's card measured 130.4 and the app's 141.2 and the difference was the MEASURE,
     not the card. */
  const refPage = await page.context().newPage();
  const ref = await readRef(refPage, refWindowFor(await appColumn(page)), 860);
  await refPage.close();
  sameSize("overview", app, ref, "ov-card", ["h"]);
  /* ⚠️ THE TILE'S HEIGHT IS REPORTED, NOT ASSERTED AGAINST THE REF. The ref states a flat 420; the
     app derives it from the portal's own measured top so the tiles end above the fold, which is the
     fix that stopped them running 19px past it. At 1440×860 that gives 387. Pinning the ref's 420
     would be pinning the number the app exists not to use. */
  record({ area: "overview", what: "ov-tile.h — app (derived from the fold) vs ref (a flat 420)", got: { app: app.boxes["ov-tile"]?.h, ref: need(ref, "ref", "ov-tile").h }, want: "reported" });
  sameOffset("overview", app, ref, "ov-portal", "overview", ["y"]);
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const cards = [...p.querySelectorAll("[data-qcv='ov-card']")] as HTMLElement[];
    const tiles = [...p.querySelectorAll("[data-qcv='ov-tile']")] as HTMLElement[];
    const port = p.querySelector("[data-qcv='ov-portal']") as HTMLElement;
    const fig = (c: HTMLElement) => Number(c.querySelector(".qco-fig")?.textContent ?? "-1");
    return {
      view: p.getAttribute("data-view"), url: location.search,
      cards: cards.map((c) => ({ key: c.dataset.key, n: fig(c), name: c.querySelector(".qco-name")?.textContent, note: c.querySelector(".qco-note")?.textContent })),
      tiles: tiles.map((t) => ({ view: t.dataset.view, label: t.querySelector(".qco-tname")?.textContent, art: !!t.querySelector("[data-qcv='ov-art']") })),
      /* ⚠️ THE FOLD IS THE SCROLLER'S, NOT THE WINDOW'S — the whole point of `--qco-avail`. */
      portalBottom: Math.round(port.getBoundingClientRect().bottom),
      fold: Math.round((p.closest(".wpg-scroll") as HTMLElement).getBoundingClientRect().top + (p.closest(".wpg-scroll") as HTMLElement).clientHeight),
      pageScroll: Math.round(p.closest(".wpg-scroll")?.scrollHeight ?? 0) - Math.round(p.closest(".wpg-scroll")?.clientHeight ?? 0),
      /* what the Overview replaces */
      sentence: p.querySelectorAll("[data-qcv='sentence'], [data-qcv='ctl']").length,
      ledger: p.querySelectorAll("[data-qcv='ledger']").length, open: p.querySelectorAll("[data-qcv='open']").length,
      back: p.querySelectorAll("[data-qcv='back-overview']").length,
    };
  });
  is("overview", "the page says it is the Overview", r.view, "overview");
  is("overview", "…and the URL says nothing (it is the state the URL does not state)", r.url.includes("view="), false);
  yes("overview", "seven cards, or eight with a live R&R", r.cards.length === 7 || r.cards.length === 8, JSON.stringify(r.cards.map((c) => c.key)));
  seen("overview", `${r.cards.length} stat cards`);
  record({ area: "overview", what: "the stat row", got: r.cards, want: "reported" });
  is("overview", "the portal's three tiles, in the portal's order", r.tiles.map((t) => t.view), ["list", "grid", "calendar"]);
  is("overview", "…labelled Ledger, List, Calendar (v21's renames)", r.tiles.map((t) => t.label), ["Ledger", "List", "Calendar"]);
  yes("overview", "every tile reserves its art slot", r.tiles.every((t) => t.art));
  /**
   * ⚠️ THE CLAIM IS REACHABILITY, NOT "IT NEVER SCROLLS" — and the stronger form was wrong.
   * The tiles have a 330px floor, so below a certain viewport they cannot shrink to fit and the
   * page scrolls to reach them: measured 1440×860 → 0 scroll with 44px of clearance, 1920×1080 →
   * 0 with 200, and 1280×800 → the floor binds, the portal runs 2px past the fold and the page
   * scrolls 24. What the original fault was is UNREACHABLE — 19px past the fold with
   * `scrollHeight === clientHeight`, so nothing could bring it into view.
   */
  const past = Math.max(0, r.portalBottom - r.fold);
  seen("overview", past === 0 ? "the portal fits above the fold" : "the tile floor binds; the page scrolls to reach it");
  record({ area: "overview", what: "portal foot vs the scroller's fold, and the scroll available", got: { portalBottom: r.portalBottom, fold: r.fold, past, scroll: Math.max(0, r.pageScroll) }, want: "reported" });
  yes("overview", `whatever runs past the fold can be scrolled to (${past} past, ${Math.max(0, r.pageScroll)} of scroll)`, past <= Math.max(0, r.pageScroll));
  for (const [k, n] of [["the sentence and its row", r.sentence], ["the ledger", r.ledger], ["a docked card", r.open], ["the back link", r.back]] as const) {
    is("overview", `${k}, on the Overview`, n, 0);
  }
  await page.screenshot({ path: resolve(OUT, "overview-1440.png") });
});

test("the Overview → a view → back — the back link and the crumb are the only ways out", async ({ page }) => {
  await openOverview(page, 1440, 860);
  const at = () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return { view: p.getAttribute("data-view"), url: location.search, back: p.querySelectorAll("[data-qcv='back-overview']").length,
      crumb: [...document.querySelectorAll(".ws-crumb a, .ws-crumb b, .ws-crumb span")].map((e) => e.textContent?.trim()).filter(Boolean) };
  });
  await page.locator(".qcv-page [data-qcv='ov-tile'][data-view='calendar']").first().click();
  await page.waitForTimeout(700);
  const inView = await at();
  is("portal", "a tile enters its view", inView.view, "calendar");
  yes("portal", "…and states it in the URL", /view=calendar/.test(inView.url), inView.url);
  is("portal", "the back link is drawn inside a view", inView.back, 1);
  record({ area: "portal", what: "the crumb inside a view", got: inView.crumb, want: "reported" });
  /* choose a query, then leave: Back clears BOTH */
  await page.locator(".qcv-page [data-qcv='cal-seg']").first().click();
  await page.waitForTimeout(600);
  yes("portal", "a query can be chosen in the view", /[?&]q=/.test((await at()).url));
  await page.locator(".qcv-page [data-qcv='back-overview']").first().click();
  await page.waitForTimeout(700);
  const out = await at();
  is("portal", "Back returns to the Overview", out.view, "overview");
  is("portal", "…clearing the view", out.url.includes("view="), false);
  is("portal", "…and the selection with it", out.url.includes("q="), false);
});

test("§7 — Escape closes the open query and leaves the view where it is", async ({ page }) => {
  await openApp(page, 1440, 860);
  await page.locator(".qcv-page [data-qcv='row']").nth(1).click();
  await page.waitForTimeout(600);
  const open = await page.evaluate(() => ({ url: location.search, open: document.querySelectorAll("[data-qcv='open']").length }));
  yes("escape", "a query is open (the precondition)", open.open === 1 && /[?&]q=/.test(open.url), JSON.stringify(open));
  await page.locator(".qcv-page [data-qcv='row']").nth(1).press("Escape");
  await page.waitForTimeout(600);
  const shut = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return { url: location.search, view: p.getAttribute("data-view"), open: p.querySelectorAll("[data-qcv='open']").length,
      ledger: Math.round(p.querySelector("[data-qcv='ledger']")!.getBoundingClientRect().width), stage: Math.round(p.querySelector("[data-qcv='stagegrid']")!.getBoundingClientRect().width) };
  });
  is("escape", "the card closes", shut.open, 0);
  is("escape", "…and ?q= goes with it", shut.url.includes("q="), false);
  /* ⚠️ THE POINT OF THE SEPARATE HANDLER: Escape must NOT be Back. */
  is("escape", "the view stays where it was", shut.view, "list");
  near("escape", "…and the ledger takes the stage back", shut.ledger, shut.stage, 1);
});

test("the fan — a stat card deals its hand, capped at fifteen with a stack card behind", async ({ page }) => {
  await openOverview(page, 1440, 860);
  const cards = await page.evaluate(() => [...document.querySelectorAll(".qcv-page [data-qcv='ov-card']")].map((c) => ({ key: (c as HTMLElement).dataset.key, n: Number(c.querySelector(".qco-fig")?.textContent ?? "-1") })));
  const busiest = cards.filter((c) => c.n > 0).sort((a, b) => b.n - a.n)[0];
  yes("fan", "some stat card has a hand to deal (the population)", !!busiest && busiest.n > 0, JSON.stringify(cards));
  await page.locator(`.qcv-page [data-qcv='ov-card'][data-key='${busiest.key}']`).first().click();
  await page.waitForTimeout(900);
  const fan = await page.evaluate(() => {
    const f = document.querySelector("[data-qcv='fan']") as HTMLElement | null;
    if (!f) return null;
    /* ⚠️ THE STACK CARD CARRIES THE SAME PROBE AND IS NOT A DEALT CARD. Counting it made the hand
       16 against a cap of 15 — which read exactly like the cap being off by one. */
    const deck = ([...f.querySelectorAll("[data-qcv='fan-card']")] as HTMLElement[]).filter((d) => !d.classList.contains("qcf-stack"));
    const stack = f.querySelector(".qcf-stack") as HTMLElement | null;
    return { role: f.getAttribute("role"), modal: f.getAttribute("aria-modal"), title: f.querySelector("[data-qcv='fan-title']")?.textContent,
      dealt: deck.length, stack: stack ? (stack.querySelector("b")?.textContent ?? "") : null,
      back: f.querySelectorAll("[data-qcv='fan-back']").length,
      /* ⚠️ THE FANNED CARD IS THE APP'S OWN QUERY CARD, dressed by its host and not forked */
      isQueryCard: deck.every((d) => !!d.querySelector(".qcard")),
      /* ⚠️ `offsetWidth`, NOT THE RECT. A fanned card is rotated, so `getBoundingClientRect` returns
         the SWUNG box — 296 for a 260px card, which reads exactly like the wrong width. The brief's
         own trap 3, walked into by the case written to check the brief. */
      w: deck.length ? deck[0].offsetWidth : null,
      /* ⚠️ VISIBLE tabs. `display: none` is how the row is turned off, and a hidden element still
         answers `querySelectorAll` — so counting matches measured the markup, not the card. */
      tabs: deck.reduce((n, d) => n + [...d.querySelectorAll("[role='tab']")].filter((t) => (t as HTMLElement).getBoundingClientRect().height > 0).length, 0),
      /**
       * ⚠️ THE FAN'S OWN CHROME, NOT THE CARD'S. The scope fault this checks for is `.qcf`'s rules
       * painting their fallbacks out here; the CARD is the app's card and renders in the app's body
       * faces exactly as it does on the dashboard, which is the point of not forking it. A first
       * version read the card's title, found Source Sans 3 — correct — and reported it as the fault.
       */
      face: getComputedStyle(f.querySelector("[data-qcv='fan-title']") as Element).fontFamily,
      stackFace: f.querySelector(".qcf-stack-face b") ? getComputedStyle(f.querySelector(".qcf-stack-face b") as Element).fontFamily : null,
      cardFace: deck.length && deck[0].querySelector(".qcard-name") ? getComputedStyle(deck[0].querySelector(".qcard-name") as Element).fontFamily : null,
    };
  });
  yes("fan", "the card dealt a fan", !!fan, JSON.stringify(cards));
  is("fan", "it is a modal dialogue", [fan?.role, fan?.modal], ["dialog", "true"]);
  is("fan", "it has its own backdrop element (so a click on a card is not a click on it)", fan?.back, 1);
  yes("fan", `the header states the full count (${busiest.n})`, (fan?.title ?? "").includes(String(busiest.n)), String(fan?.title));
  /* ⚠️ THE CAP, AND THE STACK CARD, ASSERTED AGAINST THE STAT CARD'S OWN FIGURE — never a literal */
  is("fan", "it deals min(count, 15)", fan?.dealt, Math.min(busiest.n, 15));
  seen("fan", busiest.n > 15 ? "over the cap (a stack card)" : "under the cap (no stack)");
  if (busiest.n > 15) is("fan", "…and the stack card says how many it is not dealing", fan?.stack, `+${busiest.n - 15} more`);
  else is("fan", "…and there is no stack card", fan?.stack, null);
  is("fan", "a dealt card IS the app's query card", fan?.isQueryCard, true);
  is("fan", "…at 260px, the host's width", fan?.w, 260);
  is("fan", "…with the popover's tab row off (a dealt card is a glance)", fan?.tabs, 0);
  yes("fan", "the fan's own chrome resolves the typewriter face out here (the portal carries its own palette)", /Special Elite/.test(fan?.face ?? ""), String(fan?.face));
  if (fan?.stackFace) yes("fan", "…and so does the stack card", /Special Elite/.test(fan.stackFace), String(fan.stackFace));
  record({ area: "fan", what: "the CARD keeps the app's own body face, as it does on the dashboard", got: fan?.cardFace, want: "reported" });
  await page.screenshot({ path: resolve(OUT, `fan-${busiest.key}-1440.png`) });
  /* Escape closes it and leaves the Overview where it was */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const shut = await page.evaluate(() => ({ fan: document.querySelectorAll("[data-qcv='fan']").length, view: [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.getAttribute("data-view") }));
  is("fan", "Escape closes it", shut.fan, 0);
  is("fan", "…and leaves you on the Overview", shut.view, "overview");
});

test("§8 — a live calendar bar always reaches today, and an overrun is drawn inside it", async ({ page }) => {
  await openApp(page, 1440, 860, "calendar");
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const today = p.querySelector("[data-qcv='cal-today']")!.getBoundingClientRect();
    const segs = [...p.querySelectorAll("[data-qcv='cal-seg']")] as HTMLElement[];
    return {
      today: today.left,
      bars: segs.map((b) => {
        const box = b.getBoundingClientRect();
        const over = b.querySelector(".qcv-bar-over") as HTMLElement | null;
        const cs = getComputedStyle(b);
        return { status: b.dataset.status, right: box.right, left: box.left, title: b.getAttribute("title") ?? b.getAttribute("aria-label") ?? "",
          over: over ? Math.round(over.getBoundingClientRect().right - over.getBoundingClientRect().left) : null,
          overRight: over ? over.getBoundingClientRect().right : null,
          openLeft: cs.borderLeftStyle === "dashed", openRight: cs.borderRightStyle === "dashed" };
      }),
    };
  });
  yes("§8", "there are live bars (the population)", r.bars.length > 3, String(r.bars.length));
  const closed = (b: { status?: string }) => ["Rejected", "Withdrawn", "No Response"].includes(String(b.status));
  const live = r.bars.filter((b) => !closed(b));
  yes("§8", "…and some of them are live", live.length > 0, String(live.length));
  for (const b of live) yes("§8", `a live ${b.status} bar reaches today`, b.right >= r.today - 1.5, `${b.right.toFixed(1)} vs ${r.today.toFixed(1)}`);
  const past = live.filter((b) => b.over != null);
  seen("§8", `${past.length} of ${live.length} live bars are past their expected date`);
  yes("§8", "some bar is past its expected date — or the overrun branch was never entered", past.length > 0, String(past.length));
  for (const b of past) yes("§8", "the overrun ends at the bar's own end, inside it", Math.abs((b.overRight as number) - b.right) <= 2, JSON.stringify(b));
  /* the undated stage: a bar that says so, with a dashed LEFT edge */
  const undated = r.bars.filter((b) => /stage not dated/i.test(b.title));
  seen("§8", undated.length ? `${undated.length} undated stages` : "no undated stage on this account");
  for (const b of undated) {
    yes("§8", "an undated stage's bar says it is undated", /stage not dated/i.test(b.title), b.title);
    yes("§8", "…and its left edge is dashed, because the start was drawn rather than recorded", b.openLeft, JSON.stringify(b));
  }
  record({ area: "§8", what: "bars", got: r.bars.slice(0, 12), want: "reported" });
  await page.screenshot({ path: resolve(OUT, "calendar-today-1440.png") });
});

test("StatusDot — the ring set, one grammar, drawn by nothing else", async ({ page }) => {
  await openApp(page, 1440, 860);
  const r = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const marks = [...p.querySelectorAll("svg[viewBox='0 0 24 24']")].filter((m) => m.querySelector("circle[r='10'], path"));
    const kind = (m: Element) => {
      const ring = m.querySelector("circle[r='10']") as SVGCircleElement | null;
      return { ring: ring ? (ring.getAttribute("stroke-dasharray") ? "dashed" : "solid") : "none",
        centre: m.querySelector("circle[r='6.5']") ? "full" : m.querySelector("path[d^='M12 12L12 5.5']") ? "half" : m.querySelector("path[d='M7.5 12h9']") ? "bar" : "none",
        stroke: getComputedStyle(m).strokeWidth };
    };
    return { n: marks.length, kinds: marks.map(kind),
      /* the retired machinery: no tinted disc, no pulse */
      pulse: p.querySelectorAll(".sa-statusdot").length,
      discs: [...p.querySelectorAll("[class*='statusdot']")].length };
  });
  yes("statusdot", "marks are drawn (the population)", r.n > 5, String(r.n));
  const seenKinds = new Set(r.kinds.map((k) => `${k.ring}+${k.centre}`));
  for (const k of seenKinds) seen("statusdot", k);
  record({ area: "statusdot", what: "the glyphs this account draws", got: [...seenKinds].sort(), want: "reported" });
  yes("statusdot", "every mark is a ring or a document — never a tinted disc", r.kinds.every((k) => k.ring !== "none" || k.centre === "none"), JSON.stringify(r.kinds.slice(0, 6)));
  is("statusdot", "the retired pulse element", r.pulse, 0);
  yes("statusdot", "more than one glyph is on the page — or the set was never exercised", seenKinds.size > 1, [...seenKinds].join(", "));
});

test("§14 · the offsets table — reported at 1440×860 and 1280×800", async ({ page }) => {
  /**
   * ⚠️ REPORTED, NOT ASSERTED, AND DELIBERATELY SO. This is the brief's table of where things land
   * so a reader can see the page's rhythm at a glance; pinning each number would be a lock on a
   * spelling rather than on a claim, failing on every legitimate retune. The claims that matter are
   * asserted in the cases above, against the ref or against each other.
   */
  for (const [w, h] of [[1440, 860], [1280, 800]] as const) {
    for (const where of ["overview", "list"] as const) {
      if (where === "overview") await openOverview(page, w, h); else await openApp(page, w, h);
      const t = await page.evaluate(() => {
        const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
        const base = p.getBoundingClientRect();
        const off = (s: string) => { const e = p.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round((b.x - base.x) * 10) / 10, y: Math.round((b.y - base.y) * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
        return {
          page: { x: Math.round(base.x), w: Math.round(base.width) },
          title: off("[data-qcv='head-title']"), facts: off("[data-qcv='head-line']"), actions: off("[data-qcv='head-actions']"),
          back: off("[data-qcv='back-overview']"), stats: off("[data-qcv='ov-stats']"), card1: off("[data-qcv='ov-card']"),
          portal: off("[data-qcv='ov-portal']"), tile1: off("[data-qcv='ov-tile']"),
          sentence: off("[data-qcv='ctl']"), ledger: off("[data-qcv='ledger']"), row1: off("[data-qcv='row']"), open: off("[data-qcv='open']"),
        };
      });
      record({ area: "§14 offsets", what: `${where} @ ${w}×${h}`, got: t, want: "reported" });
    }
  }
  /* and the one number Nick asked for: where the first Ledger row sits now the strip has gone */
  await openApp(page, 1280, 800);
  const rowTop = await page.evaluate(() => Math.round(document.querySelector(".qcv-page [data-qcv='row']")!.getBoundingClientRect().top * 10) / 10);
  /* 702.5 with the compact strip · 394.7 the moment it went · 372.1 once the head's stray 8px and
     the control row's 15px of air for the retired view switch went with it */
  record({ area: "§14 offsets", what: "the first Ledger row's top at 1280×800 (702.5 with the strip → 394.7 without → 372.1 now)", got: rowTop, want: "reported" });
  yes("§14 offsets", `the first row is well above the fold at 1280×800 (${rowTop})`, rowTop < 500, String(rowTop));
});

test("Ω · the run measured enough to be believed", async () => {
  const n = existsSync(REPORT) ? (JSON.parse(readFileSync(REPORT, "utf8")).assertions as number) : 0;
  expect(n, `only ${n} assertions ran; the floor is ${MIN_ASSERTIONS}. A run that measured half of itself is a red.`).toBeGreaterThanOrEqual(MIN_ASSERTIONS);
});
