/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcList — the List view (Query Centre v11): a slim head row, then one 67px row per query.
 *
 * ⚠️ FOUR COLUMNS, EACH WITH A FLOOR AND A CEILING, AND THE TRACKS ARE SIZED BY THOSE RULES ALONE.
 * Every row is its own grid, so a track sized by content would put each row's columns somewhere
 * different. Between floor and ceiling the columns share the width; once all are at their ceilings
 * the spare goes into the GAPS, equally (`justify-content: space-between`), so no column pools it.
 * The chip and the name are ONE column, so a widening gap never separates them. The head row uses
 * the same template. (This took the mockup three attempts; the rule is in qcvList.css, once.)
 *
 * ⚠️ NO ROW BUTTONS. "Record response", "Mark sent" and the rest live in the open card's footer;
 * a row selects, and that is all it does. `display: contents` is never used on a row — it fractures
 * the hover and selection backgrounds.
 */
import React, { useEffect, useRef } from "react";
import { StatusDot } from "../../StatusDot";
import { Mark } from "../QueryCard";
import { MATERIAL_SLOTS } from "../../../lib/queryCardFacts";
import { MATERIAL_ROW_NAMES } from "../../../lib/agentMaterials";
import { STAGE_NAME, factLine, type QcRow } from "../../../lib/qcSummary";
import "./qcvPage.css";
import "./qcvList.css";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The four icons. Sent = ink at 80%; not sent = ink at 16%, so the columns line up. */
export const SentSoFar: React.FC<{ row: QcRow }> = ({ row }) => (
  <span className="qcv-mat" data-qcv="row-sent">
    {MATERIAL_SLOTS.map((k) => {
      const name = MATERIAL_ROW_NAMES[k];
      const on = row.materials[k] != null;
      /* ⚠️ "NOT SENT" IS ONLY SAID WHERE SOMETHING WAS RECORDED. A query with no materials recorded at
         all is not a query that sent nothing — the icons are all quiet and the title says which. */
      const say = on ? `${name} sent` : row.materialsRecorded ? `${name} not sent` : `${name} not recorded`;
      return <i key={k} className={on ? "qcv-mat-i qcv-mat-i--on" : "qcv-mat-i"} title={say} role="img" aria-label={say}><Mark kind={k} /></i>;
    })}
  </span>
);

export const QcList: React.FC<{
  rows: readonly QcRow[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  nowMs: number;
}> = ({ rows, selectedId, onOpen, nowMs }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  /* selection follows the keyboard: when the open query changes while focus is IN the rows, focus
     goes with it (one tab stop, roving). Never steals focus from anywhere else. */
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !selectedId || !box.contains(document.activeElement)) return;
    const el = box.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`);
    if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest" }); }
  }, [selectedId]);
  return (
  <div className="qcv-list" data-qcv="list">
    <div className="qcv-cols" data-qcv="list-head" aria-hidden="true">
      <b className="qcv-cols-agent">Agent</b><b>Where it stands</b><b>Sent so far</b><b className="qcv-cols-date">Queried</b>
    </div>
    <div ref={boxRef} role="listbox" aria-label="Queries" className="qcv-rows">
      {rows.map((r) => {
        const sent = r.sentMs != null ? new Date(r.sentMs) : null;
        const on = r.id === selectedId;
        return (
          <div key={r.id} id={`query-row-${r.id}`} className={`qcv-row${r.withYou ? " qcv-row--you" : ""}`} data-qcv="row" data-id={r.id} data-status={r.status} data-you={r.withYou ? "true" : "false"}
            role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
            style={{ ["--qcv-state" as string]: `var(--state-${r.state})` }}
            onClick={() => onOpen(r.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r.id); } }}>
            <div className="qcv-row-agent">
              <span className="qcv-chip" data-qcv="row-chip"><StatusDot status={r.status} overrideSize={16} decorative /></span>
              <div className="qcv-row-who">
                <b className="qcv-row-nm">{r.agentName}</b>
                <i className="qcv-row-ag">{r.agency}</i>
              </div>
            </div>
            <div className="qcv-row-st" data-qcv="row-stand">
              <b className="qcv-row-stn">{STAGE_NAME[r.status]}</b>
              {/* one line, with an ellipsis where the column is narrow — so the whole line is also its title */}
              <small className="qcv-row-fact" title={factLine(r, nowMs)}>{factLine(r, nowMs)}</small>
            </div>
            <SentSoFar row={r} />
            <div className="qcv-date" data-qcv="row-date" title={sent ? sent.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Send date not recorded"}>
              <u>{sent ? MON[sent.getMonth()] : "—"}</u><b>{sent ? sent.getDate() : "·"}</b>
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};

/** Eight placeholder rows at the REAL row height, so nothing jumps when the data lands. */
export const QcListSkeleton: React.FC = () => (
  <div className="qcv-list" aria-hidden="true">
    <div className="qcv-cols" data-qcv="list-head"><b className="qcv-cols-agent">Agent</b><b>Where it stands</b><b>Sent so far</b><b className="qcv-cols-date">Queried</b></div>
    <div className="qcv-rows qcv-skw">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="qcv-row qcv-row--sk" data-qcv="sk-row">
          <div className="qcv-row-agent"><span className="qcv-sk qcv-sk--q" style={{ width: 32, height: 32 }} /><div className="qcv-row-who"><span className="qcv-sk" style={{ width: "62%", height: 14 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "44%", height: 10 }} /></div></div>
          <div className="qcv-row-st"><span className="qcv-sk" style={{ width: "58%", height: 12 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "90%", height: 8 }} /></div>
          <span className="qcv-sk" style={{ width: 76, height: 14 }} />
          <span className="qcv-sk qcv-sk--q qcv-date-sk" style={{ width: 46, height: 44 }} />
        </div>
      ))}
    </div>
  </div>
);
