/**
 * ⚠️ UNMOUNTED, AND KEPT ON PURPOSE (F-AM). Its only consumer was `AnalyticsTab`, deleted along
 * with the dev review route that had kept it alive — so nothing renders these derivations today. They survive because they are
 * PURE, TESTED, and answer a question the live page does not: community percentiles behind `COMMUNITY_STATS_ENABLED`, a feature the live page has no surface for yet. `TrackingBand` derives from
 * `packageTracking.ts` and reproduces none of it, so deleting this would lose the work rather than
 * tidy a duplicate.
 *
 * ⚠️ IF A LATER SESSION FINDS THIS WITH NO CALLER, THAT IS EXPECTED — do not "restore" a surface for
 * it and do not delete it as dead. It is a shelf, not an orphan, and this note is the difference.
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * communityStats — the CONTRACT for comparing a writer's results against other ScriptAlly writers,
 * and a flag that keeps the whole surface switched off.
 *
 * ⚠️ THIS DATA DOES NOT EXIST. There is no aggregation pipeline, and pre-launch there is no community
 * to aggregate. The design reference shows percentile claims ("higher than 78% of ScriptAlly
 * writers", "TOP 10%", "BEATS 71%") — those figures are illustrative placeholders in the mock, and
 * this module exists so the presentation layer can be built without any of them becoming real-looking
 * in the product. See reports/community-percentiles.md for what a real pipeline would need.
 *
 * The rules this file enforces, so no consumer can bypass them:
 *   1. `COMMUNITY_STATS_ENABLED` is false. Nothing renders while it is false.
 *   2. A source may return null for any question. Null is the normal answer, not an error, and the
 *      view falls back to the writer's own figure.
 *   3. NOTHING IS EVER INVENTED AT RUNTIME. No Math.random, no interpolation, no "estimated"
 *      percentile. The only implementation today returns null to everything, by design.
 *   4. A percentile is only displayable above BOTH floors: a cohort of comparable records
 *      (COHORT_FLOOR) and the writer's own sample (`meetsSampleThreshold`). Below either, no claim.
 *      The gate lives in `displayablePercentile`, not in the views, so it cannot be forgotten.
 *   5. Percentiles are RANKING statements ("higher than X% of packages"), never causal ones. A
 *      package does not perform better BECAUSE of a percentile; the percentile just describes where
 *      it sits.
 */
import { meetsSampleThreshold } from "./packageMetrics";

/** The master switch. Default OFF; flipping it on without a real source changes nothing on screen. */
export const COMMUNITY_STATS_ENABLED = false;

/** Minimum comparable records in the cohort before a percentile may be shown at all. */
export const COHORT_FLOOR = 50;

/** What a source can be asked about. */
export type CommunityMetric = "package-reply-rate" | "material-reply-rate";

/** A percentile answer from a source. `cohortSize` is how many comparable records it is drawn from. */
export interface CommunityPercentile {
  /** 0–100: the share of the cohort this result is above. A ranking, never a cause. */
  percentile: number;
  cohortSize: number;
}

/** A source of community comparisons. The app holds exactly one implementation, and it knows nothing. */
export interface CommunityStatsSource {
  /** Null means "no comparison available" — the expected answer, not a failure. */
  percentileFor(metric: CommunityMetric, value: number): CommunityPercentile | null;
}

/**
 * The only implementation that exists. It answers null to everything, because there is nothing to
 * answer with. It is deliberately not a random generator, not a fixture and not a hard-coded curve:
 * anything that returned a number here would put an invented figure in front of a writer.
 */
export const placeholderCommunitySource: CommunityStatsSource = {
  percentileFor: () => null,
};

/** What the view is allowed to render. `null` ⇒ render the flag-off state. */
export interface DisplayablePercentile {
  percentile: number;
  cohortSize: number;
}

/**
 * The one gate every consumer goes through. Returns null — meaning "show the writer's own figure and
 * no comparison" — unless the flag is on, a source answered, the cohort clears COHORT_FLOOR, and the
 * writer's own sample clears MIN_SENDS_FOR_CLAIM.
 */
export function displayablePercentile(
  metric: CommunityMetric,
  value: number | null,
  ownSends: number,
  source: CommunityStatsSource = placeholderCommunitySource,
): DisplayablePercentile | null {
  if (!COMMUNITY_STATS_ENABLED) return null;
  if (value === null) return null;
  if (!meetsSampleThreshold(ownSends)) return null;
  const answer = source.percentileFor(metric, value);
  if (!answer) return null;
  if (answer.cohortSize < COHORT_FLOOR) return null;
  if (answer.percentile < 0 || answer.percentile > 100) return null;
  return { percentile: Math.round(answer.percentile), cohortSize: answer.cohortSize };
}

/** The ranking sentence. Kept here so the wording can never drift into a causal claim. */
export const percentileSentence = (p: DisplayablePercentile, subject: string): string =>
  `This ${subject}'s reply rate is higher than ${p.percentile}% of comparable ${subject}s in the ScriptAlly community.`;

/** The pill label ("TOP 10%" past the ninetieth, otherwise "BEATS 71%"). */
export const percentileLabel = (p: DisplayablePercentile): string =>
  p.percentile >= 90 ? `TOP ${100 - p.percentile}%` : `BEATS ${p.percentile}%`;
