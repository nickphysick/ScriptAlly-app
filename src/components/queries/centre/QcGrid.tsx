/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcGrid — the Grid view (Query Centre v11): two tiles across in the view's frame, beside the docked
 * card. A tile is a 35px band in the query's state colour (its mark, its status, Day N) over the
 * agent, the agency and the list's own fact line. No tile actions: a tile selects, exactly as a row
 * does, and the query's actions live in the open card's footer.
 */
import React, { useEffect, useRef } from "react";
import { StatusDot } from "../../StatusDot";
import { STAGE_NAME, factLine, type QcRow } from "../../../lib/qcSummary";
import "./qcvPage.css";
import "./qcvGrid.css";

export const QcGrid: React.FC<{ rows: readonly QcRow[]; selectedId: string | null; onOpen: (id: string) => void; nowMs: number }> = ({ rows, selectedId, onOpen, nowMs }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !selectedId || !box.contains(document.activeElement)) return;
    const el = box.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`);
    if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest" }); }
  }, [selectedId]);
  return (
    <div ref={boxRef} className="qcv-tiles" role="listbox" aria-label="Queries" data-qcv="tiles">
      {rows.map((r) => {
        const on = r.id === selectedId;
        return (
          <article key={r.id} id={`query-row-${r.id}`} className={`qcv-tile${r.withYou ? " qcv-tile--you" : ""}`} data-qcv="tile" data-id={r.id} data-status={r.status} data-you={r.withYou ? "true" : "false"}
            role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
            style={{ ["--qcv-state" as string]: `var(--state-${r.state})` }}
            onClick={() => onOpen(r.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r.id); } }}>
            <div className="qcv-tile-bd" data-qcv="tile-band">
              <StatusDot status={r.status} overrideSize={15} decorative />
              <b>{STAGE_NAME[r.status]}</b>
              {r.dayN != null && <em>Day {r.dayN}</em>}
            </div>
            <div className="qcv-tile-in">
              <b className="qcv-tile-nm">{r.agentName}</b>
              <i className="qcv-tile-ag">{r.agency}</i>
              <small className="qcv-tile-fact" title={factLine(r, nowMs)}>{factLine(r, nowMs)}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
};

/** Eight placeholder tiles. */
export const QcGridSkeleton: React.FC = () => (
  <div className="qcv-tiles" aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => (
      <article key={i} className="qcv-tile qcv-tile--sk qcv-skw" data-qcv="sk-tile">
        <div className="qcv-tile-bd" style={{ background: "#efe9e0" }}>&nbsp;</div>
        <div className="qcv-tile-in"><span className="qcv-sk" style={{ width: "60%", height: 15 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "42%", height: 11 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "80%", height: 8 }} /></div>
      </article>
    ))}
  </div>
);
