/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RowTip — the row cluster's tooltip (icon-cluster pack, Phase 1; ref
 * design-refs/todo-iconcluster-v2.html panel 1).
 *
 * ⚠️ THE TOOLTIP IS NOT OPTIONAL FURNITURE HERE — IT IS THE MITIGATION. Four glyphs replaced a
 * button that said "Action" in words, and a paper plane does not carry "record that you sent it".
 * So every icon names its deed and teaches its key, and pointing at one is how the cluster is
 * learned. That is why this is a component with focus handling rather than a `title` attribute:
 * `title` never appears on keyboard focus and never appears on touch.
 *
 * ⚠️ IT BUILDS ON `lib/deskTooltip`'s MATHS AND DOES NOT IMPORT THE DASHBOARD'S `StatTooltip`.
 * That component would have worked, and importing it is not editing it — but it lives in
 * `components/dashboard/` with its CSS in `dashboardV37.css`, so the To-do page would have taken a
 * dependency on the dashboard's component folder AND its stylesheet to draw a 30px tooltip. The
 * placement maths is the part worth sharing, it is already pure and unit-tested, and it is the
 * half that is genuinely hard: the cluster sits at row-RIGHT, so the fourth icon's tooltip would
 * hang off the viewport without the clamp. Behaviour matches StatTooltip deliberately — hover and
 * focus both show, a delay-out stops the flicker, reduced motion drops the fade — it is simply not
 * borrowed by import.
 *
 * ⚠️ AND IT PORTALS. A tooltip positioned inside the row would be clipped by the scroll zone the
 * moment the top row's tip tried to sit above it.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeTooltip } from "../../lib/deskTooltip";

/** Hover/focus visibility with a delay-out — the 120ms is StatTooltip's, for one feel app-wide. */
export function useTipShow(delayOutMs = 120) {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | null>(null);
  const clear = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  return {
    shown,
    show: () => { clear(); setShown(true); },
    hide: () => { clear(); timer.current = window.setTimeout(() => setShown(false), delayOutMs); },
  };
}

export interface RowTipProps {
  /** The deed, in words — never the glyph's name. */
  label: string;
  /** Its key, where it has one. Rendered as a kbd chip. */
  hint?: string;
  anchor: HTMLElement | null;
}

export const RowTip: React.FC<RowTipProps> = ({ label, hint, anchor }) => {
  const el = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !el.current) return;
    const a = anchor.getBoundingClientRect();
    const t = el.current.getBoundingClientRect();
    setPos(placeTooltip(a, { width: t.width, height: t.height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor, label, hint]);

  return createPortal(
    <span
      ref={el}
      className="tdg-tip"
      role="tooltip"
      /* measured before it is placed, so it must be laid out and invisible rather than absent */
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, opacity: 0 }}
    >
      {label}
      {hint && <span className="tdg-tipk">{hint}</span>}
    </span>,
    document.body,
  );
};
