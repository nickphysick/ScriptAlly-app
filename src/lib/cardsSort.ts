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
import type { Sort151, SortKey151 } from "./qc151";

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

/**
 * List filters v1 Phase 4 — THE QUERIES LIST'S SORT, over the list's one sort state (`Sort151`, the state the List view
 * reads; `reversed` is `desc`). The menu's five, each with its natural order first (choosing a field sets it), then
 * Agency and Next move, which no menu offers but a sort set elsewhere may hold: the button still names them.
 * ⚠️ NOT QC_SORT_FIELDS: that list is keyed by Qc138SortKey, the full-screen toolbar's sort (QcToolbar140), which the
 *    desktop page does not mount.
 */
export const QC_LIST_SORT_FIELDS: readonly SortField<SortKey151>[] = [
  { key: "due", label: "Next due", natural: false, order: [{ label: "Soonest first", reversed: false }, { label: "Latest first", reversed: true }] },
  { key: "queried", label: "Queried", natural: true, order: [{ label: "Newest first", reversed: true }, { label: "Oldest first", reversed: false }] },
  { key: "heard", label: "Last heard", natural: true, order: [{ label: "Most recent first", reversed: true }, { label: "Oldest first", reversed: false }] },
  { key: "agent", label: "Agent", natural: false, order: AZ as SortField<SortKey151>["order"] },
  { key: "stage", label: "Where it stands", natural: false, order: [{ label: "Earliest stage first", reversed: false }, { label: "Furthest on first", reversed: true }] },
];
/** the button's names for a sort the menu does not offer (set by a heading elsewhere) */
export const QC_LIST_SORT_NAMED: readonly SortField<SortKey151>[] = [
  ...QC_LIST_SORT_FIELDS,
  { key: "agency", label: "Agency", order: AZ as SortField<SortKey151>["order"] },
  { key: "next", label: "Next move", order: AZ as SortField<SortKey151>["order"] },
];
export const sortValue151 = (s: Sort151): { key: SortKey151; reversed: boolean } => ({ key: s.key, reversed: s.desc });
export const sort151Of = (v: { key: SortKey151; reversed: boolean }): Sort151 => ({ key: v.key, desc: v.reversed });

/** Contact list v25.1 E4/E5 — its five headings, in their order, each a sort; the pill says the choice in words (no
 *  arrow): "Name A–Z", "Best genre fit", "Quickest reply", "Most urgent", "Highest rated", and their reverses */
export const CL_SORT_FIELDS: readonly SortField<SortKey>[] = [
  /* Contact list rows v1 — the four sorting headings first, in column order, each named as the chip names it (the chip
     and the headings read the one sort state: one source of truth), then the menu's Date added */
  { key: "surname", label: "Surname", order: AZ },
  /* the writer's own rating (sortFacts "rating"): unrated last either way */
  { key: "rating", label: "Fit", order: [{ label: "Best first", reversed: false }, { label: "Lowest first", reversed: true }] },
  /* unknown last either way */
  { key: "reply", label: "Response time", order: [{ label: "Quickest first", reversed: false }, { label: "Slowest first", reversed: true }] },
  /* your move first (furthest along first), then the rest by furthest along, closed last */
  { key: "status", label: "Query status", order: [{ label: "Your move first", reversed: false }, { label: "Closed first", reversed: true }] },
  { key: "added", label: "Date added", order: [{ label: "Newest first", reversed: false }, { label: "Oldest first", reversed: true }] },
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
