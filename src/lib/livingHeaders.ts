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
/** v12's rule for the Contact hero: words up to twenty, then digits ("eleven", "23"). */
export const wordsToTwenty = (n: number): string => (n >= 0 && n <= 20 ? numberWords(n) : String(n));

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
  const next = nextReply(ctx);
  if (next) return [`The next reply is expected ${dayMonth(next.expectedMs as number)}, from `, { b: next.agentName }, "."];

  /* 4 */
  return ["Nothing needs you today."];
}

/** The next reply an agent is expected to send, today or later — the pressing sentence's third case,
 *  and the To-do list's "all caught up" line. */
export function nextReply(ctx: PressingContext): QcRow | null {
  const today = startOfDay(ctx.nowMs);
  return ctx.rows.filter((r) => r.court === "agent" && r.expectedKind === "reply" && r.expectedMs != null && startOfDay(r.expectedMs) >= today)
    .sort((a, b) => (a.expectedMs as number) - (b.expectedMs as number))[0] ?? null;
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
  /* ⚠️ ZERO IS REACHABLE ON A POPULATED ACCOUNT — scoped to a book with nothing out yet. The empty
     STATE is only for an account with no queries (the page decides that); here the scale is simply
     none, said in words rather than as a figure. */
  const headline = count === 0 ? "No queries out" : count === 1 ? "One query out" : `${count} queries out`;
  return { headline, subline: pressingSentence(ctx) };
}

/* ⚠️ RETIRED (Contact list v15 §2): `contactHeaderCopy` and `ContactCopyContext`. The Contact list's header is page-local
   now (ContactOpenHeader) — the count as the title and a fixed line, no derived sentence. */

/* ══ v3 — THE FOUR NEW PAGES ══════════════════════════════════════════════════════════════════
   Each takes FACTS the page already derives (never a new engine) and returns the two lines. */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One package's record, by package-editions §C4 (lib/packageResults) — answered = came back. */
export interface PackageLead { name: string; sent: number; answered: number; requests: number }

/** Submission packages: "One package" / "‹n› packages". The lead is the most-used LIVE package
 *  (most queries sent with it; never a retired one) — the page picks it, this only words it. */
export function packagesHeaderCopy(count: number, ctx: { lead: PackageLead | null; firstLiveName: string | null }): LivingLine {
  const headline = count === 1 ? "One package" : `${count} packages`;
  const L = ctx.lead;
  if (L && L.sent > 0) {
    const tail = L.answered > 0
      ? ` is out on ${plural(L.sent, "query", "queries")} — ${plural(L.requests, "request", "requests")} from ${L.answered} answered.`
      : ` is out on ${plural(L.sent, "query", "queries")}, and none has come back yet.`;
    return { headline, subline: [{ b: L.name }, tail] };
  }
  const name = L?.name ?? ctx.firstLiveName;
  return { headline, subline: name ? [{ b: name }, " is ready, and hasn’t been sent with a query yet."] : ["Nothing is in use right now."] };
}

/** Comparable titles: "One comp title" / "‹n› comp titles". What stops them being letter-ready; when
 *  nothing does, the titles in the letter. */
export function compsHeaderCopy(count: number, ctx: { missing: number; inLetter: readonly string[]; firstTitle: string | null }): LivingLine {
  if (count === 1 && ctx.firstTitle) {
    const inIt = ctx.inLetter.includes(ctx.firstTitle);
    return { headline: "One comp title", subline: [{ b: ctx.firstTitle }, inIt ? " is saved, and in your letter." : " is saved, and not in your letter yet."] };
  }
  const headline = count === 1 ? "One comp title" : `${count} comp titles`;
  if (ctx.missing > 0) {
    return { headline, subline: [{ b: cap(numberWords(ctx.missing)) }, ctx.missing === 1 ? " is missing a publisher or a year, so it’s not letter-ready." : " are missing a publisher or a year, so they’re not letter-ready."] };
  }
  const [a, b] = ctx.inLetter;
  if (a && b) return { headline, subline: [{ b: a }, " and ", { b }, " are in your letter."] };
  if (a) return { headline, subline: [{ b: a }, " is in your letter."] };
  return { headline, subline: ["None is in your letter yet."] };
}

/* Analytics' living-header copy is RETIRED (analytics v13, 3 Oct): the page opens on a feature
   container instead, and its numbers live in its sections. The other five pages keep theirs. */

/** To-do list: "One thing to do" / "‹n› things to do". The oldest or soonest item, by its own deed. */
export interface TodoFirst { deed: string; dueYmd: string | null }
const ymdMs = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d, 12).getTime(); };
export function todoHeaderCopy(count: number, ctx: { first: TodoFirst | null; todayYmd: string }): LivingLine {
  const headline = count === 1 ? "One thing to do" : `${count} things to do`;
  const f = ctx.first;
  if (!f) return { headline, subline: ["Nothing needs you today."] };
  const when = f.dueYmd
    ? `${f.dueYmd < ctx.todayYmd ? "was" : "is"} due on ${dayDate(ymdMs(f.dueYmd))}`
    : "has no date set";
  if (count === 1) return { headline, subline: [{ b: f.deed }, `. It ${when}.`] };
  return { headline, subline: ["The oldest of them is ", { b: f.deed }, `, and it ${when}.`] };
}

/** To-do list, ALL CAUGHT UP (§6) — not an empty state: the writer has queries, and nothing is due. */
export function todoCaughtUpLine(ctx: PressingContext): LivingLine {
  const n = nextReply(ctx);
  return n
    ? { headline: "All caught up", subline: ["Nothing needs you today. The next reply is expected ", { b: dayMonth(n.expectedMs as number) }, ", from ", n.agentName, "."] }
    : { headline: "All caught up", subline: ["Nothing needs you today."] };
}
