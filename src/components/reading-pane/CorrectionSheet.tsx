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
import { filterCandidates, MOVE_BLOCK_TITLES, type MoveCandidate, type MoveNotices } from "../../lib/correctionMove";
import "./correctionSheet.css";

/* ── the fork ─────────────────────────────────────────────────────────────────────────────── */

export interface CorrectionForkProps {
  /** What the writer clicked ⋯ on — named, so the fork is about a specific event. */
  subject: string;
  /** Branch one: the record is false. */
  onCorrect: () => void;
  /** Branch two: the record is true and the world moved. Routes to the existing append flows. */
  onAppend: () => void;
  /**
   * ⚠️ OPTIONAL, AND ABSENT MEANS ABSENT — no row, not a disabled one. A query with nowhere to move
   * an entry to (the writer's only query) would otherwise show a control that can never do anything.
   */
  onMove?: () => void;
  onCancel: () => void;
}

export const CorrectionFork: React.FC<CorrectionForkProps> = ({ subject, onCorrect, onAppend, onMove, onCancel }) => (
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
      {/* ⚠️ THE THIRD BRANCH IS QUIETER THAN THE OTHER TWO, deliberately. The fork's question is
          "is the record false or did the world move" — a misfiling is a case OF the first, so it
          reads as a refinement beneath them rather than a peer to them. */}
      {onMove && (
        <button type="button" className="cor-branch cor-branch--minor" onClick={onMove}>
          <span className="cor-bglyph" aria-hidden="true">↦</span>
          <span className="cor-btx">
            <b>It belongs to a different query</b>
            <i>This happened, but with another agent. Move it — the event keeps its date and its note.</i>
          </span>
        </button>
      )}
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

/* ── the move picker (ref 172 card 10) ────────────────────────────────────────────────────── */

export interface MovePickerProps {
  subject: string;
  candidates: MoveCandidate[];
  onPick: (c: MoveCandidate) => void;
  onCancel: () => void;
}

/**
 * ⚠️ EVERY DESTINATION SHOWS ITS CURRENT STATUS, so a nonsensical landing is visible BEFORE it is
 * chosen rather than explained afterwards in the sheet. A picker listing bare names would make the
 * closed-query surprise (card 11) arrive one click too late — and the whole design of this feature
 * is that consequences precede commitment.
 *
 * ⚠️ CLOSED QUERIES ARE LISTED, MARKED, AND SELECTABLE. Filing an event onto a closed query is a
 * real correction — the event happened before the closure — so hiding them would remove the fix for
 * the very case most likely to be misfiled.
 *
 * ⚠️ ROOTS AND DOCUMENT-LESS ROWS NEVER REACH HERE. `canCorrect` withholds the ⋯ from a row with no
 * `activityId`, and `moveGuard` refuses the earliest event; both are upstream and tested, so this
 * component does not restate either rule. Restating it would give the app two places to disagree
 * about what may move.
 */
export const MovePicker: React.FC<MovePickerProps> = ({ subject, candidates, onPick, onCancel }) => {
  const [term, setTerm] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { searchRef.current?.focus(); }, []);
  const shown = filterCandidates(candidates, term);

  return (
    <div
      className="cor-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Move this entry to another query"
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } }}
    >
      <div className="cor-top" aria-hidden="true" />
      <div className="cor-body">
        <h2 className="cor-q">Move to which query?</h2>
        <div className="cor-subj">{subject}</div>

        {/* ⚠️ THE SEARCH IS ALWAYS RENDERED, not conditional on a length threshold — a control that
            appears once a list grows moves everything below it the moment data changes. */}
        <input
          ref={searchRef}
          className="cor-in cor-search"
          type="search"
          placeholder="Search agent, agency or status…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Search queries"
        />

        <div className="cor-picklist" role="listbox" aria-label="Queries">
          {shown.map((c) => (
            <button
              key={c.queryId}
              type="button"
              role="option"
              aria-selected="false"
              className={`cor-pick${c.closed ? " cor-pick--closed" : ""}`}
              onClick={() => onPick(c)}
            >
              <span className="cor-picknm">{c.agentName}</span>
              {c.agency && <span className="cor-pickag">{c.agency}</span>}
              <span className="cor-pickst">{c.status}</span>
            </button>
          ))}
          {/* ⚠️ AN EMPTY RESULT SAYS WHY. A blank panel reads as a broken list. */}
          {!shown.length && (
            <div className="cor-note-quiet">
              {candidates.length ? "No query matches that." : "There is nowhere to move this — it is your only query."}
            </div>
          )}
        </div>

        <button type="button" className="cor-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

/* ── the move's consequence sheet (ref 172 cards 10 and 11) ───────────────────────────────── */

export interface MoveSheetProps {
  subject: string;
  target: MoveCandidate;
  notices: MoveNotices;
  /** The source query losing the entry. */
  sourceDiff: CorrectionDiff;
  /** The target query gaining it. */
  targetDiff: CorrectionDiff;
  /** Card 10 — the note travels unless the writer edits or clears it. */
  note: string;
  onNoteChange: (v: string) => void;
  actions: SheetAction[];
  onCancel: () => void;
}

/** One query's block. ⚠️ It renders a real `CorrectionDiff`, never a sentence about one. */
const MoveBlock: React.FC<{ title: string; who: string; diff: CorrectionDiff }> = ({ title, who, diff }) => (
  <div className="cor-mvblock">
    <div className="cor-mvhead"><b>{title}</b><span>{who}</span></div>
    {diff.changes.length ? (
      diff.changes.map((c, i) => (
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
      ))
    ) : (
      /* ⚠️ "NOTHING DERIVED CHANGES" IS A RESULT, and stating it is the point of showing both sides.
         An empty block would read as a block that failed to load. */
      <div className="cor-note-quiet">The entry lands in its place in the record; nothing else changes here.</div>
    )}
  </div>
);

export const MoveSheet: React.FC<MoveSheetProps> = ({
  subject, target, notices, sourceDiff, targetDiff, note, onNoteChange, actions, onCancel,
}) => (
  <div
    className="cor-sheet cor-sheet--wide"
    role="dialog"
    aria-modal="true"
    aria-label={`Move ${subject} to ${target.agentName}`}
    onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } }}
  >
    <div className="cor-top" aria-hidden="true" />
    <div className="cor-body">
      <h2 className="cor-q">Move to {target.agentName}</h2>
      <div className="cor-subj">{subject}</div>

      {/* ⚠️ THE CLOSED-TARGET TRUTH COMES FIRST (card 11) — before the blocks, because it is the
          thing most likely to surprise, and a surprise stated after the detail reads as a caveat. */}
      {notices.closedNote && <div className="cor-notice">{notices.closedNote}</div>}

      <div className="cor-mvgrid">
        <MoveBlock title={MOVE_BLOCK_TITLES.source} who="losing this entry" diff={sourceDiff} />
        <MoveBlock title={MOVE_BLOCK_TITLES.target} who={target.agentName} diff={targetDiff} />
      </div>

      {/* ⚠️ THE NOTE IS EDITABLE HERE, IN THE SHEET (card 10). Sending the writer back to the edit
          form to fix prose before a move would lose the move they had already set up. */}
      {notices.staleNote && (
        <>
          <div className="cor-notice cor-notice--warn">{notices.staleNote}</div>
          <label className="cor-fl" htmlFor="cor-mvnote">Note · travels with the event</label>
          <textarea
            id="cor-mvnote"
            className="cor-ta"
            rows={2}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </>
      )}

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
