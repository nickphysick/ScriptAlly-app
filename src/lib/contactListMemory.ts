/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactListMemory — the Contact list's settings, remembered for the visit (v13 §5): filters,
 * search, grouping, sort and direction, in sessionStorage under `sa.contactList`.
 *
 * ⚠️ PER-VIEWER CONVENIENCE, NEVER STATE THAT MUST PERSIST: sessionStorage can be empty or throw (a
 * private window, blocked storage), so every read and write is guarded and the page renders
 * correctly without it. A stored value is SANITISED on read — an unknown section, a key from a
 * retired build or a wrong type reads as the default, never as a filter nobody can see or clear.
 * ⚠️ Housekeeping's view keeps its own key (`sa.hkGrouping`), deliberately separate.
 */
import {
  type ContactFilters, emptyContactFilters, FILTER_SECTIONS, GROUP_OPTIONS, type GroupKey, SORT_OPTIONS, type SortKey,
} from "./contactList";

export const LIST_MEMORY_KEY = "sa.contactList";

export interface ListMemory {
  filters: ContactFilters;
  search: string;
  group: GroupKey;
  sort: SortKey;
  reversed: boolean;
}

/** A stored value made safe: every section an array of the right primitive, keys the build knows. */
export function sanitiseListMemory(raw: unknown): ListMemory | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const f = emptyContactFilters();
  const stored = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;
  for (const sec of FILTER_SECTIONS) {
    const v = stored[sec];
    if (!Array.isArray(v)) continue;
    (f as unknown as Record<string, unknown[]>)[sec] = sec === "rating"
      ? v.filter((x) => typeof x === "number" && [5, 4, 3, 2, 0].includes(x))
      : v.filter((x) => typeof x === "string");
  }
  return {
    filters: f,
    search: typeof r.search === "string" ? r.search : "",
    group: GROUP_OPTIONS.some((g) => g.key === r.group) ? (r.group as GroupKey) : "letter",
    sort: SORT_OPTIONS.some((s) => s.key === r.sort) ? (r.sort as SortKey) : "surname",
    reversed: r.reversed === true,
  };
}

export function readListMemory(): ListMemory | null {
  try {
    const s = window.sessionStorage.getItem(LIST_MEMORY_KEY);
    return s ? sanitiseListMemory(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function writeListMemory(m: ListMemory): void {
  try { window.sessionStorage.setItem(LIST_MEMORY_KEY, JSON.stringify(m)); } catch { /* storage refused: the page still works */ }
}
