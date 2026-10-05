/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The drawer's shell (brief §A): the ink header, the stepper, one step at a time, the review, the
 * footer, the discard bar and the scrim. A journey supplies its steps; the shell decides everything
 * about how they are walked, so every journey walks the same way.
 *
 * ⚠️ ESCAPE IS ONE HANDLER (the house law): calendar → the open ask → the leave bar → the drawer,
 * asked in that order by this component — and the drawer is a LAYER ON THE APP'S ONE STACK
 * (`lib/escapeStack`, Agent card v1 §6.6) rather than a listener of its own. Its own window
 * listener used to sit beside the agent card's, and two listeners are resolved by registration
 * order — which mounted last, not what is on screen. On the stack the drawer outranks a docked card
 * by level, so Escape steps back ONE layer.
 *
 * ⚠️ DECISION 8, APP-WIDE (Agent card v1): what a close means is read from `view.dirty` and nothing
 * else. With answers, Escape, the backdrop, "← name" and the dock chip PARK the journey (same step,
 * same answers, a chip bottom-right) and ✕ asks "Discard this? Nothing has been saved yet"; with
 * none, every one of them simply cancels. The backdrop's old shake and Log's `guardDiscard` retire.
 */
import React, { useEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { Note, PlanTrack, useDrawer, type PlanSpec } from "./controls";
import type { JourneyView, StepState } from "./journey";

/** Where the shell stands — what a park records (§6.3: "step 2 of 5"). */
export interface ShellState { step: number; seen: number[]; of: number }

export const QUILL_SRC = "/images/qa/quill.webp";
/** The save button holds its busy state this long before the write goes (the mock's 420ms). */
export const SAVE_BEAT_MS = 420;

export interface ShellProps {
  view: JourneyView;
  mode: string;
  open: boolean;
  initialStep?: number;
  /** a journey resumed after a reload: the steps it had opened before it was parked */
  initialSeen?: number[];
  /** opened from a card: the drawer's header names it, "← Jonathan Marsh" (§6.1) */
  from?: string | null;
  onCancel: () => void;
  /** park the journey — only ever asked for with answers (decision 8) */
  onPark: () => void;
  onSave: () => Promise<void>;
  /** where the shell stands, kept current for the host's park */
  stateRef?: React.MutableRefObject<ShellState | null>;
}

export function DrawerShell({ view, mode, open, initialStep, initialSeen, from, onCancel, onPark, onSave, stateRef }: ShellProps) {
  const { openCal, setOpenCal } = useDrawer();
  const n = view.steps.length;
  const last = n;
  const [step, setStep] = useState(Math.min(initialStep ?? 0, n));
  const [seen, setSeen] = useState<Set<number>>(() => new Set([...(initialSeen ?? []), Math.min(initialStep ?? 0, n)]));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const prevStep = useRef(step);
  const moveDir = step === prevStep.current ? 0 : step > prevStep.current ? 1 : -1;
  const fromStep = prevStep.current;
  useEffect(() => { prevStep.current = step; });
  const bodyRef = useRef<HTMLDivElement>(null);

  /* The step can outrun the steps when a journey's answer removes some (a response type changed). */
  const cur = Math.min(step, last);
  useEffect(() => { if (step > last) setStep(last); }, [step, last]);
  /* A journey resumed after a reload can mount before its steps exist (Edit an entry reads the
     query's history first): the step it was parked on waits for them rather than clamping to 0. */
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
  const anyBlock = view.steps.some((s) => s.guard?.level === "block");
  const curBlocked = cur < last && guardOf(cur)?.level === "block";

  /* Escape, one layer at a time — the open calendar, the open ask, the leave bar, then decision 8. */
  useEscapeLayer(open, () => {
    if (openCal) { setOpenCal(null); return; }
    if (confirm) { setConfirm(false); return; }
    if (view.leave) { view.leave.cancel(); return; }
    leave();
  }, ESC_LEVEL.drawer);

  /** Escape, the backdrop, "← name" and the dock chip: park with answers, cancel without. */
  function leave() {
    if (view.dirty) { setConfirm(false); onPark(); return; }
    onCancel();
  }
  /** ✕ and Cancel: ask with answers ("Discard this?"), cancel without. */
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

  const names = view.pickOnly ? view.steps.map((s) => s.title) : view.steps.map((s) => s.title).concat([`Check and ${view.verb}`]);
  const stepperCls = (i: number): string => {
    if (i === cur) return "cur";
    if (i < n) { const x = state(i); return x === "blk" && !seen.has(i) ? "auto" : x; }
    return view.steps.some((s, k) => s.guard?.level === "block" && seen.has(k) && k !== cur) ? "blk" : "";
  };

  const plans = view.steps.map((s) => s.plan).filter(Boolean) as PlanSpec[];
  const reviewPlan = plans.length ? plans[plans.length - 1] : null;
  const nb = view.steps.filter((s) => s.guard?.level === "block").length;
  const nc = view.steps.filter((s) => s.guard?.level === "check").length;

  const primaryLabel = cur < last
    ? `Next · ${cur + 1 < n ? view.steps[cur + 1].title : `Check and ${view.verb}`}`
    : busy ? (mode === "log" ? "Logging" : "Saving") : view.button;
  const primaryDisabled = cur < last ? !view.ok || curBlocked : !view.ok || anyBlock;

  const curStep = cur < n ? view.steps[cur] : null;
  const g = curStep?.guard;
  if (stateRef) stateRef.current = { step: cur, seen: [...seen].sort((a, b) => a - b), of: names.length };

  return (
    <>
      <div className="qad-scrim" onClick={leave} data-qad-scrim />
      <aside className="qad-drawer" role="dialog" aria-modal="true" aria-label={view.title} data-qad-drawer={mode}>
        <div className="qad-head" data-qad-head>
          <div className="qad-top">
            <div className="qad-tt">
              {from ? <button type="button" className="qad-from" data-qad-from onClick={leave}>← {from}</button> : null}
              <div className="qad-mode">{view.eyebrow}</div>
              {/* ⚠️ NOT AN <h2>: brand.tsx forces every h1–h3 into the brand serif with !important, so
                  the typewriter title would silently become Playfair. The role keeps it a heading. */}
              <div className="qad-h2" role="heading" aria-level={2}>{view.title}</div>
            </div>
            <span className="qad-qwrap" aria-hidden="true"><img src={QUILL_SRC} alt="" /></span>
          </div>
          <button type="button" className="qad-dx" aria-label="Close" onClick={requestClose}>×</button>
          {view.who}
        </div>

        <div className="qad-body" ref={bodyRef} data-qad-body>
          {view.steps.length ? (
            <>
              <div className="qad-stepper" data-qad-stepper>
                {names.map((t, i) => {
                  const cls = stepperCls(i);
                  const ic = i === cur ? i + 1 : cls === "done" ? "✓" : cls === "blk" || cls === "chk" ? "!" : i + 1;
                  return (
                    <React.Fragment key={i}>
                      <button type="button" className={`qad-stp ${cls}${i === cur && moveDir ? " pop" : ""}`} data-qad-step={i} data-qad-state={cls || "none"}
                        disabled={!view.ok && i > 0} onClick={() => go(i)} aria-current={i === cur ? "step" : undefined}>
                        <i>{ic}</i><em>{t}</em>
                      </button>
                      {i < names.length - 1 ? (
                        <span className={`qad-stl${i < cur ? (moveDir > 0 && i >= fromStep && i < cur ? " done fill" : " done") : ""}`} />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="qad-stepper-sm" data-qad-stepper-sm>{view.pickOnly ? "Choose the query" : <>Step {cur + 1} of {names.length} · {names[cur]}</>}</div>
            </>
          ) : null}

          {curStep ? (
            <div className={`qad-sec${moveDir > 0 ? " in-f" : moveDir < 0 ? " in-b" : ""}`} key={`s${cur}`} data-qad-sec={curStep.title}>
              <div className="qad-shd"><b>{curStep.title}</b></div>
              {g?.level === "check" && !curStep.ownWarn ? (
                <Note kind="warn" tag="WORTH A LOOK">{g.msg}. You can still carry on.</Note>
              ) : null}
              {curStep.body}
              {curStep.plan ? <PlanTrack plan={curStep.plan} /> : null}
            </div>
          ) : null}
          {!view.ok && view.preNote ? view.preNote : null}

          {cur === last && view.ok ? (
            <>
              <div className={`qad-recap${moveDir ? " in-f" : ""}`} data-qad-review>
                {nb ? (
                  <div className="qad-gate blk" data-qad-verdict="blk"><b>{nb === 1 ? "One thing" : `${nb} things`} to fix before this can be {view.verbDone}</b></div>
                ) : nc ? (
                  <div className="qad-gate chk" data-qad-verdict="chk"><b>Ready to {view.verb}</b><span>{nc === 1 ? "One thing looks" : `${nc} things look`} different from usual — worth a glance, but it won't stop you.</span></div>
                ) : (
                  <div className="qad-gate ok" data-qad-verdict="ok"><b>Ready to {view.verb}</b><span>Nothing looks out of place.</span></div>
                )}
                {view.reviewNote ?? null}
                <h5>YOUR ANSWERS</h5>
                {view.steps.map((s, i) => {
                  const st = state(i);
                  return (
                    <button type="button" key={i} className={`qad-rr ${st}`} onClick={() => go(i)} data-qad-answer={s.title}>
                      <b>{s.title}</b>
                      <span>
                        {s.summary || "—"}
                        {(st === "blk" || st === "chk") && s.guard ? <small className="fm">{s.guard.msg}</small> : null}
                        {st === "auto" ? <small className="au">SUGGESTED · NOT OPENED</small> : null}
                      </span>
                      <u>{st === "blk" ? "FIX" : "EDIT"}</u>
                    </button>
                  );
                })}
              </div>
              {reviewPlan ? <PlanTrack plan={reviewPlan} review={!!moveDir} /> : null}
              <div className="qad-saves" data-qad-saves>
                <h5>WHEN YOU SAVE</h5>
                <ul>{view.saves.map((l, i) => <li key={i}><i style={{ background: l.dot || "#fff" }} /><span>{l.text}</span></li>)}</ul>
              </div>
            </>
          ) : null}
        </div>

        <div className="qad-foot" data-qad-foot>
          {cur > 0 ? <button type="button" className="qad-back" onClick={() => go(cur - 1)}>‹ Back</button> : null}
          {view.pickOnly ? null : <button type="button" className={`qad-save${busy ? " busy" : ""}`} disabled={primaryDisabled} onClick={primary} data-qad-primary>{primaryLabel}</button>}
          {view.ok && cur < last - 1 && !curBlocked ? <button type="button" className="qad-skip" onClick={() => go(last)}>Review</button> : null}
          {/* once anything is answered, the foot offers to put it away rather than throw it away;
              ✕ in the header still asks before discarding (decision 8) */}
          {view.dirty
            ? <button type="button" className="qad-cancel" data-qad-later onClick={leave}>Finish later</button>
            : <button type="button" className="qad-cancel" onClick={requestClose}>Cancel</button>}
          {view.leave && !confirm ? (
            <div className="qad-conf" data-qad-discard data-qad-leave>
              <span><b>{view.leave.title}</b>{view.leave.sub}</span>
              <button type="button" className="keep" onClick={view.leave.cancel}>Keep editing</button>
              <button type="button" className="disc" onClick={() => { const go = view.leave!.go; view.leave!.cancel(); onCancel(); go(); }}>{view.leave.button}</button>
            </div>
          ) : null}
          {confirm ? (
            <div className="qad-conf" data-qad-discard>
              <span><b>Discard this?</b>Nothing has been saved yet.</span>
              <button type="button" className="keep" onClick={() => setConfirm(false)}>Keep going</button>
              <button type="button" className="disc" onClick={() => { setConfirm(false); onCancel(); }}>Discard</button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
