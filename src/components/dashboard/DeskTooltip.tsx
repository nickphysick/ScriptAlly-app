/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeskTooltip — the settled desk's one tooltip surface (ref design-refs/dashboard-settled-desk.html).
 *
 * ⚠️ ONE SURFACE, THREE MODES, and they are a ladder rather than three components:
 *   plain      — a hover label. Pointer-events off, so it can never eat a click.
 *   interactive— the pointer may travel INTO it (a contact card with links). Closing is delayed by
 *                a grace period, or the cursor could never reach the thing it opened.
 *   pinned     — hover-out is ignored entirely. Closes on outside click, scroll or Escape.
 *
 * A second tooltip implementation is the thing this exists to prevent: two would have to agree
 * about placement, about the grace timer, and about which one is allowed to be on screen.
 *
 * ⚠️ THE POSITION MATHS IS NOT HERE — it is `lib/deskTooltip.ts`, because this repo has no jsdom
 * and a rendered position cannot be tested. This component measures, calls, and applies.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeTooltip, Rect } from "../../lib/deskTooltip";
import "./deskTooltip.css";

export type DeskTipMode = "plain" | "interactive" | "pinned";

export interface DeskTooltipProps {
  /** The anchor's viewport rect, measured by the caller at the moment it opens. */
  anchor: Rect | null;
  mode: DeskTipMode;
  children: React.ReactNode;
  /** Asked to close — by outside click, scroll, Escape, or the grace timer running out. */
  onClose: () => void;
  /** Labels the dialog when pinned. */
  label?: string;
}

export const DeskTooltip: React.FC<DeskTooltipProps> = ({ anchor, mode, children, onClose, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const pinned = mode === "pinned";

  /* ⚠️ MEASURE AFTER PAINT, BEFORE THE BROWSER SHOWS IT. useLayoutEffect so the first frame is
     already in the right place — with useEffect the tooltip renders at 0,0 and jumps. It stays
     invisible (`pos === null`) until measured, so the jump cannot be seen even on a slow frame. */
  useLayoutEffect(() => {
    if (!anchor || !ref.current) { setPos(null); return; }
    const box = ref.current.getBoundingClientRect();
    const { left, top } = placeTooltip(
      anchor,
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    setPos({ left, top });
  }, [anchor, children]);

  /* Escape closes from anywhere; a pinned card also closes on outside click and on scroll —
     scroll because a fixed-position card would otherwise float away from the glyph it belongs to. */
  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    if (!pinned) return () => document.removeEventListener("keydown", onKey);

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      // the anchor's own click toggles the pin — it must not also be read as "outside"
      if ((t as HTMLElement)?.closest?.("[data-desk-tip-anchor]")) return;
      close();
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [anchor, pinned, close]);

  // Focus moves into a pinned card so a keyboard can reach its links.
  useEffect(() => { if (pinned) ref.current?.focus(); }, [pinned]);

  if (!anchor || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className={`dk-tip${mode !== "plain" ? " live" : ""}${pinned ? " pinned" : ""}${pos ? " show" : ""}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0 }}
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? label : undefined}
      tabIndex={pinned ? -1 : undefined}
    >
      {children}
      {pinned && <div className="dk-pinnote">Click away to close</div>}
    </div>,
    document.body,
  );
};
