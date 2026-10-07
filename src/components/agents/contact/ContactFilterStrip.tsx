/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FILTER STRIP (Contact list v14 §4; ref design-refs/contact-list-v14.html `.frow .fbar`), on one line, left to
 * right: Status ⌄ (tick several, each with its count, and Clear) · Action required · Open for submissions ⌄ · Queried
 * or not ⌄ · Missing materials · Always responds · + Genre (the token field) · any | all · Clear all.
 *
 * ⚠️ THE ONE-LINE RULE IS MEASURED, NEVER A BREAKPOINT (§4). When the row would wrap, the three on/off chips fold
 * into "More filters ⌄", which counts how many of them are on; they unfold when there is room. The measure is a
 * hidden copy of the UNFOLDED row (inert, invisible, out of flow) compared with the strip's own width, re-read on
 * every resize and every change to what the row holds — so the answer follows the real labels and counts.
 *
 * ⚠️ NOTHING IS FREE-TYPED (§1.11): the genre field offers only the app's genre list (`CANONICAL_GENRES`); a string
 * that is not in it cannot be added. ↑ ↓ move, Enter adds, Backspace on an empty field removes the last token,
 * Escape clears the typing — through the ONE escape stack, so it never reaches past the field.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PopOption, PopRule, PopSection, Popover, type PopoverState } from "../../shell/ListPills";
import { CANONICAL_GENRES, matchKey } from "../../../lib/genres";
import { genreKey } from "../../../lib/genreMatch";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import {
  type ContactFilters, type facetCounts, OPEN_CHOICES, type OpenChoice, QUERIED_CHOICES, type QueriedChoice,
  STATUS_CHOICES, type StatusKey, contactFilterCount, emptyContactFilters,
} from "../../../lib/contactList";
import type { ContactPop } from "./ContactListControls";

type Counts = ReturnType<typeof facetCounts>;

export interface ContactFilterStripProps {
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  counts: Counts;
  /** "N on your list" per genre key */
  tallies: ReadonlyMap<string, number>;
  pop: PopoverState<ContactPop>;
}

const label = (id: string) => CANONICAL_GENRES.find((g) => g.id === id)?.label ?? id;

/** up to 7 genres from the app's list matching what is typed — label starts first, then contains, then aliases */
export function genreSuggestions(typed: string, chosen: readonly string[], limit = 7): { id: string; label: string }[] {
  const t = matchKey(typed);
  if (!t) return [];
  const free = CANONICAL_GENRES.filter((g) => !chosen.includes(g.id));
  const starts = free.filter((g) => matchKey(g.label).startsWith(t));
  const contains = free.filter((g) => !starts.includes(g) && matchKey(g.label).includes(t));
  const alias = free.filter((g) => !starts.includes(g) && !contains.includes(g) && g.aliases.some((a) => matchKey(a).includes(t)));
  return [...starts, ...contains, ...alias].slice(0, limit).map((g) => ({ id: g.id, label: g.label }));
}

/** the typed part in bold, inside the genre's label */
const Bolded: React.FC<{ text: string; typed: string }> = ({ text, typed }) => {
  const i = text.toLowerCase().indexOf(typed.trim().toLowerCase());
  if (!typed.trim() || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<b>{text.slice(i, i + typed.trim().length)}</b>{text.slice(i + typed.trim().length)}</>;
};

const GenreField: React.FC<{ filters: ContactFilters; onFilters: (f: ContactFilters) => void; tallies: ReadonlyMap<string, number>; inert?: boolean }> = ({ filters, onFilters, tallies, inert }) => {
  const [typed, setTyped] = useState("");
  const [hi, setHi] = useState(0);
  const sugg = useMemo(() => genreSuggestions(typed, filters.genres), [typed, filters.genres]);
  /* the list shows whenever something is typed — with the matches, or saying there are none */
  const open = !inert && typed.trim().length > 0;
  /* Escape clears the typing first — the one escape stack, at a page popover's level */
  useEscapeLayer(open, () => setTyped(""), ESC_LEVEL.page);
  const add = (id: string) => { onFilters({ ...filters, genres: [...filters.genres, genreKey(id)] }); setTyped(""); setHi(0); };
  const remove = (id: string) => onFilters({ ...filters, genres: filters.genres.filter((g) => g !== id) });
  return (
    <span className={`cl14-gtok${filters.genres.length ? " has" : ""}`} data-cl14="genres">
      {filters.genres.map((g) => (
        <span key={g} className="cl14-tk" data-cl14-tok={g}>
          {label(g)}<button type="button" aria-label={`Remove ${label(g)}`} tabIndex={inert ? -1 : 0} onClick={() => remove(g)}>{"✕"}</button>
        </span>
      ))}
      <input
        value={typed} placeholder={filters.genres.length ? "Add a genre" : "Genre"} aria-label="Filter by genre" tabIndex={inert ? -1 : 0}
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={(e) => { setTyped(e.target.value); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && open) { e.preventDefault(); setHi((h) => Math.min(sugg.length - 1, h + 1)); }
          else if (e.key === "ArrowUp" && open) { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && sugg[hi]) add(sugg[hi].id); }
          else if (e.key === "Backspace" && !typed && filters.genres.length) { e.preventDefault(); remove(filters.genres[filters.genres.length - 1]); }
        }}
      />
      {filters.genres.length >= 2 && (
        <span className="cl14-gm" role="group" aria-label="Match any or all genres" data-cl14="genre-mode">
          {(["any", "all"] as const).map((m) => (
            <button key={m} type="button" className={filters.genreMode === m ? "on" : ""} aria-pressed={filters.genreMode === m}
              tabIndex={inert ? -1 : 0} onClick={() => onFilters({ ...filters, genreMode: m })}>{m}</button>
          ))}
        </span>
      )}
      {open && (
        <div className="cl14-gs" role="listbox" data-cl14="genre-list">
          {sugg.length ? sugg.map((g, i) => (
            <button key={g.id} type="button" role="option" aria-selected={i === hi} className={`cl14-gso${i === hi ? " on" : ""}`} data-cl14-sugg={g.id}
              onMouseDown={(e) => { e.preventDefault(); add(g.id); }} onMouseEnter={() => setHi(i)}>
              <span><Bolded text={g.label} typed={typed} /></span>
              <small>{tallies.get(g.id) ?? 0} on your list</small>
            </button>
          )) : <div className="cl14-gse" data-cl14="genre-none">No genre matches {"\u201c"}{typed.trim()}{"\u201d"}</div>}
        </div>
      )}
    </span>
  );
};

const Chip: React.FC<{ k: string; on: boolean; n: number; title?: string; onToggle: () => void; inert?: boolean; children: React.ReactNode }> = ({ k, on, n, title, onToggle, inert, children }) => (
  <button type="button" className={`cl14-fp${on ? " on" : ""}`} data-cl14-chip={k} aria-pressed={on} title={title} tabIndex={inert ? -1 : 0} onClick={onToggle}>
    {on ? "✓ " : ""}{children}<em>{n}</em>
  </button>
);

/** the row, folded or not — rendered twice: once for real, once (inert, hidden) to measure the unfolded width */
const Row: React.FC<ContactFilterStripProps & { folded: boolean; inert?: boolean }> = ({ filters, onFilters, counts, tallies, pop, folded, inert }) => {
  const f = filters;
  const set = (patch: Partial<ContactFilters>) => onFilters({ ...f, ...patch });
  const mine = (k: ContactPop) => !inert && pop.open === k && pop.anchor?.closest('[data-cl14="fbar"]') != null;
  const dd = (k: ContactPop, text: React.ReactNode, on: boolean) => (
    <button type="button" className={`cl14-fp cl14-fp--dd${on ? " on" : ""}`} data-cl14-dd={k} aria-haspopup="menu" aria-expanded={mine(k)}
      tabIndex={inert ? -1 : 0} onClick={(e) => pop.toggle(k, e.currentTarget)}>
      {text}<i aria-hidden="true">{"⌄"}</i>
    </button>
  );
  const chips = [
    <Chip key="action" k="action" on={f.action} n={counts.action} inert={inert} onToggle={() => set({ action: !f.action })}>Action required</Chip>,
    <Chip key="mats" k="mats" on={f.mats} n={counts.mats} inert={inert} onToggle={() => set({ mats: !f.mats })}>Missing materials</Chip>,
    <Chip key="always" k="always" on={f.always} n={counts.always} inert={inert} title="Agents who reply even when it's a no" onToggle={() => set({ always: !f.always })}>Always responds</Chip>,
  ];
  const onChips = (f.action ? 1 : 0) + (f.mats ? 1 : 0) + (f.always ? 1 : 0);
  const openLabel = OPEN_CHOICES.find((c) => c.key === f.open)?.label ?? "Either";
  const queriedLabel = QUERIED_CHOICES.find((c) => c.key === f.queried)?.label ?? "Either";
  return (
    <>
      {dd("status", <>Status{f.status.length ? <em>{f.status.length}</em> : null}</>, f.status.length > 0)}
      {!folded && chips[0]}
      {dd("open", f.open === "either" ? "Open for submissions" : openLabel, f.open !== "either")}
      {dd("queried", f.queried === "either" ? "Queried or not" : queriedLabel, f.queried !== "either")}
      {!folded && chips[1]}
      {!folded && chips[2]}
      {folded && dd("more", <>More filters{onChips ? <em>{onChips}</em> : null}</>, onChips > 0)}
      <GenreField filters={f} onFilters={onFilters} tallies={tallies} inert={inert} />
      {contactFilterCount(f) > 0 && (
        <button type="button" className="cl14-fclear" data-cl14="clear-all" tabIndex={inert ? -1 : 0} onClick={() => onFilters(emptyContactFilters())}>Clear all</button>
      )}

      {mine("status") && (
        <Popover k="status" anchor={pop.anchor} width={280} label="Status">
          <PopSection title="Status">
            {STATUS_CHOICES.map((c) => (
              <span key={c.key} className={counts.status[c.key] === 0 ? "cl14-zero" : undefined} data-cl14-zero={counts.status[c.key] === 0 || undefined}>
                <PopOption k={`status:${c.key}`} kind="check" on={f.status.includes(c.key)} label={c.label} count={counts.status[c.key]}
                  onPick={() => set({ status: f.status.includes(c.key) ? f.status.filter((x) => x !== c.key) : [...f.status, c.key] as StatusKey[] })} />
              </span>
            ))}
          </PopSection>
          <PopRule />
          <button type="button" className="cl14-popclear" data-cl14="status-clear" onClick={() => set({ status: [] })}>Clear</button>
        </Popover>
      )}
      {mine("open") && (
        <Popover k="open" anchor={pop.anchor} width={240} label="Open for submissions">
          <PopSection title="Open for submissions">
            {OPEN_CHOICES.map((c) => (
              <PopOption key={c.key} k={`open:${c.key}`} kind="radio" on={f.open === c.key} label={c.label}
                count={c.key === "either" ? undefined : counts.open[c.key as Exclude<OpenChoice, "either">]}
                onPick={() => { set({ open: c.key }); pop.close(); }} />
            ))}
          </PopSection>
        </Popover>
      )}
      {mine("queried") && (
        <Popover k="queried" anchor={pop.anchor} width={240} label="Queried or not">
          <PopSection title="Queried or not">
            {QUERIED_CHOICES.map((c) => (
              <PopOption key={c.key} k={`queried:${c.key}`} kind="radio" on={f.queried === c.key} label={c.label}
                count={c.key === "either" ? undefined : counts.queried[c.key as Exclude<QueriedChoice, "either">]}
                onPick={() => { set({ queried: c.key }); pop.close(); }} />
            ))}
          </PopSection>
        </Popover>
      )}
      {mine("more") && (
        <Popover k="more" anchor={pop.anchor} width={260} label="More filters">
          <PopSection title="More filters">
            <PopOption k="more:action" kind="check" on={f.action} label="Action required" count={counts.action} onPick={() => set({ action: !f.action })} />
            <PopOption k="more:mats" kind="check" on={f.mats} label="Missing materials" count={counts.mats} onPick={() => set({ mats: !f.mats })} />
            <PopOption k="more:always" kind="check" on={f.always} label="Always responds" count={counts.always} onPick={() => set({ always: !f.always })} />
          </PopSection>
        </Popover>
      )}
    </>
  );
};

export const ContactFilterStrip: React.FC<ContactFilterStripProps> = (props) => {
  const barRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [folded, setFolded] = useState(false);
  /* the unfolded row's natural width against the strip's — measured, on every resize and every change */
  const measure = () => {
    const bar = barRef.current, m = measureRef.current;
    if (!bar || !m || bar.clientWidth === 0) return;
    const want = m.scrollWidth > bar.clientWidth + 0.5;
    setFolded((f) => (f === want ? f : want));
  };
  useLayoutEffect(measure);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="cl14-fwrap">
      <div className="cl14-fbar" data-cl14="fbar" data-folded={folded || undefined} ref={barRef}>
        <Row {...props} folded={folded} />
      </div>
      {/* the measurer sits in a zero-size host that clips it: its own width stays readable, but it can never widen the
          page's scroller (with the book's genres as tokens it is wider than the panel — measured, 101px of overflow) */}
      <div className="cl14-fmeasure" aria-hidden="true">
        <div className="cl14-fbar cl14-fbar--measure" ref={measureRef} inert>
          <Row {...props} folded={false} inert />
        </div>
      </div>
    </div>
  );
};
