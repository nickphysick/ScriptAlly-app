/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidePanel — the right-hand panel's container (Query panel v1; the feed drawer v2 treatment, extracted).
 *
 * It floats 8px in from the top, right and bottom, 560 wide (520 at 1440 and under), white, radius 12.
 * There is NO scrim: nothing behind it dims, clicks on the page reach the page, and the page is not
 * scroll-locked. Under 900px of window it is the whole screen.
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

export const SidePanel: React.FC<{
  label: string;
  children: React.ReactNode;
  /** an action's form is in the slot: the panel's own content steps aside */
  step?: boolean;
  /** extra attributes for the panel element (probes) */
  attrs?: Record<string, string | undefined>;
  className?: string;
  style?: React.CSSProperties;
}> = ({ label, children, step = false, attrs, className, style }) => {
  const ref = useRef<HTMLElement>(null);
  /* the Birds-eye tab and anything else that stands down while a panel is open read this */
  useEffect(() => {
    document.body.classList.add("spanel-open");
    return () => { document.body.classList.remove("spanel-open"); };
  }, []);
  return createPortal(
    <aside ref={ref} className={`spanel${className ? ` ${className}` : ""}`} role="dialog" aria-label={label} style={style} data-side-panel="" data-step={step ? "true" : undefined} {...attrs}>
      <div className="spanel-own" data-side-own="" hidden={step || undefined}>{children}</div>
      <div className="spanel-slot" data-side-slot="" />
    </aside>,
    document.body,
  );
};
