/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MobileSheet — the universal mobile chassis (Mobile Pass 1, baked decision 7; ref
 * design-refs/mobile-concept-v1.html frames 04 + 07). One bottom sheet serves the you-menu, the
 * record-response flow, toolbar popovers, and every future mobile fork — never a second sheet
 * implementation.
 *
 * Anatomy: dim scrim → sheet pinned to the viewport foot (content-capsule surface, capsule
 * border, top radius from the capsule radius token, grabber, safe-area bottom padding). The
 * sheet's own body scrolls when content is tall (capped below the top of the screen).
 *
 * Behaviour: Escape and scrim-tap dismiss; while open, BOTH the stage (#app-stage-scroll) and
 * the body are scroll-locked — the stage is the app's real scroll container post-AppShell, the
 * body lock is the belt-and-braces the stageScroll header prescribes. Entry is a pure CSS
 * animation (translate up; none under prefers-reduced-motion) — no JS timers drive motion, so
 * close is an immediate unmount.
 *
 * Portalled to document.body so a page's overflow/transform (StagePage's entry transform makes
 * slots containing blocks for fixed elements) can never clip or capture it.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { lockStageScroll } from "../../lib/stageScroll";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";

/**
 * Phone app v2 (Part 1D) — THE REF'S SHEET, OPT-IN (design-refs/phone-app-v2/src/app.css `.sheet` `.grab` `.scrim`;
 * app.js `bindSheetDrag`). Passing `pa` draws the phone app's sheet instead of the chassis above: the page colour (or
 * white), 24px top corners, the ref's scrim, and a grabber you can DRAG — detents at 64% of the screen and at full
 * (screen − 56); let go well below where you started and under 42% of the screen and it closes. The page underneath
 * is `inert` while it is open. Every existing caller passes nothing new and is unchanged.
 */
export interface PaSheetOpts {
  /** the sheet's opening height (ref default 62%); "auto" sizes to content */
  height?: string;
  white?: boolean;
  /** drag the grabber between the detents (default true) */
  drag?: boolean;
  /** pinned under the scrolling body */
  foot?: React.ReactNode;
  /** drawn above the body, inside the sheet's top (the menu's navy band); the grabber sits in it */
  head?: React.ReactNode;
  className?: string;
  /** the grabber on a navy head is inverted (ref `filter: invert(1)`) */
  grabOnNavy?: boolean;
  /** z-index of the layer (default 1000; the + sheet sits under the tab bar) */
  z?: number;
  /** body padding-bottom, for a sheet the tab bar floats over (ref + sheet: 100px) */
  bodyPadBottom?: number;
  /** make the page underneath inert (default true). The + sheet opts out: its own + in the tab bar is its close
      button, and the scrim already takes every other tap. */
  inertPage?: boolean;
}

export const MobileSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (the sheet draws no title of its own). */
  ariaLabel: string;
  children: React.ReactNode;
  /** opt in to the phone app v2 sheet (see PaSheetOpts) */
  pa?: PaSheetOpts;
}> = ({ open, onClose, ariaLabel, children, pa }) => {
  useEffect(() => {
    if (!open) return;
    const releaseStage = lockStageScroll();
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pa) {
        e.stopPropagation(); // the sheet is topmost — the key must not also reach page handlers
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      releaseStage();
      document.body.style.overflow = prevBody;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, pa]);
  /* a phone-app sheet stacks: the more sheet opens OVER the query sheet, and two window listeners would both hear
     the key (registration order decides, not what is on top). On the escape stack the later sheet wins a tie and the
     query drawer, at its own higher level, wins over both. */
  useEscapeLayer(open && !!pa, onClose, ESC_LEVEL.pageDrawer);

  if (!open || typeof document === "undefined") return null;
  if (pa) return <PaSheet ariaLabel={ariaLabel} onClose={onClose} opts={pa}>{children}</PaSheet>;

  return createPortal(
    <div className="sa-msheet-layer">
      <div className="sa-msheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sa-msheet" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <div className="sa-msheet-grab" aria-hidden="true" />
        <div className="sa-msheet-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

/** the phone app v2 sheet (opt-in through `pa`) */
const PaSheet: React.FC<{ ariaLabel: string; onClose: () => void; opts: PaSheetOpts; children: React.ReactNode }> = ({ ariaLabel, onClose, opts, children }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; h0: number; h: number; id: number } | null>(null);
  /* the page underneath is inert while the sheet is open (its own subtree is portalled outside #root) */
  useEffect(() => {
    if (opts.inertPage === false) return undefined;
    const root = document.getElementById("root");
    if (!root) return undefined;
    const was = root.inert;
    root.inert = true;
    return () => { root.inert = was; };
  }, [opts.inertPage]);
  const onDown = (e: React.PointerEvent) => {
    if (opts.drag === false) return;
    const sh = sheetRef.current;
    if (!sh) return;
    drag.current = { y0: e.clientY, h0: sh.offsetHeight, h: sh.offsetHeight, id: e.pointerId };
    sh.classList.add("drag");
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, sh = sheetRef.current;
    if (!d || !sh) return;
    const H = window.innerHeight;
    const h = Math.min(H - 40, Math.max(120, d.h0 - (e.clientY - d.y0)));
    d.h = h;
    sh.style.height = `${h}px`;
  };
  const onUp = () => {
    const d = drag.current, sh = sheetRef.current;
    drag.current = null;
    if (!d || !sh) return;
    sh.classList.remove("drag");
    const H = window.innerHeight, h = d.h;
    if (Math.abs(h - d.h0) < 4) return;
    if (h < d.h0 - 40 && h < H * 0.42) { onClose(); return; }
    const stops = [H * 0.64, H - 56];
    const to = stops.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a));
    sh.style.height = `${to}px`;
    sh.dataset.detent = to === stops[0] ? "half" : "full";
  };
  const grab = (
    <div className={`pa-grab${opts.grabOnNavy ? " on-navy" : ""}`} data-pa="grab" aria-hidden="true"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
  );
  return createPortal(
    <div className="pa-layer pa-sheet-layer" style={opts.z != null ? { zIndex: opts.z } : undefined}>
      <div className="pa-scrim" onClick={onClose} aria-hidden="true" data-pa="scrim" />
      <div ref={sheetRef} className={`pa-sheet${opts.white ? " white" : ""}${opts.className ? ` ${opts.className}` : ""}`}
        role="dialog" aria-modal="true" aria-label={ariaLabel} data-pa="sheet"
        style={{ height: opts.height ?? "62%" }}>
        {opts.head ? <div className="pa-sheet-head">{grab}{opts.head}</div> : grab}
        <div className="pa-sheet-body" style={opts.bodyPadBottom != null ? { paddingBottom: opts.bodyPadBottom } : undefined}>{children}</div>
        {opts.foot ? <div className="pa-sheet-foot">{opts.foot}</div> : null}
      </div>
    </div>,
    document.body,
  );
};
