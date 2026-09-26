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
/**
 * §2 (page header v1) — THE FOOT'S INSET IS ITS OWN, and 20 rather than 16.
 *
 * ⚠️ AND THE TOP ONE IS 16 FROM THE SCROLL CONTAINER, NOT 80. The brief states "bar height + 16
 * (80px from the scroll container's top)", which is true of the MOCK, where the bar scrolls inside
 * the same column as the content. In this app the bar is a flex sibling ABOVE the scroller, so the
 * scroller already starts at the bar's bottom — taking 80 from it would leave the rail sitting
 * 64px lower than the design draws it. The requirement is 16 below the bar, and that is what this
 * is; the arithmetic differs because the two shells put the bar in different places.
 */
export const RAIL_INSET_FOOT = 20;
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

/** §2 — the group the page and the card share: one centred grid, the card in its second column. */
export const GROUP_MAX = 1480;
export const GROUP_GAP = 28;

export interface RailBox { top: number; right: number; height: number }
/** What a sticky card needs: where to stick, and how tall to be once it has. */
export interface RailStick { stickyTop: number; height: number }

/**
 * §2 — the card's sticky offset and its height, both derived from the window's measured box.
 *
 * ⚠️ IT IS STICKY IN THE GROUP'S SECOND COLUMN, NOT FIXED TO THE WINDOW'S RIGHT EDGE. Fixed was
 * right while the page filled the window; with the content centred at 1480 it strands the card
 * against the screen while the ledger sits hundreds of pixels to its left. A grid track is the only
 * arrangement in which the two cannot drift apart.
 *
 * ⚠️ AND A STICKY `top` IS MEASURED FROM THE SCROLLPORT, NOT THE VIEWPORT. The card must come to
 * rest at `window.top + 16`, and the scrollport starts below the shell's bar — so the offset is the
 * difference between them, never the 16 itself. The mock writes `top: 16px` because in a drawn page
 * the scrollport IS the viewport; here that would park the card 16px below the bar and 60-odd
 * pixels above where it belongs.
 *
 * ⚠️ AND THE HEIGHT RUNS FROM THE CARD'S OWN TOP, which is the viewport law: `calc(100vh - 32px)`
 * is a guess at everything above it, and the card is not at y 0. Before it sticks that is where it
 * happens to sit; after, it is the rest position — `Math.max` is what makes one expression serve
 * both, with no state to keep.
 */
export function railStick(win: WinRect, scrollportTop: number, cardTop: number): RailStick | null {
  if (!(win.height > 0) || !(win.width > 0)) return null;
  if (win.width < RAIL_STACK_BELOW) return null;
  const rest = win.top + RAIL_INSET_Y;
  const floor = win.top + win.height - RAIL_INSET_FOOT;
  /**
   * ⚠️ WHETHER IT CAN BE PLACED IS DECIDED WITHOUT READING THE CARD'S OWN TOP — OR IT LATCHES.
   * Measured 24 Sep: the card starts stacked, so its top is hundreds of pixels below the window's
   * bottom; a height derived from that top is negative, the placement is refused, and the refusal
   * is what keeps it stacked. The state decides the measurement that decides the state, and the
   * page stayed one column for ever — silently, with every rule correct and the card rendering
   * perfectly well underneath the ledger.
   *
   * So the two questions are separated. CAN it be placed: does the window have room for a card at
   * all — width, and a gap between the two insets. HOW TALL: from the card's own top ONLY WHILE
   * THAT TOP IS INSIDE THE WINDOW, and from the rest position otherwise. Above the rest position
   * the two agree anyway (sticky clamps it there); below the window's foot the card is not placed,
   * so the height it is being given is the one it will have once it is.
   */
  if (!(floor - rest > 0)) return null;
  const top = cardTop >= rest && cardTop < floor ? cardTop : rest;
  return { stickyTop: Math.max(0, Math.round((rest - scrollportTop) * 10) / 10), height: Math.round((floor - top) * 10) / 10 };
}
/** What the window's own rect gives us. Read once, by whoever is placing something against it. */
export interface WinRect { top: number; left: number; right: number; height: number; width: number }

/** The placement, as a pure function of the window's rect — so it can be checked without a browser. */
export function railBox(win: WinRect, viewportW: number): RailBox | null {
  if (!(win.height > 0) || !(win.width > 0)) return null;
  if (win.width < RAIL_STACK_BELOW) return null;
  const height = win.height - RAIL_INSET_Y * 2;
  if (!(height > 0)) return null;
  return { top: win.top + RAIL_INSET_Y, right: Math.max(0, viewportW - win.right + RAIL_INSET_X), height };
}

/**
 * §7 · The expanded card's box: the rail's own, grown leftwards to the window's far edge.
 *
 * ⚠️ IT KEEPS THE RAIL'S TOP, BOTTOM AND RIGHT — that is what makes the growth read as the SAME
 * card rather than a new one appearing in its place. Only `left` is new, and it is the window's own
 * left plus the same 22px gutter the right pays, so the card is inset equally on both sides.
 *
 * ⚠️ AND THE REF'S `calc(100vw − 224px − 44px)` IS ITS OWN FRAME AGAIN. In a drawn page the viewport
 * IS the window and the nav's 224px is a constant; here the sidebar collapses and the window's box
 * already knows the answer. A width derived from `100vw` would be 224px too wide the moment the
 * sidebar shut, and the card would run off the left of the screen.
 */
export interface ExpandedBox { top: number; height: number; left: number; width: number }
export function expandedBox(win: WinRect, group: { left: number; right: number }, viewportH: number): ExpandedBox | null {
  if (!(win.width > 0)) return null;
  if (win.width < RAIL_STACK_BELOW) return null;
  /**
   * ⚠️ §4.1 · THE HEIGHT IS THE VIEWPORT'S, AND THIS IS THE ONE PLACE IT IS. Everywhere else in
   * this app a height taken from the viewport is the fault the house law is written against — but
   * the expanded card is an OVERLAY on a dimmed page and sits OVER the shell's bar, so the window
   * capsule is not its frame. Nothing is above it to be guessed at, which is the whole reason the
   * law exists; the exception is stated here rather than left to be rediscovered.
   */
  const height = viewportH - RAIL_INSET_Y * 2;
  const width = group.right - group.left;
  if (!(height > 0) || !(width > 0)) return null;
  /**
   * ⚠️ IT SPANS THE GROUP, NOT THE WINDOW (v65.2 §2). The card grows out of the rail, and the rail
   * is the group's second column — so growing to the window's edges would take it somewhere the
   * page it belongs to does not reach, and on a wide screen that is hundreds of pixels of desk on
   * each side.
   */
  /* ⚠️ NO `right`: the card is placed by left + width, and a third number about the same edge is a
     third thing that can disagree — and computing it would need `window`, which a pure function
     that a unit test calls does not have. */
  return { top: RAIL_INSET_Y, height, left: group.left, width };
}

/**
 * Read the shell's window capsule. `null` when it has not been laid out — never a zero rect.
 *
 * ⚠️ IT FALLS BACK TO THE DOCUMENT, AND THAT IS FOR THE PORTAL. The expanded card renders into
 * `document.body`, so walking UP from it never reaches the shell at all: `closest` found nothing,
 * the box came back null, and the card drew itself at the viewport's top-left corner — measured,
 * top 0 against the rail's 137.8. The window is a singleton in this shell, so asking the document
 * for it is not a guess; what would be a guess is assuming the caller is inside it.
 */
export function readWindow(el: Element | null): WinRect | null {
  const win = (el?.closest(".ws-window") ?? document.querySelector(".ws-window")) as HTMLElement | null;
  if (!win) return null;
  const r = win.getBoundingClientRect();
  return r.height > 0 && r.width > 0 ? { top: r.top, left: r.left, right: r.right, height: r.height, width: r.width } : null;
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
  const [stick, setStick] = useState<RailStick | null>(null);
  const placedRef = useRef<boolean | null>(null);

  const announce = useCallback((placed: boolean) => {
    if (placedRef.current === placed) return;
    placedRef.current = placed;
    onPlaced?.(placed);
  }, [onPlaced]);

  /**
   * ⚠️ THE CARD PUBLISHES ITS OWN STICKY OFFSET AND HEIGHT, because both are facts about boxes CSS
   * cannot see: the window capsule's top and bottom, and the scrollport the card is sticky within.
   * `top: 16px` and `calc(100vh - 32px)` are the mock's, and in a drawn page they are right because
   * its scrollport is its viewport. Here they would park the card 16px below the shell's bar and
   * make it a screen tall.
   *
   * ⚠️ AND IT IS RE-DERIVED ON SCROLL, not only on resize. The height depends on the card's own top,
   * which moves until it sticks — a value taken once at mount is right for the first frame and
   * wrong for every frame after it.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const win = el.closest(".ws-window") as HTMLElement | null;
    const port = el.closest(".wpg-scroll") as HTMLElement | null;
    const group = el.closest(".qcv-group") as HTMLElement | null;
    const read = () => {
      const w = readWindow(win);
      const portTop = port ? port.getBoundingClientRect().top : 0;
      const next = w ? railStick(w, portTop, el.getBoundingClientRect().top) : null;
      setStick((prev) => (prev && next && prev.stickyTop === next.stickyTop && prev.height === next.height ? prev : next));
      /* the group collapses to one column when the card cannot be placed — one measurement, both sides */
      group?.setAttribute("data-rail", next ? "beside" : "stacked");
      announce(!!next);
    };
    read();
    const onScroll = () => read();
    port?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (typeof ResizeObserver === "undefined") return () => { port?.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
    const ro = new ResizeObserver(read);
    if (win) ro.observe(win);
    ro.observe(document.documentElement);
    return () => { ro.disconnect(); port?.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [announce]);

  const showing = openCard ? "query" : "birdseye";
  return (
    <aside
      ref={ref}
      className={`qcv-rail${stick ? " qcv-rail--beside" : " qcv-rail--stacked"}`}
      data-qcv="rail"
      data-showing={showing}
      aria-label={openCard ? "The open query" : "Birds-eye view"}
      style={stick ? { ["--be-rail-top" as string]: `${stick.stickyTop}px`, ["--be-rail-h" as string]: `${stick.height}px` } : undefined}
    >
      {openCard ?? birdsEye}
    </aside>
  );
};
