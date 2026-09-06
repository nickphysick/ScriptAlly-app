/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST ROW'S TWO DERIVATIONS (views pass 4, §2). Both are pure, and both exist so the list
 * states nothing of its own: the verbs are the drawer's verbs, and the events are the timeline's
 * events.
 */
import { QueryStatus, ActivityType, type Activity } from "../types";
import type { Turn } from "./queryCardFacts";

/* ── the verbs ───────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ ONE PREDICATE, TWO READERS — the drawer's verb row and the list's action grid. It was split
 * across two files (the primary's label in `Queries.tsx`, the Nudge and Mark-closed gates inside
 * `QueryPanel`), which is exactly the shape that lets two surfaces come to disagree about what a
 * closed query offers. The brief says "same predicate — import it, don't restate it"; this is the
 * thing to import.
 */
export type PrimaryKind = "respond" | "marksent" | "decision" | "reopen";

export interface QueryVerbs {
  primary: { label: string; kind: PrimaryKind; enabled: boolean };
  /** ⚠️ AGENT-SIDE ONLY — there is nobody to chase about a parcel you have not sent. */
  nudge: boolean;
  /** open rows only; a closed query has nothing left to close */
  markClosed: boolean;
}

export function queryVerbs(turn: Turn): QueryVerbs {
  if (turn === "closed") {
    /* ⚠️ `Reopen` IS DRAWN AND DISABLED, and that is v14's call rather than a stub sneaking in: the
       action grid holds a fixed slot per row, so a closed row that offered nothing would leave a
       hole where every other row has its primary. A greyed verb states that reopening is a thing
       that will exist; an empty slot states that this row has no primary at all, which is false. */
    return { primary: { label: "Reopen", kind: "reopen", enabled: false }, nudge: false, markClosed: false };
  }
  const label = turn === "you" ? "Mark sent" : turn === "offer" ? "Record decision" : "Record response";
  const kind: PrimaryKind = turn === "you" ? "marksent" : turn === "offer" ? "decision" : "respond";
  return {
    primary: { label, kind, enabled: true },
    nudge: turn === "sand" || turn === "agent",
    markClosed: true,
  };
}

/* ── since then ──────────────────────────────────────────────────────────────────────────────── */

export type SinceKind = "requested" | "sent" | "nudged" | "response" | "closed";

export interface SinceEvent {
  id: string;
  kind: SinceKind;
  /** what the tip says — the event's own name, never a re-worded one */
  label: string;
  atMs: number;
}

const CLOSED_STATUSES = new Set<string>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);
const REQUESTED_STATUSES = new Set<string>([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT,
]);
const SENT_STATUSES = new Set<string>([QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);

/**
 * Every recorded activity AFTER the send, in date order, classified into the five marks the row
 * draws.
 *
 * ⚠️ IT READS THE SAME ROWS THE DRAWER'S TIMELINE RENDERS — the global feed, filtered to this
 * query — rather than deriving a second history from the query's own fields. Two histories of one
 * query is the fault this app spends most of its locks preventing; the row is a summary of the
 * timeline, and a summary that disagrees with the thing it summarises is worse than no summary.
 *
 * ⚠️ AND THE SEND ITSELF IS EXCLUDED, because the Sent leaf beside it already states it. What is
 * left is precisely "since then".
 */
export function sinceThen(activities: readonly Activity[], queryId: string, sentMs: number | null): SinceEvent[] {
  const out: SinceEvent[] = [];
  for (const a of activities) {
    if (a.queryId !== queryId) continue;
    const atMs = a.date ? new Date(a.date).getTime() : NaN;
    if (Number.isNaN(atMs)) continue;
    /* the send is the leaf's, not the row's */
    if (a.activityType === ActivityType.QUERY_SENT) continue;
    if (sentMs != null && atMs < sentMs) continue;

    let kind: SinceKind | null = null;
    let label = "";
    if (a.activityType === ActivityType.NUDGE_SENT) { kind = "nudged"; label = "Nudged"; }
    else if (a.activityType === ActivityType.MATERIALS_SENT) { kind = "sent"; label = "Materials sent"; }
    else if (a.activityType === ActivityType.OFFER_ACCEPTED) { kind = "response"; label = "Offer accepted"; }
    else if (a.activityType === ActivityType.OFFER_DECLINED) { kind = "closed"; label = "Offer declined"; }
    else if (a.activityType === ActivityType.STATUS_CHANGED) {
      const st = (a as unknown as { resultingStatus?: string }).resultingStatus ?? "";
      if (CLOSED_STATUSES.has(st)) { kind = "closed"; label = st; }
      else if (REQUESTED_STATUSES.has(st)) { kind = "requested"; label = st; }
      else if (SENT_STATUSES.has(st)) { kind = "sent"; label = st; }
      else if (st) { kind = "response"; label = st; }
    }
    if (!kind) continue;
    out.push({ id: a.id, kind, label, atMs });
  }
  return out.sort((x, y) => x.atMs - y.atMs);
}
