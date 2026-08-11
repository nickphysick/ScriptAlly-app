/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The plateband's three figures, derived at read time. Reference:
 * design-refs/manuscripts-plate.html — the `.statstrip` in the sage plateband.
 *
 * ⚠️ DERIVED, NEVER STORED. Nothing here reads a counter and nothing writes one. Every figure is
 * computed from the manuscript's own queries on each render, which is why a query recorded
 * anywhere in the app moves these without a second write.
 *
 * ⚠️ AND THE THREE DO NOT AGREE ABOUT ABSENCE, DELIBERATELY.
 * "No queries sent" is honestly stated as `0` — zero is the true count. But "last activity" has no
 * zero: there is no date, so it reads `—`. Rendering `0` there would assert an event that did not
 * happen. The types carry that split (`number` vs `string | null`) so a caller cannot collapse it
 * back by accident.
 */
import { Query } from "../types";
import { isResponse } from "./packageMetrics";
import { lastActivityMs } from "./manuscriptPage";

export interface PlateStats {
  /** Queries sent for this manuscript. Zero is a true count and is stated as `0`. */
  queriesSent: number;
  /** Responses received. Counted through the canonical predicate — never re-derived here. */
  responses: number;
  /** Most recent activity, already formatted (`8 Aug`). `null` when nothing has happened. */
  lastActivity: string | null;
}

/**
 * `8 Aug` — the ref's format. Day and short month, no year: the strip is a glance, not a record,
 * and the full date lives on the query itself.
 */
export function formatPlateDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The strip's three figures for one manuscript's queries.
 *
 * ⚠️ `responses` COUNTS THROUGH `isResponse`, the canonical predicate from packageMetrics — the
 * same one the package maths uses. A local "has the agent replied" test here would eventually
 * disagree with the rest of the app about what a response is, and the disagreement would show up
 * as two different numbers for one fact on two pages.
 */
export function plateStats(queries: Query[]): PlateStats {
  const times = queries.map(lastActivityMs).filter((t): t is number => t !== null);
  return {
    queriesSent: queries.length,
    responses: queries.filter(isResponse).length,
    lastActivity: times.length ? formatPlateDate(Math.max(...times)) : null,
  };
}

/** The three strip cells, in the ref's order, with absence already resolved to its display form. */
export function plateStatCells(stats: PlateStats): { key: string; value: string }[] {
  return [
    { key: "Queries", value: String(stats.queriesSent) },
    { key: "Responses", value: String(stats.responses) },
    { key: "Last activity", value: stats.lastActivity ?? "—" },
  ];
}
