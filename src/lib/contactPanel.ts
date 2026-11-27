/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.2 · Phase 4 — THE REVAMPED FILTER PANEL'S COUNTS (design-refs/contact-list-rows-v1-2, "v4.12").
 *
 *   Your list           All · Queried · Not yet                       (`queried`)
 *   Open to queries?    Either · Open · Closed                        (`open`)
 *   Fit                 ★★★★★ · ★★★★ and up · Not rated              (`fit`, single choice)
 *   Replies             Always replies · No response means no · Reply time known   (`reply`, single choice)
 *   Genres sought       every genre on file, several allowed, any match (`genres`)
 *   Outside the UK      (`abroad`)        Missing details  (`missing`)
 *
 * ⚠️ FACETED: each option counts the agents it would show given every OTHER section's choice (and Find, and a set from a
 *    link), by the list's own predicate (`matchesContactFilters` with that section left out). So an option's number is
 *    what pressing it would leave in the list.
 */
import type { AgentFacts, ContactFilters, FilterSection } from "./contactList";
import { fitMatches, isClosedNow, isOpenNow, isQueried, matchesContactFilters, replyMatches, hasMissingDetails } from "./contactList";
import { genreKey } from "./genreMatch";
import { inSet } from "./contactV24";
import type { Sets } from "./contactV27";

export interface PanelGenre { key: string; label: string; n: number; total: number; on: boolean }
export interface PanelCounts {
  list: { all: number; queried: number; none: number };
  door: { any: number; open: number; closed: number };
  fit: { 5: number; 4: number; 0: number };
  reply: { always: number; nrmn: number; known: number };
  /** every genre on file, most carried first, then A to Z */
  genres: PanelGenre[];
  /** agents with no genres on file — the "No genres yet" pill's count, faceted like the genres (v1.2.1) */
  noGenres: number;
  abroad: number;
  missing: number;
  /** what the list shows now, and the whole list */
  showing: number;
  total: number;
}

export function panelCounts(
  all: readonly AgentFacts[], f: ContactFilters, sets: Sets, pool: (x: AgentFacts) => boolean,
  genreLabel: (key: string, raw: string) => string,
): PanelCounts {
  const seen = all.filter((x) => pool(x) && inSet(x, sets));
  const c = (except: FilterSection | null, fn: (x: AgentFacts) => boolean) =>
    seen.reduce((n, x) => n + (matchesContactFilters(x, f, except ?? undefined) && fn(x) ? 1 : 0), 0);
  const totals = new Map<string, PanelGenre>();
  for (const x of all) {
    const once = new Set<string>();
    for (const raw of x.genres) {
      const k = genreKey(raw);
      if (!k || once.has(k)) continue;
      once.add(k);
      const t = totals.get(k);
      if (t) t.total += 1; else totals.set(k, { key: k, label: genreLabel(k, raw), n: 0, total: 1, on: f.genres.includes(k) });
    }
  }
  for (const x of seen) {
    if (!matchesContactFilters(x, f, "genres")) continue;
    for (const k of new Set(x.genres.map(genreKey))) { const t = totals.get(k); if (t) t.n += 1; }
  }
  return {
    list: { all: c("queried", () => true), queried: c("queried", isQueried), none: c("queried", (x) => !isQueried(x)) },
    door: { any: c("open", () => true), open: c("open", isOpenNow), closed: c("open", isClosedNow) },
    fit: { 5: c("fit", (x) => fitMatches(x, 5)), 4: c("fit", (x) => fitMatches(x, 4)), 0: c("fit", (x) => fitMatches(x, 0)) },
    reply: { always: c("reply", (x) => replyMatches(x, "always")), nrmn: c("reply", (x) => replyMatches(x, "nrmn")), known: c("reply", (x) => replyMatches(x, "known")) },
    genres: [...totals.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    noGenres: c("genres", (x) => x.genres.length === 0),
    abroad: c("abroad", (x) => x.abroad === true),
    missing: c("missing", hasMissingDetails),
    showing: c(null, () => true),
    total: all.length,
  };
}

/** v1.2.1 — the head's quiet summary beside "Filter": "{x} of {n}" while a filter is on; nothing at rest (the foot line
 *  is gone) */
export const panelSummary = (on: boolean, showing: number, total: number): string | null => (on ? `${showing} of ${total}` : null);
