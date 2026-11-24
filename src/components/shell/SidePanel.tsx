/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidePanel — the right-hand panel's container (Query panel v1; the feed drawer v2 treatment, extracted).
 *
 * It floats 8px in from the top, right and bottom, 560 wide (520 at 1440 and under), white, radius 12.
 * Record a response v1, Phase 5 — THE DESK DIMS WHENEVER IT IS OPEN, browsing included (it used to dim only while an
 * action ran, `dim`): the scrim covers everything but the panel, the sidebar and the shell's bar included; the page
 * behind is `inert` (useDrawerFocus's modal seal) and takes no pointer, and a press on the scrim is the Escape key
 * (or the host's `onScrim`), which goes up one level and never discards an answer. Under 900px of window it is the
 * whole screen.
 *
 * ⚠️ IT PORTALS TO `document.body`, so it reads no page token: its sheet states literals.
 * ⚠️ `role="dialog"` WITH `aria-modal`: the page behind it is inert while it is open.
 * ⚠️ ONE CONTAINER, AND A STEP REPLACES ITS CONTENT. `[data-side-slot]` is where an action's form is
 *    portalled; while it holds one the panel carries `data-step` and its own content is hidden, still mounted.
 */
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { leaveGhost } from "../../lib/cardMotion";
import { createPortal } from "react-dom";
import "./sidePanel.css";
import { useDrawerFocus } from "./useDrawerFocus";

export const SIDE_SLOT = "[data-side-slot]";

/* ⚠️ THE DIM IS COUNTED, NOT TOGGLED (Log a query v1.2). Two panels can be mounted at once (the staged log journey opens
   over an agent's or a query's panel), and a toggle let the one closing underneath take `spanel-dim` off the body while
   the other was still dimming: the shell's bar then rose above the scrim (queryPanelHost.css). The scrim below holds
   the count, so the agent card's scrim (not a SidePanel) counts with every SidePanel's. */
let dims = 0;
let opens = 0;
const syncDim = () => { document.body.classList.toggle("spanel-dim", dims > 0); };

/**
 * The scrim behind a right-hand panel (Card offers v1 lifted it out of `SidePanel` so the agent card's panel, which is
 * not a SidePanel, dims through the same element rather than a second one):
 *   off     clear and inert — the panel leaving
 *   action  the dim (.45): a click on it is the Escape key (or the host's `onScrim`), which steps back or asks first
 * Record a response v1 retired the light, live level: every slide-out dims the whole desk. While it is on it counts
 * towards `body.spanel-dim`, which drops the shell's bar under it.
 */
export const SideScrim: React.FC<{ level: "off" | "action"; className?: string; onScrim?: () => void }> = ({ level, className, onScrim }) => {
  useEffect(() => {
    if (level === "off") return undefined;
    dims++; syncDim();
    return () => { dims--; syncDim(); };
  }, [level === "off"]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`spanel-scrim${className ? ` ${className}` : ""}`} data-side-scrim="" data-on={level === "action" ? "true" : undefined} aria-hidden="true"
      onClick={() => {
        if (level !== "action") return;
        if (onScrim) onScrim(); else window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      }} />
  );
};

export const SidePanel: React.FC<{
  label: string;
  children: React.ReactNode;
  /** an action's form is in the slot: the panel's own content steps aside */
  step?: boolean;
  /** extra attributes for the panel element (probes) */
  attrs?: Record<string, string | undefined>;
  className?: string;
  style?: React.CSSProperties;
  /** what a press on the dimmed page does; by default it is the Escape key */
  onScrim?: () => void;
}> = ({ label, children, step = false, attrs, className, style, onScrim }) => {
  const ref = useRef<HTMLElement>(null);
  /* overnight fixes v1, Part 7 — focus in on open and back on close (to the control that opened it); Record a response
     v1 — always modal: Tab is held inside and the page is inert */
  useDrawerFocus(ref, true, { modal: true });
  /* Record a response v1, Phase 6 — closing: a copy slides away (200ms, ease-in) and the dim lifts, while the real panel
     is already gone, so the page behind is live at once. Taken while the panel is still in the page. */
  useLayoutEffect(() => () => {
    const el = ref.current;
    const scrim = el?.previousElementSibling instanceof HTMLElement && el.previousElementSibling.hasAttribute("data-side-scrim") ? el.previousElementSibling : null;
    leaveGhost(el, scrim);
  }, []);
  /* the Birds-eye tab and anything else that stands down while a panel is open read this */
  /* counted (Record a response v2.1): a card closing over the response journey must not take it off while the journey
     is still open */
  useEffect(() => {
    opens++; document.body.classList.add("spanel-open");
    return () => { opens--; if (!opens) document.body.classList.remove("spanel-open"); };
  }, []);
  /* whether the page is dimmed behind it (the scrim holds the count of `body.spanel-dim`): the shell's bar rises over
     the panel only while it is not */
  return createPortal(
    <>
    <SideScrim level="action" onScrim={onScrim} />
    <aside ref={ref} className={`spanel${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-label={label} style={style} data-side-panel="" data-step={step ? "true" : undefined} data-dim="true" {...attrs}>
      <div className="spanel-own" data-side-own="" hidden={step || undefined}>{children}</div>
      <div className="spanel-slot" data-side-slot="" />
    </aside>
    </>,
    document.body,
  );
};
