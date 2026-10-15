/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoCleared — THE ONE DERIVATION OF "CLEARED" (To-do list v5, Part B).
 *
 * What took a task off the board, read from records that already exist. Nothing here is stored and
 * nothing is estimated: the To-do header's "Cleared this week" ring and the desk's "Done today" slips
 * both read this function, so they cannot disagree about what was done.
 *
 * The acts, and the record each is read from:
 *   - materials sent, a revision resubmitted, a nudge recorded, a query closed by the writer, an offer
 *     decided — a drawer-written activity, by its `eventKey`, dated by the activity's `date`;
 *   - a housekeeping gap filled — the `data_quality_poor` task flag's `resolvedAt`;
 *   - an own task ticked — the `UserTask`'s `completedAt`.
 *
 * ⚠️ ONLY WHAT CARRIES A DATE COUNTS. A record without one (an activity with no parseable `date`, a
 *    resolved flag with no `resolvedAt`, a done task with no `completedAt` — written before the stamp
 *    existed) is left out rather than guessed into this week.
 * ⚠️ SNOOZED AND DISMISSED ARE NOT CLEARED. A snooze is a flag's `snoozedUntil`; it never sets
 *    `resolvedAt`, and nothing here reads `snoozedUntil`.
 * ⚠️ AN ACTIVITY'S `date` IS THE DAY THE WRITER GAVE FOR THE EVENT. There is no "recorded at" field on
 *    the feed, so a send recorded today and dated last week is last week's. Stated, not corrected.
 * ⚠️ THE WEEK IS LONDON'S: Monday 00:00 Europe/London to the end of today, across the clock changes.
 * ⚠️ AND "TODAY" RUNS TO TONIGHT, NOT TO NOW. The drawer dates an act by its DAY, stored as local noon (`dayIso`), so a
 *    send recorded "today" at 10am carries a time two hours ahead. Bounding the window at `now` dropped it from the
 *    ring and from Done today until lunchtime (measured, TD5 D2's first run). Such an act is `timed: false`: it holds a
 *    day, not a time, and a slip says "Today" rather than printing 12:00 as if it were the moment.
 */
import type { Activity, Agent, Query, TaskFlag, UserTask } from "../types";
import { agentPrimary } from "./agentDisplay";
import { dayMonth } from "./dates";

export type ClearedKind = "sent" | "resubmitted" | "nudged" | "closed" | "answered" | "filled" | "ticked";

export interface ClearedAct {
  kind: ClearedKind;
  /** the rubber stamp's word */
  stamp: "SENT" | "NUDGED" | "CLOSED" | "ANSWERED" | "SAVED" | "DONE";
  /** what was cleared, in words: "Partial to Greg Panetta" */
  label: string;
  /** what it did, in words: "Now Partial sent" */
  consequence: string;
  at: number;
  /** false where the record holds a day and not a time (a drawer-written activity) */
  timed: boolean;
  queryId?: string;
  agentId?: string;
  taskId?: string;
  /** the record this act was read from, so a list can key on it */
  id: string;
}

/** the eventKeys that take a task off the board, and how each reads */
const EVENT_KIND: Record<string, ClearedKind> = {
  partial_sent: "sent",
  full_sent: "sent",
  resubmitted: "resubmitted",
  nudge_sent: "nudged",
  closed_no_reply: "closed",
  withdrawn: "closed",
  closed_agent_gone: "closed",
  signed: "answered",
  offer_declined: "answered",
};
/** the kinds this derivation can date — every other kind is absent, never guessed */
export const CLEARED_KINDS: readonly ClearedKind[] = ["sent", "resubmitted", "nudged", "closed", "answered", "filled", "ticked"];

const STAMP: Record<ClearedKind, ClearedAct["stamp"]> = {
  sent: "SENT", resubmitted: "SENT", nudged: "NUDGED", closed: "CLOSED", answered: "ANSWERED", filled: "SAVED", ticked: "DONE",
};

const ms = (iso: string | undefined | null): number => {
  if (!iso) return NaN;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
};

/* ── London calendar ───────────────────────────────────────────────────────────────────────── */

const LONDON = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  weekday: "short", hourCycle: "h23",
});
interface LondonParts { y: number; m: number; d: number; h: number; mi: number; s: number; wd: number }
const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
function londonParts(t: number): LondonParts {
  const p: Record<string, string> = {};
  for (const x of LONDON.formatToParts(new Date(t))) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: WD[p.weekday] ?? 0 };
}
/** London's offset from UTC at an instant, in ms (0 in winter, +1h in summer) */
function londonOffset(t: number): number {
  const p = londonParts(t);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000;
}
/** the instant London's calendar day y-m-d begins */
function londonMidnight(y: number, m: number, d: number): number {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - londonOffset(guess);
  /* a midnight on the far side of a clock change takes the offset that holds AT it */
  t = guess - londonOffset(t);
  return t;
}
/** 00:00 today, London */
export function londonDayStart(nowMs: number): number {
  const p = londonParts(nowMs);
  return londonMidnight(p.y, p.m, p.d);
}
/** Monday 00:00 of this week, London */
export function londonWeekStart(nowMs: number): number {
  const p = londonParts(nowMs);
  const mon = new Date(Date.UTC(p.y, p.m - 1, p.d - p.wd));
  return londonMidnight(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate());
}
/** "09:40", London */
export function londonClock(t: number): string {
  const p = londonParts(t);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/* ── the derivation ────────────────────────────────────────────────────────────────────────── */

export interface ClearedData {
  activities: readonly Activity[];
  taskFlags: readonly TaskFlag[];
  userTasks: readonly UserTask[];
  queries: readonly Query[];
  agents: readonly Agent[];
}

const MATERIAL: Record<string, string> = { partial_sent: "Partial", full_sent: "Full", resubmitted: "Revision" };

/** the instant London's today ends (its next midnight) */
export function londonDayEnd(nowMs: number): number {
  const start = londonDayStart(nowMs);
  return londonDayStart(start + 36 * 3600 * 1000);
}

/**
 * Every act that took a task off the board at or after `sinceMs` and before the end of `nowMs`'s London day, newest
 * first.
 * Each record is counted once: an activity by its id, a flag by its id, a task by its id.
 */
export function clearedSince(data: ClearedData, sinceMs: number, nowMs: number = Date.now()): ClearedAct[] {
  const out: ClearedAct[] = [];
  const seen = new Set<string>();
  const until = londonDayEnd(nowMs);
  const inWindow = (t: number) => Number.isFinite(t) && t >= sinceMs && t < until;
  const agentOfQuery = (qid: string | undefined) => {
    const q = qid ? data.queries.find((x) => x.id === qid) : undefined;
    const a = q?.agentId ? data.agents.find((x) => x.id === q.agentId) : undefined;
    return { q, a, name: a ? agentPrimary(a) : "an agent" };
  };

  for (const act of data.activities) {
    const kind = act.eventKey ? EVENT_KIND[act.eventKey] : undefined;
    if (!kind) continue;
    const t = ms(act.date);
    if (!inWindow(t)) continue;
    const id = `act:${act.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const { q, a, name } = agentOfQuery(act.queryId);
    let label = "";
    let consequence = "";
    switch (kind) {
      case "sent":
      case "resubmitted":
        label = `${MATERIAL[act.eventKey!]} to ${name}`;
        consequence = act.resultingStatus ? `Now ${act.resultingStatus.toLowerCase().replace(/^./, (c) => c.toUpperCase())}` : "Recorded on the query";
        break;
      case "nudged":
        label = `Nudged ${name}`;
        consequence = q?.nudgeDate ? `Check back on ${dayMonth(q.nudgeDate)}` : "Recorded on the query";
        break;
      case "closed":
        label = `Closed ${name}`;
        consequence = "Moved to Closed";
        break;
      case "answered":
        label = `Offer from ${name}`;
        consequence = act.eventKey === "signed" ? "Signed" : "Offer declined";
        break;
      default: break;
    }
    out.push({ kind, stamp: STAMP[kind], label, consequence, at: t, timed: false, queryId: act.queryId || undefined, agentId: a?.id, id });
  }

  for (const f of data.taskFlags) {
    if (f.taskType !== "data_quality_poor") continue;
    const t = ms(f.resolvedAt);
    if (!inWindow(t)) continue;
    const id = `flag:${f.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const a = f.agentId ? data.agents.find((x) => x.id === f.agentId) : undefined;
    out.push({
      kind: "filled", stamp: "SAVED", label: a ? `Profile for ${agentPrimary(a)}` : "An agent’s profile",
      consequence: "On their profile", at: t, timed: true, agentId: f.agentId, id,
    });
  }

  for (const u of data.userTasks) {
    if (!u.done) continue;
    const t = ms(u.completedAt);
    if (!inWindow(t)) continue;
    const id = `task:${u.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ kind: "ticked", stamp: "DONE", label: u.text || "Your task", consequence: "Off your list", at: t, timed: true, taskId: u.id, id });
  }

  return out.sort((x, y) => y.at - x.at);
}

/** this week's acts (Monday 00:00 London to the end of today) */
export const clearedThisWeek = (data: ClearedData, nowMs: number = Date.now()): ClearedAct[] =>
  clearedSince(data, londonWeekStart(nowMs), nowMs);
/** today's acts (00:00 London to the end of today) */
export const clearedToday = (data: ClearedData, nowMs: number = Date.now()): ClearedAct[] =>
  clearedSince(data, londonDayStart(nowMs), nowMs);
