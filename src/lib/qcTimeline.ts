/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The expanded Birds-eye view's time model (v65 §8.4–§8.8) — the extent, the scale, the ticks, the
 * every bar, as pure functions.
 *
 * ⚠️ ONE SCALE, `pxd`, AND EVERY POSITION IS DERIVED FROM IT. The view zooms and pans, so nothing
 * here may hold a pixel: a tick, a bar, the today line and the TODAY pill are all `(ms − from) ×
 * pxd / DAY`, computed by the same function. The §8.4 requirement that the today line, the pill's
 * centre and an overdue bar's end meet on the same pixel at every zoom is not a thing to check
 * afterwards — it is what one derivation makes true.
 */
import { QueryStatus } from "../types";
/* §C3 — the chip's second wording switches at the Next-action grouping's own closing threshold.
   `qcCalView` does not import this module, so there is no cycle; one constant, two surfaces. */
import { CLOSE_OVER_DAYS } from "./qcCalView";
import { STAGE_NAME, isWithYou, tileCourt, type QcRow } from "./qcSummary";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/* ── §8.4 · the scale ── */

export const PXD_MIN = 3;
export const PXD_MAX = 30;
/** About three months across a 1280 window. */
export const PXD_DEFAULT = 10.5;
/** On open, today sits this far into the visible track. */
export const TODAY_AT = 0.58;
/** ‹ › move this far. */
export const NUDGE_WEEKS = 4;

export const clampPxd = (pxd: number): number => Math.min(PXD_MAX, Math.max(PXD_MIN, pxd));

export interface ZoomPreset { key: string; label: string; pxd: number }
/**
 * ⚠️ A PRESET IS A SCALE, NOT A SPAN (v65.2 §8, Nick's ruling of 24 Sep). They were `days` and the
 * scale was `trackW / days`, so "3m" meant a different px/day on every window — and `PXD_DEFAULT`,
 * which is a scale, could only light a preset by coincidence of width. The mock states them as
 * scales: 6w = 21, 3m = 10.5, 6m = 5, and 10.5 is the default, so the view opens on 3m lit.
 */
export const ZOOM_PRESETS: readonly ZoomPreset[] = [
  { key: "6w", label: "6w", pxd: 21 },
  { key: "3m", label: "3m", pxd: 10.5 },
  { key: "6m", label: "6m", pxd: 5 },
];
/** The scale a preset means — its own, clamped to what the view allows. */
export const pxdForPreset = (p: ZoomPreset): number => clampPxd(p.pxd);
/**
 * ⚠️ THE SWITCH LIGHTS WHICHEVER PRESET IS WITHIN 0.6 OF THE CURRENT SCALE, and none of them
 * otherwise. A switch that always showed one lit would claim the view is at a preset when a pinch
 * has taken it somewhere between two.
 */
export const activePreset = (pxd: number): string | null =>
  ZOOM_PRESETS.find((p) => Math.abs(pxdForPreset(p) - pxd) <= 0.6)?.key ?? null;

/* ── §8.4 · the extent ── */

const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const firstOfMonth = (ms: number): number => { const d = new Date(ms); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface Extent { fromMs: number; toMs: number; days: number }
/**
 * ⚠️ THE EXTENT STARTS AT THE ACCOUNT'S OWN FIRST QUERY, not at a fixed window. A calendar that
 * began a fixed number of weeks back would cut the earliest journeys off at the left edge on an
 * account with any history, and the bands would begin in the middle of the first query's life.
 */
export function extentOf(rows: readonly QcRow[], nowMs: number): Extent {
  const starts = rows.map((r) => r.sentMs).filter((m): m is number => m != null);
  const earliest = starts.length ? Math.min(...starts) : nowMs;
  const fromMs = firstOfMonth(earliest - 3 * WEEK);
  const toMs = startOfDay(nowMs) + 26 * WEEK;
  return { fromMs, toMs, days: Math.max(1, Math.round((toMs - fromMs) / DAY)) };
}

/** THE one place a date becomes an x. Everything visible goes through it. */
export const xAt = (ext: Extent, pxd: number, ms: number): number => ((ms - ext.fromMs) / DAY) * pxd;
/** …and back, for the pan and the crosshair. */
export const msAt = (ext: Extent, pxd: number, x: number): number => ext.fromMs + (x / pxd) * DAY;
export const trackWidth = (ext: Extent, pxd: number): number => ext.days * pxd;

/** The scroll offset that puts today at 58% of a track this wide. */
export const scrollForToday = (ext: Extent, pxd: number, boxW: number, nowMs: number): number =>
  Math.max(0, xAt(ext, pxd, startOfDay(nowMs)) - boxW * TODAY_AT);

/**
 * ⚠️ A ZOOM KEEPS THE DATE UNDER THE POINTER STILL (§8.4). Without this the view slides sideways as
 * it scales and a reader loses the week they were looking at — which is the whole reason to pinch
 * at a place rather than at a slider.
 */
export function zoomAbout(ext: Extent, pxd: number, nextPxd: number, scrollLeft: number, pointerX: number): { pxd: number; scrollLeft: number } {
  const p = clampPxd(nextPxd);
  const at = msAt(ext, pxd, scrollLeft + pointerX);
  return { pxd: p, scrollLeft: Math.max(0, xAt(ext, p, at) - pointerX) };
}

/* ── §8.4 · the date tier's labels ── */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export interface Tick { ms: number; x: number; label: string }
/**
 * ⚠️ NO MONTH LABEL WITHIN 3.2% OF TODAY (§8.4). The TODAY pill sits at today's x and a month name
 * under it is two labels in one place — the one spot on this axis where a reader is certain to be
 * looking. The year rides the January label rather than taking a row of its own.
 */
/**
 * §8.4 — how close a month label may come to the TODAY pill, IN PIXELS.
 *
 * ⚠️ IT WAS 3.2% OF THE WHOLE TRACK, AND THAT IS A DIFFERENT DISTANCE ON EVERY ACCOUNT. The track
 * is the extent times the zoom, so on a three-year pipeline at the default density it is ~11,750px
 * — and 3.2% of that is 376px either side of today, a 752px hole in a 1,128px viewport. Measured on
 * the page: **35 month labels rendered and NOT ONE of them visible**, which reads as a date tier
 * that failed to draw. The thing being avoided is a pill about 47px wide, so the clearance is a
 * fact about the pill and never about the length of the reader's querying history.
 */
/** §5 — the band labels are full month names; `MON` stays for anything that needs the short form. */
export const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/**
 * §5 — ONE BAND PER MONTH, across the row's full height, alternating and named.
 *
 * ⚠️ A BAND IS A SPAN, NOT A TICK, AND THAT IS WHY THE CLEARANCE WENT. The old month LABEL had to
 * dodge the TODAY pill, so it carried a clearance — and a clearance expressed as a share of the
 * track put 376px of hole either side of today on a three-year pipeline, with thirty-five labels
 * rendered and none of them visible. A band has somewhere else to put its label: the band's own
 * left edge, stuck to the names column, so the current month is named wherever the reader has
 * dragged to and nothing has to dodge anything.
 */
export interface MonthBand { ms: number; x: number; width: number; month: string; year: string; alt: boolean }
export function monthBands(ext: Extent, pxd: number): MonthBand[] {
  const out: MonthBand[] = [];
  const d = new Date(ext.fromMs);
  d.setDate(1); d.setHours(0, 0, 0, 0);
  let alt = false;
  while (d.getTime() <= ext.toMs) {
    const ms = d.getTime();
    const x = xAt(ext, pxd, ms);
    const next = new Date(d); next.setMonth(next.getMonth() + 1);
    out.push({ ms, x, width: xAt(ext, pxd, next.getTime()) - x, month: MONTH_FULL[d.getMonth()], year: String(d.getFullYear()), alt });
    alt = !alt;
    d.setTime(next.getTime());
  }
  return out;
}

/**
 * §5 — EVERY MONDAY, WITH ITS DATE. The old ticks were unlabelled marks at the tier's foot; §5 asks
 * for the date of each Monday, centred on its own x with a tick above it.
 */
export function weekTicks(ext: Extent, pxd: number): Tick[] {
  const out: Tick[] = [];
  const d = new Date(ext.fromMs);
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  for (let ms = d.getTime(); ms <= ext.toMs; ms += WEEK) {
    out.push({ ms, x: xAt(ext, pxd, ms), label: String(new Date(ms).getDate()) });
  }
  return out;
}

/**
 * ⚠️ §B1 — THE HEAT IS GONE, AND ITS DERIVATION WENT WITH IT. `HEAT_CURRENT`, `HEAT_EXPECTED`,
 * `HeatWeek` and `heatWeeks` are deleted rather than left unmounted: a pure function nothing calls
 * is a thing the next reader has to trace to a rendered root before they can touch the row it used
 * to draw in, which this repo has now paid for twice. Recover from `9fb20151` if the strip returns.
 *
 * Nothing under the dates: the row is month bands, Monday dates and TODAY.
 */


/* ── §8.7 · the bars ── */

export interface TlBar {
  key: string;
  status: QueryStatus;
  current: boolean;
  /** Days, not pixels — the view multiplies by the scale it happens to be at. */
  fromMs: number;
  toMs: number;
  /** The stretch past the expected date, on a bar that has run beyond it. */
  overFromMs: number | null;
  /** The stretch beyond TODAY — drawn hollow, because it has not happened yet. */
  aheadFromMs: number | null;
  you: boolean;
  /**
   * §B3 — WHICH END OF THIS BAR IS UNKNOWN, and a bar has at most one.
   *
   * `"start"` — the stage's start date was never recorded, so the bar runs from the last thing
   * anything DID date and its LEFT end is torn. `"end"` — no expected or send-by date is set, so
   * the bar runs to today and its RIGHT end is torn. `null` — both ends are facts.
   *
   * ⚠️ A TORN EDGE, NEVER A STRIPE OR A DASH. A pattern says "this bar is a different kind of
   * thing"; a torn edge says "this bar stops here because nobody knows where it stops", which is
   * the actual fact, and it leaves the stage's own colour saying what stage it is.
   */
  torn: "start" | "end" | null;
  /** The sentence at the bar's end; past bars carry only their stage's name. */
  words: string;
  label: string;
  title: string;
}
export interface TlNudge { days: number; text: string; yourMove: boolean }
export interface TlGhost { status: QueryStatus; label: string }
export interface TlRow {
  id: string;
  row: QcRow;
  bars: TlBar[];
  /** §8.7 — the dotted chip after an overdue AGENT-side bar, and nothing else. */
  nudge: TlNudge | null;
  /**
   * §C3 — WHETHER THIS ROW IS YOUR MOVE, which is NOT the same question as whose court it is in.
   * A with-you stage is your move because the agent has asked for something; an AGENT-side stage
   * past its expected date is your move because nobody will do anything until you nudge or close.
   * The court is unchanged either way — an overdue Queried still counts as With the agent, because
   * that is where the query IS.
   */
  yourMove: boolean;
  /** §8.7 — the dotted ring after a with-you bar, holding what comes next. */
  ghost: TlGhost | null;
}

const shortDate = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]}`; };

/**
 * ⚠️ THE SENTENCE'S TENSE FOLLOWS THE DATE, not the status (§8.7). "expected by" becomes "was
 * expected by" the day it passes — a sentence in the present tense about a date that has gone is
 * the app telling a writer something it can see is untrue.
 *
 * ⚠️ AND A DATE NOBODY PROMISED SAYS SO. "no date promised" for an agent's reply and "no send-by
 * date" for the writer's own move are different absences and read differently; neither is a zero.
 */
export function currentWords(row: QcRow, nowMs: number): string {
  const name = STAGE_NAME[row.status];
  const court = tileCourt(row.status);
  if (row.expectedMs == null) return `${name} · ${court === "you" ? "no send-by date" : "no date promised"}`;
  const past = row.expectedMs < nowMs;
  const when = shortDate(row.expectedMs);
  if (row.status === QueryStatus.OFFER) return `${name} · ${past ? "your decision was due" : "your decision by"} ${when}`;
  if (court === "you") return `${name} · ${past ? "was to be sent by" : "send by"} ${when}`;
  return `${name} · ${past ? "agent response was expected by" : "agent response expected by"} ${when}`;
}

/** What a with-you stage owes next (§8.7's action ghosts). Nothing follows an agent-side bar. */
export function ghostFor(status: QueryStatus): TlGhost | null {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED: return { status: QueryStatus.PARTIAL_SENT, label: "Send the partial" };
    case QueryStatus.FULL_REQUESTED: return { status: QueryStatus.FULL_SENT, label: "Send the full" };
    case QueryStatus.OFFER: return { status: QueryStatus.OFFER, label: "Your decision" };
    default: return null;
  }
}

/**
 * ⚠️ A ROW'S BARS ARE ITS OWN HISTORY, and the current one runs to `max(expected, today)` so the
 * time still to come is drawn rather than implied. The part beyond TODAY is hollow — it has not
 * happened — and the part beyond the EXPECTED DATE is ink. A bar can have both.
 */
/**
 * ⚠️ EVERY BAR IS AT LEAST ONE DAY WIDE, AND THE FLOOR IS ONE DAY RATHER THAN A PIXEL COUNT — the
 * rail's rule, brought here (v65.1). A stage entered TODAY spans no time at all, so the honest
 * width is zero, and a zero-width bar is an empty row beside a day count that says something: it
 * reads as a fault rather than as a fact. One day is the smallest thing this track can say, and it
 * is true — the bar covers today.
 */
const atLeastADay = (fromMs: number, toMs: number): number => Math.max(toMs, fromMs + DAY);

export function tlRow(row: QcRow, nowMs: number): TlRow {
  const bars: TlBar[] = [];
  const today = startOfDay(nowMs);
  for (const s of row.history.spans) {
    if (s.current) continue;
    const to = atLeastADay(s.startMs, s.endMs ?? today);
    bars.push({
      key: `${row.id}:${s.status}`, status: s.status, current: false,
      fromMs: s.startMs, toMs: to, overFromMs: null, aheadFromMs: null,
      you: isWithYou(s.status), torn: null, words: "", label: STAGE_NAME[s.status],
      title: `${STAGE_NAME[s.status]} · ${shortDate(s.startMs)} → ${shortDate(s.endMs ?? today)}`,
    });
  }
  /**
   * ⚠️ AN UNDATED STAGE STILL DRAWS A BAR (v65.1, Nick's ruling). It used to draw nothing, because
   * `stageStartMs` is null when nothing dates the stage — so a row lost its current bar, and with
   * the history erased upstream it lost every bar. The ghost then fell back to `nowMs` and sat
   * exactly on the today line, which is what gave it away on the page.
   *
   * ⚠️ AND THE GUESS IS ADMITTED RATHER THAN HIDDEN: it runs from the last thing anything DID date
   * — the previous stage's end, which `stageHistory` now supplies as the current span — to today,
   * DASHED, and it says "stage not dated". Starting it at the send instead would draw a bar
   * claiming the query has stood here since it went out, which is precisely the date nobody has.
   */
  const undatedSpan = row.stageStartMs == null ? row.history.spans.find((s) => s.current) : null;
  const startMs = row.stageStartMs ?? undatedSpan?.startMs ?? null;
  if (startMs != null) {
    const noStart = row.stageStartMs == null;
    const noEnd = row.expectedMs == null;
    /**
     * §B3 — A BAR HAS AT MOST ONE TORN END, and the start wins when both are missing. A bar torn at
     * both ends states nothing at all about where it sits, and the start is the more consequential
     * absence: without it the bar's LENGTH is a guess, where without an end only its future is.
     *
     * ⚠️ THE PRECEDENCE IS STATED HERE AND NOWHERE ELSE. `noEnd` used to carry `!noStart` as well,
     * so the rule was expressed twice — and a mutation that reversed this ternary changed nothing,
     * because the other copy still decided it. A lock over a rule written twice cannot fail.
     */
    const torn: "start" | "end" | null = noStart ? "start" : noEnd ? "end" : null;
    const end = atLeastADay(startMs, Math.max(row.expectedMs ?? today, today));
    bars.push({
      key: `${row.id}:current`, status: row.status, current: true,
      fromMs: startMs, toMs: end,
      overFromMs: !noStart && row.expectedMs != null && row.expectedMs < today ? row.expectedMs : null,
      aheadFromMs: end > today ? today : null,
      you: isWithYou(row.status), torn,
      /* §B3 — the start's own wording; the end keeps `currentWords`' "no send-by date" / "no date
         promised", which already names which date is missing and whose it is. */
      words: noStart ? `${STAGE_NAME[row.status]} · date not recorded` : currentWords(row, nowMs),
      label: STAGE_NAME[row.status],
      title: noStart ? `${STAGE_NAME[row.status]} · date not recorded` : currentWords(row, nowMs),
    });
  }
  /* §8.7 — the chip is AGENT-SIDE ONLY: a nudge is a thing you send someone who owes you a reply */
  const overdueDays = row.expectedMs != null && row.expectedMs < today ? Math.round((today - row.expectedMs) / DAY) : 0;
  /**
   * §C3 — AND PAST THE CLOSING THRESHOLD IT OFFERS THE OTHER ANSWER TOO. `CLOSE_OVER_DAYS` is the
   * grouping's own figure for "this has gone quiet", so the chip switches at exactly the day the
   * Next-action grouping moves the row into *Consider closing* — one threshold, two surfaces, read
   * from the one constant rather than restated here.
   */
  const nudge = overdueDays > 0 && tileCourt(row.status) === "agent"
    ? {
      days: overdueDays,
      text: `${overdueDays} ${overdueDays === 1 ? "day" : "days"} overdue · ${overdueDays > CLOSE_OVER_DAYS ? "nudge or close" : "nudge"}`,
      yourMove: true,
    }
    : null;
  return {
    id: row.id, row, bars, nudge,
    ghost: tileCourt(row.status) === "you" ? ghostFor(row.status) : null,
    /* §C3 — with-you by status, OR agent-side and past its date */
    yourMove: tileCourt(row.status) === "you" || nudge != null,
  };
}

/* ── §8.8 · the edge markers ── */

export interface EdgeCounts { earlier: number; later: number; nearestEarlier: number | null; nearestLater: number | null }
/**
 * ⚠️ IT COUNTS EXPECTED DATES, NOT ROWS. The marker's promise is "there are dates off this edge",
 * and a row with no date has none — counting it would send a reader looking for something that was
 * never there.
 */
export function edgeCounts(rows: readonly TlRow[], ext: Extent, pxd: number, scrollLeft: number, boxW: number): EdgeCounts {
  const dates = rows.map((r) => r.row.expectedMs).filter((m): m is number => m != null);
  const left = msAt(ext, pxd, scrollLeft);
  const right = msAt(ext, pxd, scrollLeft + boxW);
  const before = dates.filter((m) => m < left);
  const after = dates.filter((m) => m > right);
  return {
    earlier: before.length,
    later: after.length,
    nearestEarlier: before.length ? Math.max(...before) : null,
    nearestLater: after.length ? Math.min(...after) : null,
  };
}

/* ── §8.9 · the crosshair's tag ── */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export interface Crosshair { ms: number; x: number; label: string; today: boolean }
/** Snapped to the day, because a crosshair between two days names neither. */
export function crosshairAt(ext: Extent, pxd: number, x: number, nowMs: number): Crosshair {
  const ms = startOfDay(msAt(ext, pxd, x));
  const today = ms === startOfDay(nowMs);
  const d = new Date(ms);
  return { ms, x: xAt(ext, pxd, ms), today, label: today ? `Today · ${shortDate(ms)}` : `${shortDate(ms)} · ${DAYS[d.getDay()]}` };
}
