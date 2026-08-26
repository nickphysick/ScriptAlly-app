/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE JOURNEY — two tracks over one set of queries ══════════════════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-journey`.
 *
 * ⚠️ THEY ANSWER DIFFERENT QUESTIONS AND MUST DISAGREE ON THE SAME DATA.
 *   `standingTrack` — where each query stands TODAY. Seven stations plus closed, and every query is
 *     counted once, at its current point. Not a funnel: a full that is out does not also count at
 *     Queried.
 *   `furthestTrack` — the furthest point each query EVER reached, open or closed. Six rungs, and
 *     every query is counted once here too.
 * A query that drew a full request and was then declined stands at CLOSED and reached FULL
 * REQUESTED. A derivation that made the two agree would quietly delete every request the writer has
 * ever had the moment it closed.
 *
 * ⚠️ BOTH SUMS ARE LOCKED AS PROPERTIES, NOT AS FIXTURES (`manuscriptJourney.test.ts`), over a
 * spread of status mixtures including every status twice. Both were proved red first — against a
 * cumulative standing track (31 against 10) and a furthest track that read the current status
 * (1 against 10), which are the two natural mistakes.
 *
 * ⚠️ NOTHING IS STORED, CACHED OR WRITTEN. `recomputeQuery` remains the single writer of derived
 * query state and this module never goes near it.
 *
 * ⚠️ NO ORDERING BY COUNT, ANYWHERE. Both tracks keep the pipeline's own order. Sorting rows by how
 * many queries reached each rung would be a ranking, and the app reports rather than appraises.
 */
import { Query, QueryStatus, Activity } from "../types";
import { buildRows } from "./analytics";
import { CLOSED_STATUSES } from "./manuscriptPage";

/**
 * The seven stations on the rail, in pipeline order. Closed is NOT among them — it sits off the
 * rail behind a hairline, because a closed query is not further along, it is elsewhere.
 */
export const STANDING_STATIONS: readonly QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
];

export interface Station {
  status: QueryStatus;
  count: number;
}

export interface StandingTrack {
  stations: Station[];
  closed: number;
  /**
   * ⚠️ A STATUS THIS APP DOES NOT RECOGNISE GETS ITS OWN COUNT RATHER THAN BEING FOLDED INTO
   * CLOSED. "I do not know where this stands" is not "this is over", and folding the two would keep
   * the sum holding while the page stated something untrue — the same law the versions panel
   * applies to a sample with no recorded version. Normally nought; the pane states it only when it
   * is not, because a row that is always there saying nothing teaches nothing.
   */
  unrecognised: number;
  /** Index into `STANDING_STATIONS` of the furthest OCCUPIED station, or null when none is. */
  furthestIndex: number | null;
}

const KNOWN = new Set<string>([...STANDING_STATIONS, ...CLOSED_STATUSES]);

/**
 * Where every query stands today.
 *
 * ⚠️ THE SUM HOLDS BY CONSTRUCTION, not by arithmetic that happens to work out: the ten pipeline
 * statuses partition the set, each query is tested against exactly one bucket, and anything the app
 * cannot place lands in `unrecognised` rather than being dropped. A query silently belonging to no
 * bucket is how a total comes to disagree with its own rows.
 */
export const standingTrack = (queries: readonly Query[]): StandingTrack => {
  const stations = STANDING_STATIONS.map((status) => ({
    status,
    count: queries.filter((q) => q.status === status).length,
  }));
  const lastOccupied = stations.reduce((acc, s, i) => (s.count > 0 ? i : acc), -1);
  return {
    stations,
    closed: queries.filter((q) => CLOSED_STATUSES.includes(q.status)).length,
    unrecognised: queries.filter((q) => !KNOWN.has(q.status)).length,
    /* ⚠️ THE RAIL FILLS TO WHERE SOMETHING IS, and a closed query cannot fill it — it is off the
       rail. Null when nothing is on the rail at all, so the caller draws no fill rather than a
       zero-width one, which reads as a rendering fault. */
    furthestIndex: lastOccupied === -1 ? null : lastOccupied,
  };
};

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   FURTHEST REACHED
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

export type FurthestKey = "queried" | "responded" | "partial" | "full" | "rr" | "offer";

/**
 * The six rungs, in ladder order — never sorted by count.
 *
 * ⚠️ THE LABELS STATE A POSITION AND NOTHING ELSE. No adverb, no comparison, no "only". The rung a
 * query reached is a fact; how far that is, is the reader's to judge.
 */
export const FURTHEST_RUNGS: readonly { key: FurthestKey; label: string }[] = [
  { key: "queried", label: "Queried, no response yet" },
  { key: "responded", label: "Agent responded, no request" },
  { key: "partial", label: "Partial requested" },
  { key: "full", label: "Full requested" },
  { key: "rr", label: "R&R" },
  { key: "offer", label: "Offer" },
];

export interface FurthestRow {
  key: FurthestKey;
  label: string;
  count: number;
}

/**
 * The furthest rung one query ever reached.
 *
 * ⚠️ IT READS HISTORY, NOT THE CURRENT STATUS, and that is the difference between a true figure and
 * a flattering one — the fault `analytics.ts` records in its own funnel note. The predicates come
 * from `buildRows`, IMPORTED rather than restated, so this page and Analytics cannot come to
 * disagree about what "reached" means. That function walks the activity log for the earliest dated
 * rung per (query, status) and folds in the current status where the log is thin, which is the
 * behaviour an imported query with no history depends on.
 *
 * ⚠️ R&R SITS ABOVE FULL REQUESTED, following the same reading: an R&R means the book was read. It
 * is tested before `reachedFull` because `reachedFull` already includes it, so testing the other
 * way round would put every R&R in the full rung and leave R&R permanently at nought.
 */
const furthestOf = (row: {
  status: QueryStatus;
  stageMs: Partial<Record<QueryStatus, number>>;
  hasResponded: boolean;
  reachedRequest: boolean;
  reachedFull: boolean;
  reachedOffer: boolean;
}): FurthestKey => {
  if (row.reachedOffer) return "offer";
  if (row.stageMs[QueryStatus.REVISE_RESUBMIT] !== undefined || row.status === QueryStatus.REVISE_RESUBMIT) return "rr";
  if (row.reachedFull) return "full";
  if (row.reachedRequest) return "partial";
  /* ⚠️ A REJECTION IS A RESPONSE. `AGENT_RESPONSE_STATUSES` carries it, so a query that was
     declined without a request reads "Agent responded, no request" rather than sitting at Queried
     as though nobody had ever written back. */
  if (row.hasResponded) return "responded";
  return "queried";
};

/**
 * How far each query ever got.
 *
 * ⚠️ EVERY RUNG IS LISTED, INCLUDING ONES NOTHING REACHED. A row that vanishes says nothing at all;
 * `0` against Offer is the state of the submission and is the reader's to see.
 */
export const furthestTrack = (
  queries: readonly Query[],
  activities: readonly Activity[],
): FurthestRow[] => {
  /* `agents` is only read for display names, which nothing here uses; `nowMs` only feeds `daysOut`.
     Passing the real ones would change no figure below. */
  const rows = buildRows([...queries], [...activities], [], 0);
  const tally = new Map<FurthestKey, number>(FURTHEST_RUNGS.map((r) => [r.key, 0]));
  for (const r of rows) tally.set(furthestOf(r), (tally.get(furthestOf(r)) ?? 0) + 1);
  return FURTHEST_RUNGS.map((r) => ({ key: r.key, label: r.label, count: tally.get(r.key) ?? 0 }));
};

/**
 * The furthest rung anything reached, for the track's footer — or null when nothing has.
 *
 * ⚠️ IT IS DERIVED FROM THE ROWS RATHER THAN RE-DERIVED FROM THE QUERIES. The footer and the table
 * beneath it are then the same reading by construction, which is the only way two figures on one
 * card cannot come apart.
 */
export const furthestReached = (rows: readonly FurthestRow[]): string | null => {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].count > 0) return rows[i].label;
  return null;
};

/** The Journey header's meta — `26 queries · furthest reached, R&R`. */
export const journeyMeta = (queriesSent: number, furthest: string | null): string => {
  const n = `${queriesSent} quer${queriesSent === 1 ? "y" : "ies"}`;
  return furthest ? `${n} · furthest reached, ${furthest}` : n;
};
