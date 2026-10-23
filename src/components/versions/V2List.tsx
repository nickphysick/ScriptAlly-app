/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — "{n} versions saved" (P3; the ref's `lanes()`): the in-use version pinned first as a navy index card,
 * then the rest, newest or oldest first; search over names and changes; three icon actions per card; archived
 * versions folded at the foot.
 *
 * ⚠️ THE ICON BUTTONS STOP THE CARD'S OWN PRESS. A card opens its drawer; its three icons each do one thing and never
 *    open the drawer too.
 * ⚠️ "Show all" APPEARS ONLY WHEN SOMETHING IS HIDDEN — past the pinned card plus 8 (the ref showed it at exactly 9,
 *    with nothing hidden; the prompt's "more than 8 cards (pinned + 8)" is followed).
 */
import React, { useState } from "react";
import type { Manuscript } from "../../types";
import type { V2Version } from "../../lib/bookVersions";
import type { VersionsModel } from "../../lib/versionsV2";
import { MIN_SENT_FOR_RATE } from "../../lib/versionsV2";
import { Num, commas, msDay, shortDay, versionLabel } from "./v2Bits";

const UseIcon = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth={1.6} /><circle className="in" cx="10" cy="10" r="3.6" fill="currentColor" /></svg>);
const EditIcon = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.6 4.2l3.2 3.2-8.6 8.6-3.9.7.7-3.9z" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" /><path d="M11 5.8l3.2 3.2" stroke="currentColor" strokeWidth={1.6} /></svg>);
const BinIcon = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4.4h4V6M5.6 6l.8 9.6h7.2l.8-9.6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /><path d="M8.6 9v4M11.4 9v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /></svg>);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The ref's `mark()`: matches of the search, case-insensitive, wrapped in <mark>. */
const Marked: React.FC<{ text: string; q: string }> = ({ text, q }) => {
  if (!q) return <>{text}</>;
  const bits = text.split(new RegExp(`(${esc(q)})`, "ig"));
  return <>{bits.map((b, i) => (i % 2 ? <mark key={i}>{b}</mark> : <React.Fragment key={i}>{b}</React.Fragment>))}</>;
};

export interface V2ListProps {
  ms: Manuscript;
  m: VersionsModel;
  locked: boolean;
  onOpen: (id: string, from: HTMLElement | null) => void;
  onEdit: (id: string) => void;
  onUse: (id: string) => void;
  onBin: (id: string) => void;
  onBringBack: (id: string) => void;
}

export const V2List: React.FC<V2ListProps> = ({ ms, m, locked, onOpen, onEdit, onUse, onBin, onBringBack }) => {
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(false);
  const [all, setAll] = useState(false);
  const live = m.live;
  const ord = [...live].sort((a, b) => (asc ? a.num - b.num : b.num - a.num));
  const qv = query.toLowerCase().trim();
  const hit = (v: V2Version) => !qv || `${v.name} ${v.changes.join(" ")}`.toLowerCase().includes(qv);
  const pin = !qv ? ord.find((v) => v.id === m.inUse) ?? null : null;
  const rows = pin ? [pin, ...ord.filter((v) => v !== pin)] : ord.filter(hit);
  const cap = qv || all ? rows.length : 9;
  const byId = new Map(m.versions.map((v) => [v.id, v]));
  const origWords = ms.wordCount > 0 ? ms.wordCount : 0;
  const wordsOf = (v: V2Version) => (v.original ? origWords : v.wordCount ?? 0);
  const n = live.length;

  return (
    <section className="cx-sec first is-full" id="secTiles" data-vv2="list-sec" aria-labelledby="msRH">
      <div className="cx-sh db-sh">
        <h2 id="msRH"><span id="vCnt">{n}</span> <span id="vWord">{n === 1 ? "version" : "versions"}</span> saved</h2>
        <label className="db-s">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth={1.5} /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" /></svg>
          <input id="dbQ" type="search" placeholder="Search names and changes" aria-label="Search versions" value={query} onChange={(e) => setQuery(e.target.value)} disabled={locked} data-vv2="search" />
        </label>
        <span className="db-c" id="dbC" data-vv2="match">{qv ? `${rows.length} of ${ord.length} match` : ""}</span>
        <span className="sp" />
        <button className="db-sort" id="dbSort" type="button" aria-label="Sort order" onClick={() => setAsc((x) => !x)} data-vv2="sort">
          <span id="dbSortT">{asc ? "Oldest first" : "Newest first"}</span>
          <svg viewBox="0 0 12 14" aria-hidden="true"><path id="dbSortP" d={asc ? "M6 13V1M2 5l4-4 4 4" : "M6 1v12M2 9l4 4 4-4"} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="vl" id="tiles" data-lk="b" data-vv2="list">
        <div className="db-box">
          <div className="db-h"><span>Version</span><span>What changed</span><span className="r">Words</span><span className="r">Queries sent</span><span /></div>
          {rows.slice(0, cap).map((v) => {
            const f = m.facts.get(v.id)!;
            const use = v.id === m.inUse;
            const from = v.parentId ? byId.get(v.parentId) ?? null : null;
            const dw = !v.original && wordsOf(v) && origWords ? wordsOf(v) - origWords : 0;
            const last = msDay(f.lastMs);
            return (
              <React.Fragment key={v.id}>
                <div className={`db-r${use ? " use" : ""}${v.original ? " orig" : ""}`} id={`card-${v.id}`} tabIndex={0} role="button" data-vv2="row" data-id={v.id}
                  aria-label={`${v.name}. Open details`}
                  onClick={(e) => onOpen(v.id, e.currentTarget)}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(v.id, e.currentTarget); } }}>
                  <span className="db-id">
                    <span className="vl-n"><Num v={v} /></span>
                    <span>
                      {use && pin ? <span className="db-def"><i className="bcn" aria-hidden="true" />In use</span> : null}
                      <b><Marked text={v.name} q={qv} /></b>
                      {use && !pin ? <em className="vl-use">In use</em> : null}
                      <small>
                        {v.original ? "The root of every version" : from ? <>From <u>{from.original ? "Original" : from.name}</u>{from.archived ? " (archived)" : ""}</> : "First version"}
                        <span className="db-sv">Saved {shortDay(v.createdDate)}</span>
                      </small>
                    </span>
                  </span>
                  <span className="db-ch">
                    {v.original
                      ? <em className="db-o">Your manuscript as you first sent it. Every other version traces back here.</em>
                      : <ul>{v.changes.map((c, i) => <li key={i}><Marked text={c} q={qv} /></li>)}</ul>}
                  </span>
                  <span className="db-w">
                    {wordsOf(v) ? commas(wordsOf(v)) : "–"}
                    {dw ? <small className={dw < 0 ? "dn" : "up"}>{dw > 0 ? "+" : "−"}{commas(Math.abs(dw))} vs original</small>
                      : v.original ? <small>from manuscript</small> : <small>same as original</small>}
                  </span>
                  <span className="db-q">{f.n ? <><b>{f.n}</b><small>last {shortDay(last)}</small></> : <em>Not sent yet</em>}</span>
                  <span className="db-act" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    {use
                      ? <button type="button" className="da u on" disabled data-tip="In use: new queries go out with this" aria-label={`${v.name} is in use for new queries`} data-vv2="use"><UseIcon /></button>
                      : <button type="button" className="da u" data-tip="Use this for new queries" aria-label={`Use ${v.name} for new queries`} data-vv2="use" disabled={locked} onClick={() => onUse(v.id)}><UseIcon /></button>}
                    <button type="button" className="da" data-tip="Edit version" aria-label={`Edit ${v.name}`} data-vv2="edit" disabled={locked} onClick={() => onEdit(v.id)}><EditIcon /></button>
                    {v.original
                      ? <button type="button" className="da" disabled data-tip="Original can’t be archived. Every version traces back to it." aria-label="Original can’t be archived" data-vv2="bin"><BinIcon /></button>
                      : use
                        ? <button type="button" className="da" disabled data-tip="Choose another version for new queries before archiving this one." aria-label="Can’t archive the version in use" data-vv2="bin"><BinIcon /></button>
                        : <button type="button" className="da x" data-tip={f.all.length ? "Archive this version" : "Delete this version"} aria-label={`${f.all.length ? "Archive" : "Delete"} ${v.name}`} data-vv2="bin" disabled={locked} onClick={() => onBin(v.id)}><BinIcon /></button>}
                  </span>
                </div>
                {pin && v === pin && rows.length > 1 ? <p className="db-sep"><span>Other versions · {asc ? "oldest" : "newest"} first</span></p> : null}
              </React.Fragment>
            );
          })}
          {!qv && !all && rows.length > cap ? <button type="button" className="db-more" data-vv2="all" onClick={() => setAll(true)}>Show all {rows.length} versions</button> : null}
          {rows.length ? null : <p className="db-e">No version mentions “{query}”. <button type="button" className="cx-lnk" onClick={() => setQuery("")}>Clear search</button></p>}
        </div>
      </div>
      <div id="vExtra">
        {m.archived.length ? (
          <details className="vret" data-vv2="archived">
            <summary>Archived · {m.archived.length}</summary>
            {m.archived.map((v) => {
              const f = m.facts.get(v.id)!;
              return (
                <div className="vr-row" key={v.id}>
                  <span><b>{v.name}</b> <em>{versionLabel(v)} · {f.n} {f.n === 1 ? "query" : "queries"} · {f.n >= MIN_SENT_FOR_RATE ? `${f.ratePct}% asked for more` : "too early to tell"}</em></span>
                  <button type="button" className="cx-lnk" onClick={(e) => onOpen(v.id, e.currentTarget)}>Insights</button>
                  <button type="button" className="cx-lnk" data-vv2="bring-back" disabled={locked} onClick={() => onBringBack(v.id)}>Bring back</button>
                </div>
              );
            })}
          </details>
        ) : null}
      </div>
    </section>
  );
};
