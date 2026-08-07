/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's pure layer (tasks-pages pack, Phase 3): placement per source, the derived
 * roll-forward, completed-from-the-log, the grids, the fold — plus the page's wiring locks
 * (filters applied before placement, the shared pip map, the click targets).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Query, Agent, UserTask, TaskFlag, Activity, ActivityType, QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import {
  monthGridDays, weekDays, monthLabel, weekLabel, shiftMonth, shiftWeek, sameMonth,
  cardActionYmd, calendarDays, CAL_CELL_CAP, toYmd,
} from "./todoCalendar";
import { CAL_PIP, CAL_LEGEND } from "./todoFamily";

const here = __dirname;
const pageSrc = readFileSync(join(here, "..", "components", "todo", "TodoCalendarPage.tsx"), "utf8");

const NOW = Date.parse("2026-08-07T12:00:00Z");
const TODAY = "2026-08-07";

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});
const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.FULL_REQUESTED, dateSent: "2026-07-01T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email", ...over,
} as Query);

const EMPTY = {
  cols: { todo: [], today: [], snoozed: [], done: [] },
  flags: [] as TaskFlag[], queries: [] as Query[], agents: [] as Agent[],
  userTasks: [] as UserTask[], activities: [] as Activity[], today: TODAY, nowMs: NOW,
};
const AUG = monthGridDays("2026-08-07");

/* ── the grids ─────────────────────────────────────────────────────────────────────────────── */

describe("the month grid — Monday-start full weeks, never a torn row", () => {
  it("August 2026 runs Mon 27 Jul → Sun 6 Sep: 42 cells", () => {
    expect(AUG[0]).toBe("2026-07-27");
    expect(AUG[AUG.length - 1]).toBe("2026-09-06");
    expect(AUG).toHaveLength(42);
    expect(AUG.length % 7).toBe(0);
  });

  it("the week runs Monday to Sunday around any anchor", () => {
    const w = weekDays("2026-08-07"); // a Friday
    expect(w[0]).toBe("2026-08-03");
    expect(w[6]).toBe("2026-08-09");
    expect(w).toHaveLength(7);
  });

  it("labels + shifts", () => {
    expect(monthLabel("2026-08-07")).toBe("August 2026");
    expect(weekLabel("2026-08-07")).toBe("3–9 August 2026");
    expect(shiftMonth("2026-08-07", 1)).toBe("2026-09-01");
    expect(shiftMonth("2026-08-07", -1)).toBe("2026-07-01");
    expect(shiftWeek("2026-08-07", 1)).toBe("2026-08-14");
    expect(sameMonth("2026-08-01", "2026-08-31")).toBe(true);
    expect(sameMonth("2026-08-31", "2026-09-01")).toBe(false);
  });
});

/* ── placement per source ──────────────────────────────────────────────────────────────────── */

describe("⚠️ every item appears on its ACTION date", () => {
  it("a user task lands on its due date; an undated user card is not a calendar citizen", () => {
    expect(cardActionYmd(card({ userTaskId: "t1", nature: "task", dueYmd: "2026-08-12" }), [])).toBe("2026-08-12");
    expect(cardActionYmd(card({ userTaskId: "t1", nature: "task" }), [])).toBeNull();
  });

  it("an agent task lands on the day it LANDED — lastStatusChange, falling back to dateSent", () => {
    const withStamp = q({ lastStatusChange: "2026-08-10T09:00:00Z" } as Partial<Query>);
    expect(cardActionYmd(card({ taskType: "full_requested", relatedRecordId: "q1" }), [withStamp])).toBe("2026-08-10");
    expect(cardActionYmd(card({ taskType: "full_requested", relatedRecordId: "q1" }), [q({})])).toBe("2026-07-01");
  });

  it("⚠️ housekeeping has NO action date — a standing pile is not an appointment", () => {
    expect(cardActionYmd(card({ stream: "hk", taskType: "no_response_close", relatedRecordId: "q1" }), [q({})])).toBeNull();
    expect(cardActionYmd(card({ stream: "hk", hk: true, taskType: "data_quality_poor" }), [])).toBeNull();
  });

  it("a snoozed item lands on its return date", () => {
    const flag: TaskFlag = { id: "f1", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 1, snoozedUntil: "2026-08-08T09:00:00Z" };
    const snoozedCard = card({ key: "snz-f1", stream: "hk", hk: true, kind: "SNOOZED", title: "Send your full to Marcus Reed" });
    const days = calendarDays({ ...EMPTY, flags: [flag], queries: [q({})], cols: { ...EMPTY.cols, snoozed: [snoozedCard] } }, AUG);
    expect(days.get("2026-08-08")!.items.map((i) => i.family)).toEqual(["snoozed"]);
    expect(days.get("2026-08-08")!.items[0].label).toBe("Send your full to Marcus Reed");
  });
});

/* ── roll-forward — derived from the clock, never written ──────────────────────────────────── */

describe("⚠️ roll-forward: undone work moves to today; the origin keeps ONE marker", () => {
  const overdue = card({ key: "late", userTaskId: "t1", nature: "task", dueYmd: "2026-08-04", title: "Chase the reference" });
  const overdue2 = card({ key: "late2", userTaskId: "t2", nature: "task", dueYmd: "2026-08-04", title: "Second one" });
  const days = calendarDays({ ...EMPTY, cols: { ...EMPTY.cols, todo: [overdue, overdue2] } }, AUG);

  it("the items render on TODAY", () => {
    expect(days.get(TODAY)!.items.map((i) => i.label)).toEqual(["Chase the reference", "Second one"]);
  });

  it("the day they left holds the marker count — not the items", () => {
    expect(days.get("2026-08-04")!.rolled).toBe(2);
    expect(days.get("2026-08-04")!.items).toHaveLength(0);
  });

  it("⚠️ completed items NEVER roll — they stay on the day they were finished, struck", () => {
    const done = calendarDays({
      ...EMPTY,
      userTasks: [{ id: "t9", userId: "u", text: "Old win", done: true, completedAt: "2026-08-03T16:44:00", createdAt: "", updatedAt: "" } as UserTask],
    }, AUG);
    expect(done.get("2026-08-03")!.items[0]).toMatchObject({ family: "done", struck: true, label: "Old win" });
    expect(done.get(TODAY)?.items ?? []).toHaveLength(0);
    expect(done.get("2026-08-03")!.rolled).toBe(0);
  });
});

/* ── completed from the log ────────────────────────────────────────────────────────────────── */

describe("completed items derive from the activity log — the Done column's own union", () => {
  it("a clearing activity lands struck on its day, in the log's vocabulary", () => {
    const act = {
      id: "a1", userId: "u", queryId: "q1", activityType: ActivityType.STATUS_CHANGED,
      date: "2026-08-05T10:00:00Z", description: "x", resultingStatus: QueryStatus.NO_RESPONSE,
    } as Activity;
    const ag = { id: "a1", name: "Marcus Reed", agency: "Reed Literary" } as unknown as Agent;
    const days = calendarDays({ ...EMPTY, activities: [act], queries: [q({})], agents: [ag] }, AUG);
    const item = days.get("2026-08-05")!.items[0];
    expect(item.family).toBe("done");
    expect(item.struck).toBe(true);
    expect(item.card).toBeUndefined(); // finished work opens no sheet
  });
});

/* ── the fold + the shared map + the page wiring ───────────────────────────────────────────── */

describe("the fold, the map, the wiring", () => {
  it("busy days fold past the cap", () => {
    expect(CAL_CELL_CAP).toBe(3);
    expect(pageSrc).toContain("items.slice(0, CAL_CELL_CAP)");
    expect(pageSrc).toContain("+{overflow} MORE");
  });

  it("⚠️ the pips and the legend read the ONE map in todoFamily — never a page-local palette", () => {
    expect(pageSrc).toContain('from "../../lib/todoFamily"');
    expect(pageSrc).toContain("CAL_PIP[it.family]");
    expect(pageSrc).toContain("CAL_LEGEND.map");
    expect(pageSrc).not.toMatch(/cal-pip[^}]*#f8e2d9/); // no hex beside the pip render
    expect(Object.keys(CAL_PIP).sort()).toEqual(["agent", "done", "note", "snoozed", "task"]);
    expect(CAL_LEGEND.map((l) => l.label)).toEqual([
      "AGENT DEADLINES", "YOUR TASKS", "SNOOZED RETURNS", "DATED NOTES", "COMPLETED",
    ]);
  });

  it("today wears the ink ring; day counts sit in the cell corner", () => {
    expect(pageSrc).toContain('ymd === today ? " today"');
    expect(pageSrc).toContain("cal-c2");
  });

  it("⚠️ FILTERS narrow the live cards BEFORE placement — the same applyFacet the board uses", () => {
    // P5 composed tags in: facet ∧ tags, one narrow helper over the same applyFacet
    expect(pageSrc).toContain("applyFacet(cards, facet).filter((c) => matchesTags(c.tags, tagSel))");
    expect(pageSrc).toContain("todo: narrow(assembled.cols.todo)");
    expect(pageSrc).toContain("snoozed: narrow(assembled.cols.snoozed)");
    // completed items ride only the unfiltered view — finished work is not waiting
    expect(pageSrc).toContain('facet === "all" ? userTasks : []');
  });

  it("clicks: a pip opens the item sheet (FocusFlow), a day opens its list", () => {
    expect(pageSrc).toContain("setFlowCard(item.card)");
    expect(pageSrc).toContain("<FocusFlow");
    expect(pageSrc).toContain("setOpenDay(ymd)");
    expect(pageSrc).toContain("cal-daypanel");
  });

  it("the roll-forward marker's copy is the ref's", () => {
    expect(pageSrc).toContain("ROLLED FORWARD ↗");
  });

  it("toYmd is local, not UTC — a late-evening task must not land on tomorrow", () => {
    expect(toYmd(new Date(2026, 7, 7, 23, 30))).toBe("2026-08-07");
  });
});
