/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ FORM 11 IS RETIRED FROM THE ONBOARDING JOURNEY — these are the locks that keep it retired.
 *
 * The journey used to wear three card styles in four screens: the welcome's own `ModalCard`, a
 * cream transition card, then the Form 11 parchment skin (paper-texture data-URI, 6px inset
 * burgundy rim, soft-pink primary). None of them matched the dashboard the writer lands on. There
 * is one card now, made of the app's own material.
 *
 * These read source because what they assert is mostly an ABSENCE, and an absence has no render.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

const CHROME = read("chrome.tsx");
const ONBOARDING = read("../Onboarding.tsx");
const BRANCH_A = read("BranchA.tsx");
const BRANCH_B = read("BranchB.tsx");
const TOKENS = readFileSync(resolve(here, "../../lib/designTokens.ts"), "utf8");

const JOURNEY = [CHROME, ONBOARDING, BRANCH_A, BRANCH_B];

describe("the Form 11 skin is gone from every screen in the journey", () => {
  it("no component is called Form11Card any more", () => {
    for (const src of JOURNEY) expect(src).not.toContain("Form11Card");
  });

  it("no paper texture", () => {
    for (const src of JOURNEY) expect(src).not.toContain("PAPER_TEXTURE");
    expect(CHROME).not.toContain("feTurbulence");
  });

  /** The 6px inset burgundy rim — the single most recognisable piece of the old skin. */
  it("no inset burgundy rim", () => {
    for (const src of JOURNEY) {
      expect(src).not.toContain("rgba(124,58,42,0.28)");
      expect(src).not.toContain("rgba(124, 58, 42, 0.28)");
    }
  });

  it("no parchment surface", () => {
    for (const src of JOURNEY) expect(src).not.toContain("#fdfaf5");
  });
});

describe("the primary is ink — never pink, never burgundy", () => {
  /**
   * ⚠️ PINK IS NOT A PRIMARY IN THIS JOURNEY. `#f5e2da` on `#e8c8bc` was the Form 11 primary pair,
   * and it is the same treatment the app uses for a surface asking something of you.
   */
  it("the old pink primary pair appears nowhere", () => {
    for (const src of JOURNEY) {
      expect(src).not.toContain("#f5e2da");
      expect(src).not.toContain("#e8c8bc");
    }
  });

  it("the card's primary reads from the ink token", () => {
    expect(CHROME).toContain("onbPrimaryBg");
    expect(TOKENS).toContain('export const onbPrimaryBg = "#1c130f"');
  });

  it("nothing in the journey sets a burgundy background", () => {
    for (const src of JOURNEY) expect(src).not.toMatch(/background:\s*["'`]?#7c3a2a/);
  });

  it("the primaryFilled escape hatch is gone — there is only one primary now", () => {
    for (const src of JOURNEY) expect(src).not.toContain("primaryFilled");
  });
});

describe("the card is made of the app's own material", () => {
  /**
   * ⚠️ SOURCED FROM THE LIVE MODULES, NOT THE MOCKUP. The ref's hexes were sampled off a
   * screenshot and drift: it carries #f8f4ee where index.css defines --ws-ground #f7f4ee. A card
   * built to the mockup's numbers would be a near-miss of the app it introduces, which is worse
   * than an obvious difference.
   */
  it("the ground matches the app's workspace ground, not the mockup's sample", () => {
    expect(TOKENS).toContain('export const onbGround = "#f7f4ee"');
    for (const src of JOURNEY) expect(src).not.toContain("#f8f4ee");
  });

  it("the surface and hairline match the dashboard card", () => {
    expect(TOKENS).toContain('export const onbSurface = "#fffdf9"'); // .os-card fill
    expect(TOKENS).toContain('export const onbHairline = "#e9e2d7"'); // --ws-edge
  });

  it("the card reads tokens rather than inlining its own colours", () => {
    expect(CHROME).toContain('from "../../lib/designTokens"');
  });
});

describe("one card, not three", () => {
  it("the welcome screen renders the shared card", () => {
    expect(ONBOARDING).toContain("<OnboardingCard");
  });

  it("its own ModalCard and StageCard are gone", () => {
    expect(ONBOARDING).not.toContain("ModalCard");
    expect(ONBOARDING).not.toContain("StageCard");
  });

  /**
   * ⚠️ THE LOCAL PALETTE IS THE THING THAT LET THEM DRIFT. A 19-hex token object private to one
   * file is how a journey ends up in a colour the app does not have.
   */
  it("Onboarding carries no private palette", () => {
    expect(ONBOARDING).not.toMatch(/const C = \{/);
    expect(ONBOARDING).not.toContain("#F5F0EA");
  });
});

describe("the band states position honestly or not at all", () => {
  it("the step marker is optional", () => {
    expect(CHROME).toContain("step?: string");
  });

  it("and nothing renders a fixed dot row", () => {
    expect(CHROME).not.toContain("DOT_TOTAL");
    for (const src of JOURNEY) expect(src).not.toContain("dotIndex");
  });
});

describe("option rows select in sage", () => {
  it("selection uses the sage ink and the pale sage wash", () => {
    expect(CHROME).toContain("sageText");
    expect(CHROME).toContain("onbOptionSelectedFill");
    expect(TOKENS).toContain('export const onbOptionSelectedFill = "#fbfdfa"');
  });

  /**
   * ⚠️ TWO SHAPES, BOTH ANNOUNCED. A lone row is a toggle and takes `aria-pressed`; a row inside a
   * set of mutually exclusive choices opts into `radio`, because a screen reader given
   * `aria-pressed` there is told three independent switches happen to be on and off rather than one
   * choice out of three. The `radio` flag is what picks between them, and BOTH must survive — this
   * used to assert `aria-pressed` alone, and went red the day the capture fork needed the other.
   */
  it("and the row reports its state to assistive tech, in whichever shape it is in", () => {
    expect(CHROME).toContain('aria-pressed={radio ? undefined : selected}');
    expect(CHROME).toContain('aria-checked={radio ? selected : undefined}');
    expect(CHROME).toContain('role={radio ? "radio" : undefined}');
  });
});
