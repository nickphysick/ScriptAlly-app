/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 4 — THE FLOW LAYOUT (ref design-refs/phone-app-v2/src/flowv.js `ovFlow` at FL E · FQ B · FP C ·
 * FA B · FE C, and `liveCard`). On a phone every query journey walks its OWN steps here instead of in the drawer:
 *
 *  - full screen; the navy band at the top holds × (top right), a back chevron once past the first question, and the
 *    query card building itself as you answer — the court band, the agent row (an empty disc until known), the book,
 *    and one slot per step showing a placeholder word until answered. An answered slot jumps back to its question.
 *  - on the off-white sheet under it: the answers so far as chips, the step asked as a question (Special Elite 22px),
 *    one help line, then the step's own controls, dressed by phoneFlow.css as one white list.
 *  - a single choice moves on at once; anything else has a Continue pill pinned at the foot.
 *  - the check card comes last: every answer as a row that returns to it, then the journey's own primary.
 *
 * ⚠️ IT TAKES EXACTLY DrawerShell's PROPS AND WALKS THE SAME JourneyView. The journey's questions, order, guards,
 * review gate and save are untouched; QueryDrawer chooses this shell by `useIsMobile`, never a fork of a journey.
 * Decision 8 (Agent card v1) is kept: with answers, × asks "Discard this?" and Escape parks; with none, both cancel.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { CHECK_QUESTION, LOG_SLOTS, phoneQuestion } from "../../lib/phoneFlow";
import { PI } from "../phone/phoneIcons";
import { initialsOf, useDrawer } from "./controls";
import { SAVE_BEAT_MS, type ShellProps } from "./DrawerShell";
import type { StepState } from "./journey";
import "./phoneFlow.css";

/** What the live card shows that the view itself does not carry: the query's court, its day, the agent and the book. */
export interface LiveFacts {
  court: { label: string; tone: "you" | "agent" | "quiet" | "closed" | "new" };
  day: number | null;
  name: string | null;
  agency: string;
  book: string | null;
}

export function PhoneFlowShell({ view, mode, open, initialStep, initialSeen, onCancel, onPark, onSave, stateRef, live, noPark = false }: ShellProps & {
  /** the query card the band builds; null draws none (the task and note flows, as the ref's liveCard returns none) */
  live: LiveFacts | null;
  /** a flow with no parked state (task, note): Escape with answers asks "Discard this?" instead of parking */
  noPark?: boolean;
}) {
  const { openCal, setOpenCal } = useDrawer();
  const n = view.steps.length;
  const last = n;
  const [step, setStep] = useState(Math.min(initialStep ?? 0, n));
  const [seen, setSeen] = useState<Set<number>>(() => new Set([...(initialSeen ?? []), Math.min(initialStep ?? 0, n)]));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dir, setDir] = useState<"in" | "back" | "">("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const cur = Math.min(step, last);
  useEffect(() => { if (step > last) setStep(last); }, [step, last]);
  const pendingStep = useRef<number | null>(n === 0 && (initialStep ?? 0) > 0 ? initialStep! : null);
  useEffect(() => {
    if (pendingStep.current == null || n === 0) return;
    const t = Math.min(pendingStep.current, n);
    pendingStep.current = null;
    setStep(t);
    setSeen((s) => (s.has(t) ? s : new Set(s).add(t)));
  }, [n]);

  const go = (i: number) => {
    const t = Math.max(0, Math.min(last, i));
    setDir(t > cur ? "in" : t < cur ? "back" : "");
    setStep(t);
    setSeen((s) => (s.has(t) ? s : new Set(s).add(t)));
    setOpenCal(null);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const guardOf = (i: number) => view.steps[i]?.guard ?? null;
  const state = (i: number): StepState => {
    const g = guardOf(i);
    if (g?.level === "block") return "blk";
    if (g?.level === "check") return "chk";
    return seen.has(i) ? "done" : "auto";
  };
  /** an answer is on the card once its question has been visited and nothing blocks it */
  const answered = (i: number) => seen.has(i) && i !== cur && guardOf(i)?.level !== "block";
  const anyBlock = view.steps.some((s) => s.guard?.level === "block");
  const curBlocked = cur < last && guardOf(cur)?.level === "block";

  useEscapeLayer(open, () => {
    if (openCal) { setOpenCal(null); return; }
    if (confirm) { setConfirm(false); return; }
    if (view.leave) { view.leave.cancel(); return; }
    if (view.dirty) { if (noPark) setConfirm(true); else onPark(); return; }
    onCancel();
  }, ESC_LEVEL.drawer);
  function requestClose() {
    if (view.dirty) { setConfirm(true); return; }
    onCancel();
  }
  async function primary() {
    if (cur < last) { go(cur + 1); return; }
    if (busy) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, SAVE_BEAT_MS));
    try { await onSave(); } finally { setBusy(false); }
  }
  if (stateRef) stateRef.current = { step: cur, seen: [...seen].sort((a, b) => a - b), of: n + 1 };

  /* ── single choice moves on at once (FQ B): a step whose only control is one set of options, nothing typed, no
     date — measured off the step's own rendered controls, so no journey has to say what kind of question it is ── */
  const [shape, setShape] = useState<{ single: boolean; chosen: boolean }>({ single: false, chosen: false });
  useLayoutEffect(() => {
    const b = bodyRef.current?.querySelector<HTMLElement>("[data-pf-step]");
    /* ⚠️ compare before setting, on BOTH paths: this effect has no dependency list, so a fresh object every render
       (the check card mounts no step) loops until React stops it — measured, error #185 on the check card */
    if (!b) { setShape((s) => (!s.single && !s.chosen ? s : { single: false, chosen: false })); return; }
    const groups = b.querySelectorAll(".qad-rads, .qad-chips").length;
    const other = b.querySelectorAll("input, textarea, select, .qad-dfield, .qad-tgl, .qad-seg, .qad-srow, .qad-apick").length;
    const single = groups === 1 && other === 0;
    const chosen = !!b.querySelector('.qad-rad.on, .qad-chip.on, [aria-checked="true"]');
    setShape((s) => (s.single === single && s.chosen === chosen ? s : { single, chosen }));
  });
  const stepRef = useRef(cur); stepRef.current = cur;
  const guardRef = useRef(guardOf); guardRef.current = guardOf;
  const advanceSoon = useRef<number | null>(null);
  useEffect(() => () => { if (advanceSoon.current) window.clearTimeout(advanceSoon.current); }, []);
  const onPick = (e: React.MouseEvent) => {
    if (!shape.single || cur >= last) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".qad-rad, .qad-chip")) return;
    /* the switch-to-another-journey options (Close's "Record a pass →") navigate away themselves */
    if (t.closest(".qad-rad")?.querySelector("em.go")) return;
    const at = cur;
    if (advanceSoon.current) window.clearTimeout(advanceSoon.current);
    advanceSoon.current = window.setTimeout(() => {
      advanceSoon.current = null;
      /* read the step as it stands after the pick: a pick that leaves it blocked stays put */
      if (stepRef.current !== at || guardRef.current(at)?.level === "block") return;
      go(at + 1);
    }, 260);
  };

  const curStep = cur < n ? view.steps[cur] : null;
  const first = (live?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const question = curStep ? phoneQuestion(mode, curStep.title, first) : CHECK_QUESTION;
  const help = curStep?.guard?.level === "check" && !curStep.ownWarn ? `${curStep.guard.msg}. You can still carry on.` : null;
  const showContinue = cur === last || !shape.single || shape.chosen;
  const label = cur === last ? (busy ? (mode === "log" ? "Logging" : "Saving") : view.button) : "Continue";
  const disabled = cur < last ? !view.ok || curBlocked : !view.ok || anyBlock;
  const trail = view.steps.map((s, i) => ({ s, i })).filter(({ i }) => i < cur && answered(i));

  return (
    <div className="pa-layer pa-flow" role="dialog" aria-modal="true" aria-label={view.title} data-qad-drawer={mode} data-pf={mode}>
      <div className="pf-band">
        <div className="pf-top">
          {cur > 0
            ? <button type="button" className="pf-ib" aria-label="Back" data-pf="back" onClick={() => go(cur - 1)}>{PI.back}</button>
            : <span className="pf-ib-sp" />}
          <span className="pf-grow" />
          <button type="button" className="pf-ib" aria-label="Close" data-pf="close" onClick={requestClose}>{PI.close}</button>
        </div>
        {/* the query card, building itself as you answer (ref liveCard) */}
        {live ? <div className="pf-lcard" data-pf="live">
          <div className={`pf-lcband t-${live.court.tone}`}><span>{live.court.label}</span><span className="pf-day">Day {live.day ?? 0}</span></div>
          <div className="pf-lcag">
            {live.name
              ? <span className="pf-av" data-pf="live-disc">{initialsOf(live.name)}</span>
              : <span className="pf-av pf-empty" data-pf="live-disc" aria-hidden="true" />}
            <div className="pf-lcwho">
              {live.name
                ? (n && answered(0) && mode === "log"
                  ? <button type="button" className="pf-lcnm" data-pf="live-name" onClick={() => go(0)}>{live.name}</button>
                  : <div className="pf-lcnm" data-pf="live-name">{live.name}</div>)
                : <><div className="pf-ph" style={{ width: "60%" }} /><div className="pf-ph" style={{ width: "40%", marginTop: 6 }} /></>}
              {live.name && live.agency ? <div className="pf-sub">{live.agency}</div> : null}
            </div>
          </div>
          <div className="pf-lctray">
            {live.book ? <div className="pf-sub pf-book" data-pf="live-book">{live.book}</div> : null}
            <div className="pf-lcfs">
              {mode === "log" && n <= 1 ? LOG_SLOTS.map((t) => <span key={t} className="pf-lcf" data-pf="slot">{t}</span>) : null}
              {view.steps.map((s, i) => (mode === "log" && i === 0 ? null : answered(i)
                ? <button type="button" key={i} className="pf-lcf on" data-pf="slot" data-i={i} onClick={() => go(i)}>{s.summary}</button>
                : <span key={i} className={`pf-lcf${i === cur ? " now" : ""}`} data-pf="slot" data-i={i}>{s.title}</span>))}
            </div>
          </div>
        </div> : null}
      </div>

      <div className={`pf-sheet${dir ? ` ${dir}` : ""}`} ref={bodyRef} key={`q${cur}`} data-pf="sheet">
        {trail.length && cur < last ? (
          <div className="pf-trail" data-pf="trail">
            {trail.map(({ s, i }) => <button type="button" key={i} className="pf-tchip" data-pf="trail-chip" data-i={i} onClick={() => go(i)}>{s.summary}</button>)}
          </div>
        ) : null}
        <h2 className="pf-q" data-pf="question">{question}</h2>
        {help ? <p className="pf-help" data-pf="help">{help}</p> : <div style={{ height: 10 }} />}
        {curStep ? (
          <div className="pf-step" data-pf-step={curStep.title} data-qad-sec={curStep.title} onClickCapture={onPick}>
            {curStep.body}
          </div>
        ) : null}
        {!view.ok && view.preNote ? view.preNote : null}

        {cur === last && view.ok ? (
          <div data-qad-review data-pf="check">
            {view.reviewNote ?? null}
            <div className="pf-review">
              {view.steps.map((s, i) => {
                const st = state(i);
                return (
                  <button type="button" key={i} className={`pf-rv ${st}`} onClick={() => go(i)} data-qad-answer={s.title} data-pf="check-row" data-i={i}>
                    <span className="k">{s.title}</span>
                    <span className="v">{s.summary || "—"}{(st === "blk" || st === "chk") && s.guard ? <small>{s.guard.msg}</small> : null}</span>
                    <span className="pf-chev" aria-hidden="true">{PI.chev}</span>
                  </button>
                );
              })}
            </div>
            <p className="pf-sub" style={{ margin: "10px 4px 0" }}>Tap anything to change it.</p>
            {view.saves.length ? (
              <ul className="pf-saves" data-qad-saves>{view.saves.map((l, i) => <li key={i}>{l.text}</li>)}</ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {showContinue && !view.pickOnly ? (
        <div className="pf-bottom" data-pf="bottom">
          <button type="button" className={`pf-pri${busy ? " busy" : ""}`} disabled={disabled} onClick={primary} data-qad-primary data-pf="primary">{label}</button>
        </div>
      ) : null}

      {view.leave && !confirm ? (
        <div className="pf-conf" data-qad-discard data-qad-leave>
          <b>{view.leave.title}</b><span>{view.leave.sub}</span>
          <div><button type="button" className="keep" onClick={view.leave.cancel}>Keep editing</button>
            <button type="button" className="disc" onClick={() => { const g = view.leave!.go; view.leave!.cancel(); onCancel(); g(); }}>{view.leave.button}</button></div>
        </div>
      ) : null}
      {confirm ? (
        <div className="pf-conf" data-qad-discard>
          <b>Discard this?</b><span>Nothing has been saved yet.</span>
          <div>
            <button type="button" className="keep" onClick={() => setConfirm(false)}>Keep going</button>
            {noPark ? null : <button type="button" className="keep" data-qad-later onClick={() => { setConfirm(false); onPark(); }}>Finish later</button>}
            <button type="button" className="disc" onClick={() => { setConfirm(false); onCancel(); }}>Discard</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
