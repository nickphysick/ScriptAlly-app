/**
 * Query Centre v154 — the weekly goal chart's maths against a fixed series: "[n] of [goal] this week", what is left,
 * the streak (completed weeks before this one; this week never breaks it), the London Monday boundary, the fallback
 * goal, and the empty state.
 */
import { describe, expect, it } from "vitest";
import type { QueryingGoalEntry } from "../types";
import { FALLBACK_WEEKLY_GOAL, weekGoal154 } from "./qc154goal";

/* Wednesday 11 November 2026, noon in London (GMT, so UTC) */
const NOW = Date.UTC(2026, 10, 11, 12);
const at = (y: number, m: number, d: number, h = 10, min = 0) => Date.UTC(y, m - 1, d, h, min);
const WEEKLY3: QueryingGoalEntry[] = [{ target: 3, cadence: "week", effectiveFrom: "2026-01-01" }];
const SERIES = [
  at(2026, 10, 20), at(2026, 10, 21), at(2026, 10, 23), // w/c 19 Oct: 3 (met)
  at(2026, 10, 26), at(2026, 10, 27), at(2026, 10, 28), at(2026, 10, 30), // w/c 26 Oct: 4 (met)
  at(2026, 11, 3), at(2026, 11, 5), at(2026, 11, 8, 23, 30), // w/c 2 Nov: 3, the third late on Sunday night (met)
  at(2026, 11, 9, 0, 10), at(2026, 11, 10), // this week: 2, the first just after midnight on Monday
];

/* v156.1: the copy this chart once carried ("2 of 3 this week", "3-week streak", goalNudge's lines, the tooltip and the
   month labels) is gone with its helpers; the page's words are lib/qc1561's, tested there. The model's maths stay. */
describe("the weekly goal chart", () => {
  it("reads this week against the goal, and the streak over the completed weeks before it", () => {
    const m = weekGoal154(SERIES, WEEKLY3, NOW);
    expect(m.goal).toBe(3);
    expect(m.goalFromWriter).toBe(true);
    expect(m.weeks).toHaveLength(20);
    expect(m.weeks[19]).toEqual({ start: "2026-11-09", count: 2, met: false, current: true });
    expect(m.weeks.slice(16, 19).map((w) => [w.start, w.count, w.met])).toEqual([["2026-10-19", 3, true], ["2026-10-26", 4, true], ["2026-11-02", 3, true]]);
    expect(m.weeks[15]).toMatchObject({ start: "2026-10-12", count: 0, met: false });
    expect(m.now).toBe(2);
    expect(m.left).toBe(1);
    expect(m.streak).toBe(3);
  });

  it("the week boundary is midnight on Monday, London: Sunday 23:30 is last week, Monday 00:10 is this one", () => {
    const noSunday = SERIES.filter((ms) => ms !== at(2026, 11, 8, 23, 30));
    const m = weekGoal154(noSunday, WEEKLY3, NOW);
    expect(m.weeks[18].count).toBe(2);
    expect(m.streak).toBe(0); // last week fell short, so nothing before it counts
    expect(m.now).toBe(2);
    const moved = [...noSunday.filter((ms) => ms !== at(2026, 11, 9, 0, 10)), at(2026, 11, 8, 23, 50)];
    expect(weekGoal154(moved, WEEKLY3, NOW).now).toBe(1);
  });

  it("this week never breaks the streak while it is in progress, and meeting it says so", () => {
    expect(weekGoal154(SERIES.slice(0, 10), WEEKLY3, NOW)).toMatchObject({ now: 0, left: 3, streak: 3 });
    const met = weekGoal154([...SERIES, at(2026, 11, 11, 9)], WEEKLY3, NOW);
    expect(met).toMatchObject({ now: 3, left: 0, streak: 3 });
    expect(met.weeks[19].met).toBe(true);
  });


  it("no weekly target in force: the named fallback, never a goal the writer chose", () => {
    const none = weekGoal154(SERIES, undefined, NOW);
    expect(none.goal).toBe(FALLBACK_WEEKLY_GOAL);
    expect(none.goalFromWriter).toBe(false);
    const monthly = weekGoal154(SERIES, [{ target: 10, cadence: "month", effectiveFrom: "2026-01-01" }], NOW);
    expect(monthly.goal).toBe(FALLBACK_WEEKLY_GOAL);
    expect(monthly.goalFromWriter).toBe(false);
    const five = weekGoal154(SERIES, [{ target: 5, cadence: "week", effectiveFrom: "2026-01-01" }], NOW);
    expect(five).toMatchObject({ goal: 5, left: 3, streak: 0 });
  });

  it("nothing sent yet: 0 of the goal, every week a stub, empty", () => {
    const m = weekGoal154([null, null], WEEKLY3, NOW);
    expect(m).toMatchObject({ now: 0, streak: 0, empty: true });
    expect(m.weeks.every((w) => w.count === 0)).toBe(true);
    /* a send dated in the future is not a send yet */
    expect(weekGoal154([at(2026, 11, 20)], WEEKLY3, NOW).empty).toBe(true);
  });

});
