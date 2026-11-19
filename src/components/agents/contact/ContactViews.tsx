/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * List filters v1 Phase 3 (design-refs/list-filters-v1/) — THE AGENTS LIST'S FILTER PANEL, in the filter column. The card
 * is the shared shell/FilterPanel; this file says what the Agents list's sections, counts and writes are. Agent filters
 * only:
 *
 *   Who to query next       a wide tile, Ready to query (`queried: "no"` + `open: "open"`, lib/contactV27 toggleReady),
 *                           then Always reply (`always`) and Missing details (`missing`), each its own on/off
 *   Have you queried them?  a split: not yet queried | queried (`queried`)
 *   Are they open?          a split: open to queries | closed for now (`open`); under it, "{n} not known" while any
 *                           agent's door is not known (`open: "unknown"`)
 *   What they want          genres as pills: the book's first (a tick), then by count, then A to Z; six, plus any on,
 *                           then "+{n} more", which shows every genre with a "Find a genre" field and "Show fewer"
 *   foot                    "All {N} agents. {x} not yet queried." / "Showing {n} of {N} agents."
 *
 * ⚠️ A PRESENTATION OF THE PAGE'S ONE FILTER STATE: every control writes `ContactFilters` through `onFilters` with
 *    lib/contactV27's writers, and every count is lib/contactV27 `railCounts` (the list's own predicate, faceted).
 * ⚠️ READY TO QUERY IS THE SAME STATE AS THE TWO SPLITS' LEFT SIDES: when it is on, "not yet queried" and "open to
 *    queries" read on too. One filter state, shown twice on purpose.
 * ⚠️ NOT DRAWN, STILL HONOURED: `status`, `action`, `mats` and the set ("Where they stand"). Set from the dashboard or a
 *    link they filter, show as applied chips, and Clear all clears them. Your move and Waiting to hear back are about
 *    chasing queries: they belong to the Queries page and are not here.
 * ⚠️ NO STAGE COLOUR anywhere in this panel: none of its filters is a stage.
 * ⚠️ ITS HOOKS ARE `data-clq`, NEVER `data-qc156`: every workspace page stays mounted.
 */
import React, { useState } from "react";
import type { AgentFacts, ContactFilters } from "../../../lib/contactList";
import { emptyContactFilters, matchesContactFilters } from "../../../lib/contactList";
import { railCounts, railOn, readyOn, toggleGenre, toggleReady, READY_LABEL, type RailGenre, type Sets } from "../../../lib/contactV27";
import { FILTER_TICK, FilterPanel, FilterPills, FilterSection, FilterSplit, FilterTile, FilterTiles } from "../../shell/FilterPanel";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";

/** genres shown before "+{n} more" */
export const GENRES_SHOWN = 6;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** the foot's sentence */
export function agentsFoot(on: boolean, showing: number, total: number, notQueried: number): string {
  if (on || showing !== total) return `Showing ${showing} of ${total} ${plural(total, "agent", "agents")}.`;
  const all = `All ${total} ${plural(total, "agent", "agents")}.`;
  return notQueried > 0 ? `${all} ${notQueried} not yet queried.` : all;
}
/** the genres' order: the book's first, then railCounts' own order (how many agents carry it, highest first, then A to
 *  Z). A stable sort on the book alone, so the order never jumps as other filters change the faceted counts. */
export const orderGenres = (g: readonly RailGenre[], hit: (k: string) => boolean): RailGenre[] =>
  [...g].sort((a, b) => Number(hit(b.key)) - Number(hit(a.key)));

const FIND_I = <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>;

export interface ContactViewsProps {
  all: readonly AgentFacts[];
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  sets: Sets;
  /** Find (and any page-level pool) — every count is taken inside it */
  pool: (x: AgentFacts) => boolean;
  genreLabel: (key: string, raw: string) => string;
  /** a genre the manuscript in scope carries */
  genreHit?: (key: string) => boolean;
  showing: number;
  /** Clear all: every filter, drawn here or not, and the set */
  onReset: () => void;
  loading?: boolean;
}

export const ContactViews: React.FC<ContactViewsProps> = (p) => {
  const f = p.filters;
  const [allGenres, setAllGenres] = useState(false);
  const [gfind, setGfind] = useState("");
  const on = railOn(f, p.sets);
  const c = railCounts(p.all, f, p.sets, p.pool, p.genreLabel);
  const hit = (k: string) => !!p.genreHit?.(k);
  const ready = readyOn(f);
  const notQueried = p.all.reduce((n, x) => n + (matchesContactFilters(x, { ...emptyContactFilters(), queried: "no" }) ? 1 : 0), 0);

  const ordered = orderGenres(c.genres, hit);
  const q = gfind.trim().toLowerCase();
  const shownGenres = allGenres
    ? ordered.filter((g) => !q || g.label.toLowerCase().includes(q))
    : ordered.filter((g, i) => i < GENRES_SHOWN || g.on);
  const carries = c.genres.some((g) => hit(g.key));
  const side = (k: "queried" | "open", v: string) => () => p.onFilters({ ...f, [k]: f[k] === v ? "either" : v } as ContactFilters);

  return (
    <FilterPanel hook="data-clq" label="Filter your agents" on={on} onClear={p.onReset} loading={!!p.loading}
      foot={agentsFoot(on > 0, p.showing, p.all.length, notQueried)}>
      <FilterSection probe="next" title="Who to query next">
        <FilterTiles label="Who to query next" role="group">
          <FilterTile k="ready" n={c.ready} label={READY_LABEL} line="Open, and not yet queried" icon="plane" wide role="checkbox"
            on={ready} onPress={() => p.onFilters(toggleReady(f))} />
          <FilterTile k="always" n={c.always} label="Always reply" title={"Even when it’s a no"} icon="reply" role="checkbox"
            on={f.always} onPress={() => p.onFilters({ ...f, always: !f.always })} />
          <FilterTile k="missing" n={c.missing} label="Missing details" title="Gaps in their profile" icon="doc" role="checkbox"
            on={!!f.missing} onPress={() => p.onFilters({ ...f, missing: !f.missing })} />
        </FilterTiles>
      </FilterSection>

      <FilterSection probe="splits" title="Have you queried them?">
        <FilterSplit probe="queried" label="Have you queried them?" sides={[
          { k: "no", n: c.queried.no, words: "not yet queried", on: f.queried === "no", onPress: side("queried", "no") },
          { k: "yes", n: c.queried.yes, words: "queried", on: f.queried === "yes", onPress: side("queried", "yes") },
        ]} />
        <div className="fp-st"><b>Are they open?</b></div>
        <FilterSplit probe="open" label="Are they open?" sides={[
          { k: "open", n: c.door.open, words: "open to queries", on: f.open === "open", onPress: side("open", "open") },
          { k: "closed", n: c.door.closed, words: "closed for now", on: f.open === "closed", onPress: side("open", "closed") },
        ]} />
        {c.door.unknown > 0 || f.open === "unknown" ? (
          <div className="fp-note">
            <button type="button" className="fp-lnk" data-clq="not-known" aria-pressed={f.open === "unknown"} disabled={!!p.loading}
              onClick={side("open", "unknown")}>{c.door.unknown} not known</button>
          </div>
        ) : null}
      </FilterSection>

      <FilterSection probe="genres" title="What they want"
        aside={allGenres ? <button type="button" className="fp-lnk" data-clq="genres-fewer" onClick={() => { setAllGenres(false); setGfind(""); }}>Show fewer</button> : null}>
        {allGenres ? (
          <label className="fp-find" data-clq="genre-find">
            {FIND_I}
            <input value={gfind} onChange={(e) => setGfind(e.target.value)} placeholder="Find a genre" aria-label="Find a genre" autoComplete="off" />
          </label>
        ) : null}
        {c.genres.length === 0 ? <span className="fp-none" data-clq="genres-none">No genres on file yet</span> : (
          <FilterPills probe="genre" label="What they want"
            items={shownGenres.map((g) => ({ k: g.key, label: g.label, n: g.n, on: g.on, tick: hit(g.key), onToggle: () => p.onFilters(toggleGenre(f, g.key)) }))}
            more={allGenres ? null : { n: ordered.length - shownGenres.length, onPress: () => setAllGenres(true) }} />
        )}
        {carries ? <p className="fp-note" data-clq="book-key">{FILTER_TICK}Genres your book carries</p> : null}
      </FilterSection>
    </FilterPanel>
  );
};
