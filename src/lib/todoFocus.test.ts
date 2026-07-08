/**
 * Locks for the Clear-the-Desk focus logic: the queue membership (writer's-turn only, Offer
 * excluded), the request-date-ascending order, session-skip removal, and the entry cadence.
 */

import { describe, it, expect } from "vitest";
import { QueryStatus, Task, Query } from "../types";
import { focusQueue, shouldOpenFocus, FOCUS_TASK_TYPES } from "./todoFocus";

const task = (id: string, taskType: string, relatedRecordId: string): Task =>
  ({ id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "queries" } as Task);

const query = (id: string, status: QueryStatus, dates: Partial<Query> = {}): Query =>
  ({ id, status, ...dates } as unknown as Query);

const NOW = Date.parse("2026-07-08T12:00:00Z");

describe("focusQueue — membership + order", () => {
  const queries = [
    query("q1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: "2026-07-04T09:00:00Z" }),
    query("q2", QueryStatus.FULL_REQUESTED, { fullRequestedDate: "2026-07-01T09:00:00Z" }),
    query("q3", QueryStatus.REVISE_RESUBMIT, { lastStatusChange: "2026-07-06T09:00:00Z" }),
    query("q4", QueryStatus.OFFER, {}),
    query("q5", QueryStatus.QUERIED, { dateSent: "2026-07-02T09:00:00Z" }),
  ];
  const tasks = [
    task("t-offer", "offer_received", "q4"),
    task("t-partial", "partial_requested", "q1"),
    task("t-full", "full_requested", "q2"),
    task("t-rr", "revise_resubmit", "q3"),
  ];

  it("keeps only the three writer's-turn mark-sent types — Offer excluded", () => {
    const ids = focusQueue(tasks, queries, new Set()).map((t) => t.taskType);
    expect(ids.sort()).toEqual([...FOCUS_TASK_TYPES].sort());
    expect(ids).not.toContain("offer_received");
  });

  it("orders by request date ascending (oldest first)", () => {
    // q2 (1 Jul) → q1 (4 Jul) → q3 (6 Jul)
    expect(focusQueue(tasks, queries, new Set()).map((t) => t.relatedRecordId)).toEqual(["q2", "q1", "q3"]);
  });

  it("drops session-skipped tasks (keyed by task id)", () => {
    const skipped = new Set(["t-full"]);
    expect(focusQueue(tasks, queries, skipped).map((t) => t.relatedRecordId)).toEqual(["q1", "q3"]);
  });

  it("sinks an undated writer's-turn item to the end", () => {
    const q = [...queries, query("q6", QueryStatus.PARTIAL_REQUESTED, {})];
    const t = [...tasks, task("t-undated", "partial_requested", "q6")];
    expect(focusQueue(t, q, new Set()).map((x) => x.relatedRecordId).at(-1)).toBe("q6");
  });
});

describe("shouldOpenFocus — entry cadence", () => {
  const queue = [task("t-partial", "partial_requested", "q1")];
  const queries = [query("q1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: "2026-07-08T10:00:00Z" })];

  it("never forces the ritual on an empty queue", () => {
    expect(shouldOpenFocus({ queue: [], queries, todoLastFocusedAt: undefined, now: NOW })).toBe(false);
  });

  it("opens when never focused before", () => {
    expect(shouldOpenFocus({ queue, queries, todoLastFocusedAt: undefined, now: NOW })).toBe(true);
  });

  it("opens on an unparseable stamp (fail-open)", () => {
    expect(shouldOpenFocus({ queue, queries, todoLastFocusedAt: "not-a-date", now: NOW })).toBe(true);
  });

  it("opens on the first visit of a new day", () => {
    expect(shouldOpenFocus({ queue, queries, todoLastFocusedAt: "2026-07-05T12:00:00Z", now: NOW })).toBe(true);
  });

  it("stays in the Ledger later the same day with no newer item", () => {
    // last focus 11:00; the only item's request was 10:00 (older) → nothing new
    expect(shouldOpenFocus({ queue, queries, todoLastFocusedAt: "2026-07-08T11:00:00Z", now: NOW })).toBe(false);
  });

  it("re-opens the same day when an urgent item is newer than the last focus", () => {
    // last focus 09:00; the item's request was 10:00 (newer)
    expect(shouldOpenFocus({ queue, queries, todoLastFocusedAt: "2026-07-08T09:00:00Z", now: NOW })).toBe(true);
  });
});
