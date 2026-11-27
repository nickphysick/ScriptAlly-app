/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.3 · Phase 2 — THE SMART FILTER PANEL'S COUNTS (design-refs/contact-list-rows-v1-3, "v4.18").
 *
 *   pairs          Queried · Not queried (`queried`), Open · Closed (`open`)
 *   Minimum fit    ★1–★5: fit ≥ k (`fitMin`); "Not rated" adds the unrated (`fitUnrated`)
 *   Genres sought  every genre on file, several allowed, any match (`genres`)
 *   Reply time     weeks [from, to] (`rt`); "Not known" adds the unknown (`rtUnknown`)
 *   Location       the countries on file (`countries`)
 *   pairs          Always reply · Not always (`alwaysReply`), Full profile · Has gaps (`profile`)
 *
 * ⚠️ FACETED: each option counts the agents it would show given every OTHER section's choice (and Find, and a set from a
 *    link), by the list's own predicate (`matchesContactFilters` with that section left out). An include pill ("Not rated",
 *    "Not known") counts the agents it would ADD: the unrated, or the unknown, under every other section.
 */
import type { AgentFacts, ContactFilters, FilterSection } from "./contactList";
import { isClosedNow, isOpenNow, isQueried, matchesContactFilters, ratingOf, weeksOf } from "./contactList";
import { genreKey } from "./genreMatch";
import { inSet } from "./contactV24";
import { countryName, normaliseCountry } from "./territory";
import type { Sets } from "./contactV27";

export interface PanelGenre { key: string; label: string; n: number; total: number; on: boolean }
export interface PanelCountry { code: string; name: string; n: number; total: number; on: boolean }
export interface PanelCounts {
  queried: { yes: number; no: number };
  door: { open: number; closed: number };
  /** agents rated at least k (k = 1…5), and the unrated */
  fit: Record<1 | 2 | 3 | 4 | 5, number>;
  unrated: number;
  genres: PanelGenre[];
  unknown: number;
  /** every country on file with at least one agent: by count on the list, then name */
  countries: PanelCountry[];
  always: { yes: number; no: number };
  profile: { full: number; gaps: number };
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
  const genres = new Map<string, PanelGenre>();
  for (const x of all) {
    const once = new Set<string>();
    for (const raw of x.genres) {
      const k = genreKey(raw);
      if (!k || once.has(k)) continue;
      once.add(k);
      const t = genres.get(k);
      if (t) t.total += 1; else genres.set(k, { key: k, label: genreLabel(k, raw), n: 0, total: 1, on: f.genres.includes(k) });
    }
  }
  for (const x of seen) {
    if (!matchesContactFilters(x, f, "genres")) continue;
    for (const k of new Set(x.genres.map(genreKey))) { const t = genres.get(k); if (t) t.n += 1; }
  }
  const countries = new Map<string, PanelCountry>();
  for (const x of all) {
    const code = normaliseCountry(x.agent.country);
    if (!code) continue;
    const t = countries.get(code);
    if (t) t.total += 1; else countries.set(code, { code, name: countryName(code) ?? code, n: 0, total: 1, on: (f.countries ?? []).includes(code) });
  }
  for (const x of seen) {
    if (!matchesContactFilters(x, f, "countries")) continue;
    const t = countries.get(normaliseCountry(x.agent.country) ?? "");
    if (t) t.n += 1;
  }
  const atLeast = (k: number) => c("fitMin", (x) => (ratingOf(x) ?? 0) >= k);
  return {
    queried: { yes: c("queried", isQueried), no: c("queried", (x) => !isQueried(x)) },
    door: { open: c("open", isOpenNow), closed: c("open", isClosedNow) },
    fit: { 1: atLeast(1), 2: atLeast(2), 3: atLeast(3), 4: atLeast(4), 5: atLeast(5) },
    unrated: c("fitMin", (x) => ratingOf(x) == null),
    genres: [...genres.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    unknown: c("rt", (x) => weeksOf(x) == null),
    countries: [...countries.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    always: { yes: c("alwaysReply", (x) => x.agent.noResponseMeansNo === false), no: c("alwaysReply", (x) => x.agent.noResponseMeansNo !== false) },
    profile: { full: c("profile", (x) => (x.lhGaps ?? 0) === 0), gaps: c("profile", (x) => (x.lhGaps ?? 0) > 0) },
    showing: c(null, () => true),
    total: all.length,
  };
}

/** the head's quiet summary beside "Filter": "{x} of {n}" while a filter is on; nothing at rest */
export const panelSummary = (on: boolean, showing: number, total: number): string | null => (on ? `${showing} of ${total}` : null);
