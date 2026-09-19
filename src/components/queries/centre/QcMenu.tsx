/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcMenu — the sentence's menu (Query Centre v11). One panel, one or more radio groups.
 *
 * Portalled to `body` and placed `fixed` under its anchor, so no scrollport clips it. It closes on a
 * choice, an outside press, a scroll, a resize and Escape; focus goes to the checked row on open and
 * back to the anchor on close — unless the choice itself moved focus somewhere.
 *
 * ⚠️ ESCAPE IS CONSUMED ON THE CAPTURE PHASE. The page beneath owns an Escape of its own (it closes
 * a drawer, discards a draft); dismissing a menu must never reach past the menu's business.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface QcMenuItem { key: string; label: string; count?: number; swatch?: string | null }
export interface QcMenuGroup { heading?: string; current: string; items: readonly QcMenuItem[]; onPick: (key: string) => void }

export const QcMenu: React.FC<{ anchor: HTMLElement | null; label: string; groups: readonly QcMenuGroup[]; onClose: () => void }> = ({ anchor, label, groups, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const r = anchor.getBoundingClientRect();
    const w = ref.current.offsetWidth;
    const top = r.bottom + 6;
    setPos({ top, left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)), maxH: Math.max(160, window.innerHeight - top - 16) });
  }, [anchor]);

  useEffect(() => {
    const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    (items().find((b) => b.getAttribute("aria-checked") === "true") ?? items()[0])?.focus();
    const close = () => onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); onClose(); anchor?.focus(); return; }
      if (e.key === "Tab") { onClose(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
      const list = items(); if (!list.length) return;
      e.preventDefault();
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : e.key === "ArrowDown" ? (at + 1) % list.length : (at <= 0 ? list.length - 1 : at - 1);
      list[next]?.focus();
    };
    /* a scroll INSIDE the menu is the menu's own; anything else moves the anchor out from under it */
    const onScroll = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} className="qcv-menu" role="menu" aria-label={label} data-qcv="menu"
      style={pos ? { top: pos.top, left: pos.left, maxHeight: pos.maxH } : { top: 0, left: 0, visibility: "hidden" }}>
      {groups.map((g, gi) => (
        <React.Fragment key={g.heading ?? gi}>
          {gi > 0 && <div className="qcv-menu-sep" role="separator" />}
          {g.heading && <p className="qcv-menu-h" id={`qcv-menu-h-${gi}`}>{g.heading}</p>}
          <div role="group" aria-labelledby={g.heading ? `qcv-menu-h-${gi}` : undefined}>
            {g.items.map((it) => (
              <button key={it.key} type="button" role="menuitemradio" aria-checked={it.key === g.current}
                onClick={() => { g.onPick(it.key); onClose(); anchor?.focus(); }}>
                {it.swatch ? <span className="qcv-menu-sw" style={{ background: it.swatch }} aria-hidden="true" /> : null}
                <span className="qcv-menu-l">{it.label}</span>
                {it.count !== undefined && <span className="qcv-menu-n">{it.count}</span>}
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>,
    document.body,
  );
};
