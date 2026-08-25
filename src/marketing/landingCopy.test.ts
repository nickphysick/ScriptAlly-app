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
  HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_B, HERO_EYEBROW,
  DOCUMENT_TITLE, FEATURE_ROWS, PULSE_HEADING,
  FOUNDING_EYEBROW, FOUNDING_HEADING, FOUNDING_BLURB, FOUNDING_CTA,
  FOUNDING_SENT, FOUNDING_DUPE, FOUNDING_FULL, FOUNDING_ERROR, FOUNDING_DOWN,
  FOUNDING_NOTE, FOUNDING_INVALID, foundingCounterLabel,
} from "./landingCopy";

/** The lede is segments now (one is bold); this is the sentence a reader actually sees. */
const ledeText = () => HERO_LEDE.map((s) => s.text).join("");

describe("landing copy — verbatim locks", () => {
  it("strapline", () => {
    expect(HERO_H1).toBe("You've written a book.");
  });

  it("the lede resumes the headline's sentence, word for word", () => {
    expect(ledeText()).toBe(
      "but here your quest for agent representation begins; an endless, gruelling campaign of " +
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
  /**
   * ⚠️ RETARGET, SAME LAW: the lede now opens "but here" rather than "and now" — it turns against
   * the congratulation above it instead of continuing the headline's sentence. It is still
   * lowercase, and the ellipsis is still a separate positioned element rather than a character in
   * the string; those are the two claims, and both survive the rewording.
   */
  it("opens lowercase, and hides no ellipsis in the string", () => {
    expect(ledeText().startsWith("but here")).toBe(true);
    expect(ledeText()).not.toContain("…");
    expect(ledeText()).not.toContain("...");
  });

  /**
   * ⚠️ RETARGET: `robots` is UNDERLINED now, not mono. The postscript became Caveat, and a
   * monospace word inside a handwritten line reads as a rendering fault. Same claim as before —
   * exactly one word carries the treatment — asserted against the flag that now names it.
   */
  it("marks `robots`, and nothing else, inside an otherwise plain sentence", () => {
    expect(HERO_GRIND.map((s) => s.text).join("")).toBe("…and these days, you're up against robots, too.");
    expect(HERO_GRIND.filter((s) => s.underline).map((s) => s.text)).toEqual(["robots"]);
  });

  /**
   * ⚠️ RETARGET: the turn is ONE line. `HERO_TURN_A` ("You are not alone.") is deleted, so the
   * old two-register claim no longer has a subject. Asserting its ABSENCE is the stronger
   * replacement — it is what stops the softening line being reinstated from a diff.
   */
  /**
   * ⚠️ RETARGET TO THE STRONGER CLAIM, SAME LAW: the congratulation is DELETED, so this asserts
   * its absence rather than its wording. The law it was protecting — that the lede turns against
   * something — is unchanged and still asserted; what it turns against is the STATEMENT now, and
   * the acknowledgement is carried by the ticked box on the statement's row. Asserting the two
   * strings are gone from every export is what stops them being reinstated from a diff and giving
   * the hero three lines of praise before the argument starts again.
   */
  it("the lede turns against the statement, and the congratulation is gone", async () => {
    expect(HERO_H1.endsWith(".")).toBe(true);
    expect(ledeText().startsWith("but here")).toBe(true);
    const copy = await import("./landingCopy");
    expect("HERO_CONGRATS" in copy).toBe(false);
    expect("HERO_CONGRATS_SUB" in copy).toBe(false);
    const strings = Object.values(copy).filter((v): v is string => typeof v === "string");
    expect(strings).not.toContain("Congratulations.");
    expect(strings).not.toContain("You've got further than most.");
  });

  /**
   * ⚠️ 89 CHARACTERS, AND THE LENGTH IS THE CONSTRAINT. It cannot hold one line at any readable
   * size, so it must never be given `nowrap`; the target is two lines and the failure mode is a
   * third carrying two or three orphaned words. The rendered line count is measured on a page —
   * this asserts the property that makes the measurement possible to reason about.
   */
  it("the turn is too long for one line, which is why the measure is in `em`", () => {
    expect(HERO_TURN_B.length).toBeGreaterThan(80);
    expect(HERO_TURN_B).not.toContain("  ");
  });

  it("the turn is one line, and the reassurance in front of it is gone", async () => {
    expect(HERO_TURN_B).toBe(
      "ScriptAlly is an end-to-end querying companion built to tip the odds back in your favour.",
    );
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
  /**
   * ⚠️ RETARGET AGAIN, AND THE CLAIM NARROWS RATHER THAN WIDENS. The hero's action is the founding
   * panel now, so `CTA_START` and `CTA_LEARN` are deleted with the row that rendered them —
   * asserting their absence is what stops the actions row being reinstated from a diff.
   * ⚠️ BUT NOT THE STRING. "Start tracking — it's free" is still the free tier's action label on
   * `/pricing`, so a lock that forbade the WORDING across the module would go red on a correct
   * site. The claim is the constants.
   */
  it("eyebrow and one primary CTA — no microline, no pricing link, no actions row", async () => {
    expect(HERO_EYEBROW).toBe("For querying writers");
    const copy = await import("./landingCopy");
    expect("CTA_START" in copy).toBe(false);
    expect("CTA_LEARN" in copy).toBe(false);
    expect("HERO_NOTE" in copy).toBe(false);
    expect("CTA_PRICING" in copy).toBe(false);
    expect(Object.values(copy).filter((v): v is string => typeof v === "string"))
      .not.toContain("See pricing");
  });

  /**
   * ⚠️ THE PHRASE HAS ONE HOME, AND IT MOVED. It was a row heading, then the centred heading of a
   * cream section above the showreel; it is the parchment band's own header now. The COUNT is the
   * claim and it is unchanged — exactly one occurrence across every string the page renders — so
   * this survives the move and still fails if the row heading is restored.
   */
  it("says `a finger on the pulse` in exactly one place", () => {
    const said = [
      PULSE_HEADING,
      ...FEATURE_ROWS.map((r) => r.heading),
      ...FEATURE_ROWS.flatMap((r) => r.body.map((b) => b.text)),
      HERO_H1, ledeText(), HERO_TURN_B,
      FOUNDING_HEADING, FOUNDING_BLURB, FOUNDING_SENT, FOUNDING_DUPE, FOUNDING_FULL,
    ].filter((t) => t.toLowerCase().includes("finger on the pulse"));
    expect(said).toEqual(["A finger on the pulse of your querying journey"]);
  });

  /**
   * ⚠️ RETARGET: the heading is one plain string and its subtitle is deleted. `pulse` was a
   * segment only so a halo could animate behind that one word; the halo is replaced by the ECG
   * trace running behind the WHOLE heading, so there is nothing to mark. Asserting the segment
   * shape and the subtitle are GONE is what stops either being reinstated — a marked word would
   * invite the halo back, and a subtitle under a band header competes with the first row.
   */
  it("the band header is one plain string, with no marked word and no subtitle", async () => {
    expect(PULSE_HEADING).toBe("A finger on the pulse of your querying journey");
    const copy = await import("./landingCopy");
    expect("PULSE_SUB" in copy).toBe(false);
    expect(Object.values(copy).filter((v): v is string => typeof v === "string"))
      .not.toContain("and so much more…");
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

  /**
   * ⚠️ RETARGET TO THE STRONGER CLAIM: the spreadsheet line is gone, so this asserts its ABSENCE
   * from every export rather than its wording. The band's subtitle was promoted into the heading
   * slot, so the constant that survives is the one that was already on the page.
   */
  it("no longer says the spreadsheet line, anywhere", async () => {
    const copy = await import("./landingCopy");
    expect("CTA_BAND_H2" in copy).toBe(false);
    expect("CTA_BAND_SUB" in copy).toBe(false);
    const strings = Object.values(copy).filter((v): v is string => typeof v === "string");
    expect(strings).not.toContain("Your story deserves better than a spreadsheet.");
    expect(strings.some((t) => /spreadsheet\.$/.test(t))).toBe(false);
  });

  it("document title", () => {
    expect(DOCUMENT_TITLE).toBe("ScriptAlly — Take control of your querying journey");
  });

  /**
   * ⚠️ RETARGET, AND THE CLAIM IS NOW ABSENCE PLUS A REPLACEMENT. `CTA_BAND_HEADING` is deleted
   * with the band that rendered it — the page closed by restating the hero's CTA three screens
   * later. Asserting the string is gone from every export is what stops the foot of the page
   * regaining two competing primaries.
   */
  it("no closing CTA band — the page ends on the founding offer", async () => {
    const copy = await import("./landingCopy");
    expect("CTA_BAND_HEADING" in copy).toBe(false);
    const strings = Object.values(copy).filter((v): v is string => typeof v === "string");
    expect(strings).not.toContain("Free to start. Take control of your querying journey today.");
  });

  /** ⚠️ Verbatim from `design-refs/scriptally-landing-v13.html` .beta. Edit there and here only. */
  it("the founding-members band, verbatim", () => {
    expect(FOUNDING_EYEBROW).toBe("Founding members");
    expect(FOUNDING_HEADING).toBe("Be one of the first hundred.");
    expect(FOUNDING_BLURB).toBe(
      "ScriptAlly opens in stages. Founding members get in first, keep every feature free " +
      "through the beta, and help decide what gets built next.",
    );
    expect(FOUNDING_CTA).toBe("Claim your place");
    expect(FOUNDING_SENT).toBe(
      "You're on the list. We'll email your invite code when your place opens — no other mail, ever.",
    );
    expect(FOUNDING_DUPE).toBe(
      "You're already on the list — no need to sign up twice. Your invite is still coming.",
    );
  });

  /**
   * ⚠️ THE TWO FAILURES SAY DIFFERENT THINGS AND OFFER THE SAME WAY OUT. One is "try again", the
   * other is "this is not wired" — collapsing them would tell one of the two readers to do
   * something useless. Both hand over a real address, because a failure that offers no way
   * through is a dead end with an apology attached.
   */
  it("both failure messages are distinct, and both offer a human", () => {
    const text = (runs: typeof FOUNDING_ERROR) =>
      runs.map((r) => (typeof r === "string" ? r : "link" in r ? r.link : "b" in r ? r.b : r.em)).join("");
    expect(text(FOUNDING_ERROR)).not.toBe(text(FOUNDING_DOWN));
    expect(text(FOUNDING_ERROR)).toContain("try again");
    expect(text(FOUNDING_DOWN)).toContain("unavailable");
    for (const runs of [FOUNDING_ERROR, FOUNDING_DOWN]) {
      const mail = runs.find((r) => typeof r !== "string" && "mailto" in r);
      expect(mail, "offers a mailto").toBeTruthy();
    }
  });

  /**
   * ⚠️ THE COUNTER'S WORDS ARE BUILT FROM NUMBERS PASSED IN — there is no string in the module
   * stating how many places are claimed. The ref hardcodes "37 of 100"; a fabricated scarcity
   * number on a public page is a factual claim nobody could check.
   */
  it("no hardcoded count anywhere in the copy", async () => {
    expect(foundingCounterLabel(37, 100)).toBe("37 of 100 places claimed");
    const copy = await import("./landingCopy");
    const strings = Object.values(copy).filter((v): v is string => typeof v === "string");
    expect(strings.some((t) => /\bplaces claimed\b/.test(t))).toBe(false);
    expect(strings.some((t) => /\b\d+ of \d+\b/.test(t))).toBe(false);
  });

  /** The invalid-address line is field feedback, not an outcome — it never displaces the form. */
  it("the invalid-address line is its own thing", () => {
    expect(FOUNDING_INVALID).toBe("That doesn't look like an email address.");
    expect([FOUNDING_SENT, FOUNDING_DUPE, FOUNDING_FULL]).not.toContain(FOUNDING_INVALID);
  });

  /** The privacy note points at a real route, never a spelled URL. */
  it("the privacy note links into the site by route", () => {
    const link = FOUNDING_NOTE.find((r) => typeof r !== "string" && "to" in r);
    expect(link).toEqual({ link: "Privacy", to: "privacy" });
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
