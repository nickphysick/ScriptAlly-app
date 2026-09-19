/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCentre — the Query Centre's browsing page (v11): head, summary row, the sentence and the view
 * switch, then the stage — the view's frame with the open query docked to its right.
 *
 * It lays the page out and owns nothing about queries: the rows, the filter, the sort, the selection
 * and every handler arrive from `Queries.tsx`, which is still the one place they are derived.
 *
 * ⚠️ DOCKED OR DRAWER IS DECIDED BY MEASURING THE MAIN COLUMN, never the window: the sidebar
 * collapses, so a window width says nothing about the room the page has. Under 900px of column the
 * docked column goes and the open query is today's drawer. `docked` is `null` until the first
 * measurement (a layout effect, so before paint) — the page renders neither the card nor a drawer
 * on a guess.
 */
import React, { useLayoutEffect, useRef } from "react";
import { FramedCard } from "../../containers/FramedCard";
import "../../shell/primitives.css";
import "./qcvPage.css";

export type QcView = "list" | "calendar" | "grid";
export const QC_VIEWS: readonly { key: QcView; label: string }[] = [
  { key: "list", label: "List" }, { key: "calendar", label: "Calendar" }, { key: "grid", label: "Grid" },
];
export const DOCK_MIN_COLUMN = 900;
export const QC_VIEW_KEY = "sa.qcView";
/** Per device. A remembered `board` — the view is gone — falls back to List, as does anything unknown. */
export function readQcView(search: string, local: string | null, legacySession: string | null): QcView {
  const ok = (v: string | null): v is QcView => v === "list" || v === "calendar" || v === "grid";
  const fromUrl = new URLSearchParams(search).get("view");
  if (ok(fromUrl)) return fromUrl;
  if (ok(local)) return local;
  if (ok(legacySession)) return legacySession;
  return "list";
}

export const QcCentre: React.FC<{
  loading: boolean;
  headLine: React.ReactNode;
  onLog: () => void;
  /** True while a query is already being written. */
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  summary: React.ReactNode;
  sentence: React.ReactNode;
  view: QcView;
  onView: (v: QcView) => void;
  /** The view's body, inside the frame. */
  body: React.ReactNode;
  /** The open query, docked. Rendered only while `docked`. */
  openCard: React.ReactNode;
  docked: boolean | null;
  onDocked: (docked: boolean) => void;
  /** ← / → (and ↑ / ↓ in a list of rows) step the open query — bound to the STAGE, so only inside the view or the card. */
  onStep?: (delta: 1 | -1) => void;
  onExport: () => void;
  canExport: boolean;
  entering: boolean;
}> = ({ loading, headLine, onLog, logDisabled = false, logRef, summary, sentence, view, onView, body, openCard, docked, onDocked, onStep, onExport, canExport, entering }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const read = () => { const w = el.getBoundingClientRect().width; if (w > 0) onDocked(w >= DOCK_MIN_COLUMN); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onDocked]);

  return (
    <div ref={rootRef} className={`qcv-page qcv-own${docked === false ? " qcv-page--narrow" : ""}${loading ? " qcv-page--loading" : ""}${entering ? " qcv-page--enter" : ""}`}
      role="region" aria-label="Query Centre" aria-busy={loading} data-qcv="page" data-view={view}>
      <header className="qcv-head" data-qcv="head">
        <div className="qcv-head-copy">
          <h1 className="qcv-title" data-qcv="head-title">Query Centre</h1>
          <p className="qcv-line" data-qcv="head-line">{headLine}</p>
        </div>
        <button ref={logRef} type="button" className="sp-inkpill qcv-log" data-qcv="head-cta" onClick={onLog} disabled={logDisabled}>
          <span className="sp-inkpill-l">+ Log a query</span>
        </button>
      </header>

      {summary}

      <div className="qcv-ctl" data-qcv="ctl">
        {sentence}
        <div className="qcv-views" role="group" aria-label="View" data-qcv="views">
          {QC_VIEWS.map((v) => (
            <button key={v.key} type="button" aria-pressed={v.key === view} onClick={() => onView(v.key)}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* the docked column exists only while there is a card to put in it — an empty 396px track
          beside the view (no rows; nothing selected yet) would be a column stating nothing */}
      <div className={`qcv-stage${docked && openCard ? " qcv-stage--docked" : ""}`} data-qcv="stagegrid"
        /* ⚠️ BOUND HERE, NOT ON THE DOCUMENT. The drawer bound the arrows only while open; a docked card
           is always open, so a global binding would take the arrows from the whole page. Skipped in
           anything editable, in a menu, and on the calendar's scroller (where ← → scroll time). */
        onKeyDown={(e) => {
          if (!onStep || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
          const t = e.target as HTMLElement;
          if (t.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [role='dialog'], .qcv-cal-box")) return;
          const inRows = !!t.closest("[role='listbox'], [role='option']");
          const delta = e.key === "ArrowRight" || (inRows && e.key === "ArrowDown") ? 1 : e.key === "ArrowLeft" || (inRows && e.key === "ArrowUp") ? -1 : 0;
          if (!delta) return;
          e.preventDefault();
          onStep(delta as 1 | -1);
        }}>
        <FramedCard as="section" className="qcv-ledger" probe="ledger" label="Queries">{body}</FramedCard>
        {docked ? openCard : null}
      </div>

      <div className="qcv-foot">
        <button type="button" className="qcv-export" disabled={!canExport} onClick={onExport}>Export CSV</button>
      </div>
      <div className="qcv-sr" role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {loading ? "" : "Queries loaded"}
      </div>
    </div>
  );
};
