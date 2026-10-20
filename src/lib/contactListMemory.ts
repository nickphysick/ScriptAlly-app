/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactListMemory — what the Contact list remembers, and for how long (v19 §G).
 *
 *   - PER DEVICE (localStorage, `qh.cl.view`): the grouping, the sort, its direction, and whether the list is pinned.
 *   - FOR THE VISIT (sessionStorage, `sa.contactList.v5`): the filters, the "At a glance" group, the search and the
 *     scroll position. Coming back within the visit restores them; a new visit starts at the top, unfiltered.
 *
 * A first ever visit therefore reads both as absent: unpinned, ungrouped, A to Z by surname, at the top.
 *
 * ⚠️ BOTH STORES ARE VERSIONED, AND EVERYTHING RESTORED IS VALIDATED AGAINST THE CURRENT OPTION SET. A stored object
 * carries `v`; a different version is refused whole, and inside the right version every field is checked on read — an
 * unknown grouping, sort, status, choice or filter key reads as its default, never as a state nobody can see or clear.
 * (`sa.contactList.v4` — v16 to v18's one session record, which also held the grouping and sort — is not read by
 * anything: those two now live per device.)
 *
 * ⚠️ PER-VIEWER CONVENIENCE, NEVER STATE THAT MUST PERSIST: either storage can be empty or throw (a private window,
 * blocked storage), so every read and write is guarded and the page renders correctly without it.
 * Housekeeping's view keeps its own key (`sa.hkGrouping`), deliberately separate.
 */
import {
  type ContactFilters, emptyContactFilters, GROUP_OPTIONS, type GroupKey, OPEN_CHOICES, type OpenChoice,
  QUERIED_CHOICES, type QueriedChoice, SORT_OPTIONS, type SortKey, STATUS_CHOICES, type StatusKey,
} from "./contactList";
import { GLANCE_KEYS, type GlanceKey } from "./contactGlance";

/** the row density (v19 §B: the toggle is retired, the list is always comfortable; the type survives for ContactRows) */
export type Density = "comfortable" | "compact";

const oneOf = <T extends string>(v: unknown, keys: readonly T[], fallback: T): T =>
  (typeof v === "string" && (keys as readonly string[]).includes(v) ? (v as T) : fallback);

/* ── per device: the view ─────────────────────────────────────────────────────────────────────────────────────── */

export const LIST_VIEW_VERSION = 1;
export const LIST_VIEW_KEY = "qh.cl.view";
/** v138.6's pin key for this page, and v16's before it — read once, when `qh.cl.view` has no record, then removed */
export const OLD_PIN_KEYS = ["sa.pinList.agents", "sa.contactsFull"] as const;

export interface ListView { group: GroupKey; sort: SortKey; reversed: boolean; pinned: boolean }
export const DEFAULT_LIST_VIEW = (): ListView => ({ group: "none", sort: "surname", reversed: false, pinned: false });

/** a stored view made safe — null when it is not this version's shape at all */
export function sanitiseListView(raw: unknown): ListView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== LIST_VIEW_VERSION) return null;
  const d = DEFAULT_LIST_VIEW();
  return {
    group: oneOf<GroupKey>(r.group, GROUP_OPTIONS.map((g) => g.key), d.group),
    sort: oneOf<SortKey>(r.sort, SORT_OPTIONS.map((s) => s.key), d.sort),
    reversed: r.reversed === true,
    pinned: r.pinned === true,
  };
}

export const serialiseListView = (m: ListView): string =>
  JSON.stringify({ v: LIST_VIEW_VERSION, group: m.group, sort: m.sort, reversed: m.reversed, pinned: m.pinned });

/**
 * The device's view. Absent or unreadable reads as the defaults — except that a device with no `qh.cl.view` yet but a
 * pin stored under the old keys keeps its pin (migrated once: written into `qh.cl.view`, the old keys removed).
 */
export function readListView(): ListView {
  try {
    const s = window.localStorage.getItem(LIST_VIEW_KEY);
    if (s !== null) {
      let parsed: unknown = null;
      try { parsed = JSON.parse(s); } catch { /* junk: the defaults */ }
      return sanitiseListView(parsed) ?? DEFAULT_LIST_VIEW();
    }
    const pinned = OLD_PIN_KEYS.some((k) => window.localStorage.getItem(k) === "1");
    if (!pinned) return DEFAULT_LIST_VIEW();
    const m = { ...DEFAULT_LIST_VIEW(), pinned: true };
    window.localStorage.setItem(LIST_VIEW_KEY, serialiseListView(m));
    for (const k of OLD_PIN_KEYS) window.localStorage.removeItem(k);
    return m;
  } catch {
    return DEFAULT_LIST_VIEW();
  }
}

export function writeListView(patch: Partial<ListView>): void {
  try { window.localStorage.setItem(LIST_VIEW_KEY, serialiseListView({ ...readListView(), ...patch })); } catch { /* storage refused: the page still works */ }
}

/** the pin's store for the shared pin hook: this page's pinned flag lives in `qh.cl.view` */
export const CONTACT_PIN_STORE = {
  read: (): boolean => readListView().pinned,
  write: (on: boolean): void => writeListView({ pinned: on }),
};

/* ── for the visit: filters, search, scroll ───────────────────────────────────────────────────────────────────── */

export const LIST_VISIT_VERSION = 5;
export const LIST_VISIT_KEY = `sa.contactList.v${LIST_VISIT_VERSION}`;

export interface ListVisit {
  filters: ContactFilters;
  search: string;
  /** v16 §B — the "At a glance" group the list is filtered to, or null */
  glance: GlanceKey | null;
  /** the list's scroll position, in px from the scroll area's top */
  scroll: number;
}

export const DEFAULT_LIST_VISIT = (): ListVisit => ({ filters: emptyContactFilters(), search: "", glance: null, scroll: 0 });

/** a stored visit made safe, field by field — null when it is not this version's shape at all */
export function sanitiseListVisit(raw: unknown): ListVisit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== LIST_VISIT_VERSION) return null;
  const d = DEFAULT_LIST_VISIT();
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
  const scroll = typeof r.scroll === "number" && Number.isFinite(r.scroll) && r.scroll > 0 ? Math.min(Math.round(r.scroll), 1_000_000) : d.scroll;
  return {
    filters,
    search: typeof r.search === "string" ? r.search.slice(0, 200) : d.search,
    glance: typeof r.glance === "string" && (GLANCE_KEYS as readonly string[]).includes(r.glance) ? (r.glance as GlanceKey) : null,
    scroll,
  };
}

export function readListVisit(): ListVisit | null {
  try {
    const s = window.sessionStorage.getItem(LIST_VISIT_KEY);
    return s ? sanitiseListVisit(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function writeListVisit(patch: Partial<ListVisit>): void {
  try {
    const m = { ...(readListVisit() ?? DEFAULT_LIST_VISIT()), ...patch };
    window.sessionStorage.setItem(LIST_VISIT_KEY, JSON.stringify({ v: LIST_VISIT_VERSION, ...m }));
  } catch { /* storage refused: the page still works */ }
}
