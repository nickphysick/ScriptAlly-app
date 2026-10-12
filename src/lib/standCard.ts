/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Where things stand" — the card that closes the panel's ledger (Query panel v2 §C).
 *
 * ⚠️ EVERY CLAUSE IS A FACT THE RECORD HOLDS, AND A CLAUSE WHOSE FACT IS MISSING IS DROPPED, never filled in:
 *    · the agency's stated reply window — `agent.responseTimeWeeks` (absent means not stated);
 *    · the expected-reply date, the send-by date and the offer's answer-by date — the row's `expectedMs`, which is
 *      the Query Centre's own clock (`expectedFor`), by `expectedKind`;
 *    · the nudges — the ledger's own nudge rows, and whether anything came back after each;
 *    · the closing date and how it closed — the row's `stageStartMs` and `closedHow`.
 *    No figure is computed that those do not state.
 *
 * Pure: no React, no Firebase. The component (queries/panel/StandCard) draws what this returns.
 */
import { QueryStatus } from "../types";
import { formatDate } from "./dates";

const DAY = 86_400_000;
const S = QueryStatus;

export type StandTone = "you" | "agent" | "closed";
export interface StandFacts {
  status: QueryStatus;
  /** the agent's first name, or what stands in for it ("The agency") */
  first: string;
  agency: string;
  court: "you" | "agent" | "offer" | "closed";
  /** when the query reached the stage it stands at (for a query with the agent: the last send) */
  stageStartMs: number | null;
  expectedMs: number | null;
  /** the agency's stated reply window, in weeks; null when it states none */
  windowWeeks: number | null;
  /** the latest nudge sent since the stage began with nothing back after it; null when there is none */
  unansweredNudgeMs: number | null;
  closedHow: "passed" | "noReply" | "withdrawn" | null;
  manuscriptTitle: string | null;
}
export interface StandPart { text: string; em?: boolean }
export interface StandCardView {
  tone: StandTone;
  heading: string;
  figure: string | null;
  /** the figure is past its date: rust */
  past: boolean;
  paragraph: StandPart[];
  /** queries with the agent only: how far through the wait, and its two end labels */
  bar: { pct: number; hot: boolean; left: string; right: string } | null;
}

const days = (a: number, b: number): number => Math.max(0, Math.round((b - a) / DAY));
const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? "" : "s"}`;
/** "9 May", with the year when it is not this one. */
const standDate = (ms: number, nowMs: number): string =>
  formatDate(new Date(ms), new Date(ms).getFullYear() === new Date(nowMs).getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const weeksWords = (w: number): string => `${Number.isInteger(w) && w >= 1 && w <= 12 ? NUM[w] : w} week${w === 1 ? "" : "s"}`;
/** A long span, to the nearest half year from a year up: "11 days", "5 months", "a year", "2½ years". */
export function longSpan(d: number): string {
  if (d < 60) return plural(d, "day");
  if (d < 350) return plural(Math.round(d / 30.44), "month");
  const halves = Math.round((d / 365.25) * 2);
  const whole = Math.floor(halves / 2); const half = halves % 2 === 1;
  if (whole === 1 && !half) return "a year";
  return `${whole}${half ? "½" : ""} years`;
}

/**
 * ⚠️ IT NEVER APPRAISES. A date gone by is "past your date"; nobody is "late" and nothing is "overdue" (Nick's
 *    ruling, 12 Oct). The lock sweeps every heading, figure and sentence this returns for both words.
 */
export function standCard(f: StandFacts, nowMs: number): StandCardView {
  const date = (ms: number) => standDate(ms, nowMs);

  if (f.court === "closed") {
    const heading = f.status === S.SIGNED ? `You signed with ${f.first}`
      : f.closedHow === "passed" || f.status === S.REJECTED ? `${f.first} passed`
      : f.closedHow === "withdrawn" || f.status === S.WITHDRAWN ? "You withdrew it"
      : "Closed, no reply";
    return { tone: "closed", heading, figure: f.stageStartMs != null ? date(f.stageStartMs) : null, past: false, paragraph: [{ text: "This query is closed. It stays here, and in your figures." }], bar: null };
  }

  if (f.court === "offer") {
    const left = f.expectedMs != null ? days(nowMs, f.expectedMs) : null;
    const over = f.expectedMs != null && f.expectedMs < nowMs;
    const paragraph: StandPart[] = f.manuscriptTitle
      ? [{ text: `${f.first} has offered to represent ` }, { text: f.manuscriptTitle, em: true }, { text: "." }]
      : [{ text: `${f.first} has offered representation.` }];
    if (f.expectedMs != null) paragraph.push({ text: ` You said you’d answer by ${date(f.expectedMs)}.` });
    return {
      tone: "you", heading: "Your answer is due",
      figure: f.expectedMs == null ? null : over ? `${plural(days(f.expectedMs, nowMs), "day")} over` : `${plural(left!, "day")} left`,
      past: over, paragraph, bar: null,
    };
  }

  if (f.court === "you") {
    const what = f.status === S.PARTIAL_REQUESTED ? "partial" : f.status === S.FULL_REQUESTED ? "full" : "revision";
    const over = f.expectedMs != null && f.expectedMs < nowMs;
    return {
      tone: "you", heading: `Send ${f.first} the ${what}`,
      figure: f.expectedMs == null ? null : over ? `${plural(days(f.expectedMs, nowMs), "day")} over` : `${plural(days(nowMs, f.expectedMs), "day")} left`,
      past: over,
      paragraph: [{ text: f.expectedMs == null ? "Mark it sent once it’s gone." : over ? `It was due on ${date(f.expectedMs)}. Mark it sent once it’s gone.` : `They’re expecting it by ${date(f.expectedMs)}. Mark it sent once it’s gone.` }],
      bar: null,
    };
  }

  /* with the agent */
  const waited = f.stageStartMs != null ? days(f.stageStartMs, nowMs) : null;
  const over = f.expectedMs != null && f.expectedMs < nowMs;
  const bar = f.stageStartMs != null && f.expectedMs != null && f.expectedMs > f.stageStartMs
    ? { pct: Math.max(0, Math.min(100, Math.round(((nowMs - f.stageStartMs) / (f.expectedMs - f.stageStartMs)) * 100))), hot: over, left: `Sent ${date(f.stageStartMs)}`, right: over ? `Expected ${date(f.expectedMs)}` : `Reply by ${date(f.expectedMs)}` }
    : null;

  /* more than a year with nothing back */
  if (waited != null && waited > 365) {
    const closedMs = f.windowWeeks != null && f.stageStartMs != null ? f.stageStartMs + f.windowWeeks * 7 * DAY : null;
    const nudge = f.unansweredNudgeMs != null ? formatDate(new Date(f.unansweredNudgeMs), { month: "long" }) : null;
    const parts: string[] = [];
    if (closedMs != null && closedMs < nowMs) {
      parts.push(`${f.agency || f.first} said they’d reply within ${weeksWords(f.windowWeeks!)}.`);
      parts.push(`That window closed ${longSpan(days(closedMs, nowMs))} ago${nudge ? `, and your nudge in ${nudge} went unanswered` : ""}.`);
    } else if (nudge) parts.push(`Your nudge in ${nudge} went unanswered.`);
    parts.push("Closing it keeps your reply rate honest; you can still record a reply if one ever comes.");
    return {
      tone: "agent", heading: `Still waiting on ${f.first}`, figure: longSpan(waited), past: true, paragraph: [{ text: parts.join(" ") }],
      bar: bar && closedMs != null ? { ...bar, hot: true, pct: 100, right: `Window closed ${date(closedMs)}` } : bar,
    };
  }
  if (f.expectedMs == null) {
    /* no date promised and none set: nothing to count towards, and none is invented */
    return { tone: "agent", heading: `Waiting on ${f.first}`, figure: null, past: false, paragraph: [{ text: "No reply date is recorded for this query." }], bar: null };
  }
  if (over) {
    return { tone: "agent", heading: `No word from ${f.first} yet`, figure: `${plural(days(f.expectedMs, nowMs), "day")} past your date`, past: true, paragraph: [{ text: `You expected a reply by ${date(f.expectedMs)}.` }], bar };
  }
  return { tone: "agent", heading: `Waiting on ${f.first}`, figure: `${plural(days(nowMs, f.expectedMs), "day")} to go`, past: false, paragraph: [{ text: `You expect a reply by ${date(f.expectedMs)}. Nothing to do until then.` }], bar };
}
