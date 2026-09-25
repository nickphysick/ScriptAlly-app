/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcQueryModal — THE one way a query is opened on the Query Centre (v65.6 §1).
 *
 * ⚠️ IT IS A VIEWPORT MODAL, NOT A PANEL INSIDE ANYTHING. Every door — a ledger row, a fanned card,
 * `?q=` in the URL, and a bar or a name in the expanded Birds-eye view — arrives here, and the
 * scrim covers the WHOLE screen: the sidebar, the top bar, the page, the rail, and the expanded
 * card including its blush header. The version this replaces drew the card inside the expanded
 * view's own body, so the scrim stopped at the calendar panel and the header above it stayed
 * bright — a card that looked focused with a lit strip across the top of the screen.
 *
 * ⚠️ AND IT PORTALS TO `document.body`, which is what makes that possible. Nothing inside the
 * expanded view can cover the expanded view's own chrome, whatever its `z-index`: a descendant
 * cannot out-stack its ancestor's box. The card sits at 80 against the calendar sheet's 70, in the
 * same stacking context, because both are children of the body.
 *
 * ⚠️ AND A PORTAL READS NO PAGE TOKEN. `--qcv-*` is declared on `.qcv-page`, which is not an
 * ancestor out here, so every `var()` would resolve to nothing — silently, with the rules reading
 * correctly. The sheet declares the two values it needs as literals for exactly that reason; the
 * CARD inside is the page's own component and brings its own scope.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./qcvModal.css";

export const QcQueryModal: React.FC<{
  /** the card itself — the page's one `QcOpenCard`, never a second composition */
  children: React.ReactNode;
  onClose: () => void;
  /**
   * ⚠️ WHO OWNS ESCAPE, AND IT IS NEVER BOTH. Two capture-phase listeners on `document` are decided
   * by REGISTRATION ORDER — a fact about which component mounted last rather than about what is on
   * screen. While the expanded view is open IT owns the key and cascades through this card to the
   * calendar; this component then registers nothing at all, so there is no race to resolve.
   */
  ownsEscape: boolean;
}> = ({ children, onClose, ownsEscape }) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!ownsEscape) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [ownsEscape]);

  /**
   * ⚠️ THE PAGE BEHIND IT DOES NOT SCROLL, AND ITS POSITION IS NOT TOUCHED. `overflow: hidden` on
   * the body freezes what is underneath without moving it, so closing restores the page exactly —
   * which is the requirement. Anything that stored and re-applied a scroll offset would be a second
   * model of where the page is, and this app already has one.
   */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="qcv-qm" data-qcv="qm" role="dialog" aria-modal="true" aria-label="Query">
      <div className="qcv-qm-back" data-qcv="qm-back" onClick={() => closeRef.current()} aria-hidden="true" />
      <div className="qcv-qm-card" data-qcv="qm-card">{children}</div>
      {/**
        * ⚠️ THE ✕ IS THE MODAL'S, AND THE CARD'S OWN IS HIDDEN — the mock's arrangement, and it is
        * a fact about the card's BAND as much as about the control: the card's ✕ is 24px tall in a
        * band whose type is 15, so leaving it in makes the band 45px where the design draws 36.
        *
        * ⚠️ THE MOCK ALSO DRAWS PREV/NEXT ARROWS BESIDE IT AND THEY ARE DELIBERATELY NOT BUILT. The
        * brief names three ways to close and no way to step, and a stepper is a feature rather than
        * a treatment — building it from an artefact nobody asked for is how a page grows a control
        * with no decision behind it.
        */}
      <button type="button" className="qcv-qm-x" data-qcv="qm-close" aria-label="Close" onClick={() => closeRef.current()}>✕</button>
    </div>,
    document.body,
  );
};
