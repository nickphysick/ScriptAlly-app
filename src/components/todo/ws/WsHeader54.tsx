/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54, D1 (design-refs/todo-list-v54/todo-desk-v15.html, `.bigh`) — THE PAGE HEADER, in the Query Centre's
 * own dress: the hawk at the desk, "{n} things to do" in the big serif, "for {book}" between rules, "+ Add a task" and
 * "Quick fill", then the ring ("{n} need you") beside "What needs doing".
 *
 * ⚠️ IT WEARS THE QUERY CENTRE'S CLASSES, NOT A COPY OF THEM. The header, title, "for" line, buttons, ring and legend are
 *    `qc1531-*` (queries/centre/qcv1531.css), most of which are scoped under the Query Centre page's `.qc151`; the
 *    wrapper carries that class so those rules reach here unchanged. `QcHeader1531` and `QcStageRing1531` themselves
 *    are hard-wired to queries (the armchair hawk, "queries sent", the rail's stage filter), so they are not mounted:
 *    changing them is out of this pack's scope. The To-do's few differences are in todoWs54.css under `.tws54-hd`.
 * ⚠️ A LEGEND LINE SCROLLS THE TRAY, never the page (`onJump` is the tray's own `jump`).
 */
import React from "react";
import { RING_GEO } from "../../../lib/qc1531";
import { NEED_FILL, needArcs, needYou, type NeedKey, type NeedRow } from "../../../lib/todoHeader54";
import type { Breakdown } from "../../../lib/todoWs";
import "../../queries/centre/qcv1531.css";

/** the hawk at the desk (Nick, 9 Nov): public/images/todo, as the page's other drawings */
export const DESK_HAWK = "/images/todo/todo-desk-hawk.webp?v=1";
const VIEW = 210;
const SIZE = 214;

/** "38 things to do", "1 thing to do" */
export const thingsTitle = (n: number): string => `${n} ${n === 1 ? "thing" : "things"} to do`;

export const WsHeader54: React.FC<{
  todo: number; bd: Breakdown; rows: NeedRow[]; book: string | null;
  onAdd: () => void; onQuickFill: (() => void) | null; onJump: (k: NeedKey) => void;
}> = ({ todo, bd, rows, book, onAdd, onQuickFill, onJump }) => {
  const arcs = needArcs(bd);
  const need = needYou(bd);
  return (
    <div className="qc151 tws54-hdw tws-hd" data-tws="header">
      <header className="qc1531-hd tws54-hd" data-tws54="header">
        <div className="qc1531-art tws54-art" aria-hidden="true"><img src={DESK_HAWK} alt="" width={190} data-tws54="art" /></div>
        <div className="qc1531-main">
          <h1 className="qc1531-t" data-page-title="true" data-tws54="title">{thingsTitle(todo)}</h1>
          {book ? (
            <p className="qc1531-for" data-tws54="for"><i aria-hidden="true" /><span><em>for</em> {book}</span><i aria-hidden="true" /></p>
          ) : null}
          <div className="qc1531-acts">
            <button type="button" className="qc1531-b qc1531-b--n tws-addb" data-tws54="add" onClick={onAdd}>+ Add a task</button>
            <button type="button" className="qc1531-b qc1531-b--g" data-tws54="quick-fill" disabled={!onQuickFill} onClick={() => onQuickFill?.()}>Quick fill</button>
          </div>
        </div>
        <div className="qc1531-rc">
          <section className="qc1531-ring tws54-ring" aria-label="What needs doing" data-tws54="ring-card">
            <div className="qc1531-rb">
              <div className="qc1531-rsvg" data-tws54="ring">
                <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={SIZE} height={SIZE} aria-hidden="true" focusable="false">
                  <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.disc} fill="rgba(255,255,255,.55)" />
                  {!arcs.length ? <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke="#f1eee9" strokeWidth={RING_GEO.w} /> : null}
                  {arcs.map((a) => a.full
                    ? <circle key={a.key} data-tws54="seg" data-k={a.key} cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke={NEED_FILL[a.key]} strokeWidth={RING_GEO.w} />
                    : <path key={a.key} data-tws54="seg" data-k={a.key} d={a.d} fill="none" stroke={NEED_FILL[a.key]} strokeWidth={RING_GEO.w} />)}
                  {arcs.map((a) => (a.label ? (
                    <text key={`t-${a.key}`} className="qc1531-segn" x={a.label.x} y={a.label.y + 4.5} textAnchor="middle" fill="#3a332d">{bd[a.key as "wait" | "nudge" | "quiet"]}</text>
                  ) : null))}
                  <text className="qc1531-midn" data-tws54="need" x="105" y="112" textAnchor="middle">{need}</text>
                  <text className="qc1531-midl" x="105" y="134" textAnchor="middle">need you</text>
                </svg>
              </div>
              <div className="qc1531-lgw">
                <div className="qc1531-lgh"><h2>What needs doing</h2><small data-tws54="legend-sum">{todo} to do</small></div>
                <ul className="qc1531-lg tws54-lg" data-tws54="legend">
                  {rows.map((r) => (
                    <li key={r.key}>
                      <button type="button" data-tws54="legend-row" data-k={r.key} aria-label={`${r.label}, ${r.n}`} onClick={() => onJump(r.key)}>
                        <i className="qc1531-sw" style={{ background: NEED_FILL[r.key] }} aria-hidden="true" />
                        <span className="qc1531-lbl">{r.label}</span>
                        <b data-tws54="legend-n">{r.n}</b>
                        <em data-late={r.late ? "" : undefined}>{r.note}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </header>
    </div>
  );
};
