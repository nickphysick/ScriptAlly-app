/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Which plan suits me best?" on a phone: a bottom sheet over the page, one question per screen
 * (pricing on phones, 25 Oct; ref design-refs/pricing-page-mobile-v1.html, `.jsheet`). Above 760px
 * the same four questions run inline, in `CampaignJourney`.
 *
 * ⚠️ IT IS THE DESKTOP JOURNEY'S LOGIC, NOT A COPY OF IT. What a step needs before Next, the note
 * under each answer, the stepper and "I don't know" are `CampaignJourney`'s exported functions; the
 * estimate is `estimateCampaign`; every word is `pricingCopy.ts`'s. Only the presentation is the
 * phone's: full-width radio cards, the lengths as a row of three short cards, a large centred
 * stepper, and Back / Next in a footer where a thumb rests.
 *
 * ⚠️ IT IS A MODAL DIALOG AND BEHAVES AS ONE: `aria-modal`, focus moves in on opening and is held
 * there (Tab and Shift+Tab wrap), Escape and the scrim close it, focus goes back to whatever opened
 * it, and the page behind does not scroll. Closed, it stays mounted — so its answers survive
 * closing it — but `inert` and hidden, so nothing in it can be reached.
 *
 * ⚠️ IT WRITES NOTHING AND SELLS NOTHING. The answers live here; the one thing it tells the page is
 * which plan fits, so that plan's tile can turn navy.
 *
 * ⚠️ PORTALLED INTO THE SHELL'S `.mk-scope`, out of the sheet. The marketing sheet is
 * `isolation: isolate`, so a fixed layer inside it would be stacked inside it — under the sticky
 * nav. `.mk-scope` is where the tier's tokens are declared, so the layer keeps them.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  JY_TITLE, JY_STEPS, jyStepLabel, JY_NEXT, JY_SEE_PLAN, JY_BACK, JY_AGAIN, JY_Q_STAGE, JY_STAGES,
  JY_Q_KIND, JY_KINDS, JY_Q_LEN, JY_LENGTHS_SHORT, JY_Q_AGENTS, JY_FEWER, JY_MORE, JY_IDK, JY_Q_PACE,
  JY_PACES, JY_YOUR_CAMPAIGN, JY_PREP_NOTE, JY_FITS, JY_SEE_IN_PLANS, JY_CLOSE, PV4_SOURCE_NOTE,
  type JyOption,
} from "./pricingCopy";
import { BLANK_ANSWERS, stepAnswered, stepInsight, stepAgents, toggleUnknown, type Answers } from "./CampaignJourney";
import { estimateCampaign, planCard, AGENTS_STEP } from "./campaignEstimate";
import { Price } from "./pricingParts";
import { Runs } from "./CopyRuns";

type Fit = 1 | 3 | 6 | 12;

/** Every element Tab can land on inside `root`, in order. */
const focusables = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true" && el.getClientRects().length > 0);

/** One group of answers as full-width radio cards, or the phone's row of three short cards. */
function Options<V extends string>({ opts, value, onPick, row, label }: {
  opts: JyOption<V>[]; value: V | null; onPick: (v: V) => void; row?: boolean; label: string;
}) {
  return (
    <div className={"mk-pvopts" + (row ? " mk-pvopts--row" : "")} role="group" aria-label={label}>
      {opts.map((o) => (
        <button key={o.v} type="button" className="mk-pvopt" aria-pressed={value === o.v} onClick={() => onPick(o.v)}>
          {o.title}
          {o.small && <small>{o.small}</small>}
        </button>
      ))}
    </div>
  );
}

export const PlanSheetPhone: React.FC<{
  host: Element | null;
  open: boolean;
  /** Close by Escape, the scrim or ✕: focus returns to `opener`. */
  onClose: () => void;
  /** "See it in the plans": close, and let the page bring Pro plans into view. */
  onSeePlans: () => void;
  onFit: (months: Fit) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
  today?: Date;
}> = ({ host, open, onClose, onSeePlans, onFit, onNavigate, today }) => {
  const now = useMemo(() => today ?? new Date(), [today]);
  const [at, setAt] = useState(0);
  const [a, setA] = useState<Answers>(BLANK_ANSWERS);
  const dialog = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const head = useRef<HTMLElement | null>(null);

  const result = at === JY_STEPS && a.stage && a.kind && a.pace
    ? estimateCampaign({ stage: a.stage, kind: a.kind, len: a.len, agents: a.agents, agentsUnknown: a.agentsUnknown, pace: a.pace }, now)
    : null;
  const card = result ? planCard(result.fit) : null;
  const fit = result?.fit;
  useEffect(() => { if (fit) onFit(fit); }, [fit, onFit]);

  /* Each new screen starts at its top, and takes focus at its question — once the sheet is open. */
  useEffect(() => {
    if (!open) return;
    if (body.current) body.current.scrollTop = 0;
    head.current?.focus({ preventScroll: true });
  }, [at, open]);

  /* ⚠️ THE PAGE BEHIND DOES NOT SCROLL. The window is what scrolls on a marketing page, so the lock
     is on `html` and `body`, and each is put back exactly as it was. */
  useEffect(() => {
    if (!open) return;
    const els = [document.documentElement, document.body];
    const was = els.map((e) => e.style.overflow);
    els.forEach((e) => { e.style.overflow = "hidden"; });
    return () => els.forEach((e, i) => { e.style.overflow = was[i]; });
  }, [open]);

  /* Escape closes; Tab is held inside. On the document, so it works wherever focus is. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !dialog.current) return;
      const list = focusables(dialog.current);
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0], last = list[list.length - 1], cur = document.activeElement as HTMLElement | null;
      const inside = !!cur && dialog.current.contains(cur);
      if (e.shiftKey && (!inside || cur === first || cur === head.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || cur === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!host) return null;
  const insight = stepInsight(at, a);
  const question = (text: string) => (
    <p className="mk-pvq" tabIndex={-1} ref={(el) => { head.current = el; }}>{text}</p>
  );
  const next = () => (at === JY_STEPS ? onSeePlans() : setAt(at + 1));
  const nextLabel = at === JY_STEPS ? JY_SEE_IN_PLANS : at === JY_STEPS - 1 ? JY_SEE_PLAN : JY_NEXT;
  const titleId = "mk-pvsheet-h";

  return createPortal(
    <div className={"mk-pvlayer mk-pvjs" + (open ? " mk-open" : "")}>
      <div className="mk-pvscrim" aria-hidden="true" onClick={onClose} />
      <div
        className="mk-pvsheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialog}
        inert={!open}
        aria-hidden={!open}
      >
        <div className="mk-pvgrab" aria-hidden="true" />
        <div className="mk-pvjshead">
          <h2 id={titleId} className="mk-pvjsh">{JY_TITLE}</h2>
          <button type="button" className="mk-pvjsx" aria-label={JY_CLOSE} onClick={onClose}>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" /></svg>
          </button>
        </div>
        <div className="mk-pvjsmeta">
          <div className="mk-pvjsprog" aria-hidden="true"><span style={{ width: `${(at + 1) * 20}%` }} /></div>
          <span className="mk-pvjscount">{jyStepLabel(at)}</span>
        </div>
        <div className="mk-pvjsbody" ref={body}>
          {at < JY_STEPS ? (
            <div className="mk-pvstep" data-step={at}>
              {at === 0 && <>
                {question(JY_Q_STAGE)}
                <Options label={JY_Q_STAGE} opts={JY_STAGES} value={a.stage} onPick={(v) => setA({ ...a, stage: v })} />
              </>}
              {at === 1 && <>
                {question(JY_Q_KIND)}
                <Options label={JY_Q_KIND} opts={JY_KINDS} value={a.kind} onPick={(v) => setA({ ...a, kind: v })} />
                {a.kind === "novel" && <>
                  <p className="mk-pvsubq">{JY_Q_LEN}</p>
                  <Options label={JY_Q_LEN} row opts={JY_LENGTHS_SHORT} value={a.len} onPick={(v) => setA({ ...a, len: v })} />
                </>}
              </>}
              {at === 2 && <>
                {question(JY_Q_AGENTS)}
                <div className={"mk-pvagents" + (a.agentsUnknown ? " mk-pvagents--idk" : "")}>
                  <div className="mk-pvstepper">
                    <button type="button" aria-label={JY_FEWER} onClick={() => setA(stepAgents(a, -AGENTS_STEP))}>−</button>
                    <output aria-live="polite">{a.agents}</output>
                    <button type="button" aria-label={JY_MORE} onClick={() => setA(stepAgents(a, AGENTS_STEP))}>+</button>
                  </div>
                  <button type="button" className="mk-pvidk" aria-pressed={a.agentsUnknown} onClick={() => setA(toggleUnknown(a))}>{JY_IDK}</button>
                </div>
              </>}
              {at === 3 && <>
                {question(JY_Q_PACE)}
                <Options label={JY_Q_PACE} opts={JY_PACES} value={a.pace} onPick={(v) => setA({ ...a, pace: v })} />
              </>}
              {/* ⚠️ THE LIVE REGION IS ALWAYS MOUNTED; ITS CONTENT ARRIVES INTO IT, keyed on the sentence
                  so the rise-in replays when the advice changes. No label, as on the desktop. */}
              <div aria-live="polite">{insight && <p className="mk-pvins" key={insight}>{insight}</p>}</div>
            </div>
          ) : result && card ? (
            <div className="mk-pvstep mk-pvres" data-step={at}>
              <p className="mk-pvresk">{JY_YOUR_CAMPAIGN}</p>
              <p className="mk-pvresbig" tabIndex={-1} ref={(el) => { head.current = el; }}>{result.label}</p>
              <div className="mk-pvrescard" data-fit={result.fit}>
                <span className="mk-pvresflag">{JY_FITS}</span>
                <h3 className="mk-pvresname">{card.name}</h3>
                <Price amount={card.price} />
                <p className="mk-pvrespm">{card.perMonth}</p>
                <p className="mk-pvrestail">{result.tail}</p>
              </div>
              <p className="mk-pvreswhy">{result.why}</p>
              {result.prep && <p className="mk-pvresprep">{JY_PREP_NOTE}</p>}
              <button type="button" className="mk-pvresagain" onClick={() => setAt(0)}>{JY_AGAIN}</button>
              <p className="mk-pvressrc"><Runs runs={PV4_SOURCE_NOTE} onNavigate={onNavigate} /></p>
            </div>
          ) : null}
        </div>
        <div className="mk-pvjsfoot">
          <button
            type="button"
            className={"mk-pvjsback" + (at === 0 || at === JY_STEPS ? " mk-off" : "")}
            aria-hidden={at === 0 || at === JY_STEPS}
            tabIndex={at === 0 || at === JY_STEPS ? -1 : 0}
            onClick={() => setAt(at - 1)}
          >
            <span aria-hidden="true">← </span>{JY_BACK}
          </button>
          <button type="button" className="mk-btn mk-btn--navy mk-pvjsnext" disabled={!stepAnswered(at, a)} onClick={next}>
            {nextLabel}
          </button>
        </div>
      </div>
    </div>,
    host,
  );
};
