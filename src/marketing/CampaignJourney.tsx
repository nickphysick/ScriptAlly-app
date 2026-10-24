/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "How long will I need?" — four questions, one at a time, then a plan that fits. Ported from the
 * `.jy` markup and script in design-refs/pricing-page-v1.html; the arithmetic is
 * `campaignEstimate.ts`, the words are `pricingCopy.ts`.
 *
 * ⚠️ IT WRITES NOTHING AND SELLS NOTHING. The answers live in this component's state and go nowhere;
 * the plan card names a planned launch pass and offers no way to buy it.
 *
 * ⚠️ NOTHING IS PRE-SELECTED EXCEPT THE AGENTS COUNT (40). A pre-ticked answer would be the page
 * stating a fact about the reader they never gave it — and Next stays disabled until each question
 * is answered, a novel needing its length as well.
 *
 * ⚠️ FOCUS MOVES TO THE NEW QUESTION ON NEXT AND BACK, AND ONLY THEN. Moving it on mount would pull
 * a reader scrolling the page into the middle of it.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  JY_TITLE, JY_STEPS, jyStepLabel, JY_NEXT, JY_SEE_PLAN, JY_BACK, JY_AGAIN, JY_GOOD_TO_KNOW,
  JY_Q_STAGE, JY_STAGES, JY_Q_KIND, JY_KINDS, JY_Q_LEN, JY_LENGTHS, JY_Q_AGENTS, JY_FEWER, JY_MORE,
  JY_Q_PACE, JY_PACES, JY_INSIGHT, jyAgentsInsight, JY_YOUR_CAMPAIGN, JY_PREP_NOTE, JY_FITS,
  JY_INCLUDES, JY_ALL_PLANS, JY_TILES, type JyOption,
} from "./pricingCopy";
import {
  estimateCampaign, planCard, clampAgents, AGENTS_DEFAULT, AGENTS_STEP,
  type Stage, type Kind, type Length, type Pace,
} from "./campaignEstimate";

interface Answers { stage: Stage | null; kind: Kind | null; len: Length | null; pace: Pace | null; agents: number }

/** Whether step `n` has been answered — what enables its Next. Exported for the journey lock. */
export const stepAnswered = (n: number, a: Answers): boolean =>
  n === 0 ? !!a.stage
  : n === 1 ? !!a.kind && (a.kind !== "novel" || !!a.len)
  : n === 2 ? true
  : n === 3 ? !!a.pace
  : true;

/** The "Good to know" sentence for step `n`, or "" while there is nothing to say. */
export const stepInsight = (n: number, a: Answers): string => {
  if (n === 0 && a.stage) return JY_INSIGHT.stage[a.stage];
  if (n === 1 && a.kind) return a.kind === "novel" ? (a.len ? JY_INSIGHT.len[a.len] : "") : JY_INSIGHT.kind[a.kind];
  if (n === 2) return jyAgentsInsight(a.agents);
  if (n === 3 && a.pace) return JY_INSIGHT.pace[a.pace];
  return "";
};

/** One row of answer buttons. `chips` is the ref's pill treatment; otherwise the two-line card. */
function Options<V extends string>({ opts, value, onPick, chips, two, label }: {
  opts: JyOption<V>[]; value: V | null; onPick: (v: V) => void; chips?: boolean; two?: boolean; label: string;
}) {
  return (
    <div className={chips ? "mk-jychips" : "mk-jyopts" + (two ? " mk-jyopts--2" : "")} role="group" aria-label={label}>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          className={chips ? "mk-jychip" : "mk-jyopt"}
          aria-pressed={value === o.v}
          onClick={() => onPick(o.v)}
        >
          {o.title}
          {o.small && <small>{o.small}</small>}
        </button>
      ))}
    </div>
  );
}

export const CampaignJourney: React.FC<{ today?: Date }> = ({ today }) => {
  /* The date the slow seasons are counted from, fixed for the visit. */
  const now = useMemo(() => today ?? new Date(), [today]);
  const [at, setAt] = useState(0);
  const [a, setA] = useState<Answers>({ stage: null, kind: null, len: null, pace: null, agents: AGENTS_DEFAULT });
  const headRef = useRef<HTMLElement | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    headRef.current?.focus();
  }, [at]);
  const go = (n: number) => { moved.current = true; setAt(n); };

  const insight = stepInsight(at, a);
  const result = at === JY_STEPS && a.stage && a.kind && a.pace
    ? estimateCampaign({ stage: a.stage, kind: a.kind, len: a.len, agents: a.agents, pace: a.pace }, now)
    : null;
  const card = result ? planCard(result.fit) : null;
  const titleId = "mk-jy-title";

  const nav = (n: number) => (
    <div className="mk-jynav">
      {n > 0 ? <button type="button" className="mk-jyback" onClick={() => go(n - 1)}>{JY_BACK}</button> : <span />}
      <button type="button" className="mk-btn mk-btn--navy mk-jynext" disabled={!stepAnswered(n, a)} onClick={() => go(n + 1)}>
        {n === JY_STEPS - 1 ? JY_SEE_PLAN : JY_NEXT}
      </button>
    </div>
  );
  const question = (text: string) => (
    <h3 className="mk-jyq" tabIndex={-1} ref={(el) => { headRef.current = el; }}>{text}</h3>
  );

  return (
    <div className="mk-jy">
      <div className="mk-jytop">
        <h2 id={titleId} className="mk-jytitle">{JY_TITLE}</h2>
        <p className="mk-jycount">{jyStepLabel(at)}</p>
        <div className="mk-jydots" aria-hidden="true">
          {Array.from({ length: JY_STEPS + 1 }, (_, i) => (
            <span key={i} className={i === at ? "mk-jydot--on" : i < at ? "mk-jydot--done" : undefined} />
          ))}
        </div>
      </div>

      <div className="mk-jybody" role="region" aria-labelledby={titleId}>
        {at < JY_STEPS ? (
          <div className="mk-jystep" data-step={at}>
            {at === 0 && <>
              {question(JY_Q_STAGE)}
              <Options label={JY_Q_STAGE} opts={JY_STAGES} value={a.stage} onPick={(v) => setA({ ...a, stage: v })} />
            </>}
            {at === 1 && <>
              {question(JY_Q_KIND)}
              <Options label={JY_Q_KIND} chips opts={JY_KINDS} value={a.kind} onPick={(v) => setA({ ...a, kind: v })} />
              {a.kind === "novel" && <>
                <p className="mk-jysub">{JY_Q_LEN}</p>
                <Options label={JY_Q_LEN} chips opts={JY_LENGTHS} value={a.len} onPick={(v) => setA({ ...a, len: v })} />
              </>}
            </>}
            {at === 2 && <>
              {question(JY_Q_AGENTS)}
              <div className="mk-jystepper">
                <button type="button" aria-label={JY_FEWER} onClick={() => setA({ ...a, agents: clampAgents(a.agents - AGENTS_STEP) })}>−</button>
                <output aria-live="polite">{a.agents}</output>
                <button type="button" aria-label={JY_MORE} onClick={() => setA({ ...a, agents: clampAgents(a.agents + AGENTS_STEP) })}>+</button>
              </div>
            </>}
            {at === 3 && <>
              {question(JY_Q_PACE)}
              <Options label={JY_Q_PACE} two opts={JY_PACES} value={a.pace} onPick={(v) => setA({ ...a, pace: v })} />
            </>}
            {/* ⚠️ THE LIVE REGION IS ALWAYS MOUNTED; ITS CONTENT ARRIVES INTO IT. A region mounted with
                its message is not reliably announced. The inner box is keyed on the sentence so the
                rise-in replays when the advice changes. */}
            <div className="mk-jyinswrap" aria-live="polite">
              {insight && (
                <div className="mk-jyins" key={insight}>
                  <p className="mk-jyk">{JY_GOOD_TO_KNOW}</p>
                  <p className="mk-jyinst">{insight}</p>
                </div>
              )}
            </div>
            {nav(at)}
          </div>
        ) : result && card ? (
          <div className="mk-jystep mk-jyres" data-step={at}>
            <div className="mk-jyrestop">
              <div>
                <p className="mk-jyk">{JY_YOUR_CAMPAIGN}</p>
                <h3 className="mk-jybig" tabIndex={-1} ref={(el) => { headRef.current = el; }}>{result.label}</h3>
                <p className="mk-jywhy">{result.why}</p>
                {result.prep && <p className="mk-jyprep">{JY_PREP_NOTE}</p>}
                <button type="button" className="mk-jyagain" onClick={() => go(0)}>{JY_AGAIN}</button>
              </div>
              <article className="mk-jyplan" data-fit={result.fit}>
                <span className="mk-jyflag">{JY_FITS}</span>
                <h4 className="mk-jyplanname">{card.name}</h4>
                <div className="mk-pv4price">
                  <span className="mk-pv4cur">£</span>
                  <span className="mk-pv4amt">{card.price}</span>
                </div>
                <p className="mk-jypm">{card.perMonth}</p>
                <p className="mk-jytail">{result.tail}</p>
                <p className="mk-jyinc">{JY_INCLUDES}</p>
              </article>
            </div>
            <div className="mk-jyall">
              <p className="mk-jyallh">{JY_ALL_PLANS}</p>
              <div className="mk-jyrow">
                {JY_TILES.map((t) => (
                  <div key={t.m} className={"mk-jymini" + (t.m === result.fit ? " mk-jymini--fit" : "")} data-m={t.m}>
                    <p>{t.name}</p>
                    <b>£{t.price}</b>
                    <small>{t.small}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
