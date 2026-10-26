/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOUNDING WRITER'S CONTRIBUTIONS, ON THE CLIENT (Dashboard v93). The server computes `foundingStats/{uid}`
 * (functions/src/foundingStats.ts — a writer can read only their own feedback, and a standing needs everyone's);
 * the card reads the writer's own doc live. A missing doc means 0 contributions.
 *
 * ⚠️ THE TIER TABLE IS THE SERVER'S, COPIED: the client cannot import from functions/. `foundingStats.test.ts`
 *    holds this copy equal to functions/src/foundingContributions.ts, so the two cannot drift.
 */
import { useEffect, useState } from "react";

export const TIERS = [
  { key: "fledgling", name: "Fledgling", min: 1, line: "Just hatched, and already helping." },
  { key: "archivist", name: "Archivist", min: 3, line: "Keeps the record straight." },
  { key: "scout", name: "Scout", min: 8, line: "Spots what others miss." },
  { key: "mentor", name: "Mentor", min: 15, line: "Helps shape how every writer queries." },
  { key: "queryhawk", name: "QueryHawk", min: 25, line: "Top of the tree." },
] as const;
export type TierKey = (typeof TIERS)[number]["key"];

export interface FoundingStats {
  contributions: number;
  waiting: number;
  tier: TierKey | null;
  nextTier: TierKey | null;
  toNext: number | null;
  topPct: number | null;
}

export const ZERO_STATS: FoundingStats = { contributions: 0, waiting: 0, tier: null, nextTier: "fledgling", toNext: 1, topPct: null };

const isTier = (v: unknown): v is TierKey => typeof v === "string" && TIERS.some((t) => t.key === v);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);

/** A stored doc (or nothing) → the stats the card shows. Anything malformed falls back to zero, never to a guess. */
export function statsFrom(data: Record<string, unknown> | null | undefined): FoundingStats {
  if (!data) return ZERO_STATS;
  return {
    contributions: num(data.contributions, 0),
    waiting: num(data.waiting, 0),
    tier: isTier(data.tier) ? data.tier : null,
    nextTier: isTier(data.nextTier) ? data.nextTier : data.nextTier === null ? null : "fledgling",
    toNext: typeof data.toNext === "number" ? data.toNext : null,
    topPct: typeof data.topPct === "number" ? data.topPct : null,
  };
}

/** The tier's index (0–4), or -1 before the first contribution. */
export const tierIndex = (tier: TierKey | null): number => (tier ? TIERS.findIndex((t) => t.key === tier) : -1);

/** The progress ring: (contributions − this tier's minimum) ÷ (next minimum − this minimum); full at QueryHawk. */
export function ringFraction(s: FoundingStats): number {
  const i = tierIndex(s.tier);
  if (i === TIERS.length - 1) return 1;
  const lo = i >= 0 ? TIERS[i].min : 0;
  const hi = TIERS[i + 1].min;
  return Math.min(1, Math.max(0, (s.contributions - lo) / (hi - lo)));
}

type Aid = { __SA_FOUNDING_STATS?: unknown };

/**
 * The live read of the writer's own doc. ⚠️ DEV REVIEW AID: `window.__SA_FOUNDING_STATS = {…}` (or `null` for "no
 * doc") hands the card a stats doc instead of the snapshot, so a lock can see 0, 1, 6, 11 and 25 on one account. The
 * branch is dead in a production build: `MODE` is replaced statically.
 */
export function useFoundingStats(uid: string | null | undefined): { loading: boolean; error: boolean; stats: FoundingStats } {
  const [state, setState] = useState<{ loading: boolean; error: boolean; stats: FoundingStats }>({ loading: true, error: false, stats: ZERO_STATS });
  useEffect(() => {
    if (import.meta.env.MODE !== "production" && typeof window !== "undefined" && "__SA_FOUNDING_STATS" in window) {
      const aid = (window as unknown as Aid).__SA_FOUNDING_STATS;
      setState({ loading: false, error: false, stats: statsFrom(aid && typeof aid === "object" ? aid as Record<string, unknown> : null) });
      return undefined;
    }
    if (!uid) { setState({ loading: false, error: false, stats: ZERO_STATS }); return undefined; }
    let off: (() => void) | undefined;
    let live = true;
    void (async () => {
      try {
        const [{ doc, onSnapshot }, { db }] = await Promise.all([import("firebase/firestore"), import("./firebase")]);
        if (!live) return;
        off = onSnapshot(
          doc(db, "foundingStats", uid),
          (snap) => setState({ loading: false, error: false, stats: statsFrom(snap.exists() ? snap.data() : null) }),
          () => setState({ loading: false, error: true, stats: ZERO_STATS }),
        );
      } catch {
        if (live) setState({ loading: false, error: true, stats: ZERO_STATS });
      }
    })();
    return () => { live = false; off?.(); };
  }, [uid]);
  return state;
}
