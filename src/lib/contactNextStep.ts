/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEXT STEP — what to do next with your agents for this book (Contact list v15 §4; v14 §2, §9). One frame,
 * THREE states, picked from the writer's data in this order:
 *
 *   ready      any agent who is READY TO QUERY (below)
 *   reopening  none ready, but some agents who are not a known mismatch are Closed with a `reopensOn` still ahead
 *   done       neither — every agent on the list is queried, doesn't take the genre, or is closed to submissions
 *
 * ⚠️ READY TO QUERY IS ONE RULE, AND THE SECTION, THE "ready to query" PILL AND "See all" ALL READ IT (§4): the
 *    agent is open (`submissionStatus !== Closed`; Unknown reads open), has no query for this manuscript, and
 *    EITHER takes one of the book's genres OR has no genres recorded. An agent whose genres ARE recorded and take
 *    none of the book's is a KNOWN MISMATCH: never ready, never reopening, counted only in the done line's note.
 * ⚠️ v14's fourth state ("A few more might fit", the no-genres agents) IS RETIRED: those agents are ready now.
 * ⚠️ THE DONE STATE ACCOUNTS FOR EVERY AGENT (§4, ruling Q3): queried + known mismatches + closed to submissions = N.
 *    "Closed to submissions" is every other unqueried agent — Closed with no reopening date, OR with one already past
 *    (a past date is not a reopening; the note's wording, "are closed to submissions", is true of both).
 * ⚠️ THE SPLIT LINE SUMS TO QUERIED (ruling Q1): each queried agent's LATEST query (by sent date) is still reading,
 *    asked for more, passed, or withdrawn — the fourth part shown only when non-zero.
 *
 * ⚠️ MATCHING IS BY FACT, NEVER BY SCORE. An agent is "ready" by facts the app already holds — genre (or its absence),
 * open door, not queried — and nothing here weighs, percentages or ranks a fit. The ORDER of the ready list: agents who
 * take the book before those whose genres are unknown; then (where the book has subGenres) main-genre takers before
 * subGenre-only; then the writer's rating; then the agent's stated reply time; then surname.
 *
 * ⚠️ EVERY COUNT IS OVER THE UNFILTERED AGENT SET (§9): the list's filters and Find never reach this.
 */
import type { Agent, Query, UserTask } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { takesBook, takesMain } from "./genreMatch";
import { statedWeeks } from "./contactStrip";
import { surnameOf } from "./contactList";

export type NextState = "ready" | "reopening" | "done";

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
  /** ready to query, in the §4 order */
  ready: Agent[];
  /** of them, those with no genres recorded ("{u} have no genres recorded") */
  unknown: number;
  /** not queried · not a known mismatch · Closed · `reopensOn` ahead — soonest first */
  reopening: Agent[];
  /** N — every agent on the list */
  total: number;
  /** agents with any query for this manuscript */
  queried: number;
  /** not queried · genres recorded · take none of the book's */
  mismatches: number;
  /** not queried · not a mismatch · Closed with no reopening date ahead */
  closed: number;
  /** the done state's split line, each queried agent's latest query: sums to `queried` */
  outcomes: { reading: number; asked: number; passed: number; withdrawn: number };
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

/** no genres recorded — we cannot tell whether the agent takes the book */
export const genresUnknown = (a: Pick<Agent, "genres">): boolean => (a.genres ?? []).filter((g) => String(g).trim()).length === 0;
/** genres recorded, and none of them the book's — never ready (a book with no genres mismatches nobody) */
export const knownMismatch = (a: Pick<Agent, "genres">, book: readonly string[]): boolean =>
  book.length > 0 && !genresUnknown(a) && !takesBook(a.genres, book);

/** The §4 ready order: takers before unknown genres; main-genre takers first (only where the book has subGenres); then
 *  the writer's rating (highest first, unrated last); then the stated reply time (fastest first, not stated last);
 *  then surname. */
export function readyOrder(book: readonly string[]): (a: Agent, b: Agent) => number {
  const split = book.length > 1;
  return (a, b) => {
    const ua = genresUnknown(a) ? 1 : 0, ub = genresUnknown(b) ? 1 : 0;
    if (ua !== ub) return ua - ub;
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

/** THE ONE READY RULE (§4): open, no query for this manuscript, and the genres take the book or are unknown. */
export function isReady(a: Agent, queried: (a: Agent) => boolean, book: readonly string[]): boolean {
  return a.submissionStatus !== SubmissionStatus.CLOSED && !queried(a) && !knownMismatch(a, book);
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

  const ready = agents.filter((a) => isReady(a, queried, book)).sort(readyOrder(book));
  const reopening = agents
    .filter((a) => !queried(a) && !knownMismatch(a, book) && a.submissionStatus === SubmissionStatus.CLOSED && dayOf(a.reopensOn) > todayIso)
    .sort((a, b) => dayOf(a.reopensOn).localeCompare(dayOf(b.reopensOn)) || surnameOf(a).localeCompare(surnameOf(b)));

  let nQueried = 0, mismatches = 0, closed = 0;
  const outcomes = { reading: 0, asked: 0, passed: 0, withdrawn: 0 };
  for (const a of agents) {
    const qs = byAgent.get(a.id);
    if (qs?.length) {
      nQueried += 1;
      const latest = [...qs].sort((p, q) => queryTime(q) - queryTime(p))[0];
      if (ASKED_MORE.has(latest.status)) outcomes.asked += 1;
      else if (PASSED.has(latest.status)) outcomes.passed += 1;
      else if (latest.status === QueryStatus.WITHDRAWN) outcomes.withdrawn += 1;
      else outcomes.reading += 1;
    } else if (knownMismatch(a, book)) mismatches += 1;
    else if (a.submissionStatus === SubmissionStatus.CLOSED && !(dayOf(a.reopensOn) > todayIso)) closed += 1;
  }

  const state: NextState = ready.length ? "ready" : reopening.length ? "reopening" : "done";
  return {
    state, ready, unknown: ready.filter(genresUnknown).length, reopening,
    total: agents.length, queried: nQueried, mismatches, closed, outcomes,
  };
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
