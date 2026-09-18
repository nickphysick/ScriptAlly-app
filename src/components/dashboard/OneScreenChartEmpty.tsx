/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChartEmpty — the active-queries card with no queries (v33, 18 Sep; copy and layout ref
 * `closed-empty.html`, option A — a matching pair with the closed card's own empty state).
 *
 * No chart and no Mentor: the Courier, a line saying what this card will become, and the one thing to
 * do about it. The band stays above it, reading "No active queries".
 *
 * ⚠️ THE FADED EXAMPLE CHART IS RETIRED. It drew a rising line, a legend and a grain chip the live
 * card no longer has, under a button — a picture of a different card. What replaces it promises
 * nothing the populated state does not do.
 */
import React from "react";
import { CHART_EMPTY_CTA, CHART_EMPTY_LINE, CHART_EMPTY_TITLE } from "../../lib/dashEmpty";
import { DASH_ART, artUrl } from "../../lib/dashArt";

export const OneScreenChartEmpty: React.FC<{ onLogFirst?: () => void }> = ({ onLogFirst }) => (
  <div className="os-hollow os-cempty" data-probe="chart-empty">
    <img
      className="os-hollow-art os-hollow-art--courier" src={artUrl(DASH_ART.courier)}
      width={DASH_ART.courier.width} height={DASH_ART.courier.height} alt="" decoding="async"
    />
    <p className="os-hollow-ttl">{CHART_EMPTY_TITLE}</p>
    <p className="os-hollow-line">{CHART_EMPTY_LINE}</p>
    <button type="button" className="os-inkpill os-ce-cta" onClick={onLogFirst}>{CHART_EMPTY_CTA}</button>
  </div>
);
