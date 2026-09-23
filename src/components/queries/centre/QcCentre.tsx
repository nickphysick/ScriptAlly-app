/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCentre — the Query Centre's page (v65): head, the sentence, then the stage — the ledger's frame
 * with the open query docked to its right.
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
import "../../shell/primitives.css";
import "./qcvPage.css";
import "./qcvEnter.css";

export const DOCK_MIN_COLUMN = 900;

/**
 * ⚠️ THE VIEWS ARE GONE (v65 §1). There is no Overview, no portal, no view switch and no card grid:
 * the LEDGER is the page, and the calendar is the rail's Birds-eye view rather than a state the
 * whole page can be in. `QcView`, `QC_VIEWS`, `qcViewLabel`, `DEFAULT_QC_VIEW` and `readQcView` are
 * deleted rather than left exported — a table naming three views, on a page with one, is the kind
 * of thing the next reader builds a switch from.
 *
 * ⚠️ VIEW MEMORY STAYS DEAD, AND THE KEY IS STILL CLEARED (`clearQcViewMemory`). The page used to
 * remember your last view per device. A key still sitting in `localStorage` would be a fact about
 * the reader that nothing reads, waiting to be honoured again by whoever finds it and assumes it
 * means something — so it is removed on load, and goes on being removed now that there is not even
 * a view for it to name.
 */
export const QC_VIEW_KEY = "sa.qcView";
/** Remove the retired per-device memory, in both stores, so it cannot be honoured again. */
export function clearQcViewMemory(): void {
  try { localStorage.removeItem(QC_VIEW_KEY); } catch { /* a private window: nothing to clear */ }
  try { sessionStorage.removeItem(QC_VIEW_KEY); } catch { /* ditto */ }
}

/**
 * `?view=` IS ACCEPTED AND IGNORED, WITH ONE MEANING LEFT: `calendar` (and the `cal` alias) opens
 * the page with the Birds-eye view expanded. Every other value — `list`, `grid`, `board`, anything
 * — is accepted and lands on the ledger, which is where the page lands anyway.
 *
 * ⚠️ IT IS READ, NEVER WRITTEN. The old reflection wrote the view back with `replaceState` on every
 * change; with one page there is nothing to reflect, and a param the app keeps re-asserting is a
 * second writer on a URL `?q=` already owns. A bookmark still works; the app stops editing it.
 */
export function readBirdsEyeOpen(search: string): boolean {
  const v = new URLSearchParams(search).get("view");
  return v === "calendar" || v === "cal";
}

export const QcCentre: React.FC<{
  loading: boolean;
  /** The first 150ms of a load: the real frames with nothing in them. */
  blank?: boolean;
  headLine: React.ReactNode;
  onLog: () => void;
  /** The global Record-a-response flow, opened with no query chosen (the dashboard tile's). */
  onRecord: () => void;
  /** True while a query is already being written. */
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  sentence: React.ReactNode;
  /** The three court tiles (§4), between the hero and the sentence. */
  courts: React.ReactNode;
  /**
   * The fixed card at the right (§2, §6): the Birds-eye view, or the open query.
   *
   * ⚠️ IT IS HANDED IN WHOLE, ALREADY DECIDED. The page reserves its column with padding and places
   * nothing: the card measures the window and places itself. Passing its CONTENTS instead would put
   * the choice between Birds-eye and a query in the page's layout component, which knows about
   * neither.
   */
  rail: React.ReactNode;
  /** The open fan, if a court tile has dealt one. It portals itself; this is only its mount. */
  fan?: React.ReactNode;
  /**
   * The Birds-eye view, expanded (§7). Like the fan it portals itself, so this is only its mount —
   * but it needs one: rendered inside the rail it would unmount the moment the rail showed a query.
   */
  overlay?: React.ReactNode;
  /** Clear the selection: Escape, and the card's own ✕. */
  onClearSelection?: () => void;
  /** The ledger. */
  body: React.ReactNode;
  /** Whether a query is open — Escape has something to close, and the rail is showing it. */
  hasOpen?: boolean;
  docked: boolean | null;
  onDocked: (docked: boolean) => void;
  /** ← / → (and ↑ / ↓ in a list of rows) step the open query — bound to the STAGE, so only inside the view or the card. */
  onStep?: (delta: 1 | -1) => void;
  onExport: () => void;
  canExport: boolean;
  entering: boolean;
}> = ({ loading, blank = false, headLine, onLog, onRecord, logDisabled = false, logRef, sentence, courts, rail, fan, overlay, onClearSelection, body, hasOpen = false, docked, onDocked, onStep, onExport, canExport, entering }) => {
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
    <div ref={rootRef} className={`qcv-page qcv-own${docked === false ? " qcv-page--narrow" : ""}${loading ? " qcv-page--loading" : ""}${loading && blank ? " qcv-page--blank" : ""}${entering ? " qcv-page--enter" : ""}`}
      role="region" aria-label="Query Centre" aria-busy={loading} data-qcv="page">
      {/* ⚠️ THE ACTIONS ARE A ROW OF THEIR OWN, UNDER THE FACTS LINE (v21 §2) — not one pill on the
          title's line. Two of them now, and a pill beside a 48px title pins the head's height to the
          taller of the two and leaves the second nowhere to go. */}
      <header className="qcv-head" data-qcv="head">
        <h1 className="qcv-title" data-qcv="head-title">Query Centre</h1>
        <p className="qcv-line" data-qcv="head-line">{headLine}</p>
        <div className="qcv-hr" data-qcv="head-actions">
          <button ref={logRef} type="button" className="sp-inkpill qcv-log" data-qcv="head-cta" onClick={onLog} disabled={logDisabled || loading}>
            <span className="sp-inkpill-l">+ Log a query</span>
          </button>
          {/* ⚠️ THE GLOBAL RECORD-A-RESPONSE IS BACK WITHIN REACH HERE. Deleting `+ New` from the top
              bar took the only chrome that offered it with no query chosen — flagged in the v11
              report as stranded, and this is the fix. It opens the same flow the dashboard tile does. */}
          <button type="button" className="qcv-ghostpill" data-qcv="head-record" onClick={onRecord} disabled={loading}>
            <span>Record a response</span>
          </button>
        </div>
      </header>

      {/* §4 — the three courts, 18px under the pills */}
      {courts}

      {/* ⚠️ THERE IS NO VIEW SWITCH AND NOTHING TO SWITCH (v65 §1). The ledger IS the page; the
          calendar is the rail's Birds-eye view. A segmented control here would offer a state the
          page cannot be in. */}
      <div className="qcv-ctl" data-qcv="ctl">
        {sentence}
      </div>

      {/* ⚠️ ONE COLUMN (§5). The open query lives in the rail now, so the ledger keeps the page's
          whole width whatever is chosen — and selecting a row no longer narrows it by 396px. */}
      <div className="qcv-stage" data-qcv="stagegrid"
        /* ⚠️ BOUND HERE, NOT ON THE DOCUMENT. The drawer bound the arrows only while open; a docked card
           is always open, so a global binding would take the arrows from the whole page. Skipped in
           anything editable, in a menu, and on the calendar's scroller (where ← → scroll time). */
        onKeyDown={(e) => {
          if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
          const t = e.target as HTMLElement;
          if (t.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [role='dialog'], .qcv-cal-box")) return;
          /* ⚠️ ESCAPE CLOSES THE OPEN QUERY, and only while one is open — otherwise the key would
             be swallowed on a page that has nothing to close, reaching past whatever else wants it. */
          if (e.key === "Escape") {
            if (!hasOpen || !onClearSelection) return;
            e.preventDefault();
            onClearSelection();
            return;
          }
          if (!onStep) return;
          const inRows = !!t.closest("[role='listbox'], [role='option']");
          const delta = e.key === "ArrowRight" || (inRows && e.key === "ArrowDown") ? 1 : e.key === "ArrowLeft" || (inRows && e.key === "ArrowUp") ? -1 : 0;
          if (!delta) return;
          e.preventDefault();
          onStep(delta as 1 | -1);
        }}>
        {/* ⚠️ NOT A `FramedCard` ANY MORE (§5): the ledger has no frame, because the ROWS are the
            cards. What is left is a size container — the row's container query needs one, and the
            frame used to be it. */}
        <section className="qcv-ledger" data-qcv="ledger" aria-label="Queries">{body}</section>
      </div>

      <div className="qcv-foot">
        <button type="button" className="qcv-export" disabled={!canExport || loading} onClick={onExport}>Export CSV</button>
      </div>
      {rail}
      {fan}
      {overlay}
      <div className="qcv-sr" role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {loading ? "" : "Queries loaded"}
      </div>
    </div>
  );
};
