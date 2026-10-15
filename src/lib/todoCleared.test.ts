/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD5 B1 (unit) — `clearedSince` counts each kind once, leaves out snoozes and dismissals, leaves out
 * acts before Monday 00:00 London, and leaves out what carries no date.
 */
import { describe, expect, it } from "vitest";
import { clearedSince, clearedThisWeek, clearedToday, londonDayStart, londonWeekStart, CLEARED_KINDS, type ClearedData } from "./todoCleared";
import type { Activity, Agent, Query, TaskFlag, UserTask } from "../types";
import { QueryStatus } from "../types";

/* Wednesday 15 Oct 2026, 14:00 BST (13:00 UTC) */
const NOW = Date.UTC(2026, 9, 15, 13, 0);
const MON = Date.UTC(2026, 9, 11, 23, 0); // Mon 12 Oct 00:00 BST
const iso = (t: number) => (Number.isFinite(t) ? new Date(t).toISOString() : "");

const agents = [{ id: "a1", name: "Greg Panetta", agency: "Curtis Vane" }] as unknown as Agent[];
const queries = [{ id: "q1", agentId: "a1", status: QueryStatus.PARTIAL_SENT, nudgeDate: "2026-11-12" }] as unknown as Query[];
const act = (id: string, eventKey: string, t: number, extra: Partial<Activity> = {}): Activity =>
  ({ id, userId: "u", queryId: "q1", manuscriptId: "m", activityType: "Status Change", description: "", details: "", date: iso(t), eventKey, ...extra }) as unknown as Activity;

const data = (over: Partial<ClearedData> = {}): ClearedData => ({
  activities: [
    act("s1", "partial_sent", NOW - 3600e3, { resultingStatus: QueryStatus.PARTIAL_SENT }),
    act("s1", "partial_sent", NOW - 3600e3), // the same record twice: counted once
    act("n1", "nudge_sent", NOW - 2 * 86400e3),
    act("c1", "closed_no_reply", NOW - 86400e3),
    act("o1", "offer_declined", NOW - 7200e3),
    act("r1", "resubmitted", NOW - 60e3),
    act("old", "full_sent", MON - 60e3), // Sunday 23:59 London: last week
    act("ign", "partial_requested", NOW - 60e3), // not a clearing act
    act("nodate", "full_sent", NaN), // no date: left out
  ],
  taskFlags: [
    { id: "f1", userId: "u", taskType: "data_quality_poor", agentId: "a1", snoozeCount: 0, resolvedAt: iso(NOW - 500e3) },
    { id: "f2", userId: "u", taskType: "data_quality_poor", agentId: "a1", snoozeCount: 0 }, // open
    { id: "z1", userId: "u", taskType: "nudge_overdue", queryId: "q1", snoozeCount: 1, snoozedUntil: iso(NOW + 86400e3) }, // snoozed
    { id: "z2", userId: "u", taskType: "nudge_overdue", queryId: "q1", snoozeCount: 0, snoozedUntil: "9999-12-31T00:00:00.000Z" }, // dismissed
    { id: "z3", userId: "u", taskType: "data_quality_poor", agentId: "a1", snoozeCount: 1, snoozedUntil: iso(NOW - 1000) }, // a snooze that ran out this week
  ] as TaskFlag[],
  userTasks: [
    { id: "t1", text: "Read chapter one aloud", done: true, completedAt: iso(NOW - 600e3), createdAt: iso(NOW - 9e8) },
    { id: "t2", text: "Undated done", done: true, createdAt: iso(NOW - 9e8) }, // no completedAt
    { id: "t3", text: "Open", done: false, createdAt: iso(NOW) },
  ] as unknown as UserTask[],
  queries, agents, ...over,
});

describe("todoCleared — London week", () => {
  it("Monday 00:00 London, in summer time", () => {
    expect(londonWeekStart(NOW)).toBe(MON);
    expect(londonDayStart(NOW)).toBe(Date.UTC(2026, 9, 14, 23, 0));
  });
  it("Monday 00:00 London, in winter time", () => {
    const winter = Date.UTC(2026, 11, 2, 10, 0); // Wed 2 Dec
    expect(londonWeekStart(winter)).toBe(Date.UTC(2026, 10, 30, 0, 0));
  });
  it("across the October clock change (Sun 25 Oct 2026)", () => {
    const mon = Date.UTC(2026, 9, 26, 9, 0); // Mon 26 Oct, GMT
    expect(londonWeekStart(mon)).toBe(Date.UTC(2026, 9, 26, 0, 0));
    expect(londonWeekStart(Date.UTC(2026, 9, 25, 22, 0))).toBe(MON + 7 * 86400e3); // Sunday night, after the change, is still the week of the 19th (BST midnight)
  });
});

describe("TD5 B1 — clearedSince", () => {
  const got = clearedThisWeek(data(), NOW);
  it("counts each clearing record once", () => {
    expect(got.map((a) => a.id).sort()).toEqual(["act:c1", "act:n1", "act:o1", "act:r1", "act:s1", "flag:f1", "task:t1"]);
  });
  it("enters every kind it can date", () => {
    expect([...new Set(got.map((a) => a.kind))].sort()).toEqual([...CLEARED_KINDS].sort());
  });
  it("never counts a snooze or a dismissal", () => {
    expect(got.some((a) => a.id.startsWith("flag:z"))).toBe(false);
  });
  it("leaves out what happened before Monday 00:00 London", () => {
    expect(got.some((a) => a.id === "act:old")).toBe(false);
    expect(clearedSince(data(), MON - 120e3, NOW).some((a) => a.id === "act:old")).toBe(true);
  });
  it("leaves out records with no date", () => {
    expect(got.some((a) => a.id === "act:nodate" || a.id === "task:t2")).toBe(false);
  });
  it("is newest first, with words for the slip", () => {
    expect(got[0].id).toBe("act:r1");
    const s = got.find((a) => a.id === "act:s1")!;
    expect(s.label).toBe("Partial to Greg Panetta");
    expect(s.consequence).toBe("Now Partial sent");
    expect(s.stamp).toBe("SENT");
    expect(got.find((a) => a.kind === "filled")!.stamp).toBe("SAVED");
  });
  it("an act dated later TODAY (the drawer's local-noon day stamp) counts, and carries no clock time", () => {
    const noon = act("noon", "full_sent", NOW + 3 * 3600e3); // 17:00 BST today, after NOW
    const got2 = clearedToday(data({ activities: [noon], taskFlags: [], userTasks: [] }), NOW);
    expect(got2.map((a) => a.id)).toEqual(["act:noon"]);
    expect(got2[0].timed).toBe(false);
    const tomorrow = act("tmw", "full_sent", NOW + 12 * 3600e3); // 01:00 BST tomorrow
    expect(clearedToday(data({ activities: [tomorrow], taskFlags: [], userTasks: [] }), NOW)).toEqual([]);
  });
  it("today is a narrower window of the same derivation", () => {
    const t = clearedToday(data(), NOW).map((a) => a.id).sort();
    expect(t).toEqual(["act:o1", "act:r1", "act:s1", "flag:f1", "task:t1"]);
  });
});
