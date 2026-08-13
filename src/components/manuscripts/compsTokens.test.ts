/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * comps.css token locks — the retone commit's decisions, asserted against the stylesheet.
 *
 * ⚠️ VALUES ARE EXTRACTED AND COMPARED IN CODE, NEVER MATCHED WITH A NEGATIVE LOOKAHEAD. A
 * `(?!#a3453a)` after optional whitespace matches the thing it excludes — `\s*` backtracks to zero
 * width and the lookahead is tested against the space. That shape has bitten this repo twice; the
 * fix is always to capture the value, trim it, and compare.
 *
 * ⚠️ AND EVERY BLOCK FOR A SELECTOR IS JOINED, not just the first. A grouped rule added above a
 * selector's real declaration silently repoints an `indexOf(".x {")` lock at a one-property stub —
 * which has caught workspacePageGrid.css twice, once inside the commit that was fixing it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "comps.css"), "utf8");

/** Every declaration block for a selector, joined — see the grouped-rule note above. */
function rule(selector: string): string {
  const out: string[] = [];
  const needle = `${selector} {`;
  let i = css.indexOf(needle);
  expect(i, `no rule found for "${selector}" — the lock is reading nothing`).toBeGreaterThan(-1);
  while (i > -1) {
    const end = css.indexOf("}", i);
    out.push(css.slice(i + needle.length, end));
    i = css.indexOf(needle, end);
  }
  return out.join("\n");
}

/** The three theme blocks, by the selector each is declared under. */
const THEMES = { capp: ".ctpage", bold: ".t-bold .ctpage", edn: ".t-edn .ctpage" } as const;

/** A token's value inside one theme block — captured, then compared in code. */
function token(theme: keyof typeof THEMES, name: string): string | null {
  const block = rule(THEMES[theme]);
  const m = block.match(new RegExp(`--${name}\\s*:([^;]*);`));
  return m ? m[1].trim() : null;
}

const rgb = (hex: string): [number, number, number] => {
  const h = hex.trim().replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/**
 * ⚠️ RED IS DETECTED BY CHANNEL DOMINANCE, NOT BY A LIST OF BANNED HEXES. A named-hue check passes
 * anything nobody thought to name — the manuscripts pack learned that when a rule written against
 * "sage" let pink straight through. Red here means: a saturated colour whose red channel clearly
 * leads. The house gold `#7d621d` reads 27 and passes; the two hexes this commit removed read 94
 * and 77 and would fail.
 */
const redLead = (hex: string): number => {
  const [r, g, b] = rgb(hex);
  return r > 120 ? r - Math.max(g, b) : 0;
};

/** The house gold advisory ink — design-refs/themes.md's established caution surface. */
const GOLD_INK = "#7d621d";
const GOLD_BG = "#f6efdd";

describe("comps.css — no red anywhere on this page", () => {
  it("every theme's advisory ink is the house gold, not a red of its own", () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      expect(token(theme, "ct-warn"), `${theme} advisory ink`).toBe(GOLD_INK);
      expect(token(theme, "ct-warn-bg"), `${theme} advisory ground`).toBe(GOLD_BG);
    }
  });

  it("no caution value in any theme is red-dominant", () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      for (const name of ["ct-warn", "ct-warn-bg", "ct-warn-bd"]) {
        const v = token(theme, name);
        if (!v || !v.startsWith("#")) continue; // Bold's ink border is checked below
        expect(redLead(v), `${theme} --${name} = ${v} leads red`).toBeLessThanOrEqual(40);
      }
    }
  });

  it("Bold keeps its ink caution border — its universal grammar, not a signal colour", () => {
    expect(token("bold", "ct-warn-bd")).toBe("#1d1712");
  });

  it("the remove button no longer borrows the caution token — removing a comp is not a warning", () => {
    const hover = rule(".ct-x:hover");
    expect(hover).not.toContain("--ct-warn");
    expect(hover).toContain("var(--ct-accent)");
  });
});

describe("comps.css — the Scout is pastille blue, the tier's colour", () => {
  const BLUE = {
    "ct-scout": "#7f96b0",
    "ct-scout-deep": "#2f4761",
    "ct-scout-ink": "#3f556e",
    "ct-scout-bg": "#eaf0f7",
    "ct-scout-band-a": "#d6e0ea",
    "ct-scout-band-b": "#d1dce8",
    "ct-scout-hover": "#fafcfe",
  };

  it("carries the amendment's values in every theme", () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      for (const [name, value] of Object.entries(BLUE)) {
        expect(token(theme, name), `${theme} --${name}`).toBe(value);
      }
    }
  });

  it("borders are the blue hairline, except Bold, which frames everything in ink", () => {
    expect(token("capp", "ct-scout-bd")).toBe("#ccd9e7");
    expect(token("edn", "ct-scout-bd")).toBe("#ccd9e7");
    expect(token("bold", "ct-scout-bd")).toBe("#1d1712");
  });

  /**
   * ⚠️ THE VERB STAYS PINK. Blue marks the TIER; ADD is an action, and every action in this app is
   * soft pink. A blue ADD would say the button belonged to Pro rather than to the writer.
   */
  it("ADD stays soft pink and never turns blue", () => {
    const add = rule(".ct-addshelf");
    expect(add).toContain("var(--ct-pink)");
    expect(add).not.toContain("--ct-scout");
  });
});

describe("comps.css — ✓ VERIFIED is sage, and it is one chip in both cards", () => {
  it("is the same sage in every theme", () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      expect(token(theme, "ct-verified"), `${theme} verified ink`).toBe("#4c5c49");
      expect(token(theme, "ct-verified-bg"), `${theme} verified ground`).toBe("#e9ede6");
    }
  });

  it("never reads the Scout's blue — the claim must not change colour with its column", () => {
    const chip = rule(".ct-chip.verified");
    expect(chip).toContain("var(--ct-verified)");
    expect(chip).not.toContain("--ct-scout");
  });

  it("has exactly ONE treatment — the old second one is gone, not merely unused", () => {
    expect(css).not.toContain(".ct-verified {");
  });
});

describe("comps.css — the retired token set", () => {
  /**
   * ⚠️ DELETED, NOT LEFT DEFINED-AND-UNREAD. A token nothing reads is the next person's false
   * lead: they find a `--ct-pro-bg` in the theme block, assume it governs the Pro surfaces, and
   * change it to no effect at all.
   */
  it("--ct-pro-* is gone from all three theme blocks", () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      for (const name of ["ct-pro", "ct-pro-deep", "ct-pro-bg", "ct-pro-bd", "ct-pro-ink", "ct-pro-tile"]) {
        expect(token(theme, name), `${theme} still defines --${name}`).toBeNull();
      }
    }
  });

  it("and nothing reads it", () => {
    expect(css).not.toMatch(/var\(\s*--ct-pro/);
  });
});

/**
 * ⚠️ CHECKED FROM CONSUMPTION TO DEFINITION. `calc()` on an undefined custom property yields NaN
 * and CSS says nothing — the declaration is simply dropped, through a green build and a green
 * suite. Grepping for the tokens you ADDED cannot catch the ones you REFERENCED and never wrote;
 * the direction is the whole point.
 */
describe("comps.css — every token it reads is defined", () => {
  it("no rule reads a --ct- token that does not exist", () => {
    const read = new Set(Array.from(css.matchAll(/var\(\s*(--ct-[a-z0-9-]+)/g), (m) => m[1]));
    /* ⚠️ NOT ANCHORED TO LINE START — this file declares several tokens per line, so `^\s*` saw
       only the first of each and reported twelve live tokens as dangling. A colon is what makes a
       declaration; a `var()` reference is never followed by one, so this cannot confuse the two. */
    const defined = new Set(Array.from(css.matchAll(/(--ct-[a-z0-9-]+)\s*:/g), (m) => m[1]));
    const dangling = [...read].filter((t) => !defined.has(t));
    expect(dangling, `read but never defined: ${dangling.join(", ")}`).toEqual([]);
  });
});
