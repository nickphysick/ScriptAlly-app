/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashWindow — the active-queries card over a campaign's life (v33, 18 Sep; behaviour ref
 * design-refs' `minimap-stages.html`, styling ref `dashboard-v33.html`).
 *
 * ⚠️ THE TRIGGER IS HOW MUCH QUERY HISTORY EXISTS, NEVER THE ACCOUNT'S AGE. An imported two-year
 * campaign is a long campaign on its first day; a three-year-old account whose first query went out
 * last week is a short one.
 *
 *   none  · no sent query                → the empty state; no chart
 *   short · under twelve weeks of record → everything since the first query, daily and STEPPED
 *   long  · twelve weeks or more         → the default eight-week window, weekly and smoothed, with
 *                                          the minimap beneath it
 *
 * Twelve is one and a half times the default window: the first time the minimap appears, its window
 * is visibly smaller than its track.
 */
import { LedgerPoint, aggregateLedger } from "./oneScreen";

export const WINDOW_DAYS = 56;
export const MINIMAP_AFTER_DAYS = 84;

export type CampaignStage = "none" | "short" | "long";

export const campaignStage = (daily: readonly LedgerPoint[]): CampaignStage =>
  daily.length === 0 ? "none" : daily.length < MINIMAP_AFTER_DAYS ? "short" : "long";

/** "SINCE 2 SEP" — the short campaign's suffix. The ledger's first row IS the first send's day. */
export const sinceLabel = (daily: readonly LedgerPoint[]): string | null =>
  daily.length ? `since ${daily[0].label}` : null;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "DEC 2023" — the minimap's left label */
export const firstMonthLabel = (daily: readonly LedgerPoint[]): string | null =>
  daily.length ? `${MONTHS[daily[0].start.getMonth()]} ${daily[0].start.getFullYear()}` : null;

/**
 * The window, as the index of its LAST day in the daily ledger. The window always spans
 * `WINDOW_DAYS`; only where it ends moves.
 */
export const clampWindowEnd = (endIdx: number, dailyLen: number): number =>
  Math.max(Math.min(WINDOW_DAYS, dailyLen - 1), Math.min(dailyLen - 1, Math.round(endIdx)));

/* ⚠️ `windowAtToday` IS RETIRED (the v34 mockup, 19 Sep). It gated the fill's carried-on end to a
   window that reaches today; the end of the chart now ALWAYS disintegrates, whatever dates are showing,
   and the gate had no other reader. */

/** "Showing 20 Jul to 14 Sep. Drag to change the dates." — the range control's title and its name. */
export const rangeSentence = (view: readonly LedgerPoint[]): string =>
  view.length ? `Showing ${view[0].label} to ${view[view.length - 1].label}. Drag to change the dates.` : "Drag to change the dates.";

/**
 * The points the long chart draws: the weekly roll-up of the record UP TO the window's end, cut to
 * the window. Rolling up a truncated ledger is what makes the last point close on the window's own
 * last day rather than on the end of a week the window does not reach.
 */
export const longView = (daily: readonly LedgerPoint[], endIdx: number): LedgerPoint[] => {
  const upTo = daily.slice(0, endIdx + 1).map((p) => ({ ...p }));
  const weekly = aggregateLedger(upTo, "weekly");
  if (!weekly.length) return weekly;
  const cutoff = weekly[weekly.length - 1].end.getTime() - WINDOW_DAYS * 86400000;
  const win = weekly.filter((r) => r.end.getTime() >= cutoff);
  return win.length >= 2 ? win : weekly.slice(-2);
};

/** The minimap window's place on its track, as fractions of the whole record. */
export const windowFraction = (endIdx: number, dailyLen: number): { left: number; width: number } => {
  const span = Math.max(1, dailyLen - 1);
  const width = Math.min(1, WINDOW_DAYS / span);
  const right = Math.min(1, endIdx / span);
  return { left: Math.max(0, right - width), width };
};

/**
 * ⚠️ THE WINDOW'S DRAWN BOX, IN PIXELS, CLAMPED INSIDE ITS TRACK (the v34 mockup). The window has a
 * minimum drawn width so its handles stay grabbable on a long campaign; on a two-year record that
 * floor is wider than the eight weeks it stands for. Placed by its left edge it would run past the
 * track at the right-hand end (the mockup does, and clips it — a shortcut, not the intent). So the box
 * is placed by where the window ENDS, and then held inside the track at both ends.
 */
export const windowBox = (endIdx: number, dailyLen: number, trackW: number, minW: number): { left: number; width: number } => {
  const f = windowFraction(endIdx, dailyLen);
  const width = Math.min(trackW, Math.max(minW, f.width * trackW));
  const right = Math.min(trackW, (f.left + f.width) * trackW);
  const left = Math.max(0, Math.min(trackW - width, right - width));
  return { left, width };
};

/**
 * The thumbnail: the whole record, thinned to at most `max` points so a three-year campaign is not a
 * three-thousand-segment path in a 26px strip. The last day is always kept.
 */
export const thumbnailSeries = (daily: readonly LedgerPoint[], max = 120): number[] => {
  if (daily.length <= max) return daily.map((p) => p.active);
  const out: number[] = [];
  const step = (daily.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) out.push(daily[Math.round(i * step)].active);
  return out;
};

/* ── remembered per device ── */
export const WINDOW_KEY = "sa.dashChartWindowEnd";
/** Stored as days BACK from today, so tomorrow the same stretch is still the same stretch. */
export const readWindowBack = (): number => {
  try { const v = Number(window.localStorage.getItem(WINDOW_KEY)); return Number.isFinite(v) && v > 0 ? Math.round(v) : 0; } catch { return 0; }
};
export const writeWindowBack = (back: number): void => {
  try { if (back > 0) window.localStorage.setItem(WINDOW_KEY, String(Math.round(back))); else window.localStorage.removeItem(WINDOW_KEY); } catch { /* private window: the chart opens on today */ }
};
export const MINIMAP_SEEN_KEY = "sa.dashMinimapSeen";
