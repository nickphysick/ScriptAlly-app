/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoCalendar — the Calendar page's pure layer (tasks-pages pack, Phase 3; ref
 * design-refs/tasks-pages.html, the CALENDAR frame).
 *
 * ⚠️ EVERY ITEM APPEARS ON ITS ACTION DATE, AND NOTHING HERE IS STORED:
 *  · a user TASK on its due date (dueYmd — the two-natures law's own field);
 *  · an AGENT task on the day it landed on your desk — the request's `lastStatusChange` audit
 *    stamp, the SAME basis the board's REQUESTED figures read, falling back to dateSent;
 *  · a SNOOZED item on its return date (the flag's own snoozedUntil);
 *  · a NOTE only if dated — ⚠️ under the two-natures law a dated user card IS a task, so this
 *    set is STRUCTURALLY EMPTY today. The rule is implemented as specified (nature "note" +
 *    dueYmd → the butter family) so the room exists the day the model distinguishes origin;
 *    until then the butter pips simply never fire. Stated in reports/tasks-pages.md.
 *  · housekeeping (sweeps, data-quality, stale) has NO action date — a standing pile is not an
 *    appointment — so it never reaches the calendar. The legend says the same by omission.
 *
 * ⚠️ ROLL-FORWARD IS DERIVED FROM THE CLOCK, NEVER WRITTEN: anything live whose action date has
 * passed renders on TODAY, and the day it left keeps a single "{n} ROLLED FORWARD ↗" marker —
 * the marker, not the items. Nothing moves at midnight because nothing is anywhere: the same
 * derivation just answers differently on the next read.
 *
 * ⚠️ COMPLETED ITEMS STAY ON THE DAY THEY WERE FINISHED, struck through, derived from the
 * activity log (the SAME clearing union the Done column reads: CLEARING_ACTIVITY_TYPES +
 * completed user tasks). They never roll.
 */
import { Activity, Agent, Query, TaskFlag, UserTask } from "../types";
import { BoardCard, terseDoneLabel } from "./todoBoard";
import { BoardColumns } from "./todoColumns";
import { agentPrimary } from "./agentDisplay";
import { CLEARING_ACTIVITY_TYPES } from "./clearedToday";
import { isSnoozed } from "./todoListPage";

export type CalFamily = "agent" | "task" | "snoozed" | "note" | "done";

export interface CalendarItem {
  key: string;
  /** The day it RENDERS on — post roll-forward. */
  ymd: string;
  label: string;
  family: CalFamily;
  /** Present on live items — the pip opens the item sheet on it. Completed items carry none. */
  card?: BoardCard;
  struck?: boolean;
}

export interface CalendarDayData {
  items: CalendarItem[];
  /** Live items that LEFT this day for today — rendered as one marker, never as the items. */
  rolled: number;
}

/* ── date arithmetic (local, ymd-string in and out) ────────────────────────────────────────── */

const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const toYmd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoToYmd = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : toYmd(d);
};

/** Monday-start: 0 for Monday … 6 for Sunday (the ref's DOW row starts MON). */
const mondayIndex = (d: Date): number => (d.getDay() + 6) % 7;

/** The full Monday-start weeks covering the anchor's month — 35 or 42 cells, never a torn row. */
export function monthGridDays(anchorYmd: string): string[] {
  const anchor = parseYmd(anchorYmd);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex(first));
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - mondayIndex(last)));
  const days: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toYmd(d));
  return days;
}

/** The 7 days of the anchor's Monday-start week. */
export function weekDays(anchorYmd: string): string[] {
  const anchor = parseYmd(anchorYmd);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - mondayIndex(anchor));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toYmd(d);
  });
}

export function monthLabel(anchorYmd: string): string {
  return parseYmd(anchorYmd).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
export function weekLabel(anchorYmd: string): string {
  const [a, b] = [weekDays(anchorYmd)[0], weekDays(anchorYmd)[6]].map(parseYmd);
  const same = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString("en-GB", same ? { day: "numeric" } : { day: "numeric", month: "long" });
  const right = b.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `${left}–${right}`;
}

export function shiftMonth(anchorYmd: string, delta: number): string {
  const d = parseYmd(anchorYmd);
  return toYmd(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}
export function shiftWeek(anchorYmd: string, delta: number): string {
  const d = parseYmd(anchorYmd);
  d.setDate(d.getDate() + delta * 7);
  return toYmd(d);
}

export function sameMonth(aYmd: string, bYmd: string): boolean {
  const a = parseYmd(aYmd);
  const b = parseYmd(bYmd);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/* ── placement ─────────────────────────────────────────────────────────────────────────────── */

export interface CalendarInput {
  /** The live columns — the SAME assembleBoardColumns output every Tasks surface reads. */
  cols: BoardColumns;
  flags: TaskFlag[];
  queries: Query[];
  agents: Agent[];
  userTasks: UserTask[];
  activities: Activity[];
  today: string;
  nowMs: number;
}

/** A live card's ACTION date, per source — null = not a calendar citizen (housekeeping piles). */
export function cardActionYmd(c: BoardCard, queries: Query[]): string | null {
  if (c.userTaskId || c.nature) return c.dueYmd ?? null; // a user card without a date is a note — not dated work
  if (c.stream === "do" && c.relatedRecordId) {
    const q = queries.find((x) => x.id === c.relatedRecordId);
    if (!q) return null;
    // the day it LANDED: the request's audit stamp, the same basis the REQUESTED figures read
    const landed = isoToYmd(q.lastStatusChange as string | undefined) ?? isoToYmd(q.dateSent);
    return landed;
  }
  return null; // hk piles (stale, data-quality, sweeps) have no action date
}

const liveFamilyOf = (c: BoardCard): CalFamily =>
  c.userTaskId || c.nature ? (c.nature === "note" ? "note" : "task") : "agent";

/**
 * The whole month's placement in one pass. Returns per-day items (live, rolled-in, completed)
 * plus the origin days' roll-forward counts.
 */
export function calendarDays(input: CalendarInput, visible: string[]): Map<string, CalendarDayData> {
  const byDay = new Map<string, CalendarDayData>();
  const day = (ymd: string): CalendarDayData => {
    let d = byDay.get(ymd);
    if (!d) { d = { items: [], rolled: 0 }; byDay.set(ymd, d); }
    return d;
  };

  // live items — To do + Today columns (the same cards the board renders)
  for (const c of [...input.cols.todo, ...input.cols.today]) {
    const action = cardActionYmd(c, input.queries);
    if (!action) continue;
    const family = liveFamilyOf(c);
    if (action < input.today) {
      /* ⚠️ ROLL-FORWARD: the item renders TODAY; the origin day keeps one marker. */
      day(action).rolled += 1;
      day(input.today).items.push({ key: `cal-${c.key}`, ymd: input.today, label: c.title, family, card: c });
    } else {
      day(action).items.push({ key: `cal-${c.key}`, ymd: action, label: c.title, family, card: c });
    }
  }

  // snoozed returns — on the flag's own date (future by construction; expired flags left the set)
  for (const f of input.flags) {
    if (!isSnoozed(f, input.nowMs) || !f.snoozedUntil) continue;
    const ymd = isoToYmd(f.snoozedUntil);
    if (!ymd) continue;
    const card = input.cols.snoozed.find((c) => c.key === `snz-${f.id}`);
    if (!card) continue; // a note's snooze never boards (boardEligible) — and never calendars
    day(ymd).items.push({ key: `cal-snz-${f.id}`, ymd, label: card.title, family: "snoozed", card });
  }

  // completed — on the day they were finished, struck, from the log. They never roll.
  const inRange = new Set(visible);
  for (const t of input.userTasks) {
    if (!t.done || !t.completedAt) continue;
    const ymd = isoToYmd(t.completedAt);
    if (!ymd || !inRange.has(ymd)) continue;
    day(ymd).items.push({ key: `cal-done-task-${t.id}`, ymd, label: t.text || "Task", family: "done", struck: true });
  }
  for (const a of input.activities) {
    if (!CLEARING_ACTIVITY_TYPES.has(a.activityType)) continue;
    const ymd = isoToYmd(a.date);
    if (!ymd || !inRange.has(ymd)) continue;
    const qq = input.queries.find((x) => x.id === a.queryId);
    const agn = qq ? input.agents.find((x) => x.id === qq.agentId) : undefined;
    day(ymd).items.push({
      key: `cal-done-act-${a.id ?? `${a.queryId}-${a.date}`}`,
      ymd, label: terseDoneLabel(a, agn ? agentPrimary(agn) : undefined), family: "done", struck: true,
    });
  }

  return byDay;
}

/** Busy days fold past this many pips to "+N MORE" (the ref draws 3 + the fold). */
export const CAL_CELL_CAP = 3;
