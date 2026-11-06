/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * foundingBand — Dashboard v2.2's founding writer band, as words and numbers (6 Nov; ref design-refs/dashboard-v2-2).
 *
 * ⚠️ NO THRESHOLD LIVES HERE. Every count is the server's own `TIERS` (lib/foundingStats: 1 · 3 · 8 · 15 · 25), with the
 * Egg at 0 before them. The pack's "1 / 5 / 12 / 25 / 40" is not what the app counts; the band reads TIERS.
 *
 * A "tier" is `cardTier`'s: 0 = Egg, 1 Fledgling … 5 QueryHawk. The road is the five birds (tiers 1–5); bird `i` (0–4)
 * is tier `i + 1`.
 */
import { TIERS } from "./foundingStats";
import { article, RANK_NAMES } from "./foundingCard";

/** each rank's notes: the Egg is the start, then the server's tiers */
export const RANK_MIN: readonly number[] = [0, ...TIERS.map((t) => t.min)];
export const TOP_TIER = RANK_MIN.length - 1;
/** the road's birds, Fledgling to QueryHawk */
export const BIRDS: readonly { tier: number; name: string; min: number }[] = TIERS.map((t, i) => ({ tier: i + 1, name: t.name, min: t.min }));

const notesWord = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** notes still to find before the next rank (at least 1 below the top); 0 at the top */
export function notesLeft(tier: number, done: number): number {
  if (tier >= TOP_TIER) return 0;
  return Math.max(1, RANK_MIN[tier + 1] - done);
}

/** The road's fill, in bird-steps from Fledgling's centre (0–4); null for the Egg (no fill). */
export function roadFill(tier: number, done: number): number | null {
  if (tier < 1) return null;
  if (tier >= TOP_TIER) return BIRDS.length - 1;
  const lo = RANK_MIN[tier], hi = RANK_MIN[tier + 1];
  return tier - 1 + clamp01(hi > lo ? (done - lo) / (hi - lo) : 0);
}

export type BirdState = "reached" | "next" | "future";
export const birdState = (birdTier: number, tier: number): BirdState =>
  birdTier <= tier ? "reached" : birdTier === tier + 1 ? "next" : "future";

/** under a bird's name: "Reached", or its threshold */
export const birdSub = (birdTier: number, tier: number): string =>
  birdTier <= tier ? "Reached" : notesWord(RANK_MIN[birdTier]);

/** a future bird's hover card: "At 8 notes · 5 to go" */
export const birdHover = (birdTier: number, done: number): string =>
  `At ${notesWord(RANK_MIN[birdTier])} · ${Math.max(0, RANK_MIN[birdTier] - done)} to go`;

/** The first line over the rank name. `up` is the rank-up load's. */
export function firstLine(tier: number, up = false): string {
  const rank = RANK_NAMES[tier];
  if (tier >= TOP_TIER) return "You’ve reached";
  if (up) return tier === 1 ? "You’ve hatched into a" : `You’ve become ${article(rank)}`;
  return `You’re ${article(rank)}`;
}

/** The ask's line, the bold part first. */
export function askLine(tier: number, done: number, up = false): { bold: string; rest: string } {
  if (tier >= TOP_TIER) return { bold: "Thank you.", rest: ` ${done} notes and counting.` };
  const next = RANK_NAMES[tier + 1];
  const left = notesLeft(tier, done);
  if (up && tier >= 1) {
    return { bold: `Welcome, ${RANK_NAMES[tier]}.`, rest: left === 1 ? ` One more note to ${next}.` : ` ${left} more notes to ${next}.` };
  }
  const bold = left === 1 ? "One more note" : `${left} more notes`;
  return { bold, rest: tier === 0 ? ` and you hatch into ${article(next)} ${next}.` : ` and you become ${article(next)} ${next}.` };
}

/** The folded strip's status: "{n} note(s)" to {next}, or "{n} notes" at the top. */
export function foldStatus(tier: number, done: number): { bold: string; rest: string } {
  if (tier >= TOP_TIER) return { bold: notesWord(done), rest: "" };
  return { bold: notesWord(notesLeft(tier, done)), rest: ` to ${RANK_NAMES[tier + 1]}` };
}

/**
 * The stored rank, as `cardTier`'s index. v105 wrote that index (0–5), and the rules accept nothing else; a tier NAME
 * ("archivist") is read as its index rather than treated as absent, and nothing stored is ever rewritten to normalise it.
 */
export function seenRank(seen: unknown): number | null {
  if (typeof seen === "number" && Number.isInteger(seen) && seen >= 0 && seen <= TOP_TIER) return seen;
  if (typeof seen === "string") { const i = TIERS.findIndex((t) => t.key === seen.toLowerCase()); return i >= 0 ? i + 1 : null; }
  return null;
}

/**
 * Part D · what the band does with the rank it last celebrated (`users.foundingSeenTier`):
 *   "silent" — nothing stored yet (an existing writer): store the current rank, no animation (an Egg stores 0, so its
 *              hatch is still celebrated later);
 *   "play"   — the rank is above the one stored: play the rank-up once, then store it;
 *   "none"   — otherwise. The Egg never plays.
 */
export function rankUpDecision(tier: number, seen: unknown): "play" | "silent" | "none" {
  const s = seenRank(seen);
  if (s === null) return "silent";
  if (tier >= 1 && tier > s) return "play";
  return "none";
}

/** the "Now in the app" chip is the done outcome; every other outcome is the plain chip */
export const outcomeDone = (outcome: string): boolean => /in the app/i.test(outcome);
