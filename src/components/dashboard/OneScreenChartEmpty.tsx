/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Active-queries panel's empty state — a faded populated example with the CTA over it
 * (empty-states pack, Phase 1; ref `design-refs/scriptally-empty-states-v2.html`, `.chart.stage`).
 *
 * ⚠️ EVERY NUMBER IN HERE IS A CONSTANT, AND NOTHING REACHES THE REAL CHART'S DATA PATH. The point
 * of the pattern is to show what the panel becomes, so the example must be POPULATED — which is
 * exactly the shape that, fed through `bandSeries`, would be a fabricated series wearing the real
 * chart's clothes. It is drawn markup: a picture of a chart, not a chart.
 *
 * ⚠️ AND THE PICTURE IS INERT. `aria-hidden` plus `pointer-events: none` on the faded layer, so the
 * drawn Daily/Weekly/Monthly chips and the range slider cannot be tabbed to or clicked — a control
 * that looks like a control and answers nothing is worse than no control. The CTA is the only
 * focusable thing in the panel; `.os-ceg` (the glow) is `pointer-events: none` too, or it would
 * swallow the press it exists to frame.
 *
 * ⚠️ THE FILLS AND THE LEGEND ARE THE APP'S, NOT THE REF'S — a deliberate deviation, recorded.
 * The ref's palette IS this app's (`--state-*` are its sand/sage/pink/slate/grey to the digit), but
 * its legend reads "Awaiting reply" against the PINK band and "Requested" against the SAGE one,
 * which is the app's grammar inverted: pink is `--state-you`, material the writer owes. A legend
 * teaching a second vocabulary for the colours the rest of the app already speaks is the fault the
 * agent list's colour legend was deleted for. So the geometry is the ref's, verbatim, and the fills
 * and names are `STATE_TOKEN` / `BAND_LABEL`.
 */
import React from "react";
import { STATE_TOKEN } from "../../lib/queryCardFacts";
import { BAND_LABEL } from "../../lib/chartBands";
import { CHART_EMPTY_CTA } from "../../lib/dashEmpty";
import { OneScreenMark } from "./OneScreenMark";

/* ── the drawn example, all constants ──────────────────────────────────────────────────────── */

/** The ref's `.hd` figures — a populated eight-week window. */
const EG = { active: 14, awaiting: "9 awaiting a reply", range: "Last 8 weeks" } as const;

/** The ref's `.plot2 .y` ticks, bottom-up, and its `.x` week labels. */
const Y_TICKS = ["0", "5", "10", "15", "20"] as const;
const X_LABELS = ["20 Jul", "27 Jul", "03 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "07 Sep"] as const;

/**
 * The ref's three `<path>` geometries at its own `viewBox="0 0 800 276"`.
 *
 * ⚠️ THE OUTER AREA IS DRAWN FIRST, which is what makes the stack read back-to-front — the same
 * order `OneScreenChart` pushes its own areas in. Swapping them buries the inner band.
 */
const AREA_OUTER =
  "M0 276 L0 276 L60 262 L60 248 L110 248 L110 235 L150 235 L150 221 L190 221 L190 207 L240 207 " +
  "L240 180 L290 180 L290 166 L340 166 L340 152 L400 152 L400 138 L450 138 L450 124 L500 124 " +
  "L500 110 L560 110 L560 97 L620 97 L620 83 L680 83 L680 83 L740 83 L740 83 L800 83 L800 276 Z";
const AREA_INNER =
  "M0 276 L60 276 L60 262 L110 262 L110 248 L150 248 L150 235 L190 235 L190 221 L240 221 " +
  "L240 207 L290 207 L290 193 L340 193 L340 180 L400 180 L400 166 L450 166 L450 152 L500 152 " +
  "L500 152 L560 152 L560 138 L620 138 L620 152 L680 152 L680 152 L740 152 L740 152 L800 152 L800 276 Z";
const TOTAL_LINE =
  "M0 276 L60 262 L60 248 L110 248 L110 235 L150 235 L150 221 L190 221 L190 207 L240 207 " +
  "L240 180 L290 180 L290 166 L340 166 L340 152 L400 152 L400 138 L450 138 L450 124 L500 124 " +
  "L500 110 L560 110 L560 97 L620 97 L620 83 L800 83";
/** The ref's `<g>` of knot markers. */
const KNOTS: readonly [number, number][] = [
  [60, 248], [150, 221], [240, 180], [340, 152], [450, 124], [560, 97], [620, 83],
];

export const OneScreenChartEmpty: React.FC<{ onLogFirst?: () => void }> = ({ onLogFirst }) => (
  <div className="os-cempty" data-probe="chart-empty">
    {/* ── the faded example: header, plot and legend, all of it inert ── */}
    <div className="os-cefade" aria-hidden="true">
      <div className="os-ahead os-ce-head">
        <OneScreenMark name="active-queries" />
        <span className="os-stat">
          <span className="os-n">{EG.active}</span>
          <span className="os-statxt">
            <h2>Active queries</h2>
            <span className="os-delta">{EG.awaiting}</span>
          </span>
        </span>
        <div className="os-ctrls">
          {/*
            ⚠️ SPANS, NOT DISABLED BUTTONS. The drawn controls must not be reachable, and a
            `<button>` inside an `aria-hidden` subtree is still keyboard-focusable unless somebody
            remembers `tabindex="-1"` — so there is no button to forget about. They wear the REAL
            controls' container classes (`.os-freqchips`, `.os-brush`) so the picture is the panel's
            own furniture rather than a second drawing of it; only the inner span needs a rule,
            because `.os-freqchips button` cannot match a span.
          */}
          <span className="os-freqchips os-ce-seg">
            <span className="on">Daily</span><span>Weekly</span><span>Monthly</span>
          </span>
          <span className="os-brush os-ce-range"><i className="os-ce-sl" />{EG.range}</span>
        </div>
      </div>

      <div className="os-ce-plot">
        <span className="os-ce-y">
          {Y_TICKS.map((t) => <i key={t}>{t}</i>)}
        </span>
        <span className="os-ce-grid">{X_LABELS.map((l) => <i key={l} />)}</span>
        <svg viewBox="0 0 800 276" preserveAspectRatio="none" className="os-ce-svg">
          <path d={AREA_OUTER} fill={STATE_TOKEN.agent} />
          <path d={AREA_INNER} fill={STATE_TOKEN.you} />
          <path d={TOTAL_LINE} fill="none" stroke="#1c130f" strokeWidth={1.8} />
          <g fill="#fff" stroke="#1c130f" strokeWidth={1.5}>
            {KNOTS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.5} />)}
          </g>
        </svg>
        <span className="os-ce-x">{X_LABELS.map((l) => <i key={l}>{l}</i>)}</span>
      </div>

      <div className="os-ce-legend">
        <span><i style={{ background: "#1c130f" }} />Active</span>
        <span><i style={{ background: STATE_TOKEN.you }} />{BAND_LABEL.you}</span>
        <span><i style={{ background: STATE_TOKEN.agent }} />{BAND_LABEL.agent}</span>
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
