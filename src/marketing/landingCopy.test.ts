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
  HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_A, HERO_TURN_B, HERO_EYEBROW, HERO_NOTE, CTA_START,
  CTA_BAND_H2, DOCUMENT_TITLE, FEATURE_ROWS, PULSE_HEADING, PULSE_SUB,
} from "./landingCopy";

describe("landing copy — verbatim locks", () => {
  it("strapline", () => {
    expect(HERO_H1).toBe("You've written a book.");
  });

  it("the lede resumes the headline's sentence, word for word", () => {
    expect(HERO_LEDE).toBe(
      "and now your querying journey begins. Your quest for traditional publication; an endless, " +
        "gruelling campaign of self-promotion in a fiercely competitive, ever-changing market."
    );
  });

  /**
   * ⚠️ THE LOWERCASE OPENING IS THE DEVICE, AND IT IS THE THING MOST LIKELY TO BE "CORRECTED".
   * Asserted on its own so the failure names the cause rather than diffing a 200-character string.
   */
  it("opens lowercase, and hides no ellipsis in the string", () => {
    expect(HERO_LEDE.startsWith("and now")).toBe(true);
    expect(HERO_LEDE).not.toContain("…");
    expect(HERO_LEDE).not.toContain("...");
  });

  /** The one machine-set word on the page. Asserted as the rendered sentence AND as the segment. */
  it("sets `robots` in the mono face, inside an otherwise plain sentence", () => {
    expect(HERO_GRIND.map((s) => s.text).join("")).toBe("Oh, and now you're up against robots, too.");
    expect(HERO_GRIND.filter((s) => s.mono).map((s) => s.text)).toEqual(["robots"]);
  });

  it("the turn, in two registers", () => {
    expect(HERO_TURN_A).toBe("You are not alone.");
    expect(HERO_TURN_B).toBe("ScriptAlly tips the odds back in your favour.");
  });

  /**
   * ⚠️ THE MICROLINE IS PRICE ONLY. "· Built for UK querying" was removed deliberately — a claim
   * about scope does not belong in the same eight-point line as a claim about cost.
   */
  it("eyebrow, note and primary CTA", () => {
    expect(HERO_EYEBROW).toBe("For querying writers");
    expect(HERO_NOTE).toBe("Free to start");
    expect(CTA_START).toBe("Start tracking — it's free");
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
      HERO_H1, HERO_LEDE, HERO_TURN_A, HERO_TURN_B, CTA_BAND_H2,
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
