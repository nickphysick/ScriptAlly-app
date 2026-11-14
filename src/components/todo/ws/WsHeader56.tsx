/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v56 (design-refs/todo-list-v56/todo-navy-header-v1.html, "Ring and words") — THE NAVY HEADER: the Query
 * Centre's own panel on the To-do list. The hawk at the desk (the cut-out) over the 268px column, "{n} things to do" in
 * the 54px typewriter, "for {book}" between rules (only when one book is in scope), "+ Add a task" (cream, filled) and
 * "Quick fill" (cream ring), then on the right a 140px ring of what needs you beside "What needs doing" and one line.
 *
 * ⚠️ IT WEARS THE QUERY CENTRE'S RULES, NOT A COPY OF THEM. The frame is `shell/OpenHeader` (the one `QcHeader1531` and
 *    `ContactHeaderQc` render through); the navy panel, the typewriter title, the cream buttons and the grid are
 *    qcv156.css §1 and qcv1534.css §2–3, whose selectors name `.tws56-hdw` beside `.qc151.qc153` and `.cl27` at the same
 *    specificity. Only what is the To-do's own (the ring block, the third column, the cut-out) is in todoWs56.css.
 * ⚠️ A SEGMENT SETTLES THE PAGE, THEN SCROLLS THE TRAY (`onJump`: the page onto the pinned workspace, then the tray's own
 *    `jump` for that group). Hovering one fades the others.
 * ⚠️ NO LEGEND. v54's "What needs doing" list is not rendered; `needRows` stays in lib/todoHeader54 for its own test.
 */
import React from "react";
import { RING_GEO } from "../../../lib/qc1531";
import { needArcs, needYou } from "../../../lib/todoHeader54";
import { RING56_FILL, RING56_SIZE, segLabel56, wordsLine56, type RingKey56 } from "../../../lib/todoHeader56";
import type { Breakdown } from "../../../lib/todoWs";
import { OpenHeader } from "../../shell/OpenHeader";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv1534.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "../../queries/centre/qcv1561.css";
import "./todoWs56.css";

/** the hawk at the desk, cut out (a placeholder until Nick supplies his own): the one place its path is named */
export const TODO_HEADER_ART = "/images/todo/todo-desk-hawk-cut.webp?v=1";
/** the Query Centre's art width (`QcHeader1531`'s armchair hawk) */
export const TODO_ART_W = 190;

/** "38 things to do", "1 thing to do" */
export const thingsTitle = (n: number): string => `${n} ${n === 1 ? "thing" : "things"} to do`;

const onKey = (go: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
};

/** the ring on navy: three segments, each a button; the need-you figure in its centre */
export const NeedRing56: React.FC<{ bd: Breakdown; onJump: (k: RingKey56) => void }> = ({ bd, onJump }) => {
  const arcs = needArcs(bd);
  const seg = (k: RingKey56) => ({
    "data-tws56": "seg", "data-k": k, role: "button", tabIndex: 0, className: "tws56-seg",
    "aria-label": segLabel56(k, bd[k]), onClick: () => onJump(k), onKeyDown: onKey(() => onJump(k)),
    fill: "none", stroke: RING56_FILL[k], strokeWidth: RING_GEO.w,
  });
  return (
    <div className="tws56-ring" data-tws56="ring">
      <svg viewBox="0 0 210 210" width={RING56_SIZE} height={RING56_SIZE} focusable="false">
        {!arcs.length ? <circle cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r} fill="none" stroke="rgba(244,238,229,.16)" strokeWidth={RING_GEO.w} aria-hidden="true" /> : null}
        {arcs.map((a) => {
          const k = a.key as RingKey56;
          return a.full
            ? <circle key={k} {...seg(k)} cx={RING_GEO.c} cy={RING_GEO.c} r={RING_GEO.r}><title>{segLabel56(k, bd[k])}</title></circle>
            : <path key={k} {...seg(k)} d={a.d}><title>{segLabel56(k, bd[k])}</title></path>;
        })}
        <text className="tws56-midn" data-tws56="need" x="105" y="118" textAnchor="middle" aria-hidden="true">{needYou(bd)}</text>
        <text className="tws56-midl" x="105" y="142" textAnchor="middle" aria-hidden="true">need you</text>
      </svg>
    </div>
  );
};

export const WsHeader56: React.FC<{
  todo: number; bd: Breakdown; book: string | null;
  onAdd: () => void; onQuickFill: (() => void) | null; onJump: (k: RingKey56) => void;
}> = ({ todo, bd, book, onAdd, onQuickFill, onJump }) => {
  const parts = wordsLine56(bd);
  return (
    <div className="qc151 tws56-hdw tws-hd" data-tws="header">
      <OpenHeader
        className="tws56-hd"
        attrs={{ "data-tws56": "header" }}
        art={<img src={TODO_HEADER_ART} alt="" width={TODO_ART_W} draggable={false} data-tws56="art" />}
        artClassName="tws56-art"
        title={thingsTitle(todo)}
        titleAttrs={{ "data-tws54": "title" }}
        forLine={book ? { lead: "for", text: book, attrs: { "data-tws54": "for" } } : null}
        actions={<>
          <button type="button" className="qc1531-b qc1531-b--n tws-addb" data-tws54="add" onClick={onAdd}>+ Add a task</button>
          <button type="button" className="qc1531-b qc1531-b--g" data-tws54="quick-fill" disabled={!onQuickFill} onClick={() => onQuickFill?.()}>Quick fill</button>
        </>}
        ring={
          <div className="tws56-rc" data-tws56="rc">
            <NeedRing56 bd={bd} onJump={onJump} />
            <div className="tws56-words" data-tws56="words">
              <b>What needs doing</b>
              {parts.length ? (
                <small data-tws56="line">
                  {parts.map((p, i) => (
                    <React.Fragment key={p.key}>{i ? " · " : null}<em data-tws56={p.key}>{p.n}</em> {p.words}</React.Fragment>
                  ))}
                </small>
              ) : null}
            </div>
          </div>
        }
      />
    </div>
  );
};
