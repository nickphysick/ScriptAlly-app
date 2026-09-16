/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Founding Writers copy — verbatim locks.
 *
 * ⚠️ THIS PAGE'S COPY IS A PRICING COMMITMENT AND WAS THE ONLY MARKETING COPY MODULE WITHOUT
 * LOCKS. `landingCopy` and `aboutCopy` have carried them since they were written; `foundersCopy`
 * arrived a pass later and the gap went unnoticed until someone went looking for what would break
 * when the copy changed. A page that promises six months free and a founding rate "for as long as
 * you're querying your manuscript" is the last one whose words should be editable without a test
 * noticing.
 *
 * ⚠️ AND THE PUNCTUATION IS PART OF THE COPY. Em dashes are em dashes, apostrophes are curly, and
 * the commas around "totally free of charge" are load-bearing — without them the phrase reads as
 * attached to "the full version of QueryHawk" rather than to the offer.
 */
import { describe, it, expect } from "vitest";
import {
  FOUNDERS_DOCUMENT_TITLE, FOUNDERS_EYEBROW, FOUNDERS_H1, FOUNDERS_LEDE, FOUNDERS_ART_ALT,
  FOUNDERS_DEAL, FOUNDERS_HONEST_LEAD, FOUNDERS_HONEST, FOUNDERS_SIGNOFF,
} from "./foundersCopy";
import { CopyRun } from "./CopyRuns";

/** The sentence a reader actually sees, from a run list. */
const text = (runs: CopyRun[]) =>
  runs.map((r) => (typeof r === "string" ? r : "b" in r ? r.b : "em" in r ? r.em : r.link)).join("");

describe("the hero", () => {
  it("eyebrow and headline", () => {
    expect(FOUNDERS_DOCUMENT_TITLE).toBe("Founding Writers — QueryHawk");
    expect(FOUNDERS_EYEBROW).toBe("For founding writers");
    expect(FOUNDERS_H1).toBe("Help get things off the ground.");
  });

  /**
   * ⚠️ `FOUNDERS_CTA` IS DELETED AND ITS ABSENCE IS THE ASSERTION. It read "Become a Founding
   * Writer" — the NAV's words for the link that brings a reader HERE — above a form on the page
   * they had already reached. The hero takes `FOUNDING_CTA`'s default now, so both this page and
   * the band say "Claim your place", because both do the same thing. A lock on the string could
   * only ever have caught it changing; this catches it coming back.
   */
  it("states no CTA of its own — the form's default is the one wording", async () => {
    const copy = await import("./foundersCopy");
    expect("FOUNDERS_CTA" in copy).toBe(false);
    const strings = Object.values(copy).filter((v) => typeof v === "string") as string[];
    expect(strings).not.toContain("Become a Founding Writer");
  });

  it("the subheading, verbatim", () => {
    expect(text(FOUNDERS_LEDE)).toBe(
      "We're looking for one hundred writers to bring their querying campaign into QueryHawk, " +
      "use it properly, and tell us what they find. Sign up below and we'll be in touch.",
    );
  });

  /**
   * ⚠️ THE LOCK ON THE COMMAS AROUND "totally free of charge" IS RETIRED WITH THE PHRASE, NOT
   * WEAKENED. They were load-bearing while the clause sat mid-sentence: without them it read as
   * attached to "the full version of QueryHawk", i.e. as describing the PRODUCT rather than the
   * OFFER. The terms are on the perk cards now, where "Six months free" is a heading and cannot
   * attach to anything. Asserting the phrase is ABSENT is what stops the old sentence coming back
   * from a diff with its punctuation quietly dropped.
   */
  it("no longer states the terms inside the lede at all", () => {
    expect(text(FOUNDERS_LEDE)).not.toContain("totally free of charge");
    expect(text(FOUNDERS_LEDE)).not.toContain("the full version of QueryHawk");
  });

  /** One phrase carries weight, and it is the number of places. */
  it("marks `one hundred writers`, and nothing else", () => {
    const bold = FOUNDERS_LEDE.filter((r) => typeof r !== "string" && "b" in r);
    expect(bold).toEqual([{ b: "one hundred writers" }]);
  });

  /**
   * ⚠️ RETIRED AND NOT RELOCATED. "We're almost done. The app works." opened the lede and is gone
   * — the subheading states the ask rather than the state of the build. "let us know how it does"
   * went the same way: it asked for a report, where "use it properly" asks for the use that makes
   * a report worth anything.
   */
  it("no longer reports on the state of the build, and asks for use rather than a report", () => {
    expect(text(FOUNDERS_LEDE)).not.toContain("We're almost done");
    expect(text(FOUNDERS_LEDE)).not.toContain("The app works");
    expect(text(FOUNDERS_LEDE)).not.toContain("let us know how it does");
    expect(text(FOUNDERS_LEDE)).toContain("use it properly");
  });

  /**
   * ⚠️ THE ARTWORK DESCRIBES ITSELF, WHERE THE EARTH IT REPLACES WAS `alt=""`. That one was
   * decorative — a globe beside a headline about building a world. This picture IS the page's
   * argument, so a reader who cannot see it must get the argument rather than a gap where it was.
   * The lock is that the text is a sentence about the picture, not that it is non-empty: an alt
   * reading "illustration" would pass a length check and tell nobody anything.
   */
  it("the artwork's alt text is a description, verbatim", () => {
    expect(FOUNDERS_ART_ALT).toBe(
      "An older hawk and two others helping a young hawk into the air for its first flight.",
    );
    expect(FOUNDERS_ART_ALT).not.toMatch(/^(image|illustration|photo|picture|artwork)\b/i);
  });
});

describe("the deal", () => {
  /**
   * ⚠️ RETARGETED, AND THE CLAIM IS NOW THAT NO CARD IS SINGLED OUT. This used to assert the first
   * card carried a blush `highlight`; the three read as one set of three things you get, and
   * tinting one said they were different KINDS rather than different clauses. Asserting the flag
   * is ABSENT from every card is what stops it being reinstated on one of them — a lock on
   * `["deal"]` could only ever have caught it moving to a different card.
   */
  it("three cards, and none of them is singled out", () => {
    expect(FOUNDERS_DEAL.map((c) => c.key)).toEqual(["deal", "sweetener", "line"]);
    for (const card of FOUNDERS_DEAL) {
      expect("highlight" in card, `${card.key} carries no highlight flag`).toBe(false);
    }
  });

  it("kickers and headings, verbatim", () => {
    expect(FOUNDERS_DEAL.map((c) => c.kicker)).toEqual(["The deal", "The sweetener", "A direct line"]);
    expect(FOUNDERS_DEAL.map((c) => c.heading)).toEqual([
      "Six months free",
      "Half price after that",
      "You shape what's built",
    ]);
  });

  /**
   * ⚠️ THE FIRST TWO ARE PROMISES THE PRODUCT HAS TO KEEP, and the second is a PERMANENT pricing
   * commitment stated on two pages — the band's "Half price for as long as you need it after
   * that" is the same promise in different words. If the terms change, both change together.
   */
  it("the offer and the sweetener, verbatim", () => {
    expect(FOUNDERS_DEAL[0].body).toBe(
      "The full version of QueryHawk, with nothing held back. Every feature, every tool, no card " +
      "needed.",
    );
    expect(FOUNDERS_DEAL[1].body).toBe(
      "If you stay, you'll never pay full price. A founding writer's rate for as long as you're " +
      "querying.",
    );
  });

  it("the direct line, verbatim", () => {
    expect(FOUNDERS_DEAL[2].body).toBe(
      "Straight to the founder. Tell us what's missing, what's wrong, and what you'd build " +
      "instead.",
    );
    expect(FOUNDERS_DEAL[2].body).not.toContain("will work alongside");
  });

  /**
   * ⚠️ THE CARDS STATE TERMS, AND THE PRODUCT SELLING ITSELF IS WHAT WENT. "the full force of
   * QueryHawk", "an arsenal of time-saving Pro features", "a tailored suite of querying
   * analytics" were adjectives inside the one section whose job is to say plainly what the deal
   * is. Their absence is asserted because prose like that returns the moment someone is asked to
   * "warm the copy up", and it returns to exactly this section.
   */
  it("states terms rather than selling", () => {
    const all = FOUNDERS_DEAL.map((c) => c.body).join(" ");
    for (const sell of ["full force", "arsenal", "supercharge", "tailored suite", "Be amongst the first"]) {
      expect(all, `${sell} is sales copy, not a term`).not.toContain(sell);
    }
  });

  /**
   * ⚠️ THREE SHORT BODIES, BECAUSE THE CARDS ARE FLAT NOW. They were bordered parchment cards in a
   * three-up grid with room for paragraphs; these sit under a hero with no border and no shadow,
   * and a card whose body runs to four lines stops being a card. The floor is a length, not a
   * wording — the claim is that the format and the copy stay in step, and it is the copy that
   * drifts.
   */
  it("each body is short enough for the card it sits in", () => {
    for (const card of FOUNDERS_DEAL) {
      expect(card.body.length, `${card.key} is ${card.body.length} chars`).toBeLessThan(120);
    }
  });
});

describe("the sign-off", () => {
  it("is one person, named, with an em dash", () => {
    expect(FOUNDERS_SIGNOFF).toBe("Nick — QueryHawk's founder");
    expect(FOUNDERS_SIGNOFF).toContain("—");
    expect(FOUNDERS_SIGNOFF).not.toContain(" - ");
  });
});

describe("the disclosure", () => {
  it("lifts the promise, and the label is gone", async () => {
    expect(FOUNDERS_HONEST_LEAD).toBe("Your data is never the experiment.");
    const copy = await import("./foundersCopy");
    expect("FOUNDERS_HONEST_KICKER" in copy).toBe(false);
    const strings = Object.values(copy).filter((v) => typeof v === "string") as string[];
    expect(strings).not.toContain("Full disclosure");
  });

  it("two paragraphs, verbatim", () => {
    expect(FOUNDERS_HONEST).toHaveLength(2);
    expect(text(FOUNDERS_HONEST[0])).toBe(
      "QueryHawk isn't quite finished. Things will shift. Features will be tweaked. The look and " +
      "feel might change. But the security of your data will be ensured — your queries, your " +
      "agents, your materials. They won't be lost, they won't be shared. Writers — and their " +
      "writing — are our absolute priority.",
    );
    expect(text(FOUNDERS_HONEST[1])).toBe(
      "All we ask is that you stick at it. Let us know what you like, what could be better, and " +
      "do shout loudly if something gets in your way.",
    );
  });

  /**
   * ⚠️ `quite` IS ITALIC, AND IT IS THE ONLY MARKED RUN. The promise moved up into the lifted
   * line, so nothing in the prose is bold any more — emphasising it in both places says it twice
   * and means it less.
   */
  it("marks `quite` as italic and nothing as bold", () => {
    const runs = FOUNDERS_HONEST.flat();
    expect(runs.filter((r) => typeof r !== "string" && "em" in r)).toEqual([{ em: "quite" }]);
    expect(runs.filter((r) => typeof r !== "string" && "b" in r)).toEqual([]);
  });

  /** ⚠️ EM DASHES ARE PART OF THE COPY. A hyphen here reads as a typo in prose this careful. */
  it("uses em dashes, not hyphens", () => {
    const all = FOUNDERS_HONEST.map(text).join(" ");
    expect(all).toContain("ensured — your queries");
    expect(all).toContain("Writers — and their writing — are our absolute priority");
    expect(all).not.toMatch(/\w - \w/);
  });
});
