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
 * measured on a rendered page (`calLook.measure.ts`) — including the independence itself, which is
 * proved by overriding one token and watching the other hold.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = join(process.cwd(), "src/components/todo/todoCalendar.css");

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

  it("the three tokens are declared once each, at the values v37 pins", () => {
    const root = src.match(/(^|\n)\.tl-board\s*\{([\s\S]*?)\}/) ?? src.match(/(^|\n):root\s*\{([\s\S]*?)\}/);
    expect(root, "no token block found").not.toBeNull();
    for (const [tok, want] of [["--row-h", "52px"], ["--bar-h", "34px"], ["--mk", "30px"]] as const) {
      const hits = [...src.matchAll(new RegExp(`${tok}\\s*:\\s*([^;]+);`, "g"))].map((m) => m[1].trim());
      expect(hits, `${tok} is declared ${hits.length} times: ${JSON.stringify(hits)}`).toEqual([want]);
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

  it("no Caveat in the calendar path — and the app's own handwriting is untouched", () => {
    for (const f of CAL) {
      const src = stripAll(readFileSync(join(process.cwd(), f), "utf8"));
      expect(src, `${f} still sets Caveat`).not.toMatch(/Caveat/i);
    }
    /* the inverse, so this can never be "fixed" by deleting the app's hand */
    const postit = readFileSync(join(process.cwd(), "src/components/todo/todo.css"), "utf8");
    expect(postit, "the app's own Caveat has been swept away with the calendar's").toMatch(/Caveat/);
  });

  it("the earn-it predicate is orphaned nowhere — it does not exist", () => {
    for (const f of [...CAL, "src/lib/timelineCopy.test.ts", "tests/e2e/calLook.measure.ts"]) {
      const src = stripAll(readFileSync(join(process.cwd(), f), "utf8"));
      expect(src, `${f} still references scrawlEarns`).not.toMatch(/scrawlEarns/);
    }
  });
});
