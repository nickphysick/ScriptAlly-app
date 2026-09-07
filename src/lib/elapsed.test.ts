/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the one duration formatter (§4a).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { elapsedPhrase, elapsedWhole, daysBetween, exactDate, ELAPSED_LABEL, DAYS_MAX, WEEKS_MAX, MONTHS_MAX } from "./elapsed";

describe("elapsedPhrase — the unit scales with the number", () => {
  it("days, up to about a fortnight", () => {
    expect(elapsedPhrase(0)).toBe("0 days");
    expect(elapsedPhrase(1)).toBe("1 day");
    expect(elapsedPhrase(9)).toBe("9 days");
    expect(elapsedPhrase(13)).toBe("13 days");
  });

  it("weeks, up to about three months", () => {
    expect(elapsedPhrase(14)).toBe("2 weeks");
    expect(elapsedPhrase(35)).toBe("5 weeks");
    expect(elapsedPhrase(90)).toBe("13 weeks");
  });

  it("months, up to about two years", () => {
    expect(elapsedPhrase(91)).toBe("3 months");
    expect(elapsedPhrase(213)).toBe("7 months");
    expect(elapsedPhrase(729)).toBe("24 months");
  });

  /* ⚠️ QUARTERS, NOT DECIMALS — "2.3 years" is a measurement; "2¼ years" is how a person says it,
     and the precision it implies is the precision the number actually has. */
  it("years, to the nearest quarter", () => {
    expect(elapsedPhrase(730)).toBe("2 years");
    expect(elapsedPhrase(822)).toBe("2¼ years");
    expect(elapsedPhrase(913)).toBe("2½ years");
    expect(elapsedPhrase(1004)).toBe("2¾ years");
  });

  /* ⚠️ A QUARTER THAT ROUNDS UP TO FOUR IS THE NEXT WHOLE YEAR — "2¼¼¼¼" has no spelling, and
     `QUARTER[4]` is undefined, which would have printed "2undefined years". */
  it("a fourth quarter becomes the next year, never an undefined fraction", () => {
    const nearlyThree = elapsedPhrase(365.25 * 3 - 20);
    expect(nearlyThree).toBe("3 years");
    expect(nearlyThree).not.toContain("undefined");
    for (let d = 730; d < 2200; d += 7) {
      expect(elapsedPhrase(d), `${d} days`).toMatch(/^\d+(¼|½|¾)? years?$/);
    }
  });

  it("the singular agrees with its verb at exactly one of each unit", () => {
    expect(elapsedPhrase(1)).toBe("1 day");
    expect(elapsedPhrase(7)).toBe("7 days");   // still days at a week
    expect(elapsedPhrase(365)).toBe("12 months");
    expect(elapsedPhrase(365.25 * 1)).not.toContain("years");
  });

  it("the boundaries are the stated ones, and nothing falls between them", () => {
    expect(elapsedPhrase(DAYS_MAX - 1)).toContain("day");
    expect(elapsedPhrase(DAYS_MAX)).toContain("week");
    expect(elapsedPhrase(WEEKS_MAX - 1)).toContain("week");
    expect(elapsedPhrase(WEEKS_MAX)).toContain("month");
    expect(elapsedPhrase(MONTHS_MAX - 1)).toContain("month");
    expect(elapsedPhrase(MONTHS_MAX)).toContain("year");
  });

  /* a negative or absurd input is a bug upstream, not a reason to print nonsense */
  it("a negative duration reads as none rather than as a negative", () => {
    expect(elapsedPhrase(-5)).toBe("0 days");
  });
});

describe("the sentence a row makes", () => {
  /**
   * ⚠️ "WITH AGENT FOR …" ONLY HOLDS WHILE IT IS ACTUALLY WITH AN AGENT. A rejected query is not
   * "with agent for 2 years" — that sentence is false, and a false sentence about someone's own
   * submission is worse than a vague one. Each sense gets its own words, and the tense follows:
   * a finished thing is described in the past.
   */
  it("every sense has its own label, and none of them claims a wait that is not happening", () => {
    expect(ELAPSED_LABEL["with-agent"]).toBe("with agent for");
    expect(ELAPSED_LABEL["your-move"]).toBe("waiting on you for");
    expect(ELAPSED_LABEL.answered).toBe("answered in");
    expect(ELAPSED_LABEL.closed).toBe("closed after");
    for (const [sense, label] of Object.entries(ELAPSED_LABEL)) {
      if (sense === "with-agent") continue;
      expect(label, `${sense} borrows the with-agent wording`).not.toContain("with agent");
    }
  });

  /* ⚠️ THE APP REPORTS, IT DOES NOT APPRAISE — no adverb may creep into a duration label. */
  it("no label appraises", () => {
    for (const label of Object.values(ELAPSED_LABEL)) {
      expect(label, `"${label}" appraises`).not.toMatch(/still|only|already|just|finally|at last|slow|quick/i);
    }
  });
});

describe("daysBetween and exactDate", () => {
  it("days are floored and never negative", () => {
    const t = Date.UTC(2026, 0, 1);
    expect(daysBetween(t, t + 86400000 * 3 + 1000)).toBe(3);
    expect(daysBetween(t + 86400000, t)).toBe(0);
  });

  /* ⚠️ ONE `en-GB` FORMATTER — a second `toLocaleDateString` with its own options is how two
     surfaces come to spell one date differently. */
  it("the exact date is one en-GB spelling, and an unparseable one is nothing", () => {
    expect(exactDate(Date.UTC(2024, 5, 9))).toBe("9 June 2024");
    expect(exactDate(NaN)).toBe("");
  });
});

/**
 * ⚠️ ONE FORMATTER, EVERYWHERE — asserted at source, because the whole point is that no surface
 * keeps its own. `elapsedLabel` stopped at weeks, so a two-year-old query read "121 weeks".
 */
describe("§4a · every duration surface reads this one", () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the retired formatter has no callers left", () => {
    for (const f of ["../components/Queries.tsx", "../components/reading-pane/QueryTimeline.tsx", "./queryCentreGroups.ts"]) {
      expect(strip(read(f)), `${f} still calls elapsedLabel`).not.toContain("elapsedLabel(");
    }
  });

  it("the three surfaces the pack names all read it", () => {
    expect(strip(read("./queryCentreGroups.ts")), "the list rows do not read the shared phrase").toContain("elapsedPhrase(");
    /* ⚠️ THE STRIP'S DERIVATION LIVES IN `queryAmbient`, NOT THE COMPONENT — `trackingStatCells`
       moved there when the "Not set" branch turned out to be unreachable from the browser. Naming
       the component here would have asserted about a file that no longer holds the figure. */
    expect(strip(read("./queryAmbient.ts")), "Tracking's stat strip does not read it").toContain("elapsedPhrase(");
    expect(strip(read("../components/reading-pane/QueryTimeline.tsx")), "the timeline metas do not read it").toContain("elapsedPhrase(");
  });
});

/**
 * ⚠️ THE PROSE VARIANT, AND BOTH DIRECTIONS ARE THE CLAIM. A quarter-year figure is right where a
 * duration is COMPARED — a column of silences read down — and wrong in a sentence, where "for 2¼
 * years" states the length of a silence to the quarter and reads as precision about someone's
 * rudeness. So `elapsedWhole` flattens the fraction and `elapsedPhrase` must still carry it: a
 * variant that agreed with the original everywhere would be a rename.
 */
describe("elapsedWhole — the same scale, in whole units, for prose", () => {
  it("is identical below the years tier — the fraction only exists up there", () => {
    for (const d of [0, 1, 6, 13, 14, 40, 90, 91, 200, 400, 730]) {
      expect(elapsedWhole(d), String(d)).toBe(elapsedPhrase(d));
    }
  });

  it("⚠️ rounds the quarter away, and `elapsedPhrase` still states it", () => {
    expect(elapsedPhrase(800)).toBe("2¼ years");
    expect(elapsedWhole(800)).toBe("2 years");
    expect(elapsedPhrase(1000)).toBe("2¾ years");
    expect(elapsedWhole(1000)).toBe("3 years");   // rounds up, not truncates
    expect(elapsedPhrase(1200)).toBe("3¼ years");
    expect(elapsedWhole(1200)).toBe("3 years");
  });

  it("the unit agrees with the rounded figure, never with the one it replaced", () => {
    /* ⚠️ 640 DAYS IS STILL THE MONTHS TIER — `MONTHS_MAX` is 730, so it reads "21 months" and the
       fraction never arises. Picking a sample by eye from the years tier is how a case comes to
       assert the wrong tier's behaviour. */
    expect(elapsedWhole(640)).toBe(elapsedPhrase(640));
    expect(elapsedWhole(730)).toBe("2 years");
    /* the first quarter above the boundary rounds down to the same whole year */
    expect(elapsedPhrase(830)).toMatch(/¼/);
    expect(elapsedWhole(830)).toBe("2 years");
  });
});
