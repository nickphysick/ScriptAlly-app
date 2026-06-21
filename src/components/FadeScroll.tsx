/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FadeScroll — a height-capped scroll region with parchment fade masks at the top/bottom edges that
 * appear ONLY while there's more content hidden in that direction (mid-scroll). Keeps long lists
 * (e.g. the Record-a-response query picker) on-screen at a sensible height while signalling there's
 * more to scroll. Fades match the parchment card ground (#fdfaf5).
 *
 * A ResizeObserver re-measures when the viewport OR its content changes — important because web
 * fonts load after mount and reflow the rows taller, which a one-shot measurement would miss.
 */
import React, { useEffect, useRef, useState } from "react";

export interface FadeScrollProps {
  /** Max height of the scroll viewport (px) — size it to ~the number of rows you want visible. */
  maxHeight: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const FadeScroll: React.FC<FadeScrollProps> = ({ maxHeight, children, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 1);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    // Re-measure when the viewport or its content resizes (incl. async web-font reflow + list changes).
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const fade: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: 20,
    pointerEvents: "none",
    transition: "opacity 0.15s",
    zIndex: 2,
  };

  return (
    <div style={{ position: "relative", ...style }}>
      <div
        aria-hidden="true"
        style={{ ...fade, top: 0, background: "linear-gradient(#fdfaf5, rgba(253,250,245,0))", opacity: atTop ? 0 : 1 }}
      />
      <div ref={ref} onScroll={measure} style={{ maxHeight, overflowY: "auto" }}>
        {children}
      </div>
      <div
        aria-hidden="true"
        style={{ ...fade, bottom: 0, background: "linear-gradient(rgba(253,250,245,0), #fdfaf5)", opacity: atBottom ? 0 : 1 }}
      />
    </div>
  );
};
