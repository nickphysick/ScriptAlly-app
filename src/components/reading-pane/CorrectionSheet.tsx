/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ CORRECTING THE RECORD (refs 169-correction-ui.html, 171-consequence-sheet.html) ═══════════
 *
 * ⚠️ THE FORK IS THE DESIGN, AND IT IS NOT A CONFIRMATION STEP. Two reasons bring a writer to an
 * event, and they are different OPERATIONS:
 *
 *   "I did it wrong"           the record is FALSE  → edit or delete the event
 *   "The agent changed course" the record is TRUE   → append a new event on top
 *
 * One form for both would quietly rewrite history every time the world had simply moved on. So the
 * menu asks in plain words first, and the second branch ROUTES to flows that already exist — Record
 * response and the holding reply — rather than growing a third way to append.
 *
 * ⚠️ AND THE CONSEQUENCES ARE SHOWN BEFORE THE WRITE, from `previewCorrection` — the real derivation
 * run against the proposed log. Nothing here restates what an edit "will" do; it asks the engine and
 * renders the answer, which is why the sheet can promise the outcome rather than predict it.
 */
import React, { useEffect, useRef, useState } from "react";
import { StatusDot } from "../StatusDot";
import { previewBody, type CorrectionDiff, type SurfaceChange } from "../../lib/correctionPreview";
import "./correctionSheet.css";

/* ── the fork ─────────────────────────────────────────────────────────────────────────────── */

export interface CorrectionForkProps {
  /** What the writer clicked ⋯ on — named, so the fork is about a specific event. */
  subject: string;
  /** Branch one: the record is false. */
  onCorrect: () => void;
  /** Branch two: the record is true and the world moved. Routes to the existing append flows. */
  onAppend: () => void;
  onCancel: () => void;
}

export const CorrectionFork: React.FC<CorrectionForkProps> = ({ subject, onCorrect, onAppend, onCancel }) => (
  <div className="cor-sheet" role="dialog" aria-modal="true" aria-label="What would you like to do?">
    <div className="cor-top" aria-hidden="true" />
    <div className="cor-body">
      <h2 className="cor-q">What would you like to do?</h2>
      <div className="cor-subj">{subject}</div>
      {/* ⚠️ THE COPY IS THE REF'S, VERBATIM — it is the whole mechanism. Each branch says what the
          record IS, not what the button does, because that is the distinction being drawn. */}
      <button type="button" className="cor-branch" onClick={onCorrect}>
        <span className="cor-bglyph" aria-hidden="true">✏</span>
        <span className="cor-btx">
          <b>I&rsquo;m correcting a mistake</b>
          <i>The record is wrong — wrong query, wrong date, misread email. This changes history, because it never happened that way.</i>
        </span>
      </button>
      <button type="button" className="cor-branch" onClick={onAppend}>
        <span className="cor-bglyph" aria-hidden="true">↩</span>
        <span className="cor-btx">
          <b>Something changed since</b>
          <i>The agent reached out, reversed a decision, asked for something else. The record stays — what happened next goes on top.</i>
        </span>
      </button>
      <button type="button" className="cor-cancel" onClick={onCancel}>Cancel</button>
    </div>
  </div>
);

/* ── the edit form ────────────────────────────────────────────────────────────────────────── */

export interface CorrectionDraft {
  dateISO: string;
  note: string;
}

export interface CorrectionEditProps {
  subject: string;
  initial: CorrectionDraft;
  onSave: (d: CorrectionDraft) => void;
  onRemove?: () => void;
  onCancel: () => void;
  /** Root guard — the earliest event may be edited but never removed (ref 170). */
  removable?: boolean;
  /** The reason removal is unavailable, when it is — never a disabled control with no explanation. */
  removeBlockedReason?: string;
}

/** ⚠️ TODAY, IN THE INPUT'S OWN FORMAT — the timeline records what happened, so tomorrow is refused. */
const todayInput = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const CorrectionEdit: React.FC<CorrectionEditProps> = ({
  subject, initial, onSave, onRemove, onCancel, removable = true, removeBlockedReason,
}) => {
  const [draft, setDraft] = useState<CorrectionDraft>(initial);
  const firstRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  /* ⚠️ SAVE IS INERT UNTIL SOMETHING CHANGES, compared against what the form OPENED with — the same
     rule the expected-time control follows, so the two editors in this pane behave alike. */
  const dirty = draft.dateISO !== initial.dateISO || draft.note !== initial.note;
  const future = !!draft.dateISO && draft.dateISO > todayInput();

  return (
    <div
      className="cor-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${subject}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
      }}
    >
      <div className="cor-top" aria-hidden="true" />
      <div className="cor-body">
        <h2 className="cor-q">Edit</h2>
        <div className="cor-subj">{subject}</div>

        <label className="cor-fl" htmlFor="cor-date">Date</label>
        <input
          id="cor-date"
          ref={firstRef}
          type="date"
          className="cor-in"
          value={draft.dateISO}
          max={todayInput()}
          onChange={(e) => setDraft({ ...draft, dateISO: e.target.value })}
        />
        {/* ⚠️ THE ERROR POINTS SOMEWHERE, rather than only refusing. A future date is almost always
            someone reaching for a reminder, and the app has one. */}
        {future && (
          <div className="cor-err">
            The timeline records what happened, so it cannot hold a future date. To plan ahead, set a reminder instead.
          </div>
        )}

        <label className="cor-fl" htmlFor="cor-note">Note</label>
        {/* ⚠️ THIS WRITES THROUGH `details`, which Phase 1 mapped onto the authoritative log's `note`.
            Before that it would have reached the projection only, and read back unchanged. */}
        <textarea
          id="cor-note"
          className="cor-ta"
          rows={3}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />

        <div className="cor-acts">
          {onRemove && removable && (
            <button type="button" className="cor-remove" onClick={onRemove}>Remove this entry…</button>
          )}
          {!removable && removeBlockedReason && <div className="cor-note-quiet">{removeBlockedReason}</div>}
          <span className="cor-grow" aria-hidden="true" />
          <button type="button" className="cor-cancel-inline" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={`cor-save${dirty && !future ? "" : " cor-save--off"}`}
            disabled={!dirty || future}
            onClick={() => onSave(draft)}
          >Save</button>
        </div>
      </div>
    </div>
  );
};

/* ── the consequence sheet ────────────────────────────────────────────────────────────────── */

/** One action the sheet offers, each carrying its own cost beneath it (ref 171). */
export interface SheetAction {
  label: string;
  /** The cost, stated under the label — "one undo restores them", "keep both, fix the details". */
  cost?: string;
  onClick: () => void;
  danger?: boolean;
}

export interface ConsequenceSheetProps {
  question: string;
  subject: string;
  diff: CorrectionDiff;
  actions: SheetAction[];
  onCancel: () => void;
}

const SURFACE_LABEL: Record<SurfaceChange["surface"], string> = {
  status: "Status",
  timeline: "Timeline",
  chapters: "Chapters",
  anchor: "Waiting",
  window: "Window",
};

/**
 * ⚠️ THE SUMMARY IS ONE SENTENCE, NOT A LIST, when the body is the timeline (ref 171 B). The rungs
 * above already show what leaves; the line carries only what a timeline cannot draw.
 */
const summaryLine = (d: CorrectionDiff): string =>
  d.changes.map((c) => `${SURFACE_LABEL[c.surface].toLowerCase()} ${c.before} → ${c.after}`).join(" · ");

export const ConsequenceSheet: React.FC<ConsequenceSheetProps> = ({ question, subject, diff, actions, onCancel }) => {
  const body = previewBody(diff);
  const removedIds = new Set(diff.removed.map((r) => r.activityId ?? r.title));

  return (
    <div
      className="cor-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={question}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } }}
    >
      <div className="cor-top" aria-hidden="true" />
      <div className="cor-body">
        <h2 className="cor-q">{question}</h2>
        <div className="cor-subj">{subject}</div>

        {body === "timeline" ? (
          /**
           * ⚠️ FORMAT B — THE RECORD AS IT WILL BE, with what leaves struck through in place rather
           * than described. A writer checks a timeline by reading it, so the preview is the thing
           * itself; the ledger below states the same facts in words and is the fallback.
           */
          <div className="cor-tl">
            <div className="cor-tlhead">The timeline, after</div>
            {[...diff.removed, ...diff.rowsAfter]
              .sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0))
              .map((row, i) => {
                const gone = removedIds.has(row.activityId ?? row.title);
                return (
                  <div key={`${row.activityId ?? row.title}-${i}`} className={`cor-tlrow${gone ? " cor-tlrow--gone" : ""}`}>
                    <span className="cor-tlmk" aria-hidden="true">
                      <StatusDot status={row.status as never} overrideSize={14} decorative />
                    </span>
                    <span className="cor-tlttl">{row.title}</span>
                  </div>
                );
              })}
            {diff.changes.length > 0 && <div className="cor-tlsum">{summaryLine(diff)}</div>}
          </div>
        ) : (
          /**
           * ⚠️ FORMAT A — THE LEDGER, for a diff that moves no rung. Was → becomes, with the old
           * struck. Its status row renders the REAL `StatusDot`, imported, because a legend that
           * recreates a glyph is how two drawings of one status come to differ.
           */
          <div className="cor-ledger">
            <div className="cor-tlhead">After this change</div>
            {diff.changes.map((c, i) => (
              <div key={i} className="cor-ledrow">
                <span className="cor-ledlbl">{SURFACE_LABEL[c.surface]}</span>
                <span className="cor-ledval">
                  {c.surface === "status" && <StatusDot status={c.before as never} overrideSize={13} decorative />}
                  <s>{c.before}</s>
                  <span className="cor-arrow" aria-hidden="true">→</span>
                  {c.surface === "status" && <StatusDot status={c.after as never} overrideSize={13} decorative />}
                  <b>{c.after}</b>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ⚠️ STACKED, EACH CARRYING ITS OWN COST — so the choice is made on what it does, not on
            which button looks primary. Cancel is quiet at the foot and never competes. */}
        <div className="cor-sheetacts">
          {actions.map((a, i) => (
            <button key={i} type="button" className={`cor-act${a.danger ? " cor-act--danger" : ""}`} onClick={a.onClick}>
              <b>{a.label}</b>
              {a.cost && <i>{a.cost}</i>}
            </button>
          ))}
          <button type="button" className="cor-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
