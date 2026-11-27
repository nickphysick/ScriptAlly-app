/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.3 · Phase 2 — THE AGENTS LIST'S SMART FILTER PANEL (design-refs/contact-list-rows-v1-3, "v4.18").
 * The card is the shared shell/FilterPanel (its navy head and Clear all), reused unchanged; this file says what the Agents
 * list's sections, counts and writes are, top to bottom:
 *
 *   head            "Filter"; while a filter is on, "{x} of {n}" beside it, and Clear all
 *   pairs           Queried · Not queried; Open · Closed (count before word; neither chosen at rest)
 *   Minimum fit     five stars: star k is fit ≥ k, the chosen star again clears; "Not rated {n}" adds the unrated, disabled
 *                   until a minimum is set. Fit is the writer's own starRating, never derived from genres.
 *   Genres sought   the four genres most carried on this list (the book's first, ticked) — their order FIXED once the panel
 *                   opens; a genre picked from search joins after them. "Find another genre": the matches open INLINE in
 *                   the panel (never a popover), at most 168 high, then scrolling; ↑ ↓ Enter Esc, Backspace on an empty
 *                   field removes the last pick
 *   Reply time      a two-handle range 1–16+ weeks (handles never cross; keyboard too); "Not known {n}", disabled until a
 *                   range is set, ON from the moment one is
 *   Location        a dropdown: "Anywhere", or the picked countries; its list opens inline below the row: every country with
 *                   an agent on this list (tickbox, flag, name, count), by count then name, rows 28, growing to five then
 *                   scrolling inside itself. Replaces "Outside {home}".
 *   pairs           Always reply · Not always; Full profile · Has gaps (List health's own gap rule: `lhGaps`)
 *
 * ⚠️ ONE FILTER STATE: every control writes `ContactFilters` through `onFilters`; every count is lib/contactPanel
 *    `panelCounts`, FACETED. A chosen option clicked again clears it.
 * ⚠️ NOT DRAWN, STILL HONOURED: `status`, `action`, `mats`, `always`, `missing` and the set: from a link they filter, show
 *    as applied chips, and Clear all clears them.
 * ⚠️ HEIGHT: the panel grows with its content (Location or the genre matches open) up to the room below its sticky top,
 *    then scrolls inside itself (overscroll contained). It never cuts anything off.
 * ⚠️ ITS HOOKS ARE `data-clq`: sections `data-clq-sec`, options `data-clq-opt` with their count in `data-n`.

 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AgentFacts, ContactFilters } from "../../../lib/contactList";
import { RT_MAX, RT_MIN, rtWords } from "../../../lib/contactList";
import { panelCounts, panelSummary } from "../../../lib/contactPanel";
import { railOn, toggleGenre, type Sets } from "../../../lib/contactV27";
import { FILTER_TICK, FilterPanel } from "../../shell/FilterPanel";
import { flagFor } from "../../../lib/territory";
import "flag-icons/css/flag-icons.min.css";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";
import "./contactPanel.css";

/** the quick genre pills */
export const GENRES_SHOWN = 4;
/** the genres' order: the book's first, then by how many agents carry it, then A to Z */
export const orderGenres = <G extends { key: string }>(g: readonly G[], hit: (k: string) => boolean): G[] =>
  [...g].sort((a, b) => Number(hit(b.key)) - Number(hit(a.key)));
/** the suggestion list's height before it scrolls */
export const SUGS_MAX = 168;

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

/** the summary beside "Filter", put into the shared shell's head through a portal (the shell is reused unchanged) */
const HeadSummary: React.FC<{ text: string | null }> = ({ text }) => {
  const probe = useRef<HTMLSpanElement>(null);
  const [head, setHead] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setHead(probe.current?.closest(".fp")?.querySelector<HTMLElement>(":scope > .fp-hd") ?? null); }, []);
  return (<><span ref={probe} hidden />{head && text ? createPortal(<small className="clr-sum" data-clq="summary" aria-live="polite">{text}</small>, head) : null}</>);
};

interface PairOpt { k: string; label: string; n: number; on: boolean; press: () => void }
/** a beige pair of two toggles, count before word; a chosen one pressed again clears it */
const Pair: React.FC<{ label: string; opts: [PairOpt, PairOpt]; loading: boolean }> = ({ label, opts, loading }) => (
  <div className="clr-pair" role="group" aria-label={label}>
    {opts.map((o) => (
      <button key={o.k} type="button" aria-pressed={o.on} className={o.on ? "on" : undefined} data-clq-opt={o.k} data-n={o.n}
        disabled={loading || (o.n === 0 && !o.on)} onClick={o.press}><b>{o.n}</b>{o.label}</button>
    ))}
  </div>
);
/** an include pill: off white with a faint "+", on pale slate with a navy tick; disabled until its range is set */
const Include: React.FC<{ k: string; label: string; n: number; on: boolean; disabled: boolean; press: () => void }> = ({ k, label, n, on, disabled, press }) => (
  <button type="button" className={`clr-inc${on ? " on" : ""}`} data-clq-opt={k} data-n={n} aria-pressed={on} disabled={disabled} onClick={press}>
    <i aria-hidden="true">{on ? "✓" : "+"}</i>{label}<em>{n}</em>
  </button>
);
const Head: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="clr-fh"><b>{title}</b>{children}</div>
);
/** the typed letters, marked */
const marked = (label: string, term: string): React.ReactNode => {
  const t = term.trim();
  const i = t ? label.toLowerCase().indexOf(t.toLowerCase()) : -1;
  return i < 0 ? label : <>{label.slice(0, i)}<mark>{label.slice(i, i + t.length)}</mark>{label.slice(i + t.length)}</>;
};

export const ContactViews: React.FC<ContactViewsProps> = (p) => {
  const f = p.filters;
  const loading = !!p.loading;
  const on = railOn(f, p.sets);
  const c = panelCounts(p.all, f, p.sets, p.pool, p.genreLabel);
  const hit = (k: string) => !!p.genreHit?.(k);
  const set = (patch: Partial<ContactFilters>) => p.onFilters({ ...f, ...patch });

  /* Genres: the four quick pills, FIXED once the panel opens (the first time the list has agents) */
  const [quick, setQuick] = useState<string[] | null>(null);
  const ordered = orderGenres(c.genres, hit);
  useEffect(() => { if (quick === null && p.all.length > 0) setQuick(ordered.slice(0, GENRES_SHOWN).map((g) => g.key)); }, [quick, p.all.length, ordered]);
  const byKey = useMemo(() => new Map(c.genres.map((g) => [g.key, g])), [c.genres]);
  const pillKeys = [...(quick ?? ordered.slice(0, GENRES_SHOWN).map((g) => g.key))];
  for (const k of f.genres) if (!pillKeys.includes(k)) pillKeys.push(k);
  const [term, setTerm] = useState("");
  const [sugOpen, setSugOpen] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);
  const sugRef = useRef<HTMLDivElement>(null);
  const sugs = term.trim() ? ordered.filter((g) => !f.genres.includes(g.key) && g.n > 0 && g.label.toLowerCase().includes(term.trim().toLowerCase())) : [];
  const pick = (k: string) => { p.onFilters(toggleGenre(f, k)); setTerm(""); setSugOpen(false); findRef.current?.focus(); };

  /* Reply time: the range, and the handle being moved */
  const rt: [number, number] = f.rt ?? [RT_MIN, RT_MAX];
  const setRt = (i: 0 | 1, v: number) => {
    const next: [number, number] = [...rt] as [number, number];
    next[i] = i === 0 ? Math.min(v, rt[1]) : Math.max(v, rt[0]);
    const off = next[0] === RT_MIN && next[1] === RT_MAX;
    /* a range is on once either handle leaves its end; Not known starts ON the moment it is */
    set({ rt: off ? null : next, rtUnknown: off ? true : f.rt ? f.rtUnknown !== false : true });
  };
  const pct = (v: number) => `${((v - RT_MIN) / (RT_MAX - RT_MIN)) * 100}%`;

  /* Location */
  const [locOpen, setLocOpen] = useState(false);
  const picked = f.countries ?? [];
  const locWords = picked.length === 0 ? "Anywhere" : null;
  useEffect(() => {
    if (!locOpen && !sugOpen) return undefined;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setLocOpen(false); setSugOpen(false); } };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [locOpen, sugOpen]);
  const flag = (code: string) => { const cl = flagFor(code); return cl ? <span className={`clr-flg ${cl}`} data-clq="flag" aria-hidden="true" /> : null; };

  return (
    <FilterPanel hook="data-clq" label="Filter your agents" on={on} onClear={p.onReset} loading={loading} foot={null}>
      <HeadSummary text={loading ? null : panelSummary(on > 0, c.showing, c.total)} />
      <section className="clr-fq" data-clq-sec="pairs" aria-label="Queried and open">
        <Pair label="Queried" loading={loading} opts={[
          { k: "queried:yes", label: "Queried", n: c.queried.yes, on: f.queried === "yes", press: () => set({ queried: f.queried === "yes" ? "either" : "yes" }) },
          { k: "queried:no", label: "Not queried", n: c.queried.no, on: f.queried === "no", press: () => set({ queried: f.queried === "no" ? "either" : "no" }) },
        ]} />
        <Pair label="Open to queries" loading={loading} opts={[
          { k: "door:open", label: "Open", n: c.door.open, on: f.open === "open", press: () => set({ open: f.open === "open" ? "either" : "open" }) },
          { k: "door:closed", label: "Closed", n: c.door.closed, on: f.open === "closed", press: () => set({ open: f.open === "closed" ? "either" : "closed" }) },
        ]} />
      </section>

      <section className="clr-fs" data-clq-sec="fit" aria-label="Minimum fit">
        <Head title="Minimum fit"><span data-clq="fit-sum">{f.fitMin ? `${f.fitMin}★ and up · ${c.showing}` : "Any"}</span></Head>
        <div className="clr-fitrow">
          <span className="clr-stars" role="radiogroup" aria-label="Minimum fit">
            {([1, 2, 3, 4, 5] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={f.fitMin === k} className={f.fitMin && k <= f.fitMin ? "on" : undefined}
                data-clq-opt={`fit:${k}`} data-n={c.fit[k]} aria-label={`At least ${k} of 5`} disabled={loading}
                onClick={() => set(f.fitMin === k ? { fitMin: null, fitUnrated: false } : { fitMin: k })}>★</button>
            ))}
          </span>
          <Include k="fit:unrated" label="Not rated" n={c.unrated} on={!!f.fitUnrated && f.fitMin != null} disabled={loading || f.fitMin == null}
            press={() => set({ fitUnrated: !f.fitUnrated })} />
        </div>
      </section>

      <section className="clr-fs" data-clq-sec="genres" aria-label="Genres sought">
        <Head title="Genres sought" />
        <div className="clr-gpills" role="group" aria-label="Genres sought">
          {pillKeys.map((k) => {
            const g = byKey.get(k); if (!g) return null;
            return (
              <button key={k} type="button" aria-pressed={g.on} className={`clr-chip${g.on ? " on" : ""}`} data-clq-opt={`genre:${k}`} data-label={g.label} data-n={g.n}
                disabled={loading || (g.n === 0 && !g.on)} onClick={() => p.onFilters(toggleGenre(f, k))}>
                {hit(k) ? <span className="clr-tick" title="Your book">{FILTER_TICK}</span> : null}{g.label}<em>{g.n}</em>
              </button>
            );
          })}
        </div>
        <label className="clr-gfind" data-clq="genre-find">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" /></svg>
          <input ref={findRef} value={term} placeholder="Find another genre" aria-label="Find another genre" autoComplete="off" disabled={loading}
            role="combobox" aria-expanded={sugOpen && !!term.trim()} aria-controls="clr-gsugs"
            onChange={(e) => { setTerm(e.target.value); setSugOpen(!!e.target.value.trim()); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && sugs.length) { e.preventDefault(); sugRef.current?.querySelector<HTMLElement>("button")?.focus(); }
              else if (e.key === "Enter" && sugs.length) { e.preventDefault(); pick(sugs[0].key); }
              else if (e.key === "Escape") { setSugOpen(false); }
              else if (e.key === "Backspace" && !term && f.genres.length) { e.preventDefault(); p.onFilters(toggleGenre(f, f.genres[f.genres.length - 1])); }
            }} />
        </label>
        {sugOpen && term.trim() ? (
          <div ref={sugRef} id="clr-gsugs" className="clr-sugs" data-clq="genre-sugs" role="listbox" aria-label="Matching genres" style={{ maxHeight: SUGS_MAX }}
            onKeyDown={(e) => {
              const items = [...(sugRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
              const i = items.indexOf(document.activeElement as HTMLElement);
              if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] ?? items[i])?.focus(); }
              else if (e.key === "ArrowUp") { e.preventDefault(); if (i <= 0) findRef.current?.focus(); else items[i - 1].focus(); }
              else if (e.key === "Escape") { e.preventDefault(); setSugOpen(false); findRef.current?.focus(); }
            }}>
            {sugs.length ? sugs.map((g) => (
              <button key={g.key} type="button" role="option" aria-selected="false" className="clr-sug" data-clq="genre-sug" onClick={() => pick(g.key)}>
                {hit(g.key) ? <span className="clr-tick" title="Your book">{FILTER_TICK}</span> : null}<span>{marked(g.label, term)}</span><em>{g.n}</em>
              </button>
            )) : <p className="clr-sug-none">No agent on your list seeks “{term.trim()}”.</p>}
          </div>
        ) : null}
      </section>

      <section className="clr-fs" data-clq-sec="reply" aria-label="Reply time">
        <Head title="Reply time">
          <Include k="rt:unknown" label="Not known" n={c.unknown} on={!!f.rt && f.rtUnknown !== false} disabled={loading || !f.rt}
            press={() => set({ rtUnknown: f.rtUnknown === false })} />
        </Head>
        <div className="clr-rtrow">
          <div className="clr-dual" style={{ ["--lo" as string]: pct(rt[0]), ["--hi" as string]: pct(rt[1]) } as React.CSSProperties}>
            <span className="clr-track" /><span className="clr-fill" />
            <input type="range" min={RT_MIN} max={RT_MAX} step={1} value={rt[0]} data-clq="rt-lo" aria-label="Shortest reply time, weeks" disabled={loading}
              onChange={(e) => setRt(0, Number(e.target.value))} />
            <input type="range" min={RT_MIN} max={RT_MAX} step={1} value={rt[1]} data-clq="rt-hi" aria-label="Longest reply time, weeks" disabled={loading}
              onChange={(e) => setRt(1, Number(e.target.value))} />
          </div>
          <span className="clr-rtv" data-clq="rt-label">{f.rt ? rtWords(f.rt) : "Any"}</span>
        </div>
      </section>

      <section className="clr-fl" data-clq-sec="loc" aria-label="Location">
        <div className="clr-fh clr-flrow">
          <b>Location</b>
          <button type="button" className={`clr-ldd${locOpen ? " open" : ""}`} data-clq="loc" aria-expanded={locOpen} aria-controls="clr-llist" disabled={loading}
            onClick={() => setLocOpen((v) => !v)}>
            <span className="clr-lsum">{locWords ?? picked.slice(0, 2).map((code, i) => (
              <React.Fragment key={code}>{i ? ", " : null}{flag(code)}{c.countries.find((x) => x.code === code)?.name ?? code}</React.Fragment>
            ))}{picked.length > 2 ? ` +${picked.length - 2}` : null}</span>
            <i aria-hidden="true">▾</i>
          </button>
        </div>
        {locOpen ? (
          <div id="clr-llist" className="clr-llist" data-clq="loc-list" role="group" aria-label="Location">
            {c.countries.map((x) => (
              <button key={x.code} type="button" role="checkbox" aria-checked={x.on} className={`clr-lrow${x.on ? " on" : ""}`} data-clq-opt={`loc:${x.code}`} data-n={x.n}
                disabled={loading || (x.n === 0 && !x.on)}
                onClick={() => set({ countries: x.on ? picked.filter((k) => k !== x.code) : [...picked, x.code] })}>
                <span className="clr-box" aria-hidden="true">{x.on ? "✓" : ""}</span>{flag(x.code)}<span className="clr-lname">{x.name}</span><em>{x.n}</em>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="clr-fq clr-fq--b" data-clq-sec="pairs2" aria-label="Replies and profile">
        <Pair label="Replies" loading={loading} opts={[
          { k: "always:yes", label: "Always reply", n: c.always.yes, on: f.alwaysReply === "yes", press: () => set({ alwaysReply: f.alwaysReply === "yes" ? "any" : "yes" }) },
          { k: "always:no", label: "Not always", n: c.always.no, on: f.alwaysReply === "no", press: () => set({ alwaysReply: f.alwaysReply === "no" ? "any" : "no" }) },
        ]} />
        <Pair label="Profile" loading={loading} opts={[
          { k: "prof:full", label: "Full profile", n: c.profile.full, on: f.profile === "full", press: () => set({ profile: f.profile === "full" ? "any" : "full" }) },
          { k: "prof:gaps", label: "Has gaps", n: c.profile.gaps, on: f.profile === "gaps", press: () => set({ profile: f.profile === "gaps" ? "any" : "gaps" }) },
        ]} />
      </section>
    </FilterPanel>
  );
};
