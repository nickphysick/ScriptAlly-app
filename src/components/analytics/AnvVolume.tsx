/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Volume" (queries sent each month, and where they stand today) and the closing caveats block
 * (Analytics v2a).
 *
 * ⚠️ EACH MONTH'S BAR IS STACKED IN THE FIVE STATE FILLS, BY TODAY'S STATUS — the same buckets the
 * journey's splits use, so one colour means one thing on the whole page.
 *
 * ⚠️ THE CAVEATS CLOSE THE PAGE, AND THEY EXPLAIN RATHER THAN SOFTEN. Every population in them is
 * written from the live model — never "27 queries" copied from the ref.
 */
import React from "react";
import { AnalyticsModel, STATE_FILL, STATE_LABEL, STATE_ORDER } from "../../lib/analyticsModel";

export const AnvVolume: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { months, max, undated, omittedMonths, omittedQueries } = model.volume;
  const top = Math.max(2, max % 2 ? max + 1 : max);
  const step = top > 10 ? Math.ceil(top / 4) : 2;
  const yTicks: number[] = [];
  for (let v = 0; v <= top; v += step) yTicks.push(v);
  const population = months.reduce((n, m) => n + m.total, 0);
  return (
    <>
      <div className="anv-sec" data-anv="sec-volume">
        <h2 className="anv-tw">Volume</h2>
        <span className="anv-note">Queries sent each month, and where they stand today</span>
      </div>
      <div className="anv-card" data-anv="chart-volume" data-population={population}>
        <div className="anv-inner anv-vinner">
          {population === 0 ? (
            <p className="anv-none" data-anv="none"><span className="anv-tw anv-dash">—</span> no dated sends in this period.</p>
          ) : (
            <div className="anv-vol" role="img" aria-label={`Queries sent in each of ${months.length} months`}>
              <div className="anv-vy">
                {yTicks.map((v) => <span key={v} style={{ bottom: `${(v / top) * 100}%` }}>{v}</span>)}
              </div>
              <div className="anv-vplot">
                {yTicks.map((v) => <i key={v} className="anv-vgrid" style={{ bottom: `${(v / top) * 100}%` }} />)}
                {months.map((m) => (
                  <div className="anv-vcol" key={m.key} title={`${m.total} ${m.total === 1 ? "query" : "queries"} sent`}>
                    <div className="anv-vstack" style={{ height: `${(m.total / top) * 100}%` }}>
                      {STATE_ORDER.filter((b) => m.counts[b] > 0).map((b) => (
                        <span key={b} className="anv-vseg" data-anv="mark" data-bucket={b}
                          style={{ flexGrow: m.counts[b], background: STATE_FILL[b] }} />
                      ))}
                    </div>
                    <span className="anv-vx">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {omittedMonths > 0 || undated > 0 ? (
            <p className="anv-foot">
              {omittedMonths > 0 ? `${omittedQueries} ${omittedQueries === 1 ? "query" : "queries"} from ${omittedMonths} earlier ${omittedMonths === 1 ? "month is" : "months are"} not drawn. ` : ""}
              {undated > 0 ? `${undated} ${undated === 1 ? "query has" : "queries have"} no send date and ${undated === 1 ? "sits" : "sit"} outside every month.` : ""}
            </p>
          ) : null}
          <div className="anv-legend">
            {STATE_ORDER.map((b) => (
              <span key={b}><i className="anv-sw" style={{ background: STATE_FILL[b] }} />{b === "queried" ? "Still queried" : STATE_LABEL[b]}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export const AnvCaveats: React.FC<{ model: AnalyticsModel }> = ({ model }) => (
  <section className="anv-caveats" data-anv="caveats">
    <h3 className="anv-tw">What these numbers can't tell you</h3>
    <p className="anv-clead">{model.caveats.lead}</p>
    <div className="anv-cgrid">
      {model.caveats.notes.map((n) => (
        <div key={n.title}>
          <h4 className="anv-tw">{n.title}</h4>
          <p>{n.text}</p>
        </div>
      ))}
    </div>
  </section>
);
