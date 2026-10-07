/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEXT STEP — what to do next with your agents for this book (Contact list v14 §2, §9). One frame, four
 * states, picked from the writer's data in this order:
 *
 *   ready      any agent who takes the book, is open, and has no query for this manuscript
 *   reopening  none ready, but some who take the book are Closed with a `reopensOn` still ahead
 *   gaps       none of those, but some not-queried agents have no genres recorded (we cannot tell yet)
 *   done       none of the above — every agent who takes the book has it
 *
 * ⚠️ MATCHING IS BY FACT, NEVER BY SCORE (§1.5). An agent is "ready" by three facts the app already holds —
 * genre, open door, not queried — and nothing here weighs, percentages or ranks a fit. The ORDER of the
 * ready list is the writer's own rating, then the agent's stated reply time, then surname; where the book has
 * subGenres, agents who take its MAIN genre come first.
 *
 * ⚠️ EVERY COUNT IS OVER THE UNFILTERED AGENT SET (§9): the list's filters and Find never reach this.
 */
import type { Agent, Query, UserTask } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { takesBook, takesMain } from "./genreMatch";
import { statedWeeks } from "./contactStrip";
import { surnameOf } from "./contactList";

export type NextState = "ready" | "reopening" | "gaps" | "done";

export interface NextStepInput {
  agents: readonly Agent[];
  queries: readonly Query[];
  /** the manuscript in scope; null reads every query as "this book's" */
  msId: string | null;
  /** `bookGenres(manuscript)` — main first */
  book: readonly string[];
  /** today, local, YYYY-MM-DD — "reopens in the future" compares against it */
  todayIso: string;
}

export interface NextStep {
  state: NextState;
  /** takes the book · open · not queried — in the §9 order */
  ready: Agent[];
  /** takes the book · Closed · `reopensOn` ahead — soonest first */
  reopening: Agent[];
  /** not queried · no genres recorded — by surname */
  gaps: Agent[];
  /** f — every agent who takes the book */
  takers: number;
  /** m — those of them with a query for this manuscript */
  sent: number;
  /** the done state's line: still reading · asked to see more · passed (each agent's latest query) */
  outcomes: { reading: number; more: number; passed: number };
}

/** the date part of a stored date, so "2026-11-01" and "2026-11-01T00:00:00.000Z" compare as one day */
export const dayOf = (iso: string | null | undefined): string => String(iso ?? "").trim().slice(0, 10);

const ASKED_MORE = new Set<QueryStatus>([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED, QueryStatus.OFFER, QueryStatus.SIGNED,
]);
const PASSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE]);

const queryTime = (q: Query): number => {
  const t = Date.parse(String(q.dateSent ?? ""));
  return Number.isFinite(t) ? t : 0;
};

/** The §9 ready order: main-genre takers first (only where the book has subGenres), then the writer's rating
 *  (highest first, unrated last), then the stated reply time (fastest first, not stated last), then surname. */
export function readyOrder(book: readonly string[]): (a: Agent, b: Agent) => number {
  const split = book.length > 1;
  return (a, b) => {
    if (split) {
      const ma = takesMain(a.genres, book) ? 0 : 1, mb = takesMain(b.genres, book) ? 0 : 1;
      if (ma !== mb) return ma - mb;
    }
    const ra = typeof a.starRating === "number" ? a.starRating : 0;
    const rb = typeof b.starRating === "number" ? b.starRating : 0;
    if (ra !== rb) return rb - ra;
    const wa = statedWeeks(a), wb = statedWeeks(b);
    if (wa !== wb) return wa === null ? 1 : wb === null ? -1 : wa - wb;
    return surnameOf(a).localeCompare(surnameOf(b));
  };
}

export function nextStep(input: NextStepInput): NextStep {
  const { agents, queries, msId, book, todayIso } = input;
  const mine = (q: Query) => !msId || q.manuscriptId === msId;
  const byAgent = new Map<string, Query[]>();
  for (const q of queries) {
    if (!mine(q)) continue;
    const list = byAgent.get(q.agentId) ?? [];
    list.push(q);
    byAgent.set(q.agentId, list);
  }
  const queried = (a: Agent) => (byAgent.get(a.id)?.length ?? 0) > 0;
  const takers = agents.filter((a) => takesBook(a.genres, book));

  const ready = takers
    .filter((a) => a.submissionStatus !== SubmissionStatus.CLOSED && !queried(a))
    .sort(readyOrder(book));
  const reopening = takers
    .filter((a) => a.submissionStatus === SubmissionStatus.CLOSED && dayOf(a.reopensOn) > todayIso)
    .sort((a, b) => dayOf(a.reopensOn).localeCompare(dayOf(b.reopensOn)) || surnameOf(a).localeCompare(surnameOf(b)));
  const gaps = agents
    .filter((a) => !queried(a) && (a.genres ?? []).length === 0)
    .sort((a, b) => surnameOf(a).localeCompare(surnameOf(b)));

  const outcomes = { reading: 0, more: 0, passed: 0 };
  let sent = 0;
  for (const a of takers) {
    const qs = byAgent.get(a.id);
    if (!qs?.length) continue;
    sent += 1;
    const latest = [...qs].sort((p, q) => queryTime(q) - queryTime(p))[0];
    if (latest.status === QueryStatus.QUERIED) outcomes.reading += 1;
    else if (ASKED_MORE.has(latest.status)) outcomes.more += 1;
    else if (PASSED.has(latest.status)) outcomes.passed += 1;
  }

  const state: NextState = ready.length ? "ready" : reopening.length ? "reopening" : gaps.length ? "gaps" : "done";
  return { state, ready, reopening, gaps, takers: takers.length, sent, outcomes };
}

/** The writer's reminder for the day this agent reopens — an undone dated task on that agent for exactly
 *  that day — or null. "✓ Reminder set" reads this; pressing it again deletes the task it found. */
export function reopenReminderTask(agent: Pick<Agent, "id" | "reopensOn">, tasks: readonly UserTask[]): UserTask | null {
  const day = dayOf(agent.reopensOn);
  if (!day) return null;
  return tasks.find((t) => t.agentId === agent.id && !t.done && dayOf(t.dueDate) === day) ?? null;
}

/** Days from today to an ISO day, never negative — "Reopens in N days". */
export function daysUntil(isoDay: string, todayIso: string): number {
  const a = Date.parse(`${dayOf(isoDay)}T00:00:00`), b = Date.parse(`${todayIso}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((a - b) / 86_400_000));
}
