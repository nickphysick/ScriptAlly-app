/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashWeekMix — what the active queries WERE, at the close of a past week (v33, 18 Sep).
 *
 * The chart's week popup states a headline ("14 active queries") and breaks it down by stage. The
 * headline is the ledger's `active` stock at that point; this module says which stage each of those
 * queries stood at, by replaying its own dated log up to that moment.
 *
 * ⚠️ THE ROWS SUM TO THE HEADLINE, BY CONSTRUCTION. `activeAt` is the ledger's own question — sent on
 * or before the moment, and not closed on or before it, read through `sentAt` and `closedAt` — so the
 * set partitioned here is the set the line counted. Every query in it lands in exactly one place: a
 * stage row, or `undated`.
 *
 * ⚠️ `undated` IS A ROW, NEVER FOLDED INTO A STAGE. An imported query can carry rungs whose dates are
 * ordering keys rather than dates (`dateProvisional`): the app knows the query reached "Partial
 * requested" and does not know WHEN. For the weeks in between, its stage is not knowable, and a guess
 * would be a plausible number measuring something else. The same row takes a query whose replay
 * disagrees with the ledger about whether it was live (closed and later reopened): the line counted
 * it, so the breakdown must, and it does not claim a stage for it.
 *
 * ⚠️ TODAY IS READ OFF THE QUERY, NOT REPLAYED. At or after the start of the current day the stage is
 * `q.status` — `recomputeQuery`'s own output — so the last point on the chart agrees with every other
 * surface about where each query stands now, provisional rungs or not.
 */
import { Activity, Query, QueryStatus } from "../types";
import { closedAt, sentAt } from "./oneScreen";
import { DerivableActivity, orderedStatusBearing } from "./queryDerivation";

/** The stages a live query can stand at, in pipeline order — the popup's rows, top to bottom. */
export const MIX_STAGES: readonly QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
];

export interface WeekMixRow { status: QueryStatus; count: number }
export interface WeekMix {
  /** the headline — every query that was live at the moment */
  total: number;
  /** one row per stage that had any, in `MIX_STAGES` order; zero rows are omitted */
  rows: WeekMixRow[];
  /** live at the moment, stage not knowable — see the file's header */
  undated: number;
}

export const UNDATED_LABEL = "Stage not dated";

/** The ledger's question, asked of one query at one moment. */
export const activeAt = (q: Query, atMs: number): boolean => {
  const s = sentAt(q);
  if (s === null || s > atMs) return false;
  const c = closedAt(q);
  return c === null || Math.max(c, s) > atMs;
};

export type ActivityIndex = Map<string, DerivableActivity[]>;

/** Group the log by query once; every week asked about reads the same index. */
export const indexActivities = (activities: readonly Activity[]): ActivityIndex => {
  const out: ActivityIndex = new Map();
  for (const a of activities) {
    if (!a.queryId) continue;
    const list = out.get(a.queryId);
    if (list) list.push(a as DerivableActivity); else out.set(a.queryId, [a as DerivableActivity]);
  }
  return out;
};

/**
 * The stage one query stood at, at `atMs` — or null where that is not knowable.
 *
 * The rungs are in `byEventOrder`. The last DATED rung at or before the moment is the base (with none,
 * the base is Queried: the send itself is dated, or the query would not be on the board). If the next
 * rung in order is provisional and names a different stage, the query may or may not have moved by
 * then — null. A provisional rung that repeats the base changes nothing and is walked past.
 */
export const stageAt = (q: Query, log: readonly DerivableActivity[] | undefined, atMs: number, todayStartMs: number): QueryStatus | null => {
  if (atMs >= todayStartMs) return MIX_STAGES.includes(q.status) ? q.status : null;
  const rungs = orderedStatusBearing([...(log ?? [])]);
  let k = -1;
  for (let i = 0; i < rungs.length; i += 1) if (!rungs[i].provisional && rungs[i].time <= atMs) k = i;
  const base = k >= 0 ? rungs[k].status : QueryStatus.QUERIED;
  for (let j = k + 1; j < rungs.length && rungs[j].provisional; j += 1) {
    if (rungs[j].status !== base) return null;
  }
  return MIX_STAGES.includes(base) ? base : null;
};

export const weekMix = (
  queries: readonly Query[],
  index: ActivityIndex,
  atMs: number,
  now: Date,
): WeekMix => {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const counts = new Map<QueryStatus, number>();
  let total = 0, undated = 0;
  for (const q of queries) {
    if (!activeAt(q, atMs)) continue;
    total += 1;
    const s = stageAt(q, index.get(q.id), atMs, todayStart);
    if (s === null) undated += 1; else counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const rows = MIX_STAGES.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => ({ status: s, count: counts.get(s) as number }));
  return { total, rows, undated };
};

/** "Partial requested" — the enum's own words in sentence case, so the popup and the pills agree. */
export const stageLabel = (s: QueryStatus): string =>
  s === QueryStatus.REVISE_RESUBMIT ? "Revise & resubmit" : s.charAt(0) + s.slice(1).toLowerCase();
