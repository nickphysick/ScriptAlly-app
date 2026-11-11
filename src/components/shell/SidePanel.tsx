/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidePanel — the right-hand panel's container (Query panel v1; the feed drawer v2 treatment, extracted).
 *
 * It floats 8px in from the top, right and bottom, 560 wide (520 at 1440 and under), white, radius 12.
 * Browsing, there is NO scrim: nothing behind it dims, clicks on the page reach the page, and the page is not
 * scroll-locked. While an action runs in it (`dim`, Query panel v2 §D) the page dims behind it. Under 900px of
 * window it is the whole screen.
 *
 * ⚠️ IT PORTALS TO `document.body`, so it reads no page token: its sheet states literals.
 * ⚠️ `role="dialog"` WITHOUT `aria-modal`: the page behind it is live, and `aria-modal` would both lie about
 *    that and switch off every plain-key shortcut that asks `modalOpen()`.
 * ⚠️ ONE CONTAINER, AND A STEP REPLACES ITS CONTENT. `[data-side-slot]` is where an action's form is
 *    portalled; while it holds one the panel carries `data-step` and its own content is hidden, still mounted.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./sidePanel.css";

export const SIDE_SLOT = "[data-side-slot]";

/**
 * The scrim behind a right-hand panel, at one of three levels (Card offers v1 lifted it out of `SidePanel` so the agent
 * card's panel, which is not a SidePanel, dims through the same element rather than a second one):
 *   off     clear and inert — browsing a SidePanel
 *   light   rgba(28,19,15,.16), VISUAL ONLY: pointer events pass through, so the page stays live (the agent card while
 *           it is read: another row still switches the card)
 *   action  the existing action dim (.45): a click on it is the Escape key, which steps back or asks first
 * Always mounted while its panel is, so it fades both ways. While it is not off, `body.spanel-dim` drops the shell's bar
 * under it.
 */
export const SideScrim: React.FC<{ level: "off" | "light" | "action"; className?: string }> = ({ level, className }) => {
  useEffect(() => {
    if (level === "off") return undefined;
    document.body.classList.add("spanel-dim");
    return () => { document.body.classList.remove("spanel-dim"); };
  }, [level]);
  return (
    <div className={`spanel-scrim${className ? ` ${className}` : ""}`} data-side-scrim="" data-on={level === "action" ? "true" : level === "light" ? "light" : undefined} aria-hidden="true"
      onClick={() => { if (level === "action") window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); }} />
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
  /**
   * Query panel v2 §D — an ACTION is running in the panel: the page behind it dims (a scrim over everything but
   * the panel, the shell's bar included). Browsing never dims. A click on the scrim is the Escape key: it steps
   * back, or leaves the action under its own park-or-cancel rule, and never discards an answer.
   */
  dim?: boolean;
}> = ({ label, children, step = false, attrs, className, style, dim = false }) => {
  const ref = useRef<HTMLElement>(null);
  /* the Birds-eye tab and anything else that stands down while a panel is open read this */
  useEffect(() => {
    document.body.classList.add("spanel-open");
    return () => { document.body.classList.remove("spanel-open"); };
  }, []);
  /* whether the page is dimmed behind it (the scrim owns `body.spanel-dim`): the shell's bar rises over the panel only
     while it is not */
  return createPortal(
    <>
    {/* always mounted while the panel is, so it can fade both ways; inert and clear until an action runs */}
    <SideScrim level={dim ? "action" : "off"} />
    <aside ref={ref} className={`spanel${className ? ` ${className}` : ""}`} role="dialog" aria-label={label} style={style} data-side-panel="" data-step={step ? "true" : undefined} data-dim={dim ? "true" : undefined} {...attrs}>
      <div className="spanel-own" data-side-own="" hidden={step || undefined}>{children}</div>
      <div className="spanel-slot" data-side-slot="" />
    </aside>
    </>,
    document.body,
  );
};
