/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcRail — the fixed card at the right of the Query Centre (v65 §2 and §6).
 *
 * It holds the Birds-eye view while nothing is chosen, and the open query while something is. One
 * card, one position, two contents — so choosing a row never moves the page's furniture.
 *
 * ⚠️ IT IS PLACED FROM THE WINDOW CAPSULE'S MEASURED BOX, NEVER THE VIEWPORT. The mockup writes
 * `position: fixed; top: 16; bottom: 16; right: 22` because in a drawn page the viewport IS the
 * window. Here the shell's window sits inside a bar, a strip and the app's own insets, so those
 * three constants would be a guess at everything above and beside the card — the house law this
 * repo has now paid for four times (the Tasks chassis's unreachable 21px, the packages builder's
 * sticky panel, the Overview's portal, the Overview's own scroller). So the card measures
 * `.ws-window` and takes its edges from it:
 *
 *     top    = window.top + 16
 *     bottom = window.bottom − 16      (expressed as a height, so nothing has to know its own size)
 *     right  = window.right − 22       (expressed as an inset from the viewport's right edge)
 *
 * ⚠️ AND A ZERO OR NEGATIVE RECT IS REFUSED RATHER THAN STORED. That reading is the page before
 * layout, or a window the loading cover has `display: none`d; writing it would publish a card with
 * no height and then leave it there. The card renders unplaced until a real measurement arrives,
 * which is one frame.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./qcvRail.css";

/** The card's own width, and the two insets, stated once (§2). */
export const RAIL_W = 340;
export const RAIL_INSET_Y = 16;
export const RAIL_INSET_X = 22;
/**
 * ⚠️ BELOW THIS THE CARD STOPS BEING FIXED AND STACKS UNDER THE PAGE (§2) — AND THE NUMBER IS NOT
 * THE REF'S 1180, WHICH IS A FACT ABOUT THE REF'S OWN FRAME. The mockup writes
 * `@media (max-width: 1180px)`, a VIEWPORT query, in a page whose window is the viewport less a
 * 224px nav and 44px of insets: 912 of window. Carried across as a window width, 1180 would have
 * stacked the card at a 1440 viewport, where this app's window measures 1128 — the everyday case.
 *
 * So it is DERIVED from what has to fit rather than copied: the card's reserved column (384) plus
 * the ledger's own four-column floor (536, `qcvList.css`'s container threshold + 1). Below that the
 * ledger would be dropping its date tile to make room for a card, which is the wrong way round.
 *
 * ⚠️ AND IT IS A WIDTH OF THE WINDOW, NOT OF THE VIEWPORT, because the sidebar collapses: the same
 * 1440 window gives 1128 of room open and 1312 shut, and only one of those has space for a card.
 */
export const RAIL_RESERVE = RAIL_W + RAIL_INSET_X * 2;
export const LEDGER_MIN = 536;
export const RAIL_STACK_BELOW = RAIL_RESERVE + LEDGER_MIN;

export interface RailBox { top: number; right: number; height: number }

/** The placement, as a pure function of the window's rect — so it can be checked without a browser. */
export function railBox(win: { top: number; right: number; height: number; width: number }, viewportW: number): RailBox | null {
  if (!(win.height > 0) || !(win.width > 0)) return null;
  if (win.width < RAIL_STACK_BELOW) return null;
  const height = win.height - RAIL_INSET_Y * 2;
  if (!(height > 0)) return null;
  return { top: win.top + RAIL_INSET_Y, right: Math.max(0, viewportW - win.right + RAIL_INSET_X), height };
}

export const QcRail: React.FC<{
  /** The Birds-eye view. Shown whenever nothing is chosen. */
  birdsEye: React.ReactNode;
  /** The open query's card. Replaces the Birds-eye view while a query is chosen (§6.5). */
  openCard?: React.ReactNode;
  /** Announced to the page so the ledger knows whether it has the column to itself. */
  onPlaced?: (placed: boolean) => void;
}> = ({ birdsEye, openCard, onPlaced }) => {
  const ref = useRef<HTMLElement>(null);
  const [box, setBox] = useState<RailBox | null>(null);
  const placedRef = useRef<boolean | null>(null);

  const announce = useCallback((placed: boolean) => {
    if (placedRef.current === placed) return;
    placedRef.current = placed;
    onPlaced?.(placed);
  }, [onPlaced]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const win = el.closest(".ws-window") as HTMLElement | null;
    /**
     * ⚠️ ONE MEASUREMENT OWNS BOTH SIDES. The page reserves the card's column with padding and the
     * card places itself; if the page asked a CSS media query and the card asked the window, the two
     * would disagree at every width between the two answers — 384px of nothing beside a stacked
     * card, or a fixed card over the ledger's last column. So the card publishes the reservation it
     * is actually taking, and the page reads it.
     */
    const page = el.closest(".qcv-page") as HTMLElement | null;
    const read = () => {
      const r = win?.getBoundingClientRect();
      const next = r ? railBox({ top: r.top, right: r.right, height: r.height, width: r.width }, window.innerWidth) : null;
      setBox((prev) => (prev && next && prev.top === next.top && prev.right === next.right && prev.height === next.height ? prev : next));
      page?.style.setProperty("--qcv-rail-pad", next ? `${RAIL_RESERVE}px` : "0px");
      announce(!!next);
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    if (win) ro.observe(win);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [announce]);

  /* the window's own top moves when chrome above it comes and goes; the box is cheap to re-read */
  useEffect(() => {
    const on = () => {
      const el = ref.current;
      const win = el?.closest(".ws-window") as HTMLElement | null;
      const r = win?.getBoundingClientRect();
      const next = r ? railBox({ top: r.top, right: r.right, height: r.height, width: r.width }, window.innerWidth) : null;
      setBox((prev) => (prev && next && prev.top === next.top && prev.right === next.right && prev.height === next.height ? prev : next));
      (el?.closest(".qcv-page") as HTMLElement | null)?.style.setProperty("--qcv-rail-pad", next ? `${RAIL_RESERVE}px` : "0px");
      announce(!!next);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [announce]);

  const showing = openCard ? "query" : "birdseye";
  return (
    <aside
      ref={ref}
      className={`qcv-rail${box ? " qcv-rail--fixed" : " qcv-rail--stacked"}`}
      data-qcv="rail"
      data-showing={showing}
      aria-label={openCard ? "The open query" : "Birds-eye view"}
      style={box ? { top: box.top, right: box.right, height: box.height, width: RAIL_W } : undefined}
    >
      {openCard ?? birdsEye}
    </aside>
  );
};

/**
 * The rail's head (§6.1), and — until phase 3 — all there is of the Birds-eye view.
 *
 * ⚠️ NO ⤢ YET, AND THAT IS DELIBERATE. §6.1 gives the head a round button that opens the expanded
 * view; the expanded view arrives in phase 4. A button drawn now would be either disabled (a
 * control advertising a thing that does not exist) or dead (worse: it looks live and does nothing,
 * which is the fault this repo records against an undo that restores nothing). It arrives with what
 * it opens.
 *
 * ⚠️ AND THERE IS NO "coming soon", NO DASHED BOX AND NO SKELETON HELD FOREVER. A card with its
 * real title and nothing under it is an honest unfinished state; placeholder chrome on a page that
 * is otherwise finished teaches a reader that the page is unfinished everywhere.
 */
export const QcBirdsEyePlaceholder: React.FC = () => (
  <div className="qcv-rc" data-qcv="railcal">
    <div className="qcv-rc-head" data-qcv="railcal-head">
      <b className="qcv-rc-ttl">Birds-eye view</b>
    </div>
  </div>
);
