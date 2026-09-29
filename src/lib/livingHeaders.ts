/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LIVING HEADERS — the two lines that change (ref design-refs/page-header/living-headers-v2.html).
 *
 * Three jobs, none overlapping: the HEADLINE is the scale (derived from the count alone), the SUBLINE
 * is the one thing that needs the writer next, and the tiles are the breakdown. So the subline never
 * carries a count — the tiles already do.
 *
 * ⚠️ NO NEW ENGINE. Every fact here is one the app already derives: the court, the owed item, the
 * offer and every expected date come from `QcRow` (`buildQcRows`), and "a nudge is due" is
 * `replyTaskFor` (lib/taskPrecedence) — the rule the To-do generator uses. Dates go through the one
 * shared formatter (lib/dates), which is why "Sept" cannot appear.
 *
 * ⚠️ FACTS ONLY. No apology, no judgement, no instruction; an overdue date is stated in the past tense
 * ("was due"), which is a fact about the calendar, not a verdict on the writer. And no gendered
 * pronoun for an agent: the app does not know one (CLAUDE.md), so the brief's "you haven't queried
 * her yet" reads "them".
 */
import type { Agent } from "../types";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { replyTaskFor } from "./taskPrecedence";
import { dayMonth, formatDate } from "./dates";
import { agentPrimary } from "./agentDisplay";
import type { LivingLine, LivingRun } from "./livingLine";

const DAY = 86_400_000;
const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** "Sat 3 Oct" — the shared formatter's fixed three-letter month. */
export const dayDate = (ms: number): string => formatDate(ms, { weekday: "short", day: "numeric", month: "short" });

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** A number of things in words, so a sentence never carries a count in figures (LH9). */
export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  return "a hundred or more";
}

export interface PressingContext {
  /** The page's rows, already scoped to its manuscript. */
  rows: readonly QcRow[];
  agentsById: ReadonlyMap<string, Agent>;
  nowMs: number;
}

const OWED_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "partial",
  [QueryStatus.FULL_REQUESTED]: "full",
  [QueryStatus.REVISE_RESUBMIT]: "revision",
};

/** The queries whose nudge is due — the To-do generator's own rule. */
export function nudgesDue(ctx: PressingContext): QcRow[] {
  return ctx.rows.filter((r) => r.court === "agent" && replyTaskFor(r.query, ctx.agentsById.get(r.query.agentId), ctx.nowMs) === "nudge");
}

/**
 * THE PRESSING SENTENCE — one sentence, naming at most two things, the first case that matches:
 *  1. something owed by the writer, overdue or due soonest (+ how many nudges are waiting);
 *  2. otherwise a nudge that is due;
 *  3. otherwise the next expected reply;
 *  4. otherwise nothing needs the writer today.
 */
export function pressingSentence(ctx: PressingContext): LivingRun[] {
  const today = startOfDay(ctx.nowMs);
  const nudges = nudgesDue(ctx);

  /* 1 — owed: the writer's court (partial, full, revision) and offers; dated first, soonest first */
  const owed = ctx.rows.filter((r) => r.court === "you" || r.court === "offer")
    .sort((a, b) => (a.expectedMs ?? Infinity) - (b.expectedMs ?? Infinity));
  if (owed.length) {
    const r = owed[0];
    const when = r.expectedMs == null ? null : `${startOfDay(r.expectedMs) < today ? "was" : "is"} due ${dayDate(r.expectedMs)}`;
    const tail = nudges.length ? `, and ${numberWords(nudges.length)} ${nudges.length === 1 ? "nudge is" : "nudges are"} waiting.` : ".";
    if (r.court === "offer") {
      return ["Your decision on ", { b: `${r.agentName}’s` }, when ? ` offer ${when}` : " offer is waiting on you", tail];
    }
    const what = OWED_WORD[r.status] ?? "materials";
    return [{ b: `${r.agentName}’s` }, ` ${what} `, when ?? "is waiting on you", tail];
  }

  /* 2 — a nudge is due: the one that has waited longest */
  if (nudges.length) {
    const r = [...nudges].sort((a, b) => (a.sentMs ?? Infinity) - (b.sentMs ?? Infinity))[0];
    const weeks = r.sentMs == null ? null : Math.floor((ctx.nowMs - r.sentMs) / (7 * DAY));
    return weeks != null && weeks >= 1
      ? [{ b: r.agentName }, ` has had it ${weeks} ${weeks === 1 ? "week" : "weeks"}. A nudge is due.`]
      : [{ b: r.agentName }, " is due a nudge."];
  }

  /* 3 — the next expected reply, today or later */
  const next = ctx.rows.filter((r) => r.court === "agent" && r.expectedKind === "reply" && r.expectedMs != null && startOfDay(r.expectedMs) >= today)
    .sort((a, b) => (a.expectedMs as number) - (b.expectedMs as number))[0];
  if (next) return [`The next reply is expected ${dayMonth(next.expectedMs as number)}, from `, { b: next.agentName }, "."];

  /* 4 */
  return ["Nothing needs you today."];
}

/** Query Centre: "One query out" / "‹n› queries out", and the sentence. */
export function qcHeaderCopy(count: number, ctx: PressingContext): LivingLine {
  if (count === 1 && ctx.rows.length === 1) {
    const r = ctx.rows[0];
    if (r.court === "agent" && r.sentMs != null) {
      const runs: LivingRun[] = ["With ", { b: r.agentName }, ` since ${dayMonth(r.sentMs)}.`];
      if (r.expectedMs != null) runs.push(` A reply is expected by ${dayMonth(r.expectedMs)}.`);
      return { headline: "One query out", subline: runs };
    }
    return { headline: "One query out", subline: pressingSentence(ctx) };
  }
  return { headline: count === 1 ? "One query out" : `${count} queries out`, subline: pressingSentence(ctx) };
}

export interface ContactCopyContext extends PressingContext {
  agents: readonly Agent[];
}

/** Contact list: "One agent" / "‹n› agents", and the sentence. */
export function contactHeaderCopy(count: number, ctx: ContactCopyContext): LivingLine {
  if (count === 1 && ctx.agents.length === 1) {
    const a = ctx.agents[0];
    const name = agentPrimary(a);
    const agency = (a.agency ?? "").trim();
    const theirs = ctx.rows.filter((r) => r.query.agentId === a.id && r.sentMs != null);
    const last = theirs.length ? Math.max(...theirs.map((r) => r.sentMs as number)) : null;
    const who: LivingRun[] = agency && agency !== name ? [{ b: name }, ` at ${agency}`] : [{ b: name }];
    return {
      headline: "One agent",
      subline: [...who, last != null ? `, and your query went on ${dayMonth(last)}.` : ", and you haven’t queried them yet."],
    };
  }
  return { headline: count === 1 ? "One agent" : `${count} agents`, subline: pressingSentence(ctx) };
}
