/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CLAIM IS TOTALITY AND EXCLUSIVITY, NOT A TABLE OF EXAMPLES.
 *
 * Six hand-written cases would prove that six shapes land where I expected and say nothing about
 * the row I did not think of — and the fault this module exists to close is exactly that: two of
 * the ref's own predicates overlap, and its fixture cannot produce the row that reveals it. So the
 * sweep enumerates EVERY combination of the six facts and requires each to resolve to exactly one
 * section. A partition that is total over the whole fact space cannot double-count whatever the
 * data does next.
 */
import { describe, it, expect } from "vitest";
import {
  calSectionOf, CAL_SECTION_CASCADE, CAL_SECTION_DRAW, CAL_SECTION_LABEL,
  UPCOMING_WINDOW_DAYS, type CalSection, type CalSectionFacts,
} from "./calendarSections";

/** Every boolean combination, crossed with the dated-distance cases that matter at the boundary. */
const SPACE: CalSectionFacts[] = (() => {
  const out: CalSectionFacts[] = [];
  const dists = [null, -1, 0, 1, UPCOMING_WINDOW_DAYS, UPCOMING_WINDOW_DAYS + 1, 400];
  for (const isTask of [false, true]) {
    for (const isClosed of [false, true]) {
      for (const isQuiet of [false, true]) {
        for (const isUrgent of [false, true]) {
          for (const writerHolds of [false, true]) {
            for (const nextDatedIn of dists) {
              out.push({ isTask, isClosed, isQuiet, isUrgent, writerHolds, nextDatedIn });
            }
          }
        }
      }
    }
  }
  return out;
})();

describe("the calendar's six sections partition the board", () => {
  it("sweeps a real fact space — a sweep over nothing proves nothing", () => {
    expect(SPACE.length).toBe(2 * 2 * 2 * 2 * 2 * 7);
    expect(SPACE.length).toBeGreaterThan(200);
  });

  it("every row lands in exactly one section, and it is a known one", () => {
    const seen = new Map<CalSection, number>();
    for (const f of SPACE) {
      const s = calSectionOf(f);
      expect(CAL_SECTION_CASCADE, `${JSON.stringify(f)} → ${s}, which is not a section`)
        .toContain(s);
      seen.set(s, (seen.get(s) ?? 0) + 1);
    }
    /* ⚠️ AND EVERY SECTION IS REACHED. A cascade whose later arms are unreachable is a partition
       on paper with four sections in practice, and it would pass a totality check untouched. */
    const unreachable = CAL_SECTION_CASCADE.filter((s) => !seen.has(s));
    expect(unreachable, `sections no combination of facts can reach: ${unreachable.join(", ")}`)
      .toEqual([]);
  });

  it("the two orders name the same six sections", () => {
    expect([...CAL_SECTION_DRAW].sort()).toEqual([...CAL_SECTION_CASCADE].sort());
    expect(Object.keys(CAL_SECTION_LABEL).sort()).toEqual([...CAL_SECTION_CASCADE].sort());
  });

  it("⚠️ a long silence whose stated reply date also passed reads as Gone quiet, never Urgent", () => {
    /* The row the ref's own fixture cannot produce, and the reason this module is a cascade.
       Under the ref's six independent predicates it satisfies BOTH `quiet` and `over`. */
    const both: CalSectionFacts = {
      isTask: false, isClosed: false, isQuiet: true, isUrgent: true,
      writerHolds: false, nextDatedIn: null,
    };
    expect(calSectionOf(both)).toBe("quiet");
  });

  it("a task is a task whatever else is true of it", () => {
    for (const f of SPACE.filter((x) => x.isTask)) expect(calSectionOf(f)).toBe("task");
  });

  it("the Upcoming window is inclusive at its edge and excludes what has passed", () => {
    const base: CalSectionFacts = {
      isTask: false, isClosed: false, isQuiet: false, isUrgent: false,
      writerHolds: false, nextDatedIn: null,
    };
    expect(calSectionOf({ ...base, nextDatedIn: 0 })).toBe("need");
    expect(calSectionOf({ ...base, nextDatedIn: UPCOMING_WINDOW_DAYS })).toBe("need");
    expect(calSectionOf({ ...base, nextDatedIn: UPCOMING_WINDOW_DAYS + 1 })).toBe("with");
    /* a date already gone is not "upcoming"; whether it is urgent is a different fact */
    expect(calSectionOf({ ...base, nextDatedIn: -1 })).toBe("with");
    expect(calSectionOf({ ...base, nextDatedIn: null })).toBe("with");
  });
});
