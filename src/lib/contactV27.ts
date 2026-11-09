/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 (design-refs/contact-list-v27/) — the filter rail's pure half. The rail is a PRESENTATION of the
 * page's one filter state — `ContactFilters` plus the page's set (`SetKey[] | null`, the "Where they stand" group the
 * applied row already shows as a chip) — never a second model. Every count here is the list's own predicate
 * (`matchesContactFilters`, `inSet`), FACETED as the Query Centre's rail is: each control is counted under every OTHER
 * active control and Find, so a count is what the list would show if that control were added.
 */
import type { AgentFacts, ContactFilters } from "./contactList";
import { contactFilterCount, isOpenNow, matchesContactFilters } from "./contactList";
import { genreKey } from "./genreMatch";
import { inSet, SET_ORDER, type SetKey } from "./contactV24";
import { applyPick, PICKS26, pickOn, type Pick26Key } from "./contactV26";

export type Sets = readonly SetKey[] | null;

/** "Where they stand": the page's set, a tile at a time. Pressing a tile that is off shows that group alone; pressing
 *  one that is on takes it out (and an empty set is no set) — so a second click on the only tile on clears it. */
export function toggleSet(sets: Sets, k: SetKey): Sets {
  if (!sets || !sets.includes(k)) return [k];
  const rest = sets.filter((x) => x !== k);
  return rest.length ? rest : null;
}

/** "n on": one per applied-filters chip, as the applied row counts them (the set is one chip) */
export const railOn = (f: ContactFilters, sets: Sets): number => contactFilterCount(f) + (sets ? 1 : 0);

export interface RailGenre { key: string; label: string; n: number; on: boolean }
export interface RailCounts27 {
  picks: Record<Pick26Key, number>;
  where: Record<SetKey, number>;
  genres: RailGenre[];
  open: number;
}

/**
 * The rail's counts over every agent on file.
 *   picks   the number the list would show with that pick chosen (the one that is on: what it shows now)
 *   where   each group under the filters and Find, ignoring the set itself
 *   genres  every genre on file, in the order of how many agents carry it (then A–Z), counted under everything but
 *           the genre filter
 *   open    "Open to queries only", counted under everything but the submissions filter
 */
export function railCounts(
  all: readonly AgentFacts[], f: ContactFilters, sets: Sets, pool: (x: AgentFacts) => boolean,
  genreLabel: (key: string, raw: string) => string,
): RailCounts27 {
  const inView = (x: AgentFacts, g: ContactFilters) => pool(x) && inSet(x, sets) && matchesContactFilters(x, g);
  const on = pickOn(f);
  const picks = Object.fromEntries(PICKS26.map((p) => {
    const g = on === p.key ? f : applyPick(f, p.key);
    return [p.key, all.reduce((n, x) => n + (inView(x, g) ? 1 : 0), 0)];
  })) as Record<Pick26Key, number>;

  const where = Object.fromEntries(SET_ORDER.map((k) => [k, 0])) as Record<SetKey, number>;
  for (const x of all) if (pool(x) && matchesContactFilters(x, f)) where[x.stand] += 1;

  /* the genre list: every key on file, its label and its total (for the order); then its faceted count */
  const totals = new Map<string, { label: string; total: number; n: number }>();
  for (const x of all) {
    const seen = new Set<string>();
    for (const raw of x.genres) {
      const k = genreKey(raw);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const t = totals.get(k);
      if (t) t.total += 1; else totals.set(k, { label: genreLabel(k, raw), total: 1, n: 0 });
    }
  }
  for (const x of all) {
    if (!(pool(x) && inSet(x, sets) && matchesContactFilters(x, f, "genres"))) continue;
    for (const k of new Set(x.genres.map(genreKey))) { const t = totals.get(k); if (t) t.n += 1; }
  }
  const genres = [...totals.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[1].label.localeCompare(b[1].label))
    .map(([key, t]) => ({ key, label: t.label, n: t.n, on: f.genres.includes(key) }));

  const open = all.reduce((n, x) => n + (pool(x) && inSet(x, sets) && matchesContactFilters(x, f, "open") && isOpenNow(x) ? 1 : 0), 0);
  return { picks, where, genres, open };
}

/** a genre pressed in the rail: added or taken out, "any" of them, exactly as the v26 Filters menu writes it */
export const toggleGenre = (f: ContactFilters, k: string): ContactFilters =>
  ({ ...f, genres: f.genres.includes(k) ? f.genres.filter((g) => g !== k) : [...f.genres, k], genreMode: "any" });

/** "Open to queries only": on is `open: "open"`, off is `"either"` (the menu's own switch) */
export const toggleOpen = (f: ContactFilters): ContactFilters => ({ ...f, open: f.open === "open" ? "either" : "open" });

/** the foot: "41 showing", or "12 of 41 showing" when anything narrows the list */
export const railShowing = (showing: number, total: number, narrowed: boolean): string =>
  (narrowed || showing !== total ? `${showing} of ${total} showing` : `${showing} showing`);
export const railExport = (n: number): string => `Export ${n} ${n === 1 ? "agent" : "agents"}`;

export { applyPick, pickOn };
