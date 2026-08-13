/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryJourneySheet — the surface both Query Centre journeys sit on (§2, ref
 * design-refs/92-both-sheets.html; depth from 91-sheet-lift.html).
 *
 * A takeover replaced the desk. A sheet is LAID ON it: the rest state stays mounted and visible
 * underneath, dimmed by a warm radial scrim, and the journey is a square-cornered piece of paper
 * resting a few millimetres above it. That is the whole change — the journeys' own content and
 * layout are untouched, and both render through this one component, so create and record cannot
 * drift into two different objects.
 *
 * ⚠️ SQUARE CORNERS, AND ONLY HERE. Every other surface in the product is radiused; this one is
 * not, and that is what makes it read as paper rather than as another card. Do not soften it, and
 * do not spread square corners to anything else.
 *
 * ⚠️ PORTALLED TO document.body, following MobileSheet's precedent and its reasoning: StagePage's
 * entry transform makes a page slot the containing block for `position: fixed`, so a fixed overlay
 * mounted inside the page can be captured by it. It also cannot live in `.f12-root` — two
 * `overflow: hidden` ancestors would clip it. The wrapper carries `.t-f12` because the portal
 * escapes the page root, and every token below reads that scope (the pattern F12Popover already
 * uses).
 *
 * ⚠️ CENTRED BY GRID, NOT BY `translate(-50%, -50%)`. The ref centres with a transform, which means
 * every keyframe has to restate the centring or the sheet snaps into the top-left quadrant mid
 * animation. This page's exit keyframes (`qc-exit-cancel` / `qc-exit-save`) are shared with the
 * pane and do NOT restate it — so a transform-centred sheet would have broken both exits silently.
 * `place-items: center` on the layer leaves `transform` free for motion, which is what motion needs
 * it for.
 *
 * The dock sits INSIDE the sheet, at its foot. It used to be row 4 of WorkspacePageGrid; a dock
 * belongs to the composition it commits, not to the page the composition is lying on top of.
 */
import React from "react";
import { createPortal } from "react-dom";

export const QueryJourneySheet: React.FC<{
  open: boolean;
  /**
   * Which register this is. Geometry, shadow, scrim, dock and motion are IDENTICAL in both — the
   * register only chooses the accent, so the two journeys read as one ritual in two colours.
   */
  register: "create" | "record";
  /** Names the dialog. §3 promotes this to a real `aria-modal` dialog role. */
  ariaLabel: string;
  /**
   * Lifecycle classes armed by the page — the entrance stagger and the two exits. They live on the
   * sheet because the sheet is now the frame that arrives and leaves; `animationend` bubbles here
   * from the staggered children, so one handler still drives the whole lifecycle.
   */
  stateClass?: string;
  onAnimationEnd?: React.AnimationEventHandler<HTMLDivElement>;
  dock?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, register, ariaLabel, stateClass, onAnimationEnd, dock, children }) => {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`t-f12 qc-sheet-layer qc-sheet--${register}`}>
      {/* The scrim is a sibling, never the sheet's parent: a parent would put its opacity on the
          sheet's own compositing chain, and the sheet is not what is being dimmed. */}
      <div className="qc-sheet-scrim" aria-hidden="true" />
      <div
        className={`qc-sheet${stateClass ? " " + stateClass : ""}`}
        aria-label={ariaLabel}
        onAnimationEnd={onAnimationEnd}
      >
        <div className="qc-sheet-body">{children}</div>
        {dock}
      </div>
    </div>,
    document.body
  );
};
