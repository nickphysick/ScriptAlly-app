import { describe, it, expect } from "vitest";
import { QueryStatus, Task, Query, Agent, Manuscript, UserTask, TaskFlag, Activity, ActivityType } from "../types";
import { assembleBoard, boardStreamForTaskType, todaySplit, ribbonTiles, laneFadeState, BoardInput } from "./todoBoard";

const TODAY = "2026-07-09";
const NOW = Date.parse("2026-07-09T12:00:00Z");

const task = (id: string, taskType: string, rid: string): Task =>
  ({ id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId: rid, taskType, actionLabel: "", actionPath: "queries" } as Task);
const query = (id: string, agentId: string, status: QueryStatus, over: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: "m1", status, dateSent: "2026-05-01T00:00:00Z", ...over } as unknown as Query);
const agent = (id: string, name: string): Agent => ({ id, name, agency: "Agency" } as unknown as Agent);
const ms = (id: string, title: string): Manuscript => ({ id, title } as unknown as Manuscript);
const utask = (id: string, over: Partial<UserTask> = {}): UserTask =>
  ({ id, userId: "u", text: "Redraft opening", done: false, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z", ...over } as UserTask);

const base = (over: Partial<BoardInput> = {}): BoardInput => ({
  tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [ms("m1", "Lost Clockworks")], taskFlags: [], activities: [], today: TODAY, now: NOW, ...over,
});

describe("boardStreamForTaskType", () => {
  it("routes derived types to do / hk, excludes out-of-scope", () => {
    expect(boardStreamForTaskType("offer_received")).toBe("do");
    expect(boardStreamForTaskType("nudge_overdue")).toBe("do");
    expect(boardStreamForTaskType("data_quality_poor")).toBe("hk");
    expect(boardStreamForTaskType("no_response_close")).toBe("hk");
    expect(boardStreamForTaskType("querying_unstarted")).toBeNull();
    expect(boardStreamForTaskType("dream_agent_unqueried")).toBeNull();
  });
});

describe("assembleBoard — three lanes (no cleared lane)", () => {
  const input = base({
    tasks: [
      task("t-full", "full_requested", "q1"),
      task("t-offer", "offer_received", "q2"),
      task("t-dq", "data_quality_poor", "a3"),
      task("t-unstarted", "querying_unstarted", "m1"), // OUT — must not appear
    ],
    queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED), query("q2", "a2", QueryStatus.OFFER)],
    agents: [agent("a1", "Juliet Mushens"), agent("a2", "Ivor Penn"), agent("a3", "Rowan Blake")],
    userTasks: [utask("u1"), utask("u2", { done: true, completedAt: "2026-07-09T09:00:00Z" })],
  });

  it("exposes exactly three lanes + the cleared union (cleared is NOT a lane)", () => {
    const b = assembleBoard(input);
    expect(Object.keys(b).sort()).toEqual(["cleared", "do", "hk", "nt"]);
  });

  it("splits Do next / Housekeeping and excludes out-of-scope task types", () => {
    const b = assembleBoard(input);
    expect(b.do.map((c) => c.taskType).sort()).toEqual(["full_requested", "offer_received"]);
    expect(b.hk.map((c) => c.taskType)).toEqual(["data_quality_poor"]);
    expect(b.do.some((c) => c.taskType === "querying_unstarted")).toBe(false);
  });

  it("pins the Offer to the top of Do next", () => {
    expect(assembleBoard(input).do[0].taskType).toBe("offer_received");
  });

  it("Your tasks = open user tasks only (done ones move to the cleared union)", () => {
    const b = assembleBoard(input);
    expect(b.nt.map((c) => c.userTaskId)).toEqual(["u1"]);
    expect(b.cleared.some((c) => c.title === "Redraft opening")).toBe(true); // u2 done today
  });

  it("housekeeping card carries no status dot (hk glyph)", () => {
    const b = assembleBoard(input);
    expect(b.hk[0].hk).toBe(true);
    expect(b.hk[0].status).toBeUndefined();
  });
});

describe("assembleBoard — note snooze (the ⏸ stance suppresses, never deletes)", () => {
  it("a snoozed user_task flag hides the note; an expired one doesn't", () => {
    const snoozed: TaskFlag = { id: "f", userId: "u", taskType: "user_task", queryId: "u1", snoozeCount: 1, snoozedUntil: "2026-07-16T00:00:00Z" }; // future of NOW (9 Jul)
    const expired: TaskFlag = { id: "f2", userId: "u", taskType: "user_task", queryId: "u2", snoozeCount: 1, snoozedUntil: "2026-07-01T00:00:00Z" };
    const b = assembleBoard(base({ userTasks: [utask("u1"), utask("u2")], taskFlags: [snoozed, expired] }));
    expect(b.nt.map((c) => c.userTaskId)).toEqual(["u2"]); // u1 suppressed, u2 back
  });
});

describe("assembleBoard — commit state", () => {
  it("derived card is committed when a matching taskFlag has committedDate === today", () => {
    const flag: TaskFlag = { id: "f", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 0, committedDate: TODAY };
    const b = assembleBoard(base({ tasks: [task("t", "full_requested", "q1")], queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED)], agents: [agent("a1", "JM")], taskFlags: [flag] }));
    expect(b.do[0].committed).toBe(true);
  });
  it("user card is committed from its OWN committedDate", () => {
    const b = assembleBoard(base({ userTasks: [utask("u1", { committedDate: TODAY }), utask("u2", { committedDate: "2026-07-01" })] }));
    const byId = Object.fromEntries(b.nt.map((c) => [c.userTaskId, c.committed]));
    expect(byId["u1"]).toBe(true);
    expect(byId["u2"]).toBe(false);
  });
});

describe("assembleBoard — cleared union (feeds the done-band, not a lane)", () => {
  const clearedInput = base({
    userTasks: [utask("u1", { done: true, completedAt: "2026-07-09T08:00:00Z" })],
    activities: [
      { id: "act1", activityType: ActivityType.QUERY_SENT, date: "2026-07-09T10:00:00Z", queryId: "q1" } as Activity,
      { id: "act2", activityType: ActivityType.AGENT_ADDED, date: "2026-07-09T10:00:00Z" } as Activity, // not a clearing type
    ],
    queries: [query("q1", "a1", QueryStatus.QUERIED)],
    agents: [agent("a1", "JM")],
  });

  it("cleared = done-today tasks + today's clearing activities (one completion → one item)", () => {
    const b = assembleBoard(clearedInput);
    expect(b.cleared.length).toBe(2); // 1 done task + 1 clearing activity (AGENT_ADDED excluded)
  });

  it("cleared cards carry a whenMs and are newest-first", () => {
    const b = assembleBoard(clearedInput);
    expect(b.cleared.every((c) => typeof c.whenMs === "number")).toBe(true);
    const times = b.cleared.map((c) => c.whenMs as number);
    expect(times).toEqual([...times].sort((a, z) => z - a)); // descending
    expect(b.cleared[0].title).not.toBe("Redraft opening"); // 10:00 activity beats the 08:00 task
  });
});

describe("todaySplit — committed band (today only) vs done band (uncapped)", () => {
  const flagToday: TaskFlag = { id: "f1", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 0, committedDate: TODAY };
  const input = base({
    tasks: [task("t-full", "full_requested", "q1"), task("t-part", "partial_requested", "q2")],
    queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED), query("q2", "a2", QueryStatus.PARTIAL_REQUESTED)],
    agents: [agent("a1", "JM"), agent("a2", "IP")],
    userTasks: [
      utask("u-roll", { committedDate: "2026-07-01" }), // rolled over — NOT committed-today
      utask("u-today", { committedDate: TODAY }),
      utask("u-done", { done: true, completedAt: "2026-07-09T09:00:00Z" }), // done → in cleared, not committed
    ],
    taskFlags: [flagToday],
  });

  it("committed = committedDate === today only (excludes rolled-over + uncommitted)", () => {
    const b = assembleBoard(input);
    const split = todaySplit(b, TODAY);
    const ids = split.committed.map((c) => c.userTaskId ?? c.taskType).sort();
    expect(ids).toEqual(["full_requested", "u-today"]); // the today flag + the today user task
    expect(split.committed.some((c) => c.userTaskId === "u-roll")).toBe(false);
    expect(split.committed.some((c) => c.taskType === "partial_requested")).toBe(false); // uncommitted
  });

  it("done band = the cleared union; the two counts are independent", () => {
    const b = assembleBoard(input);
    const split = todaySplit(b, TODAY);
    expect(split.done).toBe(b.cleared);
    expect(split.done.length).toBe(1); // u-done
    expect(split.committed.length).toBe(2);
    expect(split.committed.length).not.toBe(split.done.length);
  });
});

describe("ribbonTiles — the header tiles mirror the lanes", () => {
  const input = base({
    tasks: [
      task("t-full", "full_requested", "q1"),
      task("t-offer", "offer_received", "q2"),
      task("t-dq", "data_quality_poor", "a3"),
    ],
    queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED), query("q2", "a2", QueryStatus.OFFER)],
    agents: [agent("a1", "JM"), agent("a2", "IP"), agent("a3", "RB")],
    userTasks: [utask("u1"), utask("u2")],
  });

  it("urgent + notes tile counts equal their lane counts", () => {
    const b = assembleBoard(input);
    const tiles = ribbonTiles(b, 7);
    expect(tiles.urgent).toBe(b.do.length); // 2
    expect(tiles.notes).toBe(b.nt.length); // 2
  });

  it("housekeeping tile is the GAP count passed through (gaps, not piles)", () => {
    const b = assembleBoard(input);
    expect(ribbonTiles(b, 7).housekeeping).toBe(7);
    expect(ribbonTiles(b, 0).housekeeping).toBe(0);
  });
});

describe("laneFadeState — the polish P1 both-edge fade machine (4px thresholds)", () => {
  it("at rest on an overflowing reel: right fade only", () => {
    expect(laneFadeState(0, 1200, 600)).toEqual({ left: false, right: true });
  });
  it("mid-scroll: both fades", () => {
    expect(laneFadeState(300, 1200, 600)).toEqual({ left: true, right: true });
  });
  it("scrolled to the end: left fade only (the right fade clears inside the 4px threshold)", () => {
    expect(laneFadeState(600, 1200, 600)).toEqual({ left: true, right: false });
    expect(laneFadeState(597, 1200, 600)).toEqual({ left: true, right: false });
  });
  it("a non-overflowing reel shows neither", () => {
    expect(laneFadeState(0, 600, 600)).toEqual({ left: false, right: false });
  });
});
