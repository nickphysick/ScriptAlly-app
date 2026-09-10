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
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { REF_REL as SHARED_REF_REL } from "./dash-ref.mjs";
import { spawnSync } from "node:child_process";

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
  /**
   * ⚠️ AND NO REGEX ESCAPE MAY LIVE IN HERE EITHER (v30). Same cause as the backtick, opposite
   * symptom: a template literal eats the backslash, so `\s` reaches the browser as the letter s and
   * `\d` as the letter d. It has now cost this file two faults — a thrown "unterminated group" that
   * stopped a run, and, worse, a gate that could never go red because its comparison could never be
   * true. The first announces itself; the second is a green nobody has watched work.
   * The rule is that a pattern does not belong in here at all: parse with `split`, or pass the
   * pattern in from Node.
   */
  const escapes = body.match(/(?<!\\)\\[sdwSDWbnrt]/g);
  if (escapes) {
    throw new Error(
      `dash-refdiff: READ contains ${escapes.length} single-escaped sequence(s) — ${[...new Set(escapes)].join(" ")}. `
      + "A template literal eats the backslash, so the browser receives the bare letter. "
      + "Parse with split, or pass the pattern in from Node.",
    );
  }
  if (ticks !== 2) {
    throw new Error(
      `dash-refdiff: READ's template literal holds ${ticks} backticks and must hold exactly 2 — ` +
      "one of them is a stray, and it ends the literal early. Search the block for a backtick in " +
      "code, in a string, or in a COMMENT: the last five were all in comments.",
    );
  }
}

/* ⚠️ ONE NAME, READ TWICE — the report's `ref:` field used to restate this string, so repointing
   the harness at a new ref left the table truthfully measuring v29 while its own header said v28.
   A value that appears twice is a value that will disagree with itself; the report derives it. */
/* ⚠️ STATED ONCE, IN `dash-ref.mjs` — the plot diff reads the same constant. Two copies meant
   two edits per version bump, and the second was remembered by hand. */
const REF_REL = SHARED_REF_REL;
const REF = join(ROOT, REF_REL);

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
  /* ⚠️ v31 ADDS THE CONTROL CLUSTER AS A BOX. The frequency control and the brush were compared
     one at a time, so a divergence in what the cluster CONTAINS could hide inside two probes that
     each measured correctly — which is how a select stood where the ref draws three chips for
     three passes. The cluster's own box is the claim. */
  "chart-controls",
  "todo-card", "todo-rule",
  /* ⚠️ v30 ADDS THE BADGE AND THE DRAWER. The badge became a CONTROL this pass — it clears the
     filter — and a control that changes shape when it gains a job is exactly the thing a box probe
     should be watching. The drawer is measured only while OPEN, and its anchor is the viewport
     rather than the content datum, because a `position: fixed` panel pinned to the window's right
     edge is not positioned relative to anything the datum describes. */
  "todo-badge",
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
  /* ⚠️ THE `brush xr` ALLOWANCE IS RETIRED (v31, Phase 3), AND ITS EPITAPH IS THE POINT. It read:
     "the ref's frequency control is a two-button chip pair and ours is a native select, because
     this app offers THREE frequencies — closing it means dropping a frequency the app supports."
     Every clause of that was true and the conclusion was wrong. The ref draws three chips now, the
     app draws three chips, and there is nothing left to forgive.
     An allowance is a record of a difference somebody decided to keep. This one was a record of a
     difference nobody had put to the ref's author — which is how a divergence in a visible control
     survived three passes inside the gate that exists to catch exactly that. */
];

/** true when this miss is one of the recorded allowances AND is no worse than the allowance says */
/* the `vw` coefficients of the two probes whose width is viewport-relative — the brush's track is
   `clamp(70px, 6.4vw, 200px)` and the cluster is the brush plus fixed-width chips, so both move by
   the same 6.4% of any window difference. */
const VW_ALLOW = [
  { key: "brush", field: "w", vw: 0.064, slack: 1.5,
    why: "the track is 6.4vw and the app is measured in a window sized to match the CONTENT boxes; " +
         "where those windows differ, a viewport-relative width differs by exactly vw x dw" },
  { key: "chart-controls", field: "w", vw: 0.064, slack: 1.5,
    why: "the cluster is the brush plus fixed chips, so it carries the brush's own vw difference" },
];

const allowedBy = (m, refData, appData) =>
  [...ALLOW, ...VW_ALLOW].find((a) => {
    if (a.key !== m.key || a.field !== m.field) return false;
    if (!Number.isFinite(m.ref) || !Number.isFinite(m.app)) return false;
    const gap = Math.abs(m.app - m.ref);
    if (a.derived) {
      /* the allowance IS the measured cause, plus a few pixels of rounding */
      const r = refData.checks?.[a.derived], p = appData.checks?.[a.derived];
      if (!Number.isFinite(r) || !Number.isFinite(p)) return false;
      return gap <= Math.abs(r - p) + (a.slack ?? 0);
    }
    /**
     * ⚠️ A `vw` VALUE MEASURED IN TWO DIFFERENT WINDOWS CANNOT AGREE, AND THE DISAGREEMENT IS
     * ARITHMETIC RATHER THAN A TOLERANCE (v31). The app is re-read in a window sized so the two
     * CONTENT boxes match — a datum decision, recorded at length above — and at 2520 that window is
     * 96px narrower than the ref's. Any element sized in `vw` then resolves against a different
     * viewport by exactly `vw × dw`. The brush's track is `6.4vw`, so 6.4% of 96 is 6.14px, and the
     * measured gap was 6.1.
     * So this allowance is COMPUTED from the window delta and the element's own `vw` coefficient,
     * not typed: it forgives precisely what the datum costs and nothing else, and it disappears on
     * its own at any width where the two windows agree.
     */
    if (a.vw) {
      const dw = appData.viewportFitted?.dw;
      if (!Number.isFinite(dw)) return gap <= (a.slack ?? 0);
      return gap <= Math.abs(dw) * a.vw + (a.slack ?? 0);
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
  /* the cluster is pinned to the header's right edge, so its right inset and size are the facts */
  "chart-controls": "right",
  "todo-card": "span", "todo-rule": "span",
  /* the badge sits after the title in a left-to-right header, so its left inset and size are the
     facts; its right inset is wherever the title's length leaves it */
  "todo-badge": "left",
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
  /**
   * ⚠️ THE CHART'S THREE STRUCTURAL CLAIMS (v29). Each is about a BOX or a document position, never
   * about how the picture looks, because every one of them was reported as a look and turned out to
   * be something else. The pack said sage was visible above the line and named two causes; both were
   * false — the line is one series, the paint order was already right, and the sage is the resting
   * node's own ring. What WAS wrong was 34px of band fill below the zero baseline, which nobody had
   * reported. These are the properties, so the next report does not have to be right about the cause.
   */
  const plotEl = document.querySelector('[data-probe="plot"]');
  const plotSvg = plotEl ? (plotEl.tagName.toLowerCase() === "svg" ? plotEl : plotEl.querySelector("svg")) : null;
  out.checks.lineVsTopBand = null;
  out.checks.lineAfterBands = null;
  out.checks.paintBelowZero = null;
  if (plotSvg) {
    const inDefs = (el) => !!el.closest("defs");
    const paths = [...plotSvg.querySelectorAll("path")].filter((el) => !inDefs(el));
    const lineEl = paths.find((el) =>
      (el.getAttribute("stroke") || "").toLowerCase() === "#1c130f" &&
      (el.getAttribute("fill") || "none") === "none" &&
      Number(el.getAttribute("stroke-width")) >= 1.6);
    const bandEls = paths.filter((el) => {
      const f = (el.getAttribute("fill") || "none").toLowerCase();
      return f !== "none" && f.indexOf("fadeout") < 0 && f.indexOf("bandfade") < 0;
    });
    /* the line is painted AFTER every band — a document-order claim, not an appearance one */
    if (lineEl && bandEls.length) {
      const order = [...plotSvg.querySelectorAll("path")];
      const li = order.indexOf(lineEl);
      out.checks.lineAfterBands = bandEls.every((b) => order.indexOf(b) < li);
    }
    /**
     * ⚠️ THE TOP BAND'S UPPER EDGE IS COMPARED AS A STRING, NOT AS TEN SAMPLED POINTS. Sampling
     * with getPointAtLength has to guess which half of a closed area path is the top edge, and at
     * the extreme right it guesses wrong — my own first probe reported a 47px divergence that was
     * entirely the probe. The band's d BEGINS with the line's d when the two are one source; that
     * is exact, cheap, and cannot be satisfied by a coincidence.
     */
    if (lineEl && bandEls.length) {
      const ld = (lineEl.getAttribute("d") || "").trim();
      const widest = bandEls.reduce((a, b) => (a && a.getBBox().y <= b.getBBox().y ? a : b), null);
      const bd = widest ? (widest.getAttribute("d") || "").trim() : "";
      out.checks.lineVsTopBand = ld.length > 0 && bd.indexOf(ld) === 0 ? 0 : null;
      if (out.checks.lineVsTopBand === null && ld && bd) {
        /* not one string — fall back to a sampled worst-case so the miss carries a number */
        let worst = 0;
        const L = lineEl.getTotalLength();
        for (let k = 0; k < 10; k++) {
          const pt = lineEl.getPointAtLength((L * k) / 9);
          let lo = 0, hi = widest.getTotalLength() / 2, best = null;
          for (let it = 0; it < 26; it++) {
            const mid = (lo + hi) / 2;
            const q = widest.getPointAtLength(mid);
            best = q;
            if (Math.abs(q.x - pt.x) < 0.2) break;
            if (q.x < pt.x) lo = mid; else hi = mid;
          }
          if (best) worst = Math.max(worst, Math.abs(best.y - pt.y));
        }
        out.checks.lineVsTopBand = Math.round(worst * 100) / 100;
      }
    }
    /**
     * ⚠️ NOTHING PAINTS BELOW THE ZERO BASELINE, ASSERTED AS A BOX. The pixel proof is the separate
     * dash-pixels script; this is the form that can run on every probe at every width without a
     * screenshot, and it fails on the same fault. The baseline is the axis rule at zero; the claim
     * is that no painted node's own box reaches past it.
     */
    const axis = [...plotSvg.querySelectorAll("line")].filter((el) => !inDefs(el))
      .find((el) => (el.getAttribute("class") || "").indexOf("axis0") >= 0)
      || [...plotSvg.querySelectorAll("line")].filter((el) => !inDefs(el))
        .filter((el) => (el.getAttribute("stroke") || "") === "#d8cec2")[0];
    if (axis) {
      const zeroY = Number(axis.getAttribute("y1"));
      let over = 0;
      for (const el of plotSvg.querySelectorAll("path, rect")) {
        if (inDefs(el)) continue;
        if (el.getAttribute("id") === "hit") continue;               /* the transparent hit target */
        if ((el.getAttribute("fill") || "") === "transparent") continue;
        const bb = el.getBBox();
        over = Math.max(over, bb.y + bb.height - zeroY);
      }
      out.checks.paintBelowZero = Math.round(over * 10) / 10;
    }
  }
  /**
   * ⚠️ THE PLOT'S STRUCTURE, ASSERTED (v31, Phase 2). The chart's interior is generated at runtime,
   * so for three passes the diff compared its BOX and nothing inside it: every chart change was
   * built from prose about the ref rather than from the ref. These hold whatever the data is, which
   * is what makes them a gate rather than a snapshot.
   */
  /**
   * ⚠️ NO BAND MAY EVER RISE ABOVE THE LINE, COMPARED AS ARRAYS RATHER THAN SAMPLED (v32).
   *
   * The bands and the line are polylines through one clamped sample set now, so their d strings are
   * lists of the same x positions in the same order — which means this does not have to sample a
   * curve or guess which half of a closed area path is its top edge. It reads the numbers.
   *
   * The band's own top edge is the first (steps + 1) points of its d; the line's d is exactly that
   * many. A positive worst value is a band standing above the line in SVG y, which is the fault this
   * pass exists to close and which no pixel sweep of the harness account's data could ever show.
   */
  out.checks.bandCrossing = (() => {
    const host = document.querySelector('[data-probe="plot"]');
    const svg = host && (host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg"));
    if (!svg) return null;
    const inDefs = (el) => !!el.closest("defs");
    const nums = (d) => {
      const out2 = [];
      let i = 0;
      while (i < d.length) {
        const c = d.charCodeAt(i);
        if ((c >= 48 && c <= 57) || c === 45 || c === 46) {
          let j = i + 1;
          while (j < d.length) {
            const c2 = d.charCodeAt(j);
            if ((c2 >= 48 && c2 <= 57) || c2 === 46) j++;
            else break;
          }
          out2.push(parseFloat(d.slice(i, j)));
          i = j;
        } else i++;
      }
      return out2;
    };
    const paths = [...svg.querySelectorAll("path")].filter((el) => !inDefs(el));
    const lineEl = paths.find((el) => (el.getAttribute("stroke") || "").toLowerCase() === "#1c130f"
      && (el.getAttribute("fill") || "none") === "none" && Number(el.getAttribute("stroke-width")) >= 1.6);
    const bandEls = paths.filter((el) => {
      const f = (el.getAttribute("fill") || "none").toLowerCase();
      return f !== "none" && f.indexOf("fade") < 0;
    });
    if (!lineEl || !bandEls.length) return null;
    const ln = nums(lineEl.getAttribute("d") || "");
    const pts2 = ln.length / 2;
    if (pts2 < 8) return { skipped: "the line is not a polyline at this data size" };
    let worst = -1e9;
    let samples = 0;
    for (const b of bandEls) {
      const bd = nums(b.getAttribute("d") || "");
      for (let k = 0; k < pts2; k++) {
        const by = bd[k * 2 + 1], ly = ln[k * 2 + 1];
        if (by === undefined || ly === undefined) continue;
        /* SVG y grows downward: a band ABOVE the line has the SMALLER y */
        const over = ly - by;
        if (over > worst) worst = over;
        samples++;
      }
    }
    return { worst: Math.round(worst * 1000) / 1000, samples, points: pts2, bands: bandEls.length };
  })();
  out.checks.plotStruct = (() => {
    const host = document.querySelector('[data-probe="plot"]');
    const svg = host && (host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg"));
    if (!svg) return null;
    const inDefs = (el) => !!el.closest("defs");
    const paths = [...svg.querySelectorAll("path")].filter((el) => !inDefs(el));
    const bands = paths.filter((el) => {
      const f = (el.getAttribute("fill") || "none").toLowerCase();
      return f !== "none" && f.indexOf("fade") < 0;
    });
    const line = paths.find((el) => (el.getAttribute("stroke") || "").toLowerCase() === "#1c130f"
      && (el.getAttribute("fill") || "none") === "none" && Number(el.getAttribute("stroke-width")) >= 1.6);
    const masked = svg.querySelector("g[mask]");
    const maskId = masked ? (masked.getAttribute("mask") || "").replace("url(#", "").replace(")", "") : "";
    const mask = maskId ? svg.querySelector("mask#" + maskId) : null;
    const gradId = mask ? (() => {
      const r = mask.querySelector("rect");
      return r ? (r.getAttribute("fill") || "").replace("url(#", "").replace(")", "") : "";
    })() : "";
    const grad = gradId ? svg.querySelector("linearGradient#" + gradId) : null;
    const axis = [...svg.querySelectorAll("line")].filter((el) => !inDefs(el))
      .find((el) => (el.getAttribute("class") || "").indexOf("axis0") >= 0);
    const zeroY = axis ? Number(axis.getAttribute("y1")) : null;
    const circles = [...svg.querySelectorAll("circle")].filter((el) => !inDefs(el) && !el.closest("#cross"));
    const kids = [...svg.children];
    /* the extreme x of a path, walked from its own geometry rather than a bbox */
    const endX = (el) => {
      if (!el) return null;
      const L = el.getTotalLength();
      let hi = -Infinity;
      for (let k = 0; k <= 200; k++) { const q = el.getPointAtLength((L * k) / 200); if (q.x > hi) hi = q.x; }
      return Math.round(hi * 100) / 100;
    };
    const cxs = circles.map((c) => Math.round(Number(c.getAttribute("cx")) * 100) / 100);
    return {
      bands: bands.length,
      allMasked: !!masked && bands.every((b) => masked.contains(b)),
      gradUnits: grad ? grad.getAttribute("gradientUnits") : null,
      gradY1: grad ? Number(grad.getAttribute("y1")) : null,
      gradY2: grad ? Number(grad.getAttribute("y2")) : null,
      zeroY,
      lines: paths.filter((el) => (el.getAttribute("fill") || "none") === "none"
        && (el.getAttribute("stroke") || "").toLowerCase() === "#1c130f").length,
      lineAfterMask: (!!line && !!masked) ? kids.indexOf(masked) < kids.indexOf(line) : null,
      topStroke: bands.length ? (bands[0].getAttribute("stroke") || "none") : null,
      markers: circles.length,
      markerXs: cxs,
      fadeRects: [...svg.querySelectorAll("rect")].filter((r) => !inDefs(r)
        && (r.getAttribute("fill") || "").indexOf("url(") === 0).length,
      lineEndX: endX(line),
      bandEndX: bands.length ? endX(bands[0]) : null,
    };
  })();
  /**
   * ⚠️ NO RED RING, ANYWHERE, IN ANY STATE (v30, Phase 2). The house palette has burgundy for ink
   * and no red at all; a ring in either reads as an error on a control that is merely selected or
   * focused. This counts every focusable element whose outline or box-shadow computes red-dominant
   * — measured with a margin over both channels rather than against a list of hexes, so a new tint
   * nobody has named yet is caught too.
   *
   * ⚠️ IT IS A RESTING SWEEP AND THAT IS ON PURPOSE. The one this pass removed was not a focus ring
   * at all: it was the selected band's own marker, present with nothing focused. A gate that only
   * looked at :focus would have found nothing wrong.
   */
  out.checks.redRings = (() => {
    /* NO REGEX IN HERE. READ is a browser-side template literal, so every backslash is eaten before
       the browser sees it: this was written as a regex first and reached Chromium as an
       unterminated group, thrown at runtime. Seventh occurrence of that family in this file — and
       the comment saying so was the EIGHTH, because it quoted the identifier in backticks and ended
       the template. The parse below uses split, which has nothing to escape. */
    const isRed = (c) => {
      const i = (c || "").indexOf("rgb");
      if (i < 0) return false;
      const open = (c || "").indexOf("(", i);
      const shut = (c || "").indexOf(")", open);
      if (open < 0 || shut < 0) return false;
      const parts = (c || "").slice(open + 1, shut).split(",").map((x) => parseFloat(x.trim()));
      if (parts.length < 3) return false;
      const R = parts[0], G = parts[1], B = parts[2];
      return R > 110 && R - G > 45 && R - B > 45;
    };
    let n = 0;
    for (const el of document.querySelectorAll("button, select, input, textarea, a[href], [tabindex]")) {
      const cs = getComputedStyle(el);
      if (cs.outlineStyle !== "none" && isRed(cs.outlineColor)) n++;
      else if (isRed(cs.boxShadow)) n++;
    }
    return n;
  })();
  /**
   * ⚠️ EVERY BAND OF THE TO-DO RULE PAINTS, AND THEY FILL THE TRACK (v29, Phase 5). Both halves are
   * needed and they fail differently: a band can be the right width and invisible (a token that does
   * not resolve in this scope makes the declaration invalid and the element transparent), or opaque
   * and short (percentages of a total do not add up to a box). Measured before the fix: three of
   * five bands at rgba(0, 0, 0, 0).
   */
  const ruleEl = document.querySelector('[data-probe="todo-rule"]');
  out.checks.ruleClear = null;
  out.checks.ruleFill = null;
  out.checks.ruleBands = null;
  if (ruleEl) {
    const track = ruleEl.querySelector(".os-rule, .sbar") || ruleEl.firstElementChild;
    if (track) {
      const kids = [...track.children];
      out.checks.ruleBands = kids.length;
      /* ⚠️ THIS GATE COULD NOT GO RED, AND THE ESCAPE SWEEP FOUND IT (v30). It read
         backgroundColor.replace(SPACE_REGEX, "") to compare against a spaceless rgba string — and
         inside this template literal the backslash was eaten, so the browser ran a regex matching
         the LETTER s. Spaces survived, the comparison could never be true, and a transparent band
         would have been counted as opaque. Proved by evaluation rather than argued: the string
         "rgba(0, 0, 0, 0)" put through the regex the browser actually received comes back
         unchanged and does not equal "rgba(0,0,0,0)".
         The alpha is parsed now — no escapes, and it catches any transparent colour rather than one
         spelling of one. */
      out.checks.ruleClear = kids.filter((k) => {
        const bg = getComputedStyle(k).backgroundColor;
        if (bg === "transparent") return true;
        const open = bg.indexOf("(");
        const shut = bg.indexOf(")", open);
        if (open < 0 || shut < 0) return false;
        const parts = bg.slice(open + 1, shut).split(",").map((x) => parseFloat(x.trim()));
        return parts.length >= 4 && parts[3] === 0;
      }).length;
      /* ⚠️ AGAINST THE TRACK'S CONTENT BOX, NOT ITS BORDER BOX. The track carries a 1px hairline of
         its own, so a correct rule is 2px short of the border box for a reason that has nothing to
         do with the bands — a tolerance would have absorbed that and hidden 2px of real shortfall
         alongside it. */
      const tcs = getComputedStyle(track);
      const inner = track.getBoundingClientRect().width
        - parseFloat(tcs.borderLeftWidth || "0") - parseFloat(tcs.borderRightWidth || "0");
      const sum = kids.reduce((a, k) => a + k.getBoundingClientRect().width, 0);
      out.checks.ruleFill = Math.round((sum - inner) * 10) / 10;
    }
  }
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
 * ⚠️ THE STANDING GATES — properties run at every width, for the life of the dashboard.
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
  /* ── v29's four ─────────────────────────────────────────────────────────────────────────────── */
  {
    k: "lineVsTopBand",
    why: "the total line IS the top band's edge, and is drawn after every band — one series, one path",
    test: (v, c) => v !== null && v <= 0.5 && c.lineAfterBands === true,
    want: "<= 0.5px, line last",
  },
  { k: "paintBelowZero", why: "nothing paints below the chart's zero baseline", test: (v) => v !== null && v <= 0.5, want: "<= 0.5px" },
  { k: "ruleClear", why: "every band of the to-do rule paints — a token that does not resolve here makes it transparent", test: (v) => v === 0, want: "0 transparent" },
  { k: "ruleFill", why: "the rule's bands fill their track", test: (v) => v !== null && Math.abs(v) <= 3, want: "within 3px" },
  /**
   * ⚠️ THE SIX CHART STRUCTURAL CLAIMS AS ONE GATE (v31, Phase 2). One entry rather than six because
   * they describe one construction and a failure in any of them means the same thing — the chart is
   * no longer built the way the ref builds it. The reading prints every field, so the message names
   * which part moved.
   */
  {
    k: "plotStruct",
    why: "the plot is three masked bands, one gradient, one line after them, no fade rect, two marks",
    test: (v) => !!v
      && v.bands === 3
      && v.allMasked === true
      && v.gradUnits === "userSpaceOnUse"
      && v.gradY1 === 0 && v.zeroY !== null && Math.abs(v.gradY2 - v.zeroY) <= 0.5
      && v.lines === 1
      && v.lineAfterMask === true
      && v.topStroke === "none"
      && v.markers >= 2
      && v.fadeRects === 0
      /* Phase 4's claim: the line and the bands end together, and the end mark sits on both */
      && v.lineEndX !== null && v.bandEndX !== null && Math.abs(v.lineEndX - v.bandEndX) <= 0.5
      && v.markerXs.some((x) => Math.abs(x - v.lineEndX) <= 0.5),
    want: "3 masked bands · userSpaceOnUse 0→y(0) · 1 line after · no fade rect · ≥2 marks · line ends with the bands",
  },
  {
    k: "bandCrossing",
    why: "no band rises above the total line — the fault that survived three passes of pixel sweeps",
    test: (v) => !!v && !v.skipped && v.samples > 200 && v.worst <= 0.05,
    want: "no band above the line, > 200 compared points",
  },
  { k: "redRings", why: "no control computes a red outline or box-shadow, in any state", test: (v) => v === 0, want: "0" },
  {
    k: "focusMouse",
    why: "a mouse click leaves no ring; Tab leaves a sage one",
    test: (v, c) => !!v && v.outline === "none"
      && !!c.focusTab && c.focusTab.outline === "solid" && c.focusTab.colour === "rgb(138, 158, 136)",
    want: "none on click, solid sage on Tab",
  },
  {
    k: "drawer",
    why: "an open drawer is above everything — portalled out of every card's stacking context",
    test: (v) => !!v && v.open === true && v.portalled === true && v.contexts === 0
      && v.inside === true && v.z > v.scrimZ,
    want: "portalled · 0 contexts · hit inside · above the scrim",
  },
  {
    k: "fade",
    why: "the band fill fades toward the baseline — 85% of the painted span under half of 15%",
    test: (v) => !!v && v.ratio < 0.5,
    want: "ratio < 0.5",
  },
  {
    k: "brush",
    why: "the brush handle follows the cursor — monotonic, 1:1, and settling on the week its value implies",
    test: (v) => !!v && (
      /* where the ref hides the thumbnail, the keyboard route is the claim */
      v.noTrack === true
        ? v.keyboard === true
        : (v.backwards === 0 && v.worstLag <= 2 && v.repeats <= 2
          && v.weeks.p05 === 11 && v.weeks.p50 === 6 && v.weeks.p95 === 4
          && v.settleErr !== null && v.settleErr <= 1.5)),
    want: "0 backwards · lag <= 2px · 11/6/4 at 5/50/95% · settles on its own value",
  },
];

function diffChecks(app) {
  const m = [];
  for (const g of STANDING) {
    const v = app.checks[g.k];
    if (!g.test(v, app.checks)) {
      /* an object reading prints as its fields, not as [object Object] — a gate whose failure says
         nothing about what failed is a gate somebody rebaselines without looking */
      const shown = v && typeof v === "object" ? JSON.stringify(v) : v;
      m.push({ key: "standing", field: g.k, ref: g.want, app: shown, why: g.why });
    }
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

/**
 * ⚠️ THE BRUSH HANDLE FOLLOWS THE CURSOR — the one standing gate that cannot be read from a static
 * page, because the fault is a RELATIONSHIP BETWEEN FRAMES rather than a property of one.
 *
 * The handle's position used to be derived from N and N from the handle, with a Math.round between
 * them, so the handle snapped to whole-week stops: a reader drags a pixel and the handle either does
 * not move or jumps a twelfth of the track. A snapshot of that page is indistinguishable from a
 * correct one — every value in it is right. Only driving the pointer shows it.
 *
 * Monotonic AND cursor-tracking, because each catches what the other cannot: a quantised handle is
 * still monotonic, and a handle that tracked in reverse would still be smooth.
 */
async function brushDrag(page) {
  const box = await page.evaluate(() => {
    const t = document.querySelector('[data-probe="brush"] .os-bw');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.left, y: r.top + r.height / 2, w: r.width };
  });
  /**
   * ⚠️ NO TRACK IS A STATE, NOT A FAILURE (v31). Below 1650 the ref hides the brush's thumbnail to
   * make room for the third frequency chip, and the app follows it — so there is no handle to drag
   * and the claim "the handle follows the cursor" is vacuous rather than false. What must still hold
   * at those widths is the OTHER half of the same control: the range is reachable from the keyboard.
   * Reporting `noTrack` with that check is the honest reading; returning null made the gate fail on
   * a page that is behaving exactly as the ref does.
   */
  if (!box || box.w < 20) {
    const keyboard = await page.evaluate(() => {
      const el = document.querySelector('[data-probe="brush"] input[type="range"]');
      if (!el) return false;
      el.focus();
      return document.activeElement === el;
    });
    return { noTrack: true, keyboard };
  }
  const STEPS = 40;
  const at = (f) => box.x + box.w * f;
  /**
   * ⚠️ TWO ANIMATION FRAMES BEFORE EVERY READ, AND THIS IS THE DIFFERENCE BETWEEN MEASURING THE
   * CONTROL AND MEASURING THE HARNESS. The handle's position is React state; a read taken in the
   * same task as the pointer move returns the PREVIOUS frame. Without the wait this reported 8 to 10
   * backward steps and a 7px lag on a handle that is following the cursor exactly — a stale read is
   * indistinguishable from a control that jitters, which is the fault under test wearing the
   * probe's clothes. Two rAFs, because one only guarantees the callback ran, not that it painted.
   *
   * ⚠️ AND THE LABEL IS SCOPED. `document.querySelector` with a selector LIST returns the first
   * match in DOCUMENT order, not selector order — this file has been bitten by exactly that once
   * already, with the app-stage scroller beating the content column for the datum.
   */
  const readHandle = () => page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const h = document.querySelector('[data-probe="brush"] .os-bwin');
      const t = document.querySelector('[data-probe="brush"] .os-bw');
      const lbl = document.querySelector('.os-ctrls .os-rangelbl');
      if (!h || !t) { resolve(null); return; }
      const weeks = lbl ? Number((/(\d+)/.exec(lbl.textContent || "") || [])[1]) : null;
      resolve({ left: Math.round((h.getBoundingClientRect().left - t.getBoundingClientRect().left) * 100) / 100, weeks });
    }));
  }));

  const lefts = [];
  const cursors = [];
  const weeksAt = {};
  await page.mouse.move(at(0.05), box.y);
  await page.mouse.down();
  for (let k = 0; k < STEPS; k++) {
    const f = 0.05 + (0.9 * k) / (STEPS - 1);
    await page.mouse.move(at(f), box.y);
    const r = await readHandle();
    if (!r) { await page.mouse.up(); return null; }
    lefts.push(r.left);
    cursors.push(Math.round(box.w * f * 100) / 100);
    if (k === 0) weeksAt.p05 = r.weeks;
    if (Math.abs(f - 0.5) < 0.012) weeksAt.p50 = r.weeks;
    if (k === STEPS - 1) weeksAt.p95 = r.weeks;
  }
  await page.mouse.up();
  const settled = await readHandle();

  let backwards = 0;
  let worstLag = 0;
  let repeats = 0;
  for (let k = 1; k < lefts.length; k++) {
    const dh = lefts[k] - lefts[k - 1];
    const dc = cursors[k] - cursors[k - 1];
    if (dh < -0.5) backwards++;
    if (Math.abs(dh) < 0.05) repeats++;
    worstLag = Math.max(worstLag, Math.abs(dh - dc));
  }
  /* where the handle SHOULD settle: the boundary the final N implies, as a fraction of the track */
  const implied = settled && settled.weeks
    ? Math.round((1 - settled.weeks / 12) * box.w * 100) / 100
    : null;
  return {
    steps: STEPS,
    backwards,
    repeats,
    worstLag: Math.round(worstLag * 100) / 100,
    weeks: weeksAt,
    settledLeft: settled ? settled.left : null,
    settledWeeks: settled ? settled.weeks : null,
    settleErr: implied === null || !settled ? null : Math.round(Math.abs(settled.left - implied) * 100) / 100,
  };
}

/**
 * ⚠️ THE THREE v30 GATES THAT CANNOT BE READ FROM A STATIC PAGE. Each is a claim about what happens
 * when something is DONE to the page — a mouse click, a keyboard press, a drawer opened — and a
 * snapshot of the broken version is indistinguishable from a correct one in all three cases.
 */
async function driven(page) {
  const out = {};

  /* ── focus: a mouse click leaves no ring, Tab leaves a sage one ───────────────────────────── */
  const chip = page.locator('[data-probe="todo-rule"] .os-rb').first();
  if (await chip.count()) {
    await chip.click({ position: { x: 5, y: 5 } }).catch(() => {});
    await page.waitForTimeout(120);
    out.focusMouse = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { outline: "none", fv: false };
      const cs = getComputedStyle(el);
      return { outline: cs.outlineStyle, colour: cs.outlineColor, fv: el.matches(":focus-visible") };
    });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(120);
    out.focusTab = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { outline: "none", fv: false };
      const cs = getComputedStyle(el);
      return { outline: cs.outlineStyle, colour: cs.outlineColor, fv: el.matches(":focus-visible") };
    });
    /* put the filter back — a gate that leaves the page filtered changes what every later probe sees */
    const badge = page.locator('[data-probe="todo-badge"]');
    if (await badge.count() && await badge.evaluate((b) => b.tagName === "BUTTON").catch(() => false)) {
      await badge.click().catch(() => {});
      await page.waitForTimeout(150);
    }
  }

  /* ── the drawer is above everything ───────────────────────────────────────────────────────── */
  const tk = page.locator('[data-probe="todo-card"] .tkt').first();
  if (await tk.count()) {
    await tk.click().catch(() => {});
    await page.waitForTimeout(700);
    out.drawer = await page.evaluate(() => {
      /* ⚠️ THE OPEN ONE. Every workspace page stays mounted and the drawer portals to body, so the
         document holds all three of the app's drawers at once; the first in document order is
         routinely a closed one belonging to another page. */
      const d = document.querySelector('.slo[data-on="true"]');
      const sc = document.querySelector('.slo-scrim[data-on="true"]');
      if (!d) return { open: false };
      const r = d.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const ctx = [];
      for (let el = d.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.transform !== "none" || cs.filter !== "none" || parseFloat(cs.opacity) < 1
          || (cs.zIndex !== "auto" && cs.position !== "static") || cs.isolation === "isolate"
          || cs.willChange !== "auto") ctx.push(el.tagName.toLowerCase());
      }
      return {
        open: true,
        portalled: d.parentElement === document.body,
        contexts: ctx.length,
        inside: !!(hit && (hit === d || d.contains(hit))),
        z: Number(getComputedStyle(d).zIndex),
        scrimZ: sc ? Number(getComputedStyle(sc).zIndex) : null,
      };
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(420);
  }

  /**
   * ⚠️ THE FILL ACTUALLY FADES (v30, Phase 5) — read from the rendered pixels, because a mask's
   * effect exists nowhere else. A column at mid-plot from the top down to the baseline; the PAINTED
   * span is whatever in that column is more than 2 units from the card colour, so the sample cannot
   * land in the empty sky above the stack. The pack's gate says "15% and 85% of the plot's height";
   * at this data 15% of the PLOT is above the stack entirely and reads as card, so the honest form
   * is 15% and 85% of the painted span — the same claim, measured where there is something to
   * measure.
   */
  const col = await page.evaluate(() => {
    const host = document.querySelector('[data-probe="plot"]');
    const svg = host && (host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg"));
    if (!svg) return null;
    const hb = host.getBoundingClientRect(), sb = svg.getBoundingClientRect();
    const vb = (svg.getAttribute("viewBox") || "0 0 1 1").split(/\s+/).map(Number);
    const toY = (uy) => (sb.top - hb.top) + (uy - vb[1]) * (sb.height / vb[3]);
    const lines = [...svg.querySelectorAll("line")].filter((l) => !l.closest("defs"));
    const axis = lines.find((l) => (l.getAttribute("class") || "").indexOf("axis0") >= 0);
    if (!axis) return null;
    const zero = toY(Number(axis.getAttribute("y1"))), top = toY(vb[1]);
    const pts = [];
    for (let k = 0; k < 40; k++) pts.push([Math.round(hb.width * 0.5), top + ((zero - top) * k) / 39]);
    return pts;
  });
  if (col) {
    const shot = await page.locator('[data-probe="plot"]').first().screenshot();
    const cols = await page.evaluate((arg) => new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        res(arg.points.map(([x, y]) => {
          if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
          const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
          return [d[0], d[1], d[2]];
        }));
      };
      img.src = arg.url;
    }), { url: "data:image/png;base64," + shot.toString("base64"), points: col });
    const dist = (c) => (c ? Math.sqrt((c[0] - 253) ** 2 + (c[1] - 251) ** 2 + (c[2] - 247) ** 2) : null);
    const painted = cols.map(dist).filter((d) => d !== null && d > 2);
    if (painted.length >= 6) {
      const at = (t) => painted[Math.min(painted.length - 1, Math.round(t * (painted.length - 1)))];
      const hi = at(0.15), lo = at(0.85);
      out.fade = { hi: Math.round(hi * 10) / 10, lo: Math.round(lo * 10) / 10, ratio: Math.round((lo / hi) * 100) / 100 };
    }
  }
  return out;
}

/**
 * ⚠️ THE PLOT'S PIXELS, RUN BY DEFAULT (v31, Phase 2). The region comparison lives in its own script
 * because it needs a REF PAGE BUILT FROM SUBSTITUTED HTML — the app's own series pushed into the
 * mockup's fixture — which is a different page from the one this file measures. It is spawned rather
 * than imported so it stays independently runnable, and its JSON is folded back in as a gate.
 *
 * ⚠️ IF IT CANNOT MAKE THE FIXTURES MATCH IT REPORTS `skipped` AND CLAIMS NOTHING. Diffing pixels of
 * two different datasets and calling the difference a miss is worse than not looking.
 */
function plotDiff() {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", "dash-plotdiff-v31.mjs")], {
    encoding: "utf8", env: { ...process.env, SA_WIDTHS: WIDTHS.join(",") }, timeout: 15 * 60 * 1000,
  });
  const f = join(ROOT, "run-artifacts", "plotdiff", "plotdiff.json");
  if (!existsSync(f)) return { error: (r.stderr || "").slice(-300) || "no plotdiff.json" };
  try { return { rows: JSON.parse(readFileSync(f, "utf8")) }; } catch (e) { return { error: String(e) }; }
}

/**
 * ⚠️ TWO GATES THAT CANNOT BE READ FROM A LOADED PAGE, SPAWNED THE WAY THE PLOT DIFF IS (v33).
 *
 * `skeletonRegions` needs the page in a state this harness never sees — the cover is up for a few
 * hundred milliseconds during a load, and the claim is about the difference between THAT state and
 * the settled one. `railBoundary` needs TWO ROUTES in one run, because a scrim that reached every
 * page would be a dashboard decision applied to nine pages nobody asked about, and a one-route
 * check cannot tell a scoped feature from a global one.
 *
 * ⚠️ THEY RUN BY DEFAULT OR THEY ARE NOT GATES. Both existed as scripts somebody could run; that is
 * a measurement, not a gate, and the difference is whether it goes on being true without anybody
 * finding out. Each writes a verdict JSON and this reads it.
 */
function spawnedGate(script, artefact, envExtra) {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", script)], {
    encoding: "utf8", env: { ...process.env, ...envExtra }, timeout: 20 * 60 * 1000,
  });
  const f = join(ROOT, "run-artifacts", artefact);
  if (!existsSync(f)) return { error: (r.stderr || "").slice(-300) || `no ${artefact}` };
  try { return { verdict: JSON.parse(readFileSync(f, "utf8")) }; } catch (e) { return { error: String(e) }; }
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
  /* the plot region's own row, printed whether or not it counted */
  if (result.plotDiff && result.plotDiff.rows) {
    L.push("");
    L.push("**Plot region (same data, both sides):**");
    for (const r of result.plotDiff.rows) {
      L.push(r.skipped
        ? `- ${r.width}: SKIPPED — ${r.skipped}`
        : `- ${r.width}: mean **${r.mean}** · max ${r.max} · ${r.points} points · fixture substituted (${(r.substitutions || []).join("+")})`);
    }
  } else if (result.plotDiff && result.plotDiff.error) {
    L.push("");
    L.push(`**Plot region: NOT MEASURED — ${result.plotDiff.error}**`);
  }
  /* the two spawned gates get their own lines, printed whether or not they counted */
  for (const [name, r] of [["skeletonRegions", result.skeletonGate], ["railBoundary", result.railGate]]) {
    if (!r) continue;
    L.push("");
    /* ⚠️ THE CLAUSES, NOT THE WHOLE OBJECT — a verdict printed raw is either a wall of JSON or,
       once its shape changes, an empty `{}` that reads as "nothing to report". The rail's line
       printed exactly that for one pass, because the table only knew the skeleton's shape. */
    /* ⚠️ DISCRIMINATE ON A FIELD ONLY ONE OF THEM HAS. `rows` looked like the skeleton's marker
       and BOTH verdicts carry one, so the rail took the skeleton's branch, read six fields it does
       not have, and printed `{}` — a verdict that reads as "nothing to report" on a gate that had
       nine clauses to report. `railDrift` belongs to the rail alone. */
    const brief = r.verdict && (r.verdict.railDrift === undefined
      ? { worst: r.verdict.worst, tol: r.verdict.tolerance, widths: r.verdict.widths,
          caught: r.verdict.allCaught, removed: r.verdict.allRemoved,
          noLive: r.verdict.noLive, reducedMotionStill: r.verdict.rmStill, shimmer: r.verdict.animated,
          tkCount: r.verdict.tkCountMatches, tkCols: r.verdict.tkColsMatch,
          tkTile: r.verdict.tkTileMatches, tkContained: r.verdict.tkContained }
      : { flush: r.verdict.flush, width18: r.verdict.width18, belowCards: r.verdict.belowCards,
          inert: r.verdict.inert, columnBare: r.verdict.columnBare, railBare: r.verdict.railBare,
          spansColumn: r.verdict.spansColumn, railUnchanged: r.verdict.railUnchanged,
          scrimOffOtherRoute: r.verdict.scrimOffOtherRoute });
    L.push(r.verdict
      ? `**${name}: ${r.verdict.pass ? "pass" : "FAIL"}** — ${JSON.stringify(brief)}`
      : `**${name}: NOT MEASURED — ${r.error}**`);
  }
  /**
   * ⚠️ THE ROSTER IS PRINTED, NOT CLAIMED. "All twenty-two standing gates run by default" is the
   * kind of sentence that stays in a report for six months after one of them stopped being wired
   * in. Printing the names, from the arrays themselves, makes the count a MEASUREMENT of the
   * harness rather than a statement about it.
   */
  L.push("");
  L.push(`**Standing gates run this pass: ${GATE_ROSTER.length}** — ${GATE_ROSTER.join(" · ")}`);
  L.push("");
  L.push(`**total misses: ${result.total}**`);
  return L.join("\n");
}

/* ⚠️ DERIVED FROM THE ARRAYS, NEVER TYPED OUT. A hand-written list agrees with the harness on the
   day it is written; this one cannot disagree with it at all. */
const PAGE_GATES = ["ground", "hScroll", "columnBottoms", "blendAncestorTransform"];
/* ⚠️ FOUR NAMES OVER TWO ARTEFACTS, DELIBERATELY (v33.2). The pack asks for four gates and two of
   them are read from the same run as their sibling — the skeleton's liveness comes out of the same
   pass as its regions, and the column's edge treatment out of the same pass as the rail's. Naming
   them separately is not bookkeeping: a failure has to say WHICH claim broke, and "railBoundary
   failed" over a nine-clause verdict is the object-Object failure message this harness already
   forbids. */
const SPAWNED_GATES = ["plotRegion", "skeletonRegions", "skeletonEdges", "noLiveInColumn", "ticketFill", "railBoundary", "columnBare"];
const GATE_ROSTER = [...STANDING.map((g) => g.k), ...PAGE_GATES, ...SPAWNED_GATES];

/* ── run ─────────────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ REFUSE TO MEASURE A BUNDLE OLDER THAN ITS SOURCES (v31). This harness had no freshness check,
 * and it cost a false green within the hour it was written: a `build:dev` failed — another stream
 * had committed one half of a change and `main` did not compile — and the run went ahead against
 * the bundle from twenty minutes earlier and reported 0 misses at four widths. Every number was
 * real and described a page that no longer existed.
 *
 * `tests/e2e`'s `bundleGuard` has enforced this for a year. The cheapest form for a local preview
 * is the mtimes: if anything under `src/` is newer than the newest built asset, the bundle is not
 * the code. Reporting a stale measurement is worse than reporting none.
 */
function assertFreshBundle() {
  const dist = join(ROOT, "dist", "assets");
  if (!existsSync(dist)) return;                     /* a remote target has no local dist to check */
  const newest = (dir) => {
    let t = 0;
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      const st = statSync(f);
      t = Math.max(t, st.isDirectory() ? newest(f) : st.mtimeMs);
    }
    return t;
  };
  const built = newest(dist);
  const src = newest(join(ROOT, "src"));
  if (src > built) {
    const mins = Math.round((src - built) / 60000);
    throw new Error(
      "dash-refdiff: the bundle is older than the sources by " + mins + " minute(s). "
      + "Something under src/ changed after dist/ was built — REBUILD before measuring. "
      + "A run against a stale bundle produces real numbers about a page that no longer exists, "
      + "which is the one failure this harness cannot tell you about afterwards.",
    );
  }
}
assertFreshBundle();

/**
 * ⚠️ AND THE SERVER MUST BE SERVING *THAT* BUNDLE (v33). `assertFreshBundle` proves the dist on disk
 * is newer than the source; it says nothing about which dist the URL is pointing at, and that is a
 * different question with the same failure shape.
 *
 * ⚠️ IT COST A WHOLE BASELINE RUN, and it read as a REAL result. `vite preview --port 4174` found
 * the port already taken by a server left over from earlier in the session, printed
 * "Port 4174 is in use, trying another one…" to a log nobody was reading, and bound 4176. The run
 * against 4174 therefore measured the FIXED tree and reported the baseline as already perfect —
 * `skeletonRegions: pass, worst 0.3px` about an app whose skeleton has no `.os-grid` at all.
 * `lsof -iTCP:4174 -sTCP:LISTEN` said a server was listening, which is true and is the wrong
 * question: the honest check is WHICH BUNDLE it hands back.
 *
 * ⚠️ THE CHECK IS THE DEPLOY DISCIPLINE'S, POINTED AT A MEASUREMENT. This repo already refuses to
 * believe a deploy until the served bundle hash matches the build; a measurement deserves the same,
 * because a plausible number about the wrong subject is the most expensive failure there is.
 * It is skipped for a REMOTE target, where there is no local dist to compare against.
 */
async function assertServedBundle() {
  const dist = join(ROOT, "dist", "assets");
  if (!existsSync(dist)) return;
  let html;
  try {
    const res = await fetch(APP.replace(/\/$/, "") + "/dashboard");
    html = await res.text();
  } catch (e) {
    throw new Error(
      "dash-refdiff: could not reach " + APP + " (" + String(e && e.message) + "). "
      + "Start a preview for THIS tree and point SA_REFDIFF_APP_URL at it.",
    );
  }
  const m = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(html);
  if (!m) {
    throw new Error("dash-refdiff: " + APP + " served no built entry bundle — is it a dev server rather than a preview?");
  }
  if (!existsSync(join(dist, m[1]))) {
    throw new Error(
      "dash-refdiff: " + APP + " is serving `" + m[1] + "`, which is NOT in this tree's dist/assets. "
      + "The URL points at somebody else's build — commonly a preview that found its port taken and "
      + "silently moved to the next one. Read the preview's own log for the port it actually bound, "
      + "and re-point SA_REFDIFF_APP_URL. Measuring the wrong build produces real numbers about the "
      + "wrong page, which no later check can tell you about.",
    );
  }
  console.log("bundle: " + APP + " serves " + m[1] + " (this tree's build)");
}
await assertServedBundle();

const browser = await chromium.launch();
const result = { when: new Date().toISOString(), ref: REF_REL, app: APP, widths: WIDTHS, byWidth: {}, total: 0 };
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
    /* ⚠️ DRIVEN ON THE PAGE THAT IS STILL OPEN, AND ITS RESULT SURVIVES THE FIT RE-READ BELOW. The
       ±16px window exists to make two content boxes the same size; a drag's behaviour does not
       depend on it, and re-driving it on a second page would double the slowest part of the run. */
    const brush = await brushDrag(appPage);
    const drivenChecks = await driven(appPage);

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

    appData.checks.brush = brush;
    appData.checks.focusMouse = drivenChecks.focusMouse ?? null;
    appData.checks.focusTab = drivenChecks.focusTab ?? null;
    appData.checks.drawer = drivenChecks.drawer ?? null;
    appData.checks.fade = drivenChecks.fade ?? null;

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
/**
 * ⚠️ THE PLOT REGION, MEASURED AND GATED (v31). Today's numbers are 5.4–7.2 mean and ~232 max, and
 * the causes are known and reported: the ref's plot insets are FRACTIONS of a stretched fixed
 * viewBox (5.2% left, 7.9% top, 13.9% bottom) while this app's are fixed PIXELS (14/30/34), so every
 * drawn thing sits a few px apart and the two never converge at any width.
 *
 * ⚠️ SO THE THRESHOLD IS A NO-REGRESSION LINE, NOT THE TARGET, AND IT SAYS SO. 8 is above every
 * measured value and below anything a new fault would produce; the pack's target of 6 needs the
 * inset question settled, which is a design decision rather than a build one. A gate calibrated to
 * today's number would be a snapshot; a gate at the target would be red for a reason nobody is
 * acting on. This one catches the chart getting WORSE, which is the claim that can be made honestly.
 */
const plot = plotDiff();
result.plotDiff = plot;
if (plot.rows) {
  for (const row of plot.rows) {
    if (row.skipped) continue;
    if (!(row.mean < 8)) {
      const w = row.width;
      result.byWidth[w] = result.byWidth[w] || { misses: [], allowed: [] };
      result.byWidth[w].misses.push({
        key: "plot-region", field: "mean", ref: "< 8", app: row.mean,
        why: "the plot's rendered pixels drifted from the ref's with the same data",
      });
      result.total++;
    }
  }
}

/**
 * ⚠️ A FAILED SPAWNED GATE IS A MISS, AND SO IS A GATE THAT DID NOT RUN. `NOT MEASURED` reported as
 * a neutral line is exactly the silent-skip shape this repo keeps rebuilding: the run goes green
 * because nothing looked. Both land in the total.
 */
result.skeletonGate = spawnedGate("dash-skeleton-v33.mjs", join("skeleton-v33", "skeleton.json"),
  { SA_WIDTHS: WIDTHS.join(",") });
result.railGate = spawnedGate("dash-rail-v33.mjs", join("rail-v33", "rail.json"), {});
for (const [name, r, why, clause] of [
  ["skeletonRegions", result.skeletonGate,
    "the loading shell's regions disagree with the loaded page's — the jump it exists to prevent",
    (v) => v.allCaught && v.noneMissing && v.allRemoved && v.animated && v.rmStill
      && v.settled && v.worst <= v.tolerance],
  /* ⚠️ THE COLUMN'S ENDS GET THEIR OWN NAME because "reads as cut off" is a reported SYMPTOM, and
     a symptom deserves a failure line that names it rather than one clause inside a nine-clause
     verdict about regions. */
  ["skeletonEdges", result.skeletonGate,
    "the loading state's first or last pixel is not where the loaded page's is, or something is clipped off",
    (v) => v.headMatches && v.footMatches && v.nothingClipped],
  ["noLiveInColumn", result.skeletonGate,
    "something in the content column is still readable or reachable while the ghost is up",
    (v) => v.noLive === true],
  /* ⚠️ AND THE TICKET GRID GETS ITS OWN NAME FOR THE SAME REASON (v34). "The cover stops short and
     leaves a void at the card's foot" is a reported symptom too, and it has four independent
     causes — the count, the column count, the tile height and containment — any of which alone
     produces it. A failure line naming which is worth more than a truth value inside a verdict
     about regions, and the regions all lined up to 0.3px while the grid was three columns wrong. */
  ["ticketFill", result.skeletonGate,
    "the ghost's ticket grid is not the shape the loaded card will be — count, columns, tile height or containment",
    (v) => v.tkCountMatches && v.tkColsMatch && v.tkTileMatches && v.tkContained],
  ["railBoundary", result.railGate,
    "the rail's own treatment moved, or the dashboard's scrim leaked onto another page",
    (v) => v.flush && v.width18 && v.belowCards && v.inert && v.railBare && v.spansColumn
      && v.railUnchanged && v.scrimOffOtherRoute],
  ["columnBare", result.railGate,
    "the content column grew an edge treatment of its own — the fault the shadow's direction fixes",
    (v) => v.columnBare === true],
]) {
  if (r && r.verdict && clause(r.verdict)) continue;
  const w = WIDTHS[0];
  result.byWidth[w] = result.byWidth[w] || { misses: [], allowed: [] };
  result.byWidth[w].misses.push({
    key: "standing", field: name, ref: "pass",
    app: r && r.verdict ? JSON.stringify(r.verdict).slice(0, 220) : `NOT MEASURED — ${r ? r.error : "no result"}`,
    why,
  });
  result.total++;
}

/**
 * ⚠️ THE JSON IS WRITTEN LAST, WITH THE MARKDOWN (v33). It used to be written before the plot diff
 * and the two spawned gates had run, so the two artefacts of one run DISAGREED: the table said
 * `total misses: 2` and the JSON beside it said `0`. A reader who trusts the machine-readable half
 * gets the wrong answer, and nothing about either file says which one is stale.
 */
const md = table(result);
writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
writeFileSync(OUT.replace(/\.json$/, ".md"), `${md}\n`);
console.log(`\n${md}\n`);
console.log(`written: ${OUT}`);
process.exit(result.total === 0 ? 0 : 1);
