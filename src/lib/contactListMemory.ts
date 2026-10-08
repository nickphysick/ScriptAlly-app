/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactListMemory — the Contact list's settings, remembered for the visit (v14 §4): filters, search,
 * grouping, sort and direction, the row density, and (v15 §4) the ready-only list mode, in sessionStorage.
 *
 * ⚠️ THE KEY IS VERSIONED, AND EVERYTHING RESTORED IS VALIDATED AGAINST THE CURRENT OPTION SET (§4, lock 9). An
 * earlier mock crashed when it restored a grouping that no longer existed. So: the key carries the shape's
 * version (`sa.contactList.v3` — v14's `.v2` had no ready-only mode and v13's `sa.contactList` a different filter
 * model; neither is read by anything),
 * the stored object carries `v`, and every field is checked on read — an unknown grouping, sort, status, choice
 * or filter key reads as its default (Letter, Surname A to Z), never as a state nobody can see or clear.
 *
 * ⚠️ PER-VIEWER CONVENIENCE, NEVER STATE THAT MUST PERSIST: sessionStorage can be empty or throw (a private
 * window, blocked storage), so every read and write is guarded and the page renders correctly without it.
 * Housekeeping's view keeps its own key (`sa.hkGrouping`), deliberately separate.
 */
import {
  type ContactFilters, emptyContactFilters, GROUP_OPTIONS, type GroupKey, OPEN_CHOICES, type OpenChoice,
  QUERIED_CHOICES, type QueriedChoice, SORT_OPTIONS, type SortKey, STATUS_CHOICES, type StatusKey,
} from "./contactList";

export const LIST_MEMORY_VERSION = 3;
export const LIST_MEMORY_KEY = `sa.contactList.v${LIST_MEMORY_VERSION}`;

export type Density = "comfortable" | "compact";

export interface ListMemory {
  filters: ContactFilters;
  search: string;
  group: GroupKey;
  sort: SortKey;
  reversed: boolean;
  density: Density;
  /** v15 §4 — the list shows only the agents who are ready to query (the next-step section's own rule) */
  readyOnly: boolean;
}

export const DEFAULT_LIST_MEMORY = (): ListMemory =>
  ({ filters: emptyContactFilters(), search: "", group: "letter", sort: "surname", reversed: false, density: "comfortable", readyOnly: false });

const oneOf = <T extends string>(v: unknown, keys: readonly T[], fallback: T): T =>
  (typeof v === "string" && (keys as readonly string[]).includes(v) ? (v as T) : fallback);

/** A stored value made safe, field by field — anything the current build does not know reads as its default. */
export function sanitiseListMemory(raw: unknown): ListMemory | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== LIST_MEMORY_VERSION) return null;
  const d = DEFAULT_LIST_MEMORY();
  const sf = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;
  const statusKeys = STATUS_CHOICES.map((c) => c.key);
  const filters: ContactFilters = {
    status: Array.isArray(sf.status) ? [...new Set(sf.status.filter((x): x is StatusKey => (statusKeys as string[]).includes(x as string)))] : [],
    action: sf.action === true,
    open: oneOf<OpenChoice>(sf.open, OPEN_CHOICES.map((c) => c.key), "either"),
    queried: oneOf<QueriedChoice>(sf.queried, QUERIED_CHOICES.map((c) => c.key), "either"),
    mats: sf.mats === true,
    always: sf.always === true,
    genres: Array.isArray(sf.genres) ? [...new Set(sf.genres.filter((x): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= 80))].slice(0, 20) : [],
    genreMode: sf.genreMode === "all" ? "all" : "any",
  };
  return {
    filters,
    search: typeof r.search === "string" ? r.search.slice(0, 200) : d.search,
    group: oneOf<GroupKey>(r.group, GROUP_OPTIONS.map((g) => g.key), d.group),
    sort: oneOf<SortKey>(r.sort, SORT_OPTIONS.map((s) => s.key), d.sort),
    reversed: r.reversed === true,
    density: r.density === "compact" ? "compact" : d.density,
    readyOnly: r.readyOnly === true,
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
  try { window.sessionStorage.setItem(LIST_MEMORY_KEY, JSON.stringify({ v: LIST_MEMORY_VERSION, ...m })); } catch { /* storage refused: the page still works */ }
}
