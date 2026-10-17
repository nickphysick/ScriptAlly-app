/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 §B — WHAT GOES ON THE TRAY'S CALENDAR, AS ONE DERIVATION. The header card, the slide-out calendar,
 * the h1, the pinned day chip and the Due pill's calendar filters all read this module; nothing re-derives a day.
 *
 * ⚠️ NOT `lib/todoCalendar.ts`. That name is the Calendar page's own layer (agent tasks on the day they LANDED, rolled
 *    forward to today), read by six components. This calendar answers a different question — the day a task is DUE
 *    — so it is its own module, beside it.
 *
 * ⚠️ ONLY WHAT BELONGS TO A DATE. Four kinds, one dot each per day:
 *    send   a request to send materials (the `send` bucket, and `offer_send_full`), on its SEND-BY date
 *           (`expectedSendDate`, written by the response journey's send-by answer, `queryActions/sendBy`);
 *    nudge  a nudge due (`chase`), on `taskDue`'s own day for it (the planned nudge, else the agent's window);
 *    close  consider closing (`close`), on `taskDue`'s own day for it (the booked check-in, else the window);
 *    mine   the writer's own dated task (`note`), on its `dueDate`.
 *    Housekeeping (`fix`) and the offer (`decide`) are never on it. NOTHING HERE DERIVES A DATE THE APP DOES NOT
 *    HOLD: a card with no such date is undated, and counts as "no date".
 *
 * ⚠️ DAYS ARE LONDON DAYS (the app's stated calendar, as `queryingGoals`): a `YYYY-MM-DD` is the day it names, an
 *    instant is the London day it falls on.
 */
import type { Agent, Query, TaskFlag, UserTask } from "../types";
import type { BoardCard } from "./todoBoard";
import { cardBucket } from "./todoBuckets";
import { dueFor } from "./taskCardFacts";
import { flagSleeps } from "./taskFlags";
import { londonDay } from "./queryingGoals";
import type { TaskData } from "./taskCardFacts";

export type CalKind = "send" | "nudge" | "close" | "mine";
export const CAL_KINDS: CalKind[] = ["send", "nudge", "close", "mine"];
/** the words, singular and plural: "1 Material to send" · "2 Materials to send" */
export const CAL_KIND_LABEL: Record<CalKind, [string, string]> = {
  send: ["Material to send", "Materials to send"],
  nudge: ["Nudge due", "Nudges due"],
  close: ["Consider closing", "Consider closing"],
  mine: ["Your task", "Your tasks"],
};
export const calKindLabel = (k: CalKind, n: number): string => CAL_KIND_LABEL[k][n === 1 ? 0 : 1];
/** the drawer's filter pills */
export const CAL_KIND_PILL: Record<CalKind, string> = { send: "SEND MATERIALS", nudge: "NUDGES", close: "CONSIDER CLOSING", mine: "YOUR TASKS" };

/** the London day of any stored date — a `YYYY-MM-DD` as named, an instant as London sees it — or null */
export function londonYmdOf(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? londonDay(new Date(ms)) : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? londonDay(new Date(v)) : null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? londonDay(v) : null;
  const d = (v as { toDate?: () => Date } | null)?.toDate?.();
  if (d instanceof Date && Number.isFinite(d.getTime())) return londonDay(d);
  const s = (v as { seconds?: number } | null)?.seconds;
  return typeof s === "number" ? londonDay(new Date(s * 1000)) : null;
}
/** London's today */
export const londonToday = (nowMs: number): string => londonDay(new Date(nowMs));

/** the task types each kind is raised as — for a snooze, whose card is not on the board */
const SEND_TYPES = new Set(["partial_requested", "full_requested", "offer_send_full"]);

/** which kind a card is on the calendar, or null (housekeeping and the offer) */
export function calendarKind(card: Pick<BoardCard, "taskType" | "userTaskId" | "nature" | "stream">): CalKind | null {
  if (card.taskType === "offer_send_full") return "send";
  switch (cardBucket(card as BoardCard)) {
    case "send": return "send";
    case "chase": return "nudge";
    case "close": return "close";
    case "note": return "mine";
    case "decide":
    case "fix":
      return null;
  }
  return null;
}
/** the kind a snooze flag stands for */
export function flagKind(flag: Pick<TaskFlag, "taskType">): CalKind | null {
  if (SEND_TYPES.has(flag.taskType)) return "send";
  if (flag.taskType === "nudge_overdue") return "nudge";
  if (flag.taskType === "no_response_close") return "close";
  if (flag.taskType === "user_task") return "mine";
  return null;
}

/**
 * The day a card is due on, for its kind — or null (undated). ⚠️ READ, NEVER RE-DERIVED: the send-by date as stored;
 * a nudge's and a close's day as `taskDue` gives it (its natural day: the flags are not passed, so a snooze's hold
 * never stands in for the task's date); an own task's `dueDate`.
 */
export function calendarDay(card: BoardCard, db: TaskData): string | null {
  const kind = calendarKind(card);
  if (!kind) return null;
  if (kind === "mine") {
    const ut = card.userTaskId ? db.userTasks.find((t) => t.id === card.userTaskId) : undefined;
    return londonYmdOf(ut?.dueDate ?? card.dueYmd);
  }
  if (kind === "send") {
    const q = card.relatedRecordId ? db.queries.find((x) => x.id === card.relatedRecordId) : undefined;
    return londonYmdOf(q?.expectedSendDate);
  }
  const due = dueFor(card, db, []);
  return due.ymd;
}

export interface CalItem {
  /** the board card's key; an unsurfaced task's `task:{id}`; a snooze's `flag:{id}` */
  key: string;
  kind: CalKind;
  ymd: string;
  /** false for an own task that has not reached the tray yet (v5.1 I.6) */
  surfaced: boolean;
  /** true for a task set aside until this day: drawn faint, never counted */
  snoozed: boolean;
  card?: BoardCard;
  userTask?: UserTask;
  flag?: TaskFlag;
  /** the drawer's chip and the agenda's line */
  title: string;
  /** the agent (or "Your own task") */
  who: string;
}

const surname = (name: string) => name.trim().split(/\s+/).slice(-1)[0] ?? "";
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** the drawer's chip words: "Send full · Oduya", "Nudge · Sark", "Close? · Vale", or an own task's text */
export function chipLabel(kind: CalKind, deed: string, who: string): string {
  const s = surname(who);
  if (kind === "mine") return deed;
  if (kind === "send") return `${deed.replace(/^Send (your|the) /, "Send ").replace(/ to .*$/, "")}${s ? ` · ${s}` : ""}`;
  if (kind === "nudge") return `Nudge${s ? ` · ${s}` : ""}`;
  return `Close?${s ? ` · ${s}` : ""}`;
}
void firstName;

export interface CalendarInput {
  /** the tray's cards — the ones `n` (the sidebar badge) counts */
  cards: readonly BoardCard[];
  db: TaskData;
  flags: readonly TaskFlag[];
  nowMs: number;
  /** a card's deed, and who it is with (the tray's own words) */
  words?: (card: BoardCard) => { deed: string; who: string };
}

/**
 * Every dated item: the tray's cards with a kind and a day; own dated tasks not yet surfaced (`surfaced: false`); and
 * live snoozes on their return day (`snoozed: true`), so a task moved by a date change still shows where it was put.
 */
export function calendarItems(input: CalendarInput): CalItem[] {
  const { cards, db, flags, nowMs } = input;
  const out: CalItem[] = [];
  const onBoard = new Set<string>();
  for (const c of cards) {
    if (c.userTaskId) onBoard.add(c.userTaskId);
    const kind = calendarKind(c);
    if (!kind) continue;
    const ymd = calendarDay(c, db);
    if (!ymd) continue;
    const w = input.words?.(c) ?? { deed: c.title, who: c.who };
    out.push({ key: c.key, kind, ymd, surfaced: true, snoozed: false, card: c, title: chipLabel(kind, w.deed, w.who), who: w.who });
  }
  for (const t of db.userTasks) {
    if (!t.dueDate || t.done || onBoard.has(t.id)) continue;
    const ymd = londonYmdOf(t.dueDate);
    if (!ymd) continue;
    out.push({ key: `task:${t.id}`, kind: "mine", ymd, surfaced: false, snoozed: false, userTask: t, title: t.text, who: "Your own task" });
  }
  for (const f of flags) {
    if (!f.snoozedUntil || f.skippedAt || !flagSleeps(f, nowMs)) continue;
    const kind = flagKind(f);
    if (!kind) continue;
    const ymd = londonYmdOf(f.snoozedUntil);
    if (!ymd) continue;
    const q = f.queryId ? db.queries.find((x) => x.id === f.queryId) : undefined;
    const ag: Agent | undefined = q ? db.agents.find((a) => a.id === q.agentId) : f.agentId ? db.agents.find((a) => a.id === f.agentId) : undefined;
    const who = (ag?.name ?? "").trim() || (ag?.agency ?? "").trim();
    out.push({ key: `flag:${f.id}`, kind, ymd, surfaced: true, snoozed: true, flag: f, title: chipLabel(kind, kind === "send" ? "Send materials" : "", who), who });
  }
  return out;
}

export interface DayBuckets {
  overdue: number;
  today: number;
  later: number;
  undated: number;
  /** the oldest overdue day, and the next later one */
  oldest: string | null;
  next: string | null;
}

/** counted: surfaced and not snoozed — what is in the tray, by its day */
export const counted = (i: CalItem): boolean => i.surfaced && !i.snoozed && !!i.card;

/**
 * The today panel's four parts. `overdue + today + later + undated === cards.length` — the tray's count, the badge's
 * number — because every tray card is either a counted item (exactly once) or undated.
 */
export function dayBuckets(items: readonly CalItem[], cards: readonly BoardCard[], todayYmd: string): DayBuckets {
  const c = items.filter(counted);
  const dated = new Set(c.map((i) => i.key));
  const overdueDays = c.filter((i) => i.ymd < todayYmd).map((i) => i.ymd).sort();
  const laterDays = c.filter((i) => i.ymd > todayYmd).map((i) => i.ymd).sort();
  return {
    overdue: overdueDays.length,
    today: c.filter((i) => i.ymd === todayYmd).length,
    later: laterDays.length,
    undated: cards.filter((x) => !dated.has(x.key)).length,
    oldest: overdueDays[0] ?? null,
    next: laterDays[0] ?? null,
  };
}

/** a card's place on the calendar, for the tray's filters: its day if counted, else null */
export function dayOfCard(items: readonly CalItem[], key: string): string | null {
  const i = items.find((x) => x.key === key && counted(x));
  return i ? i.ymd : null;
}

/** the items on one day (snoozes included, for the month's faint dots and the day panel's "back from" row) */
export const itemsOn = (items: readonly CalItem[], ymd: string): CalItem[] => items.filter((i) => i.ymd === ymd);

/** the kinds present on a day, in the dots' order */
export function kindsOn(items: readonly CalItem[], ymd: string): { kind: CalKind; n: number; snoozed: boolean }[] {
  const on = itemsOn(items, ymd);
  return CAL_KINDS.flatMap((kind) => {
    const all = on.filter((i) => i.kind === kind);
    if (!all.length) return [];
    const live = all.filter((i) => !i.snoozed);
    return [{ kind, n: (live.length || all.length), snoozed: live.length === 0 }];
  });
}

/** the calendar filter the day panel and the Due pill share */
export type DayFilter = { k: "day"; kind: CalKind; ymd: string };
/* ⚠️ strictNullChecks is off in this repo, so this union does not narrow on `k`: the day member is cast where read */
export type CalFilter = { k: "overdue" | "today" | "later" | "undated" } | DayFilter;

export function calFilterLabel(f: CalFilter, dayLabel: (ymd: string) => string): string {
  if (f.k === "overdue") return "Overdue";
  if (f.k === "today") return "Due today";
  if (f.k === "later") return "Later";
  if (f.k === "undated") return "No date";
  return `Due: ${dayLabel((f as DayFilter).ymd)}`;
}

/** whether a tray card passes a calendar filter */
export function passesCalFilter(f: CalFilter | null, items: readonly CalItem[], key: string, todayYmd: string): boolean {
  if (!f) return true;
  const ymd = dayOfCard(items, key);
  if (f.k === "undated") return ymd === null;
  if (ymd === null) return false;
  if (f.k === "overdue") return ymd < todayYmd;
  if (f.k === "today") return ymd === todayYmd;
  if (f.k === "later") return ymd > todayYmd;
  const it = items.find((x) => x.key === key && counted(x));
  const d = f as DayFilter;
  return ymd === d.ymd && it?.kind === d.kind;
}

/** whole days from a to b (London days; positive when b is later) */
export function daysFrom(a: string, b: string): number {
  const at = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((at(b) - at(a)) / 86_400_000);
}
