/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 (design-refs/phone-app-v4/) — THE FIGURES v4 ADDS, below 768px only. Every one is read from an engine the
 * app already has, and none restates its rule:
 *   - "how close" a query is to its date: the Birds-eye engine's own fraction (`eyeProgress`);
 *   - best fit: the writer's own Agent fit order (`fitOrder`), over agents with no query yet;
 *   - the streak: the Goals page's own (`weekStreak`).
 * What is added here is ORDER and WORDS. lib/phoneV3.ts stays the source of every court, line and step.
 *
 * ⚠️ COPY (PA4-9): never "overdue" or "late"; a passed date is "N wks past its date".
 */
import { QueryStatus, type Agent, type Query, type QueryingGoalEntry } from "../types";
import type { AnalyticsRow } from "./analytics";
import { eyeProgress } from "./qcBirdsEye";
import { fitOrder } from "./agentFit";
import { weekStreak } from "./milestones";
import { dayMonth } from "./dates";
import type { V3Court, V3Query } from "./phoneV3";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/* ── how close each open query is to its date ── */
export interface Closeness {
  q: V3Query;
  /** how far through the window (1 = the date); null when nothing dates it */
  f: number | null;
  /** the window's start and end, for the dated views */
  fromMs: number | null;
  toMs: number | null;
  /** past its date */
  past: boolean;
}
export function closeness(q: V3Query, nowMs: number): Closeness {
  const p = eyeProgress(q.row, nowMs);
  const fromMs = q.row.stageStartMs ?? q.row.sentMs ?? null;
  const toMs = q.row.expectedMs ?? null;
  return { q, f: p.dated ? p.f : null, fromMs, toMs, past: p.dated && p.f != null && p.f >= 1 };
}
/** closest first; an undated query last, then by name */
export const byCloseness = (a: Closeness, b: Closeness): number => {
  if (a.f == null && b.f == null) return a.q.row.agentName.localeCompare(b.q.row.agentName);
  if (a.f == null) return 1;
  if (b.f == null) return -1;
  return b.f - a.f || a.q.row.agentName.localeCompare(b.q.row.agentName);
};
export interface BirdsGroup { court: V3Court; rows: Closeness[] }
/** the Birds-eye view's groups: the open courts, each closest first */
export function birdsGroups(qs: readonly V3Query[], nowMs: number): BirdsGroup[] {
  return (["you", "agent", "quiet"] as V3Court[]).map((court) => ({
    court, rows: qs.filter((q) => q.court === court).map((q) => closeness(q, nowMs)).sort(byCloseness),
  })).filter((g) => g.rows.length);
}
/** Today's preview: the open queries furthest through, across every court */
export function closestOpen(qs: readonly V3Query[], nowMs: number, n = 3): Closeness[] {
  return qs.filter((q) => q.court !== "closed").map((q) => closeness(q, nowMs)).filter((c) => c.f != null).sort(byCloseness).slice(0, n);
}

/** the words at a bar's right end: what is left, or how far past the date it is */
export function closeWords(c: Closeness, nowMs: number): string {
  if (c.toMs == null) return "No date saved";
  const d = c.toMs - nowMs;
  if (d < 0) {
    const w = Math.max(1, Math.round(-d / WEEK));
    return -d < WEEK ? `${Math.max(1, Math.round(-d / DAY))} ${Math.round(-d / DAY) === 1 ? "day" : "days"} past its date` : `${w} ${w === 1 ? "wk" : "wks"} past its date`;
  }
  const days = Math.round(d / DAY);
  const verb = c.q.court === "you" ? (c.q.state === "offer" ? "Decide" : "Send") : "Reply";
  if (days < 14) return `${verb} in ${days} ${days === 1 ? "day" : "days"}`;
  const w = Math.round(days / 7);
  return `${verb} in ${w} wks`;
}

/* ── the next reply expected ── */
/** the with-the-agent query whose expected date is soonest and still ahead; null when none is */
export function nextReply(qs: readonly V3Query[], nowMs: number): V3Query | null {
  let best: V3Query | null = null;
  for (const q of qs) {
    if (q.court !== "agent" || q.replyMs == null || q.replyMs < nowMs) continue;
    if (!best || q.replyMs < (best.replyMs as number)) best = q;
  }
  return best;
}
/** every with-the-agent query still ahead of its date, soonest first (a quiet day's list) */
export function repliesAhead(qs: readonly V3Query[], nowMs: number): V3Query[] {
  return qs.filter((q) => q.court === "agent" && q.replyMs != null && q.replyMs >= nowMs).sort((a, b) => (a.replyMs as number) - (b.replyMs as number));
}

/* ── best fit ── */
/** the agents with no query yet (a withdrawn query does not count), in the writer's own Agent fit order */
export function bestFit(agents: readonly Agent[], queries: readonly Query[]): Agent[] {
  const queried = new Set(queries.filter((q) => q.status !== QueryStatus.WITHDRAWN).map((q) => q.agentId));
  return agents.filter((a) => !queried.has(a.id)).sort(fitOrder);
}

/* ── days, dates and the streak ── */
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** the earliest dated send, or null */
export function firstSentMs(rows: readonly Pick<AnalyticsRow, "sentMs">[]): number | null {
  let m: number | null = null;
  for (const r of rows) if (r.sentMs != null && Number.isFinite(r.sentMs) && (m == null || r.sentMs < m)) m = r.sentMs;
  return m;
}
/** "day N" counts the first day as day 1 */
export const dayN = (fromMs: number, nowMs: number): number => Math.max(1, Math.round((startOfDay(nowMs) - startOfDay(fromMs)) / DAY) + 1);

export interface StreakLine { weeks: number; count: number; target: number }
/** the Goals page's streak, said as the card says it; the target is the writer's weekly goal, or one query */
export function streakLine(rows: readonly Pick<AnalyticsRow, "sentMs">[], goals: readonly QueryingGoalEntry[] | undefined, nowMs: number): StreakLine {
  const s = weekStreak(rows.map((r) => r.sentMs), goals ? [...goals] : undefined, nowMs);
  const cur = s.weeks[s.weeks.length - 1];
  return { weeks: s.current, count: cur?.count ?? 0, target: Math.max(1, cur?.target ?? 1) };
}
export const weeksWord = (n: number): string => `${n} ${n === 1 ? "week" : "weeks"}`;

/** "Wednesday 11 November" */
export function longDay(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
export const dm = dayMonth;
