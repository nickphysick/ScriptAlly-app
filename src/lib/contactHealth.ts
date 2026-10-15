/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactHealth — Contact list v17.1: LIST HEALTH and the Housekeeping tab's dismissal.
 *
 * ⚠️ THE FIGURES ARE HOUSEKEEPING'S OWN, NEVER RE-DERIVED. `pct` is the drawer's "{complete} of {total} filled in"
 *    share (`HkModel.share`, agents with no gap over agents on file), rounded; `gaps` is the drawer's gap count
 *    (`HkModel.items.length`, the gaps not put off with "Later"). The ring, the tab and the drawer read one model.
 *
 * ⚠️ THE DISMISSAL IS A NUMBER, `todoPrefs.contacts.tabDismissedAtGaps`: the gap count when the tab was hidden.
 *    It only ever falls with the count (filling gaps never brings the tab back) and is cleared to null the moment
 *    the count rises above it (something new is missing). Absent or null means "not dismissed".
 */
import type { HkModel } from "./contactHousekeeping";
import type { Agent } from "../types";
import { health } from "./listHealth";
import type { User } from "../types";
import type { UserPaths } from "./userPaths";

export interface ListHealth { pct: number; gaps: number }

/** v18 §F.1: the score is the POINTS share (lib/listHealth), no longer the share of agents with no gaps; the gap
 *  count is still Housekeeping's own (the gaps not put off with Later). */
export const listHealth = (agents: readonly Agent[], m: Pick<HkModel, "gapsById" | "items">): ListHealth => {
  const h = health(agents, m);
  return { pct: h.pct ?? 0, gaps: h.gaps };
};

/** "14 gaps to fill" · "1 gap to fill" · "All filled in" */
export const gapLine = (gaps: number): string =>
  gaps <= 0 ? "All filled in" : `${gaps} gap${gaps === 1 ? "" : "s"} to fill`;

export const healthLabel = (h: ListHealth): string =>
  h.gaps > 0 ? `List health ${h.pct}%. ${gapLine(h.gaps)}. Open Housekeeping`
    : h.pct === 100 ? "List health 100%. All filled in. Open Housekeeping" : `List health ${h.pct}%. Some put off for later. Open Housekeeping`;

/* ── the ring ─────────────────────────────────────────────────────────────────────────────────── */

export const RING = { box: 95, r: 42, w: 9, join: 2.5 } as const;
export const RING_C = 2 * Math.PI * RING.r;

/** the ink arc's length, and whether the two white joins are drawn (only when 0 < pct < 100) */
export function ringArc(pct: number): { ink: number; joins: boolean } {
  const p = Math.max(0, Math.min(100, pct));
  return { ink: (RING_C * p) / 100, joins: p > 0 && p < 100 };
}

/* ── the tab's dismissal ──────────────────────────────────────────────────────────────────────── */

export const DISMISS_PATH = "todoPrefs.contacts.tabDismissedAtGaps";

export function dismissedAtGaps(user: Pick<User, "todoPrefs"> | null | undefined): number | null {
  const v = (user?.todoPrefs as { contacts?: { tabDismissedAtGaps?: unknown } } | undefined)?.contacts?.tabDismissedAtGaps;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

/** the tab shows only with gaps, and not while a dismissal stands (one stands until the count rises past it) */
export const tabShown = (gaps: number, dismissed: number | null): boolean => gaps > 0 && (dismissed === null || gaps > dismissed);

/** what the stored value should become for this gap count: unchanged (undefined), lowered, or cleared (null) */
export function nextDismissed(gaps: number, dismissed: number | null): number | null | undefined {
  if (dismissed === null) return undefined;
  if (gaps > dismissed) return null;
  if (gaps < dismissed) return gaps;
  return undefined;
}

export const dismissPath = (v: number | null): UserPaths => ({ [DISMISS_PATH]: v });

/* ── v18 §F.3 · the intro's flag, in the same store ───────────────────────────────────────────── */

export const INTRO_PATH_V18: UserPaths = { "todoPrefs.contacts.hkIntroSeen": true };
export const introSeenOf = (user: Pick<User, "todoPrefs"> | null | undefined): boolean =>
  (user?.todoPrefs as { contacts?: { hkIntroSeen?: unknown } } | undefined)?.contacts?.hkIntroSeen === true;
