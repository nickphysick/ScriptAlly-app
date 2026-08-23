/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The goal derivation. Everything the card shows is computed here and nothing is stored, so these
 * are the tests that decide whether the number on the dashboard is true.
 */
import { describe, expect, it } from "vitest";
import {
  deriveGoalProgress, formatReached, londonDay, periodBounds, resolveGoal, sentDay,
} from "./queryingGoals";
import type { QueryingGoalEntry } from "../types";

const q = (dateSent?: string) => ({ dateSent });
const entry = (target: number | null, cadence: "week" | "fortnight" | "month" | null, effectiveFrom: string): QueryingGoalEntry =>
  ({ target, cadence, effectiveFrom });
/** An instant, stated in UTC, so every test says exactly which moment it means. */
const at = (iso: string) => new Date(iso);

describe("the London calendar", () => {
  it("⚠️ 23:40 UTC on 31 July is ALREADY 1 August in London — BST, and it counts in August", () => {
    /* The case the whole module exists for. Counted in UTC this send lands in July and the
       writer's August total is short by one, for a reason nothing on screen can explain. */
    expect(londonDay(at("2026-07-31T23:40:00Z"))).toBe("2026-08-01");
  });

  it("⚠️ 23:40 LONDON on 31 July counts in July — the same evening, the other side of the line", () => {
    /* 22:40Z is 23:40 BST. The writer experienced this as the 31st and it must stay in July. */
    expect(londonDay(at("2026-07-31T22:40:00Z"))).toBe("2026-07-31");
  });

  it("in winter London is UTC, so the same clock time does not shift", () => {
    expect(londonDay(at("2026-01-31T23:40:00Z"))).toBe("2026-01-31");
  });

  it("a date-only dateSent is already a calendar day and is not re-parsed", () => {
    expect(sentDay("2026-08-04")).toBe("2026-08-04");
  });

  it("⚠️ absent, empty and unparseable all give null — nothing here invents a date", () => {
    expect(sentDay(undefined)).toBeNull();
    expect(sentDay("")).toBeNull();
    expect(sentDay("not a date")).toBeNull();
  });
});

describe("resolveGoal — the entry in force", () => {
  const entries = [
    entry(5, "week", "2026-06-01"),
    entry(10, "month", "2026-08-01"),
  ];

  it("takes the last entry effective on or before the day", () => {
    expect(resolveGoal(entries, at("2026-08-15T12:00:00Z"))).toEqual({ target: 10, cadence: "month" });
  });

  it("⚠️ resolving in the PAST returns the target that was actually running then", () => {
    /* The point of appending rather than overwriting. */
    expect(resolveGoal(entries, at("2026-07-15T12:00:00Z"))).toEqual({ target: 5, cadence: "week" });
  });

  it("before the first entry there is no goal", () => {
    expect(resolveGoal(entries, at("2026-05-15T12:00:00Z"))).toBeNull();
  });

  it("an entry effective TODAY is in force today", () => {
    expect(resolveGoal([entry(3, "week", "2026-08-23")], at("2026-08-23T00:05:00Z"))).toEqual({ target: 3, cadence: "week" });
  });

  it("a removal entry resolves to null", () => {
    const removed = [...entries, entry(null, null, "2026-08-10")];
    expect(resolveGoal(removed, at("2026-08-15T12:00:00Z"))).toBeNull();
  });

  it("⚠️ set again after a removal, and the new target is in force", () => {
    const again = [...entries, entry(null, null, "2026-08-10"), entry(4, "fortnight", "2026-08-12")];
    expect(resolveGoal(again, at("2026-08-15T12:00:00Z"))).toEqual({ target: 4, cadence: "fortnight" });
  });

  it("unsorted entries resolve the same — order in the array is not trusted", () => {
    expect(resolveGoal([entries[1], entries[0]], at("2026-08-15T12:00:00Z"))).toEqual({ target: 10, cadence: "month" });
  });

  it("two entries on one day: the later append wins", () => {
    const sameDay = [entry(5, "week", "2026-08-01"), entry(9, "month", "2026-08-01")];
    expect(resolveGoal(sameDay, at("2026-08-15T12:00:00Z"))).toEqual({ target: 9, cadence: "month" });
  });

  it("⚠️ an unreadable entry gives null, never a default — no invented target", () => {
    /* A 'quarter' left by the retired field, a zero target, a missing date: each means no goal is
       in force. Guessing would render a number the writer never chose with the same confidence as
       one they did. */
    expect(resolveGoal([{ target: 5, cadence: "quarter" as never, effectiveFrom: "2026-08-01" }], at("2026-08-15T12:00:00Z"))).toBeNull();
    expect(resolveGoal([entry(0, "month", "2026-08-01")], at("2026-08-15T12:00:00Z"))).toBeNull();
    expect(resolveGoal([{ target: 5, cadence: "month" } as never], at("2026-08-15T12:00:00Z"))).toBeNull();
  });

  it("no entries at all is no goal", () => {
    expect(resolveGoal([], at("2026-08-15T12:00:00Z"))).toBeNull();
    expect(resolveGoal(undefined, at("2026-08-15T12:00:00Z"))).toBeNull();
  });
});

describe("periodBounds", () => {
  it("month runs the calendar month", () => {
    expect(periodBounds("month", at("2026-08-15T12:00:00Z"))).toEqual({
      start: "2026-08-01", end: "2026-08-31", label: "August",
    });
  });

  it("February in a leap year ends on the 29th", () => {
    expect(periodBounds("month", at("2028-02-10T12:00:00Z")).end).toBe("2028-02-29");
  });

  it("week runs Monday to Sunday", () => {
    /* 2026-08-15 is a Saturday. */
    expect(periodBounds("week", at("2026-08-15T12:00:00Z"))).toEqual({
      start: "2026-08-10", end: "2026-08-16", label: "w/c 10 August",
    });
  });

  it("⚠️ Sunday belongs to the week that STARTED on the Monday before it", () => {
    expect(periodBounds("week", at("2026-08-16T12:00:00Z")).start).toBe("2026-08-10");
  });

  it("fortnight steps from the Monday of the week the goal took effect", () => {
    /* effectiveFrom 2026-08-05 (a Wednesday) → anchor Monday 2026-08-03. */
    const e = [entry(8, "fortnight", "2026-08-05")];
    expect(periodBounds("fortnight", at("2026-08-06T12:00:00Z"), e)).toEqual({
      start: "2026-08-03", end: "2026-08-16", label: "from 3 August",
    });
    /* …and the next block begins on the 17th, not on a fresh count from today. */
    expect(periodBounds("fortnight", at("2026-08-20T12:00:00Z"), e).start).toBe("2026-08-17");
  });

  it("asked before the goal existed, it falls back to the Monday of the asking week", () => {
    /* ⚠️ THIS IS THE FALLBACK PATH, NOT A BACKWARDS BLOCK — and it was mislabelled as the latter
       for one revision. An entry effective 5 August is NOT in force on 25 July, so no anchor is
       available and the asking week's Monday is used. The two happen to give the same answer here,
       which is exactly how a vacuous test survives: it agreed with the right number for the wrong
       reason. Caught by mutating Math.floor to Math.trunc and watching all 49 still pass. */
    const e = [entry(8, "fortnight", "2026-08-05")];
    expect(periodBounds("fortnight", at("2026-07-25T12:00:00Z"), e).start).toBe("2026-07-20");
  });

  it("⚠️ THE INVARIANT: the anchor is never after the day, so the block is never negative", () => {
    /* This is what makes Math.floor and Math.trunc provably equivalent here rather than
       accidentally so. `fortnightAnchor` returns mondayOf(effectiveFrom) only for an entry already
       in force (effectiveFrom <= day), and mondayOf(day) otherwise — both are <= day. Stated as a
       property over a spread of dates because the negative branch cannot be reached by any input,
       and an unreachable branch with no statement about it is how the next person "simplifies" the
       anchor into something movable and quietly breaks the grid. */
    const e = [entry(8, "fortnight", "2026-08-05")];
    for (const day of ["2026-08-05", "2026-08-06", "2026-08-17", "2026-09-30", "2027-03-01", "2026-07-01"]) {
      const b = periodBounds("fortnight", at(`${day}T12:00:00Z`), e);
      expect(b.start <= day, `${day}: start ${b.start} must not be after the day`).toBe(true);
      expect(b.end >= day, `${day}: end ${b.end} must not be before the day`).toBe(true);
    }
  });

  it("⚠️ the backwards grid IS exercised — through previousPeriod, in the history tests below", () => {
    /* Stated here so the absence of a backwards case in THIS describe does not read as a gap.
       History walks back from the current start in 14-day steps, which lands on anchor + 14k for
       negative k without going through the block arithmetic at all. */
    const e = [entry(6, "fortnight", "2026-08-05")];
    expect(periodBounds("fortnight", at("2026-08-23T12:00:00Z"), e).start).toBe("2026-08-17");
  });

  it("⚠️ a fortnight across the DST change is still 14 days — the arithmetic is UTC", () => {
    /* BST ends 25 October 2026; one local day that week is 25 hours long. */
    const e = [entry(8, "fortnight", "2026-10-19")];
    expect(periodBounds("fortnight", at("2026-10-27T12:00:00Z"), e)).toEqual({
      start: "2026-10-19", end: "2026-11-01", label: "from 19 October",
    });
  });
});

describe("deriveGoalProgress — the count", () => {
  const entries = [entry(10, "month", "2026-08-01")];
  const now = at("2026-08-23T12:00:00Z");

  it("counts queries sent inside the period, and no others", () => {
    const out = deriveGoalProgress(
      [q("2026-08-02"), q("2026-08-14"), q("2026-07-30"), q("2026-09-01")], entries, now);
    expect(out.count).toBe(2);
    expect(out.target).toBe(10);
    expect(out.cadence).toBe("month");
    expect(out.periodLabel).toBe("August");
  });

  it("⚠️ a query with no dateSent is not counted — and needs no other filter", () => {
    const out = deriveGoalProgress([q("2026-08-02"), q(undefined), q("")], entries, now);
    expect(out.count).toBe(1);
  });

  it("⚠️ an IMPORTED query with a dateSent and no activity history counts", () => {
    /* The reason the count reads queries rather than send activities. Smart Import writes key
       dates without ever appending an activity, so an activity-based count would silently drop
       every imported query — and the total would be wrong in the direction nobody checks. */
    const imported = [q("2026-08-03"), q("2026-08-04"), q("2026-08-05")];
    expect(deriveGoalProgress(imported, entries, now).count).toBe(3);
  });

  it("⚠️ 23:40 UTC on 31 July counts in AUGUST, not July", () => {
    expect(deriveGoalProgress([q("2026-07-31T23:40:00Z")], entries, now).count).toBe(1);
  });

  it("⚠️ 23:40 LONDON on 31 July does NOT count in August", () => {
    expect(deriveGoalProgress([q("2026-07-31T22:40:00Z")], entries, now).count).toBe(0);
  });

  it("a period with zero sends counts zero, and says so", () => {
    const out = deriveGoalProgress([q("2026-06-02")], entries, now);
    expect(out.count).toBe(0);
    expect(out.reachedOn).toBeNull();
  });

  it("no queries at all", () => {
    const out = deriveGoalProgress([], entries, now);
    expect(out).toEqual({ target: 10, cadence: "month", count: 0, periodLabel: "August", reachedOn: null, history: [] });
  });
});

describe("deriveGoalProgress — reachedOn", () => {
  const now = at("2026-08-23T12:00:00Z");
  const three = [entry(3, "month", "2026-08-01")];

  it("is the day of the Nth send, N = target", () => {
    const out = deriveGoalProgress(
      [q("2026-08-02"), q("2026-08-09"), q("2026-08-14"), q("2026-08-20")], three, now);
    expect(out.count).toBe(4);
    expect(out.reachedOn).toBe("2026-08-14");
  });

  it("⚠️ the date HOLDS as the count climbs past the target", () => {
    const base = [q("2026-08-02"), q("2026-08-09"), q("2026-08-14")];
    const later = deriveGoalProgress([...base, q("2026-08-21"), q("2026-08-22")], three, now);
    expect(later.count).toBe(5);
    expect(later.reachedOn).toBe("2026-08-14");
  });

  it("is null below the target", () => {
    expect(deriveGoalProgress([q("2026-08-02"), q("2026-08-09")], three, now).reachedOn).toBeNull();
  });

  it("a target of 1 is reached by the first send", () => {
    const out = deriveGoalProgress([q("2026-08-07")], [entry(1, "month", "2026-08-01")], now);
    expect(out.count).toBe(1);
    expect(out.reachedOn).toBe("2026-08-07");
  });

  it("⚠️ order in the array does not decide the date — the sends are sorted first", () => {
    const shuffled = [q("2026-08-20"), q("2026-08-02"), q("2026-08-14"), q("2026-08-09")];
    expect(deriveGoalProgress(shuffled, three, now).reachedOn).toBe("2026-08-14");
  });

  it("with no target there is nothing to reach", () => {
    expect(deriveGoalProgress([q("2026-08-02")], [], now).reachedOn).toBeNull();
  });

  it("formatReached gives the card's words", () => {
    expect(formatReached("2026-08-14")).toBe("14 August");
    expect(formatReached("2026-08-04")).toBe("4 August");
  });
});

describe("deriveGoalProgress — a target changed mid-period", () => {
  const now = at("2026-08-23T12:00:00Z");

  it("⚠️ the current period picks up the NEW target immediately, count unchanged", () => {
    const entries = [entry(5, "month", "2026-08-01"), entry(12, "month", "2026-08-15")];
    const sends = [q("2026-08-02"), q("2026-08-09"), q("2026-08-20")];
    const out = deriveGoalProgress(sends, entries, now);
    expect(out.target).toBe(12);
    expect(out.count).toBe(3);
    expect(out.reachedOn).toBeNull();
  });

  it("⚠️ a target LOWERED below the count is reached retroactively, on the honest day", () => {
    /* Not the day the target changed — the day the writer's third query actually went. */
    const entries = [entry(20, "month", "2026-08-01"), entry(3, "month", "2026-08-22")];
    const sends = [q("2026-08-02"), q("2026-08-09"), q("2026-08-14"), q("2026-08-20")];
    expect(deriveGoalProgress(sends, entries, now).reachedOn).toBe("2026-08-14");
  });

  it("removed mid-period: no target, and the count still reads by calendar month", () => {
    const entries = [entry(5, "week", "2026-08-01"), entry(null, null, "2026-08-20")];
    const out = deriveGoalProgress([q("2026-08-02"), q("2026-08-21")], entries, now);
    expect(out.target).toBeNull();
    expect(out.cadence).toBeNull();
    expect(out.count).toBe(2);
    expect(out.periodLabel).toBe("August");
  });

  it("⚠️ removed then set again — the newest entry wins, cadence and all", () => {
    const entries = [
      entry(5, "month", "2026-08-01"), entry(null, null, "2026-08-10"), entry(2, "week", "2026-08-17"),
    ];
    const out = deriveGoalProgress([q("2026-08-18"), q("2026-08-19"), q("2026-08-04")], entries, now);
    expect(out).toMatchObject({ target: 2, cadence: "week", count: 2, periodLabel: "w/c 17 August" });
    expect(out.reachedOn).toBe("2026-08-19");
  });
});

describe("deriveGoalProgress — the history strip", () => {
  const now = at("2026-08-23T12:00:00Z");
  const monthly = [entry(10, "month", "2026-01-01")];

  it("four completed months, most recent first, labelled JUL / JUN / …", () => {
    const sends = [
      ...Array(7).fill(0).map(() => q("2026-07-05")),
      ...Array(9).fill(0).map(() => q("2026-06-05")),
      ...Array(4).fill(0).map(() => q("2026-05-05")),
      ...Array(2).fill(0).map(() => q("2026-04-05")),
      ...Array(6).fill(0).map(() => q("2026-03-05")),
      q("2026-08-01"),
    ];
    expect(deriveGoalProgress(sends, monthly, now).history).toEqual([
      { label: "JUL", count: 7 }, { label: "JUN", count: 9 },
      { label: "MAY", count: 4 }, { label: "APR", count: 2 },
    ]);
  });

  it("⚠️ fewer than four completed periods: only the ones that exist", () => {
    const out = deriveGoalProgress([q("2026-07-05"), q("2026-08-02")], monthly, now);
    expect(out.history).toEqual([{ label: "JUL", count: 1 }]);
  });

  it("⚠️ history stops at the first send — no zeros for months before the writer arrived", () => {
    /* Four empty months would state nothing and read as data. */
    expect(deriveGoalProgress([q("2026-08-02")], monthly, now).history).toEqual([]);
  });

  it("⚠️ but a quiet month BETWEEN the first send and now is real, and shows zero", () => {
    const out = deriveGoalProgress([q("2026-05-05"), q("2026-08-02")], monthly, now);
    expect(out.history).toEqual([
      { label: "JUL", count: 0 }, { label: "JUN", count: 0 }, { label: "MAY", count: 1 },
    ]);
  });

  it("weeks label as a start date — 4 AUG", () => {
    const weekly = [entry(3, "week", "2026-06-01")];
    const sends = [q("2026-08-11"), q("2026-08-12"), q("2026-08-05"), q("2026-07-29")];
    expect(deriveGoalProgress(sends, weekly, at("2026-08-19T12:00:00Z")).history).toEqual([
      { label: "10 AUG", count: 2 }, { label: "3 AUG", count: 1 }, { label: "27 JUL", count: 1 },
    ]);
  });

  it("fortnights label as a start date and sit on the goal's own grid", () => {
    const fort = [entry(6, "fortnight", "2026-08-05")];
    const sends = [q("2026-08-20"), q("2026-08-04"), q("2026-07-22")];
    /* Current block from 17 Aug; the two before it are 3 Aug and 20 Jul. */
    expect(deriveGoalProgress(sends, fort, at("2026-08-23T12:00:00Z")).history).toEqual([
      { label: "3 AUG", count: 1 }, { label: "20 JUL", count: 1 },
    ]);
  });

  it("⚠️ history carries no target — it is counts only, so a changed target cannot restate it", () => {
    const changed = [entry(2, "month", "2026-05-01"), entry(30, "month", "2026-08-01")];
    const sends = [q("2026-06-05"), q("2026-07-05"), q("2026-08-05")];
    const out = deriveGoalProgress(sends, changed, now);
    expect(out.history).toEqual([{ label: "JUL", count: 1 }, { label: "JUN", count: 1 }]);
    expect(Object.keys(out.history[0])).toEqual(["label", "count"]);
  });

  it("⚠️ with NO goal set the strip still draws, by calendar month", () => {
    /* State A: the history strip is not a goal artefact. */
    const out = deriveGoalProgress([q("2026-07-05"), q("2026-06-05"), q("2026-08-02")], [], now);
    expect(out.target).toBeNull();
    expect(out.count).toBe(1);
    expect(out.periodLabel).toBe("August");
    expect(out.history).toEqual([{ label: "JUL", count: 1 }, { label: "JUN", count: 1 }]);
  });

  it("history never exceeds four", () => {
    const sends = Array.from({ length: 12 }, (_, i) => q(`2026-0${i < 9 ? i + 1 : 1}-05`));
    expect(deriveGoalProgress(sends, monthly, now).history.length).toBeLessThanOrEqual(4);
  });
});
