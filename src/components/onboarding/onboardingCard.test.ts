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

/* `chrome.tsx` (OnboardingCard, InboxMotif) is DELETED with its last reader, the closing page
   (onboarding v5 part 2). The absences these locks assert are read off the step parts that replaced
   it; the three claims that were about the card itself went with the card. */
const CHROME = read("setupParts.tsx");
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

  /* RE-POINTED (onboarding v5 part 2): the card and its `onbPrimaryBg` token are gone. The primary
     is the frame's navy pill, stated once in onboarding.css from the shell's token. */
  it("the primary is the frame's navy pill, from the shell's token", () => {
    const sheet = readFileSync(resolve(here, "onboarding.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sheet).toMatch(/\.sf \.sf-btn \{[^}]*background:\s*var\(--sp-anthracite\)/);
    expect(TOKENS).not.toContain("onbPrimaryBg");
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
  /* RE-POINTED (onboarding v5): the journey's ground is the app's INK SHELL now, read from the
     app's own token by `SetupFrame`'s sheet, and the `onbGround` copy is deleted with its last
     reader. Same law — the ground is the app's, never a mockup's sample. */
  it("the ground is the app's ink shell, by its token, and no copy of the old ground survives", () => {
    const sheet = readFileSync(resolve(here, "onboarding.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sheet).toMatch(/\.sf \{[^}]*background:\s*var\(--ink-shell\)/);
    expect(TOKENS).not.toContain("onbGround");
    for (const src of JOURNEY) expect(src).not.toContain("#f8f4ee");
  });

  /* RETIRED (onboarding v5 part 2): "the surface and hairline match the dashboard card" and "the
     card reads tokens" were claims about OnboardingCard, deleted with the closing page. What
     remains is that no onboarding-only token survives it. */
  it("no onboarding-only token outlives the card", () => {
    expect(TOKENS).not.toMatch(/export const onb[A-Z]/);
  });
});

describe("one card, not three", () => {
  /* RE-POINTED (onboarding v5): the welcome is an open title over one card now, built from the
     shared step parts. The law is the one this held — the welcome draws no card of its own. */
  it("the welcome screen renders the shared step parts, and no card of its own", () => {
    expect(ONBOARDING).toContain("<OpenTitle");
    expect(ONBOARDING).toContain("<StepCard");
    expect(ONBOARDING).not.toContain("<OnboardingCard");
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
  it("and nothing renders a fixed dot row", () => {
    expect(CHROME).not.toContain("DOT_TOTAL");
    for (const src of JOURNEY) expect(src).not.toContain("dotIndex");
  });
});

/* REWRITTEN (onboarding v5): `SelectRow` is deleted. Every option row is `OptionRow`, selection
   is a navy ring rather than a sage wash, and there is ONE shape — a radio — because every group
   in the journey is a set of alternatives. The lone-toggle shape went with the fallback screens
   that used it. */
describe("option rows are radios, selected with a navy ring", () => {
  const PARTS = readFileSync(resolve(here, "setupParts.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const SHEET = readFileSync(resolve(here, "onboarding.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("SelectRow and its sage tokens are gone", () => {
    expect(CHROME.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("SelectRow");
    expect(TOKENS).not.toContain("onbOptionSelectedFill");
  });

  it("selection is a 2px inset navy ring", () => {
    expect(SHEET).toMatch(/\.sf \.sf-opt\.is-on \{[^}]*inset 0 0 0 2px var\(--sp-anthracite\)/);
  });

  it("and the row reports its state as a radio, never as a pressed toggle", () => {
    expect(PARTS).toContain('role="radio"');
    expect(PARTS).toContain("aria-checked={selected}");
    expect(PARTS).not.toContain("aria-pressed");
  });
});
