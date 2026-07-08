/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoLedger — pure logic for the To-do Ledger's two derived streams (Do next · Housekeeping) and
 * the per-item command-bar action set. Derived-over-stored: everything comes from the existing
 * task engine (Task[], already snooze-filtered) joined to `queries` — nothing new is stored.
 *
 * SINGLE ACTION SOURCE (owner directive): the pane never re-branches on status. Query-pipeline
 * items DELEGATE to the shared getPrimaryAction map (lifted in Prompt 2), so the Ledger pane and
 * the Clear-the-Desk focus card resolve the same action for the same query and can't drift. The
 * task-specific surfaces (nudge / edit-agent / CNR) are resolved here too, once, and unit-locked.
 *
 * STREAMS (v1):
 *   Do next     — pipeline moves on a live query: offer_received (pinned top), partial/full
 *                 requested, revise_resubmit, nudge_overdue. (querying_unstarted is a STARTER, not
 *                 a pipeline move — deliberately excluded; a candidate for a later suggestions stream.)
 *   Housekeeping — data_quality_poor (agent MSWL/materials/response-time → Edit Agent drawer) and
 *                 no_response_close (stale → CNR / Still waiting). (No manuscript-word-count task
 *                 exists in the engine — that mockup item was illustrative and is intentionally unbuilt.)
 */

import { Task, Query, QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";
import { focusRequestMs } from "./todoFocus";

export const DO_NEXT_TASK_TYPES = ["offer_received", "partial_requested", "full_requested", "revise_resubmit", "nudge_overdue"] as const;
export const HOUSEKEEPING_TASK_TYPES = ["data_quality_poor", "no_response_close"] as const;
const DO_NEXT_SET: ReadonlySet<string> = new Set(DO_NEXT_TASK_TYPES);
const HK_SET: ReadonlySet<string> = new Set(HOUSEKEEPING_TASK_TYPES);

export function isDoNext(t: Task): boolean {
  return DO_NEXT_SET.has(t.taskType);
}
export function isHousekeeping(t: Task): boolean {
  return HK_SET.has(t.taskType);
}

const getTime = (val: unknown): number => {
  if (val == null) return NaN;
  if (typeof val === "object" && typeof (val as any).toDate === "function") return (val as any).toDate().getTime();
  if (typeof val === "object" && "seconds" in (val as any)) return (val as any).seconds * 1000;
  return new Date(val as any).getTime();
};

/** Sort key for Do next: Offers pinned to the very top, then oldest-pressing first. */
export function doNextSortMs(task: Task, q: Query | undefined): number {
  if (task.taskType === "offer_received") return Number.NEGATIVE_INFINITY;
  if (task.taskType === "nudge_overdue") {
    const ms = getTime(q?.responseDeadline ?? q?.dateSent);
    return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
  }
  return focusRequestMs(q); // writer's-turn request date
}

export function doNextTasks(tasks: Task[], queries: Query[]): Task[] {
  const byId = new Map(queries.map((q) => [q.id, q]));
  return tasks
    .filter(isDoNext)
    .sort((a, b) => doNextSortMs(a, byId.get(a.relatedRecordId)) - doNextSortMs(b, byId.get(b.relatedRecordId)));
}

export function housekeepingTasks(tasks: Task[]): Task[] {
  return tasks.filter(isHousekeeping);
}

// ── Command-bar action set (the ONLY action source the pane renders) ──
export type LedgerActionId = "mark-sent" | "record" | "nudge" | "edit-agent" | "cnr" | "still-waiting" | "snooze";
export interface LedgerAction {
  id: LedgerActionId;
  label: string;
  variant: "primary" | "ghost";
}

/**
 * The command-bar buttons for a Ledger item, in order (primary first). Query-pipeline items
 * delegate their primary to getPrimaryAction — so "Mark partial as sent" / "Record response" here
 * are the SAME strings the focus card and the Queries command bar use.
 */
export function ledgerCommandActions(task: Task, query?: Query): LedgerAction[] {
  switch (task.taskType) {
    case "nudge_overdue":
      return [{ id: "nudge", label: "Send a nudge", variant: "primary" }, { id: "snooze", label: "Snooze", variant: "ghost" }];
    case "data_quality_poor":
      return [{ id: "edit-agent", label: "Edit agent details", variant: "primary" }];
    case "no_response_close":
      return [{ id: "cnr", label: "Mark as no response", variant: "primary" }, { id: "still-waiting", label: "Still waiting", variant: "ghost" }];
    default: {
      // offer_received / partial_requested / full_requested / revise_resubmit — via the shared map.
      const pa = query ? getPrimaryAction(query.status as QueryStatus) : ({ kind: "record", label: "Record response" } as const);
      if (pa.kind === "mark-sent") {
        return [{ id: "mark-sent", label: pa.label, variant: "primary" }, { id: "snooze", label: "Snooze", variant: "ghost" }];
      }
      return [{ id: "record", label: pa.label, variant: "primary" }]; // Offer → exactly "Record response"
    }
  }
}
