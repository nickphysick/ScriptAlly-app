/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cardOffers — Card offers v1 (design-refs/card-offers-v1/agent-card-edit-v8.html). WHAT AN EDIT ON THE AGENT CARD
 * DOES TO THE QUERIES ALREADY OUT, ASKED AS A CHOICE RATHER THAN LISTED AS A CONSEQUENCE. It replaces the card's
 * rust "Also changes" box: two offers that need a decision, one calm note, and quiet footnotes for the rest.
 *
 *   rt     the response time moves from one number to another, with a live query at the Queried stage whose reply date
 *          really comes from the agent's window: its reply and nudge dates old → new, and Update / Keep
 *   close  the agent goes from open to Closed with a query still at the Queried stage: Leave it open / Close it as no
 *          reply, with Suggested on one of them
 *   safe   closed, but a partial or full request is in progress: nothing moves, and the note says so
 *   quiet  the footnotes a writer would miss; nothing else
 *
 * ⚠️ "REALLY COMES FROM THE WINDOW" IS `resolveExpectedDate`'s `source === "agent"`, ASKED WITH THE SAME INPUTS
 *    `expectedFor` (qcSummary) gives it. `expectedFor` returns `{ ms, kind }` and no source, so the source is read here
 *    from the one resolver rather than added to a shape whose callers compare it whole. A writer's date, or a reply
 *    restart, wins on recency and does not move: those queries are not in the offer.
 *
 * ⚠️ THE NUDGE IS NOT THE EXPECTED DATE. At log time `logDefaults` writes `nudgeDate` a week after the expected date,
 *    moved off the weekend; with no stored nudge (a "no response means no" agent, or an older query) the To-do's nudge
 *    is derived from the window plus `NUDGE_GRACE_DAYS`. So "moves with it" means: a stored nudge that still sits where
 *    the old window put it moves to where the new one puts it, a derived one moves by itself, and one the writer moved
 *    themselves stays.
 *
 * Pure: no Firestore, no React. The card renders it, the save reads its plan.
 */
import { QueryStatus, type Agent, type Query } from "../types";
import type { ContactDraft } from "./contactEdit";
import { expectedFor } from "./qcSummary";
import { anyToMs } from "./qcStages";
import { resolveExpectedDate } from "./expectedDate";
import { NUDGE_GRACE_DAYS } from "./taskPrecedence";
import { addDays, dayOf, dm, offWeekend } from "./queryActions/dates";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export type CloseChoice = "keep" | "close";
/** the one footnote that belongs under Taking queries (the rest sit under the slider) */
export const REOPEN_QUIET = "Without a reopening date there’s no reminder. Housekeeping will ask for one.";
export type RtChoice = "update" | "keep";

/** a stored or derived nudge, before and after: `moves` false when the writer set it themselves */
export interface NudgeMove {
  oldMs: number;
  newMs: number;
  /** the new date has passed: the nudge lands today */
  today: boolean;
  moves: boolean;
  /** the stored `nudgeDate` is written on Update (a derived one moves by itself) */
  stored: boolean;
}
export interface RtRow {
  id: string;
  title: string;
  sentMs: number | null;
  oldExpMs: number;
  newExpMs: number;
  /** the new reply date has already passed */
  past: boolean;
  nudge: NudgeMove | null;
}
export interface CloseRow {
  id: string;
  title: string;
  sentMs: number | null;
  expMs: number | null;
  /** past its expected date (by the window as saved) */
  past: boolean;
  /** the nudge as it stands: stored, or derived from the window */
  nudgeMs: number | null;
  ageWeeks: number | null;
}
export interface CardOffers {
  rt?: { queries: RtRow[] };
  close?: { queries: CloseRow[]; suggest: CloseChoice };
  safe?: { stage: "partial" | "full" };
  quiet: string[];
}
export interface OfferOpts {
  /** the close offer's choice so far; null or absent is its suggestion */
  close?: CloseChoice | null;
  titleOf?: (manuscriptId: string) => string;
}

const LIVE = (q: Query) => ![QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.SIGNED].includes(q.status as QueryStatus);
const PARTIAL = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT]);
const FULL = new Set<string>([QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED]);

const weeksOf = (v: unknown): number | null => (typeof v === "number" && v > 0 ? v : null);
const first = (d: Pick<ContactDraft, "name" | "agency">): string => {
  const f = (d.name ?? "").trim().split(/\s+/)[0] || (d.agency ?? "").trim();
  return f ? f[0].toUpperCase() + f.slice(1) : "them";
};
const lastSend = (q: Query): number | null => {
  const s = [q.dateSent, q.partialSentDate, q.fullSentDate].map(anyToMs).filter((t): t is number => t != null);
  return s.length ? Math.max(...s) : null;
};
/** the reply date comes from the agent's window, with nothing (a writer's date, a reply restart) in front of it */
export function fromWindow(q: Query, weeks: number | null): boolean {
  if (anyToMs(q.replyRestartedOn) != null) return false;
  return resolveExpectedDate(q, lastSend(q), weeks, null).source === "agent";
}
/** where the log-time rule puts the nudge for an expected date: a week on, off the weekend (`logDefaults`) */
export const defaultNudgeMs = (expMs: number): number => offWeekend(addDays(dayOf(expMs), 7)).getTime();
const silenceIsNo = (q: Query, draft: ContactDraft): boolean =>
  typeof q.nrmnOverride === "boolean" ? q.nrmnOverride : draft.noResponseMeansNo === true;

function nudgeFor(q: Query, draft: ContactDraft, oldExp: number, newExp: number, nowMs: number): NudgeMove | null {
  const today = dayOf(nowMs).getTime();
  const stored = anyToMs(q.nudgeDate);
  if (stored != null) {
    const s = dayOf(stored).getTime();
    if (s !== defaultNudgeMs(oldExp)) return { oldMs: s, newMs: s, today: false, moves: false, stored: true };
    const n = defaultNudgeMs(newExp);
    /* a reply date already passed: the nudge is due now (the mock's "Today") */
    const due = newExp < nowMs || n < today;
    return { oldMs: s, newMs: due ? today : n, today: due, moves: true, stored: true };
  }
  if (silenceIsNo(q, draft)) return null;
  const o = dayOf(oldExp + NUDGE_GRACE_DAYS * DAY).getTime();
  const n = dayOf(newExp + NUDGE_GRACE_DAYS * DAY).getTime();
  /* nothing is written for a derived nudge, so it says what the To-do will do: the window plus its grace */
  return { oldMs: o, newMs: Math.max(n, today), today: n <= today, moves: true, stored: false };
}
function nudgeNow(q: Query, draft: ContactDraft, expMs: number | null): number | null {
  const stored = anyToMs(q.nudgeDate);
  if (stored != null) return dayOf(stored).getTime();
  if (expMs == null || silenceIsNo(q, draft)) return null;
  return dayOf(expMs + NUDGE_GRACE_DAYS * DAY).getTime();
}

export function cardOffers(orig: Agent, draft: ContactDraft, queries: readonly Query[], nowMs: number, opts: OfferOpts = {}): CardOffers {
  const out: CardOffers = { quiet: [] };
  const f = first(draft);
  const title = (q: Query) => (opts.titleOf ? opts.titleOf(q.manuscriptId) : "");
  const live = queries.filter((q) => q.agentId === orig.id && LIVE(q));
  const queried = live.filter((q) => q.status === QueryStatus.QUERIED);
  const inRequest = live.filter((q) => PARTIAL.has(String(q.status)) || FULL.has(String(q.status)));
  const sent = (q: Query) => { const t = anyToMs(q.dateSent); return t != null ? dm(new Date(t)) : "your query"; };

  /* ── closed: an open door shut, with a query still at the Queried stage ─────────────────────────────────────────── */
  const closing = String(draft.submissionStatus) === "Closed" && String(orig.submissionStatus) !== "Closed";
  let closesAll = false;
  if (closing && queried.length) {
    const rows: CloseRow[] = queried.map((q) => {
      const exp = expectedFor(q, orig).ms;
      const sentMs = anyToMs(q.dateSent);
      return {
        id: q.id, title: title(q), sentMs, expMs: exp, past: exp != null && exp < nowMs,
        nudgeMs: nudgeNow(q, draft, exp), ageWeeks: sentMs != null ? Math.round((nowMs - sentMs) / WEEK) : null,
      };
    });
    /* Suggested = close only when every query is past its date AND silence counts as their answer */
    const suggest: CloseChoice = rows.every((r, i) => r.past && silenceIsNo(queried[i], draft)) ? "close" : "keep";
    out.close = { queries: rows, suggest };
    closesAll = (opts.close ?? suggest) === "close";
  }
  if (closing && inRequest.length) out.safe = { stage: inRequest.some((q) => FULL.has(String(q.status))) ? "full" : "partial" };
  if (String(draft.submissionStatus) === "Closed" && !(draft.reopensOn ?? "").trim() && String(orig.submissionStatus) !== "Closed") {
    out.quiet.push(REOPEN_QUIET);
  }

  /* ── response time ──────────────────────────────────────────────────────────────────────────────────────────────── */
  const was = weeksOf(orig.responseTimeWeeks);
  const now = weeksOf(draft.responseTimeWeeks);
  if (was !== now && (queried.length || inRequest.length)) {
    const draftAgent: Agent = { ...orig, responseTimeWeeks: now ?? undefined };
    if (now == null) delete (draftAgent as Partial<Agent>).responseTimeWeeks;
    if (closesAll && queried.length) {
      out.quiet.push(`Your quer${queried.length === 1 ? "y is" : "ies are"} closing as no reply, so ${queried.length === 1 ? "its" : "their"} dates don’t need to move.`);
    } else {
      const rows: RtRow[] = [];
      for (const q of queried) {
        if (was != null && now != null) {
          if (!fromWindow(q, was)) {
            const e = expectedFor(q, orig).ms;
            if (e != null) out.quiet.push(`Your query from ${sent(q)} keeps its own reply date of ${dm(new Date(e))}.`);
            continue;
          }
          const o = expectedFor(q, orig).ms;
          const n = expectedFor(q, draftAgent).ms;
          if (o == null || n == null || o === n) continue;
          rows.push({ id: q.id, title: title(q), sentMs: anyToMs(q.dateSent), oldExpMs: o, newExpMs: n, past: n < nowMs, nudge: nudgeFor(q, draft, o, n, nowMs) });
        } else if (now == null) {
          if (fromWindow(q, was)) out.quiet.push(`Your query from ${sent(q)} won’t have a reply date until you know ${f}’s response time.`);
        } else if (fromWindow(q, now)) {
          const n = expectedFor(q, draftAgent).ms;
          if (n != null) out.quiet.push(`Your query from ${sent(q)} gets a reply date of ${dm(new Date(n))} when you save.`);
        }
      }
      if (rows.length) out.rt = { queries: rows };
    }
    for (const q of inRequest) {
      const stage = FULL.has(String(q.status)) ? "full" : "partial";
      out.quiet.push(`Your ${stage} request with ${f} has its own dates, so nothing else moves.`);
    }
  }
  out.quiet = [...new Set(out.quiet)];
  return out;
}

/* ══ the words: the mock's, word for word ═══════════════════════════════════════════════════════════════════════════ */

const NUM = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const d = (ms: number) => dm(new Date(ms));

export function rtHeader(n: number, f: string): string {
  return n === 1 ? `You have 1 open query with ${f}. Move its dates too?` : `You have ${n} open queries with ${f}. Move their dates too?`;
}
export function rtWhy(choice: RtChoice, rows: readonly RtRow[], f: string, weeks: number): string {
  if (choice === "update") return `${f}’s new window is applied to ${rows.length === 1 ? "this query" : "these queries"} when you save.`;
  return rows.length === 1 ? `This query keeps ${d(rows[0].oldExpMs)}. Only future queries to ${f} use ${weeks} weeks.`
    : `These queries keep their dates. Only future queries to ${f} use ${weeks} weeks.`;
}
export function nudgeSub(n: NudgeMove, f: string): string {
  if (!n.moves) return "You set this nudge yourself, so it stays.";
  return n.today ? "The nudge would land on your To-do list straight away." : `The To-do to nudge ${f} moves with it.`;
}
export function closeHeader(n: number, f: string): string {
  return n === 1 ? `${f} is closed to new queries. What about the one you sent?` : `${f} is closed to new queries. What about the ${n} you sent?`;
}
/** the lead: the bold part, then the rest */
export function closeLead(rows: readonly CloseRow[], f: string, nrn: boolean): { bold: string; rest: string } {
  const allPast = rows.every((r) => r.past);
  if (rows.length === 1) {
    const r = rows[0];
    const bold = `Your query from ${r.sentMs != null ? d(r.sentMs) : "earlier"} is still open.`;
    if (!r.past) return { bold, rest: "Agents who close usually still answer the queries they already have." };
    const age = r.ageWeeks != null ? `${NUM[r.ageWeeks] || r.ageWeeks} week${r.ageWeeks === 1 ? "" : "s"} old` : "old";
    return { bold, rest: `It’s ${age}, past the date ${f} usually replies by${nrn ? ", and says no response means no" : ""}.` };
  }
  const bold = `Your ${rows.length} queries are still open.`;
  return allPast ? { bold, rest: `They’re past the date ${f} usually replies by${nrn ? ", and says no response means no" : ""}.` }
    : { bold, rest: "Agents who close usually still answer the queries they already have." };
}
export function closeOptionSub(k: CloseChoice, rows: readonly CloseRow[]): string {
  const one = rows.length === 1 ? rows[0] : null;
  const past = rows.every((r) => r.past);
  const nudge = one?.nudgeMs ?? null;
  if (k === "keep") {
    if (!one) return "Keep waiting.";
    if (past) return nudge != null ? "Keep waiting. Its nudge date has passed, so the nudge stays on your To-do list." : "Keep waiting.";
    return nudge != null ? `Keep waiting. Your nudge stays on ${d(nudge)}.` : "Keep waiting.";
  }
  if (!one) return `Moves them to Closed · No response today${past ? ", removes their nudges, and adds them to your Wall of no" : " and removes their nudges"}.`;
  if (past) return "Moves it to Closed · No response today, removes the nudge, and adds it to your Wall of no.";
  return `Moves it to Closed · No response today${nudge != null ? ` and removes the nudge for ${d(nudge)}` : ""}.`;
}
export const CLOSE_WHY = "Happens when you save. You can reopen a closed query from its card.";
export function safeNote(stage: "partial" | "full", f: string): { bold: string; rest: string } {
  return { bold: `Your ${stage} request with ${f} isn’t affected.`, rest: "Closing to new queries doesn’t change a request that’s already in progress, so nothing else moves." };
}

/* ══ what the save does with the choices ═══════════════════════════════════════════════════════════════════════════ */

export interface OfferPlan {
  /** Update: the stored nudges that move (id → new day) — the reply date moves by itself */
  moveNudge: { id: string; nudgeMs: number }[];
  /** Keep: these queries hold their reply dates */
  keep: { id: string; expMs: number }[];
  /** Close it as no reply */
  close: string[];
  /** counts for the save bar and the toast */
  moved: number;
  kept: number;
  stayOpen: number;
}
export function offerPlan(o: CardOffers, rt: RtChoice, close: CloseChoice | null): OfferPlan {
  const plan: OfferPlan = { moveNudge: [], keep: [], close: [], moved: 0, kept: 0, stayOpen: 0 };
  if (o.close) {
    const c = close ?? o.close.suggest;
    if (c === "close") plan.close = o.close.queries.map((r) => r.id);
    else plan.stayOpen = o.close.queries.length;
  }
  if (o.rt) {
    if (rt === "update") {
      plan.moved = o.rt.queries.length;
      for (const r of o.rt.queries) if (r.nudge?.stored && r.nudge.moves) plan.moveNudge.push({ id: r.id, nudgeMs: r.nudge.newMs });
    } else {
      plan.kept = o.rt.queries.length;
      plan.keep = o.rt.queries.map((r) => ({ id: r.id, expMs: r.oldExpMs }));
    }
  }
  return plan;
}
const qs = (n: number) => (n === 1 ? "query" : "queries");
/** the save bar's second line: what the save will also do */
export function saveExtras(p: OfferPlan): string[] {
  const out: string[] = [];
  if (p.close.length) out.push(`closes ${p.close.length} ${qs(p.close.length)} as no reply`);
  else if (p.stayOpen) out.push(p.stayOpen === 1 ? "1 query stays open" : `${p.stayOpen} queries stay open`);
  if (p.moved) out.push(p.moved === 1 ? "moves 1 query’s dates" : `moves ${p.moved} queries’ dates`);
  else if (p.kept) out.push(p.kept === 1 ? "1 query keeps its dates" : `${p.kept} queries keep their dates`);
  return out;
}
/** the toast after the save, or null for the plain save's own */
export function offerToast(p: OfferPlan): string | null {
  if (p.close.length) return p.close.length === 1 ? "Saved · query closed as no reply" : `Saved · ${p.close.length} queries closed as no reply`;
  if (p.kept) return p.kept === 1 ? "Saved · your query keeps its dates" : "Saved · your queries keep their dates";
  if (p.moved) return p.moved === 1 ? "Saved · 1 query’s dates moved" : `Saved · ${p.moved} queries’ dates moved`;
  return null;
}
