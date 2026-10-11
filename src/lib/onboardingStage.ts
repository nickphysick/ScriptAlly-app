/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one consumer of `User.queryingStage` — the writer's answer to "where are you in your querying
 * journey?", captured on the onboarding welcome step.
 *
 * ⚠️ THIS EXISTS SO THE STORED FIELD HAS A READER. `queryingStage` was persisted to the profile and
 * then never read back from it: the only code that branched on the answer read onboarding's own
 * local state, which meant the document field was write-only. Its sibling `journeyStage` was in the
 * same position and has been deleted outright; this one is kept because the answer is genuinely
 * useful beyond the moment it is given, and now it is genuinely used.
 */

export type QueryingStage = "starting" | "early" | "deep" | "interest";

/**
 * The stage to act on: the STORED answer, falling back to the one held in this session.
 *
 * ⚠️ THE FALLBACK IS NOT DECORATION, AND IT IS NOT A WAY BACK TO READING LOCAL STATE. Onboarding
 * writes the profile fire-and-forget on purpose — an awaited write can hang the whole flow when a
 * field is silently denied by the rules (the affectedKeys gotcha) — so there is a real window in
 * which the answer has been given but the document has not come back yet. The stored value leads,
 * because that is the one a writer who reloads mid-flow still has; the session value covers the
 * window, and only the window.
 */
export function effectiveQueryingStage(
  stored: QueryingStage | null | undefined,
  inSession: QueryingStage | null | undefined,
): QueryingStage | null {
  return stored ?? inSession ?? null;
}
