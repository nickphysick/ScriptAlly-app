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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../shell/primitives.css";
import { PageHeader, type LivingHeader } from "../../shell/PageHeader";
import { QC_COURIER_DISC } from "./qcArt";
import { QcOpenHeader } from "./QcOpenHeader";
import "./qcvBand134.css";
import type { Faces } from "../../../lib/qcFaces";
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

/** v134 §3 — the banner's two lines, exactly; the break falls after "find them,". */
export const QC_BANNER_LINES = [
  "One list to log them all, one list to find them,",
  "one list to hold your queries and in the darkness mind them.",
] as const;

export const QcCentre: React.FC<{
  loading: boolean;
  /** The first 150ms of a load: the real frames with nothing in them. */
  blank?: boolean;
  headLine: React.ReactNode;
  /** Living headers — the count and the copy function; when set, the hero's two lines follow them. */
  living?: LivingHeader;
  onLog: () => void;
  /** The global Record-a-response flow, opened with no query chosen (the dashboard tile's). */
  onRecord: () => void;
  /** True while a query is already being written. */
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  /** v134 §1 — the header's faces (desktop), and what a disc opens */
  faces?: Faces | null;
  /** the With you court's count, for the header's stamp (header panel v2) */
  withYou?: number | null;
  onFace?: (id: string) => void;
  sentence: React.ReactNode;
  /** The three court tiles (§4), between the hero and the sentence. */
  courts: React.ReactNode;
  /**
   * v126 §4 — the slim bar that pins once the banner has scrolled away, given whether it should
   * show. The page renders it; this frame decides when, from the scroller it sits in.
   */
  sticky?: (stuck: boolean) => React.ReactNode;
  /**
   * The carousel (v126 §3), between the desk and the list. It replaces the fan, which dealt a court
   * over the page; the desk now selects what the carousel shows and nothing else.
   */
  carousel?: React.ReactNode;
  /** v126 §5 — the app footer, the group's last row; opt-in, and today only this page mounts it. */
  footer?: React.ReactNode;
  /**
   * The Birds-eye view, expanded (§7). It portals itself, so this is only its mount —
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
  /**
   * v131 (desktop): the compact hero, the headerless desk 22 below it, "Recently updated" 44 below the
   * desk and "Your queries" 44 below that. The open banner, the blush tray and the sticky bar are not
   * drawn — the group headers pin instead. Below 768px the v126 page is unchanged.
   */
  v131?: boolean;
}> = ({ loading, blank = false, headLine, living, onLog, onRecord, logDisabled = false, logRef, faces = null, onFace, withYou = null, sentence, courts, sticky, carousel, footer, overlay, onClearSelection, body, hasOpen = false, docked, onDocked, onStep, onExport, canExport, entering, v131 = false }) => {
  const groupRef = useRef<HTMLDivElement>(null);
  /**
   * ⚠️ MEASURED ON THE GROUP, NOT THE PAGE COLUMN (v65.2 §2) — AND THE QUESTION DID NOT CHANGE.
   * `DOCK_MIN_COLUMN` asks whether there is room for a ledger AND a card beside it, which was a
   * question about `.qcv-page` only while the page carried the card's reservation as its own
   * padding. As a grid TRACK that reservation left the page's box: at a 1440 window the page
   * measured 1172 and now measures 760, so the same 900 suddenly meant "too narrow to dock" on the
   * everyday width. Measured: the rail showed the Birds-eye view with a query chosen, `?q=` opened
   * nothing, and the title dropped to its 36px narrow size — four failures, one number read off the
   * wrong box.
   */
  useLayoutEffect(() => {
    const el = groupRef.current;
    if (!el) return undefined;
    const read = () => { const w = el.getBoundingClientRect().width; if (w > 0) onDocked(w >= DOCK_MIN_COLUMN); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onDocked]);

  /**
   * v126 §4 — STUCK IS DERIVED FROM THE BANNER'S BOX ON EVERY SCROLL, never an observer: a missed
   * intersection event is permanent, a reading taken on the next scroll cannot go stale. The
   * scroller is the grid's own (`.wpg-scroll`), found from the group, so a page that scrolls
   * somewhere else would simply never stick rather than stick wrongly.
   */
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const group = groupRef.current;
    const scroller = group?.closest<HTMLElement>(".wpg-scroll");
    if (!group || !scroller) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const banner = group.querySelector<HTMLElement>('[data-qcv="lbanner"]');
      if (!banner) { setStuck(false); return; }
      const b = banner.getBoundingClientRect();
      setStuck(b.height > 0 && b.bottom < scroller.getBoundingClientRect().top + 4);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    scroller.addEventListener("scroll", on, { passive: true });
    return () => { scroller.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    /**
     * §2 — THE PAGE AND THE BIRDS-EYE CARD ARE ONE CENTRED GROUP. The card used to be placed against
     * the window's right edge, which is right while the page fills the window and strands it on a
     * wide screen once the content is centred at 1480. A grid track states the width once.
     */
    <div ref={groupRef} className={`qcv-group qcv-group--one qcv-own${v131 ? " qc13" : ""}`} data-qcv="group" data-v={v131 ? "131" : undefined}>
      {/**
        * §2 (page header v2) — THE HEADER SPANS THE WHOLE COLUMN, both of the group's tracks, and the
        * Birds-eye rail starts in the row BELOW its rule. It used to sit inside `.qcv-page`, in the
        * first track only, which is why v1's rule and art stopped short of the rail.
        *
        * §3.1 (page header v1) — THE PAGE'S OWN HERO IS REPLACED BY THE SHARED HEADER. What it
        * drew — a 48px title, the facts line, two pills and the courier beside them — is what the
        * full header draws for every page that has one, so the page states its content and nothing
        * about its arrangement. The facts line becomes the intro; the art is unchanged.
        */}
      {v131 ? (
        /* v133 — THE OPEN HEADER on the desktop: no band, no card, no disc, and the fixed line in
           place of the living facts sentence (the desk carries those facts). */
        <QcOpenHeader living={living} loading={loading} onLog={onLog} onRecord={onRecord} logDisabled={logDisabled} logRef={logRef} faces={faces} onFace={onFace} withYou={withYou} />
      ) : (
      /* below 768px the v126 page is unchanged: the shared header's band and its courier disc */
      <PageHeader
        variant="full"
        title="Query Centre"
        description={headLine}
        living={living}
        primaryRef={logRef}
        primary={{ label: "+ Log a query", onClick: onLog, disabled: logDisabled || loading }}
        secondary={{ label: "Record a response", onClick: onRecord, disabled: loading }}
        band
        card
        art={<img src={`${QC_COURIER_DISC.src}?v=${QC_COURIER_DISC.version}`} width={QC_COURIER_DISC.width} height={QC_COURIER_DISC.height} alt="" />}
      />
      )}
    {/**
      * §1 (v95) — THE DESK IS A FULL-SPAN BAND, like the header above it, and the rail starts in
      * the row BELOW it. It used to render inside `.qcv-page`, in the first track only, which is
      * why the three tiles were 799px wide where the reference draws a 1167px desk — and at a third
      * of 799 a section is 266px, which will not hold a 64px numeral beside a 19px name above an
      * italic line above a foot of four discs and a date. The reference's own sections are 388px.
      *
      * ⚠️ IT TOUCHES THE HERO NOT AT ALL. The header already spanned both tracks (page header v2),
      * so this adds a third row to a grid that already had two; the hero's width, type, art and
      * copy are the living-headers pack's and are unchanged.
      */}
    {courts}
    {carousel}
    {/* v134 §3 — THE BANNER above "Your queries" (desktop): a blush band the sheet's full width, its bottom
        edge an arrow pointing down at the list. The copy is exact, on two lines. */}
    {v131 && (
      <section className="qc134-ban" data-qcv="banner" aria-label="A note" data-loading={loading ? "" : undefined}>
        <p className="qc134-ban-p"><span>{QC_BANNER_LINES[0]}</span> <span>{QC_BANNER_LINES[1]}</span></p>
      </section>
    )}
    <div className={`qcv-page qcv-own${v131 ? " qcw" : ""}${docked === false ? " qcv-page--narrow" : ""}${loading ? " qcv-page--loading" : ""}${loading && blank ? " qcv-page--blank" : ""}${entering ? " qcv-page--enter" : ""}`}
      role="region" aria-label="Query Centre" aria-busy={loading} data-qcv="page" data-ws={v131 ? "true" : undefined}>

      {/* v126 §4 — THE OPEN BANNER: the list's head, re-housed. No fill, no container; the controls
          are the list's own and their menus have not changed. */}
      {v131 ? sentence : (
      <div className="qcv-lbw" data-qcv="ctl">
        {sentence}
      </div>
      )}

      {/* v126 §4 — THE WORKSPACE: blush, radius 22, the two bands and their rows inside it. The rail
          is gone, so it spans the whole content column. */}
      <div className={v131 ? "qc13-work" : "qcv-work"} data-qcv={v131 ? "listwrap" : "workspace"}>
        {!v131 && sticky?.(stuck)}
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
      </div>
      <div className="qcv-sr" role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {loading ? "" : "Queries loaded"}
      </div>
    </div>
    {footer}
    {overlay}
    </div>
  );
};
