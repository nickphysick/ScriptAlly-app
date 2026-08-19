/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AnchoredPanel — one anchoring for the filter menu, the sort menu and the snooze panel.
 *
 * ⚠️ IT REUSES `placeMenu`, WHICH IS THE PART §3 IS PROTECTING. The brief says render through
 * `PortalMenu` and not to write a third menu implementation. `PortalMenu`'s ITEM MODEL is the
 * board's card menu — `MenuItemId`, `MenuLeaf`, `weight`/`goes`/`danger` — and cannot express a
 * swatch, a live count, a multi-select tick or a footer with a reset link. Bending it into a
 * general menu framework to hold those would change the card menu for every caller.
 *
 * So the PLACEMENT and the DISMISSAL are shared — `placeMenu` decides right-aligned, viewport-
 * clamped, flipped-above; Escape, outside press and resize all close, and focus returns to the
 * trigger — and each caller renders its own contents. That is one anchoring serving three
 * surfaces, not a third implementation of the hard part. Recorded as a deviation from §3's letter.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeMenu } from "../../lib/todoMenu";
import "./todoFrame.css";

export interface AnchoredPanelProps {
  anchor: HTMLElement;
  ariaLabel: string;
  /** `menu` is the 11px-radius list chrome; `panel` is the 12px snooze/settings surface */
  variant?: "menu" | "panel";
  onClose: (returnFocus: boolean) => void;
  children: React.ReactNode;
}

export const AnchoredPanel: React.FC<AnchoredPanelProps> = ({
  anchor, ariaLabel, variant = "menu", onClose, children,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /* placed after first paint, because the height depends on the contents */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = placeMenu(anchor.getBoundingClientRect(),
      { w: el.offsetWidth, h: el.offsetHeight }, { w: window.innerWidth, h: window.innerHeight });
    setPos({ left: p.left, top: p.top });
  }, [anchor, children]);

  useEffect(() => {
    /* ⚠️ THE TRIGGER COUNTS AS OUTSIDE, deliberately — its own click toggles, and a
       pointerdown-close followed by a click-reopen would leave the button unable to close. */
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(true); }
    };
    const bail = () => onClose(false);
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", bail);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", bail);
    };
  }, [onClose]);

  return createPortal(
    <div className="tdf">
      <div
        ref={ref}
        role="dialog"
        aria-label={ariaLabel}
        className={variant === "menu" ? "menu open" : "panel open"}
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? "visible" : "hidden" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};
