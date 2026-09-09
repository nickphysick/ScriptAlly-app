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
import { createPortal } from "react-dom";
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

  /**
   * ⚠️ THE DRAWER IS PORTALLED TO `document.body`, AND THE REASON IS MEASURED (v30, Phase 4).
   *
   * `position: fixed` does not escape a stacking context — it escapes SCROLLING. Rendered in place,
   * this drawer sat inside whatever card opened it, and on the dashboard that card is
   * `.os-card { position: relative; z-index: 1 }` — the shadow fix from an earlier pack, which gives
   * every card its own context so a card casts OVER its neighbours instead of under them. Inside
   * one, this drawer's `z-index` is only ever compared with that card's own children: 9001 against
   * a sibling card's 1 is a comparison that never happens.
   *
   * Measured on the dashboard before the portal, with the drawer open: exactly ONE stacking context
   * between it and `<body>` — `div.os-card.os-lift.os-tasks`, `position: relative + z-index: 1` —
   * and `document.elementFromPoint` at the drawer's own centre returning `div.os-bubsay`. An
   * activity-feed bubble was painting over the drawer, because the activity card is a later sibling
   * at the same z-index and document order decides.
   *
   * ⚠️ AND THE PORTAL IS THE FIX RATHER THAN A BIGGER NUMBER. Raising the z-index inside a trapped
   * context changes nothing at all; that is what makes this a structural fault rather than an
   * ordering one. `body.hasdrawer` below is belt and braces, not the mechanism.
   *
   * ⚠️ IT IS SAFE FOR THE OTHER TWO MOUNTS, CHECKED RATHER THAN ASSUMED. Every `.slo` rule in the
   * app starts with `.slo` — no selector reaches it through an ancestor — so no styling depends on
   * where it sits, and React portals carry context through, so `TaskPane`'s published session
   * context is unaffected.
   */
  React.useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("hasdrawer");
    return () => { document.body.classList.remove("hasdrawer"); };
  }, [open]);

  /**
   * ⚠️ THE PORTAL FALLS BACK TO RENDERING IN PLACE WHEN THERE IS NO `body` TO PORTAL INTO, and that
   * is not a nicety — it is what keeps this component testable in THIS repo (v30, Phase 4).
   *
   * `vitest.config.ts` is `environment: "node"`: there is no jsdom, and every component spec here
   * renders through `renderToStaticMarkup` and asserts against the HTML string. `createPortal` has
   * no server rendering — it emits NOTHING — so portalling unconditionally turned eight assertions
   * across three files into `expected '' to contain …`, including the Agents drawer's read/edit
   * field-parity locks, which are substantive coverage rather than shape checks.
   *
   * The markup is identical either way; only its PARENT differs, and the parent is exactly what the
   * rendered-page gate checks (`dash-drawer-v30.mjs` asserts the portal and the hit test in a real
   * browser). So the string locks keep asserting what they were written for, and the browser always
   * gets the portal.
   */
  const tree = (
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
        data-probe="drawer"
        data-on={open ? "true" : "false"}
        aria-hidden={!open}
        aria-label={label}
        style={{ width }}
      >
        {children}
      </aside>
    </>
  );
  return typeof document !== "undefined" && document.body ? createPortal(tree, document.body) : tree;
};
