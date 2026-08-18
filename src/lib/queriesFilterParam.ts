/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queriesFilterParam — the `?status=` filter the shell's Queries children navigate to
 * (shell-rebuild pack, Phase 3).
 *
 * ⚠️ THE PARAM DID NOT EXIST BEFORE THIS PACK. Queries.tsx read no search params at all, so the
 * nav's four children had nothing to point at — this is a build, not a wiring.
 *
 * ⚠️ NOTHING HERE IS A NEW DERIVATION. Each value maps onto filter state the hub ALREADY models:
 * the whose-turn radio (the CTA engine's `queryBucket`), the status multi-select, and the
 * needs-attention checkboxes. A second definition of "closed" or "awaiting" living in the URL
 * layer is exactly how a nav entry and the page it opens come to disagree.
 */
import { Query, QueryStatus } from "../types";
import { queryBucket } from "./queryAmbient";
import { writerExpectedIso } from "./expectedDate";

/** The query-string key. Named once so the shell, the page and the locks cannot drift. */
export const QUERIES_STATUS_PARAM = "status";

export type QueriesStatusFilter = "all" | "attention" | "awaiting" | "closed";

const VALUES: QueriesStatusFilter[] = ["all", "attention", "awaiting", "closed"];

/** Terminal statuses — the `closed` bucket, stated once. */
export const CLOSED_QUERY_STATUSES: QueryStatus[] = [
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
];

/**
 * ⚠️ AN UNKNOWN VALUE FALLS BACK TO `all`, IT DOES NOT SHOW NOTHING. A typo'd or stale link
 * ("?status=urgent" from an old bookmark) that filtered to an empty list would read as "you have
 * no queries" — the worst possible lie for this page to tell. Showing everything is honest.
 */
export function parseStatusFilter(raw: string | null | undefined): QueriesStatusFilter {
  const v = (raw ?? "").trim().toLowerCase();
  return (VALUES as string[]).includes(v) ? (v as QueriesStatusFilter) : "all";
}

/** The path a nav child points at. `all` carries no param — a bare /queries is the plain hub. */
export function queriesPathFor(f: QueriesStatusFilter): string {
  return f === "all" ? "/queries" : `/queries?${QUERIES_STATUS_PARAM}=${f}`;
}

/**
 * ⚠️ ONE DEFINITION OF "PAST ITS REPLY WINDOW", shared by the filter, the nav count and the
 * top-nav mega panel. It was inline in Queries.tsx; the shell needed the same figure, and the
 * choice was to export it or to write a second copy that would agree until the day it did not.
 *
 * Derived, never stored: still waiting on the agent, with the reply expectation in the past.
 */
/* ⚠️ §2 · READS THE WRITER'S FIELD. It used to test `responseDeadline`, which is retired as a
   written column — so this predicate would have gone permanently false and the "overdue for a
   reply" filter would have matched nothing, silently. It deliberately does NOT resolve the
   agency's window: that needs the agent, which this pure query-only helper does not take, and
   inventing one here would put a second overdue rule beside `taskPrecedence`'s. */
export function isOverdueForReply(q: Pick<Query, "status">, nowMs: number): boolean {
  return (
    queryBucket(q.status as QueryStatus) === "waiting" &&
    !!writerExpectedIso(q as never) &&
    new Date(writerExpectedIso(q as never)!).getTime() < nowMs
  );
}

/**
 * The nav's "Needs attention" figure.
 *
 * ⚠️ THIS IS THE PAST-REPLY-WINDOW SET, NOT THE WRITER'S-TURN SET, and the two are genuinely
 * different questions. The mockup settles it: the work area beneath "Needs attention" reads
 * "3 queries have passed their nudge threshold", and the top-nav mega panel says "Three queries
 * are past their reply window" — one figure, quoted in both shells. The writer's-turn split
 * (`queryBucket === "move"`) is what the hub's own "Your move" control draws, and it stays there.
 */
export function attentionCount(
  queries: Pick<Query, "status">[],
  nowMs: number,
): number {
  return queries.filter((q) => isOverdueForReply(q, nowMs)).length;
}

/** The hub's filter state for a given param value — the page applies it, it derives nothing. */
export interface QueriesFilterState {
  turn: "all" | "move" | "wait";
  statusSel: QueryStatus[];
  needsOverdue: boolean;
}

export function filterStateFor(f: QueriesStatusFilter): QueriesFilterState {
  switch (f) {
    case "attention":
      return { turn: "all", statusSel: [], needsOverdue: true };
    case "awaiting":
      return { turn: "wait", statusSel: [], needsOverdue: false };
    case "closed":
      return { turn: "all", statusSel: CLOSED_QUERY_STATUSES, needsOverdue: false };
    default:
      return { turn: "all", statusSel: [], needsOverdue: false };
  }
}
