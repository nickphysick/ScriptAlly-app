/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 (`/queries/responses`) — THE DATA LAYER. Every figure on the page comes from here.
 *
 * Pure: it reads the Query Centre's own rows (`buildQcRows`, so `status`, the dated stage history, the expected
 * dates and how far a query got are that page's derivations, never a second copy) and the clock it is handed.
 *
 * ⚠️ PLACEMENT IS BY THE QUERY'S CURRENT STATUS, WHICH IS ITS LATEST RUNG (`recomputeQuery`'s `deriveStatus`).
 *    So a query asked for a partial and later passed is Passed and nothing else: each answered query is on the
 *    page exactly once.
 *    - Asked for more: Partial requested · Full requested · Revise & resubmit · Offer, and the three states those
 *      move to once the writer has answered them (Partial sent · Full sent · Resubmitted): the agent's latest
 *      answer is still the request.
 *    - Passed: Rejected. · No reply: No Response.
 *    - Not on the page: Queried (no answer yet), and the two writer-closed states, Withdrawn and Signed. Neither
 *      is in the pack's six answers; a Signed query's offer has been answered and a Withdrawn one was closed by
 *      the writer. Reported as a false premise.
 * ⚠️ A PERSONAL NOTE IS `rejectionFeedbackType === "detailed"`. The journey sends `feedbackType: "Yes"` and
 *    `recordResponse` stores it mapped (Yes → "detailed", No → "standard", Form → "form"); only "detailed" keeps
 *    its text (`rejectionFeedbackText`).
 * ⚠️ NO DATE IS INVENTED. An answer date, a due date or a wait that nothing records is `null`, and the page drops
 *    the line that would have stated it.
 */
import { QueryStatus, type Query } from "../types";
import { MONTHS_SHORT } from "./dates";
import { whereItStands, type ExpectedKind, type Furthest } from "./qcSummary";
import type { StageHistory } from "./qcStages";

const DAY = 86_400_000;

export type RespGroup = "more" | "passed" | "noReply";
/** What the agent asked for (or said): the "what they want" of a request card, and the tag of a no. */
export type RespAnswer = "partial" | "full" | "rr" | "offer" | "passed" | "noReply";
/** A request's state: not sent yet · sent (with the agent) · an offer to answer · a revision to make */
export type MoreState = "toSend" | "sent" | "offer" | "rr";

/** The parts of a Query Centre row this layer reads (a `QcRow` satisfies it). */
export interface RespRowInput {
  id: string;
  query: Pick<Query, "dateSent" | "partialRequestedDate" | "fullRequestedDate" | "partialSentDate" | "fullSentDate" | "rejectedDate"
    | "lastStatusChange" | "offerDate" | "rejectionFeedbackType" | "rejectionFeedbackText" | "rrNotes">;
  status: QueryStatus;
  agentName: string;
  agency: string;
  initials: string;
  sentMs: number | null;
  history: StageHistory;
  expectedMs: number | null;
  expectedKind: ExpectedKind | null;
  dayN: number | null;
  furthest: Furthest;
  /** when the query reached the stage it stands at (the Query Centre's `stageStartMs`); the nudge window reads it */
  stageStartMs?: number | null;
}

export interface RespItem<R extends RespRowInput = RespRowInput> {
  id: string;
  row: R;
  group: RespGroup;
  answer: RespAnswer;
  /** asked for more only */
  state: MoreState | null;
  /** the request is the writer's to act on: not sent, a revision owed, or an offer not yet answered */
  yourMove: boolean;
  /** when the agent gave this answer (the closing date for a no reply) */
  answerMs: number | null;
  queriedMs: number | null;
  /** queried → answered, in whole days */
  waitDays: number | null;
  /** when the writer sent what was asked for (sent requests only) */
  pagesSentMs: number | null;
  /** send by (not sent / revision), reply expected (sent), answer by (offer) */
  dueMs: number | null;
  /** for a full request: whether a partial came first ("after the partial") */
  afterPartial: boolean;
  /** a no with a personal note */
  personal: boolean;
  /** the agent's note (a personal rejection), or the request's own note (a revision's) */
  note: string | null;
  furthest: Furthest;
}

/* ── dates ── */
export function toMs(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === "function") return o.toMillis();
  if (typeof o.seconds === "number") return o.seconds * 1000;
  return null;
}
export const wholeDays = (a: number, b: number): number => Math.round((b - a) / DAY);
/** "12 Sep", with the year when it is not the clock's year */
export function respDate(ms: number, nowMs: number): string {
  const d = new Date(ms);
  const s = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === new Date(nowMs).getFullYear() ? s : `${s} ${d.getFullYear()}`;
}
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const monthYear = (ms: number): string => { const d = new Date(ms); return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`; };

/* ── placement ── */
const PLACE: Partial<Record<QueryStatus, { group: RespGroup; answer: RespAnswer; state: MoreState | null }>> = {
  [QueryStatus.PARTIAL_REQUESTED]: { group: "more", answer: "partial", state: "toSend" },
  [QueryStatus.FULL_REQUESTED]: { group: "more", answer: "full", state: "toSend" },
  [QueryStatus.REVISE_RESUBMIT]: { group: "more", answer: "rr", state: "rr" },
  [QueryStatus.OFFER]: { group: "more", answer: "offer", state: "offer" },
  [QueryStatus.PARTIAL_SENT]: { group: "more", answer: "partial", state: "sent" },
  [QueryStatus.FULL_SENT]: { group: "more", answer: "full", state: "sent" },
  [QueryStatus.RESUBMITTED]: { group: "more", answer: "rr", state: "sent" },
  [QueryStatus.REJECTED]: { group: "passed", answer: "passed", state: null },
  [QueryStatus.NO_RESPONSE]: { group: "noReply", answer: "noReply", state: null },
};
/** Where a status sits on the page, or null when it is not an answer (Queried, Withdrawn, Signed). */
export const placeOf = (status: QueryStatus): { group: RespGroup; answer: RespAnswer; state: MoreState | null } | null => PLACE[status] ?? null;

/** the status that marks each answer in the stage history */
const ANSWER_STATUS: Record<RespAnswer, QueryStatus> = {
  partial: QueryStatus.PARTIAL_REQUESTED, full: QueryStatus.FULL_REQUESTED, rr: QueryStatus.REVISE_RESUBMIT,
  offer: QueryStatus.OFFER, passed: QueryStatus.REJECTED, noReply: QueryStatus.NO_RESPONSE,
};
const SENT_STATUS: Partial<Record<RespAnswer, QueryStatus>> = {
  partial: QueryStatus.PARTIAL_SENT, full: QueryStatus.FULL_SENT, rr: QueryStatus.RESUBMITTED,
};
const lastSpanStart = (h: StageHistory, s: QueryStatus): number | null => {
  for (let i = h.spans.length - 1; i >= 0; i--) if (h.spans[i].status === s) return h.spans[i].startMs;
  return null;
};

export function respItem<R extends RespRowInput>(row: R): RespItem<R> | null {
  const place = placeOf(row.status);
  if (!place) return null;
  const q = row.query;
  const { group, answer, state } = place;
  /* the answer's date: the stage history first (the query doc's own dates win inside it), then the doc fields */
  const docAnswer: Record<RespAnswer, unknown> = {
    partial: q.partialRequestedDate, full: q.fullRequestedDate, rr: null, offer: q.offerDate,
    passed: q.rejectedDate ?? q.lastStatusChange, noReply: q.lastStatusChange,
  };
  const answerMs = lastSpanStart(row.history, ANSWER_STATUS[answer]) ?? toMs(docAnswer[answer]);
  const queriedMs = row.sentMs;
  const waitDays = answerMs != null && queriedMs != null ? Math.max(0, wholeDays(queriedMs, answerMs)) : null;
  const sentStatus = SENT_STATUS[answer];
  const docSent: Partial<Record<RespAnswer, unknown>> = { partial: q.partialSentDate, full: q.fullSentDate };
  const pagesSentMs = state === "sent" && sentStatus ? lastSpanStart(row.history, sentStatus) ?? toMs(docSent[answer]) : null;
  const afterPartial = answer === "full" && row.history.spans.some((s) => s.status === QueryStatus.PARTIAL_REQUESTED || s.status === QueryStatus.PARTIAL_SENT);
  const personal = answer === "passed" && q.rejectionFeedbackType === "detailed";
  const noteRaw = answer === "passed" ? (personal ? q.rejectionFeedbackText : null) : answer === "rr" ? q.rrNotes : null;
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;
  return {
    id: row.id, row, group, answer, state,
    yourMove: state === "toSend" || state === "rr" || state === "offer",
    answerMs, queriedMs, waitDays, pagesSentMs,
    dueMs: group === "more" ? row.expectedMs : null,
    afterPartial, personal, note, furthest: row.furthest,
  };
}

export function respItems<R extends RespRowInput>(rows: readonly R[]): RespItem<R>[] {
  const out: RespItem<R>[] = [];
  for (const r of rows) { const it = respItem(r); if (it) out.push(it); }
  return out;
}

/* ── counts and the reply rate ── */
export interface RespCounts { more: number; passed: number; noReply: number; answered: number }
export function respCounts(items: readonly RespItem[]): RespCounts {
  const c = { more: 0, passed: 0, noReply: 0 };
  for (const it of items) c[it.group]++;
  return { ...c, answered: c.more + c.passed + c.noReply };
}
/** (Asked for more + Passed) ÷ Answered — replies over queries no longer waiting (the packages v4 rule). Null with nothing answered. */
export function replyRate(c: RespCounts): number | null {
  return c.answered ? (c.more + c.passed) / c.answered : null;
}
export const replyPct = (c: RespCounts): number | null => { const r = replyRate(c); return r == null ? null : Math.round(r * 100); };
/** queries still with agents and not yet answered at all: status Queried */
export const stillOut = (rows: readonly { status: QueryStatus }[]): number => rows.filter((r) => r.status === QueryStatus.QUERIED).length;

/* ── the carousel ── */
/**
 * v5 (the reference's `requests`): your move first, then the newest answer first; an undated answer goes last, and
 * the id breaks a tie so the order never depends on how the data arrived. (v2 sorted by soonest due date.)
 */
export function carouselOrder<R extends RespRowInput>(items: readonly RespItem<R>[]): RespItem<R>[] {
  const key = (ms: number | null) => (ms == null ? Number.NEGATIVE_INFINITY : ms);
  return items.filter((i) => i.group === "more").slice().sort((a, b) =>
    Number(b.yourMove) - Number(a.yourMove)
    || key(b.answerMs) - key(a.answerMs)
    || a.id.localeCompare(b.id));
}

/* ── the list of nos ── */
/** v5 adds Queried. "wait" is the TOOK column. */
export type NoSort = "date" | "wait" | "agent" | "queried";
export type NoKind = "passed" | "noReply";
export const isNo = (i: RespItem): boolean => i.group !== "more";
export const surnameOf = (name: string): string => { const w = name.trim().split(/\s+/); return (w[w.length - 1] ?? "").toLowerCase(); };
export function noMatches(i: RespItem, find: string): boolean {
  const f = find.trim().toLowerCase();
  if (!f) return true;
  return `${i.row.agentName} ${i.row.agency}`.toLowerCase().includes(f);
}
export function listNos<R extends RespRowInput>(items: readonly RespItem<R>[], o: { kind: NoKind | null; find: string; sort: NoSort; desc: boolean }): RespItem<R>[] {
  const dir = o.desc ? -1 : 1;
  const ans = (x: RespItem<R>) => x.answerMs ?? 0;
  return items.filter((i) => isNo(i) && (!o.kind || i.group === o.kind) && noMatches(i, o.find)).sort((a, b) => {
    if (o.sort === "wait") return dir * ((a.waitDays ?? -1) - (b.waitDays ?? -1)) || ans(b) - ans(a);
    if (o.sort === "agent") return dir * surnameOf(a.row.agentName).localeCompare(surnameOf(b.row.agentName)) || ans(b) - ans(a);
    if (o.sort === "queried") return dir * ((a.queriedMs ?? 0) - (b.queriedMs ?? 0)) || ans(b) - ans(a);
    return dir * (ans(a) - ans(b)) || a.id.localeCompare(b.id);
  });
}
/** The month dividers, in the list's own order (Answered only): "October 2026" with the rows answered in it. */
export function monthGroups<R extends RespRowInput>(list: readonly RespItem<R>[]): { key: string; label: string; items: RespItem<R>[] }[] {
  const out: { key: string; label: string; items: RespItem<R>[] }[] = [];
  for (const it of list) {
    const key = it.answerMs == null ? "none" : `${new Date(it.answerMs).getFullYear()}-${new Date(it.answerMs).getMonth()}`;
    let g = out.find((x) => x.key === key);
    if (!g) { g = { key, label: it.answerMs == null ? "Date not recorded" : monthYear(it.answerMs), items: [] }; out.push(g); }
    g.items.push(it);
  }
  return out;
}

/* ── the tally ── */
/** One gate per five nos; the last holds the remainder. Under one row's worth, the rest of the row is ghost gates. */
export function tallyPlan(n: number, perRow: number): { gates: number[]; ghosts: number } {
  const gates: number[] = [];
  for (let i = 0; i < Math.ceil(n / 5); i++) gates.push(Math.min(5, n - i * 5));
  return { gates, ghosts: gates.length < perRow ? perRow - gates.length : 0 };
}
/** the earliest query date among the nos: the tally's "since" */
export function tallySince(items: readonly RespItem[]): number | null {
  let m: number | null = null;
  for (const i of items) if (isNo(i) && i.queriedMs != null && (m == null || i.queriedMs < m)) m = i.queriedMs;
  return m;
}

/* ── words ── */
export const firstNameOf = (name: string): string => name.trim().split(/\s+/)[0] ?? name;
export const WHAT_WANTS: Record<"partial" | "full" | "rr" | "offer", string> = { partial: "A partial", full: "The full manuscript", rr: "A revision", offer: "An offer" };
export const FAR_WORDS: Record<Furthest, string> = { query: "The query", partial: "A partial", full: "The full manuscript" };
/** the list row's line under its tag */
export function saidLine(i: RespItem): { quote: string | null; text: string | null } {
  if (i.group === "noReply") return { quote: null, text: "Closed after the wait" };
  if (i.personal && i.note) return { quote: i.note, text: null };
  return { quote: null, text: i.furthest === "query" ? "Form reply" : `Form reply, after ${i.furthest === "full" ? "the full" : "a partial"}` };
}
/** the strip's days figure: "{n} days left" / "{n} days over" / "{n} days to go" */
export function daysLeft(dueMs: number, nowMs: number): { n: number; over: boolean } {
  const d = wholeDays(startOfDay(nowMs), startOfDay(dueMs));
  return { n: Math.abs(d), over: d < 0 };
}
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/* ── the pin (a copy of the Query Centre's `nextPinned`, QcCentre.tsx — page-local there, so copied from the same values) ── */
export const PIN_AT = 12;
export const UNPIN_ABOVE = 36;
export const nextPinned = (was: boolean, sentinelTop: number, listBottom: number): boolean => {
  if (listBottom <= PIN_AT) return false;
  if (sentinelTop <= PIN_AT) return true;
  if (sentinelTop > UNPIN_ABOVE) return false;
  return was;
};

/* ── the side panel's words (Part D). Every clause comes from a recorded fact; a missing one is dropped. ── */
export interface Part { text: string; em?: boolean }
export interface AnswerStand { heading: string; figure: string | null; hot: boolean; paragraph: Part[] }
const reqWord = (a: RespAnswer): string => (a === "full" ? "full" : a === "rr" ? "revision" : "partial");

export function answerStand(i: RespItem, title: string | null, nowMs: number): AnswerStand {
  const first = firstNameOf(i.row.agentName);
  const book: Part = { text: title || "your book", em: !!title };
  const d = (ms: number | null) => (ms == null ? null : respDate(ms, nowMs));
  const P = (...xs: (Part | string | null | false)[]): Part[] => xs.filter((x): x is Part | string => !!x).map((x) => (typeof x === "string" ? { text: x } : x));
  const due = i.dueMs != null ? daysLeft(i.dueMs, nowMs) : null;
  const dueFig = (w: "left" | "to go") => (due ? (due.over ? `${plural(due.n, "day", "days")} over` : `${plural(due.n, "day", "days")} ${w}`) : null);
  if (i.state === "toSend") {
    return {
      heading: `Send ${first} the ${reqWord(i.answer)}`, figure: dueFig("left"), hot: !!due,
      paragraph: P(d(i.answerMs) ? `${first} asked for the ${reqWord(i.answer)} of ` : null, d(i.answerMs) ? book : null, d(i.answerMs) ? ` on ${d(i.answerMs)}.` : null,
        due ? `${d(i.answerMs) ? " " : ""}They're expecting it by ${d(i.dueMs)}.` : null),
    };
  }
  if (i.state === "sent") {
    return {
      heading: `Waiting on ${first}`, figure: dueFig("to go"), hot: !!due?.over,
      paragraph: P(d(i.pagesSentMs) ? `You sent the ${reqWord(i.answer)} on ${d(i.pagesSentMs)}.` : null,
        due ? `${d(i.pagesSentMs) ? " " : ""}You expect a reply by ${d(i.dueMs)}.` : null),
    };
  }
  if (i.state === "offer") {
    return {
      heading: `Answer ${first}'s offer`, figure: dueFig("left"), hot: !!due,
      paragraph: P(`${first} offered to represent `, book, d(i.answerMs) ? ` on ${d(i.answerMs)}.` : ".",
        due ? ` You said you'd answer by ${d(i.dueMs)}.` : null),
    };
  }
  if (i.state === "rr") {
    return { heading: `Revise for ${first}`, figure: null, hot: false,
      paragraph: P(`${first} asked you to revise `, book, d(i.answerMs) ? ` and send it again, on ${d(i.answerMs)}.` : " and send it again.") };
  }
  if (i.group === "passed") {
    return {
      heading: `${first} passed`, figure: d(i.answerMs), hot: false,
      paragraph: P(`${first} answered your query for `, book, i.waitDays != null ? ` after ${plural(i.waitDays, "day", "days")}` : "",
        i.personal ? ", with a personal note." : ".", ` You can query ${first} again with your next book.`),
    };
  }
  return {
    heading: "Closed, no reply", figure: d(i.answerMs), hot: false,
    paragraph: P(`You queried ${first} with `, book, d(i.queriedMs) ? ` on ${d(i.queriedMs)}` : "",
      i.waitDays != null ? ` and closed it after ${plural(i.waitDays, "day", "days")}.` : " and closed it.", ` You can query ${first} again with your next book.`),
  };
}

/** the index card's rows; a row whose fact is missing is dropped */
export function answerIndex(i: RespItem, nowMs: number, theySaw: string | null): { key: string; label: string; answer: string }[] {
  const out: { key: string; label: string; answer: string }[] = [];
  if (i.queriedMs != null) out.push({ key: "queried", label: "Queried", answer: respDate(i.queriedMs, nowMs) });
  if (i.answerMs != null) {
    out.push({ key: "answered", label: i.group === "noReply" ? "Closed" : "Answered",
      answer: `${respDate(i.answerMs, nowMs)}${i.waitDays != null ? `, after ${plural(i.waitDays, "day", "days")}` : ""}` });
  }
  if (theySaw) out.push({ key: "saw", label: "They saw", answer: theySaw });
  const reply = i.group === "noReply" ? "None. You closed it after the wait."
    : i.group === "passed" ? (i.personal ? "A personal note" : "A form reply")
    : i.answer === "offer" ? "An offer"
    : i.answer === "rr" ? "A request for a revision"
    : i.answer === "full" ? "A request for the full manuscript" : "A request for a partial";
  out.push({ key: "reply", label: "Reply", answer: reply });
  return out;
}

/** the footer: the status, its detail, and the primary (with the journey it runs) */
export type AnswerAct = "sent" | "resp" | "offer" | "edit";
export function answerFoot(i: RespItem, nowMs: number): { status: string; detail: string | null; hot: boolean; label: string; act: AnswerAct } {
  const cap = (a: RespAnswer) => (a === "full" ? "Full" : "Partial");
  const due = i.dueMs != null ? daysLeft(i.dueMs, nowMs) : null;
  if (i.state === "toSend") {
    return { status: `${cap(i.answer)} requested`, detail: due ? `Send by ${respDate(i.dueMs!, nowMs)} · ${due.over ? `${due.n}d over` : `${due.n}d left`}` : null, hot: !!due,
      label: `Mark ${i.answer === "full" ? "full" : "partial"} sent`, act: "sent" };
  }
  if (i.state === "sent") {
    return { status: i.answer === "rr" ? "Revision sent" : `${cap(i.answer)} sent`, detail: i.dueMs != null ? `Reply expected by ${respDate(i.dueMs, nowMs)}` : null, hot: !!due?.over,
      label: "Record a response", act: "resp" };
  }
  if (i.state === "offer") return { status: "Offer", detail: due ? `Answer by ${respDate(i.dueMs!, nowMs)}` : null, hot: !!due, label: "Record your answer", act: "offer" };
  if (i.state === "rr") return { status: "Revise & resubmit", detail: i.answerMs != null ? `Asked ${respDate(i.answerMs, nowMs)}` : null, hot: false, label: "Record a response", act: "resp" };
  return {
    status: i.group === "passed" ? "Rejected" : "No reply",
    detail: i.answerMs != null ? `Closed ${respDate(i.answerMs, nowMs)}${i.waitDays != null ? ` · ${plural(i.waitDays, "day", "days")}` : ""}` : null,
    hot: false, label: "Edit the response", act: "edit",
  };
}


/* ══ Responses v5 (design-refs/responses-v5/responses-v5.html) — the new figures, all pure, all over the same items ══
 * ⚠️ "GONE QUIET" AND "THE NEXT REPLY YOU CAN EXPECT" ARE THE QUERY CENTRE'S OWN: `whereItStands` (the v141.1 nudge
 *    window) and the row's `expectedMs` / `expectedKind` (`expectedFor`). Nothing here re-derives a window or a date.
 * ⚠️ "Still waiting" is status Queried, as v2's `stillOut`: the queries no agent has answered at all.
 */
export type FirstKind = "more" | "passed" | "noReply";
export interface FirstAnswer { status: QueryStatus; kind: FirstKind; ms: number; days: number }
const FIRST_KIND: Partial<Record<QueryStatus, FirstKind>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "more", [QueryStatus.FULL_REQUESTED]: "more", [QueryStatus.REVISE_RESUBMIT]: "more",
  [QueryStatus.OFFER]: "more", [QueryStatus.REJECTED]: "passed", [QueryStatus.NO_RESPONSE]: "noReply",
};
/**
 * The agent's FIRST answer: the first dated step after Queried that is an agent's answer (a request, an offer, a pass,
 * or the no-reply close). Days are counted from the query. When no such step is dated in the history, the item's own
 * answer is the only answer known, and it is used; with no dates at all, null (nothing is invented).
 */
export function firstAnswer(i: RespItem): FirstAnswer | null {
  const sent = i.queriedMs;
  if (sent == null) return null;
  for (const s of i.row.history.spans) {
    const kind = FIRST_KIND[s.status];
    if (kind) return { status: s.status, kind, ms: s.startMs, days: Math.max(0, wholeDays(sent, s.startMs)) };
  }
  if (i.answerMs == null) return null;
  return { status: i.row.status, kind: i.group, ms: i.answerMs, days: Math.max(0, wholeDays(sent, i.answerMs)) };
}

/** The typical (median) of a list of days: the middle value, the upper of the two middles when the count is even
 *  (the reference's own definition, `v[floor(n/2)]`). Null for an empty list. */
export function medianDays(list: readonly number[]): number | null {
  if (!list.length) return null;
  const v = list.slice().sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}
/** D4 — "your typical wait for a reply": the median days to a first answer over requests and passes. No-reply closes are excluded: a close is the writer's act, not a reply. */
export function typicalWait(items: readonly RespItem[]): number | null {
  const d: number[] = [];
  for (const i of items) { const f = firstAnswer(i); if (f && f.kind !== "noReply") d.push(f.days); }
  return medianDays(d);
}

export interface WaitBracket<R extends RespRowInput = RespRowInput> {
  key: "w2" | "w4" | "w8" | "over";
  label: string;
  more: RespItem<R>[]; passed: RespItem<R>[]; noReply: RespItem<R>[];
  total: number;
}
export const BRACKETS = [
  { key: "w2", label: "Within 2 weeks", lo: 0, hi: 14 },
  { key: "w4", label: "2 to 4 weeks", lo: 15, hi: 28 },
  { key: "w8", label: "4 to 8 weeks", lo: 29, hi: 56 },
  { key: "over", label: "Over 8 weeks", lo: 57, hi: Number.POSITIVE_INFINITY },
] as const;
/**
 * D4 — the four bars of "How long agents took": every answered item by the days to its FIRST answer, no-reply closes
 * INCLUDED, each bar split by the kind of that first answer. `undated` counts the answered items with no dated first
 * answer, so `sum(total) + undated` is always the answered count.
 */
export function waitBrackets<R extends RespRowInput>(items: readonly RespItem<R>[]): { bars: WaitBracket<R>[]; undated: number } {
  const bars: WaitBracket<R>[] = BRACKETS.map((b) => ({ key: b.key, label: b.label, more: [], passed: [], noReply: [], total: 0 }));
  let undated = 0;
  for (const i of items) {
    const f = firstAnswer(i);
    if (!f) { undated++; continue; }
    const at = BRACKETS.findIndex((b) => f.days >= b.lo && f.days <= b.hi);
    bars[at][f.kind].push(i); bars[at].total++;
  }
  return { bars, undated };
}
/** the busiest bar ("Most of your answers came {label} after you queried"); the earliest bar wins a tie */
export function busiestBracket(bars: readonly WaitBracket[]): WaitBracket | null {
  let best: WaitBracket | null = null;
  for (const b of bars) if (b.total > 0 && (!best || b.total > best.total)) best = b;
  return best;
}
/** the typical first-answer wait for each kind, and the writer's quickest request (the showcase's subject card) */
export function speedByKind<R extends RespRowInput>(items: readonly RespItem<R>[]): { more: number | null; passed: number | null; noReply: number | null; quickest: { item: RespItem<R>; first: FirstAnswer } | null } {
  const d: Record<FirstKind, number[]> = { more: [], passed: [], noReply: [] };
  let quickest: { item: RespItem<R>; first: FirstAnswer } | null = null;
  for (const i of items) {
    const f = firstAnswer(i);
    if (!f) continue;
    d[f.kind].push(f.days);
    if (f.kind === "more" && (!quickest || f.days < quickest.first.days)) quickest = { item: i, first: f };
  }
  return { more: medianDays(d.more), passed: medianDays(d.passed), noReply: medianDays(d.noReply), quickest };
}

/** how far the passes read: at the query, after the partial, after the full (`furthest`, the Query Centre's) */
export function passDepth(items: readonly RespItem[]): { query: number; partial: number; full: number; total: number } {
  const out = { query: 0, partial: 0, full: 0, total: 0 };
  for (const i of items) if (i.group === "passed") { out[i.furthest]++; out.total++; }
  return out;
}
/** D5 — a personal note: a detailed rejection with its text, or the notes on a revise and resubmit */
export const hasNote = (i: RespItem): boolean => !!i.note && ((i.group === "passed" && i.personal) || i.answer === "rr");
/** the passes with a note against the form replies */
export function noteSplit(items: readonly RespItem[]): { withNote: number; form: number; total: number } {
  let withNote = 0, total = 0;
  for (const i of items) if (i.group === "passed") { total++; if (hasNote(i)) withNote++; }
  return { withNote, form: total - withNote, total };
}
/** "In their words": every item with a note, newest answer first */
export function noteItems<R extends RespRowInput>(items: readonly RespItem<R>[]): RespItem<R>[] {
  return items.filter(hasNote).sort((a, b) => (b.answerMs ?? 0) - (a.answerMs ?? 0) || a.id.localeCompare(b.id));
}

/** queries no agent has answered yet (status Queried), the rows themselves */
export const waitingRows = <R extends RespRowInput>(rows: readonly R[]): R[] => rows.filter((r) => r.status === QueryStatus.QUERIED);
/** D6 — the still-waiting queries the Query Centre calls Gone quiet: `whereItStands` over the row's own expected date */
export function goneQuiet<R extends RespRowInput>(rows: readonly R[], nowMs: number): R[] {
  return waitingRows(rows).filter((r) => whereItStands({ status: r.status, expectedMs: r.expectedMs, stageStartMs: r.stageStartMs ?? null }, nowMs) === "quiet");
}
/** the next reply you can expect: the earliest expected REPLY date still ahead, over the still-waiting queries */
export function nextExpected<R extends RespRowInput>(rows: readonly R[], nowMs: number): R | null {
  let best: R | null = null;
  for (const r of waitingRows(rows)) {
    if (r.expectedKind !== "reply" || r.expectedMs == null || r.expectedMs <= nowMs) continue;
    if (!best || r.expectedMs < best.expectedMs!) best = r;
  }
  return best;
}

/** the page's counts: the three answers, the still waiting, and "sent" = answered + waiting (Withdrawn and Signed are not on the page) */
export interface PageCounts extends RespCounts { waiting: number; replies: number; sent: number }
export function pageCounts(items: readonly RespItem[], rows: readonly { status: QueryStatus }[]): PageCounts {
  const c = respCounts(items), waiting = stillOut(rows);
  return { ...c, waiting, replies: c.more + c.passed, sent: c.answered + waiting };
}
/** a whole percentage, or null with nothing to divide by */
export const pctOf = (a: number, b: number): number | null => (b ? Math.round((a / b) * 100) : null);
/** the showcase needs this many answers before it fills in; below it, the warming-up cards */
export const WARM_NEED = 5;
export const isEarlyDays = (answered: number): boolean => answered > 0 && answered < WARM_NEED;
