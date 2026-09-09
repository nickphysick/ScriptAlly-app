/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline board's DATA CONTRACT — what a host page hands the board, and nothing about where
 * the host got it.
 *
 * ⚠️ THIS IS THE EXTRACTION BOUNDARY, STATED AS A TYPE. To-do builds these rows from tasks and
 * relationships; Query Centre will build them from `recomputeQuery` output. Neither shape reaches
 * the board — a board that knows what a `Query` is cannot be mounted on a page that has none, and
 * that is the whole reason this file exists rather than a prop called `queries`.
 *
 * ⚠️ IT IS NOT CALLED `TimelineRow`, AND THAT IS DELIBERATE. `src/lib/todoTimeline.ts` already
 * exports a type of that name — To-do's own row, with its facets, subjects and tab membership. Two
 * types with one name in one import graph is a rename waiting to happen in the wrong file, so the
 * shared one is `BoardRow` and To-do's keeps the name it has. Renaming To-do's instead would be a
 * behavioural-risk edit to a file this extraction is meant to leave alone.
 */
import type { QueryStatus } from "../../../types";

/**
 * The `--state-*` family the app already paints with — the same tokens the Query Centre card band
 * reads.
 *
 * ⚠️ A TOKEN NAME, NEVER A COLOUR. A board that took hexes would let two pages drift apart by one
 * retune, which is the fault the app-wide token sheet exists to prevent.
 */
export type StateToken =
  | "queried" | "you" | "agent" | "offer" | "closed" | "accent";

/**
 * Where a bar's END DATE came from.
 *
 * ⚠️ THREE SOURCES, NOT TWO, AND THE WIDENING IS DELIBERATE. The brief asked for
 * `'stated' | 'estimate'`; the board draws three — `journeyBars.NamedEndSource` — and collapsing
 * them would erase a distinction that is already on screen. `window` is the agency's own stated
 * reply window, `sendBy` a date the writer owes something by, `reminder` a nudge the writer set.
 * A reminder standing ahead of the window takes the bar's END while the window is still the thing
 * that decides whether a reply time was ever given, which is why `statedWindow` below is a
 * SEPARATE field rather than a fourth member of this union.
 */
export type BarEndSource = "window" | "sendBy" | "reminder";

/** What a mark on the bar is. `status` draws the locked `StatusDot`; the rest are the board's
    four circled faces. */
export type MarkKind = "status" | "in" | "out" | "bang" | "clock";

export interface BoardBar {
  /** stable within the row */
  key: string;
  /** which line of a multi-line row this sits on — DATA; where that line is, is the sheet's */
  lane: number;
  from: Date;
  to: Date;
  tone: StateToken;
  /**
   * ⚠️ `null` MEANS NOBODY NAMED AN END, AND IT IS NOT THE SAME AS A ZERO-LENGTH ONE. The board
   * renders NO fill element at all for a null — a fill of zero claims no time has passed, absence
   * claims no date was ever set, and only the second is true.
   */
  endSource: BarEndSource | null;
  /** the date the AGENCY stated, whether or not it won the end — see `BarEndSource` */
  statedWindow: Date | null;
  /** began before the window: dotted left edge, squared off */
  openLeft: boolean;
  /** runs past the window: chevron right edge */
  openRight: boolean;
  label?: string;
}

export interface BoardMark {
  key: string;
  lane: number;
  at: Date;
  kind: MarkKind;
  /** present iff `kind` is `"status"` — it IS the marker's input */
  status?: QueryStatus;
  title: string;
  /** the date as the board writes it, so the board never formats a date it was not given */
  date: string;
}

export interface BoardRow {
  id: string;
  /** the chip and the two lines in the card's own identity block */
  lead: { initials: string; title: string; subtitle?: string };
  /** the status band: its word, its token, and the card's short fact */
  status: { label: string; tone: StateToken; detail?: string };
  bars: BoardBar[];
  marks: BoardMark[];
  /** how many lanes this row occupies — data; `--row-h × --lanes` is the sheet's */
  lanes: number;
  closed: boolean;
  /** where a click on the row goes; absent rows are inert */
  href?: string;
}

/** The window: a fixed span with today inside it.
 *
 * ⚠️ ONE WINDOW, NINETY DAYS, PAGED BY THE WEEK — there is no 2/4/6-month zoom and there has not
 * been since v58 (`timelineRanges.ts`: the table has ONE entry, and the harness's own `setRangeTo`
 * throws saying the range control is gone). A host that renders a range picker would be inventing
 * a control the board does not have.
 */
export interface BoardWindow {
  /** the window's first day */
  from: Date;
  /** how many days it spans — published to the sheet as `--tl-days` and read by every position */
  days: number;
  today: Date;
}
