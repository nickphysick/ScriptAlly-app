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

/**
 * ⚠️ THE "IS IT GONE" CHECKS READ THE SHEET WITHOUT ITS COMMENTS, and they have to. A deletion worth
 * asserting is usually worth EXPLAINING in place, so the retired name appears in the prose that
 * records why it went — and a whole-file `toContain` cannot tell a rule from a mention, so it fails
 * on the comment that documents the fix. Stripping first also makes the assertion honest in the
 * other direction: someone re-adding the rule while leaving the comment cannot hide behind it.
 */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

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

  /**
   * ⚠️ RETARGETED, NOT RELAXED (Phase 2). The remove control was `.ct-x`; the row rebuild made both
   * row actions `.ct-iconbtn`, so this gate was reading an empty string and would have passed on
   * anything. The rule it guards is unchanged: removing a comp is an ordinary undoable action and
   * must never wear the advisory treatment. `rule()` now throws rather than returning "" when its
   * selector is missing, so the next rename fails loudly instead of quietly.
   */
  it("the row actions never borrow the caution token — removing a comp is not a warning", () => {
    const hover = rule(".ct-iconbtn:hover");
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
  /**
   * ⚠️ RETARGETED (Prompt 2): the Scout's add button was `.ct-addshelf` on the old result card and is
   * `.ct-sadd` on the rebuilt row. The RULE has not moved an inch — blue marks the tier, the verb
   * belongs to the writer — and `rule()` throws on a missing selector, which is how the rename was
   * caught rather than quietly passing against an empty string.
   */
  it("ADD stays soft pink and never turns blue", () => {
    const add = rule(".ct-sadd");
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
    expect(rules).not.toContain(".ct-verified {");
  });
});

describe("comps.css — the PRO tag is slate, one colour app-wide", () => {
  /**
   * ⚠️ IT READS THE APP'S `--slate`, NOT A PAGE-SCOPED COPY. themes.md: "slate already means Pro in
   * this app… one colour, one meaning." A copied hex would satisfy that sentence on the day it was
   * written and drift the first time the app's slate moved; reading the :root token cannot.
   */
  it("reads --slate and never the Scout's blue", () => {
    const tag = rule(".ct-tag.pro");
    expect(tag).toContain("var(--slate)");
    expect(tag).not.toContain("--ct-scout");
  });

  it("defines no page-scoped slate of its own to drift from", () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      expect(token(theme, "ct-pro"), `${theme} re-introduced a page slate`).toBeNull();
    }
  });
});

describe("comps.css — nothing on this page appraises a comp", () => {
  /**
   * ⚠️ THE STYLING WAS HALF THE VERDICT. The age chip sat in the caution treatment while reading
   * "Old for a market comp", and the composition note had `.ok` (tick) and `.tip` (caution) states.
   * The wording and the colour agreed the writer had chosen badly. Both treatments are DELETED, not
   * merely unused — a state nothing sets is the next person's invitation to set it.
   */
  it("the age chip is neutral, never the caution treatment", () => {
    const chip = rule(".ct-chip.age");
    expect(chip).not.toContain("--ct-warn");
    expect(chip).toContain("var(--ct-sect)");
  });

  it("the old caution chip and its dot are gone", () => {
    expect(rules).not.toContain(".ct-chip.warn");
    expect(rules).not.toContain(".ct-chip .dot");
  });

  it("the health note and its ok/tip states are gone", () => {
    expect(rules).not.toContain(".ct-hnote");
  });

  /**
   * ⚠️ RETARGETED (Phase 2): the composition moved from its own `.ct-comp-line` into the hero
   * caption, which is where Amendment 3 always said it belonged. The rule it guards is unchanged —
   * the composition is a count and must never acquire a state class or the advisory colour, which
   * is how `.ct-hnote`'s ok/tip pair became the verdict in the first place.
   */
  it("the composition sits in the caption, with no state class and no advisory colour", () => {
    /* ⚠️ RENAMED, NOT MOVED (v2 §3): `.ct-hero-cap` became `.ct-qline-cap` when the query line got
       its own card and the word "hero" went to the page hero above. The rule it guards is unchanged. */
    const cap = rule(".ct-qline-cap");
    expect(cap).not.toContain("--ct-warn");
    expect(cap).toContain("var(--ct-label)");
    /* ⚠️ BOUNDED TOKENS, NOT BARE `toContain`. `.ct-qline-cap` is a PREFIX of nothing today, but
       `.ct-qline-caption` would satisfy a substring check and a state class is exactly the kind of
       thing someone adds by lengthening a name. */
    expect(rules).not.toMatch(/\.ct-qline-cap\.(ok|tip)\b/);
    expect(rules).not.toContain(".ct-comp-line");
    /* the old name must not linger anywhere — two caption rules would drift */
    expect(rules).not.toMatch(/\.ct-hero-cap\b/);
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
    expect(rules).not.toMatch(/var\(\s*--ct-pro/);
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
