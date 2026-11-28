/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v1 (design-refs/todo-nudge-desk-v1/) — THE DESKTOP NUDGE DESK'S WORDS AND SHAPES, as pure functions,
 * so the locks call what the desk calls: the hawk's line, the three clean answers, the sentence's day word, and the
 * updated timeline's points (to scale, from the last send to the close-it date).
 * ⚠️ IT DECIDES NOTHING THE SAVE DOES NOT. The nudge day is the day the writer picks; the close-it date is the save's own
 * (`offWeekend(addDays(nudge, NUDGE_THEN_DAYS))`, passed in by the flow); the expected date is the Query Centre's
 * (`expectedFor`). Nothing here writes.
 */
import { QueryStatus, type Agent, type Query } from "../types";
import { expectedFor } from "./qcSummary";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";
import { MONTHS_SHORT } from "./dates";

const DAY = 86_400_000;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/* the one month table (lib/dates; src/lib/dates.test.ts allows no other) */
const MON = MONTHS_SHORT;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);
const dayOf = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const days = (a: Date, b: Date) => Math.round((dayOf(b.getTime()).getTime() - dayOf(a.getTime()).getTime()) / DAY);
/** "29 Jul" */
export const shortDate = (d: Date): string => `${d.getDate()} ${MON[d.getMonth()]}`;
/** "Sat 28 Nov" */
export const dowDate = (d: Date): string => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
const anyMs = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return v.getTime();
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === "function") return o.toMillis();
  if (typeof o.seconds === "number") return o.seconds * 1000;
  return null;
};

/* ── the way back (Phase 1) ─────────────────────────────────────────────────────────────────────────────────── */

/** the "Where to start" row exists while "Where to start" does: something on the list needs the writer (arrival v1) */
export const wayBackShown = (all: readonly { group: string }[]): boolean => all.some((t) => t.group !== "house");
/**
 * Esc goes back to "Where to start" from an open task. The caller has already let a text field, a pop, a menu or a journey
 * keep its own Esc (the escape stack); a dialog does too (`modal`), and so does the new-task form (`adding`) and a task
 * being stamped (`held`). Nothing happens on "Where to start" itself.
 */
export function escGoesBack(s: { key: string; selected: boolean; held: boolean; adding: boolean; startShown: boolean; modal: boolean }): boolean {
  return s.key === "Escape" && s.selected && !s.held && !s.adding && !s.modal && s.startShown;
}

/* ── the facts the desk reads ──────────────────────────────────────────────────────────────────────────────────── */

export interface NudgeFacts {
  first: string;
  /** the agency, or the agent's name where there is no agency */
  agencyOr: string;
  /** the last send this wait counts from, and what it was */
  sent: Date | null;
  sentWhat: "query" | "partial" | "full";
  /** the stated reply time this wait reads (the agent's for a query; the house window for a partial or a full) — null
   *  when none is stored, and then there is no expected date either */
  weeks: number | null;
  expected: Date | null;
}
/** read off the query and its agent the way the Query Centre reads them (`expectedFor`) */
export function nudgeFacts(q: Query, agent: Agent | null | undefined, first: string): NudgeFacts {
  const status = q.status as QueryStatus;
  const sentWhat = status === QueryStatus.PARTIAL_SENT ? "partial" : status === QueryStatus.FULL_SENT || status === QueryStatus.RESUBMITTED ? "full" : "query";
  const sends = [q.dateSent, q.partialSentDate, q.fullSentDate].map(anyMs).filter((t): t is number => t != null);
  const last = sends.length ? Math.max(...sends) : null;
  const weeks = sentWhat === "partial" ? STAGE_RESPONSE_WINDOWS.partial : sentWhat === "full" ? STAGE_RESPONSE_WINDOWS.full
    : typeof agent?.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;
  const exp = weeks != null ? expectedFor(q, agent ?? null).ms : null;
  return {
    first, agencyOr: (agent?.agency ?? "").trim() || (agent?.name ?? "").trim() || first,
    sent: last != null ? dayOf(last) : null, sentWhat, weeks, expected: exp != null ? dayOf(exp) : null,
  };
}

/* ── the answers and the sentence ──────────────────────────────────────────────────────────────────────────────── */

export type NudgeWhen = "today" | "yesterday" | "other";
export interface NudgeAnswer { k: NudgeWhen; title: string; sub: string; key: string }
/** the three clean answers: the day under each, a number key (v2: "Another day" shows the picked day once chosen) */
export function nudgeAnswers(today: Date, other: Date | null): NudgeAnswer[] {
  const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return [
    { k: "today", title: "Today", sub: dowDate(today), key: "1" },
    { k: "yesterday", title: "Yesterday", sub: dowDate(y), key: "2" },
    { k: "other", title: "Another day", sub: other ? dowDate(other) : "Pick the day", key: "3" },
  ];
}
/** the sentence's day: "today", "yesterday", "on Wed 25 Nov" */
export function nudgeDayWord(d: Date, today: Date): string {
  const n = days(d, today);
  return n === 0 ? "today" : n === 1 ? "yesterday" : `on ${dowDate(d)}`;
}
/** "You nudged …" under the marker: "Today", "Yesterday", "25 Nov" */
export function nudgeMarkWord(d: Date, today: Date): string {
  const n = days(d, today);
  return n === 0 ? "Today" : n === 1 ? "Yesterday" : shortDate(d);
}
/** how long, in words: weeks under eight weeks ("a week", "five weeks"), else months ("two months") */
export function agoWords(n: number): string {
  const w = Math.max(1, Math.round(n / 7));
  if (w < 8) return w === 1 ? "a week" : `${word(w)} weeks`;
  const m = Math.max(2, Math.round(n / 30.44));
  return `${word(m)} months`;
}

/* ── the timeline (v2: there from the start) ───────────────────────────────────────────────────────────────── */

export const TIMELINE_MARGIN_DAYS = 6;
export interface TimelineShape {
  /** every x is a percentage of the line's width */
  start: { x: number; label: string; date: string };
  due: { x: number; label: string; date: string } | null;
  /** before a pick: today, ringed in rust */
  today: { x: number } | null;
  /** after a pick: the nudge, and the next reminder (the save's own `then`) */
  nudge: { x: number; date: string } | null;
  next: { x: number; date: string } | null;
  solid: { from: number; to: number };
  hatch: { from: number; to: number; ago: string } | null;
  dashed: { from: number; to: number } | null;
}
/**
 * To scale from the last send to the next-reminder date (plus a small margin). Before a pick the scale runs to the
 * reminder a nudge today would set (`then`, passed in as the flow computes it), so nothing jumps when a day is picked.
 * Solid from the send to the expected date; hatched from there to today (or the nudge day): the overdue stretch; after a
 * pick, dashed from the nudge to the next reminder. With no expected date (no reply time stored), or one not yet passed,
 * there is no "weeks up" point and no hatch: the solid run goes to today / the nudge.
 */
export function nudgeTimeline(f: NudgeFacts, nudge: Date | null, then: Date, today: Date): TimelineShape {
  const at = nudge ?? today;
  const start = f.sent ?? at;
  const span = Math.max(1, days(start, then) + TIMELINE_MARGIN_DAYS);
  const x = (d: Date) => Math.round((days(start, d) / span) * 10000) / 100;
  const overdue = f.expected && f.weeks != null && days(f.expected, at) > 0 && days(start, f.expected) > 0 ? f.expected : null;
  const xs = x(start), xa = x(at);
  const startLabel = f.sentWhat === "query" ? "Queried" : f.sentWhat === "partial" ? "Partial sent" : "Full sent";
  return {
    start: { x: xs, label: startLabel, date: shortDate(start) },
    due: overdue ? { x: x(overdue), label: `${f.weeks} weeks up`, date: shortDate(overdue) } : null,
    today: nudge ? null : { x: xa },
    nudge: nudge ? { x: xa, date: nudgeMarkWord(nudge, today) } : null,
    next: nudge ? { x: x(then), date: shortDate(then) } : null,
    solid: { from: xs, to: overdue ? x(overdue) : xa },
    hatch: overdue ? { from: x(overdue), to: xa, ago: agoWords(days(overdue, at)) } : null,
    dashed: nudge ? { from: xa, to: x(then) } : null,
  };
}

/* ── compact on short screens (v2 follow-up) ─────────────────────────────────────────────────────────────────────── */

/** compact when the column's room (its height less its padding) is under the desk's natural height at this width */
export const needsCompact = (natural: number, room: number): boolean => room > 0 && natural > room + 0.5;

/** how far the calendar comes down to stay inside the column: by how much its top would cross it (8px inside), else 0 */
export const calendarShift = (over: number): number => (over > 0 ? Math.ceil(over) : 0);
