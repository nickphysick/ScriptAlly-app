/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153 — the filter rail's pure parts, over the page's ONE filter state (`Qc138Filters`). The rail is a
 * new presentation of the same filters: Most used, Where it stands (the four sets, then the stages), What you sent,
 * More. Nothing here adds a filter.
 *
 * ⚠️ FACETED COUNTS: an option's count applies every OTHER active section and ignores its own, so it says how many
 *    rows you would get by choosing it. A section is a facet; `clearFacet` is the one place that says which fields
 *    belong to which.
 * ⚠️ OVERDUE IS `past`, the same field as More's "Past their reply date" (lib/qc140). It belongs to both facets, so
 *    counting either section clears it.
 * ⚠️ MOST USED IS A RADIO: one pick at a time; pressing the active one turns it off.
 */
import { emptyQc138Filters, type Qc138Filters } from "./qc138";
import { QUICK_PICKS, STAND_ROWS, appliedChips, toggleStand, type QuickKey } from "./qc140";
import { WHERE_KEYS, type WhereKey } from "./qcSummary";

export type Facet = "quick" | "where" | "stages" | "sent" | "more";
export const QUICK_FIELDS = ["you", "past", "waiting", "offers"] as const;
export const MORE_FIELDS = ["dueWeek", "past", "missing", "overYear"] as const;
export type MoreField = (typeof MORE_FIELDS)[number];
export const MORE_ROWS_153: readonly { key: MoreField; label: string }[] = [
  { key: "dueWeek", label: "Due this week" },
  { key: "past", label: "Past their reply date" },
  { key: "missing", label: "Missing materials" },
  { key: "overYear", label: "Over a year" },
];

/** the filters with one section cleared */
export function clearFacet(f: Qc138Filters, facet: Facet): Qc138Filters {
  switch (facet) {
    case "quick": return { ...f, you: false, past: false, waiting: false, offers: false };
    case "where": return { ...f, where: null };
    case "stages": return { ...f, stages: [] };
    case "sent": return { ...f, sent: [] };
    case "more": return { ...f, dueWeek: false, past: false, missing: false, overYear: false };
  }
}

/** Most used: choose one pick (clearing the other three), or turn the active one off */
export function pickQuick(f: Qc138Filters, key: QuickKey): Qc138Filters {
  const p = QUICK_PICKS.find((x) => x.key === key)!;
  if (f[p.field]) return { ...f, [p.field]: false };
  return { ...f, you: false, waiting: false, offers: false, past: false, [p.field]: true };
}
/** a Most used pick is on when its field is */
export const quickOn = (f: Qc138Filters, key: QuickKey): boolean => f[QUICK_PICKS.find((x) => x.key === key)!.field];

/** "n on": one per applied chip, the header's figure (search is not a filter and is not counted) */
export const railOn = (f: Qc138Filters): number => appliedChips(f, () => "").length;

export interface RailCounts {
  quick: Record<QuickKey, number>;
  where: Record<WhereKey, number>;
  stand: Record<string, number>;
  sent: Record<string, number>;
  more: Record<MoreField, number>;
}

/**
 * Every option's faceted count over `rows` (already narrowed by everything that is not a rail filter: scope, search).
 * `match` is the page's own filter (lib/qc138 `matches138`).
 */
export function railCounts<R>(rows: readonly R[], f: Qc138Filters, sentKeys: readonly string[], match: (r: R, g: Qc138Filters) => boolean): RailCounts {
  const E = emptyQc138Filters();
  const pool = (facet: Facet) => { const g = clearFacet(f, facet); return rows.filter((r) => match(r, g)); };
  const count = (rs: readonly R[], only: Qc138Filters) => rs.filter((r) => match(r, only)).length;
  const q = pool("quick"), w = pool("where"), s = pool("stages"), p = pool("sent"), m = pool("more");
  const quick = {} as Record<QuickKey, number>;
  for (const x of QUICK_PICKS) quick[x.key] = count(q, { ...E, [x.field]: true });
  const where = {} as Record<WhereKey, number>;
  for (const k of WHERE_KEYS) where[k] = count(w, { ...E, where: k });
  const stand: Record<string, number> = {};
  for (const row of STAND_ROWS) stand[row.key] = count(s, toggleStand(E, row));
  const sent: Record<string, number> = {};
  for (const k of sentKeys) sent[k] = count(p, { ...E, sent: [k] });
  const more = {} as Record<MoreField, number>;
  for (const r of MORE_ROWS_153) more[r.key] = count(m, { ...E, [r.key]: true });
  return { quick, where, stand, sent, more };
}
