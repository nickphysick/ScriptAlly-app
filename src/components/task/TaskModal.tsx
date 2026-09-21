/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskModal — the app's ONE surface for finishing a task (task-modal round, 21 Sep;
 * ref `task-modal.html`).
 *
 * ⚠️ THE TICK NO LONGER WRITES. It opens this, and only this writes (Nick, 21 Sep): *"the row-strip
 * experiment showed that a commit the user can't see is a commit they don't trust. One click plus a
 * visible confirmation is the price, and it's the right price."* Undo on the row's strip stays as
 * the safety net after. That is a bigger change than replacing an editor and it is deliberate — the
 * optimistic path is gone from every journey, not narrowed.
 *
 * ⚠️ THREE DOORS, ONE COMPONENT, NO PER-SURFACE VARIANTS. A to-do row's checkbox (dashboard and the
 * To-do page), the activity feed's action link, and the To-do page's own cards all open THIS. What
 * differs between them is data — which list you stepped in from, and whether there is a list at all
 * — so it arrives as props rather than as a branch: `order`/`index` give the counter and the
 * chevrons, and their absence is what the feed looks like.
 *
 * ⚠️ IT DOES NOT WRITE EITHER. It collects an answer and its values and hands them up; the host
 * raises a `CommitRequest` and `useTaskCommit` performs it. Keeping the writer out of here is what
 * lets three surfaces share one modal without three of them learning to write.
 *
 * ⚠️ AND `useOverlay` IS THE FOCUS TRAP AND THE SCROLL LOCK — not a second implementation. It
 * already owns the five obligations an overlay has here (trap, return focus, Escape, backdrop,
 * `inert` on `#root`, `lockStageScroll`) and has five consumers; §1's two sentences are its
 * contract verbatim.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "../shell/useOverlay";
import {
  modalAnswers, modalCounter, modalFootLine, modalPrimaryLabel, modalQuestion, modalRows, modalTag,
  type ModalAnswer, type ModalJourney,
} from "../../lib/taskModal";
import { SEND_METHODS, type SendMethod } from "../../lib/paneJourney";
import "./taskModal.css";

/**
 * ⚠️ THE EXIT'S DURATION IS STATED HERE AND IN THE SHEET, AND A LOCK ASSERTS THEY AGREE. React has
 * to keep the element mounted until the animation has run, so the number is needed in JS; the
 * animation needs it in CSS. Two numbers for one fact is how a modal comes to vanish mid-fade.
 */
export const TM_EXIT_MS = 160;

/** the glyphs, in the ref's own weights — the model names one, this draws it */
const GLYPH: Record<string, React.FC> = {
  dot: () => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none" /></svg>),
  part: () => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" /></svg>),
  circle: () => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>),
  minus: () => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12h10" strokeWidth="2.5" strokeLinecap="round" /></svg>),
  clock: () => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>),
};

/** the illustrator's three subjects — a placeholder box of the artwork's own size until they land */
const ILLO: Record<ModalJourney, string> = {
  sent: "COURIER\nbundle under wing",
  nudge: "SCOUT\ntapping a watch",
  quiet: "ARCHIVIST\nclosing a ledger",
};

/** everything the modal renders that it cannot derive — assembled by the host from the card */
export interface TaskModalFacts {
  journey: ModalJourney;
  /** the task sentence, split so the manuscript and the agent can carry their own underline */
  title: { pre: string; who: string; post: string; ms?: string };
  /** the plain-words line: "Asked 22 Aug · 26 days ago · it's your turn." */
  when: string;
  agent: { name: string; initials: string; meta: string };
  /** a partial rather than a full — decides one glyph and three lines of copy */
  partial: boolean;
  /** what the app already knows went, pre-filled into the first row */
  materials: string;
  /** the agency's own window, and the date it produces — absent where they state none */
  expected: { date: string; hint: string } | null;
  remind: { date: string; hint: string } | null;
  method: SendMethod;
}

export interface TaskModalValues {
  answer: ModalAnswer;
  materials: string;
  when: string;
  expected: string;
  remind: string;
  method: SendMethod;
  also: string;
  note: string;
}

export interface TaskModalProps {
  facts: TaskModalFacts;
  /** §4 · where you stepped in from. Absent = the feed door: no counter, no chevrons. */
  order?: { index: number; total: number; onPrev: () => void; onNext: () => void } | null;
  fromFeed?: boolean;
  /** §8 · the guard's question, arriving as a banner rather than as a dialog over a dialog */
  warn?: string | null;
  /** the write is in flight — the primary cannot be pressed twice */
  busy?: boolean;
  onOpenQuery: () => void;
  onClose: () => void;
  onCommit: (v: TaskModalValues) => void;
  /** the snooze answer hands off to the app's own dial rather than inventing a second one */
  renderSnooze?: () => React.ReactNode;
}

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (days: number): string => { const d = new Date(); d.setDate(d.getDate() + days); return ymd(d); };
/** the app's own short date — "31 Oct", never a browser locale's `02/11/2026` */
const pretty = (iso: string): string => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const TaskModal: React.FC<TaskModalProps> = ({
  facts, order = null, fromFeed = false, warn = null, busy = false,
  onOpenQuery, onClose, onCommit, renderSnooze,
}) => {
  /* ⚠️ NAMED `rootRef` LIKE ITS FOUR SIBLINGS. `queryCentreOverlay.test.ts` censuses every caller
     of the primitive by that spelling — and the consistency is worth having on its own terms: four
     overlays naming one thing one way is how the next reader finds the fifth. */
  const rootRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  /**
   * ⚠️ CLOSING IS DEFERRED BY THE EXIT'S OWN DURATION, and the flag is what the sheet's reverse
   * animation keys on. Unmounting on the click would make §3's exit unobservable — the element is
   * gone before the 160ms it describes has started.
   */
  const leave = React.useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, TM_EXIT_MS);
  }, [onClose]);

  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: leave,
    /* ⚠️ CAPTURED. This sits over pages that own Escape for their own surfaces — the To-do page's
       docked pane, the Query Centre's sheet — and a modal is a decision in progress: the key must
       reach it and stop. That is the opposite call from permanent chrome, which must not swallow. */
    captureEscape: true,
    scrimClasses: ["tm-dim"],
    onScrimClick: leave,
  });

  const answers = useMemo(() => modalAnswers(facts.journey, facts.partial), [facts.journey, facts.partial]);
  const [answerKey, setAnswerKey] = useState(answers[0].key);
  const answer = answers.find((a) => a.key === answerKey) ?? answers[0];

  const [v, setV] = useState({
    materials: facts.materials,
    when: shift(0),
    expected: facts.expected?.date ?? "",
    remind: facts.remind?.date ?? "",
    method: facts.method,
    also: "",
    note: "",
  });
  const [showAlso, setShowAlso] = useState(false);
  const [showNote, setShowNote] = useState(false);
  /**
   * ⚠️ A DATE IS TEXT UNTIL `Change` IS PRESSED, and that is the ref's shape rather than a
   * flourish. A bare `<input type="date">` renders the browser's own locale — measured on the page,
   * `02/11/2026` where every other date in the app reads `2 Nov` — so the resting state would be
   * the one place the app speaks in a format it does not use anywhere else. The field appears when
   * the writer asks to change it, which is also the only moment its format matters.
   */
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const dateCell = (which: "expected" | "remind", hint: string | null) => (
    editing[which]
      ? <input type="date" className="tm-pc" aria-label={which === "expected" ? "Reply expected" : "Nudge me"}
        value={(v as Record<string, string>)[which]} autoFocus
        onChange={(e) => setV({ ...v, [which]: e.target.value })} />
      : <>
        <span data-probe={`tm-${which}`}>{pretty((v as Record<string, string>)[which])}</span>
        {hint && <span className="tm-hint">{hint}</span>}
        <button type="button" className="tm-pc tm-pc--link"
          onClick={() => setEditing((m) => ({ ...m, [which]: true }))}>Change</button>
      </>
  );

  /**
   * ⚠️ STEPPING TO ANOTHER TASK RESETS THE ANSWER AND THE VALUES, and it has to: they belong to the
   * task, not to the modal. Without this, pressing `›` carries the previous card's chosen answer —
   * and on a different journey that answer does not exist, so the primary would write whatever the
   * fallback happened to be. The key is the SENTENCE rather than an id because the host rebuilds
   * facts per card and that is the field guaranteed to differ.
   */
  const ident = `${facts.journey}|${facts.title.who}|${facts.title.pre}`;
  const identRef = useRef(ident);
  useEffect(() => {
    if (identRef.current === ident) return;
    identRef.current = ident;
    setAnswerKey(answers[0].key);
    setV({
      materials: facts.materials, when: shift(0),
      expected: facts.expected?.date ?? "", remind: facts.remind?.date ?? "",
      method: facts.method, also: "", note: "",
    });
    setShowAlso(false); setShowNote(false);
  }, [ident, answers, facts]);

  const rows = modalRows(facts.journey, answer);
  const tag = modalTag(facts.journey, fromFeed);
  const counter = order ? modalCounter(order.index, order.total) : null;
  const Illo = ILLO[facts.journey];

  const pill = (label: string, on: boolean, onPick: () => void) => (
    <button type="button" key={label} className={`tm-pc${on ? " tm-pc--on" : ""}`} onClick={onPick}>{label}</button>
  );

  return createPortal(
    <div className={`tm-scope${leaving ? " tm-scope--leaving" : ""}`} onKeyDown={trapTab} onClick={scrimClick}>
      <div className="tm-dim" />
      <div className="tm" role="dialog" aria-modal="true" aria-label={`${facts.title.pre}${facts.title.who}${facts.title.post}`}
        ref={rootRef} tabIndex={-1} data-probe="task-modal">
        <div className="tm-mount"><div className="tm-frame">

          {/* ── §4 · the top bar ───────────────────────────────────────────────────────── */}
          <div className="tm-top">
            <span className={`tm-tag${tag.tone === "sand" ? " tm-tag--sand" : tag.tone === "stone" ? " tm-tag--stone" : ""}`}
              data-probe="tm-tag">{tag.label}</span>
            {counter && <span className="tm-of" data-probe="tm-counter">{counter}</span>}
            <span className="tm-topr">
              {order && (
                <>
                  <button type="button" onClick={order.onPrev} disabled={order.index <= 0}
                    aria-label="Previous task" data-probe="tm-prev">‹</button>
                  <button type="button" onClick={order.onNext} disabled={order.index >= order.total - 1}
                    aria-label="Next task" data-probe="tm-next">›</button>
                </>
              )}
              <button type="button" className="tm-esc" onClick={leave} data-probe="tm-esc">ESC</button>
            </span>
          </div>

          {/* ── §5 · the head ──────────────────────────────────────────────────────────── */}
          <div className="tm-head">
            <div className="tm-ttl">
              <h2>
                {facts.title.pre}
                {facts.title.who && <em>{facts.title.who}</em>}
                {facts.title.post}
              </h2>
              <p className="tm-when">{facts.when}</p>
              <div className="tm-agent">
                <span className="tm-av" aria-hidden="true">{facts.agent.initials}</span>
                <b>{facts.agent.name}</b>
                <span className="tm-ameta">{facts.agent.meta}</span>
                <button type="button" className="tm-open" onClick={onOpenQuery}>Open the query →</button>
              </div>
            </div>
            <div className="tm-ill" aria-hidden="true">
              {Illo.split("\n").map((l, i) => <React.Fragment key={l}>{i > 0 && <br />}{l}</React.Fragment>)}
            </div>
          </div>

          {/* ── §6 · the body ──────────────────────────────────────────────────────────── */}
          <div className="tm-bd tm-body-swap" key={ident}>
            <p className="tm-q"><i aria-hidden="true" />{modalQuestion(facts.journey)}</p>

            <div className="tm-opts" role="group" aria-label={modalQuestion(facts.journey)}>
              {answers.map((a) => {
                const G = GLYPH[a.ico] ?? GLYPH.circle;
                return (
                  <button type="button" key={a.key} className="tm-opt" aria-pressed={a.key === answer.key}
                    data-probe={`tm-answer-${a.key}`} onClick={() => setAnswerKey(a.key)}>
                    <span className="tm-ic"><G /></span>
                    <b>{a.title}</b>
                    <span className="tm-why">{a.why}</span>
                    <span className="tm-rec">{a.records}</span>
                  </button>
                );
              })}
            </div>

            {/* §8 · the guard asks HERE now, rather than declining and rehoming the question */}
            {warn && <p className="tm-warn" data-probe="tm-warn">{warn}</p>}

            {answer.write === "snooze" && renderSnooze ? (
              <div className="tm-snooze" data-probe="tm-snooze">{renderSnooze()}</div>
            ) : rows.length > 0 && (
              <div className="tm-form" data-probe="tm-form">
                {rows.includes("materials") && (
                  <div className="tm-fr"><span className="tm-k">What you sent</span><span className="tm-v">
                    {pill(facts.materials || "What was asked for", v.materials === facts.materials, () => setV({ ...v, materials: facts.materials }))}
                    <button type="button" className={`tm-pc${v.materials !== facts.materials ? " tm-pc--on" : ""}`}
                      onClick={() => setShowAlso(true)}>Something else…</button>
                  </span></div>
                )}
                {rows.includes("when") && (
                  <div className="tm-fr"><span className="tm-k">{facts.journey === "nudge" ? "Sent" : "When"}</span><span className="tm-v">
                    {pill("Today", v.when === shift(0), () => setV({ ...v, when: shift(0) }))}
                    {pill("Yesterday", v.when === shift(-1), () => setV({ ...v, when: shift(-1) }))}
                    {editing.when
                      ? <input type="date" className="tm-pc" aria-label="Pick a date" max={shift(0)} autoFocus
                        value={v.when} onChange={(e) => setV({ ...v, when: e.target.value })} />
                      : <button type="button" className={`tm-pc${v.when !== shift(0) && v.when !== shift(-1) ? " tm-pc--on" : ""}`}
                        onClick={() => setEditing((m) => ({ ...m, when: true }))}>
                        {v.when !== shift(0) && v.when !== shift(-1) ? pretty(v.when) : "Pick a date"}
                      </button>}
                  </span></div>
                )}
                {rows.includes("method") && (
                  <div className="tm-fr"><span className="tm-k">How</span><span className="tm-v">
                    {SEND_METHODS.map((m) => pill(m, v.method === m, () => setV({ ...v, method: m as SendMethod })))}
                  </span></div>
                )}
                {rows.includes("expected") && (
                  <div className="tm-fr"><span className="tm-k">Reply expected</span><span className="tm-v">
                    {dateCell("expected", facts.expected?.hint ?? null)}
                  </span></div>
                )}
                {rows.includes("remind") && (
                  <div className="tm-fr"><span className="tm-k">Nudge me</span><span className="tm-v">
                    {v.remind ? dateCell("remind", facts.remind?.hint ?? null) : <span className="tm-hint">No reminder</span>}
                    {/* ⚠️ "DON'T" IS THE WRITER SAYING SO, not an empty field — `noCheckIn` is the
                        flag the commit reads for exactly that. */}
                    <button type="button" className="tm-pc tm-pc--link"
                      onClick={() => setV({ ...v, remind: v.remind ? "" : (facts.remind?.date ?? shift(28)) })}>
                      {v.remind ? "Don’t" : "Remind me"}
                    </button>
                  </span></div>
                )}
                {rows.includes("again") && (
                  <div className="tm-fr"><span className="tm-k">Nudge again</span><span className="tm-v">
                    {v.remind ? dateCell("remind", null) : <span className="tm-hint">No reminder</span>}
                    <button type="button" className="tm-pc tm-pc--link"
                      onClick={() => setV({ ...v, remind: v.remind ? "" : shift(28) })}>
                      {v.remind ? "Don’t" : "Remind me"}
                    </button>
                  </span></div>
                )}
                {rows.includes("closedAs") && (
                  <div className="tm-fr"><span className="tm-k">Closed as of</span><span className="tm-v">
                    {pill("Today", v.when === shift(0), () => setV({ ...v, when: shift(0) }))}
                    <input type="date" className="tm-pc" aria-label="Pick a date" max={shift(0)}
                      value={v.when} onChange={(e) => setV({ ...v, when: e.target.value })} />
                  </span></div>
                )}
                {rows.includes("countsAs") && (
                  <div className="tm-fr"><span className="tm-k">Counts as</span><span className="tm-v">
                    No reply <span className="tm-hint">In Closed</span>
                  </span></div>
                )}
              </div>
            )}

            {answer.write !== "snooze" && answer.write !== "mute" && (
              <>
                <div className="tm-adds">
                  {facts.journey === "sent" && !showAlso && (
                    <button type="button" onClick={() => setShowAlso(true)}>+ Anything else going with it</button>
                  )}
                  {!showNote && <button type="button" onClick={() => setShowNote(true)}>+ Add a note for your file</button>}
                </div>
                {showAlso && facts.journey === "sent" && (
                  <input type="text" className="tm-note tm-also" placeholder="Anything else that went with it"
                    aria-label="Anything else that went with it"
                    value={v.also} onChange={(e) => setV({ ...v, also: e.target.value })} />
                )}
                {showNote && (
                  <textarea className="tm-note" placeholder="Add a note for your file" aria-label="Add a note for your file"
                    value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
                )}
              </>
            )}
          </div>

          {/* ── §7 · the footer ────────────────────────────────────────────────────────── */}
          <div className="tm-foot">
            <span className="tm-rec" data-probe="tm-records">{modalFootLine(facts.journey, answer, facts.partial)}</span>
            <span className="tm-footr">
              <button type="button" className="tm-b tm-b--quiet" onClick={leave}>Cancel</button>
              {/* the snooze answer commits from the dial itself, so it has no primary of its own */}
              {answer.write !== "snooze" && (
                <button type="button" className="tm-b tm-b--ink" disabled={busy} data-probe="tm-primary"
                  onClick={() => onCommit({ ...v, answer })}>
                  {warn ? "Log it anyway" : modalPrimaryLabel(facts.journey, answer)}
                </button>
              )}
            </span>
          </div>

        </div></div>
      </div>
    </div>,
    document.body,
  );
};
