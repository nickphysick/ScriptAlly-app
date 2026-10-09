/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.2 §2 — THE DESK's three cards, as data. Pure; the page renders them (ContactDesk).
 *
 *   On file    "{N} agents on file"         · month on month: agents added   · a line: six month-end points
 *   Queried    "{queried} of {N} queried"   · month on month: first queried  · a ring: active · closed · not yet queried
 *   Profiles   "{pct}% profiles complete"   · month on month: HIDDEN         · a bar: the share complete
 *
 * ⚠️ A CARD NEVER STATES ONE FACT TWICE: the line carries the figure, the month-on-month line its change, the chart its
 *    shape. (v15's stamps, two-row lists and weekly bars are retired with its cards.)
 * ⚠️ QUERIED IS THE CURRENT MANUSCRIPT'S: an agent with any query for it, active or finished. Each agent is read by its
 *    LATEST query (by sent date); closed = passed, no response or withdrawn (ruling Q1: withdrawn counts as closed).
 * ⚠️ MONTH ON MONTH COMPARES WITH THE END OF LAST MONTH. On file's is the agents added this calendar month and Queried's
 *    the agents first queried in it — so on today's data neither can be negative (the history knows only agents that
 *    still exist, and an import lands as one step). `monthOnMonth` still states the down case, for the day one can.
 * ⚠️ PROFILES HAS NO MONTH-ON-MONTH LINE (`mom: null`): no monthly completion snapshot exists, so there is nothing true
 *    to say (v15 ruling 3, unchanged).
 */
import { QueryStatus, type Agent, type Query } from "../types";
import { formatDate } from "./dates";

/** a month-on-month line: which way, by how much, and its words */
export interface MoM { dir: "up" | "down" | "none"; n: number; text: string }
/** "{n} since last month" (Profiles: "{n} pts since last month"); zero reads "No change since last month" */
export function monthOnMonth(delta: number, unit = ""): MoM {
  const n = Math.abs(Math.round(delta));
  if (n === 0) return { dir: "none", n: 0, text: "No change since last month" };
  return { dir: delta > 0 ? "up" : "down", n, text: `${n}${unit ? ` ${unit}` : ""} since last month` };
}

export interface OnFileTrend { values: number[]; startLabel: string }
export interface DeskModel {
  /** "{N} agents on file" — the figure, then the rest of the line */
  file: { figure: string; rest: string; label: string; mom: MoM | null; trend: OnFileTrend };
  /** "{queried} of {N} queried" */
  queried: { figure: string; rest: string; label: string; mom: MoM | null; queried: number; active: number; closed: number; total: number };
  /** "{pct}% profiles complete" */
  profiles: { figure: string; rest: string; label: string; mom: MoM | null; pct: number; filled: number; total: number };
}

const CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]);
/** a month's short name, through the one formatter (lib/dates) and never a table of our own */
const monthName = (d: Date): string => formatDate(d, { month: "short" });

const ms = (iso: string | null | undefined): number | null => {
  const t = Date.parse(String(iso ?? ""));
  return Number.isFinite(t) ? t : null;
};
/** midnight on the 1st of `now`'s month, local */
const monthStart = (now: Date): number => new Date(now.getFullYear(), now.getMonth(), 1).getTime();

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
  /* ── Profiles complete ── */
  const pct = hk.total ? Math.round((hk.complete / hk.total) * 100) : 0;

  return {
    file: {
      figure: String(n), rest: n === 1 ? "agent on file" : "agents on file",
      label: `${n} ${n === 1 ? "agent" : "agents"} on file`,
      mom: monthOnMonth(added), trend: { values: trendValues, startLabel: monthName(firstMonth) },
    },
    queried: {
      figure: String(queried), rest: `of ${n} queried`,
      label: `${queried} of ${n} ${n === 1 ? "agent" : "agents"} queried: ${active} active, ${closedQ} closed`,
      mom: monthOnMonth(firstThisMonth), queried, active, closed: closedQ, total: n,
    },
    profiles: {
      figure: `${pct}%`, rest: "profiles complete",
      label: `${pct}% of profiles complete: ${hk.complete} of ${hk.total}`,
      mom: null, pct, filled: hk.complete, total: hk.total,
    },
  };
}
