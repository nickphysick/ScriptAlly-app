/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CHART'S THREE BANDS — whose turn it was, over time (dashboard redesign, Phase 4).
 *
 * ⚠️ THREE BANDS, NOT FOUR — AND THE FOURTH HAD NOTHING TO DRAW, WHICH IS NOT WHAT ANYONE EXPECTED.
 * The pack asked for a slate "offer open" band across history, and the reason to cut it looked like
 * the missing derivation: `recomputeQuery` derives exactly ten fields and `offerDate` is not one of
 * them, nor is any R&R date. That is true and it is not the binding reason. The binding reason is
 * that `oneScreen`'s own `TERMINAL` set — the one `dailyLedger`'s `closedAt` reads, and the one
 * `dashboardStats` mirrors — CONTAINS `QueryStatus.OFFER`. An open offer has therefore never been
 * part of the active line this chart draws. A slate band would have been an empty band beneath a
 * line that was already excluding what it stood for.
 *
 * ⚠️ SO THE OFFER CUT EXCLUDES *NOTHING* RELATIVE TO THE LINE, and the honest figure the card owes
 * its reader is zero rather than a count. It is stated here because "we removed a band for lack of
 * data" and "the band had no members under this chart's own definition of active" are different
 * facts, and only the second one is true. Whether an open offer SHOULD be an active query is a
 * separate question about `TERMINAL`, owned by nobody in this pack and deliberately not answered.
 *
 * ⚠️ WHICH LEAVES REVISE & RESUBMIT AS THE ONLY REAL SOURCE OF `undated`. R&R is not terminal, so
 * it IS in the line, and it has no stamp — see the insight below for why it usually places anyway.
 *
 * ⚠️ AND THE OTHER TWO ROUTES WERE REFUSED FOR REASONS, not for effort.
 *   · The global `activities` feed would reconstruct history exactly, and it is a documented
 *     best-effort PROJECTION twin — proven incomplete on deployed dev, where a query with two rows
 *     in its authoritative subcollection had none in the feed. Bands built on it would be silently
 *     wrong for precisely the queries whose projection never landed.
 *   · The per-query `activity` subcollections are authoritative and would mean one listener per
 *     query, fanned out over the whole database, on the dashboard.
 * What is left is the derived stamps on `Query` itself — written BY `recomputeQuery` FROM those
 * subcollections, already loaded, and authoritative by construction.
 *
 * ⚠️ THE KEY INSIGHT, BECAUSE IT IS WHAT MAKES THREE BANDS USABLE RATHER THAN THIN:
 * A TRANSITION WHOSE TWO SIDES ARE THE SAME BAND DOES NOT NEED DATING.
 * `stateFor` maps Revise & Resubmit and both requests to the same "you" band. So a query that went
 * Full Requested → R&R has an undated transition between two pink states, and the whole interval is
 * pink whenever it happened. Only a transition that CROSSES bands has to be dated, and only those
 * are counted as undated. That is why R&R usually lands in pink for free and an offer never does.
 */
import { QueryStatus, type Query } from "../types";
import { stateFor } from "./queryCardFacts";
import { closedAt, sentAt, type LedgerPoint } from "./oneScreen";
/**
 * ⚠️ TWO `parseWhen`s EXIST AND THEY ARE NOT THE SAME FUNCTION — checked, because getting this
 * wrong would put the bands and the line on different data.
 *
 *   · `oneScreen`'s is LOCAL and string-only: it returns `null` for a Firestore `Timestamp`.
 *   · `dashboardStats`' is EXPORTED and handles Timestamps, `Date`s and epoch numbers.
 *
 * MEMBERSHIP — which queries are on the board at all — is decided by `sentAt` and `closedAt`, and
 * both of those are imported from `oneScreen`, so the bands count exactly the queries the total
 * line counts. That invariant is the one that matters and it is not touched here.
 *
 * The RUNGS only decide which band a query the line already counts belongs to, so a richer
 * coercion here cannot desynchronise anything. All five rung fields are declared `string` and
 * written by `recomputeQuery` as ISO, where the two implementations agree exactly; the richer one
 * is used so a field that ever arrives as a Timestamp is placed rather than silently dropped.
 */
import { parseWhen } from "./dashboardStats";

/** The three bands, in stack order from the baseline. Sand · sage · pink. */
export const BAND_KEYS = ["queried", "agent", "you"] as const;
export type BandKey = (typeof BAND_KEYS)[number];

/**
 * ⚠️ THE FILLS COME FROM `STATE_TOKEN` VIA `stateFor`, NEVER FROM A LOCAL TABLE. These are the
 * locked v2 state colours the Query Centre's cards and the To-do ticket's edge already read, and a
 * fourth copy of four hexes is how a page comes to be nearly the right colour.
 */
export const BAND_LABEL: Record<BandKey, string> = {
  queried: "Awaiting first response",
  agent: "Material with the agent",
  you: "your move",
};

/** One period's closing stock, split three ways, with what the record cannot place. */
export interface BandPoint {
  queried: number;
  agent: number;
  you: number;
  /**
   * ⚠️ ACTIVE, AND NOT PLACEABLE. Never folded into a band and never dropped: the total line is the
   * authoritative figure, so a query missing from the bands has to be accounted for somewhere or
   * the two readings of one chart silently disagree.
   */
  undated: number;
}

/** A dated rung and the band it puts the query in. Only these five are derived by `recomputeQuery`. */
const rungs = (q: Query): { t: number; band: BandKey }[] => {
  const out: { t: number; band: BandKey }[] = [];
  const add = (v: unknown, band: BandKey) => {
    const t = parseWhen(v);
    if (t !== null) out.push({ t, band });
  };
  add(q.dateSent, "queried");
  add(q.partialRequestedDate, "you");
  add(q.partialSentDate, "agent");
  add(q.fullRequestedDate, "you");
  add(q.fullSentDate, "agent");
  return out.sort((a, b) => a.t - b.t);
};

/**
 * Where the record can place this query, and from when it cannot.
 *
 * `crossesUndated` is the instant after which the query's band is unknown — `null` when the rungs
 * account for the query's current state and it is placeable throughout.
 */
const placement = (q: Query): { rungs: { t: number; band: BandKey }[]; crossesUndated: number | null } => {
  const rs = rungs(q);
  if (rs.length === 0) return { rungs: rs, crossesUndated: null };
  const last = rs[rs.length - 1];
  const now = stateFor(q.status);
  /* a closed query never appears as active, so its ending is not a crossing this has to date */
  if (now === "closed") return { rungs: rs, crossesUndated: null };
  /* ⚠️ THE COMPARISON IS BAND-TO-BAND, NOT STATUS-TO-STATUS — see the head note. An undated
     transition between two states of the SAME band needs no date, because the interval reads the
     same either way. `offer` is not a band, so an open offer always crosses. */
  return { rungs: rs, crossesUndated: now === (last.band as string) ? null : last.t };
};

/** The three stocks, plus the unplaceable, at one instant. */
export function bandsAt(queries: Query[], atMs: number): BandPoint {
  const out: BandPoint = { queried: 0, agent: 0, you: 0, undated: 0 };
  for (const q of queries) {
    const sent = sentAt(q);
    if (sent === null || sent > atMs) continue;      // not on the board yet
    const closed = closedAt(q);
    if (closed !== null && closed <= atMs) continue; // off the board
    const { rungs: rs, crossesUndated } = placement(q);
    if (crossesUndated !== null && atMs >= crossesUndated) { out.undated++; continue; }
    let band: BandKey | null = null;
    for (const r of rs) { if (r.t <= atMs) band = r.band; }
    if (band === null) { out.undated++; continue; }
    out[band]++;
  }
  return out;
}

/** One `BandPoint` per period, read at the period's CLOSE — the same instant `active` is read at. */
export function bandSeries(view: LedgerPoint[], queries: Query[], now: Date): BandPoint[] {
  const nowMs = now.getTime();
  return view.map((p, i) =>
    /* the final point is clamped to `now`, exactly as `dailyLedger` clamps its last sample, so the
       right-hand end of the bands and the right-hand end of the line are the same moment */
    bandsAt(queries, i === view.length - 1 ? Math.min(p.end.getTime(), nowMs) : p.end.getTime()));
}

/**
 * ⚠️ HOW MANY QUERIES THE BANDS CANNOT PLACE TODAY — the figure the card owes its reader, and the
 * one the run report quotes. It is deliberately a count of ACTIVE queries at `now`, because that is
 * the only point at which "the bands do not add up to the line" is visible on screen.
 */
export function undatedNow(queries: Query[], now: Date): number {
  return bandsAt(queries, now.getTime()).undated;
}

/** Which statuses are un-placeable by construction, for the copy that has to name them. */
export const UNDATED_STATUSES: readonly QueryStatus[] = [QueryStatus.OFFER, QueryStatus.REVISE_RESUBMIT];
