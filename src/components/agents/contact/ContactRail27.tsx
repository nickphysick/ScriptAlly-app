/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 (design-refs/contact-list-v27/) — THE FILTER RAIL, in the Query Centre v153.3 rail's layout and look
 * (one white card, the typewriter "Filter" heading over its navy rule, "n on", Reset, folding sections, pills, tiles, a
 * switch, the export at its foot). It renders the Query Centre's own rail classes (`qc153-*`, `qc1533-*`); `QcRail153`
 * itself is not used and does not change.
 *
 * Contact list principles v1: Where they stand and Submissions sit (in that order) behind a full-width "More filters" row
 * at the foot of the sections; Most used and Genres stay on show.
 *
 *   Most used         the four quick picks (`PICKS26`), radio, through `applyPick`
 *   Where they stand  four tiles over the page's set (`SetKey[] | null`) — the same state the applied row's chip shows
 *   Genres            every genre on file, multi-select, written as the Filters menu wrote them; a genre the book in
 *                     scope carries is powder with "✓ "
 *   Submissions       "Open to queries only"
 *   foot              "{n} showing" / "{n} of {total} showing", and the export of exactly what the list shows
 *
 * ⚠️ IT IS A PRESENTATION OF THE PAGE'S ONE FILTER STATE: every control writes through `onFilters` / `onSets`, and every
 *    count is the list's own predicate (lib/contactV27). An option at 0 that is not on fades and cannot be pressed.
 * ⚠️ ITS HOOKS ARE `data-cl27`, NEVER `data-qc153`: every workspace page stays mounted, so a Query Centre probe that
 *    counts `[data-qc153=…]` across the document would otherwise count this rail too.
 */
import React, { useEffect, useId, useState } from "react";
import type { AgentFacts, ContactFilters } from "../../../lib/contactList";
import { SET_LABEL, SET_ORDER, type SetKey } from "../../../lib/contactV24";
import { PICKS26 } from "../../../lib/contactV26";
import { applyPick, pickOn, railCounts, railExport, railOn, railShowing, toggleGenre, toggleOpen, toggleSet, type Sets } from "../../../lib/contactV27";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv1531.css";
import "./contactV27.css";
import "./contactPrinciples.css";

const CHEVRON = <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4.5 6 7.5 9 4.5" /></svg>;
/** the tile's descriptions, read as their titles */
const SET_TITLE: Record<SetKey, string> = {
  you: "Agents waiting on you", agent: "Queried, and waiting on the agent", none: "Agents you haven't queried yet", closed: "Passed, or closed with no reply",
};
type Sec = "quick" | "where" | "genres" | "subs";

export interface ContactRail27Props {
  all: readonly AgentFacts[];
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  sets: Sets;
  onSets: (s: Sets) => void;
  /** Find (and any page-level pool) — every count is taken inside it */
  pool: (x: AgentFacts) => boolean;
  genreLabel: (key: string, raw: string) => string;
  /** a genre the manuscript in scope carries */
  genreHit?: (key: string) => boolean;
  showing: number;
  /** clears everything the applied row's "Clear filters" clears */
  onReset: () => void;
  onExport: () => void;
  loading?: boolean;
}

export const ContactRail27: React.FC<ContactRail27Props> = (p) => {
  const [open, setOpen] = useState<Record<Sec, boolean>>({ quick: true, where: true, genres: true, subs: true });
  const f = p.filters;
  /* Contact list principles v1 — Where they stand and Submissions fold behind "More filters", held the way the rail holds
     its sections (this component's state, for as long as the page is mounted). A filter set in either opens it: on
     arrival, and whenever one is applied from elsewhere (the applied row, a link). Folding never clears a filter. */
  const moreApplied = !!p.sets?.length || f.open === "open";
  const [more, setMore] = useState(moreApplied);
  const moreId = useId();
  useEffect(() => { if (moreApplied) setMore(true); }, [moreApplied]);
  const on = railOn(f, p.sets);
  const counts = railCounts(p.all, f, p.sets, p.pool, p.genreLabel);
  const pick = pickOn(f);
  const loading = !!p.loading;
  const head = (k: Sec, title: string) => (
    <h3 className="qc153-rh5">
      <button type="button" aria-expanded={open[k]} data-cl27="rail-fold" data-k={k} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}>
        {title}<i aria-hidden="true">{CHEVRON}</i>
      </button>
    </h3>
  );
  return (
    <aside className="qc153-rail cl27-rail" aria-label="Filter agents" data-cl27="rail">
      <div className="qc153-rin">
        <div className="qc153-rbd" data-cl27="rail-head">
          <b>Filter</b>
          {on > 0 ? <span className="qc153-ron" data-cl27="rail-on">{on} on</span> : null}
          <button type="button" className="qc153-rst" data-cl27="rail-reset" disabled={on === 0 || loading} onClick={p.onReset}>Reset</button>
        </div>

        <section className={`qc153-rsec${open.quick ? " is-open" : ""}`} data-cl27="rail-sec" data-k="quick">
          {head("quick", "Most used")}
          {open.quick ? (
            <div className="qc153-rbody qc1533-pills" role="radiogroup" aria-label="Most used">
              {PICKS26.map((k) => {
                const isOn = pick === k.key;
                const n = counts.picks[k.key];
                return (
                  <button key={k.key} type="button" role="radio" aria-checked={isOn} className={`qc1533-pill${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                    data-cl27="pick" data-k={k.key} data-n={n} title={k.line} disabled={loading || (!isOn && n === 0)} onClick={() => p.onFilters(applyPick(f, k.key))}>
                    <span className="qc153-tx">{k.title}</span>
                    <span className="qc153-n">{n}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className={`qc153-rsec${open.genres ? " is-open" : ""}`} data-cl27="rail-sec" data-k="genres">
          {head("genres", "Genres")}
          {open.genres ? (
            <div className="qc153-rbody qc1533-pills" role="group" aria-label="Genres">
              {counts.genres.map((g) => {
                const hit = !!p.genreHit?.(g.key);
                return (
                  <button key={g.key} type="button" aria-pressed={g.on}
                    className={`qc1533-pill${g.on ? " is-on" : ""}${hit ? " is-hit" : ""}${!g.on && g.n === 0 ? " is-zero" : ""}`}
                    data-cl27="genre" data-k={g.key} data-n={g.n} data-hit={hit ? "" : undefined} disabled={loading || (!g.on && g.n === 0)}
                    onClick={() => p.onFilters(toggleGenre(f, g.key))}>
                    <span className="qc153-tx">{hit ? "✓ " : null}{g.label}</span>
                    <span className="qc153-n">{g.n}</span>
                  </button>
                );
              })}
              {counts.genres.length === 0 ? <span className="cl27-none" data-cl27="genres-none">No genres on file yet</span> : null}
            </div>
          ) : null}
        </section>

        <div id={moreId} data-clp="more-body" hidden={!more || undefined}>
          <section className={`qc153-rsec${open.where ? " is-open" : ""}`} data-cl27="rail-sec" data-k="where">
            {head("where", "Where they stand")}
            {open.where ? (
              <div className="qc153-rbody qc1533-where">
                <div className="qc153-courts" role="group" aria-label="Where they stand">
                  {SET_ORDER.map((k) => {
                    const isOn = !!p.sets?.includes(k);
                    const n = counts.where[k];
                    return (
                      <button key={k} type="button" aria-pressed={isOn} className={`qc153-court${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                        data-cl27="tile" data-k={k} data-n={n} title={SET_TITLE[k]} disabled={loading || (!isOn && n === 0)} onClick={() => p.onSets(toggleSet(p.sets, k))}>
                        <b>{n}</b><span>{SET_LABEL[k]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className={`qc153-rsec${open.subs ? " is-open" : ""}`} data-cl27="rail-sec" data-k="subs">
            {head("subs", "Submissions")}
            {open.subs ? (
              <div className="qc153-rbody">
                {(() => {
                  const isOn = f.open === "open";
                  const n = counts.open;
                  return (
                    <button type="button" role="switch" aria-checked={isOn} className={`qc153-fr qc153-fr--sw${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                      data-cl27="open-only" data-n={n} disabled={loading || (!isOn && n === 0)} onClick={() => p.onFilters(toggleOpen(f))}>
                      <span className="qc153-tx">Open to queries only</span>
                      <span className="qc153-n">{n}</span>
                      <span className="qc153-sw2" aria-hidden="true" />
                    </button>
                  );
                })()}
              </div>
            ) : null}
          </section>
        </div>
        <button type="button" className="clp-mf" data-clp="more" aria-expanded={more} aria-controls={moreId} onClick={() => setMore((m) => !m)}>
          <span>More filters<small>Where they stand, submissions</small></span><i aria-hidden="true">{CHEVRON}</i>
        </button>

        <div className="qc153-rft" data-cl27="rail-foot">
          <span data-cl27="rail-showing">{railShowing(p.showing, p.all.length, on > 0)}</span>
          <button type="button" className="qc153-exp" data-cl27="export" disabled={loading || p.showing === 0} onClick={p.onExport}>{railExport(p.showing)}</button>
        </div>
      </div>
    </aside>
  );
};
