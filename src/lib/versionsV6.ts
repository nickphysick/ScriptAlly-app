/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v6 — the page's pure helpers, additive to lib/versionsV2 (whose semantics do not change):
 *   · `funnelGeometry` — the bands funnel, ported from design-refs/versions-v6's `fsvg` at style 2 (three smooth
 *     pieces, sent → replied → asked for more → asked for the full, a gap between pieces);
 *   · `compareOrder` / `leaderFor` — the comparison's card order and each tile's leading version, both read off
 *     `leagueOrder` over the ranked versions so a tile can never name a version the cards do not put first;
 *   · `listOrder` — the list's two sorts ("Newest first" / "Most requests first", the ref's `rowsHtml`).
 *
 * ⚠️ RANKED MEANS `!early` — MIN_SENT_FOR_RATE sent, the same `n` every figure reads. Nothing here restates the number.
 */
import type { V2Version } from "./bookVersions";
import { QueryStatus } from "../types";
import { MIN_SENT_FOR_RATE, leagueOrder, warmOrder, type LeagueKey, type VersionFacts } from "./versionsV2";

/* ══ the bands funnel ══════════════════════════════════════════════════════════════════════════════════════════ */

export interface FunnelCounts { sent: number; replied: number; more: number; full: number }
export interface FunnelPiece { d: string; x0: number; x1: number; h0: number; h1: number }
export interface FunnelGeometry {
  /** the four stage heights, sent first, in viewBox units */
  heights: [number, number, number, number];
  /** three pieces: sent→replied, replied→asked for more, asked for more→asked for the full */
  pieces: [FunnelPiece, FunnelPiece, FunnelPiece];
  /** the x of the two gaps between pieces */
  gaps: [number, number];
}

/** The smallest a stage is drawn, so a zero still shows as a thin line (the ref's `Math.max(4, …)`). */
export const FUNNEL_MIN = 4;
/** Head-room the ref keeps above and below the tallest stage. */
export const FUNNEL_PAD = 6;

export const factsCounts = (f: Pick<VersionFacts, "n" | "replied" | "more" | "full">): FunnelCounts =>
  ({ sent: f.n, replied: f.replied.length, more: f.more.length, full: f.full });

/** One stage's height: its share of `base` across H − 6, never under FUNNEL_MIN. `base` ≤ 0 draws the minimum. */
export const stageHeight = (count: number, base: number, H: number): number =>
  Math.max(FUNNEL_MIN, base > 0 ? (count / base) * (H - FUNNEL_PAD) : 0);

/**
 * The ref's `fsvg` (style 2) in a W × H box. `base` is the count drawn full height: the version's own sent ("Each to
 * its own scale") or the largest sent across the cards ("Same scale").
 */
export function funnelGeometry(c: FunnelCounts, W: number, H: number, base: number = c.sent): FunnelGeometry {
  const n = [c.sent, c.replied, c.more, c.full];
  const h = n.map((q) => stageHeight(q, base, H)) as [number, number, number, number];
  const x = [0, W / 3, (2 * W) / 3, W];
  const mid = H / 2;
  const r = (v: number) => Math.round(v * 100) / 100;
  const piece = (i: number): FunnelPiece => {
    const m = (x[i] + x[i + 1]) / 2;
    const a = h[i] / 2, b = h[i + 1] / 2;
    const d = `M${r(x[i])} ${r(mid - a)}C${r(m)} ${r(mid - a)} ${r(m)} ${r(mid - b)} ${r(x[i + 1])} ${r(mid - b)}`
      + `V${r(mid + b)}C${r(m)} ${r(mid + b)} ${r(m)} ${r(mid + a)} ${r(x[i])} ${r(mid + a)}Z`;
    return { d, x0: x[i], x1: x[i + 1], h0: h[i], h1: h[i + 1] };
  };
  return { heights: h, pieces: [piece(0), piece(1), piece(2)], gaps: [x[1], x[2]] };
}

/** "{x}% of sent" — whole per cent; null for the sent column itself or when nothing was sent. */
export const ofSent = (count: number, sent: number): number | null => (sent > 0 ? Math.round((count / sent) * 100) : null);

/* ══ the comparison ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** The three tiles, in the ref's order. */
export type MeasureKey = "rate" | "sent" | "fast";
export const MEASURES: readonly MeasureKey[] = ["rate", "sent", "fast"];
/** Each tile's league key: the cards are ordered by `leagueOrder` under it. */
export const MEASURE_LEAGUE: Record<MeasureKey, LeagueKey> = { rate: "rate", sent: "n", fast: "avg" };

export const isRanked = (f: Pick<VersionFacts, "early">): boolean => !f.early;

/**
 * The cards, in rank order: ranked versions by `leagueOrder` under the measure, then the unranked ones (most sent first,
 * ties by number — v2.1's `warmOrder`).
 */
export function compareOrder(fs: readonly VersionFacts[], key: MeasureKey): { ranked: VersionFacts[]; unranked: VersionFacts[] } {
  return { ranked: leagueOrder(fs.filter(isRanked), MEASURE_LEAGUE[key]), unranked: warmOrder(fs.filter((f) => !isRanked(f))) };
}

/** The version a tile names: the first ranked card under that measure; null with no ranked version. */
export const leaderFor = (fs: readonly VersionFacts[], key: MeasureKey): VersionFacts | null => compareOrder(fs, key).ranked[0] ?? null;

/** How many more queries a version needs before it is ranked (0 once ranked). */
export const toRank = (f: Pick<VersionFacts, "n">): number => Math.max(0, MIN_SENT_FOR_RATE - f.n);

/* ══ a query row's stage band ══════════════════════════════════════════════════════════════════════════════════ */

/**
 * Which of the page's stage bands a query sits on (the ref's four: queried, partial, full, closed — `--v6-stage-*`).
 * Offer and Signed sit on the full band: the ref has no offer band, and Offer as a fourth piece is an open item.
 * Revise & Resubmit and Resubmitted have been read in full, so they sit there too.
 */
export type StageBand = "queried" | "partial" | "full" | "closed";
export function stageBandOf(status: QueryStatus): StageBand {
  switch (status) {
    case QueryStatus.QUERIED: return "queried";
    case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.PARTIAL_SENT: return "partial";
    case QueryStatus.FULL_REQUESTED: case QueryStatus.FULL_SENT: case QueryStatus.REVISE_RESUBMIT: case QueryStatus.RESUBMITTED:
    case QueryStatus.OFFER: case QueryStatus.SIGNED: return "full";
    case QueryStatus.REJECTED: case QueryStatus.WITHDRAWN: case QueryStatus.NO_RESPONSE: return "closed";
    default: { const unhandled: never = status; return unhandled; }
  }
}

/* ══ the list ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

export type ListSort = "new" | "best";

/** "Newest first": by number, high first. "Most requests first": ranked first, then asked-for-more rate, then sent. */
export function listOrder(live: readonly V2Version[], facts: Map<string, VersionFacts>, sort: ListSort): V2Version[] {
  if (sort === "new") return [...live].sort((a, b) => b.num - a.num);
  const f = (v: V2Version) => facts.get(v.id);
  const rate = (v: V2Version) => { const x = f(v); return x && x.n ? x.more.length / x.n : 0; };
  return [...live].sort((a, b) => (Number(isRanked(f(b) ?? { early: true })) - Number(isRanked(f(a) ?? { early: true })))
    || (rate(b) - rate(a)) || ((f(b)?.n ?? 0) - (f(a)?.n ?? 0)) || (b.num - a.num));
}
