/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 Part A (design-refs/contact-list-v26/, screens 01–03) — THE HEADER: one navy panel. Left, the title,
 * one sentence and two buttons; right, List health as a ring with the archivist breaking out of it, the percentage pill
 * straddling its foot, and the words, Open and "Show me who" beside it.
 *
 * ⚠️ SUPERSEDES the shared title card (`PageHeaderCard`) and At a glance (v25.1's ledger, v25.6's four cells and their
 *    foot lines). The `h1` keeps `data-page-title` (the shell's folder tab and the page guide read it).
 * ⚠️ THE RIGHT HAND NEVER SETS THE PANEL'S HEIGHT: the ring block is centred in its own grid row and the archivist and
 *    the pill overflow it (CL26 H1 holds the panel to its left column ±2).
 * ⚠️ THE SCORE AND THE COUNT ARE HOUSEKEEPING'S OWN (`listHealth` over `hkModel`), handed in — never recomputed here.
 */
import React from "react";
import { RING26, RING26_C, RING26_R, ringArc, ring26Colours, type HeaderFigures } from "../../../lib/contactV26";
import "./contactV26.css";

export const ARCHIVIST26 = "/images/contact-list-archivist.webp";

export const ContactHeader26: React.FC<{
  loading: boolean;
  figures: HeaderFigures | null;
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onDiscover?: () => void;
  onOpenHealth: () => void;
  onShowWho: () => void;
}> = ({ loading, figures: f, health: h, onAdd, addRef, onDiscover, onOpenHealth, onShowWho }) => {
  const c = ring26Colours(h?.pct ?? 0);
  const arc = h ? ringArc(h.pct) : 0;
  const mid = RING26.box / 2;
  return (
    <header className="cl24-hd cl26-hd" data-cl26="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <div className="cl26-panel" data-cl26="panel">
        <div className="cl26-left" data-cl26="left">
          <h1 className="cl26-title" data-page-title="true" data-cl26="title">Contact list</h1>
          <p className="cl26-line" data-cl26="line">
            {f ? (
              <>
                <b>{f.n}</b> {f.n === 1 ? "agent" : "agents"} on file. You’ve queried <b>{f.q}</b>
                {f.y > 0 ? <>, and <b>{f.y}</b> {f.y === 1 ? "is" : "are"} waiting on you.</> : "."}
              </>
            ) : <span className="cl26-sk" aria-hidden="true">&nbsp;</span>}
          </p>
          <div className="cl26-btns">
            <button type="button" ref={addRef} className="cl26-b1" data-cl26="add" data-cl24="add" data-cl17="add" disabled={loading} onClick={onAdd}>+ Add an agent</button>
            {onDiscover ? <button type="button" className="cl26-b2" data-cl26="discover" data-cl24="discover" onClick={onDiscover}>Discover agents</button> : null}
          </div>
        </div>
        <div className="cl26-health" data-cl26="health" aria-hidden={h ? undefined : true}>
          <button type="button" className="cl26-ring" data-cl26="ring" data-pct={h?.pct ?? ""} disabled={!h}
            aria-label={h ? `List health ${h.pct}%. Open Housekeeping` : "List health"} onClick={onOpenHealth}
            style={{ width: RING26.px, height: RING26.px }}>
            <svg viewBox={`0 0 ${RING26.box} ${RING26.box}`} width={RING26.px} height={RING26.px} aria-hidden="true">
              <circle data-cl26="track" cx={mid} cy={mid} r={RING26_R} fill="none" style={{ stroke: c.track }} strokeWidth={RING26.stroke} />
              {h ? (
                <circle data-cl26="arc" cx={mid} cy={mid} r={RING26_R} fill="none" style={{ stroke: c.arc }} strokeWidth={RING26.stroke}
                  strokeLinecap="round" strokeDasharray={`${arc} ${RING26_C}`} transform={`rotate(-90 ${mid} ${mid})`} />
              ) : null}
            </svg>
            <img className="cl26-arch" data-cl26="archivist" src={ARCHIVIST26} alt="" width={100} height={89} draggable={false} />
            {h ? <span className="cl26-pct" data-cl26="pct" style={{ "--arc": c.arc } as React.CSSProperties}>{h.pct}%</span> : null}
          </button>
          <div className="cl26-hw">
            <b className="cl26-ht">List health</b>
            {h ? (
              <>
                <span className="cl26-hm" data-cl26="missing">
                  {h.gaps > 0 ? <><em>{h.gaps}</em> {h.gaps === 1 ? "detail" : "details"} missing</> : "Nothing missing"}
                </span>
                <span className="cl26-hb">
                  <button type="button" className="cl26-open" data-cl26="open" onClick={onOpenHealth}>Open</button>
                  {h.gaps > 0 ? <button type="button" className="cl26-who" data-cl26="who" onClick={onShowWho}>Show me who →</button> : null}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
