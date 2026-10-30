/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part D — THE THREE-STOP TOUR (ref design-refs/dashboard-first-visit-v2/, screens 02–04).
 *
 * The help system's spotlight (`SpotCard`, the dim with a live hole), never a second overlay. Each stop: "{i} of 3",
 * the title, the text, Skip and Next ("Got it" on the last). Escape skips; focus moves to Next on each stop. Under
 * reduced motion there is no transition between stops (pageChecklist.css already stills the dim).
 */
import React from "react";
import { createPortal } from "react-dom";
import { SpotCard } from "../../shell/guide/SpotCard";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { TOUR_LAST, TOUR_NEXT, TOUR_SKIP, TOUR_STOPS, tourKicker } from "../../../lib/dashTour";
import "../../shell/guide/pageChecklist.css";

export const FirstVisitTour: React.FC<{
  stop: number;
  onNext: () => void;
  /** Skip, Escape: `stop` is the stop it ended on (0-based) */
  onSkip: (stop: number) => void;
}> = ({ stop, onNext, onSkip }) => {
  const s = TOUR_STOPS[stop];
  /* ⚠️ ESCAPE THROUGH THE APP'S ONE STACK, AT THE TOP: the stack is installed on the window first and stops the key for
     its top layer, so the spotlight's own listener never hears Escape while any layer is live — and a page's popover
     layer can be live on a page that is mounted but not on screen (measured). */
  useEscapeLayer(!!s, () => onSkip(stop), ESC_LEVEL.tour);
  if (!s || typeof document === "undefined") return null;
  const last = stop === TOUR_STOPS.length - 1;
  return createPortal(
    <div className="pck-layer fv2-tour" data-fv2="tour" data-stop={stop + 1}>
      <SpotCard
        spec={{ id: `fv2-tour-${stop}`, target: () => document.querySelector<HTMLElement>(s.target), onEscape: () => onSkip(stop) }}
        kicker={tourKicker(stop)}
        title={s.title}
        body={s.text}
        attrs={{ "data-fv2": "tour-spot" }}
        onPlaced={(card) => card.querySelector<HTMLButtonElement>('[data-fv2="tour-next"]')?.focus({ preventScroll: true })}
        foot={<>
          <button type="button" className="pck-back fv2-tskip" data-fv2="tour-skip" onClick={() => onSkip(stop)}>{TOUR_SKIP}</button>
          <button type="button" className="pck-cta" data-fv2="tour-next" onClick={onNext}>{last ? TOUR_LAST : TOUR_NEXT}</button>
        </>}
      />
    </div>,
    document.body,
  );
};
