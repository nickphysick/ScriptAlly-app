#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE REF-DIFF HARNESS ═════════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE REF IS THE ORACLE, AND THIS EXISTS BECAUSE THE LAST PASS'S "13 OF 13 GREEN" WAS MEASURING
 * THE WRONG THINGS. Every one of those assertions was true and self-consistent, and the page did
 * not look like the ref: the bands and the line came from different sources, the axis clipped, the
 * brush drew a blob, the ground was white. A measurement that only ever asks the questions its
 * author thought of confirms the author's model of the page, not the page. This asks ONE question —
 * "where does the ref put this, and where does the app put it" — and it asks it of sixteen boxes at
 * three widths in the same headless browser, so neither side gets a different engine, a different
 * device pixel ratio or a different font stack to hide behind.
 *
 * ⚠️ IT COMPARES GEOMETRY, COLOUR AND TYPE — NEVER DATA. The two pages hold different records and
 * always will; a diff that cared about counts would be red forever for a reason nobody can fix.
 * Boxes, fills, radii and type are the things a design ref actually specifies.
 *
 * ⚠️ AND IT MUST BE PROVED RED BEFORE ANYTHING IS BUILT ON IT. A harness nobody has watched fail is
 * a harness that reports what you hoped. `--self-test` breaks one probe's geometry in the loaded ref
 * and requires the miss to be reported; the run refuses to continue if it is not.
 *
 * USAGE
 *   node scripts/dash-refdiff.mjs                    verify — writes JSON + a table, exits 1 on any miss
 *   node scripts/dash-refdiff.mjs --self-test        prove the harness reports a miss it should
 *   node scripts/dash-refdiff.mjs --widths 1920      one width, for a fast loop
 *   node scripts/dash-refdiff.mjs --out run-artifacts/dash-refdiff.json
 *
 * ENV
 *   SA_REFDIFF_APP_URL   the app's origin (default http://127.0.0.1:4173)
 *   SA_E2E_PASSWORD      the harness account's password, from .env.local
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/**
 * ⚠️ THE BACKTICK GUARD, AND IT RUNS BEFORE READ IS BUILT — AND IT WAS VACUOUS FOR SIX PASSES.
 *
 * It read `READ.includes(backtick)`. READ is the string the template literal EVALUATES TO, and a
 * stray backtick is precisely what ENDS that literal — so the string it inspected could never
 * contain one. The guard could not fire under any circumstances, in a file whose own notes warn
 * that a green is worth what the last red was worth. Six occurrences of the fault it was written
 * for have gone past it.
 *
 * ⚠️ THE SIXTH IS WHY IT HAD TO CHANGE RATHER THAN BE DELETED. The first five ended the literal
 * mid-expression and died at PARSE, which at least pointed at the file. The sixth left a
 * syntactically valid file that failed in the BROWSER as "appctl is not defined" — an error with no
 * visible relationship to a comment three hundred lines away.
 *
 * ⚠️ AND IT SITS ABOVE THE LITERAL, NOT BELOW IT. Placed after, it still could not fire: the
 * module dies CONSTRUCTING READ, before any statement after it runs. A guard positioned after
 * the thing it guards is a guard for a fault that has already happened.
 *
 * So it reads the SOURCE. Between the opening delimiter and the closing one there must be exactly
 * two backticks in the file: the two that delimit it. Anything else is a stray, wherever it is —
 * code, string or comment.
 */
const SELF_SRC = readFileSync(fileURLToPath(import.meta.url), "utf8");
{
  /* ⚠️ ANCHORED AT A LINE START, because unanchored it found its OWN string two lines above and
     inspected a 502-character slice of itself — reporting exactly two backticks, forever. A guard
     that reads the wrong region is the same class of fault as the one it guards against, and this
     repo already records unanchored slicing three times. */
  const open = SELF_SRC.indexOf("\nconst READ = ") + 1;
  const body = SELF_SRC.slice(open, SELF_SRC.indexOf("\n\n", SELF_SRC.indexOf("})()", open)));
  const ticks = (body.match(/\u0060/g) || []).length;
  if (ticks !== 2) {
    throw new Error(
      `dash-refdiff: READ's template literal holds ${ticks} backticks and must hold exactly 2 — ` +
      "one of them is a stray, and it ends the literal early. Search the block for a backtick in " +
      "code, in a string, or in a COMMENT: the last five were all in comments.",
    );
  }
}

const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v28.html");

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SELF_TEST = argv.includes("--self-test");
const OUT = resolve(ROOT, flag("--out", "run-artifacts/dash-refdiff.json"));
/* ⚠️ 1710 IS IN THE DEFAULT SET BECAUSE IT IS WHERE NICK WORKS, and nothing had ever measured it.
   Two of v27's three reported faults appear only there: the chart header stacked at ≤1700 while
   the stats stacked at ≤1750, so 1701–1750 was a band neither rule covered. A width nobody
   measures is a width nobody's rules are written for. */
const WIDTHS = flag("--widths", "1536,1710,1920,2520").split(",").map(Number);
const HEIGHT = 1456;
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";

/* ── the contract ────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE PROBE SET IS THE REF'S, AND v22 CHANGED SIX OF THEM. `activity-tabs` → `activity-filters`
 * (the tabs are a collapsible filter row now), `community-card` → `community-strip` (it is a
 * full-width footer strip rather than a card in a column), `goals-card` is GONE, and `toprow` is
 * new — the manuscript tile and the chart card share a row, and the row itself is the thing that
 * has to line up.
 *
 * ⚠️ A RENAMED PROBE IS REPORTED, NEVER SILENTLY DROPPED. Run against v22 with v16's list the
 * harness said "the ref has no such probe" four times, which is the correct answer and the reason
 * this list is worth keeping honest: a probe quietly removed is coverage quietly removed.
 */
/* ⚠️ v26'S LIST. Gone from v22: `todo-badge` and `activity-filters` (both still RENDER — they are
   simply not instrumented in v26, which is a narrowing of coverage rather than a removal of the
   elements, and is recorded here so nobody reads their absence as a deletion); `community-strip`,
   which really is gone, replaced by `community-tile` in the right column. New: `topbar` and
   `search`, because v26 puts a 620x50 search field where the breadcrumb row was. */
const PROBES = [
  /* ⚠️ `topbar` IS `navrow` NOW, AND `chart-header` IS NEW. Both of the last two shipped faults
     were invisible to the probe set that existed: the search sat in a row of its own and no probe
     measured a row, and the chart header wrapped and no probe measured the header. A probe set is
     the shape of what the gate can notice. */
  "main", "navrow", "search", "grid", "hero", "stats", "toprow", "chart-header",
  /* v27 adds the two the stats row is actually judged on — a stat's whole box and its illustration.
     The `stats` probe is the ROW, and a row's box is identical whether its illustrations are 104px
     or 58px, which is exactly the squash the pack is trying to gate against. */
  "stat-card", "stat-illustration",
  "manuscript-card", "chart-card", "plot", "brush",
  "todo-card", "todo-rule",
  "activity-card", "feed",
  "community-tile",
];

/**
 * ⚠️ EACH PROBE IS ANCHORED TO THE EDGE ITS DESIGN PINS IT TO, AND THIS IS THE SECOND HALF OF THE
 * RELATIVE-DATUM DECISION — the first half moved position off the viewport and onto `main`, and
 * left every WIDTH absolute, which reintroduced the same fault one level down.
 *
 * The app's `main` is 1650 wide at 1920 where the ref's is 1634: the ref draws no rail, no window
 * and no bar, so its page padding is the only thing inset from the viewport. In a `440px 1fr 420px`
 * grid that 16px lands entirely in the elastic middle track — which is CORRECT behaviour, and was
 * being reported as a miss on the chart card, the to-do card, the plot, the rule, and as an x miss
 * on all four right-column probes. Nine misses, none of them a difference anyone could fix, and all
 * of them ones a design change could hide behind.
 *
 * So: a `left` probe is pinned to the left and its left inset and width are the facts. A `right`
 * probe is pinned to the right and its RIGHT inset and width are the facts. A `span` probe fills the
 * elastic track, so its two insets are the facts and its width is derived from them — pinning both
 * edges pins the width too, against whatever container the shell gives it.
 */
/**
 * ⚠️ ALLOWANCES ARE FOR DIFFERENCES THAT CANNOT BE CLOSED, NEVER FOR ONES NOBODY HAS CLOSED YET.
 *
 * This table is the single most dangerous thing in the file, because its whole purpose is to stop
 * the gate counting something — which is the shape of every gate that quietly stopped working. Two
 * defences, and neither is optional:
 *
 *   1. AN ALLOWANCE NAMES A PROBE **AND** A FIELD, and it carries a MAXIMUM. A difference larger
 *      than the recorded one still counts. So an allowance forgives the fault it was written for
 *      and cannot forgive that fault getting worse, which is the failure mode of a bare skip-list.
 *   2. EVERY ALLOWANCE STATES WHY IT CANNOT BE CLOSED, in a sentence a reader can check. Both of
 *      these have the same shape: closing them means changing the APP'S DATA or the APP'S FEATURE
 *      SET to match a mockup, which is the tail wagging the dog.
 *
 * They are reported in the table as `(allowed)` rather than hidden, so a reader always sees that
 * the gate is forgiving something and what.
 */
const ALLOW = [
  /* ⚠️ THE TWO NEW PROBES SIT AT THE LEFT END OF THE STATS ROW, so their x carries EXACTLY the
     same fixture difference as the row's own — the greeting's width. Their VALUE is their size (the
     illustration's, which is the squash gate), and that is still compared. Allowing x on the three
     of them is one fact forgiven once, not three allowances. */
  {
    key: "stat-card", field: "x", derived: "greetW", slack: 3,
    why: "the stats row begins where the greeting ends, and this is its first item — same cause as " +
         "`stats` x, measured from the same two headings.",
  },
  {
    key: "stat-illustration", field: "x", derived: "greetW", slack: 3,
    why: "the stats row begins where the greeting ends, and this is the first thing in its first " +
         "item — same cause as `stats` x, measured from the same two headings.",
  },
  {
    key: "stats", field: "x", derived: "greetW", slack: 3,
    why: "the hero is `auto 1fr`, so the stats begin where the greeting ENDS. The ref's greeting " +
         "reads \"Hello, Bethany\"; the harness account's name is a different length, and the " +
         "difference between the two headings is EXACTLY the difference this forgives — measured " +
         "each run, not typed. A larger gap than the names account for still counts.",
  },
  {
    /* ⚠️ I REMOVED THIS ONCE, ON THE GROUND THAT IT HAD GONE DORMANT, AND THE MEASUREMENT PUT IT
       STRAIGHT BACK. The run reported "+1 allowed" at every width and I read that as one allowance
       firing three times; it is one allowance firing at EACH width and they are DIFFERENT ones.
       Above 1750 the hero is two columns, so the stats begin where the greeting ends and theirs is
       the allowance; at 1536 the hero stacks, the stats start at the column edge and are exact, and
       the brush's is. Deleting it turned 0 misses into 1 within a minute — which is the cheapest
       possible demonstration that a table like this is read by running it, not by reasoning about
       it. */
    key: "brush", field: "xr", max: 90,
    why: "the ref's frequency control is a two-button chip pair (Weekly | Monthly) at 146px; ours " +
         "is a native select, because this app offers THREE frequencies — Daily, Weekly, Monthly. " +
         "Below the breakpoint the control row is left-aligned, so the brush starts earlier. " +
         "Closing it means dropping a frequency the app supports.",
  },
];

/** true when this miss is one of the recorded allowances AND is no worse than the allowance says */
const allowedBy = (m, refData, appData) =>
  ALLOW.find((a) => {
    if (a.key !== m.key || a.field !== m.field) return false;
    if (!Number.isFinite(m.ref) || !Number.isFinite(m.app)) return false;
    const gap = Math.abs(m.app - m.ref);
    if (a.derived) {
      /* the allowance IS the measured cause, plus a few pixels of rounding */
      const r = refData.checks?.[a.derived], p = appData.checks?.[a.derived];
      if (!Number.isFinite(r) || !Number.isFinite(p)) return false;
      return gap <= Math.abs(r - p) + (a.slack ?? 0);
    }
    return gap <= a.max;
  });

const ANCHOR = {
  main: "datum",
  /* the bar spans the content, and the field is CENTRED in it — so both of the field's insets are
     the fact, which `span` is exactly the anchor for */
  /**
   * ⚠️ THE NAV ROW AND ITS SEARCH ARE DATUMS, REPORTED AND NOT COMPARED — and the ref says why in
   * its own markup: "NAV ROW — the search sits in the nav's own row; the nav itself is locked and
   * not drawn here". The ref's `.topbar` is a STAND-IN for a row it does not draw, positioned
   * inside its `.main` because it has nowhere else to put it. Ours is real shell chrome above the
   * content, so comparing the two would be comparing against a placeholder.
   * What governs them instead is the standing gate below: one search control, a row no taller than
   * 72px, and the greeting starting immediately under it. Those are claims about the app, checkable
   * without the ref having an opinion.
   */
  navrow: "datum", search: "datum",
  "chart-header": "span",
  grid: "span", hero: "span", stats: "span", toprow: "span",
  /* both sit at the LEFT end of the stats row, so their left inset and size are the facts */
  "stat-card": "left", "stat-illustration": "left",
  /* the tile is the only fixed track in the top row; everything beside it is elastic */
  "manuscript-card": "left",
  "chart-card": "span", plot: "span", brush: "right",
  "todo-card": "span", "todo-rule": "span",
  /* the right column is 360px pinned to the right edge, and everything in it goes with it —
     including the community tile, which is now IN that column rather than a strip beneath both */
  "activity-card": "right", feed: "right", "community-tile": "right",
};
/**
 * ⚠️ THE REF'S OWN THREE, NOT SIX OF MINE — v16 instruments itself and the app carries its names.
 *
 * ⚠️ AND THREE TEXT PROBES ARE NOT A TYPE GATE, WHICH IS WHAT THE LAST PASS GOT WRONG. Six probes
 * were added by hand, and all six landed on runs that already matched: the greeting at 52, the stat
 * figure at 34, the card title at 23, the bubble sentence at 15. The whole mono and caption band —
 * where the app runs 8 / 8.5 / 9 against the ref's 9.5 / 10 / 11 — had no probe at all, so a page
 * whose small type was a quarter to a third short of the ref reported clean. That is this repo's own
 * monoculture-fixture fault wearing a harness's clothes: the sample was drawn from the population
 * that was already correct. `TYPE_SCALE` below is the coverage fix, and it is the actual gate.
 */
/* v26 adds `subtitle` — "What's on your desk today?" is a hero row of its own now, so its size is
   a thing the design states rather than a thing that follows the greeting. `stat-figure` is gone
   from the ref's instrumentation; the stat figure's size is still gated, by TYPE_SCALE's own row. */
const TEXT_PROBES = ["greeting", "subtitle", "panel-title", "chart-title"];

/**
 * The type scale, as SELECTOR PAIRS — one row per treatment the design names, ref side and app side.
 *
 * ⚠️ SELECTOR PAIRS RATHER THAN MORE `data-probe-text` ATTRIBUTES, because attributes would mean
 * editing the ref, and a ref whose md5 moves is a ref that can no longer be checked against the one
 * the pack named. Every row is compared for `font-size` at the pack's ±0.5px, and for family and
 * weight, which is what a "scale" is.
 */
const TYPE_SCALE = [
  /* ⚠️ THE TO-DO CARD'S TITLE, NOT THE FIRST `h2` IN A BAND. The chart's band holds a STAT BLOCK
     whose title is deliberately 19px, and it comes first in the document — so a selector that
     accepts either read the stat block and reported the card-title row at 19 against the ref's 23.
     The two treatments have their own probes in v22 for exactly this reason. */
  ["card title",      ".hd h3",              ".os-th2 h2"],
  ["chart figure",    "#hdB > b",            ".os-ahead .os-n"],
  ["hero greeting",   ".hero h1",            ".os-greet h1"],
  ["stat label",      ".stat .lab",          ".os-cl"],
  ["stat figure",     ".stat .fig b",        ".os-cn"],
  ["stat chip",       ".stat .mini",         ".os-cd"],
  /* ⚠️ THE LEGEND ROW IS RETIRED WITH THE LEGEND (v26, Phase 5). The ref still SHIPS the markup and
     hides it with `.legend{display:none}`, so its type is still readable there and a type probe
     would go on comparing a treatment neither page draws. Removing the row is a narrowing of
     coverage and is recorded as one; what replaced the legend is nothing, deliberately. */
  ["tab",             ".ftabs button",       ".os-ftab"],
  ["tab count",       ".ftabs .n",           ".os-ftabn"],
  ["ticket title",    ".tk .ttl",            ".tkt .ttl"],
  ["ticket tag",      ".tk .tag",            ".tkt .tag"],
  /* ⚠️ NO ROW FOR THE TICKET'S SUB-LINE — the ref's shipping ticket does not have one. `snip:'a'`
     makes `sub(t)` return an empty string, so its ticket is a tag and a deed and nothing else. A
     row for a treatment the design does not have can never pass, and leaving it in as a permanent
     "no element in the REF" is a miss that teaches the reader to skip the table. The app's own
     sub-line is a CONTENT question and belongs to Phase 6, not to the type scale. */
  ["bubble sentence", ".cv .msg .b .s",      ".os-bubsay"],
  ["bubble meta",     ".cv .msg .b .m",      ".os-bubmeta"],
  ["bubble label",    ".cv .msg .b .slab",   ".os-bublab"],
  ["todo badge",      ".badge b",            ".os-tbadge b"],
];

/**
 * ⚠️ TOLERANCES ARE THE PACK'S, AND THEY ARE ASYMMETRIC ON PURPOSE. An EDGE may sit ±3px out
 * because a 1px hairline and a sub-pixel gap are not a design difference; a SIZE may be ±4px
 * because two edges can each be off by their own tolerance. Colour and radius are exact: those are
 * decisions, not measurements, and "nearly the right grey" is the fault this whole pass exists for.
 */
const TOL = { edge: 3, size: 4, font: 0.5 };

/** ⚠️ THE GROUND IS A STATED VALUE, not "whatever the ref happens to compute". */
const GROUND = "rgb(244, 240, 234)";

/* ── reading a page ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ SCOPED TO THE VISIBLE PAGE, ALWAYS. Every workspace page in this app stays MOUNTED and the
 * shell toggles `display`, so `document.querySelector` routinely answers about a page the reader
 * cannot see. It cost this very pass a wrong recon answer — a `.tkt .tag` read off `document` on
 * `/todo` returned the DASHBOARD's copy and reported the token as resolved when it is not.
 */
const READ = `(() => {
  const num = (v) => Math.round(v * 10) / 10;
  const roots = [...document.querySelectorAll("[data-probe]")];
  /* ⚠️ THE DATUM IS FOUND BY SELECTOR, BECAUSE v26 STOPPED INSTRUMENTING IT. v22 carried
     data-probe="main"; v26 does not, while the element itself is still there as .main. Losing the
     datum is not a small thing — it is what makes every position RELATIVE to each side's own
     content box, and without it the shell's chrome offset turns every probe on the page into a
     miss (measured: 142, with x values like -1512 against 0). Reading it by selector keeps the
     datum and leaves the ref's bytes alone, which matters because a ref whose md5 moves can no
     longer be checked against the one the pack named. */
  /* ⚠️ SINGLE QUOTES INSIDE, AND THAT IS NOT A STYLE CHOICE. This block is a TEMPLATE LITERAL, so
     a backslash-escaped double quote is unescaped BEFORE the browser ever sees it: the string that
     arrived carried a bare double quote inside the selector and died as "missing ) after argument
     list". This file already warns about it for regexes; a selector is the same trap wearing
     different clothes.
     ⚠️ AND THE FIRST DRAFT OF THIS VERY COMMENT PUT BACKTICKS ROUND THE BROKEN SELECTOR, which
     ended the template literal and took the file down at parse. FOURTH time in this file, written
     into the warning about it. No backticks in here, comments included. */
  const visibleIn = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: num(r.x), y: num(r.y), w: num(r.width), h: num(r.height),
      bg: cs.backgroundColor,
      /* the width travels with the colour — see diffOne. A border-top-color computes to the
         element's own colour on a box with no border, so comparing it bare is noise.
         NO BACKTICKS IN HERE: this whole block is a template literal, and one ends it. */
      borderTopW: parseFloat(cs.borderTopWidth) || 0,
      borderTop: cs.borderTopColor,
      radius: cs.borderTopLeftRadius,
    };
  };
  const out = { probes: {}, text: {}, scale: {}, checks: {} };
  for (const el of roots) {
    const k = el.getAttribute("data-probe");
    if (out.probes[k] || !visibleIn(el)) continue;   // first VISIBLE match wins
    out.probes[k] = box(el);
  }
  /**
   * ⚠️ THE DATUM IS THE CONTENT COLUMN HORIZONTALLY AND THE NAV ROW'S TOP VERTICALLY, and it is
   * composed from two elements because the ref's frame is genuinely both.
   *
   * v28 moved its topbar INSIDE its main, so every probe below sits 64px down from the datum's top.
   * The app's os-content starts BELOW the shell's bar, so the same page measured 64px high on every
   * probe, uniformly, at every width — the signature of a frame difference, not a layout one.
   *
   * ⚠️ AND SWAPPING WHOLESALE TO ws-main IS THE WRONG FIX, MEASURED. It carries the window's own
   * ~23px of padding, which os-content was absorbing all along: Y came right and every x went 23px
   * out at all four widths. One box could not be both, so the datum takes its horizontal frame from
   * the content column and its top from the nav row — which is what the ref's main is.
   * NO BACKTICKS IN HERE: fifth occurrence in this file was in a comment much like this one, and it
   * took out the copy step so the next run measured the OLD harness and looked like a no-op.
   */
  /* ⚠️ IN PRIORITY ORDER, NOT AS ONE SELECTOR LIST. querySelector with a list returns the first
     match in DOCUMENT order, not the first selector that matches — so the app-stage scroller, which
     is only a last resort, was beating the content column and putting every x 23px out. The list
     had been there for three passes and was harmless only because the branch never ran. */
  const content = ['[data-probe="main"]', '.main', '#app-stage-scroll']
    .reduce((found, sel) => found || document.querySelector(sel), null);
  const navrowEl = document.querySelector('[data-probe="navrow"]');
  if (content && visibleIn(content)) {
    const c = box(content);
    if (navrowEl && visibleIn(navrowEl)) {
      const n = navrowEl.getBoundingClientRect();
      /* only ever extends the frame upward — never past a nav row that is already inside it */
      if (n.top < c.y) { c.h = num(c.y + c.h - n.top); c.y = num(n.top); }
    }
    out.probes.main = c;
  }
  /* ⚠️ THE GREETING'S RENDERED WIDTH, so the stats allowance can be DERIVED rather than typed.
     The hero is auto/1fr: the stats begin where the greeting ends, so the two sides differ by
     exactly the width of the writer's name against the ref's. Recording it turns a magic tolerance
     into arithmetic that moves with the fixture — the difference is forgiven where it equals the
     name's, and reported the moment it does not. */
  const greetEl = document.querySelector('[data-probe-text="greeting"]');
  out.checks.greetW = greetEl ? Math.round(greetEl.getBoundingClientRect().width * 10) / 10 : null;

  /**
   * ⚠️ THE STANDING GATES' RAW READINGS. Five things have now regressed at least once each, and in
   * every case a gate existed and asked about the visible SYMPTOM rather than the structural
   * property — "is the title on one line" while the controls wrapped beneath it, "is there one
   * search control" while it sat in a row of its own. These are the properties.
   */
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const navrow = r(document.querySelector('[data-probe="navrow"]'));
  const chdr = r(document.querySelector('[data-probe="chart-header"]'));
  const ill = r(document.querySelector('[data-probe="stat-illustration"]'));
  const statsB = r(document.querySelector('[data-probe="stats"]'));
  const greetB = r(greetEl);
  out.checks.navrowH = navrow ? Math.round(navrow.height * 10) / 10 : null;
  out.checks.chartHeaderH = chdr ? Math.round(chdr.height * 10) / 10 : null;
  out.checks.illH = ill ? Math.round(ill.height * 10) / 10 : null;
  out.checks.statsVsGreet = statsB && greetB ? Math.round((statsB.top - greetB.top) * 10) / 10 : null;
  out.checks.greetBelowNav = navrow && greetB ? Math.round((greetB.top - navrow.bottom) * 10) / 10 : null;
  /* every element that could pass for a search control, however it is built */
  /* ⚠️ ws-appctl IS NOT A SEARCH CLASS — it is the bar's control WRAPPER, and the + New button
     wears it too. Counting it reported TWO search controls on a page with one, which is the same
     species of error as the gate this run exists to replace: a selector that matches the thing you
     are looking for AND something else is not a gate, it is a coincidence that has been right so
     far. Named controls only.
     NO BACKTICKS IN HERE. Sixth time in this file, and this one PARSED — the stray backtick ended
     the template and the class name became code, so it failed at runtime as "appctl is not defined"
     rather than at load, which puts the error a long way from the cause. */
  out.checks.searchCount = document.querySelectorAll(
    '[data-probe="search"], .ws-bigsearch, .sp-search, .os-search',
  ).length;
  /* the field and Feedback share a line — the claim v27's gate could not make */
  const fb = [...document.querySelectorAll("button")].find((b) => /feedback/i.test(b.textContent || ""));
  const sf = document.querySelector('[data-probe="search"]');
  out.checks.searchVsFeedback = fb && sf
    ? Math.round(Math.abs((sf.getBoundingClientRect().top + sf.getBoundingClientRect().height / 2)
      - (fb.getBoundingClientRect().top + fb.getBoundingClientRect().height / 2)) * 10) / 10
    : null;
  /* every direct child of the chart header on the same line */
  const hdrEl = document.querySelector('[data-probe="chart-header"]');
  out.checks.headerRowSpread = hdrEl
    ? (() => {
        const tops = [...hdrEl.children]
          .filter((c) => c.getBoundingClientRect().height > 0)
          .map((c) => c.getBoundingClientRect().top);
        return tops.length ? Math.round((Math.max(...tops) - Math.min(...tops)) * 10) / 10 : 0;
      })()
    : null;
  /* the brush is inside the header's content box, not clipped */
  const brushEl = document.querySelector('[data-probe="brush"]');
  out.checks.brushOverflow = hdrEl && brushEl
    ? Math.round((brushEl.getBoundingClientRect().right - hdrEl.getBoundingClientRect().right) * 10) / 10
    : null;
  /* ⚠️ A TEXT PROBE READS ITS ELEMENT WHETHER OR NOT IT IS VISIBLE, AND THE REF IS WHY.
     v16 puts data-probe-text=card-title on the chart card's h3 inside hdA — which its own shipping
     config sets to display:none, because hdr is b and the stat block hdB takes over. A visible-only
     read reports "the ref has no such text probe" about a probe the ref ships. Type is readable on
     a hidden element (getComputedStyle still resolves it) and type is all a text probe compares, so
     the honest fix is to read it and RECORD that it was hidden. Boxes still require visibility —
     a hidden box has no geometry to compare. */
  for (const el of document.querySelectorAll("[data-probe-text]")) {
    const k = el.getAttribute("data-probe-text");
    if (out.text[k]) continue;
    const cs = getComputedStyle(el);
    out.text[k] = {
      family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: parseFloat(cs.fontSize),
      weight: cs.fontWeight,
      color: cs.color,
      hidden: !visibleIn(el),
    };
  }
  /* the type scale — a named list of selectors handed in from Node, read the same way */
  const scale = JSON.parse(document.documentElement.getAttribute("data-refdiff-scale") || "[]");
  for (const [name, sel] of scale) {
    const el = [...document.querySelectorAll(sel)].find(visibleIn)
            || document.querySelector(sel);
    if (!el) { out.scale[name] = null; continue; }
    const cs = getComputedStyle(el);
    out.scale[name] = {
      family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: parseFloat(cs.fontSize),
      weight: cs.fontWeight,
    };
  }
  /* ── the four page-level checks ── */
  /* The ground is what is PAINTED BEHIND main, not whatever body happens to carry. The ref paints
     it on body; the app paints it on a shell element several levels up, and both are the same fact.
     Reading body alone reported the app transparent while the page was the right colour.
     NO BACKTICKS IN HERE — this whole block is a template literal and one ends it. */
  const painted = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const mainEl = document.querySelector("[data-probe='main']");
  out.checks.ground = mainEl ? painted(mainEl) : getComputedStyle(document.body).backgroundColor;
  out.checks.hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  /* The three column bottoms, read from the COLUMNS rather than from named cards. The first
     version named community/todo/activity — and Community stopped being the left column's last
     card the moment Pro rendered beneath it, so the check reported a 490px spread about three
     columns that were closing correctly. A column's bottom is the column's, whatever is in it. */
  /* ⚠️ TWO COLUMNS SINCE v22, NOT THREE — and the floor moved with the layout rather than being
     loosened. It required three and reported "fewer than three columns were visible" about a page
     whose design has two, which is a check failing on a correct page: the worst kind, because the
     honest response looks like weakening it. The CLAIM is unchanged — every column closes on the
     same line — and it is asserted over however many the page has, with a floor of two so an empty
     sweep still cannot pass. */
  const cols = [...document.querySelectorAll(".col, .os-colL, .os-colR")]
    .filter((e) => e.getBoundingClientRect().height > 0);
  const bottoms = cols.map((e) => { const r = e.getBoundingClientRect(); return num(r.y + r.height); });
  out.checks.columnBottoms = bottoms;
  out.checks.columnSpread = bottoms.length >= 2 ? num(Math.max(...bottoms) - Math.min(...bottoms)) : null;
  /* ⚠️ THE BLEND TRAP: a transform on ANY ancestor isolates the blend group and the stat artwork's
     white field returns, silently, with the rule applying cleanly. */
  const marks = [...document.querySelectorAll("[data-probe='stats'] img, .os-greet .os-mark-il img")];
  const bad = [];
  for (const m of marks) {
    for (let el = m.parentElement; el; el = el.parentElement) {
      const t = getComputedStyle(el).transform;
      if (t && t !== "none") { bad.push(el.className || el.tagName); break; }
    }
  }
  out.checks.markCount = marks.length;
  out.checks.transformedAncestors = [...new Set(bad)];
  return out;
})()`;


/**
 * ⚠️ NAVIGATION AND SIGN-IN GET A LONG LEASH, AND THAT IS NOT A TOLERANCE. This repo runs several
 * sessions in one checkout; measured here at a load average of 17, a `file://` load of the ref and
 * a cold Firebase auth both blew a 30s default and the run died with a TimeoutError that reads
 * exactly like a broken page. Nothing about what is COMPARED moves — the edge, size and font
 * tolerances are untouched. What moves is how long the harness is willing to wait for a page it has
 * not measured yet.
 */
const NAV_MS = 120_000;

/* SA_REFDIFF_DUMP=<probe> — print that probe's subtree from both sides; see readPage */
const DUMP = process.env.SA_REFDIFF_DUMP || "";

/**
 * ⚠️ SA_REFDIFF_SHOT=<dir> — A PICTURE OF EACH SIDE, BECAUSE A WHOLE CLASS OF THIS PASS'S WORK IS
 * INVISIBLE TO THE TABLE. Moving a status dot into a strip, mirroring that strip for the writer's
 * own events, left-aligning prose that used to be right-aligned: every one of those leaves the
 * feed's box exactly where it was, so the diff stays green whether they landed correctly, landed
 * wrongly, or did not land. The probe set cannot be extended to cover it either — the claim is
 * about arrangement inside a box rather than about a box. So the phase that changes those things
 * looks at the two images.
 */
const SHOT = process.env.SA_REFDIFF_SHOT || "";
/* SA_REFDIFF_BANDS=<dir> — sample the plot's own pixels; see readPage */
const BANDS = process.env.SA_REFDIFF_BANDS || "";

async function readPage(page, url, { app } = {}) {
  page.setDefaultTimeout(NAV_MS);
  page.setDefaultNavigationTimeout(NAV_MS);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (app) await signIn(page);
  /* fonts settled and one paint past any entrance, or type reads at its fallback size */
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(app ? 2600 : 900);
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(160);
  /* the type scale's selectors for THIS side, handed to the page rather than baked into READ */
  const which = app ? 2 : 1;
  await page.evaluate(
    (rows) => document.documentElement.setAttribute("data-refdiff-scale", JSON.stringify(rows)),
    TYPE_SCALE.map((r) => [r[0], r[which]]),
  );
  const data = await page.evaluate(READ);
  /**
   * ⚠️ A SIGNED-OUT PAGE MUST STOP THE RUN, NOT BE MEASURED. This caught nothing on the round it was
   * missing from: the sign-in failed transiently, the harness measured the AUTH page, and reported
   * 92 plausible misses — every card at x 0, the hero headline at 14px — which reads exactly like a
   * layout regression and is nothing of the kind. That is the fault this whole pass exists to close,
   * committed inside the harness written to close it.
   *
   * The tell is cheap and total: the dashboard has sixteen probes, and the auth page has none of the
   * ones that matter. Fewer than twelve is not a page worth diffing.
   */
  /**
   * ⚠️ AND A SIGNED-IN PAGE WHOSE DATA HAS NOT ARRIVED MUST STOP THE RUN TOO — the same fault as
   * the auth page, one step further in, and it gets past the check below because the probes are
   * all THERE. Measured on this pass: a run under load reported 15 misses that read exactly like a
   * regression — the plot "renders no visible element", the to-do rule likewise, nine type rows
   * find no element, and one column's bottom is 1465px out. Every one of those is the dashboard
   * correctly drawing its EMPTY state, because Firestore had not answered inside the 2.6s settle.
   * The next run was 1 miss.
   *
   * The tell is that the empty states are structurally different elements, not missing ones: no
   * series means no `plot`, no tasks means no `todo-rule`. So the guard waits for the chart's
   * series specifically, rather than raising the blanket settle — a longer sleep costs every run
   * and still races on a slow one, where waiting for the thing itself cannot.
   */
  if (app) {
    const plotted = await page
      .waitForSelector('[data-probe="plot"]', { timeout: NAV_MS, state: "attached" })
      .then(() => true)
      .catch(() => false);
    if (!plotted) {
      throw new Error(
        "dash-refdiff: the app is signed in but the chart never drew a series — the account's data " +
        "had not arrived. This is a LOAD RACE, not a layout regression: re-run before believing " +
        "any miss from it. (If the harness account is genuinely empty, that is the thing to fix.)",
      );
    }
    /* one frame past the arrival, so the rows it brought have laid out */
    await page.waitForTimeout(400);
  }

  if (app) {
    const n = Object.keys(data.probes).length;
    const authForm = await page.locator("#au-email, #au-pw").count();
    if (authForm > 0 || n < 12) {
      throw new Error(
        `dash-refdiff: the app page is not the signed-in dashboard — ${n}/16 probes found` +
        `${authForm ? ", and the sign-in form is on screen" : ""}. Refusing to diff it.`,
      );
    }
  }
  /**
   * ⚠️ THE DUMP IS A SUBTREE, BECAUSE A DIFF ROW NAMES A BOX AND NEVER SAYS WHICH CHILD MOVED IT.
   * "plot y 199 to 213" is 14px of something ABOVE the plot inside a header the table has no row
   * for; the answer is always one level down, and reconstructing that by hand in a separate script
   * means rebuilding the sign-in, which is how a probe ends up measuring the auth page.
   *
   * SA_REFDIFF_DUMP=<probe> prints both sides child by child, offsets relative to the probe's own
   * box so the two are comparable when the boxes sit at different page positions. Wrapping is what
   * it is usually for, so flex-wrap and the computed gap are printed even where they are default.
   */
  /**
   * ⚠️ SA_REFDIFF_BANDS — THE ONE CHECK THE PROBE SET CANNOT MAKE. Every band's geometry can be
   * correct while the chart reads as one colour: a fade laid over the stack changes what the eye
   * gets and moves no box at all. This samples the plot's own PIXELS and asks whether the three
   * fills are still three.
   *
   * ⚠️ IT READS THE COMPOSITED PAGE, NOT THE FILL TOKENS. The tokens are what the fade is applied
   * TO, so checking them would confirm the input to the fault rather than the fault. The screenshot
   * goes back into the browser through a canvas because that is the only decoder to hand — and it
   * is the right one, since it is the same decoder that drew the page.
   */
  if (BANDS) {
    const plot = await page.locator('[data-probe="plot"]').first();
    const box = (await plot.count()) ? await plot.boundingBox() : null;
    if (!box) {
      console.log(`\nbands · ${app ? "APP" : "REF"}: no plot on this side`);
    } else {
      const png = (await page.screenshot({ clip: box })).toString("base64");
      const read = await page.evaluate(async (b64) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "data:image/png;base64," + b64; });
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const at = (fx, fy) => {
          const d = ctx.getImageData(Math.round(img.width * fx), Math.round(img.height * fy), 1, 1).data;
          return [d[0], d[1], d[2]];
        };
        /**
         * ⚠️ THE BANDS ARE FOUND, NOT GUESSED AT. A first version sampled three fixed heights and
         * reported a worst separation of ZERO on the REF — because at 93% of the plot's height the
         * ref draws card colour, not a band. Fixed fractions land wherever the stack happens to be
         * that day; a column scan finds the bands themselves.
         *
         * Walk each column from the baseline up, collect runs of near-identical colour, drop the
         * card's own paper and anything under 6px tall (the ink line, the gridlines, antialiasing),
         * and what is left is the stack.
         */
        const near = (a, b, tol) => Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2])) <= tol;
        const cardPx = (() => { const d = ctx.getImageData(2, 2, 1, 1).data; return [d[0], d[1], d[2]]; })();
        const out = [];
        for (const fx of [0.25, 0.5, 0.75]) {
          const x = Math.round(img.width * fx);
          const runs = [];
          let cur = null;
          for (let y = img.height - 2; y >= 0; y--) {
            const d = ctx.getImageData(x, y, 1, 1).data;
            const px = [d[0], d[1], d[2]];
            if (cur && near(px, cur.px, 2)) { cur.n++; continue; }
            if (cur) runs.push(cur);
            cur = { px, n: 1 };
          }
          if (cur) runs.push(cur);
          /**
           * ⚠️ CLUSTERED, BECAUSE A FADE MAKES ONE BAND READ AS SEVERAL RUNS. The first version
           * counted raw runs and found six or seven "bands" in a three-band chart, with separations
           * of 0 and 3 — every one of those a step of the GRADIENT inside a single fill, not a
           * boundary between fills. It was measuring the thing under test as if it were the fault.
           * Runs within 7 of each other are one fill seen at two depths of fade.
           */
          const kept = runs.filter((r) => r.n >= 5 && !near(r.px, cardPx, 4));
          const clusters = [];
          for (const r of kept) {
            const hit = clusters.find((c) => near(c.px, r.px, 7));
            if (hit) { hit.n += r.n; continue; }
            clusters.push({ px: r.px, n: r.n });
          }
          /* the three tallest are the stack; anything below 8px total is an edge artefact */
          const bands = clusters.filter((c) => c.n >= 8).sort((x, y) => y.n - x.n).slice(0, 3).map((c) => c.px);
          out.push({ fx, bands });
        }
        return { cardPx, out };      }, png);
      const spread = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      console.log(`\n--- bands · ${app ? "APP" : "REF"} · ${page.viewportSize().width} ---`);
      console.log(`  card ${read.cardPx.join(",")}`);
      let worst = Infinity;
      let fewest = Infinity;
      for (const r of read.out) {
        fewest = Math.min(fewest, r.bands.length);
        const seps = [];
        for (let i = 0; i < r.bands.length; i++) {
          for (let j = i + 1; j < r.bands.length; j++) seps.push(spread(r.bands[i], r.bands[j]));
          seps.push(spread(r.bands[i], read.cardPx));
        }
        if (seps.length) worst = Math.min(worst, Math.min(...seps));
        console.log(`  x=${r.fx}  ${r.bands.length} bands: ${r.bands.map((b) => b.join(",")).join("  |  ")}`);
        if (seps.length) console.log(`         separations: ${seps.join(" · ")}`);
      }
      console.log(`  bands found per column: >= ${fewest}`);
      console.log(`  WORST SEPARATION: ${worst}  (gate: >= 6 in at least one channel)`);
    }
  }
  if (SHOT) {
    const probe = DUMP || "main";
    const el = await page.locator(`[data-probe="${probe}"]`).first();
    const file = `${SHOT}/${probe}-${app ? "app" : "ref"}-${page.viewportSize().width}.png`;
    mkdirSync(SHOT, { recursive: true });
    if (await el.count()) await el.screenshot({ path: file });
    else await page.screenshot({ path: file });
    console.log(`shot: ${file}`);
  }
  if (DUMP) {
    const sub = await page.evaluate(
      (name) => {
        const root = document.querySelector(`[data-probe="${name}"]`);
        if (!root) return null;
        const rb = root.getBoundingClientRect();
        const rows = [];
        const walk = (el, depth) => {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || el.hasAttribute("hidden")) return;
          const r = el.getBoundingClientRect();
          const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
          rows.push({
            depth,
            name:
              el.tagName.toLowerCase() +
              (el.id ? "#" + el.id : "") +
              (cls ? "." + String(cls).trim().split(/\s+/).join(".") : ""),
            y: +(r.y - rb.y).toFixed(1),
            x: +(r.x - rb.x).toFixed(1),
            w: +r.width.toFixed(1),
            h: +r.height.toFixed(1),
            disp: cs.display,
            wrap: cs.flexWrap,
            gap: cs.gap,
            pad: cs.padding,
            text: el.children.length === 0 ? (el.textContent || "").trim().slice(0, 30) : "",
          });
          if (depth < 3) for (const c of el.children) walk(c, depth + 1);
        };
        walk(root, 0);
        return { w: +rb.width.toFixed(1), h: +rb.height.toFixed(1), rows };
      },
      DUMP,
    );
    console.log(`\n--- dump ${DUMP} · ${app ? "APP" : "REF"} ---`);
    if (!sub) console.log("  (no such probe on this side)");
    else {
      console.log(`  box ${sub.w}x${sub.h}`);
      for (const r of sub.rows) {
        const extra = [r.disp, r.wrap !== "nowrap" ? `wrap=${r.wrap}` : "", r.gap && r.gap !== "normal" ? `gap=${r.gap}` : "", `pad=${r.pad}`]
          .filter(Boolean)
          .join(" ");
        console.log(`  ${"  ".repeat(r.depth)}${r.name}  y=${r.y} h=${r.h} x=${r.x} w=${r.w}  ${extra}${r.text ? `  "${r.text}"` : ""}`);
      }
    }
  }
  return data;
}

/**
 * ⚠️ THE SIGN-IN IS `tests/e2e/measure.ts`'s, COPIED EXACTLY, INCLUDING THE RACE.
 * Checking `count()` straight after a `goto` reads a document the app has not rendered into yet, so
 * it always looks signed-out — and then signs in again on a route that redirects away from the form
 * when the session is live, and hangs until the timeout. Racing the shell against the form settles
 * it. This is a plain script rather than a Playwright test, so it cannot import that helper; the
 * duplication is deliberate and the reason is that a second, cleverer sign-in would be a second
 * thing to get wrong.
 *
 * ⚠️ AND `storageState` IS NOT ENOUGH HERE — Firebase's session lives in IndexedDB, which
 * `storageState` does not carry. Every measurement signs in. Two of this pass's own recon probes
 * were silently reading a SIGN-IN page because they trusted a saved state.
 */
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";

function envLocal(key) {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`).exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

async function signIn(page) {
  const settled = await Promise.race([
    page.locator(SHELL).first().waitFor({ state: "attached", timeout: 60000 }).then(() => "shell").catch(() => null),
    page.locator("#au-email").waitFor({ state: "attached", timeout: 60000 }).then(() => "form").catch(() => null),
  ]);
  if (settled === "shell") return;
  const pw = process.env.SA_E2E_PASSWORD || envLocal("SA_E2E_PASSWORD");
  if (!pw) throw new Error("No SA_E2E_PASSWORD — see tests/e2e/auth.setup.ts");
  await page.goto(`${APP}/#/signin`);
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL || envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 90000 });
  await page.goto(`${APP}/dashboard`, { waitUntil: "domcontentloaded" });
}

/* ── diffing ─────────────────────────────────────────────────────────────────────────────────── */

const rgb = (v) => (v || "").replace(/\s+/g, " ").trim();

/**
 * ⚠️ POSITION IS COMPARED RELATIVE TO `main`, NOT TO THE VIEWPORT — and this is a decision, not a
 * loosening. The ref never drew the app's nav: it has no rail and no bar, so its `main` starts at
 * the top of the window while the app's starts below a 77px control row the pack explicitly keeps
 * ("they are not in the ref because the ref did not draw the nav"). Comparing absolute `y` would
 * report that one fact as a miss on EVERY probe, at every width, forever — a number that can never
 * go to zero and tells you nothing about the design.
 *
 * ⚠️ `main` IS THE DATUM AND A DATUM IS NOT A SUBJECT. Its own box is REPORTED, never compared: its
 * y differs by the 77px control row the pack explicitly keeps, its height by the same, and its
 * width by the shell's gutters — three numbers that can never go to zero and that would sit in the
 * table forever teaching the reader to skip the first row. The table prints them so a silent shrink
 * is still visible; what is CHECKED is where things sit inside it, which is what a ref specifies.
 */
function diffOne(key, ref, app, refOrigin, appOrigin) {
  const misses = [];
  if (!ref) return [{ key, field: "ref", why: "the ref has no such probe" }];
  if (!app) return [{ key, field: "present", why: "the app renders no visible element for this probe" }];
  const anchor = ANCHOR[key] || "left";
  if (anchor === "datum") return misses;
  const off = (f, o) => (f === "x" ? o.x : f === "y" ? o.y : 0);
  const cmp = (field, rv0, av0, tol) => {
    const rv = Math.round(rv0 * 10) / 10, av = Math.round(av0 * 10) / 10;
    const d = Math.round((av - rv) * 10) / 10;
    if (Math.abs(d) > tol) misses.push({ key, field, ref: rv, app: av, delta: d, tol });
  };
  const near = (f, tol) => cmp(f, ref[f] - off(f, refOrigin), app[f] - off(f, appOrigin), tol);
  /* the right inset: how far the element's right edge sits from `main`'s */
  const rIn = (o, e) => o.x + o.w - (e.x + e.w);
  near("y", TOL.edge);
  if (anchor === "left") { near("x", TOL.edge); near("w", TOL.size); }
  else if (anchor === "right") { cmp("xr", rIn(refOrigin, ref), rIn(appOrigin, app), TOL.edge); near("w", TOL.size); }
  else { near("x", TOL.edge); cmp("xr", rIn(refOrigin, ref), rIn(appOrigin, app), TOL.edge); }
  near("h", TOL.size);
  for (const f of ["bg", "radius"]) {
    if (rgb(ref[f]) !== rgb(app[f])) misses.push({ key, field: f, ref: ref[f], app: app[f] });
  }
  /* the border is compared as a PAIR — a width difference is a real miss, and a colour difference
     only means anything where at least one side actually draws one */
  if (Math.abs(ref.borderTopW - app.borderTopW) > 0.5) {
    misses.push({ key, field: "borderW", ref: ref.borderTopW, app: app.borderTopW });
  } else if (ref.borderTopW > 0 && rgb(ref.borderTop) !== rgb(app.borderTop)) {
    misses.push({ key, field: "borderTop", ref: ref.borderTop, app: app.borderTop });
  }
  return misses;
}

function diffText(key, ref, app) {
  if (!ref) return [{ key, field: "ref", why: "the ref has no such text probe" }];
  if (!app) return [{ key, field: "present", why: "the app renders no visible element for this text probe" }];
  const m = [];
  if (ref.family !== app.family) m.push({ key, field: "family", ref: ref.family, app: app.family });
  if (Math.abs(ref.size - app.size) > TOL.font) m.push({ key, field: "size", ref: ref.size, app: app.size, tol: TOL.font });
  if (String(ref.weight) !== String(app.weight)) m.push({ key, field: "weight", ref: ref.weight, app: app.weight });
  if (rgb(ref.color) !== rgb(app.color)) m.push({ key, field: "color", ref: ref.color, app: app.color });
  return m;
}

/**
 * ⚠️ THE SCALE IS COMPARED FOR SIZE, FAMILY AND WEIGHT — and a row missing on ONE side is a miss,
 * not a skip. A skip is how a type gate quietly stops covering the treatment nobody rebuilt yet;
 * the two cases are named apart so the table says which.
 */
function diffScale(key, ref, app) {
  if (!ref && !app) return [{ key, field: "scale", why: "neither side has this treatment" }];
  if (!ref) return [{ key, field: "scale", why: "no element in the REF for this row" }];
  if (!app) return [{ key, field: "scale", why: "no element in the APP for this row" }];
  const m = [];
  if (Math.abs(ref.size - app.size) > TOL.font) {
    m.push({ key, field: "size", ref: ref.size, app: app.size, delta: Math.round((app.size - ref.size) * 10) / 10, tol: TOL.font });
  }
  if (ref.family !== app.family) m.push({ key, field: "family", ref: ref.family, app: app.family });
  if (String(ref.weight) !== String(app.weight)) m.push({ key, field: "weight", ref: ref.weight, app: app.weight });
  return m;
}

/**
 * ⚠️ THE STANDING GATES — five properties, run at every width, for the life of the dashboard.
 *
 * Each one encodes something that has regressed at least once, and in every case the gate that
 * failed to catch it was written against the visible SYMPTOM rather than the structural property:
 * "is the title on one line" while the controls wrapped beneath it; "is there exactly one search
 * control" while it sat in a row of its own. A symptom can be true while the thing it stands for
 * is false. A box's height cannot.
 *
 * ⚠️ THEY DO NOT ASK THE REF. Each is a claim about the app that holds whatever the ref happens to
 * draw — which is what makes them permanent rather than a v28 artefact.
 */
const STANDING = [
  { k: "navrowH", why: "the nav row is one row", test: (v) => v !== null && v <= 72, want: "<= 72px" },
  { k: "chartHeaderH", why: "the chart header is one row — a wrapped one is ~150px", test: (v) => v !== null && v <= 72, want: "<= 72px" },
  { k: "searchCount", why: "exactly one search control on the page", test: (v) => v === 1, want: "1" },
  { k: "illH", why: "the stat illustration has not been squashed", test: (v) => v !== null && v >= 70, want: ">= 70px" },
  { k: "statsVsGreet", why: "the stats sit on the greeting's line", test: (v) => v !== null && Math.abs(v) <= 20, want: "within 20px" },
];

function diffChecks(app) {
  const m = [];
  for (const g of STANDING) {
    const v = app.checks[g.k];
    if (!g.test(v)) m.push({ key: "standing", field: g.k, ref: g.want, app: v, why: g.why });
  }
  if (rgb(app.checks.ground) !== GROUND) {
    m.push({ key: "page", field: "ground", ref: GROUND, app: app.checks.ground });
  }
  if (app.checks.hScroll > 1) {
    m.push({ key: "page", field: "hScroll", ref: 0, app: app.checks.hScroll });
  }
  if (app.checks.columnSpread === null) {
    m.push({ key: "page", field: "columnBottoms", why: "fewer than two columns were visible" });
  } else if (app.checks.columnSpread > 1) {
    m.push({ key: "page", field: "columnBottoms", ref: "≤1", app: app.checks.columnSpread });
  }
  if (app.checks.transformedAncestors.length) {
    m.push({ key: "page", field: "blendAncestorTransform", app: app.checks.transformedAncestors.join(", ") });
  }
  return m;
}

/* ── the table ───────────────────────────────────────────────────────────────────────────────── */

function table(result) {
  const L = [];
  L.push(`# dash-refdiff · ${result.when}`);
  L.push("");
  L.push(`ref: \`${result.ref}\`  ·  app: \`${result.app}\``);
  L.push("");
  L.push("| probe | " + result.widths.map((w) => `${w}`).join(" | ") + " |");
  L.push("|---|" + result.widths.map(() => "---").join("|") + "|");
  const rows = [...PROBES, ...TEXT_PROBES.map((t) => `text:${t}`), ...TYPE_SCALE.map(([k]) => `type:${k}`), "page"];
  for (const p of rows) {
    const cells = result.widths.map((w) => {
      const misses = result.byWidth[w].misses.filter((m) => m.key === p || `text:${m.key}` === p);
      if (!misses.length) return "·";
      return misses.map((m) => (m.why ? m.why : `${m.field} ${m.ref}→${m.app}`)).join("<br>");
    });
    if (cells.every((c) => c === "·")) { L.push(`| ${p} | ${cells.join(" | ")} |`); continue; }
    L.push(`| **${p}** | ${cells.join(" | ")} |`);
  }
  /* ⚠️ THE DATUM IS REPORTED, NEVER COMPARED — see `diffOne`. Printing it is what stops "not
     compared" turning into "not looked at": a `main` that silently halved would show here. */
  L.push(`| _main (datum, not compared)_ | ` + result.widths.map((w) => {
    const r = result.byWidth[w].ref.probes.main, a = result.byWidth[w].app.probes.main;
    const f = result.byWidth[w].app.viewportFitted;
    return r && a
      ? `ref ${Math.round(r.w)}×${Math.round(r.h)} · app ${Math.round(a.w)}×${Math.round(a.h)}` +
        (f ? ` (window ${f.width}×${f.height})` : "")
      : "—";
  }).join(" | ") + " |");
  L.push("");
  L.push(result.widths.map((w) => `**${w}**: ${result.byWidth[w].misses.length} misses`).join("  ·  "));
  /* ⚠️ THE ALLOWANCES ARE PRINTED EVERY RUN. A forgiven difference that nobody can see is a
     forgiven difference nobody re-examines, and this table exists to be re-examined. */
  const allAllowed = result.widths.flatMap((w) => (result.byWidth[w].allowed ?? []).map((m) => [w, m]));
  if (allAllowed.length) {
    L.push("");
    L.push(`**Allowed (${allAllowed.length}), not counted:**`);
    const seen = new Set();
    for (const [, m] of allAllowed) {
      const id = `${m.key}.${m.field}`;
      if (seen.has(id)) continue;
      seen.add(id);
      L.push(`- \`${m.key}\` ${m.field} — ${m.allowance}`);
    }
  }
  L.push("");
  L.push(`**total misses: ${result.total}**`);
  return L.join("\n");
}

/* ── run ─────────────────────────────────────────────────────────────────────────────────────── */

const browser = await chromium.launch();
const result = { when: new Date().toISOString(), ref: "design-refs/dashboard-cappuccino-v28.html", app: APP, widths: WIDTHS, byWidth: {}, total: 0 };
let selfTestSaw = null;

try {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1 });
    const refPage = await ctx.newPage();
    const refData = await readPage(refPage, pathToFileURL(REF).href);

    /* ⚠️ THE SELF-TEST BREAKS THE REF'S GEOMETRY, NOT THE APP'S — so the miss it produces is
       unmistakably the harness's own doing and cannot be confused for a real difference. */
    if (SELF_TEST) {
      await refPage.evaluate(() => {
        const el = document.querySelector("[data-probe='chart-card']");
        if (el) el.style.width = `${el.getBoundingClientRect().width - 40}px`;
      });
      const broken = await refPage.evaluate(READ);
      /* the self-test compares the ref against itself, so the datum is the SAME `main` on both
         sides — which is what makes a 40px shrink show up as a right-inset miss under `span`. */
      const sO = refData.probes.main ?? { x: 0, y: 0, w: 0 };
      selfTestSaw = diffOne("chart-card", broken.probes["chart-card"], refData.probes["chart-card"], sO, sO);
    }

    const appPage = await ctx.newPage();
    let appData = await readPage(appPage, `${APP}/dashboard`, { app: true });

    /**
     * ⚠️ THE APP IS RE-READ IN A WINDOW THAT GIVES IT THE REF'S OWN CONTENT BOX, AND THIS IS A
     * DATUM DECISION RATHER THAN A TOLERANCE.
     *
     * Both grids are viewport-driven — the ref's `.grid3` is `min-height: calc(100vh - 176px)` and
     * the app's fills what the shell leaves it. The app's shell spends 84px at 1456 on a control
     * row the pack explicitly keeps ("they are not in the ref because the ref did not draw the
     * nav"), so its content box is 84px shorter and every card with any flex in it absorbs a share.
     * Measured before this: the chart card 52px short, goals 78px short, and a `y` miss on every
     * probe beneath either of them — nine numbers reporting one fact, none of them fixable, and all
     * of them room for a real height fault to hide in.
     *
     * The same holds across: the app's `main` is 1650 wide at 1920 where the ref's is 1634, so its
     * elastic middle track is 16px wider and anything whose HEIGHT derives from its width — the plot
     * has the ref's 1000:330 ratio — is then wrong in the other axis too.
     *
     * ⚠️ WHAT MOVES IS THE WINDOW, NOT A TOLERANCE, AND IT MOVES BY A MEASURED DIFFERENCE RATHER
     * THAN A CHOSEN ONE. The pack's three widths are the design intent and they are unchanged; the
     * app is simply given a window in which the box the design describes is the same size on both
     * sides. Both deltas stay inside the same media-query regime at all three widths (16px at 1920
     * does not cross 1700), so the app is measured in the layout the width names. A card that is
     * genuinely the wrong height still fails, which is the test of whether this is a datum or a
     * fudge — and the self-test proves that on every run.
     */
    const rM = refData.probes.main, aM = appData.probes.main;
    const dw = rM && aM ? Math.round(rM.w - aM.w) : 0;
    const dh = rM && aM ? Math.round(rM.h - aM.h) : 0;
    if (Math.abs(dw) > 1 || Math.abs(dh) > 1) {
      const fit = await browser.newContext({
        viewport: { width: width + dw, height: HEIGHT + dh }, deviceScaleFactor: 1,
      });
      const fitPage = await fit.newPage();
      appData = await readPage(fitPage, `${APP}/dashboard`, { app: true });
      appData.viewportFitted = { dw, dh, width: width + dw, height: HEIGHT + dh };
      await fit.close();
    }

    const misses = [];
    /* the datum: each side's own `main`. Absent on either side and the comparison falls back to
       the viewport, which is honest — a page with no `main` has bigger problems than an offset. */
    const rO = refData.probes.main ?? { x: 0, y: 0, w: 0 };
    const aO = appData.probes.main ?? { x: 0, y: 0, w: 0 };
    for (const k of PROBES) misses.push(...diffOne(k, refData.probes[k], appData.probes[k], rO, aO));
    for (const k of TEXT_PROBES) misses.push(...diffText(k, refData.text[k], appData.text[k]));
    for (const [k] of TYPE_SCALE) misses.push(...diffScale(`type:${k}`, refData.scale[k], appData.scale[k]));
    misses.push(...diffChecks(appData));

    /* ⚠️ PARTITIONED, NOT FILTERED. An allowed difference stays in the record and is printed; what
       it does not do is count. A filter here would delete the evidence that the gate is forgiving
       anything at all, which is how an allowance becomes invisible and then becomes permanent. */
    const allowed = [];
    const counted = [];
    for (const m of misses) {
      const a = allowedBy(m, refData, appData);
      if (a) allowed.push({ ...m, allowance: a.why });
      else counted.push(m);
    }
    result.byWidth[width] = { ref: refData, app: appData, misses: counted, allowed };
    result.total += counted.length;
    await ctx.close();
    process.stdout.write(`  ${width}: ${counted.length} misses` + (allowed.length ? ` (+${allowed.length} allowed)` : "") + "\n");
  }
} finally {
  await browser.close();
}

if (SELF_TEST) {
  /* ⚠️ THE CLAIM IS "A 40px BREAK IS SEEN AS 40px", NOT "A FIELD CALLED `w` IS REPORTED".
     This asserted the field NAME and went red the day `chart-card` became a `span` probe, where a
     width break is reported as a right-inset — the break was caught, in the right size, and the
     self-test called the harness untrustworthy over the spelling of the column heading. */
  const ok = Array.isArray(selfTestSaw) && selfTestSaw.some((m) => Math.abs(Math.abs(m.delta ?? 0) - 40) < 2);
  console.log(`\nself-test: a 40px width break on chart-card ${ok ? "WAS" : "was NOT"} reported`);
  if (!ok) { console.error("✗ the harness did not report a break it was shown. It cannot be trusted."); process.exit(2); }
  console.log("✓ the harness reports a miss it should. Discarding the break.");
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
const md = table(result);
writeFileSync(OUT.replace(/\.json$/, ".md"), `${md}\n`);
console.log(`\n${md}\n`);
console.log(`written: ${OUT}`);
process.exit(result.total === 0 ? 0 : 1);
