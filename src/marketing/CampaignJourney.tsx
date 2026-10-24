/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Which plan suits me best?" — four questions, one at a time, then a plan that fits. Ported from
 * the `.jy` markup and script in design-refs/pricing-page-v2.html; the arithmetic is
 * `campaignEstimate.ts`, the words are `pricingCopy.ts`.
 *
 * ⚠️ IT WRITES NOTHING AND SELLS NOTHING. The answers live in this component's state and go nowhere;
 * the plan card names a planned launch plan and offers no way to buy it. The one thing it tells its
 * host is which plan fits (`onFit`), so the host can turn that plan's tile navy.
 *
 * ⚠️ NOTHING IS PRE-SELECTED. The agents stepper opens at 40 and needs no answer, as in the ref; every
 * other question keeps Next disabled until it is answered, a novel needing its length as well.
 * "I don't know" sets the count to 40 and dims the stepper; pressing − or + clears it.
 *
 * ⚠️ FOCUS MOVES TO THE NEW QUESTION ON NEXT AND BACK, AND WHEN THE HOST ASKS (`focusKey` changes,
 * when the questions are opened) — never on mount, which would pull a reader scrolling the page
 * into the middle of it.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  JY_TITLE, JY_STEPS, jyStepLabel, JY_NEXT, JY_SEE_PLAN, JY_BACK, JY_AGAIN,
  JY_Q_STAGE, JY_STAGES, JY_Q_KIND, JY_KINDS, JY_Q_LEN, JY_LENGTHS, JY_Q_AGENTS, JY_FEWER, JY_MORE,
  JY_OR, JY_IDK, JY_Q_PACE, JY_PACES, JY_INSIGHT, jyAgentsInsight, JY_YOUR_CAMPAIGN, JY_PREP_NOTE, JY_FITS,
  JY_INCLUDES, type JyOption,
} from "./pricingCopy";
import {
  estimateCampaign, planCard, clampAgents, AGENTS_DEFAULT, AGENTS_STEP, AGENTS_UNKNOWN,
  type Stage, type Kind, type Length, type Pace,
} from "./campaignEstimate";

export interface Answers {
  stage: Stage | null; kind: Kind | null; len: Length | null; pace: Pace | null;
  agents: number; agentsUnknown: boolean;
}
export const BLANK_ANSWERS: Answers = {
  stage: null, kind: null, len: null, pace: null, agents: AGENTS_DEFAULT, agentsUnknown: false,
};

/** Whether step `n` has been answered — what enables its Next. Exported for the journey lock. */
export const stepAnswered = (n: number, a: Answers): boolean =>
  n === 0 ? !!a.stage
  : n === 1 ? !!a.kind && (a.kind !== "novel" || !!a.len)
  : n === 2 ? true
  : n === 3 ? !!a.pace
  : true;

/** The note for step `n`, or "" while there is nothing to say. */
export const stepInsight = (n: number, a: Answers): string => {
  if (n === 0 && a.stage) return JY_INSIGHT.stage[a.stage];
  if (n === 1 && a.kind) return a.kind === "novel" ? (a.len ? JY_INSIGHT.len[a.len] : "") : JY_INSIGHT.kind[a.kind];
  if (n === 2) return jyAgentsInsight(a.agents, a.agentsUnknown);
  if (n === 3 && a.pace) return JY_INSIGHT.pace[a.pace];
  return "";
};

/** The stepper's press and "I don't know", as the ref's handlers do them. */
export const stepAgents = (a: Answers, d: number): Answers =>
  ({ ...a, agentsUnknown: false, agents: clampAgents(a.agents + d) });
export const toggleUnknown = (a: Answers): Answers =>
  a.agentsUnknown ? { ...a, agentsUnknown: false } : { ...a, agentsUnknown: true, agents: AGENTS_UNKNOWN };

/** One row of answers. `chips` is the ref's pill treatment; otherwise the card with a radio dot. */
function Options<V extends string>({ opts, value, onPick, chips, label }: {
  opts: JyOption<V>[]; value: V | null; onPick: (v: V) => void; chips?: boolean; label: string;
}) {
  return (
    <div className={chips ? "mk-jychips" : "mk-jyopts"} role="group" aria-label={label}>
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

export const CampaignJourney: React.FC<{
  today?: Date;
  /** Called with the fitting plan's months each time a result is reached. */
  onFit?: (months: 1 | 3 | 6 | 12) => void;
  /** Change this to move focus to the current question (the host does it when it opens them). */
  focusKey?: number;
}> = ({ today, onFit, focusKey }) => {
  /* The date the slow seasons are counted from, fixed for the visit. */
  const now = useMemo(() => today ?? new Date(), [today]);
  const [at, setAt] = useState(0);
  const [a, setA] = useState<Answers>(BLANK_ANSWERS);
  const headRef = useRef<HTMLElement | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    headRef.current?.focus();
  }, [at]);
  useEffect(() => {
    if (!focusKey) return;
    headRef.current?.focus({ preventScroll: true });
  }, [focusKey]);
  const go = (n: number) => { moved.current = true; setAt(n); };

  const insight = stepInsight(at, a);
  const result = at === JY_STEPS && a.stage && a.kind && a.pace
    ? estimateCampaign({ stage: a.stage, kind: a.kind, len: a.len, agents: a.agents, agentsUnknown: a.agentsUnknown, pace: a.pace }, now)
    : null;
  const card = result ? planCard(result.fit) : null;
  const fit = result?.fit;
  useEffect(() => { if (fit) onFit?.(fit); }, [fit, onFit]);
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
        {/* A thin progress line along the header's foot: a fifth per step, the result included. */}
        <div className="mk-jyprog" aria-hidden="true"><span style={{ width: `${(at + 1) * 20}%` }} /></div>
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
              <div className={"mk-jyagents" + (a.agentsUnknown ? " mk-jyagents--idk" : "")}>
                <div className="mk-jystepper">
                  <button type="button" aria-label={JY_FEWER} onClick={() => setA(stepAgents(a, -AGENTS_STEP))}>−</button>
                  <output aria-live="polite">{a.agents}</output>
                  <button type="button" aria-label={JY_MORE} onClick={() => setA(stepAgents(a, AGENTS_STEP))}>+</button>
                </div>
                <span className="mk-jyor">{JY_OR}</span>
                <button type="button" className="mk-jychip mk-jyidk" aria-pressed={a.agentsUnknown} onClick={() => setA(toggleUnknown(a))}>
                  {JY_IDK}
                </button>
              </div>
            </>}
            {at === 3 && <>
              {question(JY_Q_PACE)}
              <Options label={JY_Q_PACE} opts={JY_PACES} value={a.pace} onPick={(v) => setA({ ...a, pace: v })} />
            </>}
            {/* ⚠️ THE LIVE REGION IS ALWAYS MOUNTED; ITS CONTENT ARRIVES INTO IT. A region mounted with
                its message is not reliably announced. The note is keyed on its sentence so the rise-in
                replays when the advice changes. */}
            <div className="mk-jyinswrap" aria-live="polite">
              {insight && <p className="mk-jyins" key={insight}>{insight}</p>}
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
          </div>
        ) : null}
      </div>
    </div>
  );
};
