/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase C — LIST HEALTH'S RING (phone-feedback-v1.html section 2, option C; phone-hub-v5.html `lhRing`):
 * the desktop ring's geometry (lib/contactHealth `RING`, `ringArc`), in the phone's colours: a navy arc on a blush
 * track, the figure in the typewriter face. The arc sweeps in once when it first draws; with reduced motion it doesn't.
 */
import React from "react";
import { RING, RING_C, ringArc } from "../../../lib/contactHealth";
import "./phoneV5.css";

export const HealthRingV5: React.FC<{ pct: number; small?: boolean }> = ({ pct, small = false }) => {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const { ink } = ringArc(p);
  const c = RING.box / 2;
  return (
    <span className={`pa5-ring${small ? " sm" : ""}`} data-pa5="health-ring" data-pct={p} role="img" aria-label={`List health ${p}%`}>
      <svg viewBox={`0 0 ${RING.box} ${RING.box}`} aria-hidden="true">
        <circle cx={c} cy={c} r={RING.r} fill="none" stroke="var(--pa-blush)" strokeWidth={RING.w} />
        {p > 0 ? (
          <circle className="pa5-ring-a" cx={c} cy={c} r={RING.r} fill="none" stroke="var(--pa-navy)" strokeWidth={RING.w} strokeLinecap="round"
            strokeDasharray={`${ink} ${RING_C}`} transform={`rotate(-90 ${c} ${c})`} style={{ ["--c" as string]: `${RING_C}` }} />
        ) : null}
      </svg>
      <b className="pa5-ring-n" aria-hidden="true">{p}<i>%</i></b>
    </span>
  );
};
