/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline board's DATA CONTRACT — what a host page hands the board, and nothing about where
 * the host got it.
 *
 * ⚠️ THIS IS A NARROWING OF THE HOST'S OWN ROW, NOT A NEW MODEL — AND THE FIRST DRAFT OF THIS FILE
 * GOT THAT WRONG.
 *
 * It began as an invented `BoardRow`/`BoardBar`/`BoardMark` trio, drawn from the brief. Writing the
 * mapping is what disproved it: `journeyBars.Segment` carries **43 fields** against that draft's
 * ten — `fact`, `tail`, `capLeft`/`capRight`, `capWord`/`capSource`/`capOn`/`capMine`, `hollow`,
 * `owed`, `nudgeDue`, `namedEndAt`, `trueFrom`/`trueTo`, `lateFrom`, `weight`, `historical`,
 * `live`, `tip` and the rest. A board driven by the ten-field version would have rendered a
 * different, poorer board, which is the one thing this extraction may not do.
 *
 * ⚠️ AND THE QUERY→BARS ADAPTER THE BRIEF ASKS FOR ALREADY EXISTS. `laneBars(LaneInput, BarWindow)`
 * in `lib/journeyBars.ts` takes a `Query` and an `Agent` and returns `Bars` — segments and nodes,
 * carrying no domain type between them. That is precisely "a pure function from a query to what the
 * board draws", it has been in the tree the whole time, and `lib/todoTimeline.ts:995` is its single
 * caller. Writing a second one would be two answers to one question waiting to disagree — the fault
 * this repo records more than any other. **Query Centre's adapter is a second CALLER of `laneBars`,
 * not a new derivation.**
 *
 * ⚠️ SO WHAT IS LEFT FOR A TYPE TO STATE IS THE ROW'S IDENTITY, and the board reads exactly nine
 * fields of it. Because TypeScript is structural, a host whose row already carries those satisfies
 * this with **no mapping code at all** — and that is the strongest form the contract can take:
 * there is nothing to keep in step, so nothing can fall out of step. To-do's own `TimelineRow`
 * (seventeen fields) satisfies it today, unchanged, and `tsc` is the proof.
 */

/** One dated thing on a row — a task, a send, a reply. The board reads nine fields of it. */
export interface BoardItem {
  key: string;
  idx: number;
  ymd: string;
  kind: string;
  label: string;
  lane: number;
  struck?: boolean;
  draggable: boolean;
  /**
   * ⚠️ THE ONLY THING THE BOARD WANTS FROM A CARD IS THE ID IT DRAGS BY. Widening this to the
   * host's whole card type would pull To-do's task model into a file whose entire purpose is that
   * the board does not know what a task is.
   */
  card?: { userTaskId?: string | null } | null;
}

/**
 * What the board reads off a row.
 *
 * ⚠️ NINE FIELDS, MEASURED FROM THE RENDER RATHER THAN DESIGNED. They are every `r.…` the board
 * touches. Adding a tenth because it "belongs" is how a contract stops describing what is true and
 * starts describing what somebody expected.
 */
export interface BoardRow {
  key: string;
  name: string;
  agency: string;
  /** how many lines this row occupies — DATA; `--row-h × --lanes` is the stylesheet's */
  lanes: number;
  closed: boolean;
  /** the tier the host grouped by, published to the DOM so an ordering lock reads what was sorted */
  group: string | null;
  pressingAt: number | null;
  /** published as `data-subj-*` so a lock can follow one row across a mode change */
  subjects: { deed: string | null; caption: string | null; sort: string | null };
  items: readonly BoardItem[];
}

/**
 * The window: a fixed span with today inside it.
 *
 * ⚠️ ONE WINDOW, NINETY DAYS, PAGED BY THE WEEK — there is no 2/4/6-month zoom and there has not
 * been since v58. `timelineRanges.ts` has ONE entry, and the harness's own `setRangeTo` throws
 * saying the range control is gone. A host that renders a range picker would be inventing a control
 * the board does not have.
 */
export interface BoardWindow {
  from: Date;
  /** published to the sheet as `--tl-days`; every position resolves against it in `cqw` */
  days: number;
  today: Date;
}
