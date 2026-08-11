/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 2b — theme verification for the plate card.
 *
 * ⚠️ THE FAILURE THIS EXISTS FOR IS A SAGE PLATEBAND IN EDITORIAL. Editorial is monochrome and
 * has no sage anywhere; a sage band there is not "the theme with a green tint", it is the wrong
 * theme rendered on the right page. Nothing in a component spec can see it, because the colour is
 * three indirections away in a stylesheet.
 *
 * ⚠️ AND THE SECOND FAILURE IS QUIETER STILL: `calc()`/`var()` on an UNDEFINED custom property
 * yields nothing and CSS says nothing — the declaration is simply dropped. That is how a shell
 * selector once rendered 0px wide through a green typecheck, a green build and a green suite.
 * So this checks CONSUMPTION → DEFINITION: every `var(--x)` this stylesheet reads must resolve.
 * Checking that what we wrote arrived cannot catch what we referenced and never wrote.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const PLATE = strip(readFileSync(resolve(__dirname, "./manuscriptPlate.css"), "utf8"));
const PAGE = strip(readFileSync(resolve(__dirname, "./manuscripts.css"), "utf8"));

/** The declarations inside one selector's block. Anchored — a missing block fails here, loudly. */
function block(css: string, selector: string): string {
  const re = new RegExp(`${selector.replace(/[.\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  const m = re.exec(css);
  expect(m, `${selector} must exist as a rule of its own`).not.toBeNull();
  return m![1];
}

const token = (css: string, selector: string, name: string): string => {
  const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(block(css, selector));
  expect(m, `${name} must be defined on ${selector}`).not.toBeNull();
  return m![1].trim();
};

const THEMES = [".t-capp .msv1", ".t-bold .msv1", ".t-edn .msv1"] as const;
const ADDED = [
  "--msv-plateA", "--msv-plateB", "--msv-plateline",
  "--msv-palebg", "--msv-palebd", "--msv-paletx",
  "--msv-stripbg", "--msv-stripbd", "--msv-stripkey",
  "--msv-prbd",
] as const;

describe("the additions are complete — every new token, in every theme", () => {
  it.each(THEMES)("%s defines all ten", (sel) => {
    for (const t of ADDED) expect(token(PLATE, sel, t)).toBeTruthy();
  });

  /**
   * ⚠️ A TOKEN DEFINED IN TWO FILES IS A SILENT OVERRIDE. This stylesheet is ADDITIVE to
   * manuscripts.css; it must not redefine a token that file owns, or which one wins becomes a
   * question of load order rather than of intent.
   */
  it("and redefines nothing manuscripts.css already owns", () => {
    const owned = new Set(PAGE.match(/--msv-[a-zA-Z0-9-]+(?=\s*:)/g) ?? []);
    for (const t of ADDED) expect(owned.has(t), `${t} is already owned by manuscripts.css`).toBe(false);
  });
});

describe("⚠️ CONSUMPTION → DEFINITION — every var() this sheet reads must resolve", () => {
  it("no rule reads a token that does not exist", () => {
    const read = new Set((PLATE.match(/var\(\s*(--[a-zA-Z0-9-]+)/g) ?? []).map((v) => v.replace(/var\(\s*/, "")));
    const defined = new Set([
      ...(PLATE.match(/--[a-zA-Z0-9-]+(?=\s*:)/g) ?? []),
      ...(PAGE.match(/--[a-zA-Z0-9-]+(?=\s*:)/g) ?? []),
    ]);
    for (const r of read) expect(defined.has(r), `${r} is read but never defined`).toBe(true);
  });
});

describe("Cappuccino resolves to the values the design was drawn at", () => {
  const capp = (t: string) => token(PLATE, ".t-capp .msv1", t);

  /** These are the brief's literals — verification targets for THIS theme, not authored values. */
  it("the plateband is sage #dadfd7 → #d5dbd3", () => {
    expect(capp("--msv-plateA")).toBe("#dadfd7");
    expect(capp("--msv-plateB")).toBe("#d5dbd3");
  });

  it("the pale accent surface is #e7ede3", () => {
    expect(capp("--msv-palebg")).toBe("#e7ede3");
  });

  it("the stat strip is a white wash on the band", () => {
    expect(capp("--msv-stripbg")).toBe("rgba(255, 255, 255, 0.62)");
  });

  /** The accent pair is the theme's own — Cappuccino's --sd-hue IS the ref's burgundy #7c3a2a. */
  it("the primary action and active tab read the theme accent, not a hardcoded burgundy", () => {
    expect(block(PLATE, ".msv-btn.msv-primary")).toContain("var(--msv-huec)");
    expect(block(PLATE, ".msv-btn.msv-primary")).toContain("var(--msv-hue)");
    expect(block(PLATE, ".msv-tab.on")).toContain("var(--msv-hue)");
  });
});

describe("Bold Pastille wears its own band, not a recoloured sage one", () => {
  const bold = (t: string) => token(PLATE, ".t-bold .msv1", t);

  it("the plateband is Bold's pink", () => {
    expect(bold("--msv-plateA")).toBe("#f4c7c2");
    expect(bold("--msv-plateB")).toBe("#f4c7c2");
  });

  it("and closes on Bold's 1.5px ink rule — the theme's signature, kept", () => {
    expect(bold("--msv-plateline")).toBe("1.5px solid #1d1712");
    expect(bold("--msv-stripbd")).toContain("1.5px");
  });
});

describe("⚠️ EDITORIAL IS MONOCHROME — THE PLATEBAND MUST NOT BE SAGE", () => {
  const edn = (t: string) => token(PLATE, ".t-edn .msv1", t);

  it("the plateband is a pale grey step, not a green one", () => {
    expect(edn("--msv-plateA")).toBe("#f4f4f5");
    expect(edn("--msv-plateB")).toBe("#efeff0");
  });

  /** The sage vocabulary in play across the ref and the marks. None of it belongs here. */
  it("no sage hex appears anywhere in the Editorial block", () => {
    const SAGE = ["#dadfd7", "#d5dbd3", "#e7ede3", "#e9ede6", "#cdd8ca", "#b9c6b4", "#8a9e88", "#5a6e58", "#4a5a48", "#6a7a68"];
    const b = block(PLATE, ".t-edn .msv1").toLowerCase();
    for (const s of SAGE) expect(b, `Editorial must not carry ${s}`).not.toContain(s);
  });

  it("nor the sage rgba the ref uses for its hairlines", () => {
    expect(block(PLATE, ".t-edn .msv1")).not.toMatch(/138\s*,\s*158\s*,\s*136/);
  });

  /**
   * ⚠️ THE MECHANICAL CHECK, so a NEW green that is on nobody's list still fails.
   * A hex whose green channel leads both others perceptibly has a green cast, whatever it is called.
   */
  it("and no colour in the block has a green cast at all, named or not", () => {
    for (const hex of block(PLATE, ".t-edn .msv1").match(/#[0-9a-f]{6}/gi) ?? []) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(g > r + 2 && g > b + 3, `${hex} has a green cast and Editorial has no sage`).toBe(false);
    }
  });
});

describe("no rule authors a colour — the sheet declares tokens and reads them", () => {
  /**
   * The token blocks hold every hex. If a HEX appears in a rule instead, that colour has stopped
   * theming and one of the three themes is now wrong at that spot.
   */
  it("outside the three theme blocks, colour comes only from var()", () => {
    let rules = PLATE;
    for (const sel of THEMES) rules = rules.replace(new RegExp(`${sel.replace(/[.\\]/g, "\\$&")}\\s*\\{[^}]*\\}`), "");
    for (const hex of rules.match(/#[0-9a-f]{3,6}/gi) ?? []) {
      // #ffffff is the plate's own paper — the mark is drawn for a white ground in every theme.
      expect(["#ffffff"], `${hex} is authored in a rule and has stopped theming`).toContain(hex.toLowerCase());
    }
  });

  /** Geometry is structural and stays literal — radius 16, the two-layer dashboard shadow. */
  it("the card keeps the dashboard card grammar, and NOT the Form 11 inset frame", () => {
    const card = block(PLATE, ".msv-card");
    expect(card).toContain("border-radius: 16px");
    expect(card).toContain("var(--msv-card)");
    expect(card).toContain("var(--msv-cardbd)");
    expect(card).not.toContain("var(--msv-crad)");
    expect(PLATE).not.toContain("inset");
  });

  /**
   * ⚠️ NO TRANSFORM ON THE PLATEBAND OR THE PLATE. A transform on an ancestor isolates a blend
   * group. This plate's PNG needs no blend mode, so the trap is not armed today — but a hover lift
   * added here would arm it for anything that later moved inside.
   */
  it("neither the band nor the plate transforms", () => {
    expect(block(PLATE, ".msv-plateband")).not.toMatch(/transform/);
    expect(block(PLATE, ".msv-plateimg")).not.toMatch(/transform/);
  });

  it("and the plate carries no blend mode — these are not the dashboard's painted marks", () => {
    expect(PLATE).not.toContain("mix-blend-mode");
  });
});
