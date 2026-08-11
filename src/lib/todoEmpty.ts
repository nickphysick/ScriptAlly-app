/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoEmpty — the board's empty-state derivations (design ref: design-refs/todo-empty-states.html).
 * Two families: EMPTY-BECAUSE-NEW (the desk has never had anything on it — needs a doorway) and
 * EMPTY-BECAUSE-DONE (the best news the page can deliver — needs a moment, not a grey box).
 * Everything here is a pure view over data that already exists — nothing is stored.
 *
 * Precedence: A (new-desk) beats everything; E (desk-cleared) beats the per-lane clears and is
 * EARNED — it requires a non-empty done-log; otherwise the lanes handle their own empties (B/C/D).
 */
import { Query, QueryStatus } from "../types";

export type DeskState = "new-desk" | "desk-cleared" | null;

export function deskState(a: {
  queryCount: number;
  agentCount: number;
  urgent: number;
  hkItems: number;
  notes: number;
  clearedToday: number;
}): DeskState {
  if (a.queryCount === 0 && a.agentCount === 0) return "new-desk";
  if (a.urgent === 0 && a.hkItems === 0 && a.notes === 0 && a.clearedToday > 0) return "desk-cleared";
  return null;
}

/** Closed = the terminal set (mirrors the Contact List's CLOSED_QUERY_STATUSES). */
const CLOSED: ReadonlySet<string> = new Set([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);

/** Queries still in play — the count state B reassures with. */
export function liveQueryCount(queries: Pick<Query, "status">[]): number {
  return queries.filter((q) => !CLOSED.has(q.status)).length;
}

/** State B's sub-line — real data doing reassurance work; singular handled. */
export function liveQueriesLine(n: number): string {
  if (n === 1) return "Your 1 live query is with its agent — the ball’s in their court.";
  return `All ${n} live queries are with their agents — the ball’s in their court.`;
}

/** State E's strikethrough list — cap the visible items, report the remainder. */
export function clearedListCap<T>(items: T[], cap = 5): { visible: T[]; more: number } {
  return { visible: items.slice(0, cap), more: Math.max(0, items.length - cap) };
}
