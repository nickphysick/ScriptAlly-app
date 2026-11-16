/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SpineLabel — the cloth label beside the collapsed rail's manuscript spine (manuscript spine v1, 16 Nov; ref
 * design-refs/shell/manuscript-spine-v1.html, "THE LABEL"). Navy cloth, a rust double rule, cream type.
 *
 * ⚠️ IT IS A TOOLTIP, NOT A POPOVER: `role="tooltip"`, referenced by the spine button's `aria-describedby`,
 * `pointer-events: none`, and nothing in it is focusable or clickable. When and whether it shows is the spine's
 * business (BarSwitcher); this only draws it and places it.
 *
 * ⚠️ PORTALLED TO <body>, AS THE MENU IS: the sidebar clips (`overflow: hidden`), so a label inside it would be cut
 * off at the rail's edge. It is placed from the spine button's measured rect: its left edge 8px right of the rail's
 * right edge, vertically centred on the spine (the button less its 6px top padding, as the ref's own script
 * centres it), and kept at least 8px inside the window's top and bottom. Re-placed on resize.
 *
 * ⚠️ IT STAYS MOUNTED, `hidden` WHEN NOT SHOWING, so the description `aria-describedby` points at always exists.
 * Un-hiding restarts the CSS entrance (the ref's 100ms delay and 160ms fade-and-slide); hiding is at once.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SpineLabelProps {
  id: string;
  /** The spine's button: the label is placed from its rect, and from its rail's. */
  anchor: React.RefObject<HTMLElement | null>;
  show: boolean;
  title: string;
  /** The serif lines under the rule, in order; empty ones are left out by the caller. */
  lines: string[];
  /** The "Add a manuscript · coming soon" row under a hairline. */
  soon: boolean;
}

/** The ref's spine button has `padding-top: 6px`; the spine itself is the rest of the button. */
const SPINE_TOP_PAD = 6;
const GAP = 8;
const EDGE = 8;

export const SpineLabel: React.FC<SpineLabelProps> = ({ id, anchor, show, title, lines, soon }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const key = `${title}|${lines.join("|")}|${soon}`;

  useLayoutEffect(() => {
    if (!show) return undefined;
    const place = () => {
      const b = anchor.current;
      const el = ref.current;
      if (!b || !el) return;
      const r = b.getBoundingClientRect();
      const rail = (b.closest(".wsr") as HTMLElement | null)?.getBoundingClientRect() ?? r;
      const h = el.offsetHeight;
      const mid = r.top + SPINE_TOP_PAD + (r.height - SPINE_TOP_PAD) / 2;
      const top = Math.max(EDGE, Math.min(mid - h / 2, window.innerHeight - EDGE - h));
      setAt({ left: rail.right + GAP, top });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [show, key, anchor]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="ms-label"
      data-ms="label"
      hidden={!show}
      style={at ? { left: at.left, top: at.top } : undefined}
    >
      <div className="ms-label-in">
        <span className="ms-label-nib" aria-hidden="true" />
        <span className="ms-label-title">{title}</span>
        {(lines.length > 0 || soon) && <span className="ms-label-rule" aria-hidden="true" />}
        {lines.map((l) => <span className="ms-label-line" key={l}>{l}</span>)}
        {soon && (
          <span className="ms-label-soon">
            <span className="ms-label-soon-t">Add a manuscript</span>
            <i>coming soon</i>
          </span>
        )}
      </div>
    </div>,
    document.body,
  );
};
