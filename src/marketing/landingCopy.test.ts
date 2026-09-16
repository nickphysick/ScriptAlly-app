/**
 * Copy locks for the landing. The hero is word-authoritative from
 * design-refs/scriptally-landing-hero-v3.html; the feature rows from the written
 * brief they were rebuilt to (14 Sep); everything else below it from landing-v13.html. These
 * tests pin the exact strings the components render (repo convention: pure node tests; the
 * components consume these same constants, so a drift in either place fails here).
 *
 * ⚠️ THE PUNCTUATION IS PART OF THE LOCK. The semicolon after "traditional publication", the
 * lowercase `a` that opens the lede, and the real ellipsis characters elsewhere on the page are
 * all deliberate. A lock that only checked the words would let every one of them be tidied away.
 */

import { describe, it, expect } from "vitest";
import {
  HERO_H1, HERO_SUB, HERO_CTA, HERO_LINK, FOUNDING_PERKS,
  DOCUMENT_TITLE, FEATURE_ROWS, PULSE_HEADING,
  FOUNDING_EYEBROW, FOUNDING_HEADING, FOUNDING_BLURB, FOUNDING_CTA,
  FOUNDING_SENT, FOUNDING_DUPE, FOUNDING_FULL, FOUNDING_ERROR, FOUNDING_DOWN,
  FOUNDING_NOTE, FOUNDING_INVALID, foundingCounterLabel,
} from "./landingCopy";

describe("landing copy — verbatim locks", () => {
  /**
   * ⚠️ THE HERO IS FOUR STRINGS NOW (brief, 16 Sep), AND THE PUNCTUATION IS PART OF EACH. The
   * apostrophe in "bird's-eye", its hyphen, and the em dash in the sub are all deliberate. The
   * statement hero's lede, postscript and turn are deleted, and their absence is asserted below —
   * a lock on a string only catches an edit to the string; a lock on the export catches the
   * constant being reinstated from a diff.
   */
  it("the headline", () => {
    expect(HERO_H1).toBe("A bird's-eye view of your querying campaign");
  });

  it("the sub, word for word, with its em dash", () => {
    expect(HERO_SUB).toBe(
      "Every query, every agent, every reply — logged once and tracked to the end. No spreadsheet, " +
        "no guesswork, nothing forgotten.",
    );
    expect(HERO_SUB).toContain("—");
    expect(HERO_SUB).not.toContain(" - ");
  });

  /** Two actions, and they ask for different things: one claims a place, one explains the product. */
  it("the two actions", () => {
    expect(HERO_CTA).toBe("Become a founding writer");
    expect(HERO_LINK).toBe("See how it works");
  });

  /**
   * ⚠️ THE STATEMENT HERO'S COPY IS GONE, CONSTANT AND ALL. The lede on its paper slip, the
   * postscript, and the turn behind the burgundy rule were the old hero's argument; the rebuild
   * replaced them with one headline and one sub. Asserting the exports are absent is what stops
   * any of them being reinstated without the layout that carried them.
   */
  it("the statement hero's lede, postscript and turn are gone", async () => {
    const copy = await import("./landingCopy");
    for (const k of ["HERO_LEDE", "HERO_GRIND", "HERO_TURN_LEAD", "HERO_TURN_BODY"]) {
      expect(k in copy, `${k} is retired`).toBe(false);
    }
    const strings = Object.values(copy).filter((v): v is string => typeof v === "string");
    expect(strings).not.toContain("Introducing ScriptAlly");
    expect(strings).not.toContain("You've written a book.");
  });

  /**
   * ⚠️ AND SO IS THE HERO'S FOUNDING PANEL — the form itself is untouched and still mounted twice,
   * on the sealed band and `/founders`, but the panel's own wording went with the layout. The
   * perks did NOT: `PRICING_TIERS` spreads them into the founding tier, so /pricing renders them.
   */
  it("the hero panel's wording is gone, and the perks it shared with pricing are not", async () => {
    const copy = await import("./landingCopy");
    for (const k of ["FOUNDING_PANEL_KICKER", "FOUNDING_ASK", "FOUNDING_PANEL_CTA", "FOUNDING_LEARN",
      "FOUNDING_PANEL_SENT_H", "FOUNDING_PANEL_DUPE_H", "FOUNDING_PANEL_ERROR", "FOUNDING_PANEL_DOWN"]) {
      expect(k in copy, `${k} is retired`).toBe(false);
    }
    expect(FOUNDING_PERKS).toEqual([
      "Six months' free Pro access",
      "Half price for life",
      "A direct line to the founder",
    ]);
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
  /**
   * ⚠️ RETARGETED TO THE STRONGER CLAIM, NOT WEAKENED. This used to pin `HERO_EYEBROW`'s wording;
   * the eyebrow is deleted, so the honest assertion is the one its four neighbours already make —
   * that the export is absent. A lock on a string can only catch an edit to the string; a lock on
   * the export catches the constant being quietly reinstated, which is the thing that would put
   * the label back on the page.
   */
  it("no eyebrow, no microline, no pricing link, no actions row", async () => {
    const copy = await import("./landingCopy");
    expect("HERO_EYEBROW" in copy).toBe(false);
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
      /* Retarget, same law: a row's body is one string now, and its alt text is rendered too. */
      ...FEATURE_ROWS.flatMap((r) => [r.body, r.alt]),
      HERO_H1, HERO_SUB, HERO_CTA, HERO_LINK,
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

  /**
   * ⚠️ VERBATIM FROM THE WRITTEN BRIEF THE ROWS WERE REBUILT TO (14 Sep) — headings, paragraphs,
   * image files and alt text, in page order. Edit landingCopy.ts and here only, and together.
   */
  it("six feature rows, verbatim, in order", () => {
    expect(FEATURE_ROWS).toEqual([
      {
        key: "import",
        heading: "Bring your spreadsheet with you",
        body: "Upload the tracker you've been keeping and it comes back sorted. Muddled dates fixed, the rows you entered twice merged into one.",
        image: "/images/journey-so-far.png",
        alt: "A messy submissions spreadsheet beside the same queries imported as a clean, dated list.",
      },
      {
        key: "track",
        heading: "Always know where a query stands",
        body: "Queried, partial requested, full out with an agent. Every step dated, so you're not doing the maths in your head at midnight.",
        image: "/images/track-agent-queries.png",
        alt: "A hawk pointing to a query record showing a submission's full timeline.",
      },
      {
        key: "agents",
        heading: "Every agent, properly filed",
        body: "Their wish list, their submission rules, how long they usually take. Look it up in seconds instead of hunting round their website again.",
        image: "/images/home-for-your-agents.png",
        alt: "An agent record showing a wish list, submission route and requested materials.",
      },
      {
        key: "email",
        heading: "Forward the email. It logs itself.",
        body: "An agent asks for three chapters by Friday. Send the message across and the ask, the date and the deadline are already recorded.",
        image: "/images/smart-email-drop.png",
        alt: "A hawk transcribing an agent's email into a query record showing what was requested.",
      },
      {
        key: "packages",
        heading: "Find out what's actually working",
        body: "Bundle your letter, synopsis and opening pages into a package. Then see which one agents keep asking more from.",
        image: "/images/curate-and-compare.png",
        alt: "Two submission package records side by side with response figures for each.",
      },
      {
        key: "comps",
        heading: "Comps that hold up",
        body: "Keep the books you're pitching alongside, and get pointed at new ones the agents on your list already talk about.",
        image: "/images/comparable-titles.png",
        alt: "A list of comparable titles beside suggested books to read next.",
      },
    ]);
  });

  /**
   * ⚠️ A ROW IS AN IMAGE, A HEADING AND ONE PARAGRAPH. The key set is the lock: the retired CTA, link,
   * Pro-badge and flip fields cannot come back without this failing, and a body that is one string
   * cannot carry a bold run.
   */
  it("a row carries nothing but its heading, paragraph, image and alt text", () => {
    for (const row of FEATURE_ROWS) {
      expect(Object.keys(row).sort(), row.key).toEqual(["alt", "body", "heading", "image", "key"]);
      expect(typeof row.body, row.key).toBe("string");
    }
  });
});
