/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four layout laws, scanned in the stylesheets they govern.
 *
 * ⚠️ COMMENTS ARE STRIPPED FIRST. Every one of these files EXPLAINS the fault it was written to
 * avoid, quoting the banned declaration to do it — `margin: -8px 0 16px` appears in prose beside
 * the rule that replaced it. A scan over raw source finds the explanation and reports it as the
 * offence; this repo has burned seven false reds on exactly that. Strip, then assert.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/**
 * ⚠️ THE SCOPE IS THREE SHEETS NOW, NOT ONE (settings-mode pack, Phase 2). The chassis moved into
 * `settingsCards.css` and the rail into `settingsRail.css`, and a sweep still pointed at
 * `settings.css` alone would have gone on passing while covering a third of the scope — which is
 * the shape this repo records as "a carve-out naming pages that no longer differ silently shrinks
 * the population". Widening it was not optional: two of these laws went RED the moment the sheets
 * split, because the rhythm's tokens are DEFINED in one file and READ in another.
 */
const SETTINGS_SHEETS = ["settings.css", "settingsCards.css", "settingsRail.css"] as const;

const SHEETS = {
  ...Object.fromEntries(
    SETTINGS_SHEETS.map((f) => [f, decls(readFileSync(join(here, f), "utf8"))]),
  ) as Record<(typeof SETTINGS_SHEETS)[number], string>,
  "planComparison.css": decls(readFileSync(join(here, "..", "plans", "planComparison.css"), "utf8")),
};

/** The settings scope as one string — for the laws that are about the SCOPE, not about a file. */
const SCOPE = SETTINGS_SHEETS.map((f) => SHEETS[f]).join("\n");

describe("law 2 — no negative margins anywhere in the settings scope", () => {
  for (const [name, css] of Object.entries(SHEETS)) {
    it(`${name} declares none`, () => {
      const found = css.match(/margin[a-z-]*:\s*[^;]*-\d/g) ?? [];
      expect(found, `negative margins in ${name}: ${found.join(" | ")}`).toEqual([]);
    });
  }
});

describe("law 4 — nowrap only on a mono chip label", () => {
  /* ⚠️ TWO PERMITTED USES IN THE SCOPE, AND EACH IS NAMED WITH ITS REASON — which is what keeps
     this a law rather than a budget. The RAIL ITEM: a section label wrapping mid-word inside a
     224px column would break the rail's rhythm, and the button already clips its own overflow, so
     the wrap has nowhere useful to happen. The STATUS CHIP: "Connected" / "Not set" is a two-word
     tag whose whole shape is a pill, and a pill on two lines is not a pill — the same reason
     `planComparison.css` is allowed its one.
     ⚠️ AND THE COUNT IS ASSERTED PER FILE, NOT ONLY IN TOTAL. A scope total of two is satisfied by
     one file using it twice and the other not at all, which is a different page. */
  it("the scope uses it twice — the rail item and the status chip, and nowhere else", () => {
    const uses = (SCOPE.match(/white-space:\s*nowrap/g) ?? []).length;
    expect(uses, "exactly two in the scope").toBe(2);
    expect((SHEETS["settingsRail.css"].match(/white-space:\s*nowrap/g) ?? []).length).toBe(1);
    expect((SHEETS["settingsCards.css"].match(/white-space:\s*nowrap/g) ?? []).length).toBe(1);
    expect(SHEETS["settings.css"]).not.toContain("nowrap");
  });

  /* ⚠️ ONE PERMITTED USE, AND IT IS NAMED. A two-line "CURRENT" pill is not a pill; a two-line
     VALUE is fine, which is why `.plc-figure` lost its own. */
  it("planComparison.css uses it once, on the chip", () => {
    const uses = (SHEETS["planComparison.css"].match(/white-space:\s*nowrap/g) ?? []).length;
    expect(uses, "exactly one").toBe(1);
    const chip = SHEETS["planComparison.css"].slice(
      SHEETS["planComparison.css"].indexOf(".plc-chip {"),
    );
    expect(chip.slice(0, chip.indexOf("}"))).toContain("nowrap");
  });
});

/* ⚠️ THE SPACING TOKENS ARE DEFINED EXACTLY ONCE (law 3). A second definition anywhere is a second
   rhythm, which is the state this build was opened to end. */
describe("law 3 — one rhythm, defined once", () => {
  const TOKENS = ["--acct-s-label", "--acct-s-note", "--acct-s-block", "--acct-s-rule"];

  /* ⚠️ DECLARED ONCE ACROSS THE WHOLE SCOPE, not once per file. Three sheets each declaring the
     same gap is three rhythms wearing one name, which is exactly the state law 3 exists to end —
     and a per-file count would report all three as correct. */
  for (const t of TOKENS) {
    it(`${t} is declared once in the whole scope`, () => {
      const declared = (SCOPE.match(new RegExp(`${t}\\s*:`, "g")) ?? []).length;
      expect(declared, `${t} declarations across ${SETTINGS_SHEETS.join(", ")}`).toBe(1);
    });
  }

  /* ⚠️ READ ANYWHERE IN THE SCOPE, because the definition and the use are now in different files:
     `settings.css` declares the rhythm on `.acct-page` and `settingsCards.css` reads it from the
     rows inside. Requiring the reader to be the same file would fail on a correct build. */
  it("and each is actually read, so none is a knob nobody turns", () => {
    for (const t of TOKENS) {
      expect(SCOPE, t).toContain(`var(${t})`);
    }
  });
});

/* ⚠️ AND EVERY `var()` THE SHEET READS MUST RESOLVE. A calc() on an undefined custom property
   yields NaN and the declaration is silently dropped — the fault that once rendered the shell's
   only active marker 0px wide through a green build and 2,259 green tests. */
describe("no settings rule reads a token that does not exist", () => {
  /* ⚠️ THE SWEEP IS OVER THE SCOPE, AND THAT IS FORCED RATHER THAN TIDY. `--acct-s-label` is
     defined in `settings.css` and read in `settingsCards.css`; a per-file sweep would report a
     correct build as reading a token that does not exist. The claim was never "this file defines
     what it reads" — it is "nothing in the settings scope reads a token nothing defines", and a
     `calc()` over an undefined property is silently dropped, which is the fault that once rendered
     the shell's only active marker 0px wide through a green build. */
  it("every locally-namespaced var() has a definition somewhere in the scope", () => {
    const read = new Set([...SCOPE.matchAll(/var\((--acct-[a-z-]+)/g)].map((m) => m[1]));
    for (const token of read) {
      expect(SCOPE, `${token} is read but never defined`).toContain(`${token}:`);
    }
    expect(read.size, "the scan must have found some").toBeGreaterThan(3);
  });

  /* ⚠️ AND THE INVERSE — every `--acct-*` DEFINED is read. It is the half that catches a token left
     behind by the thing that used to read it: `--acct-rail` and `--acct-gap` survived the rail's
     move for exactly as long as it took to look, describing a two-column grid that no longer
     existed. A definition with no reader is a knob nobody turns. */
  it("and every one defined is read, so none is left behind by its consumer", () => {
    const defined = new Set([...SCOPE.matchAll(/(--acct-[a-z-]+)\s*:/g)].map((m) => m[1]));
    for (const token of defined) {
      expect(SCOPE, `${token} is defined but nothing reads it`).toContain(`var(${token}`);
    }
    expect(defined.size, "the scan must have found some").toBeGreaterThan(3);
  });
});
