/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.2 · Phase 4 — THE AGENTS LIST'S FILTER PANEL, REVAMPED (design-refs/contact-list-rows-v1-2, the
 * "Revamped" panel). The card is still the shared shell/FilterPanel (its navy head, the card, the foot); this file says
 * what the Agents list's sections, counts and writes are:
 *
 *   Your list            a boxed segment: All · Queried · Not yet, each with its count above its word   (`queried`)
 *   Open to queries?     a boxed segment: Either · Open · Closed                                         (`open`)
 *   Fit  your rating     pills ★★★★★ · ★★★★ and up · Not rated; single choice, the chosen one clears    (`fit`)
 *   Replies              pills Always replies · No response means no · Reply time known; single choice (`reply`)
 *   Genres sought        pills, several allowed (any match); the book's first with a small navy tick; six, then
 *                        "+n more" / "Show fewer"; under them "{n} agents have no genres yet"            (`genres`)
 *   Outside the UK       a full-width toggle row at the foot, with its count                            (`abroad`)
 *   Missing details      a full-width toggle row at the foot, with its count                            (`missing`)
 *   foot                 "All {n} agents." / "Showing {x} of {n} agents."
 *
 * ⚠️ ONE FILTER STATE: every control writes `ContactFilters` through `onFilters`; every count is lib/contactPanel
 *    `panelCounts` — FACETED (each option: what it would show given every other section's choice). An option at 0 is
 *    disabled unless it is the current choice. Replaced: "Who to query next" (Ready to query, Always reply), "Have you
 *    queried them?", "Are they open?" and "What they want".
 * ⚠️ NOT DRAWN, STILL HONOURED: `status`, `action`, `mats`, `always` and the set. Set from a link they filter, show as
 *    applied chips, and Clear all clears them.
 * ⚠️ ITS HOOKS ARE `data-clq`, NEVER `data-qc156`: every workspace page stays mounted. Sections `data-clq-sec`, options
 *    `data-clq-opt` with their count in `data-n`.
 */
import React, { useState } from "react";
import type { AgentFacts, ContactFilters, FitChoice, ReplyChoice } from "../../../lib/contactList";
import { panelCounts, panelFoot } from "../../../lib/contactPanel";
import { railOn, toggleGenre, type Sets } from "../../../lib/contactV27";
import { FILTER_TICK, FilterPanel } from "../../shell/FilterPanel";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";
import "./contactPanel.css";

/** genres shown before "+{n} more" */
export const GENRES_SHOWN = 6;
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
  <section className="fp-sec clr-fs" data-clq-sec={k} aria-label={title}>
    <h4 className="clr-fh"><span>{title}</span>{aside ? <small>{aside}</small> : null}</h4>
    {children}
  </section>
);

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
  const stars = (n: number) => <span className="clr-st" aria-hidden="true">{"★".repeat(n)}</span>;

  return (
    <FilterPanel hook="data-clq" label="Filter your agents" on={on} onClear={p.onReset} loading={loading}
      foot={panelFoot(on > 0, c.showing, c.total)}>
      <Section k="list" title="Your list">
        <Segment label="Your list" loading={loading} opts={[
          { k: "list:all", label: "All", n: c.list.all, on: f.queried === "either", press: () => set({ queried: "either" }) },
          { k: "list:queried", label: "Queried", n: c.list.queried, on: f.queried === "yes", press: () => set({ queried: "yes" }) },
          { k: "list:none", label: "Not yet", n: c.list.none, on: f.queried === "no", press: () => set({ queried: "no" }) },
        ]} />
      </Section>

      <Section k="door" title="Open to queries?">
        <Segment label="Open to queries?" loading={loading} opts={[
          { k: "door:any", label: "Either", n: c.door.any, on: f.open === "either" || f.open === "unknown", press: () => set({ open: "either" }) },
          { k: "door:open", label: "Open", n: c.door.open, on: f.open === "open", press: () => set({ open: "open" }) },
          { k: "door:closed", label: "Closed", n: c.door.closed, on: f.open === "closed", press: () => set({ open: "closed" }) },
        ]} />
      </Section>

      <Section k="fit" title="Fit" aside="your rating">
        <Pills label="Fit, your rating" loading={loading} opts={([5, 4, 0] as const).map((v) => ({
          k: `fit:${v}`, n: c.fit[v], on: fitNow === v, press: () => set({ fit: fitNow === v ? null : v }),
          label: v === 5 ? stars(5) : v === 4 ? <>{stars(4)}<span>and up</span></> : "Not rated",
          aria: v === 5 ? "Five stars" : v === 4 ? "Four stars and up" : "Not rated",
        }))} />
      </Section>

      <Section k="reply" title="Replies">
        <Pills label="Replies" loading={loading} opts={([["always", "Always replies"], ["nrmn", "No response means no"], ["known", "Reply time known"]] as const).map(([v, w]) => ({
          k: `reply:${v}`, label: w, n: c.reply[v], on: replyNow === v, press: () => set({ reply: replyNow === v ? "any" : v }),
        }))} />
      </Section>

      <Section k="genres" title="Genres sought">
        {c.genres.length === 0 ? <p className="clr-fnote" data-clq="genres-none">No genres on file yet.</p> : (
          <Pills label="Genres sought" loading={loading} opts={shownGenres.map((g) => ({
            k: `genre:${g.key}`, n: g.n, on: g.on, press: () => p.onFilters(toggleGenre(f, g.key)),
            label: <>{hit(g.key) ? <span className="clr-tick" title="Your book">{FILTER_TICK}</span> : null}{g.label}</>,
          }))} />
        )}
        {ordered.length > GENRES_SHOWN ? (
          <button type="button" className="clr-fmore" data-clq="genres-more" aria-expanded={allGenres} onClick={() => setAllGenres((v) => !v)}>
            {allGenres ? "Show fewer" : `+${ordered.length - shownGenres.length} more`}
          </button>
        ) : null}
        {c.noGenres > 0 ? <p className="clr-fnote" data-clq="no-genres">{c.noGenres} {c.noGenres === 1 ? "agent has" : "agents have"} no genres yet.</p> : null}
      </Section>

      {/* the foot's two toggles, full width, each with its count */}
      {([["abroad", "Outside the UK", c.abroad, !!f.abroad, () => set({ abroad: !f.abroad })],
        ["missing", "Missing details", c.missing, !!f.missing, () => set({ missing: !f.missing })]] as const).map(([k, w, n, isOn, press]) => (
        <button key={k} type="button" className={`clr-frow${isOn ? " on" : ""}`} data-clq-sec={k} data-clq-opt={k} data-n={n} aria-pressed={isOn}
          disabled={loading || (n === 0 && !isOn)} onClick={press}>
          <b>{n}</b><span>{w}</span><i aria-hidden="true">{isOn ? "✕" : "›"}</i>
        </button>
      ))}
    </FilterPanel>
  );
};
