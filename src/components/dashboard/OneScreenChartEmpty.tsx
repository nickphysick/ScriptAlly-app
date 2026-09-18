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
 * ⚠️ AND THE PICTURE IS THE CHART THE PANEL BECOMES — which is the one thing about this file that
 * keeps going stale, because it is a hand-drawn copy of a card that moves. It has now drawn three
 * different charts: the stacked bands and range capsule, then the hawk and a three-grain toggle, and
 * now v16's title, mono eyebrow, legend and single `Weekly` chip. A picture of a retired control
 * promises the reader something the populated card does not have — and the drawing is inert, so
 * nothing fails when it drifts. **A pass that changes the chart's header changes this one too.**
 *
 * ⚠️ AND THE CLASSES ARE THE CARD'S OWN, WHICH IS WHAT MAKES THAT CATCHABLE. The drawn header wears
 * `.os-achead` / `.os-acid` / `.os-acstat` / `.os-aclegend` / `.os-acx` — the live rules — so when
 * the v16 rewrite dropped the old chart's `.os-acart`, `.os-acn`, `.os-acttl`, `.os-acdelta` and
 * `.os-actog`, this panel was left drawing five classes no sheet declared. Nothing errored; the
 * first-run panel simply fell apart, on the one screen a new writer sees first.
 *
 * ⚠️ AND IT IS INERT. `aria-hidden` plus `pointer-events: none` on the faded layer, so the drawn grain
 * toggle cannot be tabbed to or clicked — a control that looks like a control and answers nothing is
 * worse than no control. The CTA is the only focusable thing in the panel; `.os-ceg` (the glow) is
 * `pointer-events: none` too, or it would swallow the press it exists to frame.
 */
import React from "react";
import { CHART_EMPTY_CTA } from "../../lib/dashEmpty";

/* ── the drawn example, all constants ──────────────────────────────────────────────────────── */

/* the eyebrow's clauses, in the live card's own shape — `N out with agents · ↑ N over 8 weeks` */
const EG = { eyebrow: ["14 out with agents", "↑ 9 over 8 weeks"] } as const;
/* the legend, in the live card's order */
const LEGEND = ["Active", "Request", "Pass"] as const;
const X_LABELS = ["20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"] as const;
/* a rising line on a 800×200 drawing, with its fade closed down to the baseline at y=196 */
const LINE = "M8 176 C 60 170, 90 160, 118 150 S 200 128, 236 124 S 320 104, 354 96 S 440 84, 472 76 S 560 58, 590 52 S 690 40, 792 34";
const AREA = `${LINE} L792 196 L8 196 Z`;
const GRID_Y = [196, 116, 36] as const;
/* the weeks a request came in, in the drawing — the live card derives these from the activity log */
const HOT = new Set([3, 6]);

export const OneScreenChartEmpty: React.FC<{ onLogFirst?: () => void }> = ({ onLogFirst }) => (
  <div className="os-cempty" data-probe="chart-empty">
    {/* ── the faded example: header and plot, all of it inert ── */}
    <div className="os-cefade" aria-hidden="true">
      <div className="os-achead os-ce-head">
        <div className="os-acid">
          <div className="os-acstat">
            <h3 className="os-cardttl">Active queries</h3>
            <p className="os-sub">
              {EG.eyebrow.map((clause, i) => (
                <React.Fragment key={clause}>{i > 0 && " · "}<span className="os-subc">{clause}</span></React.Fragment>
              ))}
            </p>
          </div>
        </div>
        {/* ⚠️ A SPAN, NOT A DISABLED BUTTON — a `<button>` inside an `aria-hidden` subtree is still
            focusable unless somebody remembers `tabindex="-1"`, so there is no button to forget.
            ⚠️ AND ONE GRAIN, BECAUSE THE CARD STATES ONE. Drawing Daily/Weekly/Monthly here promised
            a toggle the populated card does not have. */}
        <span className="os-mini os-ce-seg">Weekly</span>
      </div>

      {/* the legend, as the card draws it */}
      <div className="os-aclegend">
        {LEGEND.map((l) => (
          <span key={l} className="os-aclg"><i className={`os-aclgd os-aclgd--${l.toLowerCase()}`} />{l}</span>
        ))}
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
        {/* ⚠️ THE CARD'S OWN AXIS — one flex slot per week, each carrying its tick as a `::before`,
            so the drawing cannot place a label somewhere the real chart would not. The two "hot"
            weeks stand in for the weeks a request came in. */}
        <div className="os-acx os-ce-x">
          {X_LABELS.map((l, i) => (
            <span key={l} className={HOT.has(i) ? "hot" : undefined}>{l}</span>
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
