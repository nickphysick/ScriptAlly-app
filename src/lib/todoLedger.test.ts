/**
 * Locks for the Ledger's stream membership, ordering, and the single command-bar action source.
 * The pipeline action delegates to getPrimaryAction, so "Mark partial as sent" / "Record response"
 * here stay identical to the focus card and the Queries command bar — pinned once, in one place.
 */

import { describe, it, expect } from "vitest";
import { QueryStatus, Task, Query } from "../types";
import { doNextTasks, housekeepingTasks, isDoNext, isHousekeeping, ledgerCommandActions, DO_NEXT_TASK_TYPES, HOUSEKEEPING_TASK_TYPES } from "./todoLedger";

const task = (id: string, taskType: string, relatedRecordId: string): Task =>
  ({ id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "queries" } as Task);
const query = (id: string, status: QueryStatus, dates: Partial<Query> = {}): Query =>
  ({ id, status, ...dates } as unknown as Query);

describe("stream membership", () => {
  it("Do next = the five pipeline types; querying_unstarted / dream_agent / data_quality excluded", () => {
    expect([...DO_NEXT_TASK_TYPES]).toEqual(["offer_received", "partial_requested", "full_requested", "revise_resubmit", "nudge_overdue"]);
    expect(isDoNext(task("t", "querying_unstarted", "m1"))).toBe(false);
    expect(isDoNext(task("t", "dream_agent_unqueried", "a1"))).toBe(false);
    expect(isDoNext(task("t", "data_quality_poor", "a1"))).toBe(false);
  });
  it("Housekeeping = data_quality_poor + no_response_close only", () => {
    expect([...HOUSEKEEPING_TASK_TYPES]).toEqual(["data_quality_poor", "no_response_close"]);
    expect(isHousekeeping(task("t", "data_quality_poor", "a1"))).toBe(true);
    expect(isHousekeeping(task("t", "no_response_close", "q1"))).toBe(true);
    expect(isHousekeeping(task("t", "nudge_overdue", "q1"))).toBe(false);
  });
  it("housekeepingTasks filters to the two types", () => {
    const tasks = [task("a", "data_quality_poor", "a1"), task("b", "no_response_close", "q1"), task("c", "partial_requested", "q2")];
    expect(housekeepingTasks(tasks).map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("Do next ordering — Offer pinned top, then oldest-pressing first", () => {
  const queries = [
    query("q1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: "2026-07-05T09:00:00Z" }),
    query("q2", QueryStatus.OFFER, {}),
    query("q3", QueryStatus.FULL_REQUESTED, { fullRequestedDate: "2026-07-01T09:00:00Z" }),
    query("q4", QueryStatus.QUERIED, { responseDeadline: "2026-06-20T09:00:00Z", dateSent: "2026-05-01T09:00:00Z" }),
  ];
  const tasks = [
    task("t-partial", "partial_requested", "q1"),
    task("t-offer", "offer_received", "q2"),
    task("t-full", "full_requested", "q3"),
    task("t-nudge", "nudge_overdue", "q4"),
  ];
  it("puts the Offer first, then by pressing date ascending", () => {
    // offer(q2) → nudge deadline 20 Jun (q4) → full req 1 Jul (q3) → partial req 5 Jul (q1)
    expect(doNextTasks(tasks, queries).map((t) => t.relatedRecordId)).toEqual(["q2", "q4", "q3", "q1"]);
  });
});

describe("command-bar action set (single source; pipeline delegates to getPrimaryAction)", () => {
  it("Offer → one primary 'Record response' (exact label, no decision-CTA dressing)", () => {
    expect(ledgerCommandActions(task("t", "offer_received", "q1"), query("q1", QueryStatus.OFFER))).toEqual([
      { id: "record", label: "Record response", variant: "primary" },
    ]);
  });
  it("Partial Requested → 'Mark partial as sent' (from the shared map) + Snooze", () => {
    expect(ledgerCommandActions(task("t", "partial_requested", "q1"), query("q1", QueryStatus.PARTIAL_REQUESTED))).toEqual([
      { id: "mark-sent", label: "Mark partial as sent", variant: "primary" },
      { id: "snooze", label: "Snooze", variant: "ghost" },
    ]);
  });
  it("R&R → 'Record your resubmission' (from the shared map)", () => {
    expect(ledgerCommandActions(task("t", "revise_resubmit", "q1"), query("q1", QueryStatus.REVISE_RESUBMIT))[0]).toEqual({
      id: "mark-sent", label: "Record your resubmission", variant: "primary",
    });
  });
  it("nudge_overdue → Send a nudge + Snooze", () => {
    expect(ledgerCommandActions(task("t", "nudge_overdue", "q1"), query("q1", QueryStatus.QUERIED))).toEqual([
      { id: "nudge", label: "Send a nudge", variant: "primary" },
      { id: "snooze", label: "Snooze", variant: "ghost" },
    ]);
  });
  it("data_quality_poor → Edit agent details (drawer)", () => {
    expect(ledgerCommandActions(task("t", "data_quality_poor", "a1"))).toEqual([{ id: "edit-agent", label: "Edit agent details", variant: "primary" }]);
  });
  it("no_response_close → Mark as no response + Still waiting", () => {
    expect(ledgerCommandActions(task("t", "no_response_close", "q1"), query("q1", QueryStatus.QUERIED))).toEqual([
      { id: "cnr", label: "Mark as no response", variant: "primary" },
      { id: "still-waiting", label: "Still waiting", variant: "ghost" },
    ]);
  });
  it("every stream type yields a non-empty command-bar set (the pane's sole action home)", () => {
    for (const tt of [...DO_NEXT_TASK_TYPES, ...HOUSEKEEPING_TASK_TYPES]) {
      const q = query("q1", QueryStatus.QUERIED);
      expect(ledgerCommandActions(task("t", tt, "q1"), q).length).toBeGreaterThan(0);
    }
  });
});
