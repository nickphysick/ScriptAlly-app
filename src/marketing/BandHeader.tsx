/**
 * BandHeader — the parchment band's heading, with an ECG trace running behind it
 * (design ref: design-refs/scriptally-band-header-v1.html).
 *
 * ⚠️ THIS REPLACES THE HALO, IT DOES NOT JOIN IT. The heading used to sit in the cream section
 * above the band with a blush halo pulsing behind the word "pulse". Both the halo and that
 * section are gone; the heading is the band's first content now and the trace is the whole
 * treatment. Two heartbeats on one screen is one too many.
 *
 * ⚠️ THE PATH IS GENERATED, NEVER A PASTED STRING. `ecgPath` is a PQRST function — P bump, Q dip,
 * R spike, S dip, T bump — tiled at `CYCLE` across the viewBox. The two dials are the tile width
 * and the amplitude; a hardcoded `d` would make either one a rewrite. It is deterministic, so it
 * is computed once at module scope rather than in an effect, which also keeps it server-safe.
 */

import React from "react";
import { PULSE_HEADING } from "./landingCopy";

/** viewBox units. `preserveAspectRatio="none"` stretches these to whatever width the band is. */
const VIEW_W = 1200;
const VIEW_H = 150;
/** The two dials. */
const CYCLE = 300;
const AMP = 52;

export function ecgPath(w: number, h: number, cycle: number, amp: number): string {
  const mid = h / 2;
  let d = "";
  for (let x = 0; x < w + cycle; x += cycle) {
    d += (x === 0 ? `M${x} ${mid}` : `L${x} ${mid}`);
    d += `L${x + cycle * 0.30} ${mid}`;
    d += `Q${x + cycle * 0.34} ${mid - amp * 0.22} ${x + cycle * 0.38} ${mid}`;   // P
    d += `L${x + cycle * 0.43} ${mid}`;
    d += `L${x + cycle * 0.455} ${mid + amp * 0.28}`;                             // Q
    d += `L${x + cycle * 0.50} ${mid - amp}`;                                     // R
    d += `L${x + cycle * 0.545} ${mid + amp * 0.52}`;                             // S
    d += `L${x + cycle * 0.58} ${mid}`;
    d += `Q${x + cycle * 0.66} ${mid - amp * 0.34} ${x + cycle * 0.74} ${mid}`;   // T
    d += `L${x + cycle} ${mid}`;
  }
  return d;
}

const TRACE = ecgPath(VIEW_W, VIEW_H, CYCLE, AMP);

export const BandHeader: React.FC = () => (
  <div className="mk-headwrap">
    <div className="mk-ecg" aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
        <path className="mk-ecg-base" d={TRACE} />
        <path className="mk-ecg-live" d={TRACE} />
      </svg>
    </div>
    {/* ⚠️ The parchment gradient behind this heading is what makes the trace read as passing UNDER
        the words. It is not decoration — see the rule in marketing.css. */}
    <h2>{PULSE_HEADING}</h2>
  </div>
);
