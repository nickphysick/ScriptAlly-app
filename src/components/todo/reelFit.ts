/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * reelFit — the one-row reel's width-aware fit (Polish III P2). A FRESH slim derivation, not the
 * retired laneFit resurrected (halt (c) shape, reported): one pure function — N cards of at least
 * MIN fill the track exactly (no partial card at rest), clamped 1..CAP — plus the one-page scroll
 * distance. The right rail's presence participates for free: the Lane's ResizeObserver watches
 * the TRACK, whose width changes whenever the rail (or the sidebar fold) reflows the row.
 */
export const REEL_CARD_MIN = 240;
export const REEL_CARD_CAP = 5;

export interface ReelFit {
  n: number;
  cardWidth: number;
}

export function reelFit(trackWidth: number, gap = 12, min = REEL_CARD_MIN, cap = REEL_CARD_CAP): ReelFit {
  const n = Math.max(1, Math.min(cap, Math.floor((trackWidth + gap) / (min + gap))));
  return { n, cardWidth: (trackWidth - gap * (n - 1)) / n };
}

/** One pager click = one full page: N cards plus their gaps. */
export const reelPage = (fit: ReelFit, gap = 12): number => fit.n * (fit.cardWidth + gap);
