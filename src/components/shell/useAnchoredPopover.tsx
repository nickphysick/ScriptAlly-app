/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1, Part A — A POP-UP ANCHORED TO A CONTROL, RENDERED IN THE ONE LAYER (`lib/popoverLayer`).
 *
 *   `useAnchoredPopover(anchorRef, popRef, open, { align, gap })` → the fixed style to put on the pop-up, placed from
 *   the anchor's `getBoundingClientRect()`. It re-places on scroll (capture — every page owns a different scroller), on
 *   resize, and when a ResizeObserver sees the anchor or the pop-up change size. It flips above the anchor when there is
 *   no room below, keeps an 8px margin from every edge of the window, and caps its height at the window less 24px (`--pop-max`; the
 *   pop-up's inner frame scrolls against it).
 *   `<AnchoredPortal>` renders its children into the layer.
 *
 * ⚠️ HIDDEN UNTIL PLACED. The first frame has no measured size; a pop-up drawn at 0,0 for that frame is a flash in the
 *    window's corner, so `visibility: hidden` until the first placement lands.
 */
import React, { useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { popoverLayer } from "../../lib/popoverLayer";
import "./popoverLayer.css";

export interface AnchoredOptions {
  /** which edge of the anchor the pop-up lines up with: "end" = right edges together */
  align?: "start" | "center" | "end";
  /** px between the anchor and the pop-up */
  gap?: number;
}

export const POP_MARGIN = 8;
export const POP_CAP = 24;

export interface Placement {
  top: number;
  left: number;
  maxHeight: number;
  above: boolean;
  /** the anchor's centre, in px from the pop-up's right edge (for a caret) */
  caretRight: number;
}

/** Pure: where a pop-up of `size` goes against an anchor `a` in a window `vw`×`vh`. */
export function placeAnchored(
  a: { left: number; top: number; right: number; bottom: number; width: number },
  size: { width: number; height: number },
  vw: number, vh: number,
  { align = "end", gap = 8 }: AnchoredOptions = {},
): Placement {
  const maxHeight = Math.max(0, vh - POP_CAP);
  const h = Math.min(size.height, maxHeight);
  const w = size.width;
  let left = align === "end" ? a.right - w : align === "start" ? a.left : a.left + a.width / 2 - w / 2;
  left = Math.max(POP_MARGIN, Math.min(left, vw - POP_MARGIN - w));
  const belowTop = a.bottom + gap;
  const fitsBelow = belowTop + h <= vh - POP_MARGIN;
  const aboveTop = a.top - gap - h;
  const above = !fitsBelow && aboveTop >= POP_MARGIN;
  let top = above ? aboveTop : belowTop;
  /* neither fits: below, pulled up so the foot stays 8px inside the window */
  if (!above && !fitsBelow) top = Math.max(POP_MARGIN, vh - POP_MARGIN - h);
  const caretRight = left + w - (a.left + a.width / 2);
  return { top, left, maxHeight, above, caretRight };
}

export function useAnchoredPopover(
  anchorRef: React.RefObject<HTMLElement | null>,
  popRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  opts: AnchoredOptions = {},
): { style: React.CSSProperties; placement: Placement | null; replace: () => void } {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const { align = "end", gap = 8 } = opts;

  const replace = useCallback(() => {
    const a = anchorRef.current, p = popRef.current;
    if (!a || !p) return;
    const r = a.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const next = placeAnchored(r, { width: p.offsetWidth, height: p.scrollHeight }, window.innerWidth, window.innerHeight, { align, gap });
    setPlacement((prev) => (prev && prev.top === next.top && prev.left === next.left && prev.maxHeight === next.maxHeight && prev.above === next.above && prev.caretRight === next.caretRight ? prev : next));
  }, [anchorRef, popRef, align, gap]);

  useLayoutEffect(() => {
    /* closed: the last placement stays, so a menu that fades out does so where it was */
    if (!open) return undefined;
    replace();
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(replace); };
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(on) : null;
    if (ro) { if (anchorRef.current) ro.observe(anchorRef.current); if (popRef.current) ro.observe(popRef.current); }
    /* the pop-up's size is known after its first paint */
    raf = requestAnimationFrame(replace);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
      ro?.disconnect();
    };
  }, [open, replace, anchorRef, popRef]);

  const style: React.CSSProperties = placement
    /* ⚠️ THE HEIGHT CAP IS A VARIABLE, NOT `overflow` ON THIS ELEMENT: a scrolling box clips its own caret (a
       `::before` hanging 6px above it). Each pop-up scrolls its inner frame against `--pop-max`. */
    ? { position: "fixed", top: placement.top, left: placement.left, right: "auto", maxHeight: placement.maxHeight,
        ["--pop-max" as string]: `${placement.maxHeight}px`,
        ["--pop-caret" as string]: `${Math.max(14, placement.caretRight - 6)}px` }
    : { position: "fixed", top: 0, left: 0, right: "auto", visibility: "hidden" };
  return { style, placement, replace };
}

/** Renders its children into the one pop-up layer — or in place where there is no document (a string render). */
export const AnchoredPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const layer = popoverLayer();
  return layer ? createPortal(children, layer) : <>{children}</>;
};
