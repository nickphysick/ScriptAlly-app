/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoTour — the first-visit spotlight tour (design ref: design-refs/todo-onboarding-tour.html,
 * ACT 1 ONLY). A fixed scrim with a moving rounded CUTOUT (the box-shadow-hole technique) glides
 * between five live targets; the coach card follows in the header's grammar (white, 1.5px ink
 * border). The board is untouched beneath — the scrim blocks interaction for the tour's duration.
 *
 * Targets are located by selector AT OPEN and stops with missing targets are FILTERED (a replay on
 * an urgent-empty board simply skips the card-pill stop and renumbers) — the auto-run gate
 * (todoTour.shouldAutoRunTour) already keeps the tour off the new desk. The hole recomputes on
 * resize; each stop scrolls its target into view first. Esc ends the tour (counts as skip — the
 * caller stamps `tourSeenAt` on ANY end). 450ms ease between stops; `prefers-reduced-motion`
 * removes the transition (CSS).
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { TOUR_STOPS, TourStop } from "../../lib/todoTour";

interface Rect { left: number; top: number; width: number; height: number; }

export interface TodoTourProps {
  /** Called on ANY end — Done or skip/Esc; the caller stamps the seen flag either way. */
  onEnd: () => void;
}

export const TodoTour: React.FC<TodoTourProps> = ({ onEnd }) => {
  const [stops, setStops] = useState<TourStop[]>([]);
  const [idx, setIdx] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [coach, setCoach] = useState<{ left: number; top: number } | null>(null);

  // Locate live targets once at open; missing ones drop out and the count renumbers.
  useLayoutEffect(() => {
    const live = TOUR_STOPS.filter((s) => document.querySelector(s.sel));
    if (!live.length) { onEnd(); return; }
    setStops(live);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function measure(stop: TourStop) {
    const el = document.querySelector(stop.sel);
    if (!el) return;
    (el as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
    window.requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const pad = 10;
      setHole({ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
      // coach: below the target, else above; clamped to the viewport
      const COACH_W = 320;
      const COACH_H = 210;
      let cx = r.left;
      let cy = r.bottom + 18;
      if (cy + COACH_H > window.innerHeight) cy = r.top - COACH_H;
      if (cx + COACH_W + 14 > window.innerWidth) cx = window.innerWidth - COACH_W - 24;
      if (cx < 14) cx = 14;
      setCoach({ left: cx, top: Math.max(14, cy) });
    });
  }

  useEffect(() => {
    if (stops.length) measure(stops[idx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, idx]);

  useEffect(() => {
    const onResize = () => stops.length && measure(stops[idx]);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onEnd(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, idx]);

  if (!stops.length || !hole) return null;
  const stop = stops[idx];
  const last = idx === stops.length - 1;

  return (
    <>
      <div className="tdb-tourscrim" aria-hidden>
        <div className="tdb-tourhole" style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} />
      </div>
      <div className="tdb-coach" role="dialog" aria-modal="true" aria-label="Board tour" style={coach ? { left: coach.left, top: coach.top } : undefined}>
        <div className="tdb-coachstep">
          <span>{idx + 1} OF {stops.length}</span>
          <span className="tdb-coachdots" aria-hidden>
            {stops.map((s, i) => <span key={s.sel} className={`tdb-coachdot${i < idx ? " dn" : i === idx ? " on" : ""}`} />)}
          </span>
        </div>
        <h3>{stop.h}</h3>
        <p>{stop.p}</p>
        <div className="tdb-coachacts">
          <button type="button" className="tdb-coachskip" onClick={onEnd}>Skip the tour</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-coachbk" style={{ visibility: idx ? "visible" : "hidden" }} onClick={() => setIdx((i) => Math.max(0, i - 1))}>← Back</button>
          <button type="button" className="tdb-coachnx" onClick={() => (last ? onEnd() : setIdx((i) => i + 1))}>{last ? "Done" : "Next →"}</button>
        </div>
      </div>
    </>
  );
};

export default TodoTour;
