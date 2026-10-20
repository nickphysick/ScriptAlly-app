/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 — "WHERE IT STANDS": the four sets (lib/qcSummary `whereItStands`) as the hero card, the pinned
 * band's breakdown and the Filters menu's section draw them. Ref design-refs/query-centre-v141/query-centre-v141.html.
 *
 * ⚠️ ONE FILTER: every press here writes `Qc138Filters.where` through the page's one setter; none of these parts holds
 *    a copy of which set is on.
 */
import React from "react";
import { WHERE_KEYS, WHERE_LABEL, type WhereKey } from "../../../lib/qcSummary";
import "./qcv141.css";

/** the marker square, one per set; Gone quiet is striped */
export const WhereMark: React.FC<{ k: WhereKey; tone?: "card" | "band" }> = ({ k, tone = "card" }) => (
  <span className={`qc141-m qc141-m--${k}${tone === "band" ? " qc141-m--b" : ""}`} aria-hidden="true" />
);

/** the Filters menu's "Where it stands" section: single-select, pressing the chosen set again clears it */
export const WhereMenuSection: React.FC<{
  where: WhereKey | null;
  counts: Record<WhereKey, number>;
  onWhere: (k: WhereKey | null) => void;
}> = ({ where, counts, onWhere }) => (
  <section className="qc141-fw" data-qc141="filter-where">
    <h4>Where it stands</h4>
    <div className="qc141-fw-g" role="radiogroup" aria-label="Where it stands">
      {WHERE_KEYS.map((k) => {
        const on = where === k;
        const n = counts[k];
        return (
          <button key={k} type="button" className={`qc141-fw-o${on ? " on" : ""}`} data-qc141="where-opt" data-k={k} data-opt={`where:${k}`} data-n={n}
            role="radio" aria-checked={on} title={WHERE_LABEL[k].title} disabled={!on && n === 0} onClick={() => onWhere(on ? null : k)}>
            <WhereMark k={k} />
            <b>{WHERE_LABEL[k].label}</b>
            <i>{n}</i>
          </button>
        );
      })}
    </div>
  </section>
);
