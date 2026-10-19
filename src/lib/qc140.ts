/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 — the list's toolbar, its menus and the applied-filters row, as pure functions
 * (ref design-refs/query-centre-v140/). The components are `queries/centre/QcToolbar140.tsx`.
 *
 *   - THE JUMP ROW: one button per group in the group's order (its mark, its label, its count), or, with no grouping,
 *     the sort column's label and one button per month of that column's date, in list order.
 *   - THE FILTERS MENU'S ROWS: the four quick picks, the eight "Where it stands" rows, and the applied chips.
 *
 * ⚠️ ONE FILTER STATE (`Qc138Filters`). The Overdue quick pick IS the "Past their reply date" switch (`past`) and the
 *    Offers quick pick IS the Offers toggle (`offers`): a pick reads and writes the same field, so the two can never
 *    disagree and the applied row shows one chip. Only Your move and Waiting to hear back had no field of their own
 *    (`you`, `waiting`, added to `Qc138Filters`).
 */
import { QueryStatus } from "../types";
import { MONTHS_SHORT } from "./dates";
import type { Qc138SortKey } from "./qc138";
import type { GroupBy } from "./qcCalView";

/* ── the jump row ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** Next action's short labels, in the jump row only (the bands keep their full names), keyed by the group's key */
export const JUMP_SHORT: Readonly<Record<string, string>> = {
  offer: "Offer",
  close: "Close?",
  [QueryStatus.NO_RESPONSE]: "No reply",
};
export const jumpLabel = (groupBy: GroupBy, key: string, label: string): string =>
  groupBy === "action" ? JUMP_SHORT[key] ?? label : label;

/** the date the ungrouped jump row reads: the sort column's, or the last change for any other heading */
export type JumpColumn = "due" | "queried" | "changed";
export const jumpColumn = (k: Qc138SortKey): JumpColumn => (k === "due" ? "due" : k === "first" ? "queried" : "changed");
export const JUMP_COLUMN_LABEL: Readonly<Record<JumpColumn, string>> = { due: "DUE", queried: "QUERIED", changed: "CHANGED" };

export interface MonthRow {
  id: string;
  court: string;
  expectedMs: number | null;
  sentMs: number | null;
  stageStartMs: number | null;
  lastMs: number;
}
/* the due date is `dueOf`'s: the expected date of a live query, none for a closed one */
const dateOf = (r: MonthRow, col: JumpColumn): number | null =>
  col === "due" ? (r.court === "closed" ? null : r.expectedMs) : col === "queried" ? r.sentMs : r.stageStartMs ?? r.lastMs;

export interface MonthJump { key: string; label: string; n: number; firstId: string }
/**
 * One button per month of the column's date, in LIST order (the order the rows are drawn): a month's button jumps to
 * its first row. A row with no date makes no button. "May ’24" when the year is not this one.
 */
export function monthJumps(rows: readonly MonthRow[], col: JumpColumn, nowMs: number): MonthJump[] {
  const y0 = new Date(nowMs).getFullYear();
  const out: MonthJump[] = [];
  const at = new Map<string, MonthJump>();
  for (const r of rows) {
    const ms = dateOf(r, col);
    if (ms == null || !Number.isFinite(ms)) continue;
    const d = new Date(ms);
    const key = `m:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hit = at.get(key);
    if (hit) { hit.n += 1; continue; }
    const m: MonthJump = { key, label: `${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === y0 ? "" : ` ’${String(d.getFullYear()).slice(2)}`}`, n: 1, firstId: r.id };
    at.set(key, m);
    out.push(m);
  }
  return out;
}
