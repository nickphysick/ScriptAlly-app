/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashHover — Dashboard v116's hover detail, the pure halves (ref design-refs/dashboard-v116/).
 *
 * The week callout's figures, the stepped stack's geometry and its on-screen rule, the closed and agent
 * card lists, and the founding card's header swap. Nothing here reads the DOM or the clock.
 *
 * ⚠️ THE WEEK CALLOUT IS `weekMix`'S, FOLDED, NEVER RECOUNTED. Its three rows are the eight stages a
 * live query can stand at, grouped by how far the manuscript has gone out: Queried · Partial out
 * (partial requested or sent) · Full out (full requested or sent, R&R, resubmitted, offer). A query
 * whose stage is not knowable for that week stays its own row, as it does in the old popup, so the
 * rows always sum to the headline.
 * ⚠️ THE CLOSED LIST IS `closedTile.members`, in its own order (newest closed first): the cards under a
 * slice are the slice, never a second bucketing that could disagree with the ring.
 * ⚠️ THE AGENT LIST IS `agentQueryStates`, the Agents-on-file ring's own derivation.
 */
import { QueryStatus, type Agent, type Query } from "../types";
import { agentPrimary, agentSecondary } from "./agentDisplay";
import type { ClosedBucketKey, ClosedTile } from "./dashClosed";
import { agentQueryStates } from "./contactDesk";
import { TIERS, type FoundingStats } from "./foundingStats";
import { closedAt, sentAt } from "./oneScreen";
import type { WeekMix } from "./dashWeekMix";

/* ── the week callout ─────────────────────────────────────────────────────────────────────────── */

export type WeekGroupKey = "queried" | "partial" | "full";
const GROUP_OF: Partial<Record<QueryStatus, WeekGroupKey>> = {
  [QueryStatus.QUERIED]: "queried",
  [QueryStatus.PARTIAL_REQUESTED]: "partial",
  [QueryStatus.PARTIAL_SENT]: "partial",
  [QueryStatus.FULL_REQUESTED]: "full",
  [QueryStatus.FULL_SENT]: "full",
  [QueryStatus.REVISE_RESUBMIT]: "full",
  [QueryStatus.RESUBMITTED]: "full",
  [QueryStatus.OFFER]: "full",
};
export const WEEK_GROUPS: readonly { key: WeekGroupKey; label: string; color: string }[] = [
  { key: "queried", label: "Queried", color: "#2a3a52" },
  { key: "partial", label: "Partial out", color: "#7f93ab" },
  { key: "full", label: "Full out", color: "#c7d1dc" },
];
/** the not-dated row's swatch: stone, so it never reads as a fourth stage */
export const UNDATED_COLOR = "#d9d3ca";

export interface WeekCallout {
  total: number;
  delta: { kind: "up" | "down" | "same"; text: string };
  groups: { key: WeekGroupKey; label: string; color: string; n: number }[];
  undated: number;
}

export function weekCallout(mix: WeekMix, prevTotal: number | null): WeekCallout {
  const n: Record<WeekGroupKey, number> = { queried: 0, partial: 0, full: 0 };
  let other = 0;
  for (const r of mix.rows) {
    const g = GROUP_OF[r.status];
    if (g) n[g] += r.count; else other += r.count;
  }
  const d = prevTotal === null ? 0 : mix.total - prevTotal;
  return {
    total: mix.total,
    delta: d > 0 ? { kind: "up", text: `▲ ${d} on last week` } : d < 0 ? { kind: "down", text: `▼ ${-d} on last week` } : { kind: "same", text: "no change" },
    groups: WEEK_GROUPS.map((g) => ({ ...g, n: n[g.key] })),
    /* a stage outside the three (none today) is counted with the not-dated row, never dropped */
    undated: mix.undated + other,
  };
}

/* ── the stepped stack ────────────────────────────────────────────────────────────────────────── */

export const STACK_MAX = 5;
export const STEP_X = 14;
export const STEP_Y = 38;
export const STACK_GAP = 8;
export const STACK_PAD = 12;
export const CARD_W = 212;

/** Card i of n: 14i right, 38i down, tilted 0.8° per step about the middle card. */
export const stepAt = (i: number, n: number): { x: number; y: number; rot: number } => ({
  x: i * STEP_X,
  y: i * STEP_Y,
  rot: Math.round((i - (n - 1) / 2) * 0.8 * 100) / 100 || 0,
});

/**
 * How many cards to show: at most five, and fewer when five would not fit the viewport's height
 * (with 12 to spare at each edge) — the rest fold into "+N more". Never fewer than one.
 */
export function stackCap(total: number, cardH: number, pillH: number, viewH: number): number {
  let k = Math.min(STACK_MAX, total);
  const room = viewH - 2 * STACK_PAD;
  while (k > 1) {
    const h = (k - 1) * STEP_Y + cardH + (total > k ? STACK_GAP + pillH : 0);
    if (h <= room) break;
    k -= 1;
  }
  return Math.max(Math.min(1, total), k);
}

/** The on-screen rule: move the stack up or left until it sits 12 inside the bottom and right edges,
 *  then never above or left of 12. */
export function fitStack(box: { left: number; top: number; w: number; h: number }, viewW: number, viewH: number): { dx: number; dy: number } {
  let dx = 0, dy = 0;
  if (box.top + box.h > viewH - STACK_PAD) dy = viewH - STACK_PAD - (box.top + box.h);
  if (box.top + dy < STACK_PAD) dy = STACK_PAD - box.top;
  if (box.left + box.w > viewW - STACK_PAD) dx = viewW - STACK_PAD - (box.left + box.w);
  if (box.left + dx < STACK_PAD) dx = STACK_PAD - box.left;
  return { dx, dy };
}

/* ── the closed cards ─────────────────────────────────────────────────────────────────────────── */

export interface ClosedCard { id: string; name: string; agency: string; outcome: "quiet" | "passed"; queried: string; end: string }

const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const WEEK_MS = 7 * 86400000;

export function closedCards(tile: Pick<ClosedTile, "members">, key: ClosedBucketKey, queries: readonly Query[], agents: readonly Agent[]): ClosedCard[] {
  const byId = new Map(queries.map((q) => [q.id, q]));
  const ag = new Map(agents.map((a) => [a.id, a]));
  const out: ClosedCard[] = [];
  for (const id of tile.members[key] ?? []) {
    const q = byId.get(id);
    if (!q) continue;
    const a = ag.get(q.agentId) ?? null;
    const s = sentAt(q), c = closedAt(q);
    const quiet = key === "quiet";
    out.push({
      id,
      name: agentPrimary(a),
      agency: agentSecondary(a),
      outcome: quiet ? "quiet" : "passed",
      queried: s !== null ? day(s) : "—",
      end: quiet
        ? (s !== null && c !== null ? `${Math.max(0, Math.floor((c - s) / WEEK_MS))} wks` : "No reply")
        : (c !== null ? `Passed ${day(c)}` : "Passed"),
    });
  }
  return out;
}

/* ── the agent cards ──────────────────────────────────────────────────────────────────────────── */

export type AgentStackKey = "querying" | "closed" | "none";
export interface AgentCard { id: string; name: string; agency: string; genres: string[]; status: AgentStackKey }

const STATE_OF = { active: "querying", closed: "closed", none: "none" } as const;

/** The agents with one status, most recent query first (not yet queried: most recently added first). */
export function agentCards(agents: readonly Agent[], queries: readonly Query[], msId: string | null, key: AgentStackKey): AgentCard[] {
  const facts = agentQueryStates(agents, queries, msId);
  const added = (a: Agent) => Date.parse(a.dateAdded ?? "") || 0;
  return agents
    .filter((a) => STATE_OF[facts.get(a.id)?.state ?? "none"] === key)
    .sort((p, q) => key === "none" ? added(q) - added(p) : (facts.get(q.id)?.at ?? 0) - (facts.get(p.id)?.at ?? 0))
    .map((a) => ({ id: a.id, name: agentPrimary(a), agency: agentSecondary(a), genres: [...(a.genres ?? [])], status: key }));
}

/* ── the founding card's header swap ──────────────────────────────────────────────────────────── */

export function founderSwap(s: Partial<FoundingStats> & Pick<FoundingStats, "contributions" | "nextTier" | "toNext">): string {
  const n = Math.max(0, Math.floor(s.contributions || 0));
  if (n < 1) return "NO CONTRIBUTIONS YET";
  const lead = `${n} ${n === 1 ? "CONTRIBUTION" : "CONTRIBUTIONS"}`;
  const next = s.nextTier ? TIERS.find((t) => t.key === s.nextTier) : null;
  if (!next || s.toNext == null) return `${lead} · TOP RANK`;
  return `${lead} · ${s.toNext} TO ${next.name.toUpperCase()}`;
}
