/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.2 §2, v15.3 §4 — THE DESK's three cards, as data. Pure; the page renders them (ContactDesk).
 *
 *   This week  "{n} added this week"        · against last week: more/fewer/same · 8 weekly bars, this week last
 *   Queried    "{queried} of {N} queried"   · month on month: first queried  · a ring: active · closed · not yet queried
 *   Profiles   "{pct}% profiles complete"   · month on month: HIDDEN         · a bar: the share complete
 *
 * ⚠️ A CARD NEVER STATES ONE FACT TWICE: the line carries the figure, the month-on-month line its change, the chart its
 *    shape. (v15's stamps, two-row lists and weekly bars are retired with its cards.)
 * ⚠️ QUERIED IS THE CURRENT MANUSCRIPT'S: an agent with any query for it, active or finished. Each agent is read by its
 *    LATEST query (by sent date); closed = passed, no response or withdrawn (ruling Q1: withdrawn counts as closed).
 * ⚠️ THE FIRST CARD IS ABOUT THIS WEEK (v15.3): the count on file is the header's hero number, so "{N} agents on file",
 *    its month-on-month line and its six-point line are RETIRED from the desk. Weeks are Monday to Sunday by the London
 *    calendar (`lib/qcDeskWeeks`), counted from `dateAdded`; an agent with no readable date is in no week.
 * ⚠️ ONE STATUS PER AGENT, ONE FUNCTION: `agentQueryStates` is what the Queried card counts AND what the header's faces
 *    and key read (`lib/contactFaces`), so the key's numbers and the ring cannot disagree.
 * ⚠️ MONTH ON MONTH COMPARES WITH THE END OF LAST MONTH. Queried's is the agents first queried this calendar month, so
 *    on today's data it cannot be negative. `monthOnMonth` still states the down case, for the day one can.
 * ⚠️ PROFILES HAS NO MONTH-ON-MONTH LINE (`mom: null`): no monthly completion snapshot exists, so there is nothing true
 *    to say (v15 ruling 3, unchanged).
 */
import { QueryStatus, type Agent, type Query } from "../types";
import { deskWeeks } from "./qcDeskWeeks";

/** a month-on-month line: which way, by how much, and its words */
export interface MoM { dir: "up" | "down" | "none"; n: number; text: string }
/** "{n} since last month" (Profiles: "{n} pts since last month"); zero reads "No change since last month" */
export function monthOnMonth(delta: number, unit = ""): MoM {
  const n = Math.abs(Math.round(delta));
  if (n === 0) return { dir: "none", n: 0, text: "No change since last month" };
  return { dir: delta > 0 ? "up" : "down", n, text: `${n}${unit ? ` ${unit}` : ""} since last month` };
}

/** this week against last: "{d} more than last week" · "{d} fewer than last week" · "Same as last week" */
export function weekOnWeek(thisWeek: number, lastWeek: number): MoM {
  const d = thisWeek - lastWeek, n = Math.abs(d);
  if (d === 0) return { dir: "none", n: 0, text: "Same as last week" };
  return { dir: d > 0 ? "up" : "down", n, text: `${n} ${d > 0 ? "more" : "fewer"} than last week` };
}

export const WEEK_BARS = 8;
/** an agent's query status for the manuscript in scope */
export type AgentQueryState = "active" | "closed" | "none";

export interface DeskModel {
  /** "{n} added this week" — the figure, then the rest of the line; `bars` is 8 weeks, oldest first, this week last */
  /** `month` is the agents added in the current calendar month (header panel v2: the badge card's second tile) */
  week: { figure: string; rest: string; label: string; mom: MoM; bars: number[]; total: number; month: number };
  /** "{queried} of {N} queried" */
  queried: { figure: string; rest: string; label: string; mom: MoM | null; queried: number; active: number; closed: number; total: number };
  /** "{pct}% profiles complete" */
  profiles: { figure: string; rest: string; label: string; mom: MoM | null; pct: number; filled: number; total: number };
}

const CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]);
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

/** Each agent's queries for the manuscript in scope, and the status its LATEST one (by sent date) gives it.
    `at` is the agent's most recent query activity (the latest status change or send), 0 when nothing is dated. */
export interface AgentQueryFact { state: AgentQueryState; at: number; queries: Query[] }
export function agentQueryStates(agents: readonly Agent[], queries: readonly Query[], msId: string | null): Map<string, AgentQueryFact> {
  const byAgent = new Map<string, Query[]>();
  for (const q of queries) {
    if (msId && q.manuscriptId !== msId) continue;
    const l = byAgent.get(q.agentId) ?? []; l.push(q); byAgent.set(q.agentId, l);
  }
  const out = new Map<string, AgentQueryFact>();
  for (const a of agents) {
    const qs = byAgent.get(a.id) ?? [];
    if (!qs.length) { out.set(a.id, { state: "none", at: 0, queries: qs }); continue; }
    const latest = [...qs].sort((p, q) => (ms(q.dateSent) ?? 0) - (ms(p.dateSent) ?? 0))[0];
    const at = Math.max(0, ...qs.flatMap((q) => [ms(q.lastStatusChange), ms(q.dateSent)]).filter((t): t is number => t !== null));
    out.set(a.id, { state: CLOSED.has(latest.status) ? "closed" : "active", at, queries: qs });
  }
  return out;
}

export function deskModel({ agents, queries, msId, now, hk }: DeskInput): DeskModel {
  const n = agents.length;
  const start = monthStart(now);
  const nowMs = now.getTime();

  /* ── Added this week: 8 London weeks, oldest first; a week runs from its Monday to the next ── */
  const starts = deskWeeks(nowMs, WEEK_BARS);
  const bars = starts.map(() => 0);
  for (const a of agents) {
    const t = ms(a.dateAdded);
    if (t === null || t < starts[0] || t > nowMs) continue;
    let i = starts.length - 1;
    while (i > 0 && t < starts[i]) i -= 1;
    bars[i] += 1;
  }
  const thisWeek = bars[WEEK_BARS - 1], lastWeek = bars[WEEK_BARS - 2];
  const total8 = bars.reduce((s, v) => s + v, 0);
  /* added this month: `dateAdded` on or after the first of the current month, and not in the future */
  const addedThisMonth = agents.filter((a) => { const t = ms(a.dateAdded); return t !== null && t >= start && t <= nowMs; }).length;

  /* ── Queried ── */
  let queried = 0, active = 0, closedQ = 0, firstThisMonth = 0;
  for (const f of agentQueryStates(agents, queries, msId).values()) {
    if (f.state === "none") continue;
    queried += 1;
    if (f.state === "closed") closedQ += 1; else active += 1;
    const dated = f.queries.map((q) => ms(q.dateSent)).filter((t): t is number => t !== null);
    if (dated.length && Math.min(...dated) >= start && Math.min(...dated) <= nowMs) firstThisMonth += 1;
  }
  /* ── Profiles complete ── */
  const pct = hk.total ? Math.round((hk.complete / hk.total) * 100) : 0;

  return {
    week: {
      figure: String(thisWeek), rest: "added this week",
      label: `${thisWeek} ${thisWeek === 1 ? "agent" : "agents"} added this week, ${total8} in the last 8 weeks`,
      mom: weekOnWeek(thisWeek, lastWeek), bars, total: total8, month: addedThisMonth,
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
