/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the week diary (dashboard redesign, Phase 6).
 */
import { describe, it, expect } from "vitest";
import { diaryWeek, emptyDayLine, weekStartOf } from "./deskWeek";
import { FEvent } from "../components/dashboard/fortnightEvents";

// Thursday 6 August 2026 — the ref's own day. Its week runs Mon 3 → Sun 9.
const TODAY = new Date(2026, 7, 6, 10, 0, 0);

const ev = (date: Date, type: FEvent["type"]): FEvent => ({
  id: String(Math.random()), type, date, title: "t", line: "l",
  marker: { kind: "icon", icon: "query" }, urgency: "neutral",
});

describe("weekStartOf", () => {
  it("returns the Monday of the containing week", () => {
    expect(weekStartOf(TODAY).getDate()).toBe(3);
    expect(weekStartOf(new Date(2026, 7, 3)).getDate()).toBe(3); // Monday maps to itself
  });

  /* Sunday is the END of the week here, not the start — getDay() calls it 0, and the naive
     `date - getDay()` would put Sunday at the head of the NEXT week. */
  it("Sunday belongs to the week that is ending", () => {
    expect(weekStartOf(new Date(2026, 7, 9)).getDate()).toBe(3);
  });
});

describe("the diary week", () => {
  it("is always seven rows, Monday to Sunday, empty days included", () => {
    const week = diaryWeek([], TODAY);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.date.getDate())).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(week.map((d) => d.weekday)).toEqual(["Mon", "Tue", "Wed", "Today", "Fri", "Sat", "Sun"]);
  });

  it("marks today, and dims only the days already walked past", () => {
    const week = diaryWeek([], TODAY);
    expect(week.filter((d) => d.isToday)).toHaveLength(1);
    expect(week.filter((d) => d.isPast).map((d) => d.date.getDate())).toEqual([3, 4, 5]);
  });

  /* ⚠️ DUE ITEMS ONLY. A diary answers "what is coming"; what already happened is the timeline's
     job, immediately to its left. `sent` is activity, not a due date. */
  it("carries due items and drops plain activity", () => {
    const week = diaryWeek([
      ev(new Date(2026, 7, 8), "pages_due"),
      ev(new Date(2026, 7, 8), "sent"),
    ], TODAY);
    const sat = week.find((d) => d.date.getDate() === 8)!;
    expect(sat.events).toHaveLength(1);
    expect(sat.events[0].type).toBe("pages_due");
  });

  it("ignores events outside the week entirely", () => {
    const week = diaryWeek([ev(new Date(2026, 7, 20), "pages_due")], TODAY);
    expect(week.every((d) => d.events.length === 0)).toBe(true);
  });
});

describe("the empty line", () => {
  /* "A quiet day." is an observation about a day you are not in; on today it reads as
     resignation. */
  it("says something different on today", () => {
    const week = diaryWeek([], TODAY);
    expect(emptyDayLine(week.find((d) => d.isToday)!)).toBe("Nothing due today.");
    expect(emptyDayLine(week.find((d) => !d.isToday)!)).toBe("A quiet day.");
  });
});
