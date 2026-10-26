/**
 * foundingContributions — THE RULES for a founding writer's contributions (Dashboard v93). Pure: every function here is
 * a function of its arguments, so each rule is unit-tested (`foundingContributions.test.ts`); the store
 * (`foundingStats.ts`) only reads `betaFeedback`, calls these and writes `foundingStats/{uid}`.
 *
 * A feedback doc COUNTS when it has a `uid`; its `status` is read, planned, built or fixed (set by hand in the console);
 * its `counted` is not false (a way to exclude junk); and its `message` has at least five words.
 * - At most THREE counting docs per ISO week (Europe/London, by `createdAt`): the earliest three count.
 * - +3 for every counting doc whose status is "built" — the bonus is not capped by the week.
 * - WAITING = the writer's docs with no status yet and at least five words.
 * - Tiers by total: Fledgling 1 · Archivist 3 · Scout 8 · Mentor 15 · QueryHawk 25.
 * - Standing: writers with ≥1 contribution, ranked by total; topPct = rank ÷ N × 100 rounded UP to 5, shown only
 *   when N ≥ 10 and topPct ≤ 50.
 * - ⚠️ A LEVEL NEVER GOES DOWN. A total is recomputed from scratch, so a status change can lower it; the stored tier is
 *   the higher of the derived tier and the stored `peakTier`.
 */

export const TIERS = [
  { key: "fledgling", name: "Fledgling", min: 1 },
  { key: "archivist", name: "Archivist", min: 3 },
  { key: "scout", name: "Scout", min: 8 },
  { key: "mentor", name: "Mentor", min: 15 },
  { key: "queryhawk", name: "QueryHawk", min: 25 },
] as const;
export type TierKey = (typeof TIERS)[number]["key"];

export const COUNTED_STATUSES = ["read", "planned", "built", "fixed"] as const;
export const WEEKLY_CAP = 3;
export const BUILT_BONUS = 3;
export const MIN_WORDS = 5;
export const STANDING_MIN_WRITERS = 10;
export const STANDING_MAX_PCT = 50;

/** One `betaFeedback` doc as the rules need it. `createdAt` is epoch ms, or null when unknown. */
export interface FeedbackFacts {
  uid?: string | null;
  status?: string | null;
  counted?: boolean | null;
  message?: string | null;
  createdAt: number | null;
}

/** Words: whitespace-separated runs holding at least one letter or digit ("—" alone is not a word). */
export function wordCount(message: string | null | undefined): number {
  return (message ?? "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const isCountedStatus = (s: unknown): s is (typeof COUNTED_STATUSES)[number] =>
  typeof s === "string" && (COUNTED_STATUSES as readonly string[]).includes(s);

/** The doc could count, before the weekly cap: a uid, a status, not excluded, five words. */
export function eligible(d: FeedbackFacts): boolean {
  return !!d.uid && isCountedStatus(d.status) && d.counted !== false && wordCount(d.message) >= MIN_WORDS;
}

/** Waiting to be read: no status yet, and five words. */
export function waiting(d: FeedbackFacts): boolean {
  return !!d.uid && !d.status && wordCount(d.message) >= MIN_WORDS;
}

/** The London calendar date of an instant, as UTC-midnight ms (so ISO-week arithmetic is plain). */
function londonDay(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ms));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"));
}

/** The ISO week of an instant in Europe/London, as "2026-W43". */
export function isoWeekLondon(ms: number): string {
  const d = new Date(londonDay(ms));
  const dow = (d.getUTCDay() + 6) % 7; // Monday 0
  d.setUTCDate(d.getUTCDate() - dow + 3); // the Thursday of this week decides the year
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export interface WriterTotals { contributions: number; waiting: number }

/** One writer's docs → their contributions (the earliest three per week, plus +3 per built) and waiting count. */
export function writerTotals(docs: readonly FeedbackFacts[]): WriterTotals {
  const counting = docs.filter(eligible).sort((a, b) => (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity));
  const perWeek = new Map<string, number>();
  let base = 0;
  for (const d of counting) {
    /* a doc with no date is in a week of its own: nothing can share its week, so it is never capped by another */
    const wk = d.createdAt == null ? `undated-${base}-${perWeek.size}` : isoWeekLondon(d.createdAt);
    const n = perWeek.get(wk) ?? 0;
    if (n < WEEKLY_CAP) { perWeek.set(wk, n + 1); base += 1; }
  }
  const bonus = counting.filter((d) => d.status === "built").length * BUILT_BONUS;
  return { contributions: base + bonus, waiting: docs.filter(waiting).length };
}

const tierIndex = (contributions: number): number => {
  let at = -1;
  TIERS.forEach((t, i) => { if (contributions >= t.min) at = i; });
  return at;
};

export interface TierState { tier: TierKey | null; peakTier: TierKey | null; nextTier: TierKey | null; toNext: number | null }

/** The tier shown: the higher of the derived tier and the stored peak. The next tier and the distance to it follow it. */
export function tierState(contributions: number, peakTier: TierKey | null | undefined): TierState {
  const derived = tierIndex(contributions);
  const peak = peakTier ? TIERS.findIndex((t) => t.key === peakTier) : -1;
  const at = Math.max(derived, peak);
  const next = at + 1 < TIERS.length ? TIERS[at + 1] : null;
  const tier = at >= 0 ? TIERS[at].key : null;
  return { tier, peakTier: tier, nextTier: next ? next.key : null, toNext: next ? Math.max(1, next.min - contributions) : null };
}

/** rank ÷ N × 100, rounded UP to the nearest 5; null unless N ≥ 10 and the result ≤ 50. Ties share the best rank. */
export function topPct(total: number, everyTotal: readonly number[]): number | null {
  const ranked = everyTotal.filter((t) => t >= 1);
  const n = ranked.length;
  if (total < 1 || n < STANDING_MIN_WRITERS) return null;
  const rank = 1 + ranked.filter((t) => t > total).length;
  const pct = Math.ceil((rank / n) * 100 / 5) * 5;
  return pct <= STANDING_MAX_PCT ? pct : null;
}

export interface FoundingStats {
  contributions: number;
  waiting: number;
  tier: TierKey | null;
  peakTier: TierKey | null;
  nextTier: TierKey | null;
  toNext: number | null;
  topPct: number | null;
}

/** Every writer at once: their docs grouped by uid, and the peaks already stored. */
export function computeAll(
  docs: readonly FeedbackFacts[],
  peaks: ReadonlyMap<string, TierKey | null>,
): Map<string, FoundingStats> {
  const byUid = new Map<string, FeedbackFacts[]>();
  for (const d of docs) if (d.uid) byUid.set(d.uid, [...(byUid.get(d.uid) ?? []), d]);
  for (const uid of peaks.keys()) if (!byUid.has(uid)) byUid.set(uid, []);
  const totals = new Map<string, WriterTotals>();
  for (const [uid, list] of byUid) totals.set(uid, writerTotals(list));
  const every = [...totals.values()].map((t) => t.contributions);
  const out = new Map<string, FoundingStats>();
  for (const [uid, t] of totals) {
    out.set(uid, { contributions: t.contributions, waiting: t.waiting, ...tierState(t.contributions, peaks.get(uid) ?? null), topPct: topPct(t.contributions, every) });
  }
  return out;
}
