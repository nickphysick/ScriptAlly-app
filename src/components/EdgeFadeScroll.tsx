/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EdgeFadeScroll — the app's one internal-scroll-with-edge-fades wrapper, extracted verbatim from
 * the Queries list reference implementation (listScrollRef + recomputeListFades in Queries.tsx,
 * which still runs its original inline copy). A non-scrolling relative frame hosts two absolute
 * 28px gradient overlays and an inner scroll element: the top fade shows only once scrolled away
 * from the top, the bottom fade only while more content sits below — neither at rest, so a short
 * list stays clean. Same 3px thresholds, rAF+80ms throttle, ResizeObserver + resize wiring, and
 * 0.16s opacity ease as the reference.
 *
 * `fade` is the region's own background TOKEN (e.g. "var(--pane, #ffffff)") so the mist matches
 * every theme — never hardcode a hex behind it. The outer div is a relative flex column; the
 * scroll div is `flex: 1 1 auto; min-height: 0; overflow-y: auto` (block by default — pass
 * scrollStyle display flex/column when children expect flex-item behaviour).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

export interface EdgeFadeScrollProps {
  /** Gradient base — the scroll region's background token (theme-safe), e.g. "var(--pane, #fff)". */
  fade: string;
  outerClassName?: string;
  outerStyle?: React.CSSProperties;
  scrollClassName?: string;
  scrollStyle?: React.CSSProperties;
  /** Optional external handle on the scroll element (keyboard nav / scrollIntoView call sites). */
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  /** Semantics for the scroll element (e.g. role="listbox" + its label). */
  role?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

export const EdgeFadeScroll: React.FC<EdgeFadeScrollProps> = ({
  fade,
  outerClassName,
  outerStyle,
  scrollClassName,
  scrollStyle,
  scrollRef,
  role,
  "aria-label": ariaLabel,
  children,
}) => {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const attachScroll = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (scrollRef) scrollRef.current = node;
    },
    [scrollRef],
  );

  const [edgeFade, setEdgeFade] = useState<{ top: boolean; bottom: boolean }>({ top: false, bottom: false });
  const recompute = useCallback(() => {
    const el = innerRef.current;
    const nextTop = !!el && el.scrollHeight > el.clientHeight + 3 && el.scrollTop > 3;
    const nextBottom = !!el && el.scrollHeight > el.clientHeight + 3 && el.scrollTop + el.clientHeight < el.scrollHeight - 3;
    // Bail out (return prev) when unchanged so the resize/content effects can't loop.
    setEdgeFade(prev => (prev.top === nextTop && prev.bottom === nextBottom ? prev : { top: nextTop, bottom: nextBottom }));
  }, []);
  // rAF-throttled recompute for the high-frequency sources (scroll, ResizeObserver bursts). The
  // timeout is the fallback for throttled/backgrounded windows where rAF never runs.
  const tick = useRef(false);
  const schedule = useCallback(() => {
    if (tick.current) return;
    tick.current = true;
    const run = () => { if (!tick.current) return; tick.current = false; recompute(); };
    requestAnimationFrame(run);
    window.setTimeout(run, 80);
  }, [recompute]);

  // Every commit: content may have changed height in place (rows added, sections grown) — the
  // recompute is three property reads with a state bail-out, so this is cheap.
  useEffect(() => { schedule(); });

  // Size wiring: the ResizeObserver covers display-toggled page slots (data lands while a
  // persistent StagePage is hidden — clientHeight 0, fades off — and the observer fires on the
  // 0 → real size flip) plus content growth via the first child's box.
  useEffect(() => {
    recompute();
    const el = innerRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (ro && el) {
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    window.addEventListener("resize", schedule);
    return () => { ro?.disconnect(); window.removeEventListener("resize", schedule); };
  }, [recompute, schedule]);

  const overlay = (edge: "top" | "bottom", on: boolean): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    [edge]: 0,
    height: 28,
    pointerEvents: "none",
    zIndex: 2,
    background: `linear-gradient(to ${edge === "top" ? "bottom" : "top"}, ${fade}, transparent)`,
    opacity: on ? 1 : 0,
    transition: "opacity .16s ease",
  });

  return (
    <div className={outerClassName} style={{ position: "relative", display: "flex", flexDirection: "column", ...outerStyle }}>
      <div aria-hidden="true" style={overlay("top", edgeFade.top)} />
      <div
        ref={attachScroll}
        role={role}
        aria-label={ariaLabel}
        className={scrollClassName}
        onScroll={schedule}
        style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", ...scrollStyle }}
      >
        {children}
      </div>
      <div aria-hidden="true" style={overlay("bottom", edgeFade.bottom)} />
    </div>
  );
};
