/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Turning a mark into a door — the props that make anything on this page activatable.
 *
 * ⚠️ NOTHING IS A CLICK HANDLER ON A BARE `div` OR `path`. Every door here is reachable by
 * keyboard and shows where the focus is: an HTML control is a real `<button>`, and an SVG mark —
 * which cannot be one — takes `role="button"`, `tabIndex={0}` and an Enter/Space handler, which is
 * the whole of what a button does that a shape does not.
 *
 * ⚠️ AND EVERY DOOR HAS A NAME. `aria-label` says where it goes rather than what to do with it:
 * "Open Alex Fenn in the Query Centre", never "view" or "click here".
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { AnalyticsTarget, labelForTarget, pathForTarget } from "./openInQueryCentre";

export function useOpenTarget() {
  const navigate = useNavigate();
  return React.useCallback(
    (t: AnalyticsTarget) => () => navigate(pathForTarget(t)),
    [navigate],
  );
}

/**
 * Props for an SVG mark that opens something.
 *
 * ⚠️ SPACE IS `preventDefault`ed, ENTER IS NOT. Space scrolls the page by default and a focused
 * mark that scrolled instead of opening would read as broken; Enter has no default worth stopping.
 */
export interface SvgDoorProps {
  role: "button";
  tabIndex: 0;
  "aria-label": string;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  style: React.CSSProperties;
}

/**
 * ⚠️ THE RETURN TYPE NAMES ITS OWN KEYS RATHER THAN BORROWING `SVGProps`. `SVGProps<SVGElement>`
 * carries a `ref` typed to the generic element, which does not assign to `SVGCircleElement`'s —
 * so spreading it onto a `<circle>` fails to compile for a reason that has nothing to do with any
 * prop this actually sets. Six explicit keys assign onto any SVG element.
 */
export function svgDoor(open: () => void, target: AnalyticsTarget, subject: string): SvgDoorProps {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": labelForTarget(target, subject),
    onClick: open,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.key === " ") e.preventDefault();
        open();
      }
    },
    style: { cursor: "pointer" },
  };
}
