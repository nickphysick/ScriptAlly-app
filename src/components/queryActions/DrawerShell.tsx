/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The drawer's shell (brief §A): the ink header, the stepper, one step at a time, the review, the
 * footer, the discard bar and the scrim. A journey supplies its steps; the shell decides everything
 * about how they are walked, so every journey walks the same way.
 *
 * ⚠️ ESCAPE IS ONE HANDLER (the house law): calendar → discard bar → drawer, asked in that order by
 * this component. A second listener would be resolved by registration order, which is a fact about
 * which element mounted last and not about what is on screen. It is registered in the CAPTURE phase
 * on `window` and stops there, so the query card behind the drawer does not also close on the same
 * press — Escape steps back ONE layer.
 */
import React, { useEffect, useRef, useState } from "react";
import { Note, PlanTrack, useDrawer, type PlanSpec } from "./controls";
import type { JourneyView, StepState } from "./journey";

export const QUILL_SRC = "/images/qa/quill.webp";
/** The save button holds its busy state this long before the write goes (the mock's 420ms). */
export const SAVE_BEAT_MS = 420;

export interface ShellProps {
  view: JourneyView;
  mode: string;
  open: boolean;
  initialStep?: number;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

export function DrawerShell({ view, mode, open, initialStep, onCancel, onSave }: ShellProps) {
  const { openCal, setOpenCal } = useDrawer();
  const n = view.steps.length;
  const last = n;
  const [step, setStep] = useState(Math.min(initialStep ?? 0, n));
  const [seen, setSeen] = useState<Set<number>>(() => new Set([Math.min(initialStep ?? 0, n)]));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const prevStep = useRef(step);
  const moveDir = step === prevStep.current ? 0 : step > prevStep.current ? 1 : -1;
  const fromStep = prevStep.current;
  useEffect(() => { prevStep.current = step; });
  const bodyRef = useRef<HTMLDivElement>(null);

  /* The step can outrun the steps when a journey's answer removes some (a response type changed). */
  const cur = Math.min(step, last);
  useEffect(() => { if (step > last) setStep(last); }, [step, last]);

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

  /* Escape, one layer at a time. */
  const escRef = useRef<() => void>(() => {});
  escRef.current = () => {
    if (openCal) { setOpenCal(null); return; }
    if (confirm) { setConfirm(false); return; }
    requestClose();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      escRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  function requestClose() {
    if (view.guardDiscard) { setConfirm(true); return; }
    onCancel();
  }
  function scrimClick() {
    /* The recorded decision (useOverlay.ts): a sheet holding answers a stray click must not
       discard. With answers, the drawer shakes; with nothing entered yet, it closes. */
    if (view.dirty) {
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      return;
    }
    onCancel();
  }

  async function primary() {
    if (cur < last) { go(cur + 1); return; }
    if (busy) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, SAVE_BEAT_MS));
    try { await onSave(); } finally { setBusy(false); }
  }

  const names = view.steps.map((s) => s.title).concat([`Check and ${view.verb}`]);
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

  return (
    <>
      <div className="qad-scrim" onClick={scrimClick} data-qad-scrim />
      <aside className={`qad-drawer${shake ? " is-shake" : ""}`} role="dialog" aria-modal="true" aria-label={view.title} data-qad-drawer={mode}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) setShake(false); }}>
        <div className="qad-head" data-qad-head>
          <div className="qad-top">
            <div className="qad-tt">
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
              <div className="qad-stepper-sm" data-qad-stepper-sm>Step {cur + 1} of {names.length} · {names[cur]}</div>
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
          <button type="button" className={`qad-save${busy ? " busy" : ""}`} disabled={primaryDisabled} onClick={primary} data-qad-primary>{primaryLabel}</button>
          {view.ok && cur < last - 1 && !curBlocked ? <button type="button" className="qad-skip" onClick={() => go(last)}>Review</button> : null}
          <button type="button" className="qad-cancel" onClick={requestClose}>Cancel</button>
          {confirm ? (
            <div className="qad-conf" data-qad-discard>
              <span><b>Discard this query?</b>What you've entered will be lost.</span>
              <button type="button" className="keep" onClick={() => setConfirm(false)}>Keep editing</button>
              <button type="button" className="disc" onClick={() => { setConfirm(false); onCancel(); }}>Discard</button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
