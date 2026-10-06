/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HalfDrawer — the half-screen drawer from the right, over a dimmed page (Contact list v13 §6, ruling
 * Q1: the v126 Birds-eye drawer's construction, lifted). The page supplies the head, the body and the
 * foot; this owns the width, the dim, the slide, the portal and the Escape layer.
 *
 * ⚠️ ESCAPE IS A LAYER ON THE ONE STACK (`ESC_LEVEL.pageDrawer`), UNDER THE AGENT CARD. The card opens
 * over the drawer (a fix's card link), so Escape closes the card first and the drawer on the next
 * press; a modal the drawer opens sits at `pageModal`, above it.
 *
 * ⚠️ THE DIM FOLLOWS THIS COMPONENT ON BOTH PAGES (the rulings' one exception to "the mock wins").
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import "./halfDrawer.css";

export const HalfDrawer: React.FC<{
  probe: string;
  open: boolean;
  onClose: () => void;
  label: string;
  /** `min(780px, 56vw)` on the Contact list */
  width: string;
  head: React.ReactNode;
  foot?: React.ReactNode;
  /** the drawer's own scroller */
  bodyRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
  /** an overlay the drawer opens (a modal) — rendered beside it, in the same portal */
  over?: React.ReactNode;
}> = ({ probe, open, onClose, label, width, head, foot, bodyRef, children, over }) => {
  /* mounted, then slid in on the next frame, so the entrance transition has a start to run from */
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) { setShown(false); return; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageDrawer);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className={`hdr-dim${shown ? " is-in" : ""}`} data-hdr="dim" data-hdr-of={probe} onClick={onClose} aria-hidden="true" />
      <aside
        className={`hdr${shown ? " is-in" : ""}`} data-hdr={probe} role="dialog" aria-modal="true" aria-label={label}
        style={{ width }}
      >
        <header className="hdr-head" data-hdr="head">{head}</header>
        <div className="hdr-body" data-hdr="body" ref={bodyRef}>{children}</div>
        {foot != null && <footer className="hdr-foot" data-hdr="foot">{foot}</footer>}
      </aside>
      {over}
    </>,
    document.body,
  );
};
