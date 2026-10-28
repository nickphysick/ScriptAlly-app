/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashPhone — the phone dashboard's figures (Dashboard on the phone v1; ref design-refs/dashboard-mobile-v1/).
 *
 * ⚠️ NOTHING HERE IS A NEW DERIVATION. Every number is read from the function the desktop dashboard already
 * reads: the live set (`dashBreakdown`), the daily ledger and its weekly roll-up (`oneScreen`), the court
 * (`qcSummary.tileCourt`), the Closed buckets (`dashClosed`), the agent coverage (`dashFirstUse`), the task
 * list (`dashList` + `dashTaskCard`) and the founding stats (`foundingStats`). The phone only arranges them.
 * A phone figure that disagreed with the desktop one would be two dashboards about one account.
 */
import { QueryStatus, type Query } from "../types";
import { liveQueries } from "./dashBreakdown";
import { aggregateLedger, dailyLedger, sentAt } from "./oneScreen";
import { tileCourt } from "./qcSummary";
import { CLOSED_BUCKETS, type ClosedBucketKey, type ClosedTile } from "./dashClosed";
import type { AgentCoverage } from "./dashFirstUse";
import type { TaskKind } from "./dashTaskCard";
import { TIERS, cardTier, type FoundingStats } from "./foundingStats";
import { RANK_NAMES } from "./foundingCard";
import { MONTHS_SHORT } from "./dates";

/* ── B1 · Active queries ─────────────────────────────────────────────────────────────────────── */

/** How many weeks the phone chart draws. */
export const PHONE_WEEKS = 12;

export interface PhoneWeek { label: string; startMs: number; active: number }
export interface ActiveCard {
  /** the desktop chart's headline: the live set */
  count: number;
  /** the net change in active queries since the month began; null when it is not a rise */
  chip: number | null;
  /** live queries in the writer's court (offers included): "need you" */
  withYou: number;
  /** every query with a send date, open or closed: "sent in all" */
  sent: number;
  /** the last twelve weeks of the weekly active series, oldest first */
  weeks: PhoneWeek[];
  /** a month name at the first week of each month in the window */
  months: { label: string; index: number }[];
  /** the live set's ids — what the card opens in the Query Centre */
  ids: string[];
}

export function activeCard(scoped: readonly Query[], now: Date): ActiveCard {
  const live = liveQueries(scoped);
  const daily = dailyLedger(scoped as Query[], now);
  const weekly = aggregateLedger(daily, "weekly").slice(-PHONE_WEEKS);
  const weeks = weekly.map((w) => ({ label: w.label, startMs: w.start.getTime(), active: w.active }));
  /* "this month": today's closing position against the close of the last day before the 1st */
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const today = daily.length ? daily[daily.length - 1].active : 0;
  let before = 0;
  for (const d of daily) { if (d.start.getTime() < monthStart) before = d.active; else break; }
  const delta = today - before;
  const months: { label: string; index: number }[] = [];
  weeks.forEach((w, i) => {
    const m = new Date(w.startMs).getMonth();
    if (i === 0 || new Date(weeks[i - 1].startMs).getMonth() !== m) months.push({ label: MONTHS_SHORT[m], index: i });
  });
  return {
    count: live.length,
    chip: delta > 0 ? delta : null,
    withYou: live.filter((q) => tileCourt(q.status) === "you").length,
    sent: scoped.filter((q) => sentAt(q) !== null).length,
    weeks,
    months,
    ids: live.map((q) => q.id),
  };
}

/** "18 need you · 21 sent in all", in runs so the first clause can be set bold. "need you" is dropped at 0. */
export function activeLine(c: Pick<ActiveCard, "withYou" | "sent">): { bold: string | null; rest: string } {
  const rest = `${c.sent} sent in all`;
  return c.withYou > 0 ? { bold: `${c.withYou} need you`, rest } : { bold: null, rest };
}

/* ── B2 · the three small cards ──────────────────────────────────────────────────────────────── */

export interface Seg { key: string; count: number; color: string }

const READING: readonly QueryStatus[] = [QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT];
export const WITH_AGENTS_SEG = { reading: "#2a3a52", waiting: "#8fa1b8" } as const;

export interface WithAgentsCard { n: number; reading: number; segs: Seg[]; ids: string[] }
export function withAgentsCard(scoped: readonly Query[]): WithAgentsCard {
  const agent = liveQueries(scoped).filter((q) => tileCourt(q.status) === "agent");
  const reading = agent.filter((q) => READING.includes(q.status)).length;
  return {
    n: agent.length, reading, ids: agent.map((q) => q.id),
    segs: [
      { key: "reading", count: reading, color: WITH_AGENTS_SEG.reading },
      { key: "waiting", count: agent.length - reading, color: WITH_AGENTS_SEG.waiting },
    ],
  };
}

/** v116's Closed colours, by bucket — the hoop's own stones. */
export const CLOSED_SEG: Record<ClosedBucketKey, string> = { quiet: "#b9b2a8", letter: "#8c8379", partial: "#6f6962", full: "#4a443f" };

export interface ClosedCard { n: number; top: { count: number; label: string } | null; segs: Seg[]; ids: string[] }
export function closedCard(tile: Pick<ClosedTile, "total" | "buckets"> & Partial<Pick<ClosedTile, "members">>): ClosedCard {
  let top: ClosedCard["top"] = null;
  for (const b of tile.buckets) if (b.count > 0 && (!top || b.count > top.count)) top = { count: b.count, label: b.label.toLowerCase() };
  return {
    n: tile.total, top,
    ids: tile.members ? CLOSED_BUCKETS.flatMap((s) => tile.members?.[s.key] ?? []) : [],
    segs: CLOSED_BUCKETS.map((s) => ({ key: s.key, count: tile.buckets.find((b) => b.key === s.key)?.count ?? 0, color: CLOSED_SEG[s.key] })),
  };
}

/** v116's Agents colours. */
export const AGENTS_SEG = { querying: "#2a3a52", closed: "#c9c2b8", none: "var(--clv-slate-pale, #d6dfe6)" } as const;

export interface AgentsCard { queried: number; total: number; toQuery: number; segs: Seg[] }
export function agentsCard(cov: Pick<AgentCoverage, "querying" | "closed" | "none" | "queried" | "total">): AgentsCard {
  return {
    queried: cov.queried, total: cov.total, toQuery: cov.none,
    segs: [
      { key: "querying", count: cov.querying, color: AGENTS_SEG.querying },
      { key: "closed", count: cov.closed, color: AGENTS_SEG.closed },
      { key: "none", count: cov.none, color: AGENTS_SEG.none },
    ],
  };
}

/**
 * ⚠️ WHERE A CARD GOES. The Query Centre lists every manuscript while the dashboard counts one, so a `?status=` link
 * lands on a different number (measured: 142 rows behind a card saying 30). The page's own `?ids=` entry point — the
 * one Submission packages' "See these queries" uses — opens exactly the card's queries. An empty set opens the page
 * whole rather than an empty list.
 */
export const queriesForIds = (ids: readonly string[]): string => (ids.length ? `/queries?ids=${encodeURIComponent(ids.join(","))}` : "/queries");

/** The quiet line a card shows when its number is 0 — a card is never empty. */
export const ZERO_LINE = { withAgents: "None yet", closed: "Nothing closed", agents: "All queried" } as const;

/* ── C · Up next: the kind colours, in ONE map ───────────────────────────────────────────────── */

export type PhoneKind = "move" | "nudge" | "close" | "house";

/** The task card's four kinds on the phone. "other" (housekeeping, a ready agent, a coming date) takes the slate. */
export const phoneKindOf = (k: TaskKind): PhoneKind => (k === "send" ? "move" : k === "nudge" ? "nudge" : k === "close" ? "close" : "house");

/**
 * ⚠️ THE ONE MAP. Text on these tints is always the ink; only the kicker takes the kind's colour. "Your move" is
 * the soft pink while the burgundy alternative is still being chosen — change it here and every phone surface
 * follows.
 */
export const PHONE_KIND: Record<PhoneKind, { tint: string; ring: string | null; kicker: string; disc: string; glyph: string }> = {
  move: { tint: "#f5e2da", ring: "#eecdc3", kicker: "#8a4030", disc: "#f5e2da", glyph: "#8a4030" },
  nudge: { tint: "#e6edf6", ring: null, kicker: "#2a3a52", disc: "#2a3a52", glyph: "#ffffff" },
  close: { tint: "#ece8e2", ring: null, kicker: "#6d665e", disc: "#ece8e2", glyph: "#1c130f" },
  house: { tint: "#e8edf3", ring: null, kicker: "#5f7591", disc: "#5f7591", glyph: "#ffffff" },
};

/** How many tasks follow the hero. */
export const UP_NEXT_ROWS = 3;

/* ── D · the founding writer row ─────────────────────────────────────────────────────────────── */

export function foundingRow(stats: Pick<FoundingStats, "contributions" | "nextTier" | "toNext" | "tier">): { rank: string; tier: number; line: string } {
  const tier = cardTier(stats as FoundingStats);
  const k = Math.max(0, Math.floor(stats.contributions || 0));
  const next = stats.nextTier ? TIERS.find((t) => t.key === stats.nextTier) : null;
  const sent = `${k} sent`;
  const line = !next || stats.toNext == null
    ? `${sent} · top rank. Tell us something.`
    : `${sent} · ${stats.toNext} more to ${next.key === "fledgling" ? "hatch" : next.name}. Tell us something.`;
  return { rank: RANK_NAMES[tier] ?? RANK_NAMES[0], tier, line };
}

/** How many feed entries the Recent card shows. */
export const RECENT_ROWS = 2;
