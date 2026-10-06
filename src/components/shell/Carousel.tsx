/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Carousel — the shared shell of the v126 carousel (Contact list v13, ruling Q1): a head (title,
 * a mono note, a slot for a selector or a Clear, ‹ ›), a scroll-snap track whose last card peeks,
 * and dots derived from the track's own scroll position. It knows nothing about what it shows:
 * the host passes the items and how to draw one.
 *
 * ⚠️ ONLY THE CONTACT LIST USES IT IN THIS PACK. The Query Centre still renders its own
 * `QcCarousel`; adopting this shell there is a recorded follow-up, not a comment's promise.
 *
 * ⚠️ THE STEP AND THE DOTS ARE MEASURED, NEVER A CONSTANT. One step is the first card's width plus
 * the track's gap, read off the rendered track — a card resized by a page's dress cannot leave the
 * arrows stepping 336px past cards that are now 300 wide.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SHORTCUTS, matchesShortcut } from "../../lib/shortcuts";
import "./carousel.css";

export interface CarouselProps<T> {
  title: React.ReactNode;
  /** the mono note beside the title — hidden at 1440 and narrower (the mock's own rule) */
  note?: React.ReactNode;
  /** the head's right-hand slot: a selector, a Clear — whatever the host chooses */
  controls?: React.ReactNode;
  items: readonly T[];
  itemKey: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** the track's accessible name */
  label: string;
  /** shown in the track when there is nothing to show */
  empty?: React.ReactNode;
  /** a probe name for the section (`data-cz`) */
  probe?: string;
  className?: string;
  /** the track element, for a host that binds keys to it */
  trackRef?: React.Ref<HTMLDivElement>;
  /** changes whenever the set changes, so the track returns to its start */
  resetKey?: string;
}

export function Carousel<T>({
  title, note, controls, items, itemKey, renderItem, label, empty, probe, className, trackRef, resetKey,
}: CarouselProps<T>) {
  const track = useRef<HTMLDivElement | null>(null);
  const setTrack = useCallback((el: HTMLDivElement | null) => {
    track.current = el;
    if (typeof trackRef === "function") trackRef(el);
    else if (trackRef && typeof trackRef === "object") (trackRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, [trackRef]);
  const [dot, setDot] = useState(0);

  /** one step: the first card's width and the track's gap, as rendered */
  const step = () => {
    const t = track.current;
    const first = t?.firstElementChild as HTMLElement | null;
    if (!t || !first) return 336;
    const gap = parseFloat(getComputedStyle(t).columnGap) || 0;
    return first.offsetWidth + gap;
  };
  const by = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * step(), behavior: "smooth" });

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const read = () => { raf = 0; setDot(Math.round(t.scrollLeft / Math.max(1, step()))); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => { t.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => { if (track.current) track.current.scrollLeft = 0; setDot(0); }, [resetKey]);

  return (
    <section className={`cz${className ? ` ${className}` : ""}`} data-cz={probe ?? "carousel"} aria-label={label}>
      <div className="cz-head" data-cz-head="">
        <h2 className="cz-title">{title}</h2>
        {note ? <span className="cz-note">{note}</span> : null}
        <span className="cz-sp" />
        {controls}
        <button type="button" className="cz-arw" aria-label="Previous" data-cz-prev="" onClick={() => by(-1)}>‹</button>
        <button type="button" className="cz-arw" aria-label="Next" data-cz-next="" onClick={() => by(1)}>›</button>
      </div>
      {/* ← → move the track by one card while IT has focus (a card inside it is a different target) —
          the keys its accessible name promises, from the shared registry */}
      <div ref={setTrack} className="cz-track" data-cz-track="" tabIndex={0} aria-label={`${label}; use the arrow keys`}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const back = matchesShortcut(SHORTCUTS.carouselBack, e);
          if (!back && !matchesShortcut(SHORTCUTS.carouselForward, e)) return;
          e.preventDefault();
          by(back ? -1 : 1);
        }}>
        {items.length ? items.map((it, i) => (
          <div key={itemKey(it)} className="cz-item" data-cz-item="">{renderItem(it, i)}</div>
        )) : <div className="cz-empty">{empty}</div>}
      </div>
      {items.length > 1 && (
        <div className="cz-dots" aria-hidden="true">
          {items.map((it, i) => <i key={itemKey(it)} className={i === dot ? "on" : undefined} />)}
        </div>
      )}
    </section>
  );
}
