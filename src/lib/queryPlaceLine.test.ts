/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PLACE LINE (§2b) — where an act sits in the campaign, stated as fact.
 */
import { describe, it, expect } from "vitest";
import { createPlaceLine, recordPlaceLine, agentRepliesForManuscript, ordinal, consequenceLine } from "./queryAmbient";
import { getPrimaryAction } from "./queryPrimaryAction";
import { QueryStatus } from "../types";
import { AGENT_RESPONSE_STATUSES } from "./queryDerivation";

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

describe("the create place line — ONE fact (§4)", () => {
  it("states the position, and only the position", () => {
    expect(createPlaceLine({ priorForManuscript: 24, manuscriptTitle: "Murphy's Day Out" }))
      .toBe("Your 25th query for Murphy's Day Out");
  });

  /* ⚠️ THE SECOND CLAUSE IS GONE, NOT MERELY HIDDEN AT ZERO. It used to append
     "· N currently awaiting reply" — a running total beside a position, so the header stated two
     different kinds of number and the writer had to read both to find the one they came for. The
     input field went with it, which is what stops it drifting back one caller at a time. */
  it("carries no second clause at any figure", () => {
    const line = createPlaceLine({ priorForManuscript: 3, manuscriptTitle: "The Long Field" });
    expect(line).toBe("Your 4th query for The Long Field");
    expect(line, "a second clause came back").not.toContain("·");
  });

  /* ⚠️ A MISSING FIGURE OMITS THE WHOLE LINE. "Your 0th query" is nonsense and "…for undefined" is
     worse; with one fact left there is no partial version worth printing. */
  it("says nothing at all rather than a placeholder", () => {
    expect(createPlaceLine({}), "an empty input produced copy").toBe("");
    expect(createPlaceLine({ priorForManuscript: 3 }), "no manuscript, so no place").toBe("");
    expect(createPlaceLine({ manuscriptTitle: "X" }), "no count, so no position").toBe("");
  });
});

describe("the record place line — ONE fact (§4)", () => {
  it("states which response this is", () => {
    expect(recordPlaceLine({ priorRepliesForManuscript: 8, manuscriptTitle: "Murphy's Day Out" }))
      .toBe("The 9th response you've received for Murphy's Day Out");
  });

  /* ⚠️ "RECEIVED", NOT "RECORDED". The old wording counted the writer's own bookkeeping; the line
     is about what agents have actually sent back, which is what the derivation now counts too. */
  it("names what was received, not what was filed", () => {
    const line = recordPlaceLine({ priorRepliesForManuscript: 0, manuscriptTitle: "X" });
    expect(line).toBe("The 1st response you've received for X");
    expect(line, "the elapsed-time clause came back").not.toContain("·");
  });

  it("says nothing at all rather than a placeholder", () => {
    expect(recordPlaceLine({})).toBe("");
    expect(recordPlaceLine({ priorRepliesForManuscript: 2 }), "no manuscript, so no place").toBe("");
  });
});

describe("⚠️ how many responses — the three corrections (§4)", () => {
  const act = (manuscriptId: string, queryId: string, resultingStatus?: QueryStatus) =>
    ({ manuscriptId, queryId, resultingStatus });

  /**
   * ⚠️ CORRECTION 2 — THE UNIT IS ACTIVITIES, NOT QUERIES-WITH-A-REPLY. One query that went
   * partial → full → offer is THREE responses received. Counting queries would make the ordinal
   * drift further from the truth the longer a campaign ran, and always in the same direction, so
   * nothing about it would ever look wrong.
   */
  it("a partial → full → offer query contributes 3, not 1", () => {
    const activities = [
      act("m1", "q1", QueryStatus.QUERIED),
      act("m1", "q1", QueryStatus.PARTIAL_REQUESTED),
      act("m1", "q1", QueryStatus.PARTIAL_SENT),
      act("m1", "q1", QueryStatus.FULL_REQUESTED),
      act("m1", "q1", QueryStatus.FULL_SENT),
      act("m1", "q1", QueryStatus.OFFER),
    ];
    expect(agentRepliesForManuscript(activities, "m1")).toBe(3);
  });

  /**
   * ⚠️ CORRECTION 1, RESTATED AS A CASE — the writer's own sends are not responses. `Queried`,
   * `Partial Sent` and `Full Sent` are things the WRITER did, and the legacy fallback inside
   * `responsesReceivedCount` counts the last two. That is why this reads `AGENT_RESPONSE_STATUSES`
   * directly instead.
   */
  it("the writer's own sends never count", () => {
    const activities = [
      act("m1", "q1", QueryStatus.QUERIED),
      act("m1", "q2", QueryStatus.PARTIAL_SENT),
      act("m1", "q3", QueryStatus.FULL_SENT),
    ];
    expect(agentRepliesForManuscript(activities, "m1")).toBe(0);
  });

  /* ⚠️ SILENCE IS NOT A REPLY, and the old rule said it was: `queryBucket !== "waiting"` counted a
     query closed with no reply, because "closed" is not "waiting". */
  it("a closed-no-reply contributes 0", () => {
    const activities = [
      act("m1", "q1", QueryStatus.QUERIED),
      act("m1", "q1", QueryStatus.NO_RESPONSE),
      act("m1", "q2", QueryStatus.WITHDRAWN),
    ];
    expect(agentRepliesForManuscript(activities, "m1")).toBe(0);
  });

  /* and the guarantee that makes that true holds only while the set stays honest */
  it("NO_RESPONSE is absent from the canonical reply set", () => {
    expect(AGENT_RESPONSE_STATUSES.has(QueryStatus.NO_RESPONSE),
      "silence entered the reply set — every response count in the app would now count it").toBe(false);
    expect(AGENT_RESPONSE_STATUSES.has(QueryStatus.WITHDRAWN)).toBe(false);
    expect(AGENT_RESPONSE_STATUSES.has(QueryStatus.REJECTED),
      "a pass IS a reply — an agent wrote back").toBe(true);
  });

  /**
   * ⚠️ CORRECTION 3 — THE QUERY BEING RECORDED IS EXCLUDED, so re-recording a response on a query
   * that already has one cannot count that query's history twice. Correct for a new record and for
   * a correction to an existing one, which is the case that would otherwise inflate silently.
   */
  it("re-recording an existing response does not double-count it", () => {
    const activities = [
      act("m1", "q1", QueryStatus.REJECTED),
      act("m1", "q2", QueryStatus.PARTIAL_REQUESTED),
      act("m1", "q2", QueryStatus.FULL_REQUESTED),
    ];
    /* recording afresh on a query with no reply yet: the other two count */
    expect(agentRepliesForManuscript(activities, "m1", "q3")).toBe(3);
    /* correcting q2's own reply: q2's two rungs drop out, so this is the 2nd, not the 4th */
    expect(agentRepliesForManuscript(activities, "m1", "q2")).toBe(1);
  });

  it("counts only this manuscript, and omits itself when there is no manuscript", () => {
    const activities = [act("m1", "q1", QueryStatus.OFFER), act("m2", "q9", QueryStatus.OFFER)];
    expect(agentRepliesForManuscript(activities, "m1")).toBe(1);
    expect(agentRepliesForManuscript(activities, undefined),
      "a missing manuscript must omit the line, not report zero").toBeUndefined();
  });

  /* ⚠️ AND `undefined` REACHES THE LINE AS AN OMISSION, while 0 reaches it as a real first. The two
     must not collapse: "The 1st response" is true of a book with none yet; nothing at all is what
     an unknown figure earns. */
  it("undefined omits the line; zero states a real first", () => {
    expect(recordPlaceLine({ priorRepliesForManuscript: undefined, manuscriptTitle: "X" })).toBe("");
    expect(recordPlaceLine({ priorRepliesForManuscript: 0, manuscriptTitle: "X" }))
      .toBe("The 1st response you've received for X");
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
    createPlaceLine({ priorForManuscript: 24, manuscriptTitle: "Murphy's Day Out" }),
    createPlaceLine({ priorForManuscript: 0, manuscriptTitle: "A" }),
    recordPlaceLine({ priorRepliesForManuscript: 8, manuscriptTitle: "B" }),
    recordPlaceLine({ priorRepliesForManuscript: 0, manuscriptTitle: "C" }),
    recordPlaceLine({ priorRepliesForManuscript: 40, manuscriptTitle: "D" }),
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
