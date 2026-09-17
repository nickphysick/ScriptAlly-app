/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Active-queries panel's empty state — a faded populated example with the CTA over it
 * (empty-states pack, Phase 1; redrawn for the stage-3 chart, 17 Sep).
 *
 * ⚠️ EVERY NUMBER IN HERE IS A CONSTANT, AND NOTHING REACHES THE REAL CHART'S DATA PATH. The point
 * of the pattern is to show what the panel becomes, so the example must be POPULATED — and a
 * populated series fed through the real derivations would be a fabricated record wearing the real
 * chart's clothes. It is drawn markup: a picture of a chart, not a chart.
 *
 * ⚠️ AND THE PICTURE IS THE CHART THE PANEL BECOMES. It used to draw the previous chart — stacked
 * bands, a legend and a range capsule — and all three are retired with it (stage 3), so a picture of
 * them would promise controls the populated card no longer has. It draws the hawk, the headline, the
 * three grains and one navy line over its fade, as the card does.
 *
 * ⚠️ AND IT IS INERT. `aria-hidden` plus `pointer-events: none` on the faded layer, so the drawn grain
 * toggle cannot be tabbed to or clicked — a control that looks like a control and answers nothing is
 * worse than no control. The CTA is the only focusable thing in the panel; `.os-ceg` (the glow) is
 * `pointer-events: none` too, or it would swallow the press it exists to frame.
 */
import React from "react";
import { CHART_EMPTY_CTA } from "../../lib/dashEmpty";
import { ACTIVE_QUERY_ART, artUrl } from "../../lib/dashArt";

/* ── the drawn example, all constants ──────────────────────────────────────────────────────── */

const EG = { active: 14, caption: "↑ 9 over 8 weeks · 4 replies" } as const;
const X_LABELS = ["20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"] as const;
/* a rising line on a 800×200 drawing, with its fade closed down to the baseline at y=196 */
const LINE = "M8 176 C 60 170, 90 160, 118 150 S 200 128, 236 124 S 320 104, 354 96 S 440 84, 472 76 S 560 58, 590 52 S 690 40, 792 34";
const AREA = `${LINE} L792 196 L8 196 Z`;
const GRID_Y = [196, 116, 36] as const;

export const OneScreenChartEmpty: React.FC<{ onLogFirst?: () => void }> = ({ onLogFirst }) => (
  <div className="os-cempty" data-probe="chart-empty">
    {/* ── the faded example: header and plot, all of it inert ── */}
    <div className="os-cefade" aria-hidden="true">
      <div className="os-achead os-ce-head">
        <div className="os-acid">
          <img className="os-acart" src={artUrl(ACTIVE_QUERY_ART)} width={ACTIVE_QUERY_ART.width} height={ACTIVE_QUERY_ART.height} alt="" />
          <div className="os-acstat">
            <div className="os-acrow">
              <span className="os-acn">{EG.active}</span>
              <span className="os-acttl">active queries</span>
            </div>
            <span className="os-acdelta">{EG.caption}</span>
          </div>
        </div>
        {/* ⚠️ SPANS, NOT DISABLED BUTTONS — a `<button>` inside an `aria-hidden` subtree is still
            focusable unless somebody remembers `tabindex="-1"`, so there is no button to forget. */}
        <span className="os-actog os-ce-seg">
          <span className="on">Daily</span><span>Weekly</span><span>Monthly</span>
        </span>
      </div>

      <div className="os-acbody">
        <div className="os-acplot os-ce-plot">
          <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="os-ce-svg">
            <defs>
              <linearGradient id="os-cefade-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2a3a52" stopOpacity="0.22" />
                <stop offset="1" stopColor="#2a3a52" stopOpacity="0" />
              </linearGradient>
            </defs>
            {GRID_Y.map((y) => <line key={y} x1={0} x2={800} y1={y} y2={y} className="os-acgrid" vectorEffect="non-scaling-stroke" />)}
            <path d={AREA} fill="url(#os-cefade-grad)" />
            <path d={LINE} fill="none" stroke="#2a3a52" strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="os-acx os-ce-x">
          {X_LABELS.map((l, i) => (
            <span key={l} className={i === 0 ? "first" : i === X_LABELS.length - 1 ? "last" : undefined} style={{ left: `${(1 + (i * 98) / (X_LABELS.length - 1)).toFixed(3)}%` }}>{l}</span>
          ))}
        </div>
      </div>
    </div>

    {/* ── the one live control ── */}
    <div className="os-ceover">
      <span className="os-ceg" aria-hidden="true" />
      <button type="button" className="os-btn-mini os-ce-cta" onClick={onLogFirst}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <path d="M3 11 21 3l-8 18-3-8z" />
        </svg>
        {CHART_EMPTY_CTA}
      </button>
    </div>
  </div>
);
