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
import "./qcvEnter.css";

/**
 * ⚠️ `overview` IS A VIEW IN THE STATE AND NOT IN `QC_VIEWS` (v21 §1). The three entries below are
 * the things the PORTAL offers and the crumb can name; the Overview is where you are when you are
 * in none of them. Putting it in the table would have given the portal a tile that goes where you
 * already are, and the crumb a fourth segment naming the page it already names.
 */
export type QcView = "overview" | "list" | "calendar" | "grid";

/**
 * ⚠️ v21 (21 Sep): THE VIEWS ARE RENAMED, LABELS ONLY — the ruled table is **Ledger** (was List) and
 * the card grid is **List** (was Grid). The internal ids and the `?view=` values are deliberately
 * unchanged: a URL somebody bookmarked, and every `?view=grid` in the measurement suite, still mean
 * what they meant. Renaming the ids to match the labels would have been the tidy-looking change and
 * would have broken both, silently, for a word.
 *
 * ⚠️ AND THE ORDER IS THE PORTAL'S — Ledger, List, Calendar. It is the order the Overview's three
 * tiles are drawn in, and this table is what draws them, so the two cannot come apart.
 */
export type QcPortalView = Exclude<QcView, "overview">;
export const QC_VIEWS: readonly { key: QcPortalView; label: string }[] = [
  { key: "list", label: "Ledger" }, { key: "grid", label: "List" }, { key: "calendar", label: "Calendar" },
];
/** The label a view is called by, for the crumb and the portal. The Overview names nothing. */
export const qcViewLabel = (v: QcView): string => QC_VIEWS.find((x) => x.key === v)?.label ?? "";
export const DOCK_MIN_COLUMN = 900;

/**
 * ⚠️ VIEW MEMORY IS GONE (v21 §1.1), AND THE KEY IS CLEARED RATHER THAN LEFT (`clearQcViewMemory`).
 * The page used to remember your last view per device, so `/queries` opened wherever you happened
 * to leave it. v21 lands you in one known place; a key still sitting in `localStorage` would be a
 * fact about the reader that nothing reads, waiting to be honoured again by whoever finds it and
 * assumes it means something. So: the URL is the ONLY source, and the old key is removed on load.
 *
 * ⚠️ `?view=` IS STILL A REFLECTION, NOT A ROUTE — written with `replaceState` by `Queries.tsx`, for
 * the reasons recorded there. What has changed is that it is now the only input.
 */
export const QC_VIEW_KEY = "sa.qcView";
/**
 * The view the param-less URL means.
 *
 * ⚠️ ARRIVING AT `/queries` LANDS ON THE OVERVIEW, ALWAYS, unless the URL carries a deep link
 * (`?view=`, `?q=`, `?status=`) — §1.1. This constant is that rule, and `?view=` is written for
 * anything that is not it, so the Overview is the state the URL does not state.
 */
export const DEFAULT_QC_VIEW: QcView = "overview";
/**
 * The URL, and nothing else.
 *
 * ⚠️ `?view=board` IS ACCEPTED AND MEANS THE OVERVIEW (§1.2). The Board was retired in v11 and its
 * links were left pointing at a view that no longer exists; landing them on the Overview is the
 * closest honest answer, and it is the same answer anything unknown gets.
 */
export function readQcView(search: string): QcView {
  const ok = (v: string | null): v is QcPortalView => v === "list" || v === "calendar" || v === "grid";
  const fromUrl = new URLSearchParams(search).get("view");
  return ok(fromUrl) ? fromUrl : DEFAULT_QC_VIEW;
}
/** Remove the retired per-device memory, in both stores, so it cannot be honoured again. */
export function clearQcViewMemory(): void {
  try { localStorage.removeItem(QC_VIEW_KEY); } catch { /* a private window: nothing to clear */ }
  try { sessionStorage.removeItem(QC_VIEW_KEY); } catch { /* ditto */ }
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
  summary: React.ReactNode;
  sentence: React.ReactNode;
  /** The Overview's own body, rendered instead of everything below the head. */
  overview: React.ReactNode;
  view: QcView;
  onView: (v: QcView) => void;
  /** Leave the view: back to the Overview, clearing any selection. */
  onBack: () => void;
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
}> = ({ loading, blank = false, headLine, onLog, onRecord, logDisabled = false, logRef, summary, sentence, overview, view, onView, onBack, body, openCard, docked, onDocked, onStep, onExport, canExport, entering }) => {
  const inView = view !== "overview";
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
      role="region" aria-label="Query Centre" aria-busy={loading} data-qcv="page" data-view={view}>
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
        {/* ⚠️ A LINK, NOT A BUTTON, AND ONLY INSIDE A VIEW. It is how you leave, and it clears the
            selection on the way — the same act as the crumb's "Query Centre" segment. */}
        {inView && (
          <a
            className="qcv-backov"
            data-qcv="back-overview"
            href="/queries"
            onClick={(e) => { e.preventDefault(); onBack(); }}
          >
            <span aria-hidden="true">←</span> Back to overview
          </a>
        )}
      </header>

      {/* ⚠️ THE OVERVIEW REPLACES EVERYTHING BELOW THE HEAD (§4) — no sentence, no view, no docked
          card, no strip. It is the stat row and the portal. */}
      {!inView ? overview : <>
      {summary}

      {/* ⚠️ THERE IS NO VIEW SWITCH (§1.3). The portal's three tiles are how you enter a view, and
          the back link and the crumb are how you leave — so the segmented control that used to sit
          at the right of this row is GONE rather than hidden. Anyone re-adding it is adding a
          second way in, beside a portal whose whole job is to be the first. */}
      <div className="qcv-ctl" data-qcv="ctl">
        {sentence}
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
        <button type="button" className="qcv-export" disabled={!canExport || loading} onClick={onExport}>Export CSV</button>
      </div>
      </>}
      <div className="qcv-sr" role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {loading ? "" : "Queries loaded"}
      </div>
    </div>
  );
};
