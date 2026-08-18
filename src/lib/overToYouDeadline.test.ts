/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * F2 (holding-reply pack) — the urgent list's deadline, and therefore its ORDER, came back.
 *
 * ⚠️ THIS IS THE ONE LIVE CONSUMER OF THE FAULT. `buildOverToYouRows` read `responseDeadline`; the
 * provenance pack stopped seeding that field and its migration deletes it, so every row arrived
 * with `deadline: null`. The sort is deadline-asc with nulls last, so with every row null the
 * documented ordering collapsed to task order — silently, because a list in the wrong order looks
 * exactly like a list in the right one.
 *
 * ⚠️ THE FIXTURES CARRY NO `responseDeadline`, which is the shape of every query the app can create
 * today. A fixture that set it would describe the world before the pack and pass either way.
 *
 * ⚠️ AND THE ROWS ARE ORDERED AGAINST EACH OTHER, not against literal dates: the assertion is that
 * the agent with the SHORTER stated window comes first, which is the rule. A hard-coded date would
 * go green the day the resolver's anchor moved.
 */
import { describe, it, expect } from "vitest";
import { buildOverToYouRows } from "../components/dashboard/OverToYou";
import { Task, Query, Agent, QueryStatus } from "../types";

const agent = (id: string, name: string, weeks?: number): Agent =>
  ({ id, userId: "u", name, agency: `${name} Lit`, submissionStatus: "Open",
     ...(weeks != null ? { responseTimeWeeks: weeks } : {}) } as unknown as Agent);

/** ⚠️ NO `responseDeadline` — the field is no longer written and the migration removes it. */
const query = (id: string, agentId: string, sent: string): Query =>
  ({ id, userId: "u", agentId, manuscriptId: "m1", status: QueryStatus.PARTIAL_REQUESTED,
     dateSent: sent } as unknown as Query);

const task = (id: string, relatedRecordId: string, ms: string): Task =>
  ({ id, priority: "urgent", title: "t", description: "d", manuscriptTitle: ms, context: "",
     relatedRecordId, taskType: "partial_requested", actionLabel: "Send", actionPath: "" } as Task);

describe("F2 · buildOverToYouRows resolves its own deadline", () => {
  /* two agents, same send date, different stated windows — so the expected dates differ only by
     the fact the resolver derives, and nothing else can explain the order */
  const agents = [agent("a-slow", "Slow", 12), agent("a-fast", "Fast", 2)];
  const queries = [query("q-slow", "a-slow", "2026-06-01"), query("q-fast", "a-fast", "2026-06-01")];
  /* task order deliberately puts the SLOW one first, so task order and deadline order disagree */
  const tasks = [task("t-slow", "q-slow", "Book A"), task("t-fast", "q-fast", "Book B")];

  it("gives every row a deadline from the agency's window", () => {
    const rows = buildOverToYouRows(tasks, queries, agents);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.deadline, `${r.agentName}'s row has no deadline — the list falls back to task order`).not.toBeNull();
    }
  });

  it("and sorts by it, which is the ordering the list has always claimed", () => {
    const rows = buildOverToYouRows(tasks, queries, agents);
    /* ⚠️ AGAINST EACH OTHER: the shorter window is due sooner, so it leads — whatever the dates are */
    expect(rows[0].agentName, "the list is back in task order, not deadline order").toBe("Fast");
    expect(rows[1].agentName).toBe("Slow");
    expect(rows[0].deadline!.getTime()).toBeLessThan(rows[1].deadline!.getTime());
  });

  /**
   * ⚠️ AN AGENCY THAT STATES NOTHING STILL HAS NO DEADLINE, and that is the resolver's law holding
   * here too: the house 8/12/12-week assumption must not put this row above one with a real
   * stated window. Nulls last, exactly as before.
   */
  it("an agency stating no window yields no deadline, and sorts last", () => {
    const rows = buildOverToYouRows(
      [task("t-none", "q-none", "Book C"), ...tasks],
      [query("q-none", "a-none", "2026-06-01"), ...queries],
      [agent("a-none", "Silent"), ...agents],
    );
    expect(rows[rows.length - 1].agentName).toBe("Silent");
    expect(rows[rows.length - 1].deadline, "the app invented a window for an agency that states none").toBeNull();
  });

  /** The writer's own date outranks the agency's window here as everywhere. */
  it("honours the writer's own expected date", () => {
    const rows = buildOverToYouRows(
      [task("t-slow", "q-slow", "Book A")],
      [{ ...query("q-slow", "a-slow", "2026-06-01"), writerExpectedDate: "2026-06-10T00:00:00.000Z" } as unknown as Query],
      agents,
    );
    expect(rows[0].deadline!.toISOString()).toBe("2026-06-10T00:00:00.000Z");
  });
});
