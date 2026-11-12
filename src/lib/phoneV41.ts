/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4.1 (design-refs/phone-app-v4-1/) — WHAT TODAY'S HEADER AND THE BIRDS-EYE VIEWS READ, below 768px only.
 * Every figure is an engine the app already has; nothing here restates a rule:
 *   - the chart's weekly active queries: the dashboard's own ledger (`dailyLedger` → `aggregateLedger`, lib/oneScreen);
 *   - the bars, months and week ticks: the desktop Birds-eye timeline's own (`tlRow`, `extentOf`, `monthBands`,
 *     `weekTicks`, lib/qcTimeline);
 *   - the groups and their order: the desktop drawer's own (`bvdGroups` with its default view, lib/qcBirdsDrawer).
 * What is added here is WORDS and the windows the phone draws.
 * ⚠️ COPY (PA41-13): never "overdue" or "late". The drawer's first group is named "Past its date" on the phone.
 */
import type { Query } from "../types";
import type { QcRow } from "./qcSummary";
import { aggregateLedger, dailyLedger } from "./oneScreen";
import { BVD_DEFAULT, bvdGroups, type BvdGroupOut } from "./qcBirdsDrawer";
import { STAGE_NAME, tileCourt } from "./qcSummary";
import { currentWords } from "./qcTimeline";
import { dayMonth } from "./dates";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/* ── the header's chart: active queries at each week's close, since the first query ── */
export interface WeekPoint { endMs: number; active: number }
export function activeSeries(queries: readonly Query[], nowMs: number): WeekPoint[] {
  const weeks = aggregateLedger(dailyLedger(queries as Query[], new Date(nowMs)), "weekly");
  /* from the first week anything was out: the ledger's leading empty weeks are before the first query */
  const first = weeks.findIndex((w) => w.sent > 0 || w.active > 0);
  return (first < 0 ? [] : weeks.slice(first)).map((w) => ({ endMs: w.end.getTime(), active: w.active }));
}
/** this week's close minus last week's, from the same series; null under two weeks of data or when nothing moved */
export function weekChange(series: readonly WeekPoint[]): number | null {
  if (series.length < 2) return null;
  const d = series[series.length - 1].active - series[series.length - 2].active;
  return d === 0 ? null : d;
}
export const changeWords = (d: number): string => `${d > 0 ? "▲" : "▼"} ${Math.abs(d)} on last week`;
export const needWords = (n: number): string => `${n} ${n === 1 ? "thing needs" : "things need"} you`;

/* ── the Birds-eye rows: the drawer's own groups, in its own order ── */
export const PHONE_GROUP_LABEL: Record<string, string> = { overdue: "Past its date", upcoming: "Upcoming", watch: "Watch and wait", nodate: "No date" };
export function phoneGroups(rows: readonly QcRow[], nowMs: number): BvdGroupOut[] {
  return bvdGroups(rows, BVD_DEFAULT, nowMs).map((g) => ({ ...g, label: PHONE_GROUP_LABEL[g.key] ?? g.label }));
}
/** the card's rows: the most urgent open queries — past their date first, then soonest due (the drawer's order) */
export function urgentRows(rows: readonly QcRow[], nowMs: number, n = 5): QcRow[] {
  return phoneGroups(rows, nowMs).flatMap((g) => g.rows.map((r) => r.row)).slice(0, n);
}

/** the short line after a name: "Send in 7 days", "Reply in 3 wks", "3 wks past its date", "No date" */
export function shortSay(row: QcRow, nowMs: number, pastWord = "past its date"): { text: string; past: boolean } {
  if (row.expectedMs == null) return { text: "No date", past: false };
  const d = Math.round((row.expectedMs - nowMs) / DAY);
  if (d < 0) {
    const w = Math.round(-d / 7);
    return { text: `${w < 1 ? `${-d} ${d === -1 ? "day" : "days"}` : `${w} ${w === 1 ? "wk" : "wks"}`} ${pastWord}`, past: true };
  }
  const verb = row.expectedKind === "sendBy" ? "Send" : row.expectedKind === "offer" ? "Decide" : tileCourt(row.status) === "you" ? "Send" : "Reply";
  return { text: `${verb} in ${d < 14 ? `${d} ${d === 1 ? "day" : "days"}` : `${Math.round(d / 7)} wks`}`, past: false };
}

/** the card's still window: 90 days with today at 60% across */
export const CARD_DAYS = 90;
export function cardWindow(nowMs: number): { fromMs: number; toMs: number } {
  const fromMs = nowMs - Math.round(CARD_DAYS * 0.6) * DAY;
  return { fromMs, toMs: fromMs + CARD_DAYS * DAY };
}
export const WEEK_MS = WEEK;

/** a day-stamp for "once a day" memories (local date) */
export const dayStamp = (ms: number): string => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
/** true the first time it is asked on a given day for a key; storage refused → always false (no replay) */
export function firstTimeToday(key: string, nowMs: number): boolean {
  try {
    const t = dayStamp(nowMs);
    if (window.localStorage.getItem(key) === t) return false;
    window.localStorage.setItem(key, t);
    return true;
  } catch { return false; }
}

/* ── the full view's words ── */
const startDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** a current bar's long label: the desktop's own sentence, except a passed date, which the phone never calls overdue */
export function longLabel(row: QcRow, nowMs: number): string {
  if (row.expectedMs != null && row.expectedMs < startDay(nowMs)) return `${STAGE_NAME[row.status] ?? row.status} · date was ${dayMonth(row.expectedMs)}`;
  return currentWords(row, nowMs);
}
/** the sentence about the next date, in an expanded row */
export function nextSentence(row: QcRow, nowMs: number): string {
  if (row.expectedMs == null) return tileCourt(row.status) === "you" ? "No send-by date set for this one yet." : "No reply date set for this one yet.";
  const when = dayMonth(row.expectedMs);
  const say = shortSay(row, nowMs);
  if (say.past) return tileCourt(row.status) === "you" ? `This was to be done by ${when}.` : `A reply was expected by ${when}.`;
  const rest = say.text.replace(/^(Send|Reply|Decide) /, "");
  if (row.expectedKind === "offer") return `Your decision is due by ${when}, ${rest}.`;
  return tileCourt(row.status) === "you" ? `Yours to send by ${when}, ${rest}.` : `Reply expected by ${when}, ${rest}.`;
}
/** the stage a query stood at on a given day (its history's spans), or null before it went out */
export function stageOn(row: QcRow, dayMs: number): string | null {
  let k: string | null = null;
  for (const s of row.history.spans) if (s.startMs <= dayMs) k = String(s.status);
  if (k == null && row.sentMs != null && row.sentMs <= dayMs) k = String(row.status);
  return k;
}
export const ZOOM_DAYS = [["6w", "6 weeks", 42], ["3m", "3 months", 90], ["6m", "6 months", 182]] as const;
