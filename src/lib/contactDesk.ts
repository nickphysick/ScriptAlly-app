/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 §3 — THE DESK's three cards, as data. Pure; the page renders them (ContactDesk).
 *
 *   On file            N agents · {open} open to submissions · {closed} closed for now · six month-end points
 *   Queried            {queried} of N · {active} active now · {closed} closed · thirteen weekly bars
 *   Profiles complete  {pct}% · {gaps} gaps to fill · {agents} agents affected · a progress bar
 *
 * ⚠️ A CARD NEVER STATES ONE FACT TWICE: the stamp carries "+n this month", so no row repeats it.
 * ⚠️ QUERIED IS THE CURRENT MANUSCRIPT'S: an agent with any query for it, active or finished. Each agent is read by its
 *    LATEST query (by sent date); closed = passed, no response or withdrawn (ruling Q1: withdrawn counts as closed).
 * ⚠️ A QUERY WITH NO SENT DATE counts as queried and is in no bar (ruling 5–6): an undated import is a fact about the
 *    agent, not about a week.
 * ⚠️ THE ON-FILE HISTORY knows only agents that still exist, and an import lands as one step (ruling 5–6).
 * ⚠️ THE PROFILES STAMP IS NULL: no monthly completion snapshot exists, so there is nothing true to say (ruling 3).
 */
import { QueryStatus, SubmissionStatus, type Agent, type Query } from "../types";
import { dayMonth, formatDate } from "./dates";

export interface DeskRow { n: number; text: string; tone?: "blue" | "terra" }
export interface DeskCardModel {
  key: "file" | "queried" | "profiles";
  title: string;
  /** "+n this month", "No change this month", or null (no history to say it from) */
  stamp: string | null;
  big: string;
  small: string | null;
  rows: [DeskRow, DeskRow];
}
export interface OnFileTrend { values: number[]; startLabel: string }
export interface WeekBars { values: number[]; startLabel: string }
export interface ProfilesBar { filled: number; total: number; label: string }
export interface DeskModel {
  file: DeskCardModel & { trend: OnFileTrend };
  queried: DeskCardModel & { bars: WeekBars };
  profiles: DeskCardModel & { bar: ProfilesBar };
}

const CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]);
/** a month's short name, through the one formatter (lib/dates) and never a table of our own */
const monthName = (d: Date): string => formatDate(d, { month: "short" });

const ms = (iso: string | null | undefined): number | null => {
  const t = Date.parse(String(iso ?? ""));
  return Number.isFinite(t) ? t : null;
};
/** the stamp's words: a gain this month, or "No change this month" (the Query Centre desk's own zero) */
export const monthStamp = (n: number): string => (n > 0 ? `+${n} this month` : "No change this month");

/** midnight on the 1st of `now`'s month, local */
const monthStart = (now: Date): number => new Date(now.getFullYear(), now.getMonth(), 1).getTime();
/** Monday 00:00 of the week holding `t`, local */
const weekStart = (t: number): number => {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

export interface DeskInput {
  agents: readonly Agent[];
  queries: readonly Query[];
  /** the manuscript in scope; null reads every query */
  msId: string | null;
  now: Date;
  /** Housekeeping's own completeness (hkModel): agents with no gap, visible gaps, agents with a visible gap */
  hk: { complete: number; total: number; gaps: number; gapAgents: number };
}

export function deskModel({ agents, queries, msId, now, hk }: DeskInput): DeskModel {
  const n = agents.length;
  const start = monthStart(now);
  const nowMs = now.getTime();

  /* ── On file ── */
  const closedDoor = agents.filter((a) => a.submissionStatus === SubmissionStatus.CLOSED).length;
  const added = agents.filter((a) => { const t = ms(a.dateAdded); return t !== null && t >= start && t <= nowMs; }).length;
  /* six month-end points: the end of each of the five months before this one, then now */
  const ends: number[] = [];
  for (let k = 5; k >= 1; k--) ends.push(new Date(now.getFullYear(), now.getMonth() - k + 1, 1).getTime() - 1);
  ends.push(nowMs);
  const trendValues = ends.map((e) => agents.filter((a) => { const t = ms(a.dateAdded); return t === null || t <= e; }).length);
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  /* ── Queried ── */
  const mine = queries.filter((q) => !msId || q.manuscriptId === msId);
  const byAgent = new Map<string, Query[]>();
  for (const q of mine) { const l = byAgent.get(q.agentId) ?? []; l.push(q); byAgent.set(q.agentId, l); }
  const ids = new Set(agents.map((a) => a.id));
  let queried = 0, active = 0, closedQ = 0, firstThisMonth = 0;
  for (const [id, qs] of byAgent) {
    if (!ids.has(id)) continue;
    queried += 1;
    const latest = [...qs].sort((p, q) => (ms(q.dateSent) ?? 0) - (ms(p.dateSent) ?? 0))[0];
    if (CLOSED.has(latest.status)) closedQ += 1; else active += 1;
    const dated = qs.map((q) => ms(q.dateSent)).filter((t): t is number => t !== null);
    if (dated.length && Math.min(...dated) >= start && Math.min(...dated) <= nowMs) firstThisMonth += 1;
  }
  const thisWeek = weekStart(nowMs);
  const weeks = Array.from({ length: 13 }, (_, i) => thisWeek - (12 - i) * 7 * 86400000);
  const bars = weeks.map((w0, i) => {
    const w1 = i < 12 ? weeks[i + 1] : Infinity;
    return mine.filter((q) => { const t = ms(q.dateSent); return t !== null && ids.has(q.agentId) && t >= w0 && t < w1; }).length;
  });

  /* ── Profiles complete ── */
  const pct = hk.total ? Math.round((hk.complete / hk.total) * 100) : 0;

  return {
    file: {
      key: "file", title: "On file", stamp: monthStamp(added), big: String(n), small: n === 1 ? "agent" : "agents",
      rows: [{ n: n - closedDoor, text: "open to submissions" }, { n: closedDoor, text: "closed for now" }],
      trend: { values: trendValues, startLabel: monthName(firstMonth) },
    },
    queried: {
      key: "queried", title: "Queried", stamp: monthStamp(firstThisMonth), big: String(queried), small: `of ${n}`,
      rows: [{ n: active, text: "active now", tone: "blue" }, { n: closedQ, text: "closed" }],
      bars: { values: bars, startLabel: monthName(new Date(weeks[0])) },
    },
    profiles: {
      key: "profiles", title: "Profiles complete", stamp: null, big: `${pct}%`, small: null,
      rows: [{ n: hk.gaps, text: hk.gaps === 1 ? "gap to fill" : "gaps to fill", tone: "terra" }, { n: hk.gapAgents, text: hk.gapAgents === 1 ? "agent affected" : "agents affected" }],
      bar: { filled: hk.complete, total: hk.total, label: `${hk.complete} of ${hk.total} profiles complete` },
    },
  };
}

/** for a tooltip or an aria label: "w/c 4 Aug" */
export const weekLabel = (t: number): string => `w/c ${dayMonth(t)}`;
