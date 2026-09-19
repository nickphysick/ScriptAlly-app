/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcCalendar — the Query Centre calendar's geometry and words (v11). Pure: dates in, pixels and
 * strings out. One continuous track at 11px a day; one lane per query; one bar per STAGE of its
 * journey, from `qcStages.stageHistory`.
 *
 * ⚠️ A BAR IS NEVER PLACED BY GUESSWORK. A query whose current stage nothing dates gets NO lane; it is
 * listed under its group as "stage not dated". A past stage is drawn only between two dated ends.
 */
import { QueryStatus } from "../types";
import { isClosedStatus } from "./qcStages";
import { CALENDAR_GROUPS, STAGE_NAME, courtOf, isWithYou, shortDay, spanWords, COURT_LABEL, type QcRow } from "./qcSummary";

export const PX_PER_DAY = 11;
export const DAYLIGHT_PX = 4;
export const TODAY_AT = 0.46;
export const PAGE_DAYS = 28;
const DAY = 86_400_000;
const CURRENT_MIN_PX = 30, PAST_MIN_PX = 8, CLOSED_DAYS = 3;

const startOfDay = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const monthStart = (ms: number, add = 0) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth() + add, 1).getTime(); };

export interface CalTrack { startMs: number; endMs: number; widthPx: number; todayX: number }
/** From the start of the month of the EARLIEST query to the end of the third month after today. */
export function calTrack(rows: readonly QcRow[], nowMs: number): CalTrack {
  const sent = rows.map((r) => r.sentMs).filter((t): t is number => t != null);
  const startMs = monthStart(sent.length ? Math.min(...sent, nowMs) : nowMs);
  const endMs = monthStart(nowMs, 4); /* the first instant AFTER the third month following this one */
  const x = (t: number) => Math.round(((startOfDay(t) - startMs) / DAY) * PX_PER_DAY);
  return { startMs, endMs, widthPx: x(endMs), todayX: x(nowMs) };
}
export const xOf = (track: CalTrack, ms: number): number => Math.round(((startOfDay(ms) - track.startMs) / DAY) * PX_PER_DAY);
export const msAt = (track: CalTrack, px: number): number => track.startMs + (px / PX_PER_DAY) * DAY;
/** Where the box opens, and where "Today" returns to: today 46% of the way across. */
export const todayScrollLeft = (track: CalTrack, boxWidth: number): number => Math.max(0, Math.round(track.todayX - boxWidth * TODAY_AT));
export const rangeLabel = (track: CalTrack, scrollLeft: number, boxWidth: number): string =>
  `${shortDay(msAt(track, scrollLeft))} to ${shortDay(msAt(track, scrollLeft + boxWidth))}`;

export interface CalAxis { months: { x: number; label: string }[]; mondays: { x: number; label: string }[]; today: { x: number; label: string } }
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function calAxis(track: CalTrack, nowMs: number): CalAxis {
  const months: CalAxis["months"] = [], mondays: CalAxis["mondays"] = [];
  for (let t = track.startMs; t < track.endMs; t = monthStart(t, 1)) months.push({ x: xOf(track, t), label: MON[new Date(t).getMonth()] });
  const first = new Date(track.startMs);
  first.setDate(first.getDate() + ((8 - first.getDay()) % 7));
  for (let d = first; d.getTime() < track.endMs; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) mondays.push({ x: xOf(track, d.getTime()), label: String(d.getDate()) });
  return { months, mondays, today: { x: track.todayX, label: String(new Date(nowMs).getDate()) } };
}

export interface CalBar {
  key: string;
  status: QueryStatus;
  current: boolean;
  left: number;
  width: number;
  /** The stage is the WRITER's (`isWithYou`): a rust inset on the bar's left edge. */
  you: boolean;
  /** No date promised: the bar ends at today with a dashed, square right end. */
  openRight: boolean;
  /** Expanded only, current only, and only where a date was promised: whose date it is. */
  end: "agent" | "you" | null;
  court: string;
  /** Expanded: the fact line and its mono note. Compact: `tail`. Past bars: `title`. */
  line: string;
  note: string;
  tail: string;
  title: string;
}
export interface CalLane { id: string; row: QcRow; bars: CalBar[] }
export interface CalGroup { key: string; label: string; count: number; lanes: CalLane[]; undated: QcRow[] }

function currentWords(row: QcRow, nowMs: number): { line: string; note: string; tail: string } {
  const since = row.stageStartMs != null ? Math.max(0, Math.round((nowMs - row.stageStartMs) / DAY)) : 0;
  if (row.court === "closed") { const how = STAGE_NAME[row.status]; return { line: `${how} ${row.stageStartMs != null ? shortDay(row.stageStartMs) : ""}`.trim(), note: "", tail: how }; }
  const left = (ms: number) => spanWords(Math.max(0, Math.round((ms - nowMs) / DAY)));
  const past = (ms: number) => spanWords(Math.max(0, Math.round((nowMs - ms) / DAY)));
  if (row.court === "you") {
    if (row.expectedMs == null) return { line: "No send-by date", note: `${since} ${since === 1 ? "day" : "days"} since request`, tail: "no send-by date" };
    return row.expectedMs >= nowMs
      ? { line: `Due ${shortDay(row.expectedMs)}`, note: `${left(row.expectedMs)} left`, tail: `due ${shortDay(row.expectedMs)}` }
      : { line: `Due ${shortDay(row.expectedMs)}`, note: `${past(row.expectedMs)} past your send-by date`, tail: `${past(row.expectedMs)} past your send-by date` };
  }
  if (row.expectedMs == null) return { line: row.court === "offer" ? "No decision date" : "No date promised", note: `${spanWords(since)} ${row.court === "offer" ? "since the offer" : "waiting"}`, tail: row.court === "offer" ? "no decision date" : "no date promised" };
  if (row.court === "offer") return { line: `Decision by ${shortDay(row.expectedMs)}`, note: row.expectedMs >= nowMs ? `${left(row.expectedMs)} left` : `${past(row.expectedMs)} past the decision date`, tail: `decision by ${shortDay(row.expectedMs)}` };
  return row.expectedMs < nowMs
    ? { line: `Reply expected ${shortDay(row.expectedMs)}`, note: `${past(row.expectedMs)} past the window`, tail: `${past(row.expectedMs)} past the window` }
    : { line: `Reply expected ${shortDay(row.expectedMs)}`, note: `${spanWords(since)} waiting`, tail: `reply by ${shortDay(row.expectedMs)}` };
}

export function laneBars(row: QcRow, track: CalTrack, nowMs: number): CalBar[] {
  if (!row.history.dated) return [];
  const bars: CalBar[] = row.history.spans.map((s, i) => {
    const left = xOf(track, s.startMs);
    const court = COURT_LABEL[courtOf(s.status)];
    if (!s.current) {
      const end = s.endMs ?? s.startMs;
      const dates = `${shortDay(s.startMs)} to ${shortDay(end)}`;
      const lasted = spanWords(Math.max(1, Math.round((end - s.startMs) / DAY)));
      /* 4px of daylight wherever the status changes — taken off the END of the earlier bar */
      return { key: `${row.id}:${i}`, status: s.status, current: false, left, width: Math.max(xOf(track, end) - left - DAYLIGHT_PX, PAST_MIN_PX), you: isWithYou(s.status), openRight: false, end: null, court,
        line: dates, note: lasted, tail: dates, title: `${STAGE_NAME[s.status]}, ${dates}` };
    }
    const closed = isClosedStatus(s.status);
    const openRight = !closed && row.expectedMs == null;
    const endMs = closed ? s.startMs + CLOSED_DAYS * DAY : row.expectedMs ?? nowMs;
    const w = currentWords(row, nowMs);
    return { key: `${row.id}:${i}`, status: s.status, current: true, left, width: Math.max(xOf(track, endMs) - left, CURRENT_MIN_PX), you: isWithYou(s.status), openRight,
      end: closed || openRight ? null : row.withYou ? "you" : "agent", court, ...w, title: `${STAGE_NAME[s.status]}, ${w.line}${w.note ? `, ${w.note}` : ""}` };
  });
  /**
   * ⚠️ A STAGE THAT LASTED LESS THAN A DAY STILL GETS ITS SLIVER, AND THE NEXT BAR STARTS AFTER IT.
   * A request and its send on the same day are 0px apart; the 8px minimum then ran the sliver 8px INTO
   * the bar that follows (measured on the test account: one gap of −8 among seven of 4). Laid out left
   * to right instead: a bar never starts inside the one before it plus its daylight. The later bar
   * gives up at most a day's width at its start, and its TITLE still states the true dates.
   */
  for (let i = 1; i < bars.length; i++) {
    const floor = bars[i - 1].left + bars[i - 1].width + DAYLIGHT_PX;
    if (bars[i].left < floor) {
      const shift = floor - bars[i].left;
      bars[i].left = floor;
      bars[i].width = Math.max(bars[i].width - shift, bars[i].current ? CURRENT_MIN_PX : PAST_MIN_PX);
    }
  }
  return bars;
}

/** Grouped by CURRENT status, in the calendar's order; within a group, the soonest date first. */
export function calGroups(rows: readonly QcRow[], track: CalTrack, nowMs: number): CalGroup[] {
  return CALENDAR_GROUPS.map((g) => {
    const mine = rows.filter((r) => (g === "closed" ? r.court === "closed" : r.status === g))
      .sort((a, b) => (a.expectedMs ?? nowMs) - (b.expectedMs ?? nowMs) || (a.stageStartMs ?? 0) - (b.stageStartMs ?? 0) || a.id.localeCompare(b.id));
    return {
      key: g, label: g === "closed" ? "Closed" : STAGE_NAME[g], count: mine.length,
      lanes: mine.filter((r) => r.history.dated).map((r) => ({ id: r.id, row: r, bars: laneBars(r, track, nowMs) })),
      undated: mine.filter((r) => !r.history.dated),
    };
  }).filter((g) => g.count > 0);
}
