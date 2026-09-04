/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE GRAMMAR IS EXERCISED OVER ITS WHOLE SPACE, NOT OVER THE FIVE EXAMPLES THE PACK QUOTES.
 *
 * The rendered board has history on THREE rows, so a sweep of the page would exercise a handful of
 * pairs and report a green that means "the three combinations this account happens to hold behave".
 * The grammar is pure, so every stage × every ending × the duration bands can be walked here — and
 * the five quoted sentences are asserted verbatim on top, because a table that is exhaustive and
 * wrong in the same way everywhere would still pass a sweep of itself.
 */
import { describe, it, expect } from "vitest";
import { stageSentence, stageDuration, askPhrase, material } from "./stageSentence";
import { QueryStatus } from "../types";

const STAGES = [
  ...Object.values(QueryStatus),
  "Preparing the full", "Preparing the partial", "Nudged 26 Aug",
];
const ENDS = ["in", "out", "none"] as const;
const NEXTS = [undefined, ...Object.values(QueryStatus)];
const DAYS = [1, 2, 9, 13, 14, 21, 22, 27, 83, 84, 150, 400];

describe("the past-stage grammar", () => {
  it("sweeps a real space — a sweep over nothing proves nothing", () => {
    expect(STAGES.length * ENDS.length * NEXTS.length * DAYS.length).toBeGreaterThan(1500);
  });

  it("every pair yields a sentence, and none of them appraises", () => {
    /* ⚠️ FACTS, NEVER APPRAISAL — the board's standing law. A sentence that says a stage ran
       "only" nine days, or "finally" ended, is a verdict on a writer's submission. */
    const APPRAISAL = /\b(only|just|finally|still|at last|slow|quick|good|bad|poor|worse|better)\b/i;
    let n = 0;
    for (const stage of STAGES) for (const end of ENDS) for (const next of NEXTS) for (const days of DAYS) {
      const s = stageSentence({ stage, end, next, days });
      expect(s.length, `${stage}/${end}/${next}/${days} yielded nothing`).toBeGreaterThan(5);
      expect(s, `"${s}" appraises`).not.toMatch(APPRAISAL);
      /* ⚠️ NO PRONOUN FOR AN AGENT, EVER. The app does not know them and never asks. */
      expect(s, `"${s}" uses a pronoun for the agent`).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
      n++;
    }
    expect(n).toBeGreaterThan(1500);
  });

  it("⚠️ the five sentences the design quotes, verbatim", () => {
    expect(stageSentence({ stage: "Queried", end: "in", next: "Full Requested", days: 22 }))
      .toBe("Agent requested the full after 3 weeks and 1 day");
    expect(stageSentence({ stage: "Preparing the full", end: "out", days: 9 }))
      .toBe("You sent the full after 9 days");
    expect(stageSentence({ stage: "Full Sent", end: "in", next: "Offer", days: 7 }))
      .toBe("Agent read the full in 7 days, then made an offer");
    expect(stageSentence({ stage: "Queried", end: "out", days: 64 }))
      .toBe("You nudged after 9 weeks and 1 day");
    expect(stageSentence({ stage: "Queried", end: "none", days: 152 }))
      .toBe("No reply in 5 months");
  });

  it("the duration bands, and their boundaries", () => {
    expect(stageDuration(1)).toBe("1 day");
    expect(stageDuration(13)).toBe("13 days");
    /* 14 is the first week-and-days value; 84 (twelve weeks) is the first month value */
    expect(stageDuration(14)).toBe("2 weeks");
    expect(stageDuration(15)).toBe("2 weeks and 1 day");
    expect(stageDuration(83)).toBe("11 weeks and 6 days");
    expect(stageDuration(84)).toBe("3 months");
    expect(stageDuration(400)).toBe("13 months");
    /* ⚠️ THE REMAINDER IS STATED, NOT ROUNDED AWAY — "3 weeks" and "3 weeks and 1 day" are
       different facts, and on a stage that decided a submission the day matters. */
    expect(stageDuration(21)).toBe("3 weeks");
    expect(stageDuration(22)).toBe("3 weeks and 1 day");
  });

  it("the agency's move comes from the status it moved to", () => {
    expect(askPhrase("Offer")).toBe("made an offer");
    expect(askPhrase("Revise & Resubmit")).toBe("asked for revisions");
    expect(askPhrase("Full Requested")).toBe("requested the full");
    expect(askPhrase("Partial Requested")).toBe("requested a partial");
    /* an ending that carried no status is still an ending — it is stated, not guessed at */
    expect(askPhrase(undefined)).toBe("replied");
    expect(askPhrase("Queried")).toBe("replied");
  });

  it("the material is read from the stage, not from the ending", () => {
    expect(material("Full Sent")).toBe("the full");
    expect(material("Preparing the full")).toBe("the full");
    expect(material("Partial Sent")).toBe("the partial");
    /* an unnamed stage is the partial, which is the smaller claim of the two */
    expect(material("Queried")).toBe("the partial");
  });

  it("⚠️ a pair the table has no phrasing for states a duration and invents no verb", () => {
    expect(stageSentence({ stage: "Withdrawn", end: "out", days: 9 })).toBe("Lasted 9 days");
    expect(stageSentence({ stage: "Offer", end: "in", next: "Offer", days: 30 })).toBe("Lasted 4 weeks and 2 days");
  });
});
