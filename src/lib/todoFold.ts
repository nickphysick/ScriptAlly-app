/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoFold — collapsible columns and reflow-on-fold, as pure arithmetic (board-optimise pack,
 * Phase 6; refs design-refs/board-features.html + design-refs/board-reflow.html).
 *
 * ⚠️ THE FOLD IS A UI PREFERENCE, NEVER BOARD DATA. It says nothing about any card — only about
 * what this reader wants to look at — so it lives in localStorage under the house `sa.` prefix
 * beside the rail pin and the timeline pin, and NOTHING about it reaches Firestore. Storing it on
 * the user doc would put a view preference into the same schema the board derives from, which is
 * one shelf away from storing a card's column.
 *
 * ⚠️ THE LANES ARE PURE PRESENTATION, AND THE SORT IS WHY THEY CAN BE. Card order is DERIVED by
 * the sort control — never stored — so splitting a column's list across two lanes changes nothing
 * true: reading order fills top-to-bottom then flows to the second lane, so item 5 sits at the
 * TOP OF LANE TWO rather than beside item 1, and the derived order survives intact. Dragging
 * still targets the ordered list; the partition and every count are untouched.
 */
import { BoardCard } from "./todoBoard";
import { TodoColumnId, BOARD_COL_CAP } from "./todoColumns";

/** The folded rail's width — the ref's own measure. */
export const FOLD_RAIL_PX = 44;
/** The lanes collapse back on the shared curve, at the shared duration. */
export const REFLOW_MS = 220;

export type FoldState = Partial<Record<TodoColumnId, true>>;

const KEY = "sa.todoFolded";

/** ⚠️ A UI PREFERENCE, read defensively: private mode throws on access, and a corrupt value must
 *  read as "nothing folded" rather than taking the board down with it. */
export function readFold(): FoldState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: FoldState = {};
    for (const id of ["todo", "today", "snoozed", "done"] as TodoColumnId[]) {
      if ((parsed as Record<string, unknown>)[id] === true) out[id] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeFold(state: FoldState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

export function toggleFold(state: FoldState, id: TodoColumnId): FoldState {
  const next: FoldState = { ...state };
  if (next[id]) delete next[id]; else next[id] = true;
  return next;
}

/* ── reflow ────────────────────────────────────────────────────────────────────────────────── */

export interface ReflowPlan {
  /** The column that claims the freed width, or null — at most one, ever. */
  columnId: TodoColumnId | null;
  /** How many lanes it spans. 1 = no reflow; 2 is the hard maximum. */
  lanes: 1 | 2;
  /** Cards shown across both lanes, and what a single lane would have shown — the head's figures. */
  showing: number;
  was: number;
}

/** At most TWO. A third lane would make the column wider than the reading eye can track back, and
 *  the whole point of a capped measure is that a line stays scannable. */
export const MAX_LANES = 2;

/**
 * ⚠️ FREED WIDTH IS CLAIMED BY THE LEFTMOST OVERFLOWING COLUMN — one column, never shared.
 *
 * "Overflowing" means the column holds more cards than its single-lane fold shows (BOARD_COL_CAP)
 * — i.e. it has content the viewport is currently hiding behind "+N more". A column that fits has
 * nothing to gain from a second lane, and giving it one would spread four cards over a width that
 * makes them look like a different, sparser board.
 *
 * Leftmost, because the columns are ordered by urgency: if both To do and Today are overflowing,
 * the freed space goes to the one you are meant to be working from.
 */
export function reflowPlan(
  columns: Record<TodoColumnId, BoardCard[]>,
  fold: FoldState,
  order: TodoColumnId[],
): ReflowPlan {
  const foldedCount = order.filter((id) => fold[id]).length;
  const none: ReflowPlan = { columnId: null, lanes: 1, showing: 0, was: 0 };
  if (foldedCount === 0) return none; // nothing freed, nothing to claim

  for (const id of order) {
    if (fold[id]) continue;
    const cards = columns[id] ?? [];
    if (cards.length > BOARD_COL_CAP) {
      const was = BOARD_COL_CAP;
      const showing = Math.min(cards.length, BOARD_COL_CAP * MAX_LANES);
      return { columnId: id, lanes: MAX_LANES, showing, was };
    }
  }
  return none; // folded columns, but nothing overflowing — the width simply becomes margin
}

/**
 * ⚠️ READING ORDER FILLS TOP-TO-BOTTOM, THEN THE NEXT LANE — never left-to-right pairs. Item 5
 * sits at the TOP of lane two, so the derived sort still reads down the page the way it always
 * did; a row-major split would interleave the order and quietly lie about the ranking.
 */
export function splitLanes(cards: BoardCard[], lanes: 1 | 2): BoardCard[][] {
  if (lanes === 1) return [cards];
  const per = Math.ceil(cards.length / lanes);
  return [cards.slice(0, per), cards.slice(per)];
}

/** "SHOWING 8 · WAS 4" — the head's own figures, stated so the gain is legible rather than felt. */
export function reflowHeadLabel(plan: ReflowPlan): string | null {
  if (!plan.columnId || plan.lanes === 1) return null;
  return `SHOWING ${plan.showing} · WAS ${plan.was}`;
}
