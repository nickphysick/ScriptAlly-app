/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A query's clock — the four timings, in weeks, in ONE place (non-workspace v1, Phase 3; ref: design-refs/
 * settings-v2.html, Preferences, `clock()`). Stored at `workspacePrefs.clock`; read only through `queryClock`.
 *
 * ⚠️ NO EXISTING QUERY CHANGES STATE BECAUSE OF THIS. Every default is TODAY'S constant, imported, never restated:
 *    reply expected within  = the house query window (`STAGE_RESPONSE_WINDOWS.query`, 8 weeks)
 *    nudge suggested after  = the to-do list's grace after the reply date (`NUDGE_GRACE_DAYS`, 14 days = 2 weeks)
 *    check back after       = `DEFAULT_CHECKBACK_DAYS` (14 days = 2 weeks)
 *    goes quiet after       = `DEFAULT_QUIET_WEEKS` (4) — and a writer's own stored quiet window
 *                             (`todoPrefs.queries.quietWeeks`, Settings since v153.3) is honoured.
 *    The ref's defaults are 8, 1, 2, 6; the two that differ (nudge 1, quiet 6) are listed in the run report for Nick.
 * ⚠️ PHASE 3 IS PARTLY LANDED: only "goes quiet" is read by the app through here (every quiet reader goes through
 *    `quietWeeksOf`, which reads `queryClock`). Reply-expected, nudge-due and check-back are still computed by about
 *    thirty separate copies in the Query Centre and To-do code, which this run may not rewrite; Settings shows those
 *    three as fixed figures, not as controls.
 */
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";
import { NUDGE_GRACE_DAYS } from "./taskPrecedence";
import { DEFAULT_CHECKBACK_DAYS } from "./todoWalk";

const DAYS_IN_WEEK = 7;

export interface QueryClock {
  /** Used only when the agent states no response time of their own. */
  replyWeeks: number;
  nudgeAfterWeeks: number;
  checkBackWeeks: number;
  quietWeeks: number;
}

/** The legacy quiet choices and default (v153.3) — the stepper's options. */
export const QUIET_CHOICES = [2, 3, 4, 6, 8] as const;
const LEGACY_QUIET_DEFAULT = 4;

export const CLOCK_DEFAULTS: Readonly<QueryClock> = {
  replyWeeks: STAGE_RESPONSE_WINDOWS.query,
  nudgeAfterWeeks: NUDGE_GRACE_DAYS / DAYS_IN_WEEK,
  checkBackWeeks: DEFAULT_CHECKBACK_DAYS / DAYS_IN_WEEK,
  quietWeeks: LEGACY_QUIET_DEFAULT,
};

/** The one path the quiet window is written to. */
export const CLOCK_QUIET_PATH = "workspacePrefs.clock.quietWeeks";
/** The v153.3 leaf, read as a fallback so nobody's chosen window moves. */
export const LEGACY_QUIET_PATH = "todoPrefs.queries.quietWeeks";

const choice = (v: unknown): number | null => (typeof v === "number" && (QUIET_CHOICES as readonly number[]).includes(v) ? v : null);

/** The writer's clock: stored values where valid, else today's defaults. */
export function queryClock(user: { workspacePrefs?: unknown; todoPrefs?: unknown } | null | undefined): QueryClock {
  const c = ((user?.workspacePrefs as { clock?: Record<string, unknown> } | undefined)?.clock) ?? {};
  const legacy = ((user?.todoPrefs as { queries?: { quietWeeks?: unknown } } | undefined)?.queries?.quietWeeks);
  return {
    ...CLOCK_DEFAULTS,
    quietWeeks: choice(c.quietWeeks) ?? choice(legacy) ?? CLOCK_DEFAULTS.quietWeeks,
  };
}
