/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK, v131 (§2) — "At a glance" with no header. One white panel, three equal sections divided by
 * dashed rules: the court's eyebrow, its total in the typewriter, two facts that never wrap, the weekly
 * bars on the right, and a foot with the next relevant date and what the bars count.
 *
 * ⚠️ CLICKING A SECTION CHOOSES FOR THE CAROUSEL ONLY, never the list (v126, as ruled). The section is
 * a group with a full-cover button behind its contents; the bars sit above that button so they can be
 * hovered, and a press on a bar does not select the section.
 *
 * ⚠️ DESKTOP ONLY. Below 768px the page renders the v126 desk (`QcCourts`) — mobile is untouched.
 */
import React, { useState } from "react";
import type { TileCourt } from "../../../lib/qcSummary";
import { barHeights, type DeskSection } from "../../../lib/qcDesk";
import { barText } from "../../../lib/qcDeskWeeks";
import "./qcvPage.css";
import "./qcv131.css";

export const QcDesk: React.FC<{
  sections: readonly DeskSection[];
  active?: TileCourt | null;
  onCourt: (key: TileCourt) => void;
  loading?: boolean;
}> = ({ sections, active = null, onCourt, loading = false }) => {
  const [hover, setHover] = useState<{ court: TileCourt; i: number } | null>(null);
  return (
    <div className="qc13-desk" data-qcv="courts" data-v="131">
      {sections.map((s) => {
        const hs = barHeights(s.bars.counts);
        const hov = hover?.court === s.key ? hover.i : null;
        const label = `${s.label}: ${s.total} ${s.total === 1 ? "query" : "queries"}. ${s.facts.map((f) => `${f.n} ${f.text}`).join(", ")}.`;
        return (
          <div key={s.key} role="group" aria-label={s.label}
            className={`qc13-dc qc13-dc--${s.key}${active === s.key ? " is-on" : ""}`} data-qcv="court" data-court={s.key}>
            <button type="button" className="qc13-dc-hit" data-qcv="court-pick" aria-pressed={active === s.key}
              disabled={loading} aria-label={loading ? `${s.label}: loading` : label} onClick={() => onCourt(s.key)} />
            <small className="qc13-dc-eb" data-qcv="court-eyebrow">{s.label}</small>
            <div className="qc13-dc-row1">
              {/* ⚠️ WHILE LOADING THE NUMBERS ARE NOT KNOWN, so nothing states one: the same boxes, their text
                  kept for its line box and painted over (`qc13-sk`). "0 offers to decide" would be a claim. */}
              <i className={`qc13-dc-n${loading ? " qc13-sk" : ""}`} data-qcv="court-count">{loading ? "00" : s.total}</i>
              <div className="qc13-dc-ln">
                {s.facts.map((f, i) => (
                  <span key={i} className={`qc13-dc-fact${loading ? " qc13-sk" : ""}`} data-qcv="court-fact"><b>{loading ? "00" : f.n}</b> {f.text}</span>
                ))}
              </div>
              <div className={`qc13-vz${hov != null ? " is-hov" : ""}`} data-qcv="court-bars">
                <div className={`qc13-bars${loading ? " qcv-skw" : ""}`} role="list" aria-label={`${s.label}, the last twelve weeks`} aria-hidden={loading || undefined}>
                  {s.bars.counts.map((n, i) => {
                    const text = barText(s.key, s.bars.weeks[i], n);
                    return (
                      <span key={i} role="listitem" aria-label={text}
                        className={`qc13-b${i === s.bars.counts.length - 1 ? " now" : ""}${hov === i ? " hv" : ""}`}
                        data-qcv="bar" data-i={i} data-n={n}
                        style={{ height: `${hs[i]}px` }}
                        onMouseEnter={() => setHover({ court: s.key, i })}
                        onMouseLeave={() => setHover(null)}
                        onClick={(e) => e.stopPropagation()}>
                        {hov === i && <span className="qc13-tip" role="tooltip" data-qcv="bar-tip">{text}</span>}
                      </span>
                    );
                  })}
                </div>
                <small className="qc13-vz-k">12 WKS</small>
              </div>
            </div>
            <div className="qc13-dc-nx" data-qcv="court-foot">
              <span className={loading ? "qc13-sk" : undefined} data-qcv="court-when">{s.foot.label} {loading ? "00 XXX" : s.foot.date ?? "—"}</span>
              <span className="qc13-dc-cap" data-qcv="court-cap">{s.caption}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
