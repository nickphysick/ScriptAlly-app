/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v3 (ref design-refs/dashboard-v3.html) — the page's four new readings, each composed from an existing
 * derivation and nowhere re-derived:
 *
 *   - `stageMarks`    the header's marks: current-stage counts (`stageOf` over the derived `status`, as the Query Centre)
 *   - `howItsGoing`   the chart's third view: queries sent, asked for more, offers (`analytics.buildRows`' history rungs)
 *   - `expectedBack`  the Expected back card: the Query Centre's ONE clock (`buildQcRows` → `expectedFor`)
 *   - `withoutContradictions`  Next up never offers a nudge (or a close) to an agent who has asked for materials
 *
 * ⚠️ FACTS ONLY. Nothing here grades a figure, compares it with anyone else's or calls a date late.
 */
import type { Activity, Agent, Query } from "../types";
import { QueryStatus } from "../types";
import { stageOf, type Stage } from "./stageColours";
import { buildRows as analyticsRows } from "./analytics";
import type { QcRow } from "./qcSummary";
import { shortDay, shortWeekDay } from "./qcSummary";
import type { ListPlan } from "./dashList";

/* ── the header's stage marks ─────────────────────────────────────────────────────────────── */

export const MARK_ORDER: readonly Stage[] = ["queried", "partial", "full", "offer", "closed"];
export const MARK_WORD: Record<Stage, string> = { queried: "queried", partial: "partial", full: "full", offer: "offer", closed: "closed" };
/** the status the real StatusDot draws for each stage's mark: the request (dashed ring) for partial and full */
export const MARK_STATUS: Record<Stage, QueryStatus> = {
  queried: QueryStatus.QUERIED,
  partial: QueryStatus.PARTIAL_REQUESTED,
  full: QueryStatus.FULL_REQUESTED,
  offer: QueryStatus.OFFER,
  closed: QueryStatus.REJECTED,
};
export interface StageMark { stage: Stage; n: number }

/** Each stage with at least one query, in the fixed order; closed last. No queries → no marks. */
export function stageMarks(scopedQueries: readonly Pick<Query, "status">[]): StageMark[] {
  const n: Record<Stage, number> = { queried: 0, partial: 0, full: 0, offer: 0, closed: 0 };
  for (const q of scopedQueries) n[stageOf(q.status)] += 1;
  return MARK_ORDER.filter((s) => n[s] > 0).map((s) => ({ stage: s, n: n[s] }));
}

/* ── How it's going ───────────────────────────────────────────────────────────────────────── */

export interface HowItsGoing {
  /** every query for the manuscript */
  sent: number;
  /** ever reached a partial or full request (including ones since closed) */
  asked: number;
  /** of those, how many reached the full */
  full: number;
  /** ever reached an offer */
  offers: number;
  /** closed without ever reaching a request */
  closedNoRequest: number;
}

export function howItsGoing(scopedQueries: readonly Query[], activities: readonly Activity[], agents: readonly Agent[], nowMs: number): HowItsGoing {
  const rows = analyticsRows([...scopedQueries], [...activities], [...agents], nowMs);
  const status = new Map(scopedQueries.map((q) => [q.id, q.status]));
  return {
    sent: rows.length,
    asked: rows.filter((r) => r.reachedRequest).length,
    full: rows.filter((r) => r.reachedRequest && r.reachedFull).length,
    offers: rows.filter((r) => r.reachedOffer).length,
    closedNoRequest: rows.filter((r) => !r.reachedRequest && stageOf(status.get(r.id) ?? "") === "closed").length,
  };
}

const NUM = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const wordOf = (n: number) => (n <= 9 ? NUM[n] : undefined) ?? n.toLocaleString("en-GB");
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** "2 of 23 agents asked to read more." */
export const goingHeading = (g: HowItsGoing): string => `${g.asked.toLocaleString("en-GB")} of ${g.sent.toLocaleString("en-GB")} ${plural(g.sent, "agent", "agents")} asked to read more.`;

/** "One full and one partial. 3 queries closed without a request." — counts, nothing else */
export function goingSub(g: HowItsGoing): string {
  const partial = g.asked - g.full;
  /* words for one to nine, unless any count in the line passes nine — then digits throughout, never "15 and seven" */
  const word = Math.max(g.full, partial) > 9 ? (n: number) => n.toLocaleString("en-GB") : wordOf;
  const parts: string[] = [];
  if (g.full > 0) parts.push(`${word(g.full).toLowerCase()} ${plural(g.full, "full", "fulls")}`);
  if (partial > 0) parts.push(`${word(partial).toLowerCase()} ${plural(partial, "partial", "partials")}`);
  const first = parts.length ? parts.join(" and ") : "no requests yet";
  const lead = `${first.charAt(0).toUpperCase()}${first.slice(1)}.`;
  const closed = g.closedNoRequest > 0
    ? ` ${g.closedNoRequest.toLocaleString("en-GB")} ${plural(g.closedNoRequest, "query", "queries")} closed without a request.`
    : " Nothing closed yet.";
  return lead + closed;
}

/* ── Expected back ────────────────────────────────────────────────────────────────────────── */

export const EXPECTED_SHOWN = 3;
export const PAST_SHOWN = 2;

export interface ExpectedRow {
  id: string;
  agent: string;
  agency: string;
  ms: number;
  /** last step → expected date, 0–1; null for a row past its date (no bar) */
  progress: number | null;
  /** "by Wed 18 Nov" or "since 12 Oct" */
  when: string;
}

export interface ExpectedBack {
  /** due by the end of this Monday–Sunday week (and not yet past) */
  thisWeek: number;
  /** the soonest due, up to three */
  soon: ExpectedRow[];
  /** past their date, oldest first */
  pastCount: number;
  past: ExpectedRow[];
  /** due, beyond the rows shown */
  more: number;
  /** waiting on an agent with a date at all */
  waiting: number;
}

/** midnight at the start of next Monday, local time */
export function weekEndMs(nowMs: number): number {
  const d = new Date(nowMs);
  const sinceMon = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMon + 7).getTime();
}

/**
 * ⚠️ ONLY THE QUERY CENTRE'S CLOCK: a row counts when its court is the agent's and `expectedFor` gave it a date. A
 * query with no stated window has no date here, exactly as on its card.
 */
export function expectedBack(qcRows: readonly QcRow[], nowMs: number): ExpectedBack {
  const waiting = qcRows.filter((r) => r.court === "agent" && r.expectedMs != null);
  const due = waiting.filter((r) => (r.expectedMs as number) > nowMs).sort((a, b) => (a.expectedMs as number) - (b.expectedMs as number));
  const pastAll = waiting.filter((r) => (r.expectedMs as number) <= nowMs).sort((a, b) => (a.expectedMs as number) - (b.expectedMs as number));
  const end = weekEndMs(nowMs);
  const soon = due.slice(0, EXPECTED_SHOWN).map((r): ExpectedRow => {
    const ms = r.expectedMs as number;
    const from = r.stageStartMs ?? r.sentMs;
    const progress = from != null && ms > from ? Math.min(1, Math.max(0, (nowMs - from) / (ms - from))) : 0;
    return { id: r.id, agent: r.agentName, agency: r.agency, ms, progress, when: `by ${shortWeekDay(ms)}` };
  });
  const past = pastAll.slice(0, PAST_SHOWN).map((r): ExpectedRow => {
    const ms = r.expectedMs as number;
    return { id: r.id, agent: r.agentName, agency: r.agency, ms, progress: null, when: `since ${shortDay(ms)}` };
  });
  return {
    thisWeek: due.filter((r) => (r.expectedMs as number) < end).length,
    soon, pastCount: pastAll.length, past,
    more: Math.max(0, due.length - soon.length),
    waiting: waiting.length,
  };
}

export const expectedHeading = (e: ExpectedBack): string =>
  e.thisWeek > 0 ? `${e.thisWeek.toLocaleString("en-GB")} ${plural(e.thisWeek, "reply", "replies")} expected this week.` : "Nothing due back this week.";
export const pastHeading = (n: number): string => `${n.toLocaleString("en-GB")} ${plural(n, "is", "are")} past ${plural(n, "its", "their")} date`;
export const moreLine = (n: number): string => `${n.toLocaleString("en-GB")} more ${plural(n, "is", "are")} within ${plural(n, "its", "their")} reply window.`;

/* ── Next up: no two tasks that contradict each other for one agent ───────────────────────── */

/**
 * An agent who has asked for materials ("Agents are waiting") is never also offered as a nudge or a close. The plan's
 * own order and groups are kept; only the contradicting items go.
 */
export function withoutContradictions(plan: ListPlan, queries: readonly Pick<Query, "id" | "agentId">[]): ListPlan {
  const agentOf = new Map(queries.map((q) => [q.id, q.agentId]));
  const qidOf = (a: ListPlan["items"][number]["action"]) => (a.kind === "drawer" ? a.request.queryId ?? null : null);
  const asked = new Set<string>();
  for (const it of plan.items) {
    const qid = qidOf(it.action);
    const ag = qid ? agentOf.get(qid) : undefined;
    if (it.group === "req" && ag) asked.add(ag);
  }
  if (asked.size === 0) return plan;
  const keep = (it: ListPlan["items"][number]) => {
    if (it.group !== "nudge" && it.group !== "quiet") return true;
    const qid = qidOf(it.action);
    const ag = qid ? agentOf.get(qid) : undefined;
    return !(ag && asked.has(ag));
  };
  const items = plan.items.filter(keep);
  if (items.length === plan.items.length) return plan;
  const groups = plan.groups.map((g) => ({ ...g, items: g.items.filter(keep) })).filter((g) => g.items.length > 0);
  return { ...plan, items, groups };
}
