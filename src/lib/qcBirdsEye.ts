/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Birds-eye view's arithmetic (v65 §1.9, §6.2, §6.3) — the attention groups, the day count and
 * the bar geometry, as pure functions so they can be checked without a browser.
 *
 * ⚠️ THE WORD "OVERDUE" LIVES HERE AND NOWHERE ELSE IN THE APP (§1.9, Nick's explicit choice of
 * 23 Sep). Everywhere else a date that has gone by is "past the expected date" — a fact rather than
 * a verdict — and that rule is unchanged. The Birds-eye view is the one surface that groups by
 * urgency, so it is the one surface where the word earns its keep; anything that carries these
 * labels out of this view is carrying the exception with them.
 */
import { QueryStatus } from "../types";
import { STAGE_NAME, shortDay, tileCourt, type QcRow } from "./qcSummary";

const DAY = 86_400_000;

/* ── §1.9 · the three attention groups ── */

export type Attention = "overdue" | "upcoming" | "watch";
export const ATTENTION_ORDER: readonly Attention[] = ["overdue", "upcoming", "watch"];
export const ATTENTION_LABEL: Record<Attention, string> = {
  overdue: "Overdue", upcoming: "Upcoming", watch: "Watch and wait",
};
/** The mono hint under each group's count in the expanded header (§8.2). */
export const ATTENTION_HINT: Record<Attention, string> = {
  overdue: "to nudge", upcoming: "next two weeks", watch: "nothing needed",
};
/** Upcoming reaches this far forward. */
export const UPCOMING_DAYS = 14;

/**
 * ⚠️ "ANYTHING THAT IS WITH YOU" IS UPCOMING WHATEVER ITS DATE SAYS, and that is the rule's whole
 * point: a partial you owe is not something to watch and wait for, whether or not a date has been
 * put on it. The court is the PAGE's three-way one (`tileCourt`), so an offer counts as yours here
 * exactly as it does on the tiles — one answer to "whose move", asked in two places.
 *
 * ⚠️ AND OVERDUE IS CHECKED FIRST, so a with-you query whose date has gone is overdue rather than
 * upcoming. Ordering the tests the other way would make the group that most needs a reader's eye
 * the one thing that could never land in it.
 */
export function attentionGroup(row: QcRow, nowMs: number): Attention {
  if (row.expectedMs != null && row.expectedMs < nowMs) return "overdue";
  if (tileCourt(row.status) === "you") return "upcoming";
  if (row.expectedMs != null && row.expectedMs - nowMs <= UPCOMING_DAYS * DAY) return "upcoming";
  return "watch";
}

/* ── §6.2 · the day count at the row's right ── */

export interface DayCount { text: string; urgent: boolean }
/**
 * ⚠️ "—" IS A DATE NOBODY HAS PROMISED, NOT A ZERO. A query with no expected date has no countdown
 * to state, and "0d" would be a number where there is no fact — the same rule that stops the court
 * tiles printing "0 passed · 0 no reply" over an empty set.
 */
export function dayCount(row: QcRow, nowMs: number): DayCount {
  if (row.expectedMs == null) return { text: "—", urgent: false };
  const days = Math.round((row.expectedMs - nowMs) / DAY);
  if (days === 0) return { text: "today", urgent: false };
  return days > 0 ? { text: `${days}d`, urgent: false } : { text: `${-days}d ago`, urgent: true };
}

/* ── v65.2 §5 · the row's right column: the due date, and how far away it is ── */

/**
 * ⚠️ THE DATE AND THE DISTANCE ARE TWO FACTS AND THE COLUMN STATES BOTH (§1.8). "10d over" alone
 * makes a reader work out which day that was; "9 Sep" alone makes them work out whether it has
 * gone. The pair is the whole point of the column, and it is why `dayCount`'s single string could
 * not simply be restyled into it.
 *
 * ⚠️ THE STRINGS ARE SENTENCE CASE AND THE SHEET UPPERCASES THEM. A screen reader should not be
 * shouted at because a design wanted small capitals, and `text-transform` is the one way to have
 * the look without the string.
 *
 * ⚠️ AND `kind` IS WHAT ANYTHING ELSE CLASSIFIES ON, never the wording. A measurement that sorted
 * rows with `/^\d+d$/` and `/ago$/` was reading the DISPLAY TEXT, so the first re-wording broke it
 * — and it would have broken silently in the direction that matters, by matching nothing and
 * reporting an empty population as a clean sweep.
 */
export type DueKind = "past" | "today" | "future" | "none";
export interface DueCell { date: string; distance: string; kind: DueKind; urgent: boolean }
export function dueCell(row: QcRow, nowMs: number): DueCell {
  /* ⚠️ "—" IS A DATE NOBODY HAS PROMISED, the same rule `dayCount` states above: an em dash says
     there is no fact here, where a formatted "1 Jan 1970" would state one that is not true. */
  if (row.expectedMs == null) return { date: "—", distance: "No date", kind: "none", urgent: false };
  const date = shortDay(row.expectedMs);
  const days = Math.round((row.expectedMs - nowMs) / DAY);
  if (days === 0) return { date, distance: "Today", kind: "today", urgent: false };
  if (days > 0) return { date, distance: `In ${days}d`, kind: "future", urgent: false };
  return { date, distance: `${-days}d over`, kind: "past", urgent: true };
}

/* ── §6.3 · the track: seventy days, with the expected date on the line ── */

/** The track holds this many days, half either side of the line. */
export const TRACK_DAYS = 70;
/** A bar with no beginning is drawn this far back, dashed — the v21 calendar's own answer (§8). */
export const UNDATED_LEAD_DAYS = 10;

export interface EyeBar {
  /** Percentages of the track's width. */
  left: number;
  width: number;
  /** The stretch past the line, in the same units — `null` when the date has not gone by. */
  over: { left: number; width: number } | null;
  /** The bar began before the track did, so its left end is cut flat rather than rounded. */
  cut: boolean;
  /** Nothing dates this row's expected date: it is anchored on today and drawn dashed. */
  dashed: boolean;
}

/**
 * ⚠️ EVERY ROW IS SHIFTED SO ITS OWN EXPECTED DATE SITS ON THE LINE (§6.3), which is what makes one
 * vertical line readable across rows whose dates are months apart: the gap between a bar's end and
 * the line IS the time left, in the same pixels, on every row. A shared calendar axis would put
 * each bar somewhere different and the line would mean nothing.
 *
 * ⚠️ AND A ROW WITH NO EXPECTED DATE IS ANCHORED ON TODAY INSTEAD, so its bar ends at the line and
 * is drawn dashed. That is honest — the line means "the date" and this row has none — where
 * placing it against some default would state a date nobody promised.
 */
export function eyeBar(row: QcRow, nowMs: number): EyeBar {
  const anchor = row.expectedMs ?? nowMs;
  const pc = (ms: number) => 50 + ((ms - anchor) / DAY) * (100 / TRACK_DAYS);
  const startMs = row.stageStartMs ?? nowMs - UNDATED_LEAD_DAYS * DAY;
  const rawLeft = pc(startMs);
  const right = Math.max(0, Math.min(100, pc(nowMs)));
  /**
   * ⚠️ A BAR IS AT LEAST ONE DAY WIDE, AND THE FLOOR IS ONE DAY RATHER THAN A PIXEL COUNT. A query
   * that entered its current stage TODAY spans no time at all, so the honest width is zero — and a
   * zero-width bar is an empty row beside a day count that says something, which reads as a fault
   * rather than as a fact. One day is the smallest thing this track can say, and it is true: the
   * bar covers today. Measured on the page before this existed: twenty-five rows past their date,
   * several of them with nothing drawn.
   */
  const floor = 100 / TRACK_DAYS;
  const left = Math.max(0, Math.min(100 - floor, Math.min(rawLeft, right - floor)));
  const width = Math.max(floor, right - left);
  /**
   * ⚠️ THE INK STRETCH RUNS FROM THE LINE TO TODAY, AND IS `null` WHEN THERE IS NO DATE TO BE PAST.
   * That one test is the whole of it: once a date has gone by, `right` is past 50 by construction
   * and the FLOOR above guarantees a drawable width, so a width test here would be a branch nothing
   * can enter — and an unreachable guard is a claim nobody can check. Proved by mutation: loosening
   * it reddened nothing.
   *
   * ⚠️ AND WHERE THE BAR BEGINS PAST THE LINE, THE WHOLE BAR IS INK. A query that entered its
   * current stage after its date had gone has no stretch running from the line, because the line is
   * behind it. `Math.max` is what says so, and it is why an assertion that the ink always starts at
   * 50 reported 37px of disagreement about a correct bar.
   */
  const overLeft = Math.max(left, 50);
  const over = row.expectedMs != null && nowMs > row.expectedMs ? { left: overLeft, width: right - overLeft } : null;
  return { left, width, over, cut: rawLeft < 0, dashed: row.expectedMs == null || row.stageStartMs == null };
}

/* ── the view's rows ── */

export interface EyeRow {
  id: string;
  row: QcRow;
  group: Attention;
  bar: EyeBar;
  day: DayCount;
  /** §5 — the right column: the due date over how far away it is. */
  due: DueCell;
  /** The status as this view names it, and the dot it draws. */
  stage: string;
  /** Which court, for the focus toggle's fade — never a filter. */
  court: "you" | "agent";
  title: string;
}
export interface EyeGroup { key: Attention; label: string; count: number; rows: EyeRow[] }

/**
 * ⚠️ THE BIRDS-EYE VIEW IS LIVE QUERIES ONLY. A closed query has no date to wait for and no move
 * left in it; drawing it here would put a bar with no meaning on a track whose whole subject is
 * time left. The closed ones are the Closed tile's, and the page states them there.
 *
 * ⚠️ WITHIN A GROUP, SOONEST FIRST — and an undated row LAST rather than first. Sorting by a null
 * date is where "no date" quietly becomes "the year 1970": the rows with nothing promised belong at
 * the end of the group they are in, not at the head of it.
 */
export function eyeRows(rows: readonly QcRow[], nowMs: number): EyeRow[] {
  return rows
    .filter((r) => tileCourt(r.status) !== "closed" && tileCourt(r.status) !== null)
    .map((r): EyeRow => {
      const day = dayCount(r, nowMs);
      const stage = STAGE_NAME[r.status];
      return {
        id: r.id, row: r, group: attentionGroup(r, nowMs), bar: eyeBar(r, nowMs), day, due: dueCell(r, nowMs), stage,
        court: tileCourt(r.status) === "you" ? "you" : "agent",
        title: `${r.agentName} — ${stage}, ${r.expectedMs == null ? "no date promised" : day.urgent ? `${day.text.replace(" ago", "")} past the expected date` : `${day.text} to go`}`,
      };
    })
    .sort((a, b) => {
      if (a.row.expectedMs == null && b.row.expectedMs == null) return a.row.agentName.localeCompare(b.row.agentName);
      if (a.row.expectedMs == null) return 1;
      if (b.row.expectedMs == null) return -1;
      return a.row.expectedMs - b.row.expectedMs;
    });
}

export function eyeGroups(rows: readonly QcRow[], nowMs: number): EyeGroup[] {
  const all = eyeRows(rows, nowMs);
  return ATTENTION_ORDER.map((key) => {
    const mine = all.filter((r) => r.group === key);
    return { key, label: ATTENTION_LABEL[key], count: mine.length, rows: mine };
  }).filter((g) => g.count > 0);
}

/** The focus toggle's three states (§6.1). It FADES the other court, never hides it. */
export type EyeFocus = "all" | "you" | "agent";
export const EYE_FOCUS: readonly { key: EyeFocus; label: string }[] = [
  { key: "all", label: "Everything" }, { key: "you", label: "With you" }, { key: "agent", label: "With the agent" },
];
/** True when the row should be drawn faded — the focus is a court and this row is the other one. */
export const eyeFaded = (row: EyeRow, focus: EyeFocus): boolean => focus !== "all" && row.court !== focus;

/** A live status is one the Birds-eye view can draw. Exported so a lock can name the set. */
export const EYE_STATUSES: readonly QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
];
