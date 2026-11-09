/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add agent v1 Phase 6 — ORDERING BY AGENT FIT. One order, read by "Who are you querying?" (Logging new query, step 1,
 * within "Not queried yet") and by the Contact list's next-step spotlight: Agent fit high first (unrated last), then the
 * shorter stated response time (not stated last), then the name.
 *
 * ⚠️ NO SCORE AND NO FIT NUMBER: the order is the writer's own stars and the agency's own stated window, nothing derived.
 */
export interface FitOrderable {
  starRating?: number | null;
  responseTimeWeeks?: number | null;
  name?: string | null;
  agency?: string | null;
}

const rating = (a: FitOrderable): number => (typeof a.starRating === "number" && a.starRating >= 1 ? a.starRating : 0);
const weeks = (a: FitOrderable): number | null => (typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null);
const label = (a: FitOrderable): string => ((a.name ?? "").trim() || (a.agency ?? "").trim()).toLowerCase();

/** Agent fit high first (unrated last) → shorter response time (unknown last) → name. A comparator for `sort`. */
export function fitOrder(a: FitOrderable, b: FitOrderable): number {
  const r = rating(b) - rating(a);
  if (r) return r;
  const wa = weeks(a), wb = weeks(b);
  if (wa !== wb) return wa === null ? 1 : wb === null ? -1 : wa - wb;
  return label(a).localeCompare(label(b));
}
