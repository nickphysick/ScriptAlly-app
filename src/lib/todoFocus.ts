/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoFocus — the pure logic behind the To-do page's "Clear the Desk" focus ritual: which items
 * form the one-at-a-time queue, in what order, and whether the ritual should open on entry.
 *
 * Derived-over-stored: the queue is derived from the existing task engine (Task[] already excludes
 * snoozed/dismissed items) joined to `queries` — nothing is stored for it. Pure + unit-tested so the
 * cadence and ordering can't silently drift; the component owns all React/Firebase wiring.
 *
 * FOCUS SET = the writer's-turn mark-sent states only (Partial/Full Requested, R&R). Offer is
 * deliberately EXCLUDED (owner call): an offer isn't a ten-second desk-clear — it's the biggest
 * decision in the journey, with no real writer's-turn action, so it stays in the Ledger's Do-next
 * group (sorted to the top there), never in this queue.
 *
 * ORDER is the mockup's "deadline ascending". The data model has NO stored writer deadline (the
 * mockup's "due date" was illustrative), so the honest proxy is the agent's REQUEST date ascending
 * — the longest-waited request is the most pressing and surfaces first; undated items sink last.
 */

import { Task, Query, QueryStatus } from "../types";

export const FOCUS_TASK_TYPES = ["partial_requested", "full_requested", "revise_resubmit"] as const;
export type FocusTaskType = (typeof FOCUS_TASK_TYPES)[number];
const FOCUS_SET: ReadonlySet<string> = new Set(FOCUS_TASK_TYPES);

/** Firestore Timestamp | ISO | ms → ms (NaN when unparseable). */
const getTime = (val: unknown): number => {
  if (val == null) return NaN;
  if (typeof val === "object" && typeof (val as any).toDate === "function") return (val as any).toDate().getTime();
  if (typeof val === "object" && "seconds" in (val as any)) return (val as any).seconds * 1000;
  return new Date(val as any).getTime();
};

/**
 * The request date that makes a writer's-turn query pressing (the sort key + the card's context).
 * Undated → +Infinity so it sorts to the very end.
 */
export function focusRequestMs(q: Query | undefined): number {
  if (!q) return Number.POSITIVE_INFINITY;
  const iso =
    q.status === QueryStatus.PARTIAL_REQUESTED ? q.partialRequestedDate
    : q.status === QueryStatus.FULL_REQUESTED ? q.fullRequestedDate
    : (q.lastStatusChange ?? q.dateSent);
  const ms = iso ? getTime(iso) : NaN;
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/**
 * The one-at-a-time focus queue: writer's-turn mark-sent tasks (Offer excluded), session-skipped
 * items removed, oldest request first. `skipped` is keyed by Task.id.
 */
export function focusQueue(tasks: Task[], queries: Query[], skipped: ReadonlySet<string>): Task[] {
  const byId = new Map(queries.map((q) => [q.id, q]));
  return tasks
    .filter((t) => FOCUS_SET.has(t.taskType) && !skipped.has(t.id))
    .sort((a, b) => focusRequestMs(byId.get(a.relatedRecordId)) - focusRequestMs(byId.get(b.relatedRecordId)));
}

function sameLocalDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Should the page OPEN in the focus ritual (vs straight to the Ledger)? True on the first visit of
 * the day, or when an urgent item arrived after the last focus. An empty queue never forces the
 * ritual. `todoLastFocusedAt` is the write-on-exit cadence stamp (the only reader of that field).
 */
export function shouldOpenFocus(opts: {
  queue: Task[];
  queries: Query[];
  todoLastFocusedAt?: string;
  now?: number;
}): boolean {
  const { queue, queries, todoLastFocusedAt, now = Date.now() } = opts;
  if (queue.length === 0) return false;
  if (!todoLastFocusedAt) return true; // never focused before
  const lastMs = getTime(todoLastFocusedAt);
  if (Number.isNaN(lastMs)) return true;
  if (!sameLocalDay(lastMs, now)) return true; // first visit today
  const byId = new Map(queries.map((q) => [q.id, q]));
  const requestTimes = queue.map((t) => focusRequestMs(byId.get(t.relatedRecordId))).filter((n) => Number.isFinite(n));
  const newest = requestTimes.length ? Math.max(...requestTimes) : NaN;
  return Number.isFinite(newest) && newest > lastMs; // an urgent item newer than the last focus
}
