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

/* ── §3.2 · the progress bar ── */

/**
 * §3.2 · THE BAR IS A PROGRESS BAR — how far through the agency's own window this query is.
 *
 * **f = (today − stage entry) / (expected − stage entry).** The track is the whole window; the
 * ALLOWANCE is the white part it is allowed to take, and the FILL is how much of it has gone.
 *
 * ⚠️ PAST THE DATE THE BAR RESCALES RATHER THAN OVERFLOWING. The allowance shrinks to `1/f` of the
 * track and the rest is ink, so a query 24% over reads as an allowance that is 81% of the track
 * with ink beyond it — and the notch at the join is the due date itself. Drawing the overrun past
 * the track's end instead would make a bar that is longer the later it is, which is a shape the
 * row cannot hold and a reader cannot compare.
 *
 * ⚠️ AND IT REPLACES THE DUE LINE (Nick's decision 1, 24 Sep), with its axis and hollow segments.
 * One vertical line shared across rows meant every bar had to be SHIFTED so its own date sat on it,
 * which is a second coordinate system inside a 340px rail. A progress bar states the same fact —
 * how much of the window is gone — without asking the reader to hold two.
 */
export interface EyeProgress {
  /** Nothing dates this row's window: the track is drawn dashed and empty. */
  dated: boolean;
  /** How far through the window, 1 being the expected date. `null` when undated. */
  f: number | null;
  /** The white allowance's share of the TRACK: 1 up to the date, `1/f` past it. */
  allowance: number;
  /** The coloured fill's share of the TRACK, floored so a fresh stage still shows. */
  fill: number;
  /** The ink stretch's share of the TRACK; 0 up to the date. */
  over: number;
}
/** The fill never falls below this share of the track — a stage entered today still reads. */
export const PROGRESS_FLOOR = 0.03;
/** …and the allowance never falls below it either, or the notch has nowhere to stand. */
export const ALLOWANCE_FLOOR = 0.03;

export function eyeProgress(row: QcRow, nowMs: number): EyeProgress {
  /**
   * ⚠️ THE WINDOW'S START FALLS BACK TO THE SEND DATE, AND THAT IS NOT A GUESS. An expected date on
   * an agent's-turn query IS `last send + the agency's stated window`, so where the stage entry was
   * never recorded the send is the very date the end was computed from — the fraction is then the
   * agency's own window rather than an invention.
   *
   * ⚠️ FOUND ON THE PAGE, NOT HERE. Without it a row read "60d over" in its date column beside an
   * EMPTY dashed track, which is two statements about one query that contradict each other; the
   * unit fixture had a stage date on every row and could not see it.
   */
  const start = row.stageStartMs ?? row.sentMs;
  const exp = row.expectedMs;
  /* ⚠️ UNDATED IS EITHER END MISSING, not just the expected date. A window needs both a beginning
     and an end; with only one of them there is no fraction to state, and a bar drawn from a guessed
     start would put a number on a thing nobody recorded. */
  if (start == null || exp == null) return { dated: false, f: null, allowance: 1, fill: 0, over: 0 };
  /* ⚠️ A WINDOW OF ZERO OR LESS IS FULLY OVERRUN, NOT A DIVISION BY ZERO. An expected date at or
     before the stage entry means the window had gone before the stage began — true, and the honest
     drawing is all ink with the allowance at its floor so the notch is still there to see. */
  const span = exp - start;
  const f = span > 0 ? Math.max(0, (nowMs - start) / span) : Infinity;
  const allowance = f > 1 ? Math.max(ALLOWANCE_FLOOR, 1 / f) : 1;
  const fill = Math.max(PROGRESS_FLOOR, Math.min(f, 1) * allowance);
  return { dated: true, f, allowance, fill, over: f > 1 ? 1 - allowance : 0 };
}

/* ── the view's rows ── */

export interface EyeRow {
  id: string;
  row: QcRow;
  group: Attention;
  /** §3.2 — the progress bar, replacing v65's due-line geometry. */
  prog: EyeProgress;
  day: DayCount;
  /** §5 — the right column: the due date over how far away it is. */
  due: DueCell;
  /** The status as this view names it, and the dot it draws. */
  stage: string;
  /** Which court, for the focus toggle's fade — never a filter. */
  court: "you" | "agent";
  /**
   * §C3 — WHETHER THIS ROW IS YOUR MOVE, and it is NOT the court. A with-you stage is your move
   * because the agent has asked for something; an AGENT-side stage past its expected date is your
   * move because nothing happens until you nudge or close. The court stays "agent" for the second
   * — the focus toggle still fades it with the agent's rows, because that is where the query IS.
   */
  yourMove: boolean;
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
      const due = dueCell(r, nowMs);
      return {
        id: r.id, row: r, group: attentionGroup(r, nowMs), prog: eyeProgress(r, nowMs), day, due, stage,
        court: tileCourt(r.status) === "you" ? "you" : "agent",
        yourMove: tileCourt(r.status) === "you" || due.kind === "past",
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

/* ── §4.2 · today & next up ── */

/** The soonest live query with an expected date on or after today, as one sentence. */
export interface NextUp { date: string; sentence: string }

/**
 * §4.2 — THE SENTENCE NAMES WHAT IS DUE AND WHEN, in the reader's own words.
 *
 * ⚠️ IT READS THE SAME `expectedMs` EVERY OTHER SURFACE READS, so the rail's due column, the
 * expanded rows' due cells and this sentence cannot name different days for one query. The three
 * wordings are chosen by whose court it is — the page's own three-way `tileCourt`, so an offer is
 * the writer's decision here exactly as it is on the tiles.
 *
 * ⚠️ AND "NOTHING DUE" IS A SENTENCE, NOT AN EMPTY SLOT. A header that simply lost its second line
 * when an account had nothing coming would read as a header that failed to load.
 */
export function nextUp(rows: readonly QcRow[], nowMs: number): NextUp {
  const today = new Date(nowMs); today.setHours(0, 0, 0, 0);
  const from = today.getTime();
  const live = rows
    .filter((r) => r.expectedMs != null && r.expectedMs >= from && tileCourt(r.status) !== "closed")
    .sort((a, b) => (a.expectedMs ?? 0) - (b.expectedMs ?? 0));
  const date = new Date(nowMs).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const soonest = live[0];
  if (!soonest) return { date, sentence: "Nothing due in the weeks ahead." };
  const days = Math.round((soonest.expectedMs! - from) / DAY);
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const who = soonest.agentName;
  switch (soonest.status) {
    case QueryStatus.OFFER:
      return { date, sentence: `Your decision on ${who}'s offer is due ${when}.` };
    case QueryStatus.PARTIAL_REQUESTED:
      return { date, sentence: `Send ${who} the partial ${when}.` };
    case QueryStatus.FULL_REQUESTED:
      return { date, sentence: `Send ${who} the full ${when}.` };
    case QueryStatus.REVISE_RESUBMIT:
      return { date, sentence: `Send ${who} the revision ${when}.` };
    default:
      return { date, sentence: `${who}'s reply is due ${when}.` };
  }
}
