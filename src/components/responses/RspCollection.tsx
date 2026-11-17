/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase F (ref `wallSec` as last defined, `rcList`, `rcWire`) — THE REJECTION COLLECTION: one list.
 *
 *   heading   "Rejection collection", the count with its tally and "{p} passed · {n} no reply", Share your story
 *   second    the line on rejections, Find (above six entries), All / Passed / No reply (when both kinds exist)
 *   columns   Date (a postmark) · Agent · Answer · How long it took · Got as far as · What they said
 *
 * ⚠️ EVERY HEADING SORTS; pressing the current one reverses it (`listCollection`, `collFirstDir`). Default: Date, newest
 *    first, under month headers (counted over the whole collection); any other sort has no month headers.
 * ⚠️ THE BAR IS SCALED TO THE LONGEST WAIT IN THE WHOLE COLLECTION, never the filtered view (`longestWait(coll)`).
 * ⚠️ THE TRACK IS THE QUERY CENTRE'S (`Track153` over `slipTrack`), from `furthest`. The glyph is `StatusDot`.
 * ⚠️ THE WHOLE ROW OPENS THE ANSWER in the existing panel (`?answer=`). First ten rows, then Show all; a find shows all.
 * ⚠️ A PASS KEPT OFF (`offWallIds`) IS NOT HERE: the page hands in `collectionOf(items, off)`.
 * ⚠️ SHARE YOUR STORY OPENS THE EXISTING BUILDER (`RspShare`) under the list, unchanged but for its name (decision 3).
 */
import React, { useState } from "react";
import { MONTHS_SHORT } from "../../lib/dates";
import {
  COLL_FIND_ABOVE, collFirstDir, collMonth, collShown, listCollection, longestWait, monthCount, tookBar, tookWords,
  type CollKind, type CollSort, type RespItem,
} from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { slipTrack } from "../../lib/qc153";
import { StatusDot } from "../StatusDot";
import { Track153 } from "../queries/centre/QcSlip153";
import { RspTally } from "./Rsp5Head";
import { RspShare } from "./RspShare";

type Item = RespItem<QcRow>;
export const COLL_LINE = "Rejections are part of querying. A manuscript won’t suit every agent’s taste, and it may land on a desk at the wrong time.";
const HEADS: [CollSort, string][] = [["date", "Date"], ["agent", "Agent"], ["answer", "Answer"], ["took", "How long it took"], ["far", "Got as far as"], ["note", "What they said"]];
/** the postmark's tilt, the ref's five */
const TILT = [-8, 6, -4, 9, -6];
const GO = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;

export const RspCollection: React.FC<{
  coll: Item[];
  nowMs: number;
  msTitle: string | null;
  selectedId: string | null;
  sharing: boolean;
  onShare: () => void;
  onOpen: (i: Item) => void;
  /** the rows as shown, in order (the panel's ↑ ↓ walk them) */
  onVisible?: (ids: string[]) => void;
}> = ({ coll, nowMs, msTitle, selectedId, sharing, onShare, onOpen, onVisible }) => {
  const [sort, setSort] = useState<CollSort>("date");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [kind, setKind] = useState<CollKind>("all");
  const [find, setFind] = useState("");
  const [all, setAll] = useState(false);
  const nPass = coll.filter((i) => i.group === "passed").length, nNr = coll.length - nPass;
  const longest = longestWait(coll);
  const list = listCollection(coll, { kind, find, sort, dir });
  const { rows, cut } = collShown(list, all, find);
  const ids = rows.map((i) => i.id).join(",");
  React.useEffect(() => { onVisible?.(ids ? ids.split(",") : []); }, [ids, onVisible]);
  const press = (k: CollSort) => { if (k === sort) setDir((d) => (d === 1 ? -1 : 1)); else { setSort(k); setDir(collFirstDir(k)); } };

  if (!coll.length) {
    return (
      <section className="rsp15-rc" data-rsp15="collection" data-rsp5-sec="wall" data-n="0" aria-labelledby="rsp15-rc-h">
        <div className="rsp15-rh"><h2 id="rsp15-rc-h" className="rsp15-rht">Rejection collection</h2>
          <p data-rsp15="collection-empty">Nothing here yet. {COLL_LINE} When a pass comes in, it{"’"}s kept here.</p></div>
      </section>
    );
  }
  let mo: string | null = null;
  return (
    <section className="rsp15-rc" data-rsp15="collection" data-rsp5-sec="wall" data-n={coll.length} data-sort={sort} data-dir={dir} aria-labelledby="rsp15-rc-h">
      <div className="rsp15-rh">
        <h2 id="rsp15-rc-h" className="rsp15-rht">Rejection collection</h2>
        <div className="rsp15-ct" data-rsp15="collection-count">
          <b>{coll.length}</b>
          <div><RspTally classes={coll.map((i) => (i.group === "passed" ? "p" : "w"))} height={44} className="rsp15-ctally" probe="collection-tally" />
            <small>{nPass} passed{nNr ? ` · ${nNr} no reply` : ""}</small></div>
        </div>
        <div className="rsp15-side"><button type="button" className="rsp15-rbn" data-rsp15="share" aria-expanded={sharing} onClick={onShare}>Share your story</button></div>
      </div>
      <div className="rsp15-rc2">
        <p>{COLL_LINE}</p>
        {coll.length > COLL_FIND_ABOVE ? (
          <label className="rsp15-find">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            <input data-rsp15="find" placeholder="Find an agent or a word" aria-label="Find in your collection" value={find} onChange={(e) => setFind(e.target.value)} />
          </label>
        ) : null}
        {nPass && nNr ? (
          <div className="rsp15-seg" role="group" aria-label="Show" data-rsp15="collection-seg">
            {([["all", "All", coll.length], ["passed", "Passed", nPass], ["noReply", "No reply", nNr]] as [CollKind, string, number][]).map(([v, l, c]) => (
              <button key={v} type="button" aria-pressed={kind === v} className={kind === v ? "on" : undefined} data-k={v} onClick={() => setKind(v)}>{l}<em>{c}</em></button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="rsp15-rcs" data-rsp15="list">
        <div className="rsp15-rch" data-rsp15="heads">
          {HEADS.map(([k, l]) => (
            <button key={k} type="button" className={sort === k ? "on" : undefined} data-rsp15="head" data-k={k} aria-label={`Sort by ${l}`}
              aria-sort={sort === k ? (dir < 0 ? "descending" : "ascending") : undefined} onClick={() => press(k)}>
              {l}<i aria-hidden="true">{dir < 0 ? "↓" : "↑"}</i>
            </button>
          ))}
          <span />
        </div>
        {rows.length === 0 ? (
          <div className="rsp15-rce" data-rsp15="no-match">Nothing in your collection matches {"“"}{find.trim()}{"”"}.</div>
        ) : rows.map((i, n) => {
          const nr = i.group === "noReply";
          const m = sort === "date" ? collMonth(i, nowMs) : null;
          const head = m && m.key !== mo ? (mo = m.key, (
            <div key={`m-${m.key}`} className="rsp15-rcm" data-rsp15="month"><span>{m.label}</span><em data-rsp15="month-count">{monthCount(coll, m.key, nowMs)}</em></div>
          )) : null;
          const took = tookWords(i), bar = tookBar(i, longest);
          const d = i.answerMs != null ? new Date(i.answerMs) : null;
          return (
            <React.Fragment key={i.id}>
              {head}
              <button type="button" className={`rsp15-rcr${selectedId === i.id ? " is-sel" : ""}`} data-rsp15="row" data-id={i.id} data-kind={i.group}
                aria-label={`${i.row.agentName}, ${i.row.agency}: ${nr ? "No reply" : "Passed"}. Open the card.`} onClick={() => onOpen(i)}>
                <span className="rsp15-stamp" style={{ transform: `rotate(${TILT[(n + 1) % 5]}deg)` }} aria-hidden="true">
                  {d ? <>{d.getDate()}<br />{MONTHS_SHORT[d.getMonth()]}</> : "–"}
                </span>
                <span className="rsp15-ag"><span className="rsp15-mono" aria-hidden="true">{i.row.initials}</span>
                  <span className="rsp15-who"><b>{i.row.agentName}</b><em>{i.row.agency}</em></span></span>
                <span className="rsp15-an"><StatusDot status={i.row.status} overrideSize={17} decorative />{nr ? "No reply" : "Passed"}</span>
                <span className={`rsp15-tk${nr ? " is-nr" : ""}`} data-rsp15="took">
                  {took ? <b>{took}</b> : null}
                  {bar != null ? <u aria-hidden="true"><i data-rsp15="bar" data-w={bar} style={{ width: `${bar}%` }} /></u> : null}
                </span>
                <span className="rsp15-far" data-rsp15="far"><Track153 t={slipTrack(i.row)} /></span>
                <span className={`rsp15-nq${i.note ? "" : " is-no"}`} data-rsp15="said">{i.note ? `“${i.note}”` : nr ? "Closed after the wait" : "No note"}</span>
                <span className="rsp15-act" aria-hidden="true">{GO}</span>
              </button>
            </React.Fragment>
          );
        })}
        {cut ? <div className="rsp15-rcf"><button type="button" data-rsp15="show-all" onClick={() => setAll(true)}>Show all {list.length}</button></div> : null}
      </div>
      {sharing ? <div className="rsp15-share" data-rsp15="share-builder" data-rsp5-sec="share"><RspShare nos={coll} title={msTitle} /></div> : null}
    </section>
  );
};
