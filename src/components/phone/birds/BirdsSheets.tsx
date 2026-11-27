/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v3 — THE SHEETS, THE MENU AND THE RECAP (design-refs/phone-birds-eye-world-v3: `openSheet`,
 * `openKey`, `openSearch`, `openNd`, `menuHTML`, `recapCard`). Each is drawn over the world inside its own root, so the
 * phone tokens and the world's layers apply. Every action opens the app's existing journey; the view passes them in.
 *   - The timeline sheet: one step per stage, the reply-due step, one line, one button, and (Nick's override) "Open the
 *     full query".
 *   - The no-date sheet (Nick's override): the app's own WeekSlider, starting on the agent's stated time ("Their stated
 *     time") or 6 weeks, showing the date it gives.
 * ⚠️ COPY: never "overdue" or "late".
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { V3Glyph } from "../v3/V3Parts";
import { WeekSlider } from "../../forms/WeekSlider";
import {
  ACT_LABEL, bandOf, dm, edgeOf, fadedBand, fadedEdge, hatchOf, noDateDefault, searchRows, type BwAct, type BwRecap, type BwRow,
} from "../../../lib/birdsWorld";
import { QUIET_FADE } from "./drawWorld";
import { QueryStatus } from "../../../types";

const X_IC = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
const SEARCH_IC = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>;

/** a bottom sheet over the world: tapping the veil closes it */
export const Sheet: React.FC<{ k: string; onClose: () => void; className?: string; children: React.ReactNode }> = ({ k, onClose, className, children }) => (
  <div className="bw-veil" data-bw="veil" data-k={k} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`bw-sheet${className ? ` ${className}` : ""}`} data-bw="sheet" data-k={k} role="dialog" aria-modal="false">
      <div className="bw-grab" />
      {children}
    </div>
  </div>
);
const Close: React.FC<{ onClose: () => void }> = ({ onClose }) => <button type="button" className="bw-ib" aria-label="Close" data-bw="sheet-close" onClick={onClose}>{X_IC}</button>;

/* Phone query sheet v1 — a tap on a bar opens the one query sheet (QuerySheet); v3's timeline sheet is retired. */

/* ── the colour key (ref `openKey`) ── */
const KEY_STAGES: [string, string][] = [
  [QueryStatus.QUERIED, "Queried"], [QueryStatus.PARTIAL_REQUESTED, "Partial asked for"], [QueryStatus.PARTIAL_SENT, "Partial sent"],
  [QueryStatus.FULL_REQUESTED, "Full asked for"], [QueryStatus.FULL_SENT, "Full sent"], [QueryStatus.OFFER, "Offer"], [QueryStatus.REJECTED, "Closed"],
];
export const KeySheet: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Sheet k="key" onClose={onClose}>
    <div className="bw-sh1"><span style={{ flex: 1 }}><span className="bw-nm2">What the colours mean</span></span><Close onClose={onClose} /></div>
    <div className="bw-key" data-bw="key">
      <h5>Each stage has its colour</h5>
      {KEY_STAGES.map(([st, t]) => <div key={st} className="bw-kr" data-bw="swatch"><i style={{ background: bandOf(st), boxShadow: `inset 0 0 0 1px ${edgeOf(st)}` }} />{t}</div>)}
      <h5>Along each bar</h5>
      <div className="bw-kr"><i style={{ background: fadedBand(QueryStatus.PARTIAL_SENT), boxShadow: `inset 0 0 0 1px ${fadedEdge(QueryStatus.PARTIAL_SENT)}` }} />Faded: a stage it has moved past</div>
      <div className="bw-kr"><i style={{ background: hatchOf(QueryStatus.QUERIED), boxShadow: `inset 0 0 0 1px ${edgeOf(QueryStatus.QUERIED)}` }} />Hatched: past its reply date</div>
      {/* v3.3: gone quiet is the same hatching, fading out (drawWorld's QUIET_FADE) */}
      <div className="bw-kr"><i data-bw="key-quiet" style={{ background: hatchOf(QueryStatus.QUERIED), boxShadow: `inset 0 1px 0 ${edgeOf(QueryStatus.QUERIED)},inset 0 -1px 0 ${edgeOf(QueryStatus.QUERIED)}`, WebkitMaskImage: QUIET_FADE, maskImage: QUIET_FADE }} />Fading out: gone quiet</div>
      <div className="bw-kr"><i className="kov">!</i>The day the reply was due</div>
      <div className="bw-kr"><i className="kline" />Today</div>
    </div>
  </Sheet>
);

/* ── search that flies you there (ref `openSearch`) ── */
export const SearchSheet: React.FC<{ rows: readonly BwRow[]; onClose: () => void; onPick: (id: string) => void }> = ({ rows, onClose, onPick }) => {
  const [q, setQ] = useState("");
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { inp.current?.focus(); }, []);
  const hits = useMemo(() => searchRows(rows, q), [rows, q]);
  return (
    <Sheet k="search" onClose={onClose} className="bw-srch">
      <div className="bw-sfield">{SEARCH_IC}<input ref={inp} data-bw="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an agent or agency" autoComplete="off" aria-label="Find an agent or agency" /></div>
      <div className="bw-slist" data-bw="search-list">
        {hits.map((r) => (
          <button key={r.id} type="button" className="bw-sr" data-bw="search-hit" data-id={r.id} onClick={() => onPick(r.id)}>
            <span className="bw-disc"><V3Glyph status={r.status} size={32} label={false} bg={bandOf(r.status)} /></span>
            <span><b>{r.name}</b>{r.agency ? <small>{r.agency}</small> : null}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
};

/* ── a query with no reply date (ref `openNd`; the slider is Nick's override of its 4/6/8/12-week buttons) ── */
export const NoDateSheet: React.FC<{
  r: BwRow; left: number; statedWeeks: number | null; nowMs: number; hawk: string;
  onClose: () => void; onSave: (weeks: number) => void; onSkip: () => void;
}> = ({ r, left, statedWeeks, nowMs, hawk, onClose, onSave, onSkip }) => {
  const def = noDateDefault(statedWeeks);
  const [weeks, setWeeks] = useState(def.weeks);
  useEffect(() => { setWeeks(noDateDefault(statedWeeks).weeks); }, [r.id, statedWeeks]);
  const sent = r.ev[0]?.d ?? 0, at = (w: number) => dm(sent + w * 7, nowMs);
  return (
    <Sheet k="nodate" onClose={onClose} className="bw-nds">
      <div className="bw-ndh">
        <img src={hawk} alt="" />
        <span><em data-bw="nd-left">{left > 1 ? `${left} still need a reply date` : "Last one with no reply date"}</em><b>{r.name}</b><small>{r.agency ? `${r.agency} · ` : ""}queried {dm(sent, nowMs)}</small></span>
      </div>
      <p className="bw-ndq">When should you hear back by?</p>
      <WeekSlider value={weeks} onChange={setWeeks} min={1} max={26} label="When should you hear back by?" hideLabel readout={(n) => `${n} ${n === 1 ? "week" : "weeks"} · ${at(n)}`} />
      <p className="bw-ndr" data-bw="nd-date">{def.stated && weeks === def.weeks ? "Their stated time · " : ""}Reply by <b>{at(weeks)}</b></p>
      {/* v3.1 (Nick's ruling 3): the honest date stays, even when it has passed, and says where the query will go */}
      {sent + weeks * 7 < 0 ? <p className="bw-ndp" data-bw="nd-passed">That’s already passed, so it’ll go into Needs chasing.</p> : null}
      <div className="bw-ndf">
        <button type="button" className="bw-skip" data-bw="nd-skip" onClick={onSkip}>{left > 1 ? "Skip for now" : "Not now"}</button>
        <button type="button" className="bw-cta" data-bw="nd-save" onClick={() => onSave(weeks)}>Save</button>
      </div>
    </Sheet>
  );
};

/* Phone query sheet v1 §D — v3.1's send-by sheet is retired: Add send-by date opens the query sheet's dates edit. */

/* ── the long-press menu (ref `menuHTML`) ── */
export const QuickMenu: React.FC<{ r: BwRow; acts: BwAct[]; x: number; y: number; vpW: number; vpH: number; onClose: () => void; onAct: (a: BwAct) => void }> = ({ r, acts, x, y, vpW, vpH, onClose, onAct }) => {
  const left = Math.max(12, Math.min(vpW - 212, x - 100)), top = y > vpH / 2 ? y - 12 - acts.length * 44 - 56 : y + 28;
  return (
    <>
      <div className="bw-mveil" data-bw="menu-veil" onClick={onClose} />
      <div className="bw-qmenu" data-bw="menu" data-id={r.id} role="menu" style={{ left, top }}>
        <div className="bw-qmh"><b>{r.name}</b>{r.agency ? <small>{r.agency}</small> : null}</div>
        {acts.map((a) => <button key={a} type="button" role="menuitem" data-bw="menu-act" data-act={a} onClick={() => onAct(a)}>{ACT_LABEL[a]}</button>)}
      </div>
    </>
  );
};

/* ── the replay's recap (ref `recapCard`) ── */
export const RecapCard: React.FC<{ stats: BwRecap; bars: { l: number; w: number; t: number; c: string }[]; hawk: string; onShare: () => void; onDone: () => void; cardRef: React.Ref<HTMLDivElement> }> = ({ stats, bars, hawk, onShare, onDone, cardRef }) => (
  <div ref={cardRef} className="bw-recap" data-bw="recap" role="dialog" aria-label="Your querying so far">
    <div className="bw-rch"><img src={hawk} alt="" /><span>Your querying so far</span></div>
    <div className="bw-rcbig"><b data-bw="recap-days">{stats.days}</b>{stats.days === 1 ? "day" : "days"} on the hunt</div>
    <div className="bw-rcbars" style={{ width: 250, height: 100 }}>{bars.map((b, i) => <i key={i} style={{ left: b.l, width: b.w, top: b.t, background: b.c }} />)}</div>
    <div className="bw-rcgrid">
      <div><b>{stats.sent}</b>queries sent</div><div><b>{stats.replies}</b>replies</div>
      <div><b>{stats.requests}</b>requests</div><div><b>{stats.offers}</b>{stats.offers === 1 ? "offer" : "offers"}</div>
    </div>
    <div className="bw-rcbtn" data-html2canvas-ignore="true">
      <button type="button" className="bw-rcs" data-bw="recap-share" onClick={onShare}>Share</button>
      <button type="button" className="bw-rcd" data-bw="recap-done" onClick={onDone}>Done</button>
    </div>
  </div>
);
