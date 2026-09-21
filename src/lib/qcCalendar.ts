/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcCalendar — the Query Centre calendar's geometry and words (v11). Pure: dates in, pixels and
 * strings out. One continuous track at 11px a day; one lane per query; one bar per STAGE of its
 * journey, from `qcStages.stageHistory`.
 *
 * ⚠️ A BAR IS NEVER PLACED BY GUESSWORK. A past stage is drawn only between two dated ends, and a
 * stage nothing dates says so in its own words on a bar whose left edge is dashed because its start
 * was drawn rather than recorded (v21 §8) — see `laneBars`.
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
  /**
   * The stage has no dated entry and nothing before it, so its START is invented (v21 §8) — ten
   * days back, drawn with a dashed left edge that says so. A bar that began at a made-up date
   * without saying it was made up would be the worst of the three options.
   */
  openLeft: boolean;
  /**
   * The stretch from the expected date to today, on a bar that has run past it (v21 §8).
   *
   * ⚠️ IT IS A CHILD OF THE BAR, NEVER A SECOND BAR — `left` and `width` are offsets INSIDE the
   * bar rather than track coordinates. Two sibling bars would fight over hover and selection, and
   * the reader would be able to put the pointer "between" one query's two pieces.
   *
   * ⚠️ AND ITS LEFT EDGE *IS* THE EXPECTED DATE. The 1.6px ink line there is not decoration: it is
   * the only thing left marking the date once the bar has grown past it. Same language as the
   * gauges the strip used to draw — colour up to the notch, ink past it.
   */
  over: { left: number; width: number } | null;
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
export interface CalGroup { key: string; label: string; count: number; lanes: CalLane[] }

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

/**
 * ⚠️ A STAGE WITH NO DATED ENTRY NOW DRAWS A BAR (v21 §8), WHERE IT USED TO DRAW NOTHING. The row
 * was excluded from the lanes and listed as a name under its group — honest about the date and
 * silent about the query: a reader scanning the calendar for what is with an agent found an empty
 * row, and the name said only that something was missing.
 *
 * ⚠️ IT ALWAYS BEGINS TEN DAYS BACK, AND THE BRIEF'S OTHER CASE CANNOT HAPPEN. §8 asked for a bar
 * "from the end of the previous stage", falling back to ten days where there is none — but
 * `stageHistory` returns NO SPANS AT ALL when the current stage is undated (`qcStages.ts:103`; its
 * type says so at `:48`, and `qcStages.test.ts` locks it). There is never a previous stage to
 * start from here, so that branch would be code nobody can reach. One shape, stated once.
 *
 * ⚠️ AND THE INVENTED START IS ADMITTED RATHER THAN HIDDEN. Ten days is a DRAWING LENGTH, not a
 * claim: the left edge is dashed and the words still read "stage not dated". The tempting
 * alternative — starting at `sentMs`, a date the document really holds — would draw a bar saying
 * the query has stood at this stage since the day it was sent, which is precisely the date nobody
 * has. A plausible wrong date is worse than an obviously drawn one.
 */
const UNDATED_LEAD_DAYS = 10;
export function laneBars(row: QcRow, track: CalTrack, nowMs: number): CalBar[] {
  const bars: CalBar[] = row.history.spans.map((s, i) => {
    const left = xOf(track, s.startMs);
    const court = COURT_LABEL[courtOf(s.status)];
    if (!s.current) {
      const end = s.endMs ?? s.startMs;
      const dates = `${shortDay(s.startMs)} to ${shortDay(end)}`;
      const lasted = spanWords(Math.max(1, Math.round((end - s.startMs) / DAY)));
      /* 4px of daylight wherever the status changes — taken off the END of the earlier bar */
      return { key: `${row.id}:${i}`, status: s.status, current: false, left, width: Math.max(xOf(track, end) - left - DAYLIGHT_PX, PAST_MIN_PX), you: isWithYou(s.status), openRight: false, openLeft: false, over: null, end: null, court,
        line: dates, note: lasted, tail: dates, title: `${STAGE_NAME[s.status]}, ${dates}` };
    }
    const closed = isClosedStatus(s.status);
    const openRight = !closed && row.expectedMs == null;
    /**
     * ⚠️ A LIVE BAR ALWAYS REACHES TODAY (v21 §8). It used to stop at the expected date, so an
     * overdue query left a gap across today — the one column a reader scans for — and the longer
     * a query was overdue the further its bar sat from the line that says "now". `max` is the
     * whole change: ahead of the date the bar still ends there and today's line crosses it;
     * past it, the bar carries on and the overrun becomes an overlay inside it.
     */
    const endMs = closed ? s.startMs + CLOSED_DAYS * DAY : Math.max(row.expectedMs ?? nowMs, nowMs);
    const w = currentWords(row, nowMs);
    const width = Math.max(xOf(track, endMs) - left, CURRENT_MIN_PX);
    /* the overrun: from the expected date to today, in the bar's own coordinates */
    const past = !closed && row.expectedMs != null && row.expectedMs < nowMs;
    const overLeft = past ? Math.max(0, Math.min(xOf(track, row.expectedMs as number) - left, width)) : 0;
    return { key: `${row.id}:${i}`, status: s.status, current: true, left, width, you: isWithYou(s.status), openRight, openLeft: false,
      over: past && width - overLeft > 0.5 ? { left: overLeft, width: width - overLeft } : null,
      end: closed || openRight ? null : row.withYou ? "you" : "agent", court, ...w, title: `${STAGE_NAME[s.status]}, ${w.line}${w.note ? `, ${w.note}` : ""}` };
  });
  if (!row.history.dated) {
    const left = xOf(track, nowMs - UNDATED_LEAD_DAYS * DAY);
    bars.push({
      key: `${row.id}:undated`, status: row.status, current: true, left,
      width: Math.max(xOf(track, nowMs) - left, CURRENT_MIN_PX),
      you: isWithYou(row.status), openRight: false, openLeft: true, over: null, end: null,
      court: COURT_LABEL[courtOf(row.status)],
      line: "Stage not dated", note: "", tail: "stage not dated",
      title: `${STAGE_NAME[row.status]}, stage not dated`,
    });
  }
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
      /* ⚠️ EVERY ROW GETS A LANE NOW (§8). An undated stage used to be excluded here and listed as a
         name under the group; it draws a bar that says "stage not dated" instead, so the separate
         list — and `CalGroup.undated`, which nothing else read — went with it rather than staying
         as a second place the same fact is stated. */
      lanes: mine.map((r) => ({ id: r.id, row: r, bars: laneBars(r, track, nowMs) })),
    };
  }).filter((g) => g.count > 0);
}
