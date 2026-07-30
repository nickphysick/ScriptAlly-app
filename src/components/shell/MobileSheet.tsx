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
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockStageScroll } from "../../lib/stageScroll";

export const MobileSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (the sheet draws no title of its own). */
  ariaLabel: string;
  children: React.ReactNode;
}> = ({ open, onClose, ariaLabel, children }) => {
  useEffect(() => {
    if (!open) return;
    const releaseStage = lockStageScroll();
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

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
