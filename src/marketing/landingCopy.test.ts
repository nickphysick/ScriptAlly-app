/**
 * Copy locks for the landing. The hero is word-authoritative from
 * design-refs/scriptally-landing-hero-v3.html; everything below it from landing-v13.html. These
 * tests pin the exact strings the components render (repo convention: pure node tests; the
 * components consume these same constants, so a drift in either place fails here).
 *
 * ⚠️ THE PUNCTUATION IS PART OF THE LOCK. The semicolon after "traditional publication", the
 * lowercase `a` that opens the lede, and the real ellipsis characters elsewhere on the page are
 * all deliberate. A lock that only checked the words would let every one of them be tidied away.
 */

import { describe, it, expect } from "vitest";
import {
  HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_B, HERO_EYEBROW, CTA_START,
  CTA_BAND_H2, DOCUMENT_TITLE, FEATURE_ROWS, PULSE_HEADING, PULSE_SUB,
} from "./landingCopy";

/** The lede is segments now (one is bold); this is the sentence a reader actually sees. */
const ledeText = () => HERO_LEDE.map((s) => s.text).join("");

describe("landing copy — verbatim locks", () => {
  it("strapline", () => {
    expect(HERO_H1).toBe("You've written a book.");
  });

  it("the lede resumes the headline's sentence, word for word", () => {
    expect(ledeText()).toBe(
      "and now your quest for agent representation begins; an endless, gruelling campaign of " +
        "self-promotion in a fiercely competitive, ever-changing market."
    );
  });

  /** ⚠️ ONE bold phrase, and it is the thing the sentence is about. */
  it("sets `agent representation` in the heavier ink, and nothing else", () => {
    expect(HERO_LEDE.filter((s) => s.b).map((s) => s.text)).toEqual(["agent representation"]);
  });

  /**
   * ⚠️ THE LOWERCASE OPENING IS THE DEVICE, AND IT IS THE THING MOST LIKELY TO BE "CORRECTED".
   * Asserted on its own so the failure names the cause rather than diffing a 200-character string.
   */
  it("opens lowercase, and hides no ellipsis in the string", () => {
    expect(ledeText().startsWith("and now")).toBe(true);
    expect(ledeText()).not.toContain("…");
    expect(ledeText()).not.toContain("...");
  });

  /**
   * ⚠️ RETARGET: `robots` is UNDERLINED now, not mono. The postscript became Caveat, and a
   * monospace word inside a handwritten line reads as a rendering fault. Same claim as before —
   * exactly one word carries the treatment — asserted against the flag that now names it.
   */
  it("marks `robots`, and nothing else, inside an otherwise plain sentence", () => {
    expect(HERO_GRIND.map((s) => s.text).join("")).toBe("Oh, and now you're up against robots, too.");
    expect(HERO_GRIND.filter((s) => s.underline).map((s) => s.text)).toEqual(["robots"]);
  });

  /**
   * ⚠️ RETARGET: the turn is ONE line. `HERO_TURN_A` ("You are not alone.") is deleted, so the
   * old two-register claim no longer has a subject. Asserting its ABSENCE is the stronger
   * replacement — it is what stops the softening line being reinstated from a diff.
   */
  it("the turn is one line, and the reassurance in front of it is gone", async () => {
    expect(HERO_TURN_B).toBe("ScriptAlly tips the odds back in your favour.");
    const copy = await import("./landingCopy");
    expect("HERO_TURN_A" in copy).toBe(false);
    expect(Object.values(copy).filter((v): v is string => typeof v === "string"))
      .not.toContain("You are not alone.");
  });

  /**
   * ⚠️ RETARGET: the microline and the pricing link are both DELETED, so the hero ends on one
   * CTA. The previous version of this test asserted the microline's wording; asserting that
   * neither string is exported any more is the claim that now matters, because a hero with three
   * things under the headline is exactly what this change removed.
   */
  it("eyebrow and one primary CTA — no microline, no pricing link", async () => {
    expect(HERO_EYEBROW).toBe("For querying writers");
    expect(CTA_START).toBe("Start tracking — it's free");
    const copy = await import("./landingCopy");
    expect("HERO_NOTE" in copy).toBe(false);
    expect("CTA_PRICING" in copy).toBe(false);
    expect(Object.values(copy).filter((v): v is string => typeof v === "string"))
      .not.toContain("See pricing");
  });

  /**
   * ⚠️ THE PHRASE HAS ONE HOME NOW. "A finger on the pulse" was a row heading and is the centred
   * section heading above the showreel; saying it twice on one page reads as a stutter, and the
   * retitle is the whole reason the row is called "From beginning to end". Asserted as a
   * page-wide count rather than as a string on the section, so restoring the row heading fails
   * here rather than quietly giving the page two of them.
   */
  it("says `a finger on the pulse` in exactly one place", () => {
    const said = [
      PULSE_HEADING.map((s) => s.text).join(""),
      ...FEATURE_ROWS.map((r) => r.heading),
      ...FEATURE_ROWS.flatMap((r) => r.body.map((b) => b.text)),
      HERO_H1, ledeText(), HERO_TURN_B, CTA_BAND_H2,
    ].filter((t) => t.toLowerCase().includes("finger on the pulse"));
    expect(said).toEqual(["A finger on the pulse of your querying journey"]);
  });

  it("the pulse line animates a word, and states its own sub in a real ellipsis", () => {
    expect(PULSE_HEADING.filter((s) => s.pulse).map((s) => s.text)).toEqual(["pulse"]);
    expect(PULSE_SUB).toBe("and so much more…");
    expect(PULSE_SUB).not.toContain("...");
  });

  /**
   * ⚠️ RETIREMENT, ASSERTED — the stronger claim, and the reason this test still exists rather
   * than simply being deleted. `FEATURES_H2`/`FEATURES_SUB` were a second centred head-and-sub
   * directly beneath the pulse section's, and two of those back to back read as a mistake. The
   * pulse line is the band's heading now. Asserting the strings are GONE from the module is what
   * stops someone reinstating them from a diff and giving the page two headers again.
   */
  it("no longer ships a features header", async () => {
    const copy = await import("./landingCopy");
    expect("FEATURES_H2" in copy).toBe(false);
    expect("FEATURES_SUB" in copy).toBe(false);
    const rendered = Object.values(copy).filter((v): v is string => typeof v === "string");
    expect(rendered).not.toContain("The querying trenches, organised");
    expect(rendered).not.toContain("Ditch the spreadsheet. It's time to get serious.");
  });

  it("CTA band and document title", () => {
    expect(CTA_BAND_H2).toBe("Your story deserves better than a spreadsheet.");
    expect(DOCUMENT_TITLE).toBe("ScriptAlly — Take control of your querying journey");
  });

  it("seven feature rows, alternating from the second, Pro badge only on the email drop", () => {
    expect(FEATURE_ROWS).toHaveLength(7);
    expect(FEATURE_ROWS.map((r) => r.heading)).toEqual([
      "Your journey so far comes with you", "Track every query", "A home for your agents",
      "From beginning to end", "Curate and compare", "Smart email drop", "Notes to self",
    ]);
    expect(FEATURE_ROWS.map((r) => !!r.flip)).toEqual([false, true, false, true, false, true, false]);
    expect(FEATURE_ROWS.filter((r) => r.pro).map((r) => r.key)).toEqual(["email"]);
    // Notes to self is the one row without a text link (per the ref markup).
    expect(FEATURE_ROWS.filter((r) => !r.link).map((r) => r.key)).toEqual(["notes"]);
  });
});
