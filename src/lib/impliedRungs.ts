/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Implied-rung shaping — the PURE half of import history seeding, lifted out of smartImportCommit so
 * the review model can build the exact rung set the commit/derivation pipeline will, without pulling
 * Firebase into the pure model. `impliedRungs` turns a query's final status + spine + timeline into
 * the activity rungs that status implies (queried → … → final); `assignTimes` gives each rung an
 * ordering-key time so derivation sorts them correctly. No Firestore, no side effects.
 *
 * smartImportCommit re-exports `impliedRungs`/`assignTimes` for back-compat (its tests + emailImport
 * import them from there).
 */
import { QueryStatus } from "../types";
import { ParsedQuery } from "../types/smartImport";

// The linear pipeline ladder. Terminal statuses (Offer/Rejected/Withdrawn/No Response) and R&R
// aren't on it — they're appended as the final rung.
const LADDER: QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
];
// Off-ladder final statuses, in a stable display order after the ladder.
const OFF_LADDER: QueryStatus[] = [
  QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
];

/** A seeded activity rung. `note`, when present, is the harvested per-event note that rides this rung
 *  (the duplicate-collapse carrier); absent → commit writes the generated "{status} (imported)" label. */
export interface SeedRung { status: QueryStatus; date: string | null; note?: string; }

/**
 * The activity rungs a query's final status implies, in pipeline order — so the SHAPE of the
 * history is correct (a "Partial Sent" query shows queried → partial-requested → partial-sent).
 *
 * Dates come from the query's SPINE (sentDate → the queried rung) and its `timeline` (each note
 * event → its matching rung, carrying its parsed date). Every other implied rung is provisional
 * (date null, never fabricated). A "sent" stage implies its matching "requested"; R&R implies a
 * full was read. Seeding a timeline event (e.g. a full-requested) as a real rung is what lets
 * recomputeQuery set hasAgentResponded correctly — the "Responses Received" under-count fix.
 *
 * A timeline event's optional `note` rides onto its rung (the duplicate-collapse carrier); rungs
 * with no carried note are left noteless and commit applies the generated label.
 */
export function impliedRungs(q: ParsedQuery): SeedRung[] {
  const final = q.status!;
  const include = new Set<QueryStatus>([QueryStatus.QUERIED]);

  // Dates we genuinely know: the spine seeds the queried rung; each timeline event seeds its own rung.
  const dateFor = new Map<QueryStatus, string | null>();
  const noteFor = new Map<QueryStatus, string>();
  dateFor.set(QueryStatus.QUERIED, q.sentDate ?? null);
  for (const ev of q.timeline ?? []) {
    if (!ev?.type) continue;
    include.add(ev.type);
    if (ev.date) dateFor.set(ev.type, ev.date); // first dated wins per status
    if (ev.note) noteFor.set(ev.type, ev.note); // carried note rides its own rung
  }

  // The minimal implied path for the final status.
  const finalIdx = LADDER.indexOf(final);
  if (finalIdx >= 0) {
    include.add(final);
    if (final === QueryStatus.PARTIAL_SENT) include.add(QueryStatus.PARTIAL_REQUESTED);
    if (final === QueryStatus.FULL_SENT) include.add(QueryStatus.FULL_REQUESTED);
  } else if (final === QueryStatus.REVISE_RESUBMIT) {
    include.add(QueryStatus.FULL_REQUESTED);
    include.add(QueryStatus.FULL_SENT);
  }
  // Sent implies requested (an agent action — what "Responses received" derives from).
  if (include.has(QueryStatus.PARTIAL_SENT)) include.add(QueryStatus.PARTIAL_REQUESTED);
  if (include.has(QueryStatus.FULL_SENT)) include.add(QueryStatus.FULL_REQUESTED);

  const rung = (s: QueryStatus): SeedRung => ({ status: s, date: dateFor.get(s) ?? null, ...(noteFor.has(s) ? { note: noteFor.get(s) } : {}) });
  const rungs: SeedRung[] = [];
  for (const s of LADDER) if (include.has(s)) rungs.push(rung(s));
  // Off-ladder rungs (the final status and/or any note event beyond the ladder), in stable order.
  for (const s of OFF_LADDER) if (include.has(s) || s === final) {
    if (!rungs.some((r) => r.status === s)) rungs.push(rung(s));
  }
  return rungs;
}

export interface TimedRung extends SeedRung { ms: number; provisional: boolean; }

/**
 * Assign each rung an ordering-key time so derivation sorts them in correct pipeline order.
 * Dated rungs keep their real time (clamped monotonic). A provisional (date-unknown) rung is
 * sequenced relative to the nearest known date — just after a known rung below it, or just before
 * the first known rung above it — and never carries a real date (dateProvisional:true). A query
 * with NO known dates gets a synthetic monotonic key from importBaseMs + ladder index. These keys
 * are internal only; nothing surfaces them (the UI renders "date needed").
 */
export function assignTimes(rungs: SeedRung[], importBaseMs: number): TimedRung[] {
  const out: TimedRung[] = rungs.map((r) => ({ ...r, ms: NaN, provisional: r.date == null }));
  const firstDated = rungs.findIndex((r) => r.date != null);
  if (firstDated === -1) {
    out.forEach((r, i) => { r.ms = importBaseMs + i; });
    return out;
  }
  // Forward: dated rungs anchor; provisional rungs after an anchor sit 1ms later.
  let cursor = -Infinity;
  for (let i = 0; i < out.length; i++) {
    if (rungs[i].date != null) {
      const d = new Date(rungs[i].date as string).getTime();
      out[i].ms = cursor === -Infinity ? d : Math.max(d, cursor + 1);
      cursor = out[i].ms;
    } else if (cursor !== -Infinity) {
      out[i].ms = cursor + 1;
      cursor = out[i].ms;
    }
  }
  // Backward: leading provisional rungs (before the first dated) sit just before it, in order.
  for (let i = firstDated - 1; i >= 0; i--) {
    out[i].ms = out[i + 1].ms - 1;
  }
  return out;
}
