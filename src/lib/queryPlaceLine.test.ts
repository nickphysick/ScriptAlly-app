/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PLACE LINE (§2b) — where an act sits in the campaign, stated as fact.
 */
import { describe, it, expect } from "vitest";
import { createPlaceLine, recordPlaceLine, ordinal, consequenceLine } from "./queryAmbient";
import { getPrimaryAction } from "./queryPrimaryAction";
import { QueryStatus } from "../types";

describe("ordinals", () => {
  it("the ordinary cases", () => {
    expect([1, 2, 3, 4, 17, 21, 22, 23, 101].map(ordinal))
      .toEqual(["1st", "2nd", "3rd", "4th", "17th", "21st", "22nd", "23rd", "101st"]);
  });
  /* ⚠️ THE TEENS BREAK THE PATTERN — 11/12/13 are th, not st/nd/rd, and a naive `n % 10` gets all
     three wrong. A writer on their eleventh query is the likeliest person to notice. */
  it("the teens, which the mod-10 rule gets wrong", () => {
    expect([11, 12, 13, 111, 112, 113].map(ordinal)).toEqual(["11th", "12th", "13th", "111th", "112th", "113th"]);
  });
});

describe("the create place line", () => {
  it("states the position and the outstanding count", () => {
    expect(createPlaceLine({ priorForManuscript: 16, manuscriptTitle: "Murphy's Day Out", awaitingReply: 12 }))
      .toBe("Your 17th query for Murphy's Day Out · 12 currently awaiting reply");
  });

  /* ⚠️ A MISSING FIGURE OMITS ITS CLAUSE. "the 0th" and "· 0 currently awaiting reply" are both
     worse than saying less — one is nonsense, the other is a sentence about nothing. */
  it("omits the awaiting clause at zero rather than printing it", () => {
    expect(createPlaceLine({ priorForManuscript: 0, manuscriptTitle: "The Long Field", awaitingReply: 0 }))
      .toBe("Your 1st query for The Long Field");
  });

  it("omits the position when the manuscript is not yet chosen", () => {
    expect(createPlaceLine({ awaitingReply: 3 })).toBe("3 currently awaiting reply");
  });

  it("says nothing at all rather than a placeholder", () => {
    expect(createPlaceLine({})).toBe("");
  });
});

describe("the record place line", () => {
  it("states how long ago it went and which reply this is", () => {
    expect(recordPlaceLine({ sentDaysAgo: 1, priorRepliesForManuscript: 3, manuscriptTitle: "Murphy's Day Out" }))
      .toBe("You sent this 1 day ago · the 4th reply you've recorded for Murphy's Day Out");
  });

  /* "0 days ago" is how a machine says today */
  it("says today rather than 0 days ago", () => {
    expect(recordPlaceLine({ sentDaysAgo: 0 })).toBe("You sent this today");
  });

  it("omits the elapsed clause when the send date is unknown", () => {
    expect(recordPlaceLine({ priorRepliesForManuscript: 0, manuscriptTitle: "X" }))
      .toBe("the 1st reply you've recorded for X");
  });
});

describe("⚠️ the app reports, it never appraises", () => {
  /**
   * This is the section where a place line quietly becomes a coach. The figures are motivating on
   * their own; one adverb turns "your 17th query" into a verdict on the writer's pace. Asserted
   * because it is the kind of copy that arrives one cheerful word at a time.
   */
  const APPRAISAL = /\b(only|already|just|still|keep|going|great|well done|nice|good|streak|almost|nearly|on track|behind|ahead)\b/i;
  const samples = [
    createPlaceLine({ priorForManuscript: 16, manuscriptTitle: "Murphy's Day Out", awaitingReply: 12 }),
    createPlaceLine({ priorForManuscript: 0, manuscriptTitle: "A", awaitingReply: 1 }),
    recordPlaceLine({ sentDaysAgo: 1, priorRepliesForManuscript: 3, manuscriptTitle: "B" }),
    recordPlaceLine({ sentDaysAgo: 0, priorRepliesForManuscript: 0, manuscriptTitle: "C" }),
    recordPlaceLine({ sentDaysAgo: 240, priorRepliesForManuscript: 40, manuscriptTitle: "D" }),
  ];
  for (const s of samples) {
    it(`"${s}" states a fact and nothing more`, () => {
      expect(s, "the place line appraises").not.toMatch(APPRAISAL);
      expect(s, "the place line exclaims").not.toContain("!");
    });
  }
});

describe("the consequence line (§3)", () => {
  /**
   * ⚠️ IT STATES WHAT THE SAVE WILL DO, NEVER WHAT TO DO ABOUT IT. "your turn — the row will offer
   * Mark sent" is a consequence; "your turn — remember to send it" is an instruction, and the app
   * does not instruct.
   */
  it("reads its empty state before an outcome is chosen", () => {
    expect(consequenceLine(null)).toBe("Nothing saved yet");
  });

  it("states the outcome, whose turn it leaves, and what the row will offer", () => {
    expect(consequenceLine(QueryStatus.PARTIAL_REQUESTED))
      .toBe("Saves as Partial Requested · your turn — the row will offer Mark partial as sent");
    expect(consequenceLine(QueryStatus.QUERIED))
      .toBe("Saves as Queried · waiting on them — the row will offer Record response");
  });

  it("says closed for a terminal outcome rather than inventing a turn", () => {
    expect(consequenceLine(QueryStatus.REJECTED)).toContain("· closed —");
  });

  /* ⚠️ IT READS THE CTA ENGINE, so the promise cannot differ from what the row actually offers a
     second later. Asserted against `getPrimaryAction` itself, not against a literal — a literal
     would go green the day someone changed both in the same wrong direction. */
  it("promises exactly what the row will offer, for every status", () => {
    for (const status of Object.values(QueryStatus)) {
      const line = consequenceLine(status as QueryStatus);
      expect(line, `${status}: the promise and the CTA engine disagree`)
        .toContain(getPrimaryAction(status as QueryStatus).label);
    }
  });

  it("never instructs", () => {
    const INSTRUCTION = /\b(remember|don't forget|make sure|should|need to|try to|be sure)\b/i;
    for (const status of Object.values(QueryStatus)) {
      expect(consequenceLine(status as QueryStatus), `${status} instructs`).not.toMatch(INSTRUCTION);
    }
  });
});
