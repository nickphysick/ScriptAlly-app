/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Weeks to an ending" and "Stage to stage" (Analytics v2a, the two-up).
 *
 * ⚠️ BOTH DEGRADE HONESTLY ON THIN DATA (baked decision 9). A lane or a row with nothing in it says
 * so in words, with an em dash; a row resting on fewer than five queries wears the sand chip. The
 * median tick is drawn only where there is a median — a tick over one query is that query.
 *
 * ⚠️ ONLY DATED GAPS ARE DRAWN. A query with a missing end is left out of the gap it spans and
 * counted in the foot, never placed at a guessed date.
 */
import React from "react";
import { AnalyticsModel, STATE_FILL } from "../../lib/analyticsModel";
import { SampleChip } from "./AnvFacts";

const ticks = (max: number, step: number) => {
  const out: number[] = [];
  for (let v = step; v <= max; v += step) out.push(v);
  return out;
};

export const AnvEndings: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { lanes, maxWeeks, closed, undatedClosed, figure } = model.endings;
  const pct = (w: number) => `${Math.min(100, (w / maxWeeks) * 100)}%`;
  const step = maxWeeks > 48 ? 16 : 8;
  return (
    <div className="anv-card" data-anv="chart-endings" data-population={closed}>
      <div className="anv-cap">
        <h3 className="anv-tw">Weeks to an ending</h3>
        <span className="anv-sub">How long each closed query ran</span>
      </div>
      <div className="anv-inner">
        {closed === 0 ? (
          <p className="anv-none" data-anv="none"><span className="anv-tw anv-dash">—</span> {figure.note}.</p>
        ) : (
          <div className="anv-lanes">
            {lanes.map((l) => (
              <React.Fragment key={l.key}>
                <div className="anv-lname">{l.label}</div>
                <div className="anv-lane" data-anv="lane" data-key={l.key} data-count={l.weeks.length}>
                  {ticks(maxWeeks, step).map((t) => <i key={t} className="anv-tick" style={{ left: pct(t) }} />)}
                  {l.weeks.length === 0 ? <span className="anv-lnone">none</span> : null}
                  {l.weeks.map((w, i) => (
                    <span key={i} className="anv-lmk" data-anv="mark" style={{ left: pct(w), background: STATE_FILL[l.bucket] }}
                      title={`${w} ${w === 1 ? "week" : "weeks"}`} />
                  ))}
                  {l.medianWeeks !== null && l.weeks.length > 1 ? (
                    <span className="anv-med" style={{ left: pct(l.medianWeeks) }} title={`Median ${l.medianWeeks} weeks`} />
                  ) : null}
                </div>
              </React.Fragment>
            ))}
            <div />
            <div className="anv-axis">{ticks(maxWeeks, step).map((t) => <span key={t} style={{ left: pct(t) }}>{t}w</span>)}</div>
          </div>
        )}
        {undatedClosed > 0 ? (
          <p className="anv-foot">{undatedClosed} closed {undatedClosed === 1 ? "query has" : "queries have"} no dated ending and {undatedClosed === 1 ? "is" : "are"} not drawn.</p>
        ) : null}
        <div className="anv-legend">
          <span><i className="anv-sw anv-sw--tick" />Median</span>
          <span>One marker = one query</span>
          {figure.chip ? <SampleChip text={figure.chip} /> : null}
        </div>
      </div>
    </div>
  );
};

export const AnvStages: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { rows, maxDays } = model.stages;
  const pct = (d: number) => `${Math.min(100, (d / maxDays) * 100)}%`;
  const population = rows.reduce((n, r) => n + r.days.length, 0);
  const thin = rows.filter((r) => r.chip);
  const step = maxDays > 180 ? 60 : 30;
  return (
    <div className="anv-card" data-anv="chart-stages" data-population={population}>
      <div className="anv-cap">
        <h3 className="anv-tw">Stage to stage</h3>
        <span className="anv-sub">The gap between each step</span>
      </div>
      <div className="anv-inner">
        {population === 0 ? (
          <p className="anv-none" data-anv="none"><span className="anv-tw anv-dash">—</span> no dated step from one stage to the next yet.</p>
        ) : (
          <div className="anv-stg">
            {rows.map((r) => (
              <React.Fragment key={r.key}>
                <div className="anv-sname">{r.label}</div>
                <div className="anv-strack" data-anv="stage-row" data-key={r.key} data-count={r.days.length}>
                  {ticks(maxDays, step).map((t) => <i key={t} className="anv-tick" style={{ left: pct(t) }} />)}
                  {r.lo === null || r.hi === null ? (
                    <span className="anv-lnone">— {r.missing}</span>
                  ) : (
                    <>
                      <span className="anv-sbarr" data-anv="mark"
                        style={{ left: pct(r.lo), width: `max(8px, ${((r.hi - r.lo) / maxDays) * 100}%)`, background: STATE_FILL[r.bucket] }}
                        title={`${r.lo}–${r.hi} days, median ${r.medianDays}, from ${r.days.length} ${r.days.length === 1 ? "query" : "queries"}`} />
                      {r.medianDays !== null && r.days.length > 1 ? <span className="anv-med anv-med--s" style={{ left: pct(r.medianDays) }} /> : null}
                    </>
                  )}
                </div>
              </React.Fragment>
            ))}
            <div />
            <div className="anv-axis">{ticks(maxDays, step).map((t) => <span key={t} style={{ left: pct(t) }}>{t}d</span>)}</div>
          </div>
        )}
        <div className="anv-legend">
          <span>Bar = fastest to slowest</span>
          <span><i className="anv-sw anv-sw--tick" />Median</span>
          {thin.length ? (
            <SampleChip text={thin.length === 1
              ? `${thin[0].label} rests on ${thin[0].days.length} ${thin[0].days.length === 1 ? "query" : "queries"}`
              : `${thin.length} rows rest on ${thin.map((r) => r.days.length).join(" and ")} queries`} />
          ) : null}
        </div>
      </div>
    </div>
  );
};
