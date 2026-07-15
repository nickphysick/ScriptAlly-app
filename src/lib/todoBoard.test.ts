import { describe, it, expect } from "vitest";
import { QueryStatus, Task, Query, Agent, Manuscript, UserTask, TaskFlag, Activity, ActivityType } from "../types";
import { assembleBoard, boardStreamForTaskType, BoardInput } from "./todoBoard";

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

describe("assembleBoard — columns", () => {
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

  it("splits Do next / Housekeeping and excludes out-of-scope task types", () => {
    const b = assembleBoard(input);
    expect(b.do.map((c) => c.taskType).sort()).toEqual(["full_requested", "offer_received"]);
    expect(b.hk.map((c) => c.taskType)).toEqual(["data_quality_poor"]);
    expect(b.do.some((c) => c.taskType === "querying_unstarted")).toBe(false);
  });

  it("pins the Offer to the top of Do next", () => {
    expect(assembleBoard(input).do[0].taskType).toBe("offer_received");
  });

  it("Your tasks = open user tasks only (done ones move to Cleared)", () => {
    const b = assembleBoard(input);
    expect(b.nt.map((c) => c.userTaskId)).toEqual(["u1"]);
    expect(b.done.some((c) => c.title === "Redraft opening")).toBe(true); // u2 done today
  });

  it("housekeeping card carries no status dot (hk glyph)", () => {
    const b = assembleBoard(input);
    expect(b.hk[0].hk).toBe(true);
    expect(b.hk[0].status).toBeUndefined();
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

describe("assembleBoard — cleared union", () => {
  it("Cleared column = done-today tasks + today's clearing activities", () => {
    const b = assembleBoard(base({
      userTasks: [utask("u1", { done: true, completedAt: "2026-07-09T08:00:00Z" })],
      activities: [
        { id: "act1", activityType: ActivityType.QUERY_SENT, date: "2026-07-09T10:00:00Z", queryId: "q1" } as Activity,
        { id: "act2", activityType: ActivityType.AGENT_ADDED, date: "2026-07-09T10:00:00Z" } as Activity, // not a clearing type
      ],
      queries: [query("q1", "a1", QueryStatus.QUERIED)],
      agents: [agent("a1", "JM")],
    }));
    expect(b.done.length).toBe(2); // 1 done task + 1 clearing activity (AGENT_ADDED excluded)
  });
});
