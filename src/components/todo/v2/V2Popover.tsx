/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A panel one of the page's controls opens (To-do list v2). Dismissal is the house idiom — a
 * `pointerdown` outside in CAPTURE, plus Escape — and the element that opened it counts as inside,
 * or its own click would close the panel on the press and re-open it on the click.
 *
 * ⚠️ THE OPENER IS NAMED BY SELECTOR RELATIVE TO THE PANEL'S PARENT (`opener`), because the header's
 * Set-aside button belongs to `PageHeader` and takes no ref. Absent, the panel's parent is the
 * anchor — which is how the controls row mounts it, inside the button's own wrapper.
 */
import React, { useEffect, useRef } from "react";

export const V2Popover: React.FC<{
  className?: string;
  label: string;
  onClose: () => void;
  opener?: string;
  children: React.ReactNode;
}> = ({ className, label, onClose, opener = ".ph-secondary", children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const el = ref.current;
      if (!el) return;
      if (el.contains(t)) return;
      const anchor = el.parentElement?.querySelector(opener);
      if (anchor && anchor.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, opener]);
  return (
    <div ref={ref} className={`tdv2-pop${className ? ` ${className}` : ""}`} role="dialog" aria-label={label}>
      {children}
    </div>
  );
};
