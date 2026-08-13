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
  /* Variant D's additions — the white band, the hairline, the plate's fill, the inline-edit hover. */
  "--msv-bandbg", "--msv-bandline", "--msv-platefill", "--msv-platefillbd", "--msv-edithov",
  "--msv-palebg", "--msv-palebd", "--msv-paletx", "--msv-pinkplate",
  "--msv-spine1", "--msv-spine2", "--msv-spine3", "--msv-dash",
  "--msv-stripbg", "--msv-stripbd", "--msv-stripkey",
  "--msv-prbd", "--msv-count", "--msv-countnone",
  "--msv-swbg", "--msv-swbd", "--msv-swon",
] as const;

describe("the additions are complete — every new token, in every theme", () => {
  it.each(THEMES)("%s defines all of them", (sel) => {
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

  /**
   * ⚠️ REPOINTED BY THE WHITE PLATEBAND (variant D), and the old value is the reason this lock has
   * to change rather than bend. A translucent white wash was a real surface ON SAGE; on a white band
   * it is nothing at all. The strip now sits on parchment with a warm hairline — a step off the
   * band rather than a tint of it.
   */
  it("the stat strip is parchment, so it reads against the white band", () => {
    expect(capp("--msv-stripbg")).toBe("#fdfaf5");
    expect(capp("--msv-stripbd")).toBe("1px solid #e2dacf");
  });

  /** Variant D: the band is white and closes on a hairline; no gradient anywhere on it. */
  it("the plateband is white with a hairline, and the sage gradient moved to the library card", () => {
    expect(capp("--msv-bandbg")).toBe("#ffffff");
    expect(capp("--msv-bandline")).toBe("1px solid #ece4d8");
    const band = block(PLATE, ".msv-plateband");
    expect(band).toContain("var(--msv-bandbg)");
    expect(band).not.toContain("linear-gradient");
  });

  /** Sage survives in exactly two places on the band: the plate's fill, and the genre pills. */
  it("the plate carries the sage fill the band gave up", () => {
    expect(capp("--msv-platefill")).toBe("#e7ede3");
    const plate = block(PLATE, ".msv-plateimg");
    expect(plate).toContain("var(--msv-platefill)");
    expect(plate).not.toContain("box-shadow");
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

  /**
   * ⚠️ BOLD'S VARIANT-D "HAIRLINE" IS ITS INK RULE, and that is not a deviation. Every edge in this
   * theme is 1.5px ink; a thin warm hairline here would be the one soft line on the page.
   */
  it("takes the white band with an ink rule rather than a hairline", () => {
    expect(bold("--msv-bandbg")).toBe("#fffefb");
    expect(bold("--msv-bandline")).toBe("1.5px solid #1d1712");
  });

  /**
   * ⚠️ AND ITS PLATE FILL IS PINK, NOT --msv-palebg. That token is #ffffff in Bold (the genre pills
   * are white with an ink border), so reusing it would put a white plate on a white band and the
   * plate would disappear. Sage's ROLE in Bold is pink; this is that role.
   */
  it("fills the plate with pink, because its pale token is white", () => {
    expect(bold("--msv-platefill")).toBe("#f8dcd8");
    expect(bold("--msv-platefill")).not.toBe(bold("--msv-palebg"));
    expect(bold("--msv-platefill")).not.toBe(bold("--msv-bandbg"));
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
   * ⚠️ THE MECHANICAL CHECK, so a hue on nobody's list still fails — and it tests for CHROMA, not
   * for green. Editorial has no sage AND no pink: the tile plates are two neutral steps, not a
   * sage one and a pink one. A green-only check would have passed the pink plate straight through,
   * which is the same mistake one rung along.
   */
  it("and NO colour in the block carries a hue at all — not green, not pink, none", () => {
    for (const hex of block(PLATE, ".t-edn .msv1").match(/#[0-9a-f]{6}/gi) ?? []) {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const chroma = Math.max(...ch) - Math.min(...ch);
      expect(chroma, `${hex} carries a hue (chroma ${chroma}) and Editorial is monochrome`).toBeLessThanOrEqual(6);
    }
  });

  it("the two tile plates are distinct steps, so the design's distinction survives monochrome", () => {
    expect(edn("--msv-pinkplate")).not.toBe(edn("--msv-palebg"));
  });

  /**
   * ⚠️ THE REF ROTATES THREE HUES for the comp spines (sage/tan/mauve). In Editorial the rotation
   * has to survive as LIGHTNESS, because the theme has no hues to rotate through. Three identical
   * greys would silently retire a distinction the design draws.
   */
  /**
   * ⚠️ THE SWITCHER'S ACTIVE FILL IS PINK IN THE WARM THEMES AND MUST NOT BE IN EDITORIAL — the
   * same rule as the plateband and the tile plates, applied to a third surface. It is covered by
   * the chroma sweep above; this states the intent so the sweep's failure is legible.
   */
  it("the switcher's selected state is a grey step, not a pink one", () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(edn("--msv-swon").slice(i, i + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(6);
  });

  it("the three comp spines stay distinguishable in Editorial — by value, not by hue", () => {
    const spines = [edn("--msv-spine1"), edn("--msv-spine2"), edn("--msv-spine3")];
    expect(new Set(spines).size).toBe(3);
    const lum = spines.map((h) => parseInt(h.slice(1, 3), 16));
    expect(Math.max(...lum) - Math.min(...lum)).toBeGreaterThanOrEqual(24);
  });
});

/**
 * ⚠️ SHADOW-ONLY HOVER, AND THIS LOCK EXISTS BECAUSE THE FIX WAS ALREADY LOST ONCE.
 * A card lift inside a clipping container pushes the card's top edge past the clip, so the lift
 * reads as the top hairline vanishing rather than as movement. `024e8ab` fixed it; an in-flight
 * revision that predated that fix reinstated `translateY` and landed with `a7b5d54`. A comment
 * would not have caught that, and did not — only an assertion can.
 */
describe("⚠️ cards flush to a clipping boundary hover by SHADOW, never by lift", () => {
  const PAGE_RAW = readFileSync(resolve(__dirname, "./manuscripts.css"), "utf8");
  const rule = (sel: string) => {
    const m = new RegExp(`\\${sel}:hover\\s*\\{([^}]*)\\}`).exec(strip(PAGE_RAW));
    expect(m, `${sel}:hover must exist as a rule of its own`).not.toBeNull();
    return m![1];
  };

  it("the spine switcher lifts nothing", () => {
    expect(rule(".msv-spine")).not.toMatch(/transform/);
    expect(rule(".msv-spine")).toContain("box-shadow");
  });

  /** …and the same for the tiles, which sit inside the card's own `overflow: hidden`. */
  it("nor does a details tile", () => {
    expect(block(PLATE, ".msv-btile:hover")).not.toMatch(/transform/);
    expect(block(PLATE, ".msv-btile:hover")).toContain("box-shadow");
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
    /**
     * Two exemptions, both FIXED BRAND CONSTANTS rather than themed surfaces:
     *   #ffffff — the plate's own paper; the PNG is drawn for a white ground in every theme.
     *   #6a89a7 — the Pro slate, which is the same badge everywhere in the app by decision.
     * Anything else appearing here has stopped theming and one of the three is now wrong.
     */
    for (const hex of rules.match(/#[0-9a-f]{3,6}/gi) ?? []) {
      expect(["#ffffff", "#6a89a7"], `${hex} is authored in a rule and has stopped theming`).toContain(hex.toLowerCase());
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
