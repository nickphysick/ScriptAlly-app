/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do badge is the tray's own chain (Phone app v2, Part 1B). Held equal to that chain run by hand, over
 * accounts that exercise every branch the badge reads: overdue, today, later and nothing at all.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { todoDueBadge, todoDueTally, type DueTallyInput } from "./todoDueTally";
import { assembleBoardColumns } from "./todoColumns";
import { calendarItems, dayBuckets, londonToday } from "./trayCalendar";
import { localYMD } from "./shellSidebar";
import type { UserTask } from "../types";

const NOW = Date.parse("2026-10-15T12:00:00Z");
const base: DueTallyInput = { tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], taskFlags: [], activities: [], nowMs: NOW };
const ut = (id: string, dueDate: string): UserTask => ({ id, text: `Task ${id}`, dueDate, done: false } as UserTask);

/** the tray's chain, as TodoTray writes it */
function byHand(i: DueTallyInput) {
  const { cols } = assembleBoardColumns({ ...i, now: i.nowMs, today: localYMD(i.nowMs) });
  const live = [...cols.todo, ...cols.today];
  const items = calendarItems({ cards: live, db: i, flags: i.taskFlags, nowMs: i.nowMs });
  return dayBuckets(items, live, londonToday(i.nowMs));
}

describe("the To-do badge — tasks due today or earlier, as the tray counts them", () => {
  const accounts: [string, DueTallyInput][] = [
    ["empty", base],
    ["overdue, today and later", { ...base, userTasks: [ut("a", "2026-10-10"), ut("b", "2026-10-15"), ut("c", "2026-10-30")] }],
    ["only later", { ...base, userTasks: [ut("c", "2026-11-30")] }],
  ];
  for (const [name, acc] of accounts) {
    it(`${name}: equals the tray's own overdue + today`, () => {
      const h = byHand(acc);
      expect(todoDueTally(acc)).toEqual({ overdue: h.overdue, today: h.today });
      expect(todoDueBadge(acc)).toBe(h.overdue + h.today);
    });
  }
  it("the branches are entered: an empty account reads 0, and a dated task counts on its day", () => {
    expect(todoDueBadge(base)).toBe(0);
    const t = todoDueTally(accounts[1][1]);
    expect(t.overdue + t.today).toBeGreaterThan(0);
  });
  it("the tray reads the same four functions (so a change to its chain is a change here too)", () => {
    const tray = readFileSync(resolve(__dirname, "../components/todo/v5/TodoTray.tsx"), "utf8");
    for (const fn of ["assembleBoardColumns(", "calendarItems(", "dayBuckets(", "londonToday("]) expect(tray).toContain(fn);
    expect(tray).toMatch(/\[\.\.\.cols\.todo, \.\.\.cols\.today\]/);
  });
});
