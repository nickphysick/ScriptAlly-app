/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BAR'S OWN GRAMMAR, read out of the stylesheet (Porcelain; ref design-refs/timeline-v35.html).
 *
 * ⚠️ THIS FILE IS A SOURCE LOCK AND KNOWS WHAT THAT IS WORTH. It proves a rule was WRITTEN, never
 * that it reached an element — so every claim here is about the sheet's own shape (a token exists,
 * a selector is not restated, a literal is absent) and every claim about what a bar ENDS UP
 * looking like is made in `tests/e2e/calLook.measure.ts`, against a rendered page. The two are not
 * interchangeable and this repo has been caught assuming they were.
 *
 * ⚠️ COMMENTS ARE STRIPPED BEFORE ANYTHING IS ASSERTED. Every retirement in this repo is
 * documented by quoting what it retired, so a sweep for hexes over raw source reads the prose
 * explaining the hexes it removed and reports them as offences.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const css = readFileSync(join(here, "todoCalendar.css"), "utf8");
const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** the five live families plus the two that have no fill of their own */
const FAMILIES = ["out", "req", "decide", "remind"] as const;

/** every base rule for a selector, joined — a grouped rule must not make a read ambiguous */
const rulesFor = (sel: string): string => {
  /* ⚠️ WHITESPACE IN A SELECTOR IS NOT SIGNIFICANT TO CSS AND MUST NOT BE TO THE READER EITHER.
     Escaping the string literally made `.tl-p.quiet  .tl-fl` (two spaces, as it happened to be
     typed) unfindable, and the lock reported that the rule did not exist — the vacuous-read
     failure this repo already records against first-match slicing, arriving through a space bar.
     ⚠️ AND IT IS ANCHORED AT A LINE START, so `.tl-fl` cannot match the tail of `.tl-p.out .tl-fl`
     and hand back a descendant rule as though it were the base one. */
  const esc = sel.trim().split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const re = new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`, "g");
  return [...decls.matchAll(re)].map((m) => m[1]).join(" ");
};

describe("⚠️ PILLS ARE DATA, CONTROLS ARE NOT PILLS", () => {
  /**
   * ⚠️ THE ONE RULE A READER CANNOT RECOVER FROM IF IT BREAKS. A pill-shaped button beside
   * pill-shaped bars reads as another piece of data — the reader learns the shape means "a fact
   * about this row" and then finds one of them is a control. Square corners make the two
   * categories unmistakable, and it costs nothing.
   */
  it("no control carries a bar's radius, and no bar carries a control's", () => {
    const CONTROLS = [".tl-abtn", ".tl-gtbtn"];
    for (const c of CONTROLS) {
      const r = rulesFor(c);
      expect(r, `${c} has no rule at all`).not.toBe("");
      expect(r, `${c} is drawn as a pill`).not.toMatch(/border-radius\s*:\s*999px/);
    }
    /* and the bar is a pill, which is the other half of the same claim */
    expect(rulesFor(".tl-p"), "the bar stopped being a pill").toMatch(/border-radius\s*:\s*999px/);
  });

  it("the action button states its ground, its line and its ink rather than inheriting them", () => {
    const r = rulesFor(".tl-abtn");
    expect(r).toMatch(/background\s*:\s*#fff/);
    expect(r).toContain("--tl-btn-line");
    expect(r).toContain("--tl-btn-ink");
  });
});

describe("⚠️ the fill is an element with a width, not a background", () => {
  /**
   * ⚠️ `background:` RESETS EVERY BACKGROUND LONGHAND, INCLUDING `background-image`. That is why
   * the fill is a CHILD rather than a gradient stop on the bar: a percentage written into a
   * colour value is a number no probe can read back and no reader can be sure of, and any later
   * rule reaching for the shorthand would erase it.
   */
  it("nothing that paints a bar uses the `background` SHORTHAND, except where a gradient IS the paint", () => {
    const bad: string[] = [];
    for (const m of decls.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
      const sel = m[1].replace(/\s+/g, " ").trim();
      if (!sel.includes(".tl-p") && !sel.includes(".tl-fl")) continue;
      const hit = m[2].match(/(?:^|;|\s)background\s*:[^;]*/);
      if (hit && !hit[0].includes("gradient") && !/transparent|#fff/.test(hit[0])) {
        bad.push(`${sel} → ${hit[0].trim()}`);
      }
    }
    expect(bad, `${bad.length} bar rules could erase the fill`).toEqual([]);
  });

  it("the fill's own rule sizes it by width and nothing else", () => {
    const r = rulesFor(".tl-fl");
    expect(r, ".tl-fl has no rule").not.toBe("");
    expect(r).toContain("left: 0");
    /* it must not carry a width of its own — the width IS the statement, set per bar */
    expect(r).not.toMatch(/(?:^|;|\s)width\s*:/);
  });
});

describe("⚠️ THE PULSE IS RETIRED, AND POSITION REPLACED IT", () => {
  /**
   * ⚠️ MOTION HAD TO BE SUPPRESSED UNDER `prefers-reduced-motion`, WHICH LEFT THE READER WHO
   * ASKED FOR NO MOTION WITH NO SIGNAL AT ALL. A bar at 85% of its stated span is at 85% whether
   * or not anything moves, and it is legible in a screenshot. Nothing on this board animates now
   * except the row's own hover fade and the tooltip's, which are state changes rather than
   * attractors.
   */
  it("no keyframes and no animation survive on the board", () => {
    expect(decls, "a keyframe block came back").not.toMatch(/@keyframes\s+tl/i);
    const animated = [...decls.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .filter((m) => /(?:^|;|\s)animation(?:-name)?\s*:/.test(m[2]))
      .map((m) => m[1].replace(/\s+/g, " ").trim());
    expect(animated, `${animated.length} rules still animate`).toEqual([]);
  });

  it("⚠️ and the reduced-motion block has nothing left to guard but transitions", () => {
    const block = decls.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(block, "the reduced-motion block went entirely").not.toBeNull();
    expect(block![1], "it still suppresses an animation that no longer exists")
      .not.toMatch(/animation/);
  });

  it("the deeper step at ≥85% is a token per family, not a shared grey", () => {
    for (const f of FAMILIES) {
      expect(decls, `--bar-${f}-near is missing`).toContain(`--bar-${f}-near:`);
      expect(rulesFor(`.tl-p.${f}.near .tl-fl`), `${f} has no near step`)
        .toContain(`--bar-${f}-near`);
    }
  });
});

describe("⚠️ bar colour is a token, never a literal", () => {
  it("no rule that paints a bar carries a hex or an rgb", () => {
    const bad: string[] = [];
    for (const m of decls.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
      const sel = m[1].replace(/\s+/g, " ").trim();
      /* the board's own block is where the values LIVE — it is the definition, not a use */
      if (!/\.tl-p\b|\.tl-fl\b|\.tl-mk2\b/.test(sel)) continue;
      for (const [, prop, val] of m[2].matchAll(/([a-z-]+)\s*:\s*([^;]+)/g)) {
        if (!/color|background|border/.test(prop)) continue;
        /* white and transparent are structural: a white TRACK is what the fill sits in */
        if (/#[0-9a-f]{3,8}\b/i.test(val) && !/#fff\b|#ffffff\b/i.test(val)) {
          bad.push(`${sel} → ${prop}: ${val.trim()}`);
        }
        if (/\brgb\(/i.test(val)) bad.push(`${sel} → ${prop}: ${val.trim()}`);
      }
    }
    expect(bad, `${bad.length} literals where a token belongs`).toEqual([]);
  });

  it("every family declares its quadruple, and the board owns them", () => {
    const board = css.slice(css.indexOf(".tl-board {"), css.indexOf(".tl-grp"));
    for (const f of FAMILIES) {
      for (const part of ["line", "fill", "near", "text"]) {
        expect(board, `--bar-${f}-${part} is not declared on the board`)
          .toContain(`--bar-${f}-${part}:`);
      }
    }
    /* the two that have no fill of their own, and say so by having no fill token */
    expect(board).toContain("--bar-quiet-hatch:");
    expect(board).toContain("--bar-closed-line:");
    expect(board, "closed grew a fill it has no use for").not.toContain("--bar-closed-fill:");
  });

  it("⚠️ the hatch is quiet's alone — there is no span for a fraction to be OF", () => {
    expect(rulesFor(".tl-p.quiet .tl-fl")).toContain("--bar-quiet-hatch");
    for (const f of FAMILIES) {
      expect(rulesFor(`.tl-p.${f} .tl-fl`), `${f} draws a hatch`).not.toContain("hatch");
    }
  });

  it("closed draws no fill element at all, and is the only dashed family", () => {
    const r = rulesFor(".tl-p.closedp");
    expect(r).toMatch(/border\s*:\s*1\.5px dashed/);
    expect(decls.match(/border[^;:]*:\s*[^;]*dashed[^;]*;/g)!.filter((d) => /1\.5px/.test(d)).length)
      .toBeGreaterThan(0);
  });
});

describe("⚠️ geometry comes from tokens, and no vertical offset is a literal", () => {
  it("the three facts are declared once, on the board", () => {
    const board = css.slice(css.indexOf(".tl-board {"), css.indexOf(".tl-grp"));
    for (const t of ["--row-h", "--bar-h", "--mk", "--tl-gap-mk", "--tl-gap"]) {
      expect(board, `${t} is not declared on the board`).toContain(`${t}:`);
    }
  });

  it("⚠️ bar height comes from `--bar-h` and nothing else", () => {
    expect(rulesFor(".tl-p")).toMatch(/height\s*:\s*var\(--bar-h\)/);
  });

  /**
   * ⚠️ NO `line-height` ANYWHERE IN THE BAR PATH — the text is centred by FLEX (v36, Phase 3).
   *
   * The label used to carry `line-height: var(--bar-h)`, and this lock REQUIRED it. A line box the
   * height of the bar centres text only while the text is one line at the size it was tuned for:
   * change the font, the size or the box and it drifts, silently, with the rule still reading
   * correctly. `display: flex; align-items: center` centres whatever is actually there, and the
   * rendered check in `calLook.measure.ts` asserts the painted text box sits within 1px of the
   * bar's own centre — which is the claim this one could only approximate.
   */
  it("⚠️ AND NO `line-height` SURVIVES UNDER A BAR SELECTOR", () => {
    const offenders: string[] = [];
    for (const m of decls.matchAll(/(?:^|\n)\s*([^{}\n]*)\{([^}]*)\}/g)) {
      const sel = m[1].replace(/\s+/g, " ").trim();
      if (!/\.tl-p\b|\.tl-plbl\b|\.tl-fl\b/.test(sel)) continue;
      if (/(?:^|;|\s)line-height\s*:/.test(m[2])) offenders.push(sel);
    }
    expect(offenders, `${offenders.length} bar rules still set a line box`).toEqual([]);
    /* the flex centring that replaced it, on the element that holds the label */
    expect(rulesFor(".tl-p")).toMatch(/display\s*:\s*flex/);
    expect(rulesFor(".tl-p")).toMatch(/align-items\s*:\s*center/);
    /* ⚠️ AND THE POPULATION — a sweep that matched no bar rules would report none for ever. */
    const scanned = [...decls.matchAll(/(?:^|\n)\s*([^{}\n]*)\{/g)]
      .filter((x) => /\.tl-p\b|\.tl-plbl\b|\.tl-fl\b/.test(x[1])).length;
    expect(scanned, "no bar rules scanned").toBeGreaterThan(5);
  });

  it("⚠️ a lane's position is a calc over --lane and --lanes, never a pixel", () => {
    const r = rulesFor(".tl-at2");
    expect(r).toContain("--lane");
    expect(r).toContain("--lanes");
    expect(r, "a lane offset is written as a literal").not.toMatch(/top\s*:\s*-?\d+px/);
  });

  it("⚠️ and the row's height is its lanes, never a floor that forgets them", () => {
    expect(rulesFor(".tl-rrow")).toMatch(/min-height\s*:\s*calc\(var\(--row-h\) \* var\(--lanes/);
  });
});

describe("⚠️ the marker's clearance is a halo, and it costs the bar nothing", () => {
  /**
   * ⚠️ `box-shadow` PAINTS OUTSIDE THE BOX AND TAKES NO LAYOUT. A marker sits ON a bar, so
   * without a ring of the row's own colour behind it the two inks touch and neither is legible —
   * and a clearance made of margin or padding would move the bar instead.
   */
  it("every marker carries a ring of the row's colour", () => {
    const r = rulesFor(".tl-mk2");
    expect(r).toMatch(/box-shadow\s*:\s*0 0 0 3px var\(--tl-row\)/);
    expect(r).toMatch(/width\s*:\s*var\(--mk\)/);
    expect(r).toMatch(/border-radius\s*:\s*999px/);
  });

  it("the four faces are four tokens, and none of them is a status colour", () => {
    for (const face of ["in", "out", "bang", "clock"]) {
      expect(decls, `--mk-${face}-line missing`).toContain(`--mk-${face}-line:`);
      expect(decls, `--mk-${face}-ink missing`).toContain(`--mk-${face}-ink:`);
    }
  });
});

describe("⚠️ the retired values are gone from the DECLARATIONS, not merely from the comments", () => {
  /**
   * ⚠️ THE YELLOW AND THE BLUE ARE THE REASON THE COLOUR RULE WAS SUSPENDED FOR THIS PACK. Neither
   * had a code token, so "read the colour out of the code" meant "invent one" — and what got
   * invented was a yellow reminder band and a blue decide bar on a board with no other yellow and
   * no other blue. They are named here so that re-typing one fails rather than merely looking odd.
   */
  const RETIRED = [
    "#cbd9e8", "#fff8e5", "#8e5252", "#787878", "#e0e0e0", "#d6d6d6",
    "#9db6cf", "#a3a3a3", "#c9a89e", "#eae2d6", "#c6d2e0", "#f6ecd2",
  ];
  it("none of them survives anywhere a rule can read it", () => {
    const found = RETIRED.filter((h) => decls.toLowerCase().includes(h));
    expect(found, `${found.length} retired values are still painted`).toEqual([]);
  });
});

describe("⚠️ the rail's pinned values, where a source lock is the right instrument", () => {
  /**
   * ⚠️ THE STEM IS DECLARED AT 1.5px AND CHROMIUM REPORTS 1px. A sub-pixel border's USED value
   * rounds at DPR 1, so the rendered check can only say it is painted and painted burgundy — the
   * declared width is a fact about the sheet and belongs here. This is the one place in this pack
   * where a source lock is stronger than a painted one, and it is stated so nobody "fixes" the
   * rendered assertion by pinning 1px.
   */
  it("the today stem is 1.5px in the sheet, whatever the used value rounds to", () => {
    expect(rulesFor(".tl-todaystem")).toMatch(/border-left:\s*1\.5px solid var\(--tl-nearblack\)/);
  });

  it("the rail's height is a token, and the columns it shares with a row are the same two", () => {
    const board = css.slice(css.indexOf(".tl-board {"), css.indexOf(".tl-grp"));
    expect(board).toContain("--tl-rail-h:");
    expect(rulesFor(".tl-rail")).toMatch(/height\s*:\s*var\(--tl-rail-h\)/);
    /* ⚠️ ONE RULE GIVES THE RAIL AND EVERY ROW THEIR FLEX, so the two cannot be given different
       column models by an edit to one of them. */
    expect(decls).toMatch(/\.tl-hrow,\s*\.tl-rrow,\s*\.tl-rail\s*\{[^}]*display:\s*flex/);
  });
});
