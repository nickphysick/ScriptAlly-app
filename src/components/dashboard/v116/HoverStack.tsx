/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — the stepped card stack (ref design-refs/dashboard-v116/, "Steps").
 *
 * Card i sits at translate(14i, 38i), tilted 0.8° a step about the middle card, later cards on top, so
 * every card's first row (the name) shows and the last card shows whole. At most five; more fold into a
 * "+N more" pill 8px under the last card, on its left edge.
 *
 * ⚠️ THE ON-SCREEN RULE (lib/dashHover `fitStack`, `stackCap`): the stack is measured from its FINAL
 * positions — the cards' layout boxes plus their steps, never a mid-animation rect — and moved up or left
 * to sit 12px inside the viewport, never above or left of 12. If even five cannot fit the height, fewer
 * show and the pill counts the rest. It re-fits on every anchor move, and on resize and scroll.
 * ⚠️ IT TAKES NO POINTER (`pointer-events: none`) — it must never steal the hover that opened it — and it
 * is PORTALLED to `<body>`, above every dashboard card, free to overflow its card and the column.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CARD_W, STACK_GAP, STACK_MAX, STEP_X, STEP_Y, fitStack, stackCap, stepAt } from "../../../lib/dashHover";
import "./hoverStack.css";

export interface HoverStackProps {
  /** null hides it (with a 120ms exit) */
  anchor: { x: number; y: number } | null;
  /** every card in the category, in order; the stack shows the first few */
  cards: React.ReactNode[];
  /** the category's full count — "+N more" is this less what shows */
  total: number;
  /** what the stack is of, for the probe */
  kind: string;
  /** changes when the category does: the cards re-enter */
  stackKey: string;
}

/** A head-and-shoulders bust in a circle, cropped at the circle's foot. Never initials. */
export const Bust: React.FC = () => (
  <span className="d116-bust" aria-hidden="true">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4.6" /><path d="M3 24c.6-5.6 4.3-9 9-9s8.4 3.4 9 9z" /></svg>
  </span>
);

export const HoverStack: React.FC<HoverStackProps> = ({ anchor, cards, total, kind, stackKey }) => {
  const [shown, setShown] = useState<{ anchor: { x: number; y: number }; key: string } | null>(null);
  const [on, setOn] = useState(false);
  const [cap, setCap] = useState(STACK_MAX);
  const [fit, setFit] = useState<{ dx: number; dy: number; pillTop: number }>({ dx: 0, dy: 0, pillTop: 0 });
  const ref = useRef<HTMLDivElement | null>(null);

  /* open, move, close: the exit keeps the last cards on screen for 120ms while they fade */
  const keyRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (anchor) {
      /* ⚠️ v118 Part A — a NEW category swaps in place: the cap resets, but the stack stays on. Turning it off and on
         again for the entrance left two frames with no stack between one row and the next. */
      if (keyRef.current !== stackKey) { keyRef.current = stackKey; setCap(STACK_MAX); }
      setShown({ anchor, key: stackKey });
      return undefined;
    }
    keyRef.current = null;
    setOn(false);
    const t = window.setTimeout(() => setShown(null), 120);
    return () => window.clearTimeout(t);
  }, [anchor?.x, anchor?.y, stackKey, anchor === null]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the entrance: one frame after the cards mount, so their transition runs from the start state */
  useLayoutEffect(() => {
    if (!shown || on || !anchor) return undefined;
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, [shown, on, anchor]);

  const vis = Math.max(0, Math.min(cap, cards.length));
  const more = Math.max(0, total - vis);

  /* ⚠️ THE ON-SCREEN RULE, measured from the final positions */
  const refit = () => {
    const el = ref.current;
    if (!el || !shown) return;
    const rc = [...el.querySelectorAll<HTMLElement>(":scope > .d116-rc")];
    const pill = el.querySelector<HTMLElement>(":scope > .d116-more");
    if (!rc.length) { setFit((f) => (f.dx || f.dy ? { dx: 0, dy: 0, pillTop: 0 } : f)); return; }
    const cardH = Math.max(...rc.map((c) => c.offsetHeight));
    const pillH = pill?.offsetHeight ?? 22;
    const want = stackCap(Math.min(total, cards.length), cardH, pillH, window.innerHeight);
    const nextCap = Math.min(STACK_MAX, Math.max(1, want));
    if (nextCap !== cap && cards.length > 0) { setCap(nextCap); return; }
    /* each card's FINAL box: its step, then its tilt about its own centre (a tilted card's corners reach a
       few pixels past its layout box, and the on-screen rule is about pixels) */
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0, layoutH = 0;
    rc.forEach((c, i) => {
      const p = stepAt(i, rc.length), w0 = c.offsetWidth, h0 = c.offsetHeight;
      const a = (Math.abs(p.rot) * Math.PI) / 180;
      const ew = (w0 * Math.cos(a) + h0 * Math.sin(a) - w0) / 2, eh = (w0 * Math.sin(a) + h0 * Math.cos(a) - h0) / 2;
      x0 = Math.min(x0, p.x - ew); y0 = Math.min(y0, p.y - eh);
      x1 = Math.max(x1, p.x + w0 + ew); y1 = Math.max(y1, p.y + h0 + eh);
      layoutH = Math.max(layoutH, p.y + h0);
    });
    const pillTop = layoutH + STACK_GAP;
    if (pill) { y1 = Math.max(y1, pillTop + pill.offsetHeight); x1 = Math.max(x1, (rc.length - 1) * STEP_X + pill.offsetWidth); }
    const { dx, dy } = fitStack({ left: shown.anchor.x + x0, top: shown.anchor.y + y0, w: x1 - x0, h: y1 - y0 }, window.innerWidth, window.innerHeight);
    setFit((f) => (f.dx === dx && f.dy === dy && f.pillTop === pillTop ? f : { dx, dy, pillTop }));
  };
  useLayoutEffect(refit);
  useLayoutEffect(() => {
    if (!shown) return undefined;
    const go = () => refit();
    window.addEventListener("resize", go);
    window.addEventListener("scroll", go, true);
    return () => { window.removeEventListener("resize", go); window.removeEventListener("scroll", go, true); };
  });

  if (!shown || typeof document === "undefined") return null;
  const n = vis;
  return createPortal(
    <div
      ref={ref}
      className={`d116-stack${on && anchor ? " is-on" : ""}`}
      data-d116="stack"
      data-kind={kind}
      data-total={total}
      data-shown={n}
      data-more={more}
      aria-hidden="true"
      style={{ left: shown.anchor.x, top: shown.anchor.y, translate: `${fit.dx}px ${fit.dy}px` }}
    >
      {cards.slice(0, n).map((c, i) => {
        const p = stepAt(i, n);
        return (
          <div
            key={`${shown.key}-${i}`}
            className="d116-rc"
            data-i={i}
            style={{ "--i": i, "--at": `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`, zIndex: 10 + i, width: CARD_W } as React.CSSProperties}
          >
            {c}
          </div>
        );
      })}
      {more > 0 && n > 0 && (
        <div className="d116-more" data-d116="more" style={{ top: fit.pillTop, left: (n - 1) * STEP_X }}>+{more} more · click to see all</div>
      )}
    </div>,
    document.body,
  );
};
