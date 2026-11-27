/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.2 · Phase 4, COMPACTED by v1.2.1 · Phase 3 — THE AGENTS LIST'S FILTER PANEL (design-refs/
 * contact-list-rows-v1-2-1, "panel-compact"). It fits a 1440×900 laptop window without scrolling inside itself. The card
 * is still the shared shell/FilterPanel (its navy head and Clear all); this file says what the Agents list's sections,
 * counts and writes are:
 *
 *   head                 "Filter"; while a filter is on, a quiet "{x} of {n}" beside it, and Clear all. No foot line.
 *   Your list            one section, two boxed segments (each count beside its word): All · Queried · Not yet
 *                        (`queried`), then Either · Open · Closed (`open`)
 *   Fit  your rating     pills 5★ · 4★+ · Not rated; single choice, the chosen one clears                (`fit`)
 *   Replies              pills Always replies · No response means no · Reply time known; single choice (`reply`)
 *   Genres sought        four pills (the book's first, with a small navy tick), several allowed (any match), then
 *                        "+n more" (an outline pill), then "No genres yet" (`noGenres`) — which clears the genre picks,
 *                        and a genre pick clears it
 *   (last)               "Outside the UK", a pill                                                         (`abroad`)
 *
 * "Missing details" left the panel (List health's Fill the gaps does that job); the `missing` filter is still honoured
 * from a link and cleared by Clear all.
 * ⚠️ ONE FILTER STATE: every control writes `ContactFilters` through `onFilters`; every count is lib/contactPanel
 *    `panelCounts` — FACETED (each option: what it would show given every other section's choice). An option at 0 is
 *    disabled unless it is the current choice. Replaced: "Who to query next" (Ready to query, Always reply), "Have you
 *    queried them?", "Are they open?" and "What they want".
 * ⚠️ NOT DRAWN, STILL HONOURED: `status`, `action`, `mats`, `always` and the set. Set from a link they filter, show as
 *    applied chips, and Clear all clears them.
 * ⚠️ ITS HOOKS ARE `data-clq`, NEVER `data-qc156`: every workspace page stays mounted. Sections `data-clq-sec`, options
 *    `data-clq-opt` with their count in `data-n`.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AgentFacts, ContactFilters, FitChoice, ReplyChoice } from "../../../lib/contactList";
import { panelCounts, panelSummary } from "../../../lib/contactPanel";
import { railOn, toggleGenre, type Sets } from "../../../lib/contactV27";
import { FILTER_TICK, FilterPanel } from "../../shell/FilterPanel";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";
import "./contactPanel.css";

/** genres shown before "+{n} more" */
export const GENRES_SHOWN = 4;
/** the genres' order: the book's first, then by how many agents carry it, then A to Z (a stable order: it never jumps as
 *  the faceted counts change) */
export const orderGenres = <G extends { key: string }>(g: readonly G[], hit: (k: string) => boolean): G[] =>
  [...g].sort((a, b) => Number(hit(b.key)) - Number(hit(a.key)));

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

interface Opt { k: string; label: React.ReactNode; n: number; on: boolean; press: () => void; aria?: string }
const disabledAt0 = (o: Opt, loading: boolean) => loading || (o.n === 0 && !o.on);

/** a boxed segment: the selected one navy with cream text; each its count above its word */
const Segment: React.FC<{ label: string; opts: Opt[]; loading: boolean }> = ({ label, opts, loading }) => (
  <div className="clr-seg" role="radiogroup" aria-label={label}>
    {opts.map((o) => (
      <button key={o.k} type="button" role="radio" aria-checked={o.on} className={o.on ? "on" : undefined} data-clq-opt={o.k} data-n={o.n}
        disabled={disabledAt0(o, loading)} onClick={o.press}>
        <b>{o.n}</b><span>{o.label}</span>
      </button>
    ))}
  </div>
);
/** filter pills: 32 high, navy when chosen; the count after the words */
const Pills: React.FC<{ label: string; opts: Opt[]; loading: boolean }> = ({ label, opts, loading }) => (
  <div className="clr-chips" role="group" aria-label={label}>
    {opts.map((o) => (
      <button key={o.k} type="button" aria-pressed={o.on} className={`clr-chip${o.on ? " on" : ""}`} data-clq-opt={o.k} data-n={o.n}
        aria-label={o.aria} disabled={disabledAt0(o, loading)} onClick={o.press}>
        {o.label}<em>{o.n}</em>
      </button>
    ))}
  </div>
);
const Section: React.FC<{ k: string; title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ k, title, aside, children }) => (
  <section className="fp-sec clr-fs" data-clq-sec={k} aria-label={title || undefined}>
    {title ? <h4 className="clr-fh"><span>{title}</span>{aside ? <small>{aside}</small> : null}</h4> : null}
    {children}
  </section>
);

/** v1.2.1 — the head's summary ("{x} of {n}"), placed beside "Filter" in the shared shell's head through a portal (the shell is
 *  reused as it is: it draws "Filter" and Clear all; this page adds its summary there) */
const HeadSummary: React.FC<{ text: string | null }> = ({ text }) => {
  const probe = useRef<HTMLSpanElement>(null);
  const [head, setHead] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setHead(probe.current?.closest(".fp")?.querySelector<HTMLElement>(":scope > .fp-hd") ?? null); }, []);
  return (
    <>
      <span ref={probe} hidden />
      {head && text ? createPortal(<small className="clr-sum" data-clq="summary" aria-live="polite">{text}</small>, head) : null}
    </>
  );
};

export const ContactViews: React.FC<ContactViewsProps> = (p) => {
  const f = p.filters;
  const loading = !!p.loading;
  const [allGenres, setAllGenres] = useState(false);
  const on = railOn(f, p.sets);
  const c = panelCounts(p.all, f, p.sets, p.pool, p.genreLabel);
  const hit = (k: string) => !!p.genreHit?.(k);
  const set = (patch: Partial<ContactFilters>) => p.onFilters({ ...f, ...patch });
  const fitNow: FitChoice = f.fit ?? null;
  const replyNow: ReplyChoice = f.reply ?? "any";

  const ordered = orderGenres(c.genres, hit);
  const shownGenres = allGenres ? ordered : ordered.filter((g, i) => i < GENRES_SHOWN || g.on);

  return (
    /* v1.2.1 — no foot line: the summary sits beside the title while a filter is on */
    <FilterPanel hook="data-clq" label="Filter your agents" on={on} onClear={p.onReset} loading={loading} foot={null}>
      <HeadSummary text={loading ? null : panelSummary(on > 0, c.showing, c.total)} />
      {/* YOUR LIST: one section holding both segments — who you've queried, and who is open */}
      <Section k="list" title="Your list">
        <Segment label="Your list" loading={loading} opts={[
          { k: "list:all", label: "All", n: c.list.all, on: f.queried === "either", press: () => set({ queried: "either" }) },
          { k: "list:queried", label: "Queried", n: c.list.queried, on: f.queried === "yes", press: () => set({ queried: "yes" }) },
          { k: "list:none", label: "Not yet", n: c.list.none, on: f.queried === "no", press: () => set({ queried: "no" }) },
        ]} />
        <Segment label="Open to queries?" loading={loading} opts={[
          { k: "door:any", label: "Either", n: c.door.any, on: f.open === "either" || f.open === "unknown", press: () => set({ open: "either" }) },
          { k: "door:open", label: "Open", n: c.door.open, on: f.open === "open", press: () => set({ open: "open" }) },
          { k: "door:closed", label: "Closed", n: c.door.closed, on: f.open === "closed", press: () => set({ open: "closed" }) },
        ]} />
      </Section>

      <Section k="fit" title="Fit" aside="your rating">
        <Pills label="Fit, your rating" loading={loading} opts={([5, 4, 0] as const).map((v) => ({
          k: `fit:${v}`, n: c.fit[v], on: fitNow === v, press: () => set({ fit: fitNow === v ? null : v }),
          label: v === 5 ? "5★" : v === 4 ? "4★+" : "Not rated",
          aria: v === 5 ? "Five stars" : v === 4 ? "Four stars and up" : "Not rated",
        }))} />
      </Section>

      <Section k="reply" title="Replies">
        <Pills label="Replies" loading={loading} opts={([["always", "Always replies"], ["nrmn", "No response means no"], ["known", "Reply time known"]] as const).map(([v, w]) => ({
          k: `reply:${v}`, label: w, n: c.reply[v], on: replyNow === v, press: () => set({ reply: replyNow === v ? "any" : v }),
        }))} />
      </Section>

      {/* GENRES SOUGHT: four, then "+n more" (an outline pill), then "No genres yet" — which clears the genre picks, and a
          genre pick clears it */}
      <Section k="genres" title="Genres sought">
        <div className="clr-chips" role="group" aria-label="Genres sought">
          {shownGenres.map((g) => (
            <button key={g.key} type="button" aria-pressed={g.on} className={`clr-chip${g.on ? " on" : ""}`} data-clq-opt={`genre:${g.key}`} data-n={g.n}
              disabled={loading || (g.n === 0 && !g.on)} onClick={() => p.onFilters({ ...toggleGenre(f, g.key), noGenres: false })}>
              {hit(g.key) ? <span className="clr-tick" title="Your book">{FILTER_TICK}</span> : null}{g.label}<em>{g.n}</em>
            </button>
          ))}
          {ordered.length > GENRES_SHOWN ? (
            <button type="button" className="clr-chip clr-chip--more" data-clq="genres-more" aria-expanded={allGenres} onClick={() => setAllGenres((v) => !v)}>
              {allGenres ? "Fewer" : `+${ordered.length - shownGenres.length} more`}
            </button>
          ) : null}
          {c.noGenres > 0 || f.noGenres ? (
            <button type="button" aria-pressed={!!f.noGenres} className={`clr-chip${f.noGenres ? " on" : ""}`} data-clq-opt="nogenres" data-n={c.noGenres}
              disabled={loading || (c.noGenres === 0 && !f.noGenres)} onClick={() => set({ noGenres: !f.noGenres, genres: [] })}>
              No genres yet<em>{c.noGenres}</em>
            </button>
          ) : null}
        </div>
      </Section>

      {/* the last section: Outside the UK, a pill ("Missing details" left the panel: List health's Fill the gaps does that job) */}
      <Section k="abroad" title="">
        <Pills label="Where they are" loading={loading} opts={[
          { k: "abroad", label: "Outside the UK", n: c.abroad, on: !!f.abroad, press: () => set({ abroad: !f.abroad }) },
        ]} />
      </Section>
    </FilterPanel>
  );
};
