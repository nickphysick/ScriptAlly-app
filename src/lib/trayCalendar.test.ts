/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD52 B1 (unit) — what goes on the tray's calendar, as one derivation: the kinds, the days, the four parts that sum
 * to the badge, the faint and the not-yet-surfaced, and London's today across a clock change.
 */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./todoBoard";
import type { TaskData } from "./taskCardFacts";
import type { Query, TaskFlag, UserTask } from "../types";
import {
  CAL_KINDS, calendarDay, calendarItems, calendarKind, chipLabel, counted, dayBuckets, kindsOn, londonToday, londonYmdOf,
  passesCalFilter,
} from "./trayCalendar";

const NOW = Date.parse("2026-10-15T12:00:00Z");
const TODAY = "2026-10-15";
const card = (key: string, over: Partial<BoardCard>): BoardCard => ({
  key, stream: "ag", title: "t", who: "Ana Duarte", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "AD",
  record: "", committed: false, done: false, ...over,
} as BoardCard);
const q = (id: string, over: Partial<Query>): Query => ({ id, agentId: "a1", manuscriptId: "m1", status: "Queried", dateSent: "2026-08-01", ...over } as unknown as Query);
const db = (queries: Query[], userTasks: UserTask[] = []): TaskData => ({
  queries, userTasks, agents: [{ id: "a1", name: "Ana Duarte", agency: "Duarte Words", responseTimeWeeks: 6 } as never], manuscripts: [], activities: [],
});

describe("TD52 B1 — calendarKind maps every bucket", () => {
  it("send · nudge · close · mine; housekeeping and the offer (and an R&R, a decide) are never on it", () => {
    expect(calendarKind(card("1", { taskType: "partial_requested" }))).toBe("send");
    expect(calendarKind(card("2", { taskType: "full_requested" }))).toBe("send");
    expect(calendarKind(card("3", { taskType: "offer_send_full" }))).toBe("send");
    expect(calendarKind(card("4", { taskType: "nudge_overdue" }))).toBe("nudge");
    expect(calendarKind(card("5", { taskType: "no_response_close" }))).toBe("close");
    expect(calendarKind(card("6", { userTaskId: "u1", nature: "task" }))).toBe("mine");
    expect(calendarKind(card("7", { taskType: "offer_received" }))).toBeNull();
    expect(calendarKind(card("8", { taskType: "revise_resubmit" }))).toBeNull();
    for (const t of ["data_quality_poor", "materials_unrecorded_bulk", "agent_recheck", "offer_tell", "withdraw_tell"]) {
      expect(calendarKind(card("h", { taskType: t, hk: true })), t).toBeNull();
    }
  });
});

describe("TD52 B1 — the days, read and never derived", () => {
  it("a send is on its send-by date, and undated without one", () => {
    const d = db([q("q1", { expectedSendDate: "2026-10-23T00:00:00Z" } as never), q("q2", {})]);
    expect(calendarDay(card("1", { taskType: "partial_requested", relatedRecordId: "q1" }), d)).toBe("2026-10-23");
    expect(calendarDay(card("2", { taskType: "partial_requested", relatedRecordId: "q2" }), d)).toBeNull();
  });
  it("an own task is on its dueDate; housekeeping has none", () => {
    const d = db([], [{ id: "u1", text: "Write the synopsis", dueDate: "2026-10-20", done: false } as UserTask]);
    expect(calendarDay(card("1", { userTaskId: "u1", nature: "task", dueYmd: "2026-10-20" }), d)).toBe("2026-10-20");
    expect(calendarDay(card("2", { taskType: "data_quality_poor", hk: true }), d)).toBeNull();
  });
  it("a nudge is on its planned nudge date (taskDue's own answer)", () => {
    const d = db([q("q1", { nudgeDate: "2026-10-10" } as never)]);
    expect(calendarDay(card("1", { taskType: "nudge_overdue", relatedRecordId: "q1" }), d)).toBe("2026-10-10");
  });
});

describe("TD52 B1 — the four parts sum to the badge", () => {
  const queries = [
    q("q1", { expectedSendDate: "2026-10-10" } as never), // overdue send
    q("q2", { nudgeDate: "2026-10-15" } as never), // nudge due today
    q("q3", { expectedSendDate: "2026-10-28" } as never), // later send
    q("q4", {}), // an undated send
  ];
  const tasks = [
    { id: "u1", text: "Draft the letter", dueDate: "2026-10-30", done: false } as UserTask, // not surfaced: not on the board
    { id: "u2", text: "Due today", dueDate: "2026-10-15", done: false } as UserTask,
  ];
  const cards = [
    card("c1", { taskType: "partial_requested", relatedRecordId: "q1" }),
    card("c2", { taskType: "nudge_overdue", relatedRecordId: "q2" }),
    card("c3", { taskType: "full_requested", relatedRecordId: "q3" }),
    card("c4", { taskType: "partial_requested", relatedRecordId: "q4" }),
    card("c5", { taskType: "data_quality_poor", hk: true }),
    card("c6", { taskType: "offer_received", relatedRecordId: "q4" }),
    card("c7", { userTaskId: "u2", nature: "task", dueYmd: "2026-10-15" }),
  ];
  const flags = [{ id: "f1", userId: "x", taskType: "nudge_overdue", queryId: "q2", snoozedUntil: "2026-10-22T08:00:00Z", snoozeCount: 1 } as TaskFlag];
  const items = calendarItems({ cards, db: db(queries, tasks), flags, nowMs: NOW });
  const b = dayBuckets(items, cards, TODAY);
  it("overdue + today + later + undated = n (housekeeping and the offer are undated)", () => {
    expect(b).toMatchObject({ overdue: 1, today: 2, later: 1, undated: 3 });
    expect(b.overdue + b.today + b.later + b.undated).toBe(cards.length);
    expect(b.oldest).toBe("2026-10-10");
    expect(b.next).toBe("2026-10-28");
  });
  it("an unsurfaced own task and a live snooze are on the calendar and not in n", () => {
    const un = items.find((i) => i.key === "task:u1")!;
    const sn = items.find((i) => i.key === "flag:f1")!;
    expect(un).toMatchObject({ surfaced: false, kind: "mine", ymd: "2026-10-30" });
    expect(sn).toMatchObject({ snoozed: true, kind: "nudge", ymd: "2026-10-22" });
    expect(counted(un)).toBe(false);
    expect(counted(sn)).toBe(false);
  });
  it("one entry per kind per day, and a day holding only snoozes is faint", () => {
    expect(kindsOn(items, "2026-10-22")).toEqual([{ kind: "nudge", n: 1, snoozed: true }]);
    expect(kindsOn(items, TODAY).map((x) => x.kind)).toEqual(["nudge", "mine"]);
    expect(CAL_KINDS).toEqual(["send", "nudge", "close", "mine"]);
  });
  it("the calendar filters", () => {
    expect(passesCalFilter({ k: "overdue" }, items, "c1", TODAY)).toBe(true);
    expect(passesCalFilter({ k: "overdue" }, items, "c5", TODAY)).toBe(false);
    expect(passesCalFilter({ k: "undated" }, items, "c5", TODAY)).toBe(true);
    expect(passesCalFilter({ k: "day", kind: "send", ymd: "2026-10-28" }, items, "c3", TODAY)).toBe(true);
    expect(passesCalFilter({ k: "day", kind: "nudge", ymd: "2026-10-28" }, items, "c3", TODAY)).toBe(false);
  });
});

describe("TD52 B1 — London days, across a clock change", () => {
  it("an instant is the London day it falls on: after 23:00 UTC in BST is tomorrow, in GMT it is not", () => {
    expect(londonYmdOf("2026-10-15T23:30:00Z")).toBe("2026-10-16"); // BST (UTC+1)
    expect(londonYmdOf("2026-11-15T23:30:00Z")).toBe("2026-11-15"); // GMT
    expect(londonToday(Date.parse("2026-10-24T23:30:00Z"))).toBe("2026-10-25"); // the night the clocks go back
    expect(londonToday(Date.parse("2026-10-25T23:30:00Z"))).toBe("2026-10-25");
    expect(londonYmdOf("2026-10-23")).toBe("2026-10-23");
  });
});

describe("chip words", () => {
  it("Send full · Oduya · Nudge · Sark · Close? · Vale · an own task's text", () => {
    expect(chipLabel("send", "Send your full", "Ade Oduya")).toBe("Send full · Oduya");
    expect(chipLabel("nudge", "", "Tom Sark")).toBe("Nudge · Sark");
    expect(chipLabel("close", "", "Imogen Vale")).toBe("Close? · Vale");
    expect(chipLabel("mine", "Write the synopsis", "Your own task")).toBe("Write the synopsis");
  });
});
