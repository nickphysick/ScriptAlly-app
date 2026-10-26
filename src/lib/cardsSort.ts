/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cards-sort-search v1 §B — THE CARDS VIEW'S SORT FIELDS, per page. Each is one of that page's own sort keys (the keys the
 * List view's column headings set), so the chip and the headings cannot disagree; the order switch's words suit the
 * field, each mapped to the direction it sets (`reversed: false` is a heading's first press).
 */
import type { SortField } from "../components/shell/SortChip";
import type { Qc138SortKey } from "./qc138";
import type { SortKey } from "./contactList";

const AZ = [{ label: "A to Z", reversed: false }, { label: "Z to A", reversed: true }] as SortField<string>["order"];

/** Query Centre: the default (Due) first, then the column headings in their order, then Last changed (no heading) */
export const QC_SORT_FIELDS: readonly SortField<Qc138SortKey>[] = [
  { key: "due", label: "Due date", order: [{ label: "Soonest first", reversed: false }, { label: "Latest first", reversed: true }] },
  { key: "agent", label: "Agent", order: AZ },
  { key: "first", label: "First queried", order: [{ label: "Newest first", reversed: true }, { label: "Oldest first", reversed: false }] },
  { key: "stage", label: "Where it stands", order: [{ label: "Furthest on", reversed: true }, { label: "Earliest first", reversed: false }] },
  { key: "sent", label: "What you sent", order: AZ },
  { key: "next", label: "Next move", order: AZ },
  { key: "changed", label: "Last changed", order: [{ label: "Newest first", reversed: true }, { label: "Oldest first", reversed: false }] },
];

/** Contact list: its four sortable headings, in their order (Agent sorts by surname) */
export const CL_SORT_FIELDS: readonly SortField<SortKey>[] = [
  /* Contact list v25 D2 — the bar's pill says "Name A–Z ↓" (the menu keeps "Surname") */
  { key: "surname", label: "Surname", order: AZ, chip: (r) => (r ? "Name Z–A" : "Name A–Z") },
  { key: "added", label: "Date added", order: [{ label: "Newest first", reversed: false }, { label: "Oldest first", reversed: true }] },
  { key: "reply", label: "Reply time", order: [{ label: "Fastest first", reversed: false }, { label: "Slowest first", reversed: true }] },
  { key: "status", label: "Query status", order: [{ label: "Furthest on", reversed: false }, { label: "Earliest first", reversed: true }] },
];

/**
 * cards-sort-search v1 §B — THE MONTH JUMPS for a list sorted by a date: one per month the rows fall in, in the order the
 * list draws them, each naming its first row. Rows with no readable date take no month. "Jun", or "Jun ’25" in
 * another year (the Query Centre's month jumps' own words).
 */
export interface MonthJumpItem { key: string; label: string; n: number; firstId: string }
export function monthJumpsOf<T>(rows: readonly T[], ms: (r: T) => number | null, id: (r: T) => string, nowMs: number, months: readonly string[]): MonthJumpItem[] {
  const y0 = new Date(nowMs).getFullYear();
  const out: MonthJumpItem[] = [];
  const at = new Map<string, MonthJumpItem>();
  for (const r of rows) {
    const t = ms(r);
    if (t == null || !Number.isFinite(t)) continue;
    const d = new Date(t);
    const key = `m:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hit = at.get(key);
    if (hit) { hit.n += 1; continue; }
    const m: MonthJumpItem = { key, label: `${months[d.getMonth()]}${d.getFullYear() === y0 ? "" : ` \u2019${String(d.getFullYear()).slice(2)}`}`, n: 1, firstId: id(r) };
    at.set(key, m);
    out.push(m);
  }
  return out;
}
/** the Contact list's date sorts: ungrouped, these make the jump row months */
export const CL_DATE_SORTS: readonly SortKey[] = ["added"];
