/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "It never happened" — what goes with a deleted timeline entry (fix-delete-entry, option 1: clear only).
 *
 * Deleting an entry removes it from the query's own log, and `recomputeQuery` re-derives its ten fields from
 * what is left. Two things were left behind, and this module says what they are:
 *
 *   1. THE FEED'S ROW. A response written by `recordQueryResponse` has a log entry and a feed row under two
 *      different ids, so deleting `activities/{logEntryId}` deleted nothing. `feedRowsFor` finds the row:
 *      by the log entry's id written onto it (`logEntryId`, from this fix on), by a shared id (nudges, sends,
 *      seeds), or — for rows written before the fix — by the query, the entry's type and its place in time.
 *
 *   2. THE JOURNEY'S FIELDS. A journey writes its answers straight onto the query (a send-by date, an offer
 *      deadline, a close reason). They are not in the log, so recompute cannot re-derive them.
 *      `journeyFieldsToClear` names every such field whose OWNING ENTRY is no longer in the log.
 *
 * ⚠️ CLEAR ONLY. Where the deleted entry OVERWROTE or CLEARED an earlier value (a second request's send-by date
 *    over the first's; a planned nudge a response cancelled), the earlier value is not put back: nothing
 *    recorded it. After a delete such a field is cleared — never left holding a third value. Restoring it is
 *    option 2 (reports/fix-delete-entry/OPTION-2.md), which needs a rules change.
 *
 * Pure: no Firebase. The delete path (Queries.tsx `confirmEntryDelete`) reads, asks this, and writes one batch.
 */
import { QueryStatus } from "../types";

const S = QueryStatus;
const OWED: ReadonlySet<string> = new Set([S.PARTIAL_REQUESTED, S.FULL_REQUESTED, S.REVISE_RESUBMIT]);
const REQUEST: ReadonlySet<string> = OWED;
const SEND: ReadonlySet<string> = new Set([S.PARTIAL_SENT, S.FULL_SENT, S.RESUBMITTED]);
const CLOSED: ReadonlySet<string> = new Set([S.REJECTED, S.NO_RESPONSE, S.WITHDRAWN]);
const OFFER: ReadonlySet<string> = new Set([S.OFFER, S.SIGNED]);
/** The nested nudge entry's `type` (lib/logNudge `NUDGE_NESTED_TYPE`); it carries no status. */
export const NUDGE_TYPE = "Nudge sent";

/** One entry of the query's own log, as much of it as this module reads. */
export interface LogEntry {
  id: string;
  /** `resultingStatus ?? type` — a status for a status-bearing entry, "Nudge sent" for a nudge */
  kind: string;
  eventKey?: string;
  timeMs: number;
}
/** One feed row for the same query. */
export interface FeedRow {
  id: string;
  logEntryId?: string;
  resultingStatus?: string;
  activityType?: string;
  eventKey?: string;
  timeMs: number;
}

/* ── the journeys' fields, by the entry that owns them ── */
/** Owned by a query the writer owes material on: gone unless the status is a request. */
export const OWED_FIELDS = ["expectedSendDate", "sendReminderDate"] as const;
/** What the agent asked for: gone unless a request is still in the log. */
export const REQUEST_FIELDS = ["materialsRequestedType", "materialsRequestedQuantity", "requestSynopsis", "requestFrom", "requestFromUnit", "rrNotes"] as const;
/** The offer's own: gone unless an offer (or the signing) is still in the log. */
export const OFFER_FIELDS = ["offerDate", "offerResponseDeadline", "offerNotes", "offerCallOn"] as const;
/** How it closed: gone unless the query is closed. */
export const CLOSE_FIELDS = ["closingReason", "closingNotes", "rejectionFeedbackType", "rejectionFeedbackText", "rejectionReflection", "rejectionLesson", "rejectedFromStatus", "withdrawTold", "agentRecheckOn"] as const;
/** The last nudge, and the close it planned: gone unless a nudge is still in the log. */
export const NUDGE_FIELDS = ["lastNudgeSentDate", "closePlan"] as const;
/**
 * The wait a send began — the reply the writer expects, the nudge planned for it, the send's label. Every send
 * writes them, so they describe the LATEST send: gone when that send is the entry deleted.
 */
export const WAIT_FIELDS = ["writerExpectedDate", "writerExpectedSetAt", "nudgeDate", "lastSentLabel"] as const;

export const JOURNEY_FIELDS: readonly string[] = [...OWED_FIELDS, ...REQUEST_FIELDS, ...OFFER_FIELDS, ...CLOSE_FIELDS, ...NUDGE_FIELDS, ...WAIT_FIELDS];

const latestOf = (log: readonly LogEntry[], set: ReadonlySet<string>): LogEntry | null =>
  log.filter((e) => set.has(e.kind)).sort((a, b) => b.timeMs - a.timeMs || (a.id < b.id ? 1 : -1))[0] ?? null;

/**
 * The journey fields to clear after `deleted` leave `before`.
 *
 * @param before        the query's log as it stood, the deleted entries included
 * @param deletedIds    the entries going
 * @param statusAfter   the status `recomputeQuery` derives from what is left
 * @param present       the fields the query document carries now (only those are worth a write)
 */
export function journeyFieldsToClear(before: readonly LogEntry[], deletedIds: readonly string[], statusAfter: string, present: ReadonlySet<string>): string[] {
  const gone = new Set(deletedIds);
  const after = before.filter((e) => !gone.has(e.id));
  const has = (set: ReadonlySet<string>) => after.some((e) => set.has(e.kind));
  const out: string[] = [];
  const clear = (fields: readonly string[]) => { for (const f of fields) if (present.has(f) && !out.includes(f)) out.push(f); };

  if (!OWED.has(statusAfter)) clear(OWED_FIELDS);
  if (!has(REQUEST)) clear(REQUEST_FIELDS);
  if (!has(OFFER)) clear(OFFER_FIELDS);
  if (!CLOSED.has(statusAfter)) clear(CLOSE_FIELDS);
  if (!after.some((e) => e.kind === NUDGE_TYPE)) clear(NUDGE_FIELDS);
  /* the wait is the LATEST send's: it goes when that send is among the deleted */
  const lastSend = latestOf(before, SEND);
  if (lastSend && gone.has(lastSend.id)) clear(WAIT_FIELDS);
  return out;
}

/** True when deleting `deletedIds` removes the query's last offer — its marks on OTHER queries then go too. */
export function offerGone(before: readonly LogEntry[], deletedIds: readonly string[]): boolean {
  const gone = new Set(deletedIds);
  return before.some((e) => OFFER.has(e.kind) && gone.has(e.id)) && !before.some((e) => OFFER.has(e.kind) && !gone.has(e.id));
}

/* ── the feed's rows ── */
const feedKind = (r: FeedRow): string => (r.activityType === "Nudge Sent" ? NUDGE_TYPE : r.resultingStatus ?? "");

export interface FeedMatch {
  /** feed row ids to delete */
  rows: string[];
  /** how each deleted entry's row was found */
  how: Record<string, "logEntryId" | "sameId" | "typeAndTime" | "none">;
}

/**
 * The feed rows that belong to the deleted entries.
 *
 * 1. `logEntryId` on the row (every row written from this fix on).
 * 2. The row's own id is the entry's id (nudges, sends, offer calls, seeds, imports).
 * 3. For an older response row: the same query (the caller passes only this query's rows), the same TYPE (and
 *    event key where both state one), and the same PLACE IN TIME — the log's entries of that type and the feed's
 *    unclaimed rows of that type are each put in time order and paired by rank. That is only trusted when the
 *    two lists are the same length; otherwise the row is left and reported (`none`), because a wrong guess would
 *    delete another entry's row.
 *
 * ⚠️ RANK, NOT THE NEAREST TIMESTAMP. A response's log entry is dated when it HAPPENED (the writer can back-date
 *    it) and its feed row when it was RECORDED, so the two times can be weeks apart; their order is what agrees.
 */
export function feedRowsFor(before: readonly LogEntry[], deletedIds: readonly string[], feed: readonly FeedRow[]): FeedMatch {
  const how: FeedMatch["how"] = {};
  const rows: string[] = [];
  const claimed = new Set<string>();
  /* every log entry claims its own row by id first, so rule 3 only pairs what is left over */
  const direct = new Map<string, string>();
  for (const e of before) {
    const byField = feed.find((r) => r.logEntryId === e.id);
    const byId = byField ? null : feed.find((r) => r.id === e.id);
    const row = byField ?? byId;
    if (row) { direct.set(e.id, row.id); claimed.add(row.id); }
  }
  for (const id of deletedIds) {
    const e = before.find((x) => x.id === id);
    if (!e) { how[id] = "none"; continue; }
    const d = direct.get(id);
    if (d) { rows.push(d); how[id] = feed.some((r) => r.logEntryId === id) ? "logEntryId" : "sameId"; continue; }
    const same = (r: FeedRow) => feedKind(r) === e.kind && (!r.eventKey || !e.eventKey || r.eventKey === e.eventKey);
    const logs = before.filter((x) => x.kind === e.kind && !direct.has(x.id)).sort((a, b) => a.timeMs - b.timeMs || (a.id < b.id ? -1 : 1));
    const cands = feed.filter((r) => !claimed.has(r.id) && same(r)).sort((a, b) => a.timeMs - b.timeMs || (a.id < b.id ? -1 : 1));
    const at = logs.findIndex((x) => x.id === id);
    if (logs.length === cands.length && at >= 0) { rows.push(cands[at].id); how[id] = "typeAndTime"; }
    else how[id] = "none";
  }
  return { rows: [...new Set(rows)], how };
}
