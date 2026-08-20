/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one place this page knows how to open something in the Query Centre.
 *
 * ⚠️ ONE ADAPTER, OWNED BY THIS PAGE. Every figure on Analytics is a door, and eight components
 * each building their own path is eight places to get the destination wrong. This module maps a
 * TARGET — a thing the reader clicked — to a route, and nothing else on the page constructs one.
 *
 * ⚠️ IT EDITS NOTHING IN THE QUERY CENTRE, and that is a hard boundary rather than a preference.
 * It reads `lib/queriesFilterParam`, which is a pure module the shell's own nav already uses, and
 * builds paths with that module's own `queriesPathFor`. The hub is not asked to learn anything
 * about Analytics.
 *
 * ⚠️ WHAT THE HUB ACCEPTS IS COARSER THAN WHAT THIS PAGE DRAWS, and a near-miss filter is worse
 * than none. The param has four values — `all`, `attention`, `awaiting`, `closed` — and a query
 * id via `?q=`. So:
 *
 *   · a target that names ONE QUERY gets `?q=<id>`, which is exact;
 *   · a target whose set the param can express EXACTLY gets the param;
 *   · everything else opens the hub UNFILTERED, because landing on a list that does not match the
 *     number just clicked is the quiet kind of wrong this page exists to avoid.
 *
 * Only one aggregate is exact: the funnel's first rung is every query, which is `all`. The rest
 * are listed in FILTER_GAP below with the filter each WOULD use — that table is the follow-up, and
 * it is written down rather than remembered.
 *
 * TODO(analytics-filters): the hub cannot express "material requested", "full manuscript",
 * "offer", "still out", "requests in play", "pass or withdrawn", "window elapsed", or a reply-time
 * band. Each is a set the hub already models internally; exposing them needs a param change in
 * Query Centre files, which another session owns. Until then those targets open the hub unfiltered.
 */
import { QUERIES_STATUS_PARAM, QueriesStatusFilter, queriesPathFor } from "../../lib/queriesFilterParam";

/** Everything on this page that can be opened. */
export type AnalyticsTarget =
  /** One query, by id — always exact. */
  | { kind: "query"; queryId: string }
  /** Every query in scope — the funnel's first rung. */
  | { kind: "all" }
  /** An aggregate the hub cannot express; `intent` records what it would have asked for. */
  | { kind: "unfiltered"; intent: string };

/**
 * The filter each unexpressible aggregate WOULD use. Not consumed by the code — it is the
 * specification for the follow-up, kept beside the adapter so it cannot drift away from it.
 */
export const FILTER_GAP: Record<string, string> = {
  "funnel:requested": "queries that ever reached a partial or full request",
  "funnel:full": "queries that ever reached a full request",
  "funnel:offer": "queries that reached an offer",
  "donut:open": "status = Queried (narrower than the hub's `awaiting`, which also holds sent materials)",
  "donut:inplay": "status in Partial Requested / Partial Sent / Full Requested / Full Sent / R&R",
  "donut:offer": "status = Offer",
  "donut:pass": "status in Rejected / Withdrawn (narrower than the hub's `closed`)",
  "donut:elapsed": "status = No Response (narrower than the hub's `closed`)",
  "histogram:band": "responses whose wait fell in one band — the hub models no reply-time filter",
};

/** The path a target opens. */
export function pathForTarget(t: AnalyticsTarget): string {
  switch (t.kind) {
    case "query":
      /* ⚠️ THE HUB READS `?q=` AS A QUERY ID and deep-selects it. Encoded because an id is data:
         it is generated elsewhere and this page must not assume its charset. */
      return `/queries?q=${encodeURIComponent(t.queryId)}`;
    case "all":
      return queriesPathFor("all" as QueriesStatusFilter);
    case "unfiltered":
      /* the intent is recorded in FILTER_GAP; the route is the plain hub */
      return queriesPathFor("all" as QueriesStatusFilter);
    default: {
      /* ⚠️ EXHAUSTIVE. A new target kind fails to compile rather than silently opening the hub. */
      const unhandled: never = t;
      return unhandled;
    }
  }
}

/**
 * What a link to this target should be called.
 *
 * ⚠️ IT NAMES THE DESTINATION, NOT THE GESTURE. "Open Alex Fenn in the Query Centre" tells a
 * screen-reader user where they are about to go; "click here" and "view" do not.
 */
export function labelForTarget(t: AnalyticsTarget, subject: string): string {
  switch (t.kind) {
    case "query":
      return `Open ${subject} in the Query Centre`;
    case "all":
    case "unfiltered":
      return `Open the Query Centre${subject ? ` — ${subject}` : ""}`;
    default: {
      const unhandled: never = t;
      return unhandled;
    }
  }
}

/** The param name, re-exported so a caller never types the string. */
export { QUERIES_STATUS_PARAM };
