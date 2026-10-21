/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §F — WHAT THE QUERY CENTRE'S LIST REMEMBERS, AND FOR HOW LONG (the Contact list v19's model, built
 * as this page's own copy: `lib/contactListMemory.ts` is that page's and is not shared).
 *
 *   - PER DEVICE (localStorage, `qh.qc.view`): the grouping, the sort (column and direction) and the row density.
 *     Pinning stays v138.6's `sa.pinList.queries`, untouched.
 *   - FOR THE VISIT (sessionStorage, `qh.qc.filters`): the filters (quick picks included — they are fields of the one
 *     filter state), the search text and the unpinned scroll position. A new visit starts at the top, unfiltered.
 *
 * Both are read synchronously in the page's state initialisers, so the list's FIRST render already carries them; the
 * scroll is put back in a layout effect on the list's first draw, before it is painted.
 *
 * ⚠️ BOTH STORES ARE VERSIONED AND EVERYTHING RESTORED IS VALIDATED AGAINST THE CURRENT OPTION SET. A different version
 *    is refused whole; inside the right version an unknown grouping, sort key, status or filter value reads as its
 *    default, never as a state nobody can see or clear.
 * ⚠️ `sa.qcList.v1` (v132's density + grouping, version 2 inside it) is read ONCE, when `qh.qc.view` has no record:
 *    its values are written into `qh.qc.view` and the old key is removed.
 * ⚠️ PER-VIEWER CONVENIENCE: either storage can be empty or throw, so every read and write is guarded and the page
 *    renders correctly without it.
 */
import { QueryStatus } from "../types";
import type { GroupBy } from "./qcCalView";
import { DEFAULT_SORT_138, emptyQc138Filters, type Qc138Filters, type Qc138Sort, type Qc138SortKey } from "./qc138";
import { parseQcListMemory, QC_LIST_MEMORY_KEY, type QcDensity } from "./qcListMemory";

const GROUPS: readonly GroupBy[] = ["attention", "status", "action", "package", "none"];
const SORT_KEYS: readonly Qc138SortKey[] = ["agent", "first", "stage", "sent", "next", "due"];
const STATUSES: readonly string[] = Object.values(QueryStatus);

/* ── per device: the view ─────────────────────────────────────────────────────────────────────────────────────── */

export const QC_VIEW_KEY = "qh.qc.view";
export const QC_VIEW_VERSION = 1;
/** v142 §A — Cards or List; List by default. Carried inside version 1 (absent reads as List), as the Contact list's is. */
export type QcListView = "cards" | "list";
export interface QcView { group: GroupBy; sort: Qc138Sort; density: QcDensity; view: QcListView }
/** v141 §C — the list opens grouped by Status (was "Who it's with", `attention`); a saved choice is still honoured */
export const DEFAULT_QC_GROUP: GroupBy = "status";
export const DEFAULT_QC_VIEW = (): QcView => ({ group: DEFAULT_QC_GROUP, sort: { ...DEFAULT_SORT_138 }, density: "comfortable", view: "list" });

/** a stored view made safe, field by field — null when it is not this version's shape at all */
export function sanitiseQcView(raw: unknown): QcView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== QC_VIEW_VERSION) return null;
  const d = DEFAULT_QC_VIEW();
  const s = (r.sort && typeof r.sort === "object" ? r.sort : {}) as Record<string, unknown>;
  const key = SORT_KEYS.includes(s.key as Qc138SortKey) ? (s.key as Qc138SortKey) : d.sort.key;
  return {
    group: GROUPS.includes(r.group as GroupBy) ? (r.group as GroupBy) : d.group,
    sort: { key, reversed: key === s.key && s.reversed === true },
    density: r.density === "compact" ? "compact" : "comfortable",
    view: r.view === "cards" ? "cards" : "list",
  };
}

export const serialiseQcView = (m: QcView): string =>
  JSON.stringify({ v: QC_VIEW_VERSION, group: m.group, sort: { key: m.sort.key, reversed: m.sort.reversed }, density: m.density, view: m.view });

/** The device's view. Absent reads as the defaults — except that a device still carrying v132's `sa.qcList.v1` keeps
 *  its grouping and density, moved once into `qh.qc.view` (the old key is removed). */
export function readQcView(): QcView {
  try {
    const s = window.localStorage.getItem(QC_VIEW_KEY);
    if (s !== null) {
      let parsed: unknown = null;
      try { parsed = JSON.parse(s); } catch { /* junk: the defaults */ }
      return sanitiseQcView(parsed) ?? DEFAULT_QC_VIEW();
    }
    const old = window.localStorage.getItem(QC_LIST_MEMORY_KEY);
    if (old === null) return DEFAULT_QC_VIEW();
    const o = parseQcListMemory(old);
    const m: QcView = { ...DEFAULT_QC_VIEW(), group: o.group, density: o.density };
    window.localStorage.setItem(QC_VIEW_KEY, serialiseQcView(m));
    window.localStorage.removeItem(QC_LIST_MEMORY_KEY);
    return m;
  } catch {
    return DEFAULT_QC_VIEW();
  }
}

export function writeQcView(patch: Partial<QcView>): void {
  try { window.localStorage.setItem(QC_VIEW_KEY, serialiseQcView({ ...readQcView(), ...patch })); } catch { /* storage refused: the page still works */ }
}

/* ── for the visit: filters, search, scroll ───────────────────────────────────────────────────────────────────── */

export const QC_VISIT_KEY = "qh.qc.filters";
export const QC_VISIT_VERSION = 1;
export interface QcVisit {
  filters: Qc138Filters;
  search: string;
  /** the list's unpinned scroll position, in px from the scroll area's top */
  scroll: number;
}
export const DEFAULT_QC_VISIT = (): QcVisit => ({ filters: emptyQc138Filters(), search: "", scroll: 0 });

const uniqStrings = (v: unknown, keep: (s: string) => boolean, max: number): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && keep(x)))].slice(0, max) : [];

/** a stored visit made safe, field by field — null when it is not this version's shape at all */
export function sanitiseQcVisit(raw: unknown): QcVisit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== QC_VISIT_VERSION) return null;
  const d = DEFAULT_QC_VISIT();
  const f = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;
  const filters: Qc138Filters = {
    stages: uniqStrings(f.stages, (s) => STATUSES.includes(s), 20) as QueryStatus[],
    dueWeek: f.dueWeek === true,
    offers: f.offers === true,
    /* package ids (validated when the packages arrive: an unknown one reads "Package no longer on file" and clears) */
    sent: uniqStrings(f.sent, (s) => s.length > 0 && s.length <= 128, 40),
    past: f.past === true,
    missing: f.missing === true,
    overYear: f.overYear === true,
    you: f.you === true,
    waiting: f.waiting === true,
    where: f.where === "you" || f.where === "agent" || f.where === "quiet" || f.where === "closed" ? f.where : null,
  };
  const scroll = typeof r.scroll === "number" && Number.isFinite(r.scroll) && r.scroll > 0 ? Math.min(Math.round(r.scroll), 1_000_000) : d.scroll;
  return { filters, search: typeof r.search === "string" ? r.search.slice(0, 200) : d.search, scroll };
}

export function readQcVisit(): QcVisit | null {
  try {
    const s = window.sessionStorage.getItem(QC_VISIT_KEY);
    return s ? sanitiseQcVisit(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function writeQcVisit(patch: Partial<QcVisit>): void {
  try {
    const m = { ...(readQcVisit() ?? DEFAULT_QC_VISIT()), ...patch };
    window.sessionStorage.setItem(QC_VISIT_KEY, JSON.stringify({ v: QC_VISIT_VERSION, filters: m.filters, search: m.search, scroll: m.scroll }));
  } catch { /* storage refused: the page still works */ }
}
