/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ NO LITERAL VERTICAL OFFSET IN THE BAR PATH (v37, Phase 2).
 *
 * `--row-h` is list density and `--bar-h` is the bar, and they are only independent for as long as
 * nothing in between states a number of its own. A literal is how they get re-coupled: somebody
 * sizes a chip at 23px because the bar happens to be 22, the bar later becomes 34, and the chip
 * stays behind — correct-looking, unfindable, and wrong by eleven pixels.
 *
 * ⚠️ THIS IS A SOURCE CLAIM AND BELONGS IN A SOURCE LOCK. "This sheet states no literal height in
 * the bar path" is a fact about a file. Where the bar ends up on screen is a different claim and is
 * measured on a rendered page (the cal*55 measurement set) — including the independence itself, which is
 * proved by overriding one token and watching the other hold.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = join(process.cwd(), "src/components/todo/todoCalendar.css");

/**
 * ⚠️ THE REF IS PARSED, NEVER TRANSCRIBED — and this file is why the rule exists.
 *
 * Both assertions below used to carry typed numbers, and both were wrong. `--row-h` was pinned at
 * `64px` while the sheet said 66 and then 88; `--bar-h` was pinned at `54px` while the sheet said
 * 44 — and NOBODY SAW the second one, because `--row-h` is checked first in the same loop and a
 * failing assertion hides every assertion behind it. Two stale numbers, one visible. Reading the
 * design of record on every run means a retune moves the lock with it and a REGRESSION still
 * fails, which is the only thing a lock is for.
 */
/* ⚠️ THE DESIGN OF RECORD, AND IT WAS TWO PACKS STALE. This read `timeline-v61.html` while v62 and
   v63 had each moved the board's geometry — so a lock whose whole purpose is "the sheet agrees with
   the ref" was agreeing with a ref nothing is built to any more, and would have gone on passing
   forever. A ref path is an anchor like any other: it needs re-pointing when the record moves. */
const REF = join(process.cwd(), "design-refs/timeline-v63.html");
const refSheet = (): string => {
  const s = readFileSync(REF, "utf8");
  const i = s.indexOf("<style>"), j = s.indexOf("</style>", i);
  if (i < 0 || j < 0) throw new Error("the ref has no <style> block — it is not the file we think");
  return s.slice(i + 7, j);
};
/** every `--token: value` on the ref's `:root` (its LAST declaration wins, as the cascade does) */
/**
 * ⚠️ THE REF'S TOKENS AS THE SELECTED DESIGN RESOLVES THEM — `:root` FIRST, THEN EVERY CHOSEN
 * VARIANT, IN FILE ORDER.
 *
 * Reading `:root` alone was wrong, and it stayed wrong until a section legitimately changed a
 * value. A ref keeps every variant reachable in one document and picks one with the `<body>`'s data
 * attributes; `:root` therefore holds the DEFAULTS, and `body[data-dens="regular"]{--row-h:106px}`
 * is what the chosen design actually renders. Four variants set `--row-h` in this ref — 92, 88,
 * 106 and 106 — all `body[attr]` at equal specificity, so the LAST one wins.
 *
 * This is the same first-match trap the whole project keeps paying for, wearing a lock's clothes:
 * the lock read the first declaration and reported a correct build as a regression.
 */
const refBodyAttrs = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const m = readFileSync(REF, "utf8").match(/<body([^>]*)>/);
  if (!m) throw new Error("the ref has no <body> tag — cannot know which design is selected");
  for (const a of m[1].matchAll(/(data-[a-z-]+)="([^"]*)"/g)) out[a[1]] = a[2];
  if (!Object.keys(out).length) throw new Error("the ref's <body> declares no design attributes");
  return out;
};

const refRoot = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const take = (body: string) => {
    for (const d of body.split(";")) {
      const k = d.indexOf(":");
      if (k < 0) continue;
      const name = d.slice(0, k).trim();
      if (name.startsWith("--")) out[name] = d.slice(k + 1).trim();
    }
  };
  const sheet = refSheet();
  for (const m of sheet.matchAll(/:root\s*\{([^}]*)\}/g)) take(m[1]);
  if (!Object.keys(out).length) throw new Error("the ref's :root parsed to nothing");
  /* then every SELECTED variant, in the order the file declares them — which is how the cascade
     resolves a set of equal-specificity `body[attr]` rules */
  const attrs = refBodyAttrs();
  for (const m of sheet.matchAll(/body\[(data-[a-z-]+)="([^"]*)"\]\s*\{([^}]*)\}/g)) {
    if (attrs[m[1]] === m[2]) take(m[3]);
  }
  return out;
};
/** one declaration out of one of the ref's rules */
const refDecl = (selector: string, prop: string): string => {
  const sel = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|\n)\\s*${sel}\\s*\\{([^}]*)\\}`).exec(refSheet());
  if (!m) throw new Error(`the ref declares no rule for ${selector}`);
  const d = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(m[1]);
  if (!d) throw new Error(`the ref's ${selector} declares no ${prop}`);
  return d[1].trim();
};

/** ⚠️ COMMENTS FIRST. This file's prose names every literal it retired, by number. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Selectors that place or size something in the bar path — the bar, its fill, its label, the
 * marker, the chips, and the lane wrapper every one of them is positioned by.
 *
 * ⚠️ THE ELEMENT ITSELF, NOT WHAT IS DRAWN INSIDE IT. A selector with a descendant combinator is
 * styling a mark within one of these, and a mark's own size is not a vertical offset: `.tl-tchip
 * .sq` is an 8px square inside a chip, the same class of thing as the marker's glyph. The boundary
 * is drawn on the SHAPE of the selector rather than on the one value that provoked it, because a
 * carve-out naming `.sq` would exempt whatever else someone later nests under it.
 *
 * ⚠️ AND THAT SQUARE IS FLAGGED RATHER THAN FIXED. It does not scale with the chip, so it is
 * proportionally smaller in a 32px chip than it was in a 23px one. The ref pins no value for it,
 * and inventing one is the thing this pack's rules forbid.
 */
const BAR_HEAD = /^\.tl-(p|fl|plbl|t1|t2|txt|mk2|tchip|at2)\b/;
const isBarPath = (sel: string): boolean =>
  sel.split(",").map((x) => x.trim()).some((one) =>
    /* the first token is a bar-path class … */
    BAR_HEAD.test(one)
    /* … and nothing is nested under it. A compound (.tl-p.out, .tl-p:hover) is still the element;
       a descendant (.tl-p .tl-fl, .tl-tchip .sq) is something drawn inside it. */
    && !/\s+[.\w[>~+]/.test(one));

/** The properties that decide vertical geometry. A radius is not one; a glyph's width is not one. */
const VERTICAL = /(^|;|\{)\s*(height|min-height|max-height|top|bottom|margin-top|margin-bottom|padding-top|padding-bottom|line-height)\s*:/;

describe("⚠️ no class the calendar renders is already owned by another sheet (v55)", () => {
  /**
   * ⚠️ TWICE NOW, AND THE SECOND TIME COST A WHOLE LAYOUT. `f12.css` — the Query Centre's
   * timeline — declares `.tl-dt`, `.tl-sep` and `.tl-body`, and both sheets ship in one bundle.
   * v54 hit the first two and renamed to `tl-c…`; v55 introduced `.tl-body` for the card's column
   * and inherited `margin-top: 7px` plus a 9px child gap, so every headline fell out of the bottom
   * of its card — with the calendar's own rule reading perfectly correctly.
   *
   * The two sheets share a prefix by history and neither is going to stop, so the guard is a
   * sweep rather than a memory: every class the calendar RENDERS is checked against every class
   * `f12.css` DECLARES.
   */
  const page = readFileSync(join(process.cwd(), "src/components/todo/TodoCalendarPage.tsx"), "utf8");
  const f12 = readFileSync(join(process.cwd(), "src/components/shell/f12.css"), "utf8");

  it("every tl- class the calendar renders is its own", () => {
    /* class names as the page writes them — literals and template pieces alike */
    const rendered = new Set<string>();
    for (const m of page.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
      const raw = (m[1] ?? m[2] ?? m[3] ?? "");
      for (const c of raw.split(/[\s${}()?:+'"`]+/)) if (/^tl-[a-z0-9-]+$/.test(c)) rendered.add(c);
    }
    expect(rendered.size, "no tl- classes found in the page — the sweep read nothing")
      .toBeGreaterThan(10);
    const declared = new Set<string>();
    for (const m of f12.matchAll(/\.(tl-[a-z0-9-]+)/g)) declared.add(m[1]);
    expect(declared.size, "no tl- classes found in f12.css — the sweep read nothing")
      .toBeGreaterThan(5);
    const clash = [...rendered].filter((c) => declared.has(c)).sort();
    expect(clash, `the calendar renders ${clash.length} class(es) that f12.css also styles`)
      .toEqual([]);
  });
});

describe("⚠️ a task is a point, and its mark is 1.5px (v54)", () => {
  /* the rendered check can say the mark is outlined and cannot say by how much: a sub-pixel
     border's used value rounds at DPR 1. Read as written here. */
  it("the ref's own box size, ink-outlined at 1.5px", () => {
    const src = readFileSync(CSS, "utf8");
    const m = /(?:^|\n)\s*\.tl-tmk\s*\{([^}]*)\}/.exec(src);
    expect(m, "the task mark has no rule").not.toBeNull();
    /* v58 drew 20; v60's `.task .box` draws 16. The lock kept asserting 20 through the change. */
    const want = refDecl(".task .box", "width");
    expect(m![1], `the task mark is not the ref's ${want}`)
      .toMatch(new RegExp(`width\\s*:\\s*${want}`));
    expect(m![1]).toMatch(/border\s*:\s*1\.5px solid var\(--tl-nearblack\)/);
  });
});

describe("⚠️ the stir is RETIRED, and owed keeps only its standing (v64 — `data-anim=\"none\"`)", () => {
  /**
   * ⚠️ THE RETIREMENT IS THE CLAIM NOW. The v64 ref's owed card measures a plain
   * `translateY(-50%)`: no scale, no animation, no shadow — and the scale was arguing with two
   * geometry locks at once (a 1.006 scale on a ~400px card moved its painted edges 1.2px each
   * way, so a left-cut owed card showed a 4.8px lane gap against the 6px law and an ongoing one
   * overhung the today line). The v54 keyframe lessons — every frame repeats the base transform
   * in full, no `var()` inside keyframes — survive in the pulse dot's own frames, which the
   * companion case below holds to them.
   */
  const src = () => readFileSync(CSS, "utf8");

  it("the keyframes, the scale and the stagger are gone; the standing survives", () => {
    const body = src();
    expect(body, "the stir's keyframes are back").not.toContain("@keyframes tlStir");
    expect(body, "the owed scale is back").not.toContain("scale(1.006)");
    expect(body, "the stagger token is read again").not.toContain("var(--stir-i");
    /* the replacement is PRESENT, not merely the old thing absent: owed keeps its deepened pill
       — and nothing else. The z-standing went with the scale (the ref's owed computes z2, so the
       today line at z3 passes over every card; an owed card at z4 painted over the line). */
    expect(body, "owed re-grew a z standing").not.toMatch(/\.tl-p\.owed\s*\{[^}]*z-index/);
    expect(body).toMatch(/\.tl-p\.owed \.tl-pill\s*\{[^}]*font-weight:\s*700/);
  });

  it("⚠️ the pulse dot's frames keep the keyframe laws the stir taught", () => {
    /* `transform` is not additive and a `var()` inside a keyframe block fails silently here —
       both lessons predate this pack and outlive the stir. The pulse is the one card animation
       left; hold it to them. */
    const m = /@keyframes\s+tlPulse\s*\{([\s\S]*?)\n\}/.exec(src());
    if (m) {
      expect(m[1], "a pulse keyframe reads a custom property").not.toContain("var(");
    } else {
      /* the pulse may animate under another name — find every keyframe block and hold them all */
      const blocks = [...src().matchAll(/@keyframes\s+\S+\s*\{([\s\S]*?)\n\}/g)];
      expect(blocks.length, "no keyframes at all — the pulse lost its ripple").toBeGreaterThan(0);
      for (const b of blocks) expect(b[1], "a keyframe reads a custom property").not.toContain("var(");
    }
  });
});

describe("⚠️ the today line is a drawn rule, and its width is a source claim (v54)", () => {
  /* ⚠️ THE RENDERED CHECK CANNOT CARRY THIS. A sub-pixel border's USED value rounds at DPR 1 —
     declared 1.5px, Chromium reports 1px — so `calGround54.measure.ts` asserts the line is painted
     and painted in the pinned tone, and the width is asserted where it can be read as written.
     Two halves of one claim, each in the instrument that can answer it. */
  /* ⚠️ ANCHORED AT A LINE START, or a bare `.tl-todayline {` also matches the tail of any
     descendant selector ending in it — the first-match family this repo has hit four times. */
  const ruleFor = (sel: string) => {
    const src = decls(readFileSync(CSS, "utf8"));
    const re = new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
    const hits = [...src.matchAll(re)];
    expect(hits.length, `${sel} is declared ${hits.length} times — a lock cannot know which wins`).toBe(1);
    return hits[0][1];
  };

  it("1.5px, dashed, in ink, in the rows only (v64 §C)", () => {
    /* ⚠️ RETARGETED BY v64: the line is `data-tl="dash"` — 1.5px DASHED INK, a child of
       `.tl-rowsin` so it cannot reach the date row or the winbar, and BELOW the sealed group bars
       (z 3 against their 25) rather than above everything. The v54 values (solid rose #e6c3b4,
       z 60) described a line that crossed the whole board; that line is retired. */
    const r = ruleFor(".tl-todayline");
    expect(r).toMatch(/border-left\s*:\s*1\.5px dashed var\(--tl-nearblack\)/i);
    expect(r).toMatch(/z-index\s*:\s*3\b/);
  });

  it("⚠️ AND THE PAST WASH IS GONE FROM THE SHEET, not merely unset by the page", () => {
    /* `.tl-c-tl::before` painted a gradient from the window's start to today off `--tl-past-w`.
       Deleting only the page's inline value would have left a rule with a `0` fallback — inert,
       and one edit from painting again. */
    const src = decls(readFileSync(CSS, "utf8"));
    expect(src, "the past wash rule survives").not.toMatch(/\.tl-c-tl::before\s*\{/);
    expect(src, "--tl-past-w survives").not.toContain("--tl-past-w");
  });
});

describe("the calendar's bar path states no vertical literal", () => {
  const src = decls(readFileSync(CSS, "utf8"));
  const rules = [...src.matchAll(/(^|\n)([^\n{}]+)\{([^}]*)\}/g)]
    .map((m) => ({ sel: m[2].trim(), body: m[3] }))
    .filter((r) => isBarPath(r.sel));

  it("finds the bar path — a sweep over no rules proves nothing", () => {
    expect(rules.length, "no bar-path rules found: the extraction is broken, not the file")
      .toBeGreaterThan(6);
  });

  it("every vertical value is a token or a calc over one", () => {
    const offenders: string[] = [];
    for (const r of rules) {
      for (const d of r.body.split(";")) {
        const decl = d.trim();
        if (!decl || !VERTICAL.test(`;${decl}:`.replace(/:.*/, ":"))) continue;
        const [prop, ...rest] = decl.split(":");
        if (!VERTICAL.test(`;${prop.trim()}:`)) continue;
        const value = rest.join(":").trim();
        /* a bare number is fine for line-height, and `0`/`auto`/`100%` name no size */
        if (/^(0|auto|100%|inherit|normal|[\d.]+)$/.test(value)) continue;
        if (value.includes("var(")) continue;
        if (/\d+(\.\d+)?(px|rem|em)/.test(value)) {
          offenders.push(`${r.sel} { ${prop.trim()}: ${value} }`);
        }
      }
    }
    expect(offenders, `a vertical literal in the bar path: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("the three tokens are declared once each, at the values the refs pin", () => {
    const root = src.match(/(^|\n)\.tl-board\s*\{([\s\S]*?)\}/) ?? src.match(/(^|\n):root\s*\{([\s\S]*?)\}/);
    expect(root, "no token block found").not.toBeNull();
    /* ⚠️ `--mk` IS 16px SINCE v54, AND THE VALUE FOLLOWS THE MARK'S JOB EACH TIME IT CHANGES. At 28
       it was an object in the gap between two cut pieces, sized to be read on the panel's ground.
       At 22 it rode ON a card, where a bigger disc covered half of what it was annotating. It is
       now a LEAD-IN — drawn before the card on a dotted run, never touching it — and a waypoint on
       a thin dotted line does not need to hold its own against a filled card.
       ⚠️ `--row-h` IS 64px SINCE v54 and `--bar-h` is unchanged: the card is the same height and
       the row gains two pixels of air, which is what the hairline between rows needs to read as a
       separator rather than as an edge. */
    /* ⚠️ THE TWO GEOMETRY TOKENS COME FROM THE REF; `--mk` DOES NOT, AND THAT IS STATED RATHER
       THAN QUIETLY MIXED. v60 pins `--row-h` and `--bar-h` on its `:root`, so those are read. It
       pins nothing for the lead-in mark — the mark is this app's own device, drawn on a dotted run
       the ref has no equivalent of — so 16px is the app's value and is asserted as a literal. A
       lock that read the ref for a value the ref does not carry would have to invent one. */
    const ref = refRoot();
    const pinned: readonly (readonly [string, string])[] = [
      ["--row-h", ref["--row-h"]],
      ["--bar-h", ref["--bar-h"]],
      ["--mk", "16px"],
    ];
    /* ⚠️ THE DEFAULT IS DECLARED ONCE; A DENSITY VARIANT MAY RESTATE IT (v63, §D). The lock used to
       demand exactly one declaration, which was right while the board had one height and wrong the
       moment it gained three. The claim that survives is the one it was standing for: the FIRST
       declaration — the base rule on `.tl-board` — is the ref's selected value, and every other is
       inside a `[data-dens="…"]` block rather than loose in the sheet. */
    const inDensityBlock = (at: number) => {
      const open = src.lastIndexOf("[data-dens=", at);
      if (open < 0) return false;
      const close = src.indexOf("}", open);
      return close > at;
    };
    for (const [tok, want] of pinned) {
      expect(want, `the ref pins no ${tok}`).toBeTruthy();
      const all = [...src.matchAll(new RegExp(`${tok}\\s*:\\s*([^;]+);`, "g"))];
      const base = all.filter((m) => !inDensityBlock(m.index ?? 0)).map((m) => m[1].trim());
      const variants = all.filter((m) => inDensityBlock(m.index ?? 0)).map((m) => m[1].trim());
      expect(base, `${tok}: ${base.length} base declarations ${JSON.stringify(base)}`
        + ` (+${variants.length} in density blocks: ${JSON.stringify(variants)})`).toEqual([want]);
    }
  });
});

/**
 * ⚠️ THE SCRAWL IS DELETED, NOT HIDDEN (v37, Phase 5).
 *
 * It was a handwritten copy of the deed, set in Caveat beside the bar — a second rendering of a
 * fact the action column already states. v37 removes it, and the whole value of removing it is
 * that nothing is left to switch back on.
 *
 * ⚠️ SCOPED TO THE CALENDAR PATH, AND THAT IS NOT FUSSINESS. Caveat is live in ~46 files — the
 * post-its, the note bodies, the task pane, packages, the marketing hero — and a sweep for the
 * font across `src/` would forbid the app's own handwriting. `ImportOverview` also has a "scrawl"
 * of its own, an onboarding corner note, unrelated to this one. The subject here is three files.
 *
 * ⚠️ AND COMMENTS ARE STRIPPED FIRST. This repo documents every retirement by quoting what it
 * retired, so the prose still carries the word in six places — all past-tense lessons about real
 * faults, deliberately kept. A raw-text sweep would report the obituary as the corpse.
 */
describe("the scrawl is gone from the calendar", () => {
  const CAL = [
    "src/components/todo/TodoCalendarPage.tsx",
    "src/components/todo/todoCalendar.css",
    "src/lib/timelineCopy.ts",
  ];
  const stripAll = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("reads the calendar path — a sweep over nothing proves nothing", () => {
    for (const f of CAL) {
      expect(readFileSync(join(process.cwd(), f), "utf8").length, `${f} is empty`).toBeGreaterThan(400);
    }
  });

  it("no scrawl class is emitted or styled", () => {
    for (const f of CAL) {
      const src = stripAll(readFileSync(join(process.cwd(), f), "utf8"));
      /* ⚠️ BOUNDED, NOT A SUBSTRING. `tl-scr` is a prefix of nothing today and would be a prefix of
         `tl-screen` tomorrow; a complete class name is delimited by a quote, a space, a backtick or
         a brace on both sides. */
      expect(src, `${f} still names the scrawl class`).not.toMatch(/["'`\s{.]tl-scr["'`\s{,:]/);
    }
  });

  /**
   * ⚠️ CAVEAT IS BACK ON THIS BOARD, IN ONE PLACE, AND THE CLAIM HAS BEEN RESTATED RATHER THAN
   * DROPPED.
   *
   * This asserted that Caveat appeared nowhere in the calendar path, which was a proxy: the scrawl
   * was a HANDWRITTEN COPY OF THE DEED RIDING THE BAR — "a second rendering of a fact the action
   * column already states", in this block's own words — and the typeface was how you spotted it,
   * not what was wrong with it. v60 gives the flag a deed in Caveat, and a flag is not a duplicate:
   * it names a move that becomes available on a FUTURE date, which nothing else on the row says.
   *
   * ⚠️ SO THE LOCK NOW ASSERTS WHERE THE HAND MAY APPEAR, WHICH IS THE STRONGER CLAIM. `.tl-cap .w`
   * is the only selector in the sheet permitted to set it, and the page may not set it inline at
   * all — so a second handwritten element cannot be added without failing here, and the scrawl
   * cannot come back wearing a new class. The `tl-scr` clause above is untouched and still forbids
   * the original by name.
   */
  it("Caveat sets exactly one thing — the flag's deed — and the app's own hand is untouched", () => {
    const css = stripAll(readFileSync(join(process.cwd(), "src/components/todo/todoCalendar.css"), "utf8"));
    /* every rule in the calendar sheet that names the face, with its selector */
    const setters = [...css.matchAll(/(?:^|\})\s*([^{}]+?)\s*\{([^}]*Caveat[^}]*)\}/g)]
      .map((m) => m[1].trim().replace(/\s+/g, " "));
    expect(setters, `the calendar sheet sets Caveat on: ${setters.join(" | ")}`)
      /* ⚠️ RETARGETED TWICE, AND THE LAW HELD BOTH TIMES: Caveat is the ACTION's hand and nothing
         else's. v60's flag (`.tl-cap .w`) carried it; §E's action label (`.tl-actlab`) inherits the
         role with the element. One selector, the action's, and the app's own hand untouched. */
      .toEqual([".tl-actlab"]);
    /* the page and the copy module may not set it at all — a flag's deed is styled, never inlined */
    for (const f of ["src/components/todo/TodoCalendarPage.tsx", "src/lib/timelineCopy.ts"]) {
      const src = stripAll(readFileSync(join(process.cwd(), f), "utf8"));
      expect(src, `${f} sets Caveat inline`).not.toMatch(/Caveat/i);
    }
    /* the inverse, so this can never be "fixed" by deleting the app's hand */
    const postit = readFileSync(join(process.cwd(), "src/components/todo/todo.css"), "utf8");
    expect(postit, "the app's own Caveat has been swept away with the calendar's").toMatch(/Caveat/);
  });

  it("the earn-it predicate is orphaned nowhere — it does not exist", () => {
    for (const f of [...CAL, "src/lib/timelineCopy.test.ts", "tests/e2e/calFade55.measure.ts"]) {
      const src = stripAll(readFileSync(join(process.cwd(), f), "utf8"));
      expect(src, `${f} still references scrawlEarns`).not.toMatch(/scrawlEarns/);
    }
  });
});
