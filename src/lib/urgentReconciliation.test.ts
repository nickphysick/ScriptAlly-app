/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE BOARD AND THE DASHBOARD MUST AGREE ABOUT "URGENT" (dashboard audit P3).
 *
 * The fault: the board collapses two requests from one agent on one manuscript into one card;
 * `buildOverToYouRows` did not. Measured on the fixture below before the fix — board 1, dashboard
 * 2. Both surfaces call the work "urgent", so a reader has no way to tell which number is the one
 * that means anything.
 *
 * These tests assert the two derivations against EACH OTHER rather than against a literal. A
 * hard-coded `toBe(1)` would go green the day someone changed both sides in the same wrong
 * direction, which is exactly the failure this is guarding.
 */
import { describe, it, expect } from "vitest";
import { assembleBoardColumns } from "./todoColumns";
import { cardFamily } from "./todoFamily";
import { buildOverToYouRows } from "../components/dashboard/OverToYou";
import { Task, Query, Agent, QueryStatus } from "../types";

const today = "2026-08-09";
const now = new Date(`${today}T12:00:00Z`).getTime();

const agent = (id: string, name: string): Agent =>
  ({ id, userId: "u", name, agencyName: `${name} Lit`, submissionStatus: "Open" } as unknown as Agent);

const query = (id: string, agentId: string, status: QueryStatus, ms: string): Query =>
  ({ id, userId: "u", agentId, manuscriptId: "m1", manuscriptTitle: ms, status,
     dateSent: "2026-06-01", responseDeadline: "2026-09-01" } as unknown as Query);

const task = (id: string, taskType: string, relatedRecordId: string, ms: string): Task =>
  ({ id, priority: "urgent", title: "t", description: "d", manuscriptTitle: ms, context: "",
     relatedRecordId, taskType, actionLabel: "Send", actionPath: "" } as Task);

/** The board's urgent figure, by its own law: live lane cards whose family is `urgent`. */
const boardUrgent = (tasks: Task[], queries: Query[], agents: Agent[]): number => {
  const { cols } = assembleBoardColumns({
    tasks, userTasks: [], queries, agents, manuscripts: [],
    taskFlags: [], activities: [], today, now,
  });
  return [...cols.todo, ...cols.today].filter((c) => cardFamily(c) === "urgent").length;
};

describe("urgent reconciliation — the board and the dashboard count the same things", () => {
  it("collapses two requests from one agent on one manuscript, on BOTH sides", () => {
    const agents = [agent("a1", "Ada")];
    const queries = [
      query("q1", "a1", QueryStatus.FULL_REQUESTED, "Tidewrack"),
      query("q2", "a1", QueryStatus.FULL_REQUESTED, "Tidewrack"),
    ];
    const tasks = [
      task("t1", "full_requested", "q1", "Tidewrack"),
      task("t2", "full_requested", "q2", "Tidewrack"),
    ];

    const dash = buildOverToYouRows(tasks, queries, agents).length;
    expect(dash).toBe(boardUrgent(tasks, queries, agents));
    expect(dash).toBe(1); // and it is the collapsed figure, not the raw one
  });

  it("keeps one agent's requests on DIFFERENT manuscripts apart, on both sides", () => {
    const agents = [agent("a1", "Ada")];
    const queries = [
      query("q1", "a1", QueryStatus.FULL_REQUESTED, "Tidewrack"),
      query("q2", "a1", QueryStatus.FULL_REQUESTED, "Saltmarsh"),
    ];
    const tasks = [
      task("t1", "full_requested", "q1", "Tidewrack"),
      task("t2", "full_requested", "q2", "Saltmarsh"),
    ];

    const dash = buildOverToYouRows(tasks, queries, agents).length;
    expect(dash).toBe(boardUrgent(tasks, queries, agents));
    expect(dash).toBe(2); // two books is two pieces of work, never one
  });

  it("keeps DIFFERENT agents apart, and keeps different task types apart", () => {
    const agents = [agent("a1", "Ada"), agent("a2", "Bo")];
    const queries = [
      query("q1", "a1", QueryStatus.FULL_REQUESTED, "Tidewrack"),
      query("q2", "a2", QueryStatus.FULL_REQUESTED, "Tidewrack"),
      query("q3", "a1", QueryStatus.PARTIAL_REQUESTED, "Tidewrack"),
    ];
    const tasks = [
      task("t1", "full_requested", "q1", "Tidewrack"),
      task("t2", "full_requested", "q2", "Tidewrack"),
      task("t3", "partial_requested", "q3", "Tidewrack"),
    ];

    const dash = buildOverToYouRows(tasks, queries, agents).length;
    expect(dash).toBe(boardUrgent(tasks, queries, agents));
    expect(dash).toBe(3);
  });

  it("⚠️ the row that survives is the one the BOARD keeps — first in task order, not earliest deadline", () => {
    const agents = [agent("a1", "Ada")];
    // q1 is the LATER deadline but the FIRST task; deduping after the sort would keep q2.
    const queries = [
      { ...query("q1", "a1", QueryStatus.FULL_REQUESTED, "Tidewrack"), responseDeadline: "2026-12-01" } as Query,
      { ...query("q2", "a1", QueryStatus.FULL_REQUESTED, "Tidewrack"), responseDeadline: "2026-09-01" } as Query,
    ];
    const tasks = [
      task("t1", "full_requested", "q1", "Tidewrack"),
      task("t2", "full_requested", "q2", "Tidewrack"),
    ];

    const rows = buildOverToYouRows(tasks, queries, agents);
    expect(rows).toHaveLength(1);
    expect(rows[0].task.id).toBe("t1");

    const { cols } = assembleBoardColumns({
      tasks, userTasks: [], queries, agents, manuscripts: [],
      taskFlags: [], activities: [], today, now,
    });
    // the board kept the same one — same query, not merely the same count
    expect([...cols.todo, ...cols.today].map((c) => c.key)).toContain("t1");
  });

  it("a task with no resolvable agent is NEVER collapsed into another", () => {
    const agents: Agent[] = [];
    const queries: Query[] = []; // no query → no agent identity on either row
    const tasks = [
      task("t1", "full_requested", "missing-1", "Tidewrack"),
      task("t2", "full_requested", "missing-2", "Tidewrack"),
    ];
    // Both survive: a null key means "no identity to collide on", never "all the same".
    expect(buildOverToYouRows(tasks, queries, agents)).toHaveLength(2);
  });
});
