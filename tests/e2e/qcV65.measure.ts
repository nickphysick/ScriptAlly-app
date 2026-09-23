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

const OUT = resolve("test-results/qc-v65");
const REPORT = resolve(OUT, "report.json");
const REF = "file://" + resolve("design-refs/query-centre-v65.html");
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
  "fan", "fan-deck", "fan-card", "fan-title",
  "ctl", "sentence", "courts", "court",
  "stagegrid", "ledger", "open", "open-band", "open-foot", "open-action",
  "row", "row-chip", "row-stand", "row-sent", "row-date",
].map((n) => [n, APP(n)]));
const REF_SEL: Sel = {
  "head": ".head", "head-title": ".head h1", "head-line": ".head .facts", "head-cta": ".head .inkpill",
  "fan": "#fan", "fan-deck": "#fan .deck", "fan-card": "#fan .deck > *", "fan-title": "#fan .fh b",
  "ctl": ".ctl", "sentence": ".sentence",
  "stagegrid": ".stage", "ledger": ".ledger", "open": ".open", "open-band": ".open .bd", "open-foot": ".open .ft", "open-action": ".open .ft button",
  "row": "#list .row", "row-chip": "#list .row .chip", "row-stand": "#list .row .st", "row-sent": "#list .row .mat", "row-date": "#list .row .date",
  /* ⚠️ the courts are `.sum` in the ref, which `body.one` HIDES (v65 §4 rebuilt them) — so there is
     no ref probe for them and nothing compares them; the app's own case measures them directly */
  "courts": ".sum", "court": ".sum .sec",
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
 * ⚠️ THE REF IS ONE PAGE, AND `body.one` IS WHAT MAKES IT ONE. The mockup still carries v21's views,
 * portal, compact strip and back link in its DOM and hides them with `body.one … { display: none
 * !important }` (its line 1134), applied unconditionally on load. So there is no view to pick and
 * no tab to click — and a prep function that clicked one would resolve to a HIDDEN element and wait
 * out the whole test timeout, which is how seven minutes were lost to this ref's sibling.
 *
 * ⚠️ AND EVERY ROW, TILE AND BAR IN IT CARRIES `data-i`. A bare `[data-i]` still matches something
 * hidden; anything that needs a row scopes to the visible section first.
 */
const refPick = async (p: Page) => { await p.click(".one-l [data-i]"); await p.waitForTimeout(500); };
/**
 * The ref's own frame, read rather than assumed: the mode, the hidden furniture, and the two tracks
 * of `body.one .onegrid`. Separate from `readRef` because it answers about the REF's construction,
 * not about a box the app is compared against.
 */
async function readRefRaw(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(REF);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
  return page.evaluate(() => {
    const drawn = (sel: string) => [...document.querySelectorAll(sel)].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length;
    const grid = document.querySelector(".onegrid") as HTMLElement | null;
    /* ⚠️ THE RAIL IS MEASURED, NOT PARSED OUT OF THE TEMPLATE. `gridTemplateColumns` computes to
       used values with `minmax()` left in place in some states, so splitting it on whitespace gives
       three tokens for a two-track grid and `Number("316px")` is NaN either way. The rail's box is
       the claim; the declaration is only how it is spelled. */
    const rail = document.querySelector(".rail") as HTMLElement | null;
    const left = document.querySelector(".one-l") as HTMLElement | null;
    const d = document.body.dataset;
    return {
      one: document.body.classList.contains("one"),
      data: { stat: d.stat, rc: d.rc, rl: d.rl, xe: d.xe, xa: d.xa, xl: d.xl, ms: d.ms, dc: d.dc, ct: d.ct, ln: d.ln, pb: d.pb, sel: d.sel },
      hidden: { views: drawn(".views"), portal: drawn("#ovpage .vt3"), sum: drawn(".sum"), backov: drawn(".backov") },
      railTrack: rail ? Math.round(rail.getBoundingClientRect().width * 10) / 10 : null,
      leftCol: left ? Math.round(left.getBoundingClientRect().width * 10) / 10 : null,
      railTop: rail ? Math.round(rail.getBoundingClientRect().top * 10) / 10 : null,
      railBottom: rail ? Math.round((innerHeight - rail.getBoundingClientRect().bottom) * 10) / 10 : null,
      railRight: rail ? Math.round((innerWidth - rail.getBoundingClientRect().right) * 10) / 10 : null,
      railSticky: rail ? getComputedStyle(rail).position : null,
      gutter: grid ? parseFloat(getComputedStyle(grid).columnGap) : null,
      h1: parseFloat(getComputedStyle(document.querySelector(".head h1")!).fontSize),
    };
  });
}
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
/**
 * The row's template, read out of the sheet rather than restated here.
 *
 * ⚠️ IT IS ONE FLEXIBLE TRACK AND THREE FIXED SINCE v65 §5 — `minmax(166px, 1fr) 170px 78px 46px`.
 * Before, it was three `minmax(floor, ceiling)` tracks and one fixed, and the ceilings were what the
 * spare went into; the single `1fr` takes the spare itself now. A reader of this function carried
 * across from v21 gets `flex: []` and four "fixed" tracks, which is how track 0 came to be checked
 * against 170–170 and reported at 374.
 */
function listTemplate() {
  const css = readFileSync(resolve("src/components/queries/centre/qcvList.css"), "utf8");
  const tpl = /--qcv-tpl:\s*([^;]+);/.exec(css)?.[1] ?? "";
  /* a flexible track is `minmax(floor, 1fr)`: a floor and no ceiling but the row's own width */
  const flex = [...tpl.matchAll(/minmax\((\d+(?:\.\d+)?)px,\s*1fr\)/g)].map((m) => ({ floor: +m[1] }));
  const fixed = [...tpl.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
  const gap = +(/--qcv-tpl-gap:\s*(\d+(?:\.\d+)?)px/.exec(css)?.[1] ?? 0);
  const drop = +(/@container \(max-width: (\d+)px\)/.exec(css)?.[1] ?? 0);
  return { flex, fixed, gap, drop, boundary: drop + 1 };
}

/**
 * ⚠️ THERE IS ONE DOOR NOW (v65 §1) — `/queries`, and nothing else. The Overview is retired, so is
 * the card grid, and `?view=` is accepted and ignored; a case that opened a view by URL would be
 * asking for a state the page cannot be in. Where a case needs to prove the param is ignored it
 * passes `search` and asserts what it gets, rather than trusting the door to have honoured it.
 */
async function openApp(page: Page, w: number, h: number, search = "") {
  await openRoute(page, `/queries${search}`, { width: w, height: h });
  /* the page has landed when it says it is no longer busy */
  await expect.poll(() => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    return p ? p.getAttribute("aria-busy") : "absent";
  }), { timeout: 30_000, message: "the page root (.qcv-page) never rendered, or never stopped being busy" }).toBe("false");
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
/**
 * ⚠️ 246, NOT 268, SINCE v65 §2 — AND THE CHANGE IS WHICH INSETS ARE STILL OUTSIDE THE COLUMN. The
 * mockup's page is its window less a 224px nav and its own 22px insets on each side; both documents
 * now reserve the SAME 384px at the right for the fixed card, so that reservation cancels and only
 * the LEFT 22 is left to add. Measured: at 268 the ref's content came out 766 against the app's 744,
 * which is that 22 exactly.
 */
const refWindowFor = (column: number) => column + 246;

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

/**
 * ⚠️ THE ORACLE IS CHECKED BEFORE ANYTHING IS CHECKED AGAINST IT, and for v65 that starts with the
 * MODE. The mockup carries every earlier version's markup and selects v65 with one class and a
 * dozen data-attributes, set unconditionally on load (its line 3086): `one` plus `stat=k · rc=b ·
 * rl=4 · xe=next · xa=time · xl=6 · ms=b · dc=a · ct=b · ln=due · pb=side · sel=band`. Those are the
 * mockup's OPTIONS and this combination is the design. A run that read the ref before the script
 * had applied them would be reading a different page with the same name — which is the "plausible
 * numbers about the wrong subject" failure this file's header exists to prevent.
 */
test("the ref is in v65's mode, and its frame reads as its own sheet states", async ({ page }) => {
  const r = await readRefRaw(page, 1440, 860);
  is("ref", "body.one — the class that hides v21's views, portal, strip and back link", r.one, true);
  is("ref", "the mockup's chosen options", r.data, { stat: "k", rc: "b", rl: "4", xe: "next", xa: "time", xl: "6", ms: "b", dc: "a", ct: "b", ln: "due", pb: "side", sel: "band" });
  /* ⚠️ THE RETIRED FURNITURE IS IN THE DOM AND HIDDEN, so every probe below must be filtered by
     visibility. A selector that resolves is not a selector that is drawn. */
  is("ref", "…and the retired furniture is present but not drawn", r.hidden, { views: 0, portal: 0, sum: 0, backov: 0 });
  /**
   * ⚠️ AND THE RAIL IS THE WORKED EXAMPLE OF WHY NOTHING HERE IS READ FROM SOURCE. This mockup is
   * cumulative: twenty-eight version blocks (v4 → v64), each overriding the last, and the rail is
   * declared FOUR times. Its first declaration is a 316px sticky grid track (line 1163); its last
   * (line 1800, the v46 block) is `position: fixed; top: 16; bottom: 16; right: 22; width: 340`,
   * with the grid collapsed to one column and its gap to zero. Taking the first cost one run —
   * which is the cheap version of this mistake, and the reason every number below is MEASURED.
   */
  near("ref", "the rail's width", r.railTrack, 340, 1);
  is("ref", "the rail is placed, not tracked", r.railSticky, "fixed");
  /* ⚠️ THESE THREE ARE THE GO-AHEAD'S PLACEMENT, and in the ref they are against the VIEWPORT. In
     the app they are against the WINDOW CAPSULE's measured box — the house law that a constant
     offset from the viewport is a guess at everything above the element. Read here so phase 4
     compares the app with a number taken from the oracle rather than from prose. */
  near("ref", "the rail's top inset", r.railTop, 16, 0.5);
  near("ref", "the rail's bottom inset", r.railBottom, 16, 0.5);
  near("ref", "the rail's right inset", r.railRight, 22, 0.5);
  is("ref", "the grid is one column (the rail left it)", r.gutter, 0);
  /* the h1 is declared three times too; 50px is the last (v46, line 1806) */
  near("ref", "the head's h1", r.h1, 50, 1);
  record({ area: "ref", what: "the v65 frame at 1440×860", got: r, want: "reported" });
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

/**
 * ⚠️ PHASE 1'S OWN CLAIM: THE VIEWS ARE GONE, AND `?view=` IS ACCEPTED AND IGNORED. The unit lock
 * proves `readBirdsEyeOpen` and the absent exports; only the rendered page proves that no URL the
 * app has ever written lands anywhere but the ledger, and that the app does not EDIT the URL it was
 * given. The second half is the one a unit test cannot see: the old reflection wrote `?view=` back
 * with `replaceState` on every change, so a param left untouched is the evidence it is gone.
 */
/**
 * ⚠️ §2 · NOTHING IN THE BAR MAY OVERFLOW AT 1280, which is the whole reason the whisper goes and
 * the search takes the slack. The page reserves 384px for the card, so the bar above it has less
 * room than on any other route — and this is checked as INK AGAINST BOXES rather than as
 * `scrollWidth`, because a flex row does not fail by scrolling. It fails by squeezing one child to
 * nothing or pushing another past the edge, and `scrollWidth === clientWidth` reports "fine" for
 * both (the landing statement's `nowrap` taught this repo that lesson by 3.4px).
 */
test("§2 · the narrow bar — the whisper goes, the crumb holds, and nothing overflows at 1280", async ({ page }) => {
  for (const w of [1280, 1440] as const) {
    await openApp(page, w, 800);
    const bar = await page.evaluate(() => {
      const b = [...document.querySelectorAll(".ws-pagebar")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!b) return null;
      const box = b.getBoundingClientRect();
      /* ⚠️ `display: none` IS NOT "SQUEEZED TO NOTHING" — the whisper and its divider are REMOVED
         here by design, and counting them as casualties is the check misreading its own subject. A
         child that is laid out and has no width is the fault; one that is not laid out is a
         decision. `offsetParent === null` tells them apart without knowing which ones they are. */
      const kids = [...b.children].map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: (e.className || "").toString().split(" ")[0], w: Math.round(r.width), left: Math.round(r.left - box.left), right: Math.round(box.right - r.right),
          laidOut: (e as HTMLElement).offsetParent !== null || getComputedStyle(e).position === "fixed", shown: r.width > 0 };
      });
      const px = (n: number) => Math.round(n * 10) / 10;
      return {
        w: px(box.width),
        sync: [...b.querySelectorAll(".ws-sync")].filter((e) => e.getBoundingClientRect().width > 0).length,
        crumb: px(b.querySelector(".ws-crumb")?.getBoundingClientRect().width ?? 0),
        search: px(b.querySelector(".sp-search")?.getBoundingClientRect().width ?? 0),
        /* ink outside the bar's own box, in either direction */
        out: kids.filter((k) => k.shown && (k.left < -0.5 || k.right < -0.5)).map((k) => k.cls),
        squeezed: kids.filter((k) => k.laidOut && !k.shown).map((k) => k.cls),
        removed: kids.filter((k) => !k.laidOut).map((k) => k.cls),
        kids,
      };
    });
    const area = `bar@${w}`;
    yes(area, "the bar is on the page", !!bar, JSON.stringify(bar));
    is(area, "the save whisper is drawn", bar?.sync, 0);
    is(area, "…and it is REMOVED rather than squeezed — with its divider and nothing else", bar?.removed, ["ws-vdiv", "ws-sync"]);
    yes(area, `nothing runs past the bar's edges (${JSON.stringify(bar?.out)})`, (bar?.out.length ?? 1) === 0, JSON.stringify(bar?.out));
    yes(area, `nothing is squeezed to nothing (${JSON.stringify(bar?.squeezed)})`, (bar?.squeezed.length ?? 1) === 0, JSON.stringify(bar?.squeezed));
    /**
     * ⚠️ THE SLACK IS REPORTED, AND THE CLAIM IS THAT NOTHING OVERFLOWS — which is what §2 asks
     * for. It is NOT that the search narrows: measured with the whisper gone, the bar has 140px of
     * free space at 1280, so there is no slack for it to take and it sits at 210 at both widths.
     * Asserting that it narrows would be asserting a consequence of a fault the whisper's removal
     * already prevents — a check that can only pass on a bar that is too full.
     */
    const free = (bar?.w ?? 0) - (bar?.kids.filter((k) => k.shown).reduce((n, k) => n + k.w, 0) ?? 0);
    record({ area, what: "the bar's children, and the free space between them", got: { kids: bar?.kids, free: Math.round(free) }, want: "reported" });
    yes(area, `the bar has room to spare (${Math.round(free)}px) rather than being squeezed to fit`, free > 0, String(Math.round(free)));
    seen("bar-widths", `${w}: crumb ${bar?.crumb} · search ${bar?.search} · free ${Math.round(free)}`);
  }
  /* ⚠️ AND THE CRUMB DOES NOT SHRINK, which IS a claim and is checkable: it is the one thing in the
     bar that must read the same at every width. */
  const t = load().tally["bar-widths"] ?? {};
  const rd = (w: number) => Object.keys(t).find((k) => k.startsWith(`${w}:`)) ?? "";
  const num = (s: string, label: string) => +(new RegExp(`${label} ([\\d.]+)`).exec(s)?.[1] ?? -1);
  const [a, b] = [rd(1280), rd(1440)];
  is("bar", "the crumb is the same width at 1280 and 1440 — it does not shrink", num(a, "crumb"), num(b, "crumb"));
  record({ area: "bar", what: "crumb · search · free, at 1280 and 1440", got: { "1280": a, "1440": b }, want: "reported" });
});

test("§1 · the views are retired — every ?view= lands on the same ledger, and the URL is left alone", async ({ page }) => {
  const read = async () => page.evaluate(() => {
    const pg = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0);
    if (!pg) return null;
    const drawn = (sel: string) => [...pg.querySelectorAll(sel)].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length;
    const first = pg.querySelector("[data-qcv='row']");
    return {
      search: location.search,
      rows: drawn("[data-qcv='row']"),
      first: first ? (first.textContent ?? "").trim().slice(0, 40) : null,
      ledger: drawn("[data-qcv='ledger']"),
      /* the four retired doors */
      portal: drawn("[data-qcv='ov-portal'], [data-qcv='ov-tile']"),
      stats: drawn("[data-qcv='ov-stats'], [data-qcv='ov-card']"),
      back: drawn("[data-qcv='back-overview']"),
      views: drawn("[data-qcv='views']"),
      tiles: drawn(".qcv-tiles, .qcv-tile"),
      cal: drawn(".qcv-cal-box"),
    };
  });

  await openApp(page, 1440, 860);
  const plain = await read();
  yes("§1 retirement", "the page rendered", !!plain);
  is("§1 retirement", "the ledger is drawn with no view asked for", plain?.ledger, 1);
  yes("§1 retirement", `the ledger has rows (${plain?.rows}) — or every comparison below is vacuous`, (plain?.rows ?? 0) > 3, String(plain?.rows));
  for (const [what, got] of [["the Overview's portal", plain?.portal], ["the Overview's stat row", plain?.stats], ["the back link", plain?.back], ["the view switch", plain?.views], ["the card grid's tiles", plain?.tiles]] as const) {
    is("§1 retirement", `${what} is not drawn`, got, 0);
  }

  /**
   * ⚠️ EVERY VALUE THE APP HAS EVER WRITTEN, plus the two it never did. `grid` and `list` are in
   * bookmarks and in 11 measurement files; `board` was retired in v11 and its links were left
   * pointing at it; `overview` was v21's landing. All four are accepted and all four land here.
   */
  for (const v of ["list", "grid", "board", "overview", "calendar"]) {
    await openApp(page, 1440, 860, `?view=${v}`);
    const got = await read();
    is("§1 retirement", `?view=${v} — the search string the app left behind`, got?.search, `?view=${v}`);
    is("§1 retirement", `?view=${v} — the same ledger`, got?.ledger, 1);
    is("§1 retirement", `?view=${v} — the same rows`, got?.rows, plain?.rows);
    is("§1 retirement", `?view=${v} — the same first row`, got?.first, plain?.first);
    is("§1 retirement", `?view=${v} — no portal`, got?.portal, 0);
    /* ⚠️ `calendar` IS THE ONE VALUE THAT STILL MEANS SOMETHING, and Birds-eye is not built yet
       (phase 3). It lands on the ledger like the rest until it is — reported, not asserted, so the
       day it opens expanded this case says so rather than going quietly green. */
    if (v === "calendar") record({ area: "§1 retirement", what: "?view=calendar — Birds-eye boxes drawn (0 until phase 3)", got: got?.cal, want: "reported" });
  }
});

test("head and control row — 1440×860", async ({ page }) => {
  const ref = await readRef(page, 1440, 860);
  await openApp(page, 1440, 860);
  const app = await readApp(page);
  sameSize("head", app, ref, "head-cta", ["w", "h"]);
  sameSize("head", app, ref, "head-title", ["h"]);
  /**
   * ⚠️ THE HEAD'S BOX IS NOT COMPARED, AND THE REASON IS A PARTITION RATHER THAN A DISAGREEMENT.
   * The ref's hero pays its own `18px` of top padding inside a page that pays none; this page pays
   * `11px` at the PAGE so the title sits 25px under the bar's controls, exactly as the dashboard's
   * greeting does — a cross-page rhythm this app keeps and the mockup has no opinion about. Same
   * ink in the same place, two boxes drawn round it, and `head.h` differs by that padding alone.
   *
   * So what is compared is the ARRANGEMENT, which is the design's actual claim: where the facts
   * line sits under the title, where the pills sit under it, and the title's own size. A box
   * comparison here would fail for ever on a difference nobody could act on without giving up the
   * rhythm — the "assert the claim, not the spelling" rule, in its most literal form.
   */
  sameOffset("head", app, ref, "head-line", "head-title", ["y"]);
  sameOffset("head", app, ref, "head-cta", "head-line", ["y"]);
  sameSize("control", app, ref, "ctl", ["h"]);
  record({ area: "head", what: "the head's box, app vs ref (they differ by the ref's own 18/6 of padding, which this page pays at the PAGE)", got: { app: app.boxes.head?.h, ref: ref.boxes.head?.h }, want: "reported" });
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
      views: vis("[data-qcv='views']"), strip: vis("[data-qcv='sum']"), back: vis("[data-qcv='back-overview']"), tilesOv: vis("[data-qcv='ov-tile']"),
      windowBg: getComputedStyle(document.querySelector(".ws-window")!).backgroundColor, title: getComputedStyle(p.querySelector("[data-qcv='head-title']")!).fontFamily, sentence: getComputedStyle(p.querySelector("[data-qcv='pk-filter']")!).fontFamily, cta: getComputedStyle(p.querySelector("[data-qcv='head-cta'] span")!).fontFamily };
  });
  is("control", "the old masthead, its chrome slab and its collapsed bar", gone.masthead, 0);
  is("control", "the five tiles", gone.tiles, 0);
  is("control", "the Filter / Group / Sort toolbar", gone.toolbar, 0);
  /* ⚠️ ASSERTED ABSENT, NOT RESTYLED. The switch and the compact strip went in v21; the Overview,
     its portal and the back link go in v65 §1 — there is one page, so there is nowhere to switch
     to, nothing to summarise above the ledger and nowhere for a back link to lead. Every one of
     these is a second door or a second summary, which is what each removal exists to prevent. */
  is("control", "the retired view switch", gone.views, 0);
  is("control", "the retired compact strip", gone.strip, 0);
  is("control", "the retired back link", gone.back, 0);
  is("control", "the retired Overview portal's tiles", gone.tilesOv, 0);
  is("control", "the window sheet behind the page", gone.windowBg, "rgba(0, 0, 0, 0)");
  for (const [k, f] of [["title", gone.title], ["sentence", gone.sentence], ["log button", gone.cta]] as const) yes("head", `${k} is drawn in the typewriter face, not brand.tsx's`, /Special Elite/.test(f), f);
  await page.screenshot({ path: resolve(OUT, "list-1440.png") });
});

/**
 * ⚠️ §2 · LOCK 1 — THE CARD IS PLACED FROM THE WINDOW'S BOX, AND THAT IS THE WHOLE CLAIM. The ref
 * writes `top: 16; bottom: 16; right: 22` against the viewport because in a drawn page the viewport
 * IS the window. Here the shell's window sits under a bar and a strip, so the assertion compares
 * the card's rect with the WINDOW's measured rect — never with `innerHeight`, which is the guess
 * this app has now paid for four times.
 *
 * ⚠️ AND IT IS READ BEFORE AND AFTER THE DATA LANDS. The loading cover `display: none`s the page's
 * content, so a card measured during it reads a window that is a different height — the sentinel in
 * `railBox` exists for exactly that, and only a before-and-after reading proves the sentinel works.
 */
test("§2 · the rail — placed from the window's box, at two heights, before and after the data", async ({ page }) => {
  const read = () => page.evaluate(() => {
    const rail = [...document.querySelectorAll("[data-qcv='rail']")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const win = document.querySelector(".ws-window") as HTMLElement | null;
    if (!rail || !win) return null;
    const r = rail.getBoundingClientRect(), w = win.getBoundingClientRect();
    const px = (n: number) => Math.round(n * 10) / 10;
    return {
      pos: getComputedStyle(rail).position,
      width: px(r.width),
      top: px(r.top - w.top),
      bottom: px(w.bottom - r.bottom),
      right: px(w.right - r.right),
      innerH: window.innerHeight,
      winH: px(w.height),
      showing: rail.getAttribute("data-showing"),
      /* what the card published, and what the page is actually paying */
      pad: px(parseFloat(getComputedStyle(document.querySelector(".qcv-page") as HTMLElement).paddingRight)),
    };
  });

  for (const [w, h] of [[1440, 860], [1440, 800], [1440, 700]] as const) {
    const area = `rail@${w}×${h}`;
    /* ⚠️ MEASURED WHILE THE COVER IS STILL UP — `openApp` waits it out, so this goes in cold and
       polls for the card rather than for the page's own "not busy". */
    await openRoute(page, "/queries", { width: w, height: h });
    const early = await page.evaluate(() => {
      const rail = document.querySelector("[data-qcv='rail']") as HTMLElement | null;
      const win = document.querySelector(".ws-window") as HTMLElement | null;
      if (!rail || !win) return null;
      const r = rail.getBoundingClientRect(), w2 = win.getBoundingClientRect();
      return { top: Math.round((r.top - w2.top) * 10) / 10, h: Math.round(r.height), pos: getComputedStyle(rail).position };
    });
    record({ area, what: "during the load (the cover is up)", got: early, want: "reported" });
    if (early && early.pos === "fixed") near(area, "…and it is already on the window's own top + 16", early.top, 16, 1);

    await openApp(page, w, h);
    const r = await read();
    yes(area, "the card is on the page", !!r, JSON.stringify(r));
    is(area, "it is placed, not tracked", r?.pos, "fixed");
    near(area, "width", r?.width, 340, 0.5);
    near(area, "top — the WINDOW's top + 16", r?.top, 16, 0.5);
    near(area, "bottom — the WINDOW's bottom − 16", r?.bottom, 16, 0.5);
    near(area, "right — the WINDOW's right − 22", r?.right, 22, 0.5);
    /* ⚠️ THE PRECONDITION THAT MAKES THE THREE ABOVE MEAN ANYTHING: the window is NOT the viewport.
       Where they happen to agree, a card placed off `innerHeight` would measure identically and
       this case would pass on the fault it exists to catch. */
    yes(area, `the window is shorter than the viewport (${r?.winH} vs ${r?.innerH}) — or these three are satisfied by the guess`, (r?.innerH ?? 0) - (r?.winH ?? 0) > 20, `${r?.innerH} − ${r?.winH}`);
    is(area, "nothing is chosen, so it shows the Birds-eye view", r?.showing, "birdseye");
    near(area, "…and the page is paying exactly the reservation the card published", r?.pad, 384, 0.5);

    /**
     * ⚠️ REPORTED, NOT ASSERTED — §2's "the top bar spans the page column only and starts level
     * with the card's top" is a claim about the SHELL's bar, and the go-ahead scoped this pass's
     * shell change to exactly two things (the whisper and the search). Whether the bar should also
     * stop at the card's left edge is Nick's, so the numbers are put on the record rather than
     * acted on: a silent yes and a silent no are equally unhelpful.
     */
    const bar = await page.evaluate(() => {
      const b = [...document.querySelectorAll(".ws-pagebar")].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect();
      const rail = [...document.querySelectorAll("[data-qcv='rail']")].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect();
      const win = document.querySelector(".ws-window")?.getBoundingClientRect();
      const px = (n: number | undefined) => (n == null ? null : Math.round(n * 10) / 10);
      return b && rail && win ? { barRight: px(b.right), barBottom: px(b.bottom), cardLeft: px(rail.left), cardTop: px(rail.top), winTop: px(win.top), overlap: px(b.right - rail.left) } : null;
    });
    record({ area, what: "§2 · the bar against the card (reported: does the bar stop at the card's left edge, and do their tops agree?)", got: bar, want: "reported" });
  }
});

/**
 * ⚠️ §4 · THE THREE COURTS COUNT WHAT THEIR FAN DEALS, AND THE PAGE IS WHERE THAT IS WORTH CHECKING.
 * The unit lock proves the two derivations agree over a fixture; only the rendered page proves the
 * tile a reader presses deals the hand its own number states.
 */
/**
 * ⚠️ §6 · THE BIRDS-EYE VIEW — AND THE CLAIM THAT ONLY A RENDER CAN MAKE IS THE LINE. The library
 * places every bar so its own expected date lands on 50% of the track; whether the LINE is drawn at
 * that same 50%, in the same box, is a fact about two stylesheets' arithmetic agreeing — and this
 * repo has measured a line drawn from padding arithmetic sitting a few pixels off the thing it was
 * supposed to mark. So the line's x is compared with each bar's own end, in pixels.
 */
test("§6 · Birds-eye — the line is where the dates are, the rows scroll, and the card does not grow", async ({ page }) => {
  await openApp(page, 1440, 860);
  const be = await page.evaluate(() => {
    const rail = [...document.querySelectorAll("[data-qcv='rail']")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!rail) return null;
    const rb = rail.getBoundingClientRect();
    const px = (n: number) => Math.round(n * 10) / 10;
    const groups = [...rail.querySelectorAll("[data-qcv='be-group']")].map((g) => ({
      key: g.getAttribute("data-group"),
      heading: (g.querySelector("[data-qcv='be-heading']")?.textContent ?? "").trim(),
      rows: g.querySelectorAll("[data-qcv='be-row']").length,
    }));
    const lines = [...rail.querySelectorAll("[data-qcv='be-line']")].map((l) => {
      const b = l.getBoundingClientRect();
      const rows = l.parentElement!.getBoundingClientRect();
      return { x: px(b.left), top: px(b.top - rows.top), h: px(b.height), rowsH: px(rows.height) };
    });
    /* every bar's own right edge, and the line it is measured against */
    const bars = [...rail.querySelectorAll("[data-qcv='be-row']")].map((r) => {
      const bar = r.querySelector("[data-qcv='be-bar']") as HTMLElement | null;
      const track = r.querySelector("[data-qcv='be-track']") as HTMLElement | null;
      const over = r.querySelector("[data-qcv='be-over']") as HTMLElement | null;
      if (!bar || !track) return null;
      const bb = bar.getBoundingClientRect(), tb = track.getBoundingClientRect();
      return { mid: px(tb.left + tb.width / 2), end: px(bb.right), start: px(bb.left), over: over ? px(over.getBoundingClientRect().left) : null,
        day: (r.querySelector("[data-qcv='be-day']")?.textContent ?? "").trim(), court: r.getAttribute("data-court") };
    }).filter(Boolean) as { mid: number; end: number; start: number; over: number | null; day: string; court: string | null }[];
    const scroller = rail.querySelector("[data-qcv='be-scroll']") as HTMLElement;
    return {
      railH: px(rb.height),
      groups, lines, bars,
      /* the rows are the only thing that scrolls */
      scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
      railScrolls: rail.scrollHeight > rail.clientHeight + 1,
      head: px((rail.querySelector("[data-qcv='be-head']") as HTMLElement).getBoundingClientRect().height),
      focus: [...rail.querySelectorAll("[data-qcv='be-focus'] button")].map((b) => ({ l: b.textContent, on: b.getAttribute("aria-pressed") })),
      /* §6.2's own requirement: no name or status line may ellipsis at 340 */
      clipped: [...rail.querySelectorAll(".qcv-be-nm, .qcv-be-st")].filter((e) => e.scrollWidth > e.clientWidth + 0.5).map((e) => (e.textContent ?? "").trim()),
    };
  });
  yes("birdseye", "the view is drawn", !!be, JSON.stringify(be?.groups));
  yes("birdseye", `it drew rows (${be?.bars.length})`, (be?.bars.length ?? 0) > 3, String(be?.bars.length));
  is("birdseye", "the focus toggle's three states, Everything pressed", be?.focus, [{ l: "Everything", on: "true" }, { l: "With you", on: "false" }, { l: "With the agent", on: "false" }]);
  record({ area: "birdseye", what: "the groups, and the rail's height", got: { groups: be?.groups, railH: be?.railH, head: be?.head }, want: "reported" });

  /* ⚠️ THE LINE IS PER GROUP AND AS TALL AS ITS OWN ROWS — never the scroll box's height. */
  yes("birdseye", `a line per group (${be?.lines.length} for ${be?.groups.length})`, be?.lines.length === be?.groups.length, JSON.stringify(be?.lines));
  for (const l of be?.lines ?? []) {
    near("birdseye", "the line starts at its rows' top", l.top, 0, 0.5);
    near("birdseye", "…and is exactly as tall as them", l.h, l.rowsH, 0.5);
  }

  /**
   * ⚠️ THE CLAIM: a bar's end is LEFT of the track's middle when there is time left, ON it when the
   * date is today, and the overrun starts AT it when the date has gone. Measured against the track's
   * own middle rather than against a number, so the two cannot drift apart.
   */
  const withTime = (be?.bars ?? []).filter((b) => /^\d+d$/.test(b.day));
  const past = (be?.bars ?? []).filter((b) => /ago$/.test(b.day));
  const undated = (be?.bars ?? []).filter((b) => b.day === "—");
  record({ area: "birdseye", what: "the bars, by what their day count says", got: { withTime: withTime.length, past: past.length, undated: undated.length }, want: "reported" });
  yes("birdseye", `some bars have time left (${withTime.length}) — or the claim below is vacuous`, withTime.length > 0, String(withTime.length));
  for (const b of withTime) yes("birdseye", `a bar with time left ends short of the line (${b.end} vs ${b.mid})`, b.end <= b.mid + 0.6, JSON.stringify(b));
  yes("birdseye", `some bars are past their date (${past.length}) — or the overrun is vacuous`, past.length > 0, String(past.length));
  for (const b of past) {
    yes("birdseye", `a bar past its date crosses the line (${b.end} vs ${b.mid})`, b.end >= b.mid - 0.6, JSON.stringify(b));
    /**
     * ⚠️ AT THE LINE, OR AT THE BAR'S OWN LEFT WHERE THE BAR BEGINS PAST IT. A query that entered
     * its current stage AFTER its date had gone has no stretch running from the line — the whole
     * bar is past it, so the whole bar is ink. Asserting a flat 50% reported 37px of disagreement
     * about a correct bar, which is a measurement being wrong about the page.
     */
    if (b.over != null) near("birdseye", "…and its overrun starts at the line, or at the bar where the bar begins past it", b.over, Math.max(b.mid, b.start), 1);
  }
  const wholly = past.filter((b) => b.start > b.mid + 0.6);
  record({ area: "birdseye", what: "bars that begin past the line (the whole bar is ink)", got: wholly.length, want: "reported" });
  for (const b of undated) near("birdseye", "an undated bar ends on the line — it is anchored on today", b.end, b.mid, 1);

  is("birdseye", "⚠️ the ROWS scroll", be?.scrolls, true);
  is("birdseye", "⚠️ …and the card itself does not", be?.railScrolls, false);
  is("birdseye", "§6.2 · names and status lines that clip at 340px", be?.clipped, []);
  await page.screenshot({ path: resolve(OUT, "birdseye-1440.png") });

  /* the focus fades the other court and changes no count */
  const before = await page.evaluate(() => document.querySelectorAll("[data-qcv='be-row']").length);
  await page.locator("[data-qcv='be-focus'] button[data-f='you']").first().click();
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("[data-qcv='be-row']")] as HTMLElement[];
    return { n: rows.length, faded: rows.filter((r) => Number(getComputedStyle(r).opacity) < 0.9).length, courts: [...new Set(rows.filter((r) => Number(getComputedStyle(r).opacity) < 0.9).map((r) => r.getAttribute("data-court")))] };
  });
  is("birdseye", "⚠️ choosing a court removes no rows", after.n, before);
  yes("birdseye", `…it fades the other court (${after.faded} of ${after.n})`, after.faded > 0 && after.faded < after.n, JSON.stringify(after));
  is("birdseye", "…and only the other court", after.courts, ["agent"]);
});

/**
 * ⚠️ §7 · THE EXPANDED CARD — AND THE CLAIM ONLY A RENDER CAN MAKE IS THAT IT IS THE SAME CARD. Its
 * top, bottom and right must be the rail's OWN, to the pixel, or the growth reads as a new card
 * appearing where the old one was. The unit lock proves the arithmetic; this proves the two boxes.
 */
test("§7 · the expanded view — the rail's own box grown leftwards, and the ✕ on top of everything", async ({ page }) => {
  await openApp(page, 1440, 860);
  const railBefore = await page.evaluate(() => {
    const r = [...document.querySelectorAll("[data-qcv='rail']")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
    const w = document.querySelector(".ws-window")!.getBoundingClientRect();
    const px = (n: number) => Math.round(n * 10) / 10;
    return { top: px(r.top), bottom: px(r.bottom), right: px(r.right), left: px(r.left), winLeft: px(w.left), winRight: px(w.right) };
  });
  await page.locator("[data-qcv='be-expand']").first().click();
  /* ⚠️ PAST THE 380ms REVEAL BEFORE MEASURING — an element mid-animation reports its ANIMATED box,
     which is this repo's own trap: 674 on one run and 680 on the next, from a scaled entrance. */
  await page.waitForTimeout(700);
  const xp = await page.evaluate(() => {
    const c = document.querySelector("[data-qcv='xp-card']") as HTMLElement | null;
    const w = document.querySelector(".ws-window")!.getBoundingClientRect();
    if (!c) return null;
    const b = c.getBoundingClientRect();
    const px = (n: number) => Math.round(n * 10) / 10;
    const col = c.querySelector("[data-qcv='xp-col']")!.getBoundingClientRect();
    const ttl = c.querySelector("[data-qcv='xp-title']")!.getBoundingClientRect();
    const x = c.querySelector("[data-qcv='xp-close']")!.getBoundingClientRect();
    /* ⚠️ THE ✕ MUST BE THE TOPMOST THING AT ITS OWN CENTRE — a stacking claim `getComputedStyle`
       cannot make. Its rect is on screen by construction (it is inside the card we just measured). */
    const atX = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
    return {
      top: px(b.top), bottom: px(b.bottom), right: px(b.right), left: px(b.left), width: px(b.width),
      winLeft: px(w.left), winRight: px(w.right),
      clip: getComputedStyle(c).clipPath,
      col: px(col.width), colMid: px(col.top + col.height / 2), ttlMid: px(ttl.top + ttl.height / 2),
      onTop: atX ? (atX.closest("[data-qcv='xp-close']") ? "close" : (atX.getAttribute("data-qcv") ?? atX.tagName)) : "nothing",
      stats: [...c.querySelectorAll("[data-qcv='xp-stat']")].map((e) => ({ g: e.getAttribute("data-group"), n: (e.querySelector(".qcv-xp-n")?.textContent ?? "").trim(), w: Math.round(e.getBoundingClientRect().width) })),
      backdrop: getComputedStyle(document.querySelector("[data-qcv='xp-back']")!).backgroundColor,
    };
  });
  yes("expanded", "the card opened", !!xp, JSON.stringify(xp));
  record({ area: "expanded", what: "the card, the rail it grew from, and the window", got: { xp, railBefore }, want: "reported" });

  /* ⚠️ THE THREE IT KEEPS — this is what says "the same card" */
  near("expanded", "top — the rail's own", xp?.top, railBefore.top, 0.6);
  near("expanded", "bottom — the rail's own", xp?.bottom, railBefore.bottom, 0.6);
  near("expanded", "right — the rail's own", xp?.right, railBefore.right, 0.6);
  /* …and the one it takes: the window's left plus the same 22px gutter the right pays */
  near("expanded", "left — the WINDOW's left + 22", xp ? xp.left - xp.winLeft : null, 22, 0.6);
  near("expanded", "…and the right gutter is the same 22", xp ? xp.winRight - xp.right : null, 22, 0.6);
  /* the precondition that makes those mean something: it really did grow */
  yes("expanded", `it is wider than the rail (${xp?.width} vs 340)`, (xp?.width ?? 0) > 400, String(xp?.width));
  is("expanded", "the reveal has finished — the card is fully uncovered", xp?.clip, "inset(0px round 20px)");

  is("expanded", "⚠️ the ✕ is the topmost thing at its own centre", xp?.onTop, "close");
  near("expanded", "§8.2 · the title's midpoint IS the Courier column's", xp?.ttlMid, xp?.colMid, 1);
  near("expanded", "§8.1 · the column is the names column's width", xp?.col, 260, 0.6);
  is("expanded", "§8.2 · three stat cards", xp?.stats.length, 3);
  is("expanded", "…in the groups' order", xp?.stats.map((s) => s.g), ["overdue", "upcoming", "watch"]);
  is("expanded", "the page behind dims", xp?.backdrop, "rgba(28, 19, 15, 0.22)");
  await page.screenshot({ path: resolve(OUT, "expanded-1440.png") });

  /**
   * ⚠️ THE PAGE BEHIND DOES NOT SCROLL — AND THE INSTRUMENT MATTERS. Setting `scrollTop` by hand
   * moves an `overflow: hidden` element perfectly happily: the CSS lock stops a READER, not a
   * script, so a probe that assigns `scrollTop` is asking the wrong question and reports a correct
   * lock as broken. The claims are that the lock is ON both scrollers, and that a WHEEL over the
   * backdrop moves neither.
   */
  const locked = await page.evaluate(() => {
    const port = document.querySelector(".qcv-page")?.closest(".wpg-scroll") as HTMLElement | null;
    const stage = document.getElementById("app-stage-scroll");
    return { port: port ? getComputedStyle(port).overflow : "absent", stage: stage ? getComputedStyle(stage).overflow : "absent", at: port?.scrollTop ?? -1 };
  });
  is("expanded", "the page's own scroller is locked", locked.port, "hidden");
  is("expanded", "…and the shell's stage with it", locked.stage, "hidden");
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  const after200 = await page.evaluate(() => (document.querySelector(".qcv-page")?.closest(".wpg-scroll") as HTMLElement | null)?.scrollTop ?? -1);
  is("expanded", "…so a wheel over the backdrop moves nothing", after200, locked.at);

  /* Escape closes it, and the rail is as it was */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const c = document.querySelectorAll("[data-qcv='xp-card']").length;
    const r = [...document.querySelectorAll("[data-qcv='rail']")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
    const px = (n: number) => Math.round(n * 10) / 10;
    return { cards: c, top: px(r.top), right: px(r.right), width: px(r.width), showing: document.querySelector("[data-qcv='rail']")?.getAttribute("data-showing") };
  });
  is("expanded", "Escape closes it", after.cards, 0);
  is("expanded", "…and the rail is exactly as it was", [after.top, after.right, after.width], [railBefore.top, railBefore.right, 340]);
  is("expanded", "…still showing the Birds-eye view", after.showing, "birdseye");
  /* ⚠️ AND ESCAPE DID NOT ALSO CLOSE A QUERY — one key, one act. Nothing was open, so the test is
     that the URL is untouched; the case that a query survives the calendar is §8.11's, in phase 5. */
  is("expanded", "…and it wrote nothing to the URL", await page.evaluate(() => location.search.includes("q=")), false);

  /* a rail ROW opens it too, and does NOT open the query in the rail */
  await page.locator("[data-qcv='be-row']").first().click();
  await page.waitForTimeout(700);
  const fromRow = await page.evaluate(() => ({
    card: document.querySelectorAll("[data-qcv='xp-card']").length,
    showing: document.querySelector("[data-qcv='rail']")?.getAttribute("data-showing"),
    url: location.search,
  }));
  is("expanded", "a rail row opens the expanded view", fromRow.card, 1);
  is("expanded", "⚠️ …and does NOT open the query in the rail", fromRow.showing, "birdseye");
  is("expanded", "…nor write ?q=", fromRow.url.includes("q="), false);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
});

/**
 * ⚠️ §1 · `?view=calendar` IS THE ONE MEANING THE PARAM KEPT, and phase 1 parked the reading for
 * exactly this. Now that there is something to open, it opens it — which is the half of §1 that
 * could not be measured until today.
 */
test("§1 · ?view=calendar opens the Birds-eye view expanded, and `cal` is its alias", async ({ page }) => {
  for (const v of ["calendar", "cal"]) {
    await openApp(page, 1440, 860, `?view=${v}`);
    await page.waitForTimeout(700);
    const open = await page.evaluate(() => ({ card: document.querySelectorAll("[data-qcv='xp-card']").length, url: location.search }));
    is("§1 retirement", `?view=${v} opens it expanded`, open.card, 1);
    is("§1 retirement", `?view=${v} — and the app still leaves the URL alone`, open.url, `?view=${v}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  /* …and every other value still lands on the ledger with nothing expanded */
  for (const v of ["list", "grid", "board"]) {
    await openApp(page, 1440, 860, `?view=${v}`);
    is("§1 retirement", `?view=${v} opens nothing`, await page.evaluate(() => document.querySelectorAll("[data-qcv='xp-card']").length), 0);
  }
});

test("§4 · the courts — three tiles, framed, and a tile deals exactly what it counts", async ({ page }) => {
  await openApp(page, 1440, 860);
  const tiles = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...p.querySelectorAll("[data-qcv='court']")].map((t) => {
      const b = t.getBoundingClientRect();
      const band = t.querySelector("[data-qcv='court-band']") as HTMLElement;
      return {
        court: t.getAttribute("data-court"),
        count: Number(t.querySelector("[data-qcv='court-count']")?.textContent),
        fact: (t.querySelector("[data-qcv='court-fact']")?.textContent ?? "").trim(),
        w: Math.round(b.width), h: Math.round(b.height),
        band: getComputedStyle(band).backgroundColor,
        /* the framed treatment: a rim and a line drawn as two inset shadows, not a border */
        shadow: getComputedStyle(t).boxShadow.includes("inset"),
        border: getComputedStyle(t).borderTopWidth,
      };
    });
  });
  is("courts", "three tiles", tiles.length, 3);
  is("courts", "in the page's order", tiles.map((t) => t.court), ["you", "agent", "closed"]);
  yes("courts", "they are the same width", new Set(tiles.map((t) => t.w)).size === 1, JSON.stringify(tiles.map((t) => t.w)));
  is("courts", "the three bands are three different colours", new Set(tiles.map((t) => t.band)).size, 3);
  for (const t of tiles) {
    yes("courts", `${t.court} keeps the FRAMED treatment (the page's one exception)`, t.shadow, String(t.shadow));
    is("courts", `${t.court} draws no border`, t.border, "0px");
    /* ⚠️ NO APPRAISAL WORDS ANYWHERE ON THIS PAGE — "overdue" belongs to the Birds-eye view alone */
    yes("courts", `${t.court}'s fact line states a fact ("${t.fact}")`, !/overdue|late|behind|too long/i.test(t.fact), t.fact);
  }
  record({ area: "courts", what: "the three tiles", got: tiles, want: "reported" });

  /* ⚠️ THE COUNTS AND THE LEDGER ARE TWO DERIVATIONS OF ONE SET, compared against EACH OTHER. A
     literal on both sides would agree with itself for ever; the ledger's own "All N queries" is the
     page's other statement of the same total, and withdrawn queries are in neither tile. */
  const said = await page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelector("[data-qcv='pk-filter']")!.textContent ?? "");
  const all = Number(/(\d+)/.exec(said)?.[1] ?? -1);
  const sum = tiles.reduce((n, t) => n + t.count, 0);
  yes("courts", `the sentence states a total (${all})`, all > 0, said);
  record({ area: "courts", what: "the three counts against the sentence's total", got: { sum, all, withdrawn: all - sum }, want: "reported" });
  yes("courts", `the three courts account for every query but the withdrawn ones (${sum} of ${all})`, sum <= all && all - sum >= 0, `${sum} vs ${all}`);

  /* the fan: pressed from a tile, it deals that tile's own number */
  const hot = tiles.find((t) => t.count > 0)!;
  await page.locator(`.qcv-page [data-qcv='court'][data-court='${hot.court}']`).first().click();
  await page.waitForTimeout(500);
  const fan = await page.evaluate(() => {
    const f = document.querySelector("[data-qcv='fan']");
    if (!f) return null;
    return { title: (f.querySelector("[data-qcv='fan-title']")?.textContent ?? "").trim(), cards: f.querySelectorAll("[data-qcv='fan-card']").length };
  });
  yes("courts", "a tile deals a fan", !!fan, JSON.stringify(fan));
  yes("courts", `the fan's header states the tile's own count (${hot.count}) — "${fan?.title}"`, (fan?.title ?? "").startsWith(String(hot.count)), fan?.title ?? "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
});

/**
 * ⚠️ §5 · THE ROWS ARE THE CARDS, AND THE LEDGER KEEPS THE WHOLE COLUMN. This is the change that
 * cost the ledger 396px in v11 and gives it back: the open query lives in the rail, so choosing one
 * must not narrow the list. Measured as a BEFORE AND AFTER, because "it is wide" is satisfied by a
 * page where nothing is selected.
 */
test("§5 · the ledger — cards 10px apart, and choosing one does not narrow the list", async ({ page }) => {
  await openApp(page, 1440, 860);
  const read = () => page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const rows = [...p.querySelectorAll("[data-qcv='row']")] as HTMLElement[];
    const led = p.querySelector("[data-qcv='ledger']") as HTMLElement;
    const cs = rows[0] ? getComputedStyle(rows[0]) : null;
    return {
      ledger: Math.round(led.getBoundingClientRect().width),
      rows: rows.length,
      rowW: rows[0] ? Math.round(rows[0].getBoundingClientRect().width) : null,
      gap: rows.length > 1 ? Math.round((rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom) * 10) / 10 : null,
      radius: cs?.borderTopLeftRadius,
      shadow: cs ? cs.boxShadow !== "none" : false,
      tracks: cs ? cs.gridTemplateColumns : "",
      head: p.querySelectorAll("[data-qcv='list-head'], .qcv-cols").length,
      frame: led.querySelectorAll(".fc-frame").length,
    };
  });
  const before = await read();
  yes("ledger", `it drew rows (${before.rows})`, before.rows > 3, String(before.rows));
  is("ledger", "no head row", before.head, 0);
  is("ledger", "no frame around the list", before.frame, 0);
  near("ledger", "the cards are 10px apart", before.gap, 10, 0.5);
  is("ledger", "14px corners", before.radius, "14px");
  yes("ledger", "each card has its own shadow", before.shadow);
  is("ledger", "four tracks", before.tracks.split(/\s+/).length, 4);
  record({ area: "ledger", what: "the ledger at 1440, nothing chosen", got: before, want: "reported" });

  await page.locator(".qcv-page [data-qcv='row']").nth(1).click();
  await page.waitForTimeout(600);
  const after = await read();
  const showing = await page.evaluate(() => (document.querySelector("[data-qcv='rail']") as HTMLElement | null)?.getAttribute("data-showing"));
  is("ledger", "the chosen query went to the rail", showing, "query");
  /* ⚠️ THE CLAIM. In v11 this measured 1114 before and 698 after. */
  is("ledger", "…and the ledger did not narrow by a pixel", after.ledger, before.ledger);
  is("ledger", "…nor did a row", after.rowW, before.rowW);
  record({ area: "ledger", what: "ledger width before → after a selection", got: { before: before.ledger, after: after.ledger }, want: "reported" });
  await page.keyboard.press("Escape");
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
    const ref = await readRef(refPage, refWindowFor(column), h);
    /* and the same ref with a query chosen, for everything that only exists once one is */
    const refPicked = await readRef(refPage, refWindowFor(column), h, refPick);
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
    /* ⚠️ THE CONTAINER IS THE LEDGER'S OWN BOX NOW (§5). It used to be a `FramedCard`, so the query
       answered 12px early — the border box less a 6px rim each side. The frame is gone with the
       ledger's card, so there is nothing to subtract, and this is the sort of term that is silently
       wrong for ever if it is carried rather than re-derived. */
    is(area, "the date tile is drawn exactly where the four floors fit the container", dated, need(app, "app", "ledger").w >= T.boundary);
    /**
     * ⚠️ AND AT 1280 IT IS DRAWN, FULL STOP — the line above cannot say this. Its expected value is
     * derived from the same stylesheet the page is rendered from, so floors that rise take the
     * threshold and the tile with them and BOTH sides move together: the check passes while the
     * Queried column quietly disappears at the everyday window. That is the whole reason this pass
     * happened (Nick, 20 Sep), so it is asserted flatly, against the window rather than the CSS.
     */
    if (w === 1280) yes(area, "the date tile is drawn at a 1280 window — the column this pass exists to keep", dated);
    /* ⚠️ NO HEAD ROW TO COMPARE (§5) — it went with the ledger's frame on both sides. */
    /* ⚠️ THE ROW'S HEIGHT IS ITS OWN FLOOR, NOT THE REF'S. Both are auto-height cards now, and a
       card's height is its content's: the app's rows carry the e2e account's real names and status
       lines, the ref's carry the mockup's. What the app states is a MINIMUM, and that is what is
       asserted — read from the sheet rather than typed, so a retune moves both together. */
    const minH = +(/min-height:\s*(\d+(?:\.\d+)?)px/.exec(readFileSync(resolve("src/components/queries/centre/qcvList.css"), "utf8"))?.[1] ?? -1);
    yes(area, `the row's stated floor is in the sheet (${minH})`, minH > 0, String(minH));
    yes(area, `every row is at least its stated floor (${app.boxes["row"]?.h} vs ${minH})`, (app.boxes["row"]?.h ?? 0) >= minH - 0.5, String(app.boxes["row"]?.h));
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
    if (dated) {
      is(area, "four tracks are drawn", cells.tracks.length, 4);
      is(area, "one of them is flexible, three are fixed", [T.flex.length, T.fixed.length], [1, 3]);
      /* the flexible track is at or above its floor; the three fixed ones are exactly what they say */
      yes(area, `the flexible track is at or above its ${T.flex[0].floor}px floor`, cells.tracks[0] >= T.flex[0].floor - 0.6, cells.tracks[0].toFixed(1));
      T.fixed.forEach((f, i) => near(area, `fixed track ${i + 1}`, cells.tracks[i + 1], f, 0.6));
      /* ⚠️ AND THE FOUR ADD UP TO WHAT THEY WERE GIVEN, less three declared gaps — which is the
         claim a per-track check cannot make: the flexible one must absorb the spare EXACTLY, or
         the row is silently narrower or wider than its card. */
      const gaps = (cells.inner - cells.tracks.reduce((x, y) => x + y, 0)) / 3;
      near(area, `the three gaps are the declared ${T.gap}px`, gaps, T.gap, 0.6);
    }
    record({ area, what: "app vs REF column edges [chip, stands, sent, date] — the floors diverge deliberately (20 Sep)", got: {
      app: ["row-chip", "row-stand", "row-sent", "row-date"].map((c) => (app.boxes[c] && app.boxes["ledger"] ? Math.round((app.boxes[c]!.x - app.boxes["ledger"]!.x) * 10) / 10 : "not drawn")),
      ref: ["row-chip", "row-stand", "row-sent", "row-date"].map((c) => (ref.boxes[c] && ref.boxes["ledger"] ? Math.round((ref.boxes[c]!.x - ref.boxes["ledger"]!.x) * 10) / 10 : "not drawn")),
    }, want: "reported" });
    /* ⚠️ NO CELL RUNS PAST ITS OWN CARD'S EDGE: the floors fit, or the tile has gone. Measured
       against the ROW now rather than the ledger's frame — the frame went in §5, and each row is
       its own card, so the row is the box a cell can overflow. */
    const spill = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
      return [...p.querySelectorAll("[data-qcv='row']")].flatMap((r) => {
        const rb = r.getBoundingClientRect();
        return [...r.children].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > rb.right + 0.5; });
      }).length;
    });
    is(area, "cells running out past their card's right edge", spill, 0);
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
    /**
     * ⚠️ REVERSED BY v65 §6.5, AND THIS IS THE CHANGE THE WHOLE REBUILD IS FOR. In v11 the card took
     * its column OUT of the ledger: "ledger + 20 + card fills the stage", and the ledger really did
     * give up 396px of itself. The card is in the RAIL now — a fixed card outside the page's flow —
     * so the ledger keeps every pixel it had, and the assertion is the opposite one.
     */
    const stq = need(sel, "app", "stagegrid"), leq = need(sel, "app", "ledger"), opq = need(sel, "app", "open");
    near(area, "once chosen: the ledger still fills the stage", leq.w, stq.w, 1);
    is(area, "…and did not give up a pixel", leq.w, need(app, "app", "ledger").w);
    near(area, "the card is the rail's own 340", opq.w, 340 - 28, 1);
    yes(area, "…and it is outside the ledger", opq.x > leq.x + leq.w, `card at ${opq.x}, ledger ends ${leq.x + leq.w}`);
    if (w === 1440) sameSize(area, sel, refPicked, "open-band", ["h"]);
    is(area, "a Queried query's one action", card.action, "Record a response");
    is(area, "…is anthracite", card.actBg, "rgb(42, 58, 82)");
    is(area, "the drawer's own three tabs, kept", card.tabs, ["Tracking", "Agent", "Notes"]);
    is(area, "a Queried query is with the agent, and wears no rust", [card.court, card.rust], ["With the agent", "false"]);
    yes(area, "choosing a row writes ?q= (a user's act)", /[?&]q=/.test(card.url), card.url);
    /* ⚠️ READ AFTER THE CLICK, because there is no card before it (§7) — a `getComputedStyle` of
       nothing is not evidence that the card is not an overlay. */
    /* ⚠️ STATIC, NOT STICKY, SINCE §6.5 — it fills the rail, which is what is placed. A sticky
       child of a card that is already the window's height has nowhere to travel. */
    is(area, "the card fills the rail rather than sticking inside a column", card.pos, "static");
    /**
     * ⚠️ THE FOOT'S HEIGHT IS ITS CONTENT'S, so it is asserted against its own floor rather than
     * against the ref's — the same reason the row's height stopped being compared. It holds two
     * lines of prose built from the e2e account's real query (`standLine` + `factLine`); the
     * mockup's says something shorter. At the rail's 312px the app's wraps to 134 and the ref's to
     * 93.5, and neither number is evidence about the other.
     *
     * What IS the app's own claim: the foot is at least its stated 80px, and nothing in the card
     * runs past the rail that holds it.
     */
    if (w === 1440) {
      sameSize(area, sel, refPicked, "open-action", ["h"]);
      const ft = need(sel, "app", "open-foot");
      yes(area, `the foot is at least its stated 80px floor (${ft.h})`, ft.h >= 80 - 0.5, String(ft.h));
      const spillCard = await page.evaluate(() => {
        const rail = [...document.querySelectorAll("[data-qcv='rail']")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
        if (!rail) return -1;
        const rb = rail.getBoundingClientRect();
        return [...rail.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > rb.right + 0.5 || b.left < rb.left - 0.5); }).length;
      });
      is(area, "anything in the card running out past the rail's sides", spillCard, 0);
    }
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
  /* ⚠️ COMPARED WITH THE REAL ROW IN THE SAME RUN, NOT WITH A NUMBER. It was pinned at 67 and the
     row became a 69px card in v65 §5 — a lock on a spelling, failing on a change that made its own
     claim no less true. The claim is "the placeholder is the row's height", so both sides are
     measured; the loaded reading is taken below and the two are compared there. */
  const skH = await page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!.querySelector("[data-qcv='sk-row']")!.getBoundingClientRect().height);
  is("loading", "enabled head / sentence controls while loading", inert.enabled, 0);
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-busy")), { timeout: 20_000 }).toBe("false");
  await page.waitForTimeout(1300);
  const done = await readApp(page);
  near("loading", "a placeholder row is the real row's height", skH, need(done, "app", "row").h, 0.5);
  /* ⚠️ THE LEDGER AND THE CARD KEEP THEIR PLACE AND WIDTH, NOT THEIR HEIGHT: eight placeholder rows are
     not fifty-four real ones, and a card's height is its query's. Everything ABOVE them keeps all four. */
  /* ⚠️ `open-band` IS OFF THIS LIST: with nothing selected on load there is no card, on either side
     of the comparison, so "the frame did not move" would be a claim about two absences. */
  /* ⚠️ `list-head` IS OFF THIS LIST TOO, AND FOR THE THIRD TIME THE SAME REASON: the ledger's head
     row went with its frame in §5, so it is absent on BOTH sides and "the frame did not move" would
     be a claim about two absences. What replaced it is the COURTS, which are drawn in both states
     and are the thing now standing where the head row did. */
  /**
   * ⚠️ REPORTED FIRST, THEN ASSERTED — because `near` throws, and the first mismatch in a loop like
   * this hides every reading after it. A 2px drift in the courts' ghost was invisible for a run
   * behind a 2px drift in the sentence BELOW it, which is the same drift seen from downstream.
   */
  /* ⚠️ THE LEDGER KEEPS ITS PLACE AND WIDTH, NOT ITS HEIGHT — eight placeholder rows are not
     seventy-five real ones (measured: 622 against 5,915). Every frame ABOVE it keeps all four, and
     that is the claim: nothing a reader is looking at moves when the cover lifts. */
  const frames = [["head-cta", 4], ["courts", 4], ["ctl", 4], ["ledger", 3]] as const;
  record({ area: "loading", what: "the frames, held → loaded", got: Object.fromEntries(frames.map(([n]) => [n, { held: held.boxes[n], loaded: done.boxes[n] }])), want: "reported" });
  for (const [n, dims] of frames) {
    const a = held.boxes[n], b = done.boxes[n];
    for (const d of (["x", "y", "w", "h"] as const).slice(0, dims)) near("loading", `${n}.${d} held → loaded`, a ? a[d] : null, b ? b[d] : null, 1);
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
  /* ⚠️ THE VIEW ROUND TRIP IS GONE WITH THE VIEWS (v65 §1). What is left of the claim — that the
     entrance runs ONCE and does not re-run as the page's state changes — is exercised by selecting a
     row, which re-renders the stage and is the state change this page actually has. */
  await page.locator(".qcv-page [data-qcv='row']").first().click();
  await page.waitForTimeout(150);
  is("entrance", "replayed when a query is opened", (await visible())?.entering, false);
  await page.waitForTimeout(300);
  await ctx.close();
  record({ area: "entrance", what: "video", got: "test-results/qc-v65/video/*.webm", want: "reported" });
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
    return { url: location.search, portal: p.querySelectorAll("[data-qcv='ov-portal'], [data-qcv='ov-tile']").length, open: p.querySelectorAll("[data-qcv='open']").length,
      ledger: Math.round(p.querySelector("[data-qcv='ledger']")!.getBoundingClientRect().width), stage: Math.round(p.querySelector("[data-qcv='stagegrid']")!.getBoundingClientRect().width) };
  });
  is("escape", "the card closes", shut.open, 0);
  is("escape", "…and ?q= goes with it", shut.url.includes("q="), false);
  /**
   * ⚠️ THE POINT OF THE SEPARATE HANDLER SURVIVES THE VIEWS (v65 §1): Escape must not be Back.
   * It used to be checkable as "the view did not change"; with one page the same claim is that
   * Escape does not take the reader somewhere else — the ledger is still what is drawn, and no
   * Overview appears behind it. Retargeted rather than dropped: the two handlers are still separate
   * and `onClearSelection` is still the one Escape calls.
   */
  is("escape", "Escape did not navigate — no Overview behind the closed card", shut.portal, 0);
  near("escape", "…and the ledger takes the stage back", shut.ledger, shut.stage, 1);
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
    {
      await openApp(page, w, h);
      const t = await page.evaluate(() => {
        const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
        const base = p.getBoundingClientRect();
        const off = (s: string) => { const e = p.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round((b.x - base.x) * 10) / 10, y: Math.round((b.y - base.y) * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
        return {
          page: { x: Math.round(base.x), w: Math.round(base.width) },
          title: off("[data-qcv='head-title']"), facts: off("[data-qcv='head-line']"), actions: off("[data-qcv='head-actions']"),
          sentence: off("[data-qcv='ctl']"), ledger: off("[data-qcv='ledger']"), row1: off("[data-qcv='row']"), open: off("[data-qcv='open']"),
        };
      });
      record({ area: "§14 offsets", what: `the page @ ${w}×${h}`, got: t, want: "reported" });
    }
  }
  /* and the one number Nick asked for: where the first Ledger row sits now the strip has gone */
  await openApp(page, 1280, 800);
  const rowTop = await page.evaluate(() => Math.round(document.querySelector(".qcv-page [data-qcv='row']")!.getBoundingClientRect().top * 10) / 10);
  /* 702.5 with the compact strip · 394.7 the moment it went · 372.1 once the head's stray 8px and
     the control row's 15px of air for the retired view switch went with it */
  record({ area: "§14 offsets", what: "the first Ledger row's top at 1280×800 (702.5 with the strip → 394.7 without → 372.1 at v21's close → now, with the courts)", got: rowTop, want: "reported" });
  /**
   * ⚠️ A CLAIM ABOUT THE FOLD, NOT A NUMBER. It was `rowTop < 500` and measured 500.2 once the three
   * court tiles arrived — a threshold tuned to one layout, failing by two tenths on a change that
   * put a whole row of new information above it. What matters is that a reader lands on the ledger
   * with a row already on screen, which is measured against the scrollport rather than guessed.
   */
  const fold = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".qcv-page")].find((e) => e.getBoundingClientRect().height > 0)!;
    const port = p.closest(".wpg-scroll") as HTMLElement;
    const r = p.querySelector("[data-qcv='row']")!.getBoundingClientRect();
    const pb = port.getBoundingClientRect();
    return { rowBottom: Math.round(r.bottom * 10) / 10, portBottom: Math.round((pb.top + port.clientHeight) * 10) / 10 };
  });
  record({ area: "§14 offsets", what: "the first row's bottom against the scrollport's at 1280×800", got: fold, want: "reported" });
  yes("§14 offsets", `the first row is whole and above the fold at 1280×800 (row ends ${fold.rowBottom}, the fold is ${fold.portBottom})`, fold.rowBottom <= fold.portBottom, JSON.stringify(fold));
});

test("Ω · the run measured enough to be believed", async () => {
  const n = existsSync(REPORT) ? (JSON.parse(readFileSync(REPORT, "utf8")).assertions as number) : 0;
  expect(n, `only ${n} assertions ran; the floor is ${MIN_ASSERTIONS}. A run that measured half of itself is a red.`).toBeGreaterThanOrEqual(MIN_ASSERTIONS);
});
