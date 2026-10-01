/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The hero sentence, the range control and "The journey so far" (Analytics v2a, lead option A).
 *
 * ⚠️ NO TILE STRIP. The headline is the typewriter sentence; the leftover facts are the ruled fact
 * line below the funnel. The five inset-framed tiles the old page led with are gone for good.
 *
 * ⚠️ THE FUNNEL'S FOUR GLYPHS ARE THE REAL `StatusDot`, imported at 80px — never a hand-drawn ring.
 * The ref draws them by hand only because it is a standalone file.
 *
 * ⚠️ "WHAT BECAME OF THEM" IS WHERE EACH STAGE'S QUERIES STAND TODAY, in the five state fills and
 * nothing else — so a split bar's colour always means the same thing it means in every chart on
 * the page. Buckets with nobody in them are not drawn.
 *
 * ⚠️ NO APPRAISAL. The hero states counts; a zero is said in words ("No offer yet"), never as "0".
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { AnalyticsRange, RANGE_OPTIONS } from "../../lib/analytics";
import { AnalyticsModel, JourneyStage, STATE_FILL } from "../../lib/analyticsModel";

const RANGE_WORDS: Record<AnalyticsRange, string> = { all: "", "6m": " in the last six months", "3m": " in the last three months" };

export const AnvHero: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { sent, requests, offers, under } = model.hero;
  const tail = RANGE_WORDS[model.range];
  return (
    <div className="anv-card anv-hero" data-anv="hero">
      <div className="anv-hero-copy">
        <p className="anv-tw anv-said">
          {sent === 0 ? (
            <>No queries out{tail}.</>
          ) : (
            <>
              <b>{sent}</b> {sent === 1 ? "query" : "queries"} out{tail}.<br />
              {requests === 0
                ? <>No agent has asked to read more yet.</>
                : <><b>{requests}</b> {requests === 1 ? "agent" : "agents"} asked to read more.</>}
              <br />
              {offers === 0 ? <>No offer yet.</> : <><b>{offers}</b> {offers === 1 ? "offer" : "offers"}.</>}
            </>
          )}
        </p>
        {under ? <div className="anv-under" data-anv="since">{under}</div> : null}
      </div>
    </div>
  );
};

/**
 * ⚠️ `aria-pressed` ON ALL THREE, NONE DISABLED — pressing the current range is a harmless no-op,
 * and a disabled control would be the one option a keyboard user cannot land on.
 */
export const AnvRange: React.FC<{ value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }> = ({ value, onChange }) => (
  <div className="anv-controls" data-anv="controls">
    <div className="anv-seg" role="group" aria-label="Date range" data-anv="range">
      {RANGE_OPTIONS.map((o) => (
        <button key={o.value} type="button" className="anv-tw" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const Stage: React.FC<{ s: JourneyStage }> = ({ s }) => (
  <div className="anv-jstage" data-anv="stage" data-key={s.key}>
    <div className="anv-jring"><StatusDot status={s.dotStatus} overrideSize={80} decorative /></div>
    <div className="anv-tw anv-jn" data-anv="n">{s.display}</div>
    <div className="anv-tw anv-jk">{s.name}</div>
    <div className="anv-jd">{s.description}</div>
    {s.split.length ? (
      <div className="anv-jsplit">
        {s.split.map((r) => (
          <div className="anv-srow" key={r.bucket} data-anv="split" data-bucket={r.bucket}>
            <span className="anv-sbar"><i style={{ width: `${Math.max(4, r.share * 100)}%`, background: STATE_FILL[r.bucket] }} /></span>
            <span className="anv-slab">{r.label}</span>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

const Link: React.FC<{ label: string }> = ({ label }) => (
  <div className="anv-jlink" data-anv="link">
    <div className="anv-tw anv-jpct">{label}</div>
    <div className="anv-tw anv-jlab">went on</div>
    <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 6h88" strokeDasharray="3 4" />
      <path d="m88 2 5 4-5 4" />
    </svg>
  </div>
);

export const AnvJourney: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const { stages, links } = model.journey;
  return (
    <div className="anv-card" data-anv="journey">
      <div className="anv-cap">
        <h3 className="anv-tw">The journey so far</h3>
        <span className="anv-sub">
          {model.sent === 0 ? "No submissions in this period" : `Where ${model.sent} ${model.sent === 1 ? "submission" : "submissions"} reached`}
        </span>
      </div>
      <div className="anv-inner anv-jgrid">
        {stages.map((s, i) => (
          <React.Fragment key={s.key}>
            <Stage s={s} />
            {i < links.length ? <Link label={links[i].label} /> : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
