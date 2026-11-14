/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryHawk's import rules (two-door import v1; ref design-refs/two-door-import-v1/, screens 2–3).
 * Pure; no React, no db.
 *
 * They run on the review model straight after `parseModel`, on BOTH routes (Smart Import and the
 * headings route), and settle what can be settled without asking. What they settle is listed on the
 * read screen under "Sorted for you", each with its count; what they cannot settle they raise as a
 * question — a reason on the query, which `lib/reviewGate` (still the one definition of what is open)
 * counts like any other.
 *
 * SETTLED, NEVER ASKED:
 *   status-from-dates  a status that disagrees with the query's dates, or a blank one (read as
 *                      Queried) where a later step is dated: the dates decide (decision C);
 *   request-added      a later stage with no request before it: the commit adds the request with no
 *                      date (lib/impliedRungs, as it always has); here it is counted and listed;
 *   agency-blank       an agent with a name and no agency: saved with no agency (decision D);
 *   sent-undated       a query with no sent date and nothing written in its cell: saved undated (D);
 *   response-time      an agent with no response time in the file: left not known (listed only);
 *   no-year            a date with no year: the most recent past day and month (`readTypedDate`).
 * RAISED:
 *   dates-out-of-order any dated step earlier than the step before it (sent → request → material
 *                      sent → outcome). It cannot be imported until the dates run in order (E).
 * Everything the build asked before and is not named above is still asked, untouched.
 */
import { QueryStatus } from "../types";
import type { ReviewReasonCode } from "../types/smartImport";
import type { ReviewAgent, ReviewQuery, ReviewTimelineEvent } from "./smartImportReviewModel";
import { impliedRungs } from "./impliedRungs";
import { readTypedDate, localToday } from "./importTypedDate";
/* the app's one short-month table (lib/dates): "Sep", never "Sept" (the mock's "22 Sept" is not ported) */
import { MONTHS_SHORT } from "./dates";

export type SettledKind = "status-from-dates" | "request-added" | "agency-blank" | "sent-undated" | "response-time" | "no-year";
export interface Settled { kind: SettledKind; count: number }
export interface RaisedQuestion { id: string; code: ReviewReasonCode }
export interface RulesOutcome {
  agents: ReviewAgent[];
  queries: ReviewQuery[];
  /** What was settled, in the read screen's order; a kind with a count of 0 is left out. */
  settled: Settled[];
  /** The questions the rules raised (each is also an open reason on its query). */
  raised: RaisedQuestion[];
}

/** The read screen's order for "Sorted for you". */
export const SETTLED_ORDER: SettledKind[] = ["status-from-dates", "request-added", "agency-blank", "sent-undated", "response-time", "no-year"];

/** A step's place in a query's life: sent, the requests and what was sent for them, then the outcome. */
const RANK: Partial<Record<QueryStatus, number>> = {
  [QueryStatus.QUERIED]: 0,
  [QueryStatus.PARTIAL_REQUESTED]: 1,
  [QueryStatus.PARTIAL_SENT]: 2,
  [QueryStatus.FULL_REQUESTED]: 3,
  [QueryStatus.FULL_SENT]: 4,
  [QueryStatus.REVISE_RESUBMIT]: 5,
  [QueryStatus.RESUBMITTED]: 6,
  [QueryStatus.OFFER]: 7,
  [QueryStatus.SIGNED]: 8,
  [QueryStatus.REJECTED]: 9,
  [QueryStatus.WITHDRAWN]: 9,
  [QueryStatus.NO_RESPONSE]: 9,
};
export const stageRank = (s: QueryStatus): number => RANK[s] ?? 0;
const day = (iso: string | null | undefined) => (iso ?? "").slice(0, 10);

/** A date written with no year ("22/9", "22 Sep", "22nd September"). */
const NO_YEAR = /^\s*(\d{1,2})(st|nd|rd|th)?\s*([/.\-]\s*\d{1,2}|\s+[a-z]+\.?)\s*$/i;
/** The no-year rule: the most recent past occurrence of the day and month, read day first. */
export function readNoYear(raw: string | null | undefined, today: string): string | null {
  const t = (raw ?? "").trim();
  if (!t || !NO_YEAR.test(t)) return null;
  return readTypedDate(t, today);
}

/** A slashed date that cannot be read day first but can month first ("9/22/2026", "9/22"): the
 *  month-first reading, for the "Date to confirm" card. Null for any other text. */
export function monthFirstReading(raw: string | null | undefined, today: string): string | null {
  const m = /^\s*(\d{1,2})\s*([/.\-])\s*(\d{1,2})(?:\s*[/.\-]\s*(\d{2}|\d{4}))?\s*$/.exec(raw ?? "");
  if (!m) return null;
  const [, a, sep, b, y] = m;
  const first = Number(a), second = Number(b);
  if (second <= 12 || first > 12) return null; // reads day first, or not month first either
  return readTypedDate(`${second}${sep}${first}${y ? `${sep}${y}` : ""}`, today);
}

/** The dated steps of a query, sent date first. */
function datedSteps(q: Pick<ReviewQuery, "sentDate" | "timeline">): { rank: number; date: string }[] {
  const out: { rank: number; date: string }[] = [];
  if (q.sentDate) out.push({ rank: 0, date: day(q.sentDate) });
  for (const e of q.timeline) if (e.date) out.push({ rank: stageRank(e.type), date: day(e.date) });
  return out;
}
/** Is any dated step earlier than a step that comes before it? */
export function datesOutOfOrder(q: Pick<ReviewQuery, "sentDate" | "timeline">): boolean {
  const steps = datedSteps(q);
  return steps.some((s) => steps.some((t) => t.rank < s.rank && s.date < t.date));
}

/** The status the dates give: the latest dated event's, when it is further on than the status. */
export function statusFromDates(q: Pick<ReviewQuery, "status" | "timeline">): QueryStatus {
  const dated = q.timeline.filter((e) => !!e.date);
  if (dated.length === 0) return q.status;
  const latest = dated.reduce((a, b) => (day(b.date) > day(a.date) || (day(b.date) === day(a.date) && stageRank(b.type) > stageRank(a.type)) ? b : a));
  return stageRank(latest.type) > stageRank(q.status) ? latest.type : q.status;
}

/** The requests the commit will add with no date: a "sent" stage whose request the file never gave. */
export function requestsAdded(q: Pick<ReviewQuery, "status" | "sentDate" | "timeline">): number {
  const given = new Set<QueryStatus>(q.timeline.map((e) => e.type));
  given.add(q.status);
  return impliedRungs({ agentRef: "", status: q.status, sentDate: q.sentDate, timeline: q.timeline })
    .filter((r) => (r.status === QueryStatus.PARTIAL_REQUESTED || r.status === QueryStatus.FULL_REQUESTED) && !given.has(r.status)).length;
}

const SENT_ASKS = new Set<ReviewReasonCode>(["no-date", "unreadable-date", "missing-day"]);
const EVENT_ASKS = new Set<ReviewReasonCode>(["unreadable-response-date"]);

export function applyImportRules(model: { agents: ReviewAgent[]; queries: ReviewQuery[] }, today: string = localToday()): RulesOutcome {
  const count: Record<SettledKind, number> = { "status-from-dates": 0, "request-added": 0, "agency-blank": 0, "sent-undated": 0, "response-time": 0, "no-year": 0 };
  const raised: RaisedQuestion[] = [];

  const agents = model.agents.map((a) => {
    if (a.deleted) return a;
    if (a.weeks === null) count["response-time"] += 1;
    const asksAgency = a.name.trim() && !a.agency.trim() && !a.agencyWaived && !a.reasons.some((r) => r.kind === "illegible" && !r.resolved);
    if (!asksAgency) return a;
    count["agency-blank"] += 1;
    return { ...a, agencyWaived: true };
  });

  const queries = model.queries.map((q0) => {
    if (q0.removed) return q0;
    let q: ReviewQuery = { ...q0, timeline: q0.timeline.map((e) => ({ ...e })), reasons: q0.reasons.map((r) => ({ ...r })) };
    let noYear = false;

    /* A sent date written with no year: read as the most recent one, and its question goes. */
    if (!q.sentDate && q.reasons.some((r) => SENT_ASKS.has(r.code) && !r.resolved)) {
      const read = readNoYear(q.sentDateRaw, today);
      if (read) { q = { ...q, sentDate: read, reasons: q.reasons.filter((r) => !SENT_ASKS.has(r.code)) }; noYear = true; }
    }
    /* The same for an event date (the template's "Date of last response"). */
    const events: ReviewTimelineEvent[] = q.timeline.map((e) => {
      if (e.date) return e;
      const read = readNoYear(e.raw, today);
      if (!read) return e;
      noYear = true;
      return { ...e, date: read };
    });
    if (events.some((e, i) => e !== q.timeline[i])) {
      q = { ...q, timeline: events };
      if (q.timeline.every((e) => !!e.date)) q = { ...q, reasons: q.reasons.filter((r) => !EVENT_ASKS.has(r.code)) };
    }
    if (noYear) count["no-year"] += 1;

    /* No sent date and nothing written for one: saved undated, never asked (decision D). */
    if (!q.sentDate && !(q.sentDateRaw ?? "").trim() && q.reasons.some((r) => r.code === "no-date")) {
      q = { ...q, sentWaived: true, reasons: q.reasons.filter((r) => r.code !== "no-date") };
      count["sent-undated"] += 1;
    }

    /* The dates decide the status (decision C). */
    const derived = statusFromDates(q);
    if (derived !== q.status) { q = { ...q, status: derived }; count["status-from-dates"] += 1; }

    if (requestsAdded(q) > 0) count["request-added"] += 1;

    /* Dates out of order cannot be imported (decision E): asked first, before anything else on the query. */
    if (datesOutOfOrder(q) && !q.reasons.some((r) => r.code === "dates-out-of-order")) {
      q = { ...q, reasons: [{ code: "dates-out-of-order", resolved: false }, ...q.reasons] };
      raised.push({ id: q.id, code: "dates-out-of-order" });
    }
    for (const r of q.reasons) if (r.code === "outcome-missing" && !r.resolved) raised.push({ id: q.id, code: r.code });
    return q;
  });

  const settled = SETTLED_ORDER.filter((k) => count[k] > 0).map((kind) => ({ kind, count: count[kind] }));
  return { agents, queries, settled, raised };
}

/* ── The read screen's words for what was settled ─────────────────────────────────────────────── */
export const SORTED_HEAD = "Sorted for you";
export const SORTED_ASIDE = "No answer needed";
/** Each kind's line. ⚠️ "Agencies left blank" says "No agency", the app's own words for it (the
 *  review's "Kept as "No agency"", the query origin line): an imported agent is never marked
 *  `agencyUnknown`, so "Agency unknown" would claim a label the import does not write. */
export const SORTED_LINES: Record<SettledKind, { title: string; sub: string }> = {
  "status-from-dates": { title: "Where each query stands", sub: "Worked out from its dates" },
  "request-added": { title: "Requests added", sub: "Saved as No date" },
  "agency-blank": { title: "Agencies left blank", sub: "Saved as No agency" },
  "sent-undated": { title: "Sent dates not in your file", sub: "Saved as No date" },
  "response-time": { title: "Response times not in your file", sub: "Saved as Not known" },
  "no-year": { title: "Dates with no year", sub: "Read as the most recent one" },
};

/* ── The deck's words for the questions the rules and the readers raise (two-door import v1) ──── */
const DONE_AS: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "A partial was requested", [QueryStatus.PARTIAL_SENT]: "A partial was sent",
  [QueryStatus.FULL_REQUESTED]: "A full was requested", [QueryStatus.FULL_SENT]: "A full was sent",
  [QueryStatus.REVISE_RESUBMIT]: "A revise and resubmit came", [QueryStatus.RESUBMITTED]: "A resubmission was sent",
  [QueryStatus.OFFER]: "An offer came", [QueryStatus.SIGNED]: "The signing is dated", [QueryStatus.REJECTED]: "A pass came",
  [QueryStatus.NO_RESPONSE]: "It closed with no reply", [QueryStatus.WITHDRAWN]: "It was withdrawn",
};
const BEFORE: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "the query was sent", [QueryStatus.PARTIAL_REQUESTED]: "the partial was requested",
  [QueryStatus.PARTIAL_SENT]: "the partial was sent", [QueryStatus.FULL_REQUESTED]: "the full was requested",
  [QueryStatus.FULL_SENT]: "the full was sent", [QueryStatus.REVISE_RESUBMIT]: "the revise and resubmit came",
  [QueryStatus.RESUBMITTED]: "the resubmission was sent", [QueryStatus.OFFER]: "the offer came", [QueryStatus.SIGNED]: "the signing",
};
/** "A full was requested before the query was sent." — the first pair of steps out of order; null when none is. */
export function orderSentence(q: Pick<ReviewQuery, "sentDate" | "timeline">): string | null {
  const steps: { type: QueryStatus; rank: number; date: string }[] = [];
  if (q.sentDate) steps.push({ type: QueryStatus.QUERIED, rank: 0, date: day(q.sentDate) });
  for (const e of q.timeline) if (e.date) steps.push({ type: e.type, rank: stageRank(e.type), date: day(e.date) });
  for (const s of steps) {
    const t = steps.find((x) => x.rank < s.rank && s.date < x.date);
    if (t) return `${DONE_AS[s.type] ?? "A step is dated"} before ${BEFORE[t.type] ?? "the step before it"}.`;
  }
  return null;
}
export const ORDER_WORDS = {
  which: "Which date needs changing?",
  fixed: "That works now.",
  press: "Press a date to change it",
  yes: "Yes, that's right",
} as const;

/** "22nd", for "there's no 22nd month". */
export const ordinal = (n: number): string => {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
};
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (iso: string) => day(iso).split("-").map(Number) as [number, number, number];
/** The month-first card's words, from the proposed reading and the number that cannot be a month. */
export const DATE_CONFIRM_WORDS = {
  ask: (iso: string) => { const [y, m, d] = ymd(iso); return `Is this ${d} ${MONTHS_LONG[m - 1]} ${y}?`; },
  why: (notMonth: number) => `Dates are read day first, and there's no ${ordinal(notMonth)} month.`,
  yes: (iso: string) => { const [y, m, d] = ymd(iso); return `Yes, ${d} ${MONTHS_SHORT[m - 1]} ${y}`; },
  change: "No, I'll change it",
} as const;
/** The number in a month-first date that cannot be a month (the 22 of "9/22/2026"). */
export const notAMonth = (raw: string | null | undefined): number => Number(/^\s*\d{1,2}\s*[/.\-]\s*(\d{1,2})/.exec(raw ?? "")?.[1] ?? 0);

/** The outcome card. The four answers are the app's own closed outcomes, with the labels the app
 *  already gives them (the timeline strip's STRIP_EVENT_TYPES and the crossed-out card's "Passed" /
 *  "No response"). The mock's four map one to one: Passed → Rejected, No response → No Response,
 *  Offer → Offer, Withdrawn → Withdrawn. */
export const OUTCOME_CHOICES: { status: QueryStatus; label: string }[] = [
  { status: QueryStatus.REJECTED, label: "Passed" },
  { status: QueryStatus.NO_RESPONSE, label: "No response" },
  { status: QueryStatus.OFFER, label: "Offer" },
  { status: QueryStatus.WITHDRAWN, label: "Withdrawn" },
];
const WRITER_STEP_NAME: Partial<Record<QueryStatus, string>> = { [QueryStatus.QUERIED]: "query", [QueryStatus.PARTIAL_SENT]: "partial", [QueryStatus.FULL_SENT]: "full" };
/** The step the outcome-missing question is about: the latest dated step the writer took. */
export function outcomeStep(q: Pick<ReviewQuery, "timeline">): number {
  let at = -1;
  q.timeline.forEach((e, i) => { if (WRITER_STEP_NAME[e.type] && (at < 0 || day(e.date) >= day(q.timeline[at].date))) at = i; });
  return at;
}
export const OUTCOME_WORDS = {
  ask: (q: Pick<ReviewQuery, "timeline">): string => {
    const e = q.timeline[outcomeStep(q)];
    const when = e?.date ? (() => { const [, m, d] = ymd(e.date!); return `${d} ${MONTHS_LONG[m - 1]}`; })() : "a date in your sheet";
    return `Something happened on ${when}, after the ${WRITER_STEP_NAME[e?.type ?? QueryStatus.QUERIED] ?? "query"} was sent. What was it?`;
  },
} as const;
/** The writer's answer: the dated step becomes that outcome, the status follows it, and the question is answered. */
export function answerOutcome(q: ReviewQuery, outcome: QueryStatus): ReviewQuery {
  const at = outcomeStep(q);
  /* The date was the reply's, so it moves to the outcome. A partial or full the writer sent stays on the
     timeline with no date of its own (the sheet never gave one); the query's own sent date is the spine. */
  const timeline = q.timeline.flatMap((e, i) => (i !== at ? [e]
    : e.type === QueryStatus.QUERIED ? [{ ...e, type: outcome }]
    : [{ type: e.type, date: null, raw: null }, { ...e, type: outcome }]));
  return { ...q, timeline, status: outcome, reasons: q.reasons.map((r) => (r.code === "outcome-missing" ? { ...r, resolved: true } : r)) };
}
/** "Yes, that's right" on the out-of-order card: only once the dates run in order (decision E). */
export function confirmOrder(q: ReviewQuery): ReviewQuery {
  if (datesOutOfOrder(q)) return q;
  return { ...q, reasons: q.reasons.map((r) => (r.code === "dates-out-of-order" ? { ...r, resolved: true } : r)) };
}
