/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import review's timeline strip (ref design-refs/import-timeline-strip-v1.html): a query's whole
 * timeline as one row of steps — Query sent, then each event in date order — each one editable, with
 * "+ Add an event". It replaces the two-dates card, the sent-date cards of a query that has events, and
 * the ready row's Status-and-Date-sent panel. Pure; no React.
 *
 * ⚠️ STATUS FOLLOWS THE LATEST STEP. On the strip a query's status is not picked on its own: every edit
 * writes the timeline and sets `status` to the type of the latest step (Queried when there is none). A
 * query arriving at a status with no event of that type shows that status as an undated step at the end
 * of the line (`stripEvents`), because the commit writes that rung anyway (lib/impliedRungs) and the
 * strip says what will be written. The first edit makes it a real event.
 *
 * Nothing here is written anywhere: every function returns a new ReviewQuery for the review's state,
 * and the import commits it through `modelToResult` as before.
 */
import { QueryStatus } from "../types";
import type { ReviewReasonCode } from "../types/smartImport";
import type { ReviewQuery, ReviewTimelineEvent } from "./smartImportReviewModel";
import { STAGE_NAME, tileCourt } from "./qcSummary";

/** The event types the pop-over offers, in the order a query moves through them, with their labels. */
export const STRIP_EVENT_TYPES: { type: QueryStatus; label: string }[] = [
  { type: QueryStatus.PARTIAL_REQUESTED, label: "Partial requested" },
  { type: QueryStatus.PARTIAL_SENT, label: "Partial sent" },
  { type: QueryStatus.FULL_REQUESTED, label: "Full requested" },
  { type: QueryStatus.FULL_SENT, label: "Full sent" },
  { type: QueryStatus.REVISE_RESUBMIT, label: "Revise & resubmit" },
  { type: QueryStatus.OFFER, label: "Offer" },
  { type: QueryStatus.REJECTED, label: "Passed" },
  { type: QueryStatus.NO_RESPONSE, label: "No response" },
  { type: QueryStatus.WITHDRAWN, label: "Withdrawn" },
];

/** The reasons the strip answers: two dates, every sent-date question, and the response-date ones
 *  (the strip asks a date of every event, so a separate response-date card would ask it twice). */
export const STRIP_CODES = new Set<ReviewReasonCode>([
  "two-dates", "no-date", "unreadable-date", "ambiguous-date", "missing-day", "serial-outlier",
  "unreadable-response-date", "ambiguous-response-date",
]);
const SENT_ASKS = new Set<ReviewReasonCode>(["no-date", "missing-day", "unreadable-date", "ambiguous-date", "serial-outlier"]);

/** The chip a strip card wears. */
export const STRIP_CHIP = "Timeline to check";

/**
 * Does this query get the strip card? Yes with an open two-dates question, or with at least one
 * timeline event and an open sent-date question. A query with no events and one date question keeps
 * its single-date card.
 */
export function stripEligible(q: ReviewQuery): boolean {
  const open = q.reasons.filter((r) => !r.resolved).map((r) => r.code);
  if (open.includes("two-dates")) return true;
  return q.timeline.length > 0 && open.some((c) => SENT_ASKS.has(c));
}

/** The review's choice for a query's card: the strip when the query was ever strip-eligible
 *  (`seen` — fixed once seen, so removing a step does not swap the card under the writer's hand) and
 *  the question on show is one the strip answers. */
export function showsStrip(q: ReviewQuery, seen: ReadonlySet<string>): boolean {
  const open = q.reasons.find((r) => !r.resolved);
  return !!open && seen.has(q.id) && STRIP_CODES.has(open.code);
}

/** The events the strip shows: the timeline, plus the status as an undated last step when no event
 *  carries it (Queried needs none). */
export function stripEvents(q: ReviewQuery): ReviewTimelineEvent[] {
  const evs = q.timeline.map((t) => ({ ...t }));
  if (q.status !== QueryStatus.QUERIED && !evs.some((e) => e.type === q.status)) evs.push({ type: q.status, date: null, raw: null });
  return evs;
}

const day = (iso: string | null | undefined) => (iso ?? "").slice(0, 10);

/** The indices of `events` in strip order: by date, an undated event at the end in the order it was added. */
export function stripOrder(events: readonly ReviewTimelineEvent[]): number[] {
  return events.map((_, i) => i).sort((a, b) => {
    const da = day(events[a].date) || "9999", db = day(events[b].date) || "9999";
    return da < db ? -1 : da > db ? 1 : a - b;
  });
}

/** The latest step's status: the last event in strip order, or Queried. */
export function latestStatus(events: readonly ReviewTimelineEvent[]): QueryStatus {
  const o = stripOrder(events);
  return o.length ? events[o[o.length - 1]].type : QueryStatus.QUERIED;
}

/** The status to pre-choose for "+ Add an event": the type after the latest step's. */
export function nextEventType(events: readonly ReviewTimelineEvent[]): QueryStatus {
  const last = latestStatus(events);
  const i = STRIP_EVENT_TYPES.findIndex((t) => t.type === last);
  return STRIP_EVENT_TYPES[Math.min(i + 1, STRIP_EVENT_TYPES.length - 1)].type;
}

/** A step's name on its tile: the Query Centre's own (Rejected reads "Passed"). */
export const stepName = (s: QueryStatus): string => STAGE_NAME[s] ?? String(s);

/** "Where it stands": the latest step's name and its court, from the Query Centre's own courts. */
export function whereItStands(q: ReviewQuery): { stage: string; court: "with the agent" | "your move" | "closed" } {
  const s = latestStatus(stripEvents(q));
  const c = tileCourt(s);
  return { stage: s === QueryStatus.QUERIED ? "Queried, no reply yet" : stepName(s), court: c === "agent" ? "with the agent" : c === "you" ? "your move" : "closed" };
}

/** Is any event dated before the query was sent? */
export const eventBeforeSent = (q: ReviewQuery): boolean =>
  !!q.sentDate && stripEvents(q).some((e) => !!e.date && day(e.date) < day(q.sentDate));

/** What the strip still needs before it is answered, first thing first; null when it is answered. */
export type StripNeed = "sent" | "dates" | "order";
export function stripNeed(q: ReviewQuery): StripNeed | null {
  if (!q.sentDate && !q.sentWaived) return "sent";
  if (stripEvents(q).some((e) => !e.date)) return "dates";
  if (eventBeforeSent(q)) return "order";
  return null;
}

export const STRIP_WORDS = {
  ask: (name: string | null) => (name ? `Is this ${name}'s timeline right?` : "Is this query's timeline right?"),
  stands: "Where it stands:",
  pressAny: "Press any step to change it.",
  before: "An event is dated before the query was sent.",
  needSent: "Add the date you sent it first",
  needDates: "Add a date for every step",
  needOrder: "Fix the dates first",
  yes: "Yes, that's right",
  sent: "Query sent",
  noDate: "No date",
  addDate: "Add the date",
  add: "+ Add an event",
  askSent: "When did you send it?",
  askEvent: "What happened, and when?",
  askNew: "What happened?",
  newNote: "It'll slot in where it belongs on the timeline, based on the date you give it.",
  placeholder: "Date, e.g. 22/9 or 22 Sep",
  hint: "Type it, or pick it.",
  bad: "Try 22/9 or 22 Sep.",
  save: "Save",
  addBtn: "Add",
  cancel: "Cancel",
  remove: "Remove",
  waive: "I don't have it",
  done: "Done",
} as const;

export const stripButton = (need: StripNeed | null): string =>
  need === "sent" ? STRIP_WORDS.needSent : need === "dates" ? STRIP_WORDS.needDates : need === "order" ? STRIP_WORDS.needOrder : STRIP_WORDS.yes;

/* ── Edits: each returns a new query, its timeline written whole and its status the latest step ── */
const settle = (q: ReviewQuery, events: ReviewTimelineEvent[], over: Partial<ReviewQuery> = {}): ReviewQuery =>
  ({ ...q, ...over, timeline: events, status: latestStatus(events) });

export const setSentDate = (q: ReviewQuery, iso: string): ReviewQuery =>
  settle(q, stripEvents(q), { sentDate: iso, sentDateRaw: null, sentWaived: false });

/** "I don't have it": kept undated on purpose, exactly as "I don't have this date" is. */
export const waiveSentDate = (q: ReviewQuery): ReviewQuery =>
  settle(q, stripEvents(q), { sentDate: null, sentDateRaw: null, sentWaived: true });

export const addEvent = (q: ReviewQuery, type: QueryStatus, iso: string): ReviewQuery =>
  settle(q, [...stripEvents(q), { type, date: iso, raw: null }]);

/** `index` is into `stripEvents(q)`. */
export const editEvent = (q: ReviewQuery, index: number, type: QueryStatus, iso: string): ReviewQuery =>
  settle(q, stripEvents(q).map((e, i) => (i === index ? { ...e, type, date: iso, raw: e.date === iso ? e.raw : null } : e)));

export const removeEvent = (q: ReviewQuery, index: number): ReviewQuery =>
  settle(q, stripEvents(q).filter((_, i) => i !== index));

/** "Yes, that's right": the timeline written as shown, and every reason the strip replaced answered. */
export function confirmStrip(q: ReviewQuery): ReviewQuery {
  if (stripNeed(q) !== null) return q;
  return settle(q, stripEvents(q), { reasons: q.reasons.map((r) => (STRIP_CODES.has(r.code) ? { ...r, resolved: true } : r)) });
}

/** The month the calendar opens on: the chosen date, else the adjacent step's date, else today. */
export function calendarStart(q: ReviewQuery, target: "sent" | "new" | number, today: string): string {
  const evs = stripEvents(q);
  const order = stripOrder(evs);
  const dated = order.map((i) => evs[i].date).filter((d): d is string => !!d);
  if (target === "sent") return day(q.sentDate) || dated[0] || today;
  if (target === "new") return dated[dated.length - 1] || day(q.sentDate) || today;
  const own = day(evs[target]?.date);
  if (own) return own;
  const at = order.indexOf(target);
  for (let k = at - 1; k >= 0; k--) { const d = day(evs[order[k]].date); if (d) return d; }
  return day(q.sentDate) || today;
}
