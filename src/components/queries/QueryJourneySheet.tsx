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
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "../shell/useOverlay";
import { journeyCrumb } from "../shell/shellV2Nav";

/**
 * ⚠️ THE LAMPLIGHT DIM (§5, device 1). The chrome outside the sheet falls back and desaturates —
 * the lamp moves to the letter. Applied to `#root`, which the sheet is NOT inside (it portals to
 * the body), so the filter cannot reach it.
 *
 * ⚠️ IT IS A CLASS SWAP, NOT AN INLINE STYLE, so the values and the transition stay in the
 * stylesheet where the reduced-motion rule can reach them. An inline `opacity` would be
 * unsuppressible from CSS.
 *
 * ⚠️ AND THE DEPTH IS DRIVEN BY A SINGLE OWNER. Three depths — create, record, and one further
 * step for an offer — as three mutually exclusive classes rather than three booleans, because two
 * of them being true at once has no meaning and would resolve by cascade order.
 */
function useLamplight(depth: "create" | "record" | "offer") {
  useEffect(() => {
    const root = typeof document === "undefined" ? null : document.getElementById("root");
    if (!root) return;
    root.classList.add("qc-lamp");
    root.classList.toggle("qc-lamp-record", depth === "record" || depth === "offer");
    root.classList.toggle("qc-lamp-offer", depth === "offer");
    return () => {
      root.classList.remove("qc-lamp", "qc-lamp-record", "qc-lamp-offer");
    };
  }, [depth]);
}

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
  /**
   * Leave — Escape or a backdrop click. §3: this is the SAME handler the dock's Cancel calls, so
   * all three routes go through the page's existing dirty guard rather than through three ideas of
   * what leaving means. The guard is not rebuilt here and must not be: `closeCreate` / `closeRecord`
   * already diff the draft against its baseline and confirm only when it is dirty.
   */
  onRequestClose: () => void;
  /**
   * How deep the room goes (§5). `create` and `record` are the two registers — a reply is something
   * that happened TO you, so it sits a step deeper. `offer` deepens one further, and is the ONLY
   * outcome that moves the light: a pass is not darker, just quieter, and dimming for a rejection
   * would make the room react to bad news.
   */
  lamp: "create" | "record" | "offer";
  /** What the writer is doing, appended to the app's own trail — "Log a query" / "Record a response". */
  act: string;
  children: React.ReactNode;
}> = ({ open, ...rest }) => {
  /* ⚠️ THE INNER SPLIT IS A HOOKS RULE, NOT A STYLE CHOICE. `useOverlay` arms everything on MOUNT —
     the focus capture, the scroll lock, the background seal — so the component that calls it must
     exist only while the sheet is open. Calling it up here behind an `if (!open)` would be a
     conditional hook; calling it unconditionally would lock the page's scroll for the whole
     session. */
  if (!open || typeof document === "undefined") return null;
  return <SheetInner {...rest} />;
};

const SheetInner: React.FC<{
  register: "create" | "record";
  ariaLabel: string;
  stateClass?: string;
  onAnimationEnd?: React.AnimationEventHandler<HTMLDivElement>;
  dock?: React.ReactNode;
  onRequestClose: () => void;
  lamp: "create" | "record" | "offer";
  act: string;
  children: React.ReactNode;
}> = ({ register, ariaLabel, stateClass, onAnimationEnd, dock, onRequestClose, lamp, act, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  useLamplight(lamp);

  /**
   * ⚠️ WHAT AN OVERLAY OWES (§3), through the shell's one primitive rather than a third copy of it:
   * focus trapped and returned to the trigger, Escape from the first frame, a backdrop click, the
   * page behind sealed to assistive technology and to Tab, and its scroll locked.
   *
   * ⚠️ ESCAPE IS *NOT* CAPTURED HERE, and that is deliberate. `captureEscape` exists for chrome
   * sitting over a page that owns the key for something else; this sheet IS the page's current
   * business, and swallowing Escape on the capture phase would reach past the sheet into handlers
   * that have a right to it (an open picker inside the journey closes itself first).
   *
   * ⚠️ AND ESCAPE IS BOUND ON THE WINDOW, so it works DURING the 420ms lay-down — before anything
   * inside has been focused. A writer who opened this by accident should not have to watch it
   * arrive before undoing it.
   */
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onRequestClose,
    scrimClasses: ["qc-sheet-layer", "qc-sheet-scrim"],
    onScrimClick: onRequestClose,
  });

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`t-f12 qc-sheet-layer qc-sheet--${register}`}
      onKeyDown={trapTab}
      onClick={scrimClick}
    >
      {/* The scrim is a sibling, never the sheet's parent: a parent would put its opacity on the
          sheet's own compositing chain, and the sheet is not what is being dimmed. */}
      <div className="qc-sheet-scrim" aria-hidden="true" />
      <div
        className={`qc-sheet${stateClass ? " " + stateClass : ""}`}
        onAnimationEnd={onAnimationEnd}
      >
        {/**
          * ⚠️ THE SHEET NEEDS ITS OWN TRAIL BECAUSE THE APP'S IS BEHIND THE SCRIM (§3a) — dimmed and
          * unreadable, by design. It reads `journeyCrumb`, which composes the shell's own
          * `shellCrumbForPath` and appends the act, so the two cannot diverge the first time a page
          * is renamed.
          *
          * ⚠️ TEXT, NOT LINKS. The sheet is modal: a trail whose segments look clickable and are
          * not is worse than plain words, and making them navigate would mean leaving a journey by
          * a door with no dirty guard on it. Only the current segment takes colour.
          *
          * ⚠️ AND NO CLOSE CONTROL. The ref draws an "Esc ×" at the band's right; the dock already
          * carries Esc and Cancel, and a second exit is exactly the duplicate the old chrome bar was
          * retired for.
          */}
        <div className="qc-crumb" aria-hidden="true">
          {journeyCrumb(typeof window === "undefined" ? "/queries" : window.location.pathname, act)
            .map((seg, i) => (
              <React.Fragment key={seg.label}>
                {i > 0 && <span className="qc-crumbsep">/</span>}
                <span className={seg.current ? "qc-crumbcur" : undefined}>{seg.label}</span>
              </React.Fragment>
            ))}
        </div>
        <div className="qc-sheet-body">{children}</div>
        {dock}
      </div>
    </div>,
    document.body
  );
};
