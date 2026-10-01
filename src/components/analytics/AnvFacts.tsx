/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The fact line and the reply-window chart (Analytics v2a).
 *
 * ⚠️ EVERY FIGURE STATES WHAT IT RESTS ON. The line beneath each fact is the population, and a
 * figure resting on fewer than five queries wears the sand chip. A figure resting on nothing is an
 * em dash and a plain line saying what is missing — never a 0, never 0%.
 *
 * ⚠️ THE REPLY CHART IS HTML, NOT SVG, so an agent's name WRAPS rather than being cut off at a
 * fixed label width — the ref's `data-lab="58"` column would clip any surname longer than "Okonjo".
 */
import React from "react";
import { AnalyticsModel, Figure, STATE_FILL, StateBucket } from "../../lib/analyticsModel";

export const SampleChip: React.FC<{ text: string }> = ({ text }) => (
  <span className="anv-chip" data-anv="chip">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M12 11v5" /></svg>
    {text}
  </span>
);

const Fact: React.FC<{ k: string; f: Figure }> = ({ k, f }) => (
  <div className="anv-fact" data-anv="fact" data-population={f.population}>
    <div className="anv-tw anv-fk">{k}</div>
    <div className="anv-tw anv-fv">{f.value}</div>
    <div className="anv-fs">{f.note}</div>
    {f.chip ? <SampleChip text={f.chip} /> : null}
  </div>
);

export const AnvFacts: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { requestRate, stillOut, medianWait, busiestMonth } = model.facts;
  return (
    <div className="anv-facts" data-anv="facts">
      <Fact k="Request rate" f={requestRate} />
      <Fact k="Still out" f={stillOut} />
      <Fact k="Median wait" f={medianWait} />
      <Fact k="Busiest month" f={busiestMonth} />
    </div>
  );
};

const BUCKET_WORDS: Partial<Record<StateBucket, string>> = {
  requested: "Asked for material",
  sent: "Material sent",
  offer: "Offer",
  closed: "Closed",
};

/** Ticks every `step` along 0..max, excluding 0. */
const ticks = (max: number, step: number) => {
  const out: number[] = [];
  for (let v = step; v <= max; v += step) out.push(v);
  return out;
};

export const AnvReplyChart: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { rows, maxWeeks, withoutWindow, figure } = model.reply;
  const pct = (w: number) => `${Math.min(100, (w / maxWeeks) * 100)}%`;
  const seen = [...new Set(rows.map((r) => r.bucket))];
  const step = maxWeeks > 40 ? 8 : 4;
  return (
    <div className="anv-card" data-anv="chart-reply" data-population={rows.length}>
      <div className="anv-cap">
        <h3 className="anv-tw">When replies arrived</h3>
        <span className="anv-sub">Against the response window each agent states</span>
        {figure.chip ? <SampleChip text={figure.chip} /> : null}
      </div>
      <div className="anv-inner">
        {rows.length === 0 ? (
          <p className="anv-none" data-anv="none"><span className="anv-tw anv-dash">—</span> {figure.note}.</p>
        ) : (
          <div className="anv-rw" role="img" aria-label={`${rows.length} replies, each against the window its agent states`}>
            {rows.map((r) => (
              <React.Fragment key={r.id}>
                <div className="anv-rwname" title={r.sub ? `${r.name} · ${r.sub}` : r.name}>{r.name}</div>
                <div className="anv-rwtrack">
                  {ticks(maxWeeks, step).map((t) => <i key={t} className="anv-tick" style={{ left: pct(t) }} />)}
                  <span className="anv-rwwin" style={{ width: pct(r.windowWeeks) }} />
                  <span
                    className="anv-rwmk"
                    data-anv="mark"
                    style={{ left: pct(r.replyWeeks), background: STATE_FILL[r.bucket] }}
                    title={`Replied after ${r.replyDays} ${r.replyDays === 1 ? "day" : "days"}; the agency states ${r.windowWeeks} weeks`}
                  />
                </div>
              </React.Fragment>
            ))}
            <div />
            <div className="anv-axis">
              {ticks(maxWeeks, step).map((t) => <span key={t} style={{ left: pct(t) }}>{t}w</span>)}
            </div>
          </div>
        )}
        {withoutWindow > 0 ? (
          <p className="anv-foot">
            {withoutWindow} {withoutWindow === 1 ? "reply is" : "replies are"} from an agency that states no window, so {withoutWindow === 1 ? "it is" : "they are"} not drawn.
          </p>
        ) : null}
        <div className="anv-legend">
          <span><i className="anv-sw" style={{ background: "var(--anv-sand)" }} />The window the agent states</span>
          {seen.map((b) => (
            <span key={b}><i className="anv-sw anv-sw--dot" style={{ background: STATE_FILL[b] }} />{BUCKET_WORDS[b] ?? b}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
