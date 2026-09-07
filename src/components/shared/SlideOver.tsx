/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SlideOver — the app's first shared right-hand drawer (QC-chassis round, Phase 5).
 *
 * ⚠️ THERE WAS NO DRAWER PRIMITIVE, AND THERE ARE THREE DRAWERS. The Query Centre's panel, the
 * packages drawer and the Query log sheet each own a private `position: fixed` element, its own
 * scrim, its own z-index and its own idea of how Escape works. Three implementations of one shape
 * is three chances for them to disagree — and they already do about the scrim's opacity and about
 * whether a click outside closes.
 *
 * ⚠️ IT NAMES ITS ADOPTERS AND MIGRATES NONE OF THEM, DELIBERATELY (the brief's own instruction).
 * Each of the three sits inside a live round belonging to another stream, and rewriting the Query
 * Centre's panel from this round would be editing a hot file to prove a point about consistency.
 * The three are:
 *
 *   1. `queries/QueryPanel.tsx`     — `.qpn` / `.qpn-scrim`, 580px, z 70/60.
 *   2. `queries/QueryLogSheet.tsx`  — `.qls`, z 80, its own popover layer.
 *   3. `packages/…Broadsheet`       — the packages drawer, z 260.
 *
 * A primitive with no adopters is a fourth implementation wearing a shared name, so this one is
 * MOUNTED by the To-do pane it was extracted for; the other three are a migration for whoever owns
 * those files next, and `slideOver.test.tsx` asserts the list stays honest.
 *
 * ⚠️ THE TWO DURATIONS ARE THE QUERY CENTRE'S TRICK, KEPT. A transition reads its timing from the
 * state being transitioned TO, so the closing timing lives on the base rule and the opening timing
 * on `[data-on="true"]` — the drawer opens in 360ms and closes in 220 with nothing having to know
 * which way it is going, and no JS at all.
 *
 * ⚠️ AND IT DOES NOT CAPTURE ESCAPE. It listens without `stopPropagation`, because a drawer is
 * chrome beside pages that own their own Escape — an open popover inside it, a draft that must
 * confirm before discarding. Swallowing the key at this level would reach past whatever the page
 * has already put in front of the reader. The page decides what Escape means; this only offers to
 * be told.
 */
import React from "react";
import "./slideOver.css";

export interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  /** the accessible name — a drawer with none is an unlabelled dialog */
  label: string;
  /** how wide, in px; the CSS caps it at 94vw so a narrow window is never overrun */
  width?: number;
  /**
   * ⚠️ ADDITIVE (Contact list, Phase 4), and the existing mount passes nothing. Below `md` a
   * drawer at 94vw leaves a sliver of scrim no thumb can use and no eye reads as a control; the
   * Contact list's drawer REPLACES a full-screen editor push on mobile, so it has to take the
   * whole width or that page loses room it used to have. Opt-in rather than a change to the base
   * rule, because the To-do pane's drawer sits beside its own mobile chassis and must stay
   * byte-identical — which is the test that this was additive at all.
   */
  fullBleedBelowMd?: boolean;
  children: React.ReactNode;
}

export const SlideOver: React.FC<SlideOverProps> = ({
  open, onClose, label, width = 580, fullBleedBelowMd = false, children,
}) => {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* ⚠️ A BUTTON, NOT A DIV. The scrim is a way to close the drawer, so it is a control and the
          keyboard must reach it; a div with an onClick is a dismissal only a mouse can find. */}
      <button
        type="button"
        className="slo-scrim"
        data-on={open ? "true" : "false"}
        aria-label={`Close ${label}`}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      {/* ⚠️ `aria-hidden` WHEN CLOSED, and `inert` is deliberately not used: it is still uneven
          across the browsers this app supports, and a closed drawer that keeps its tab stops is a
          reader tabbing into something they cannot see. */}
      <aside
        className={fullBleedBelowMd ? "slo slo--bleed" : "slo"}
        data-on={open ? "true" : "false"}
        aria-hidden={!open}
        aria-label={label}
        style={{ width }}
      >
        {children}
      </aside>
    </>
  );
};
