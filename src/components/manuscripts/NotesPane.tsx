/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Notes ══════════════════════════════════════════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-notes`.
 *
 * ⚠️ THE GHOST CARD IS WHAT MAKES A NOTE BELONG TO A BOOK — it writes `UserTask.manuscriptId`,
 * which until now only the Query Centre's `Remind me later` ever set, and that always sets a
 * `dueDate` too, so what it makes is a TASK. This is the first writer of that field on a NOTE.
 *
 * ⚠️ ONE STORE, NOT A SECOND ONE. These are `UserTask` documents, the same collection the Noteboard
 * reads and the same one the To-do list reads. A manuscript-notes subcollection existed once and was
 * RETIRED — the rules default-deny it — and building a second store here would recreate exactly the
 * split that retirement closed.
 *
 * ⚠️ AND A NOTE IS DATELESS BY DERIVATION. `dueDate` present makes it a task, which belongs on the
 * To-do list where it surfaces on its day. Showing it here too would give one item two homes that
 * disagree the moment it is ticked in one of them.
 */
import React, { useState } from "react";
import { SectionHeader } from "../containers/SectionHeader";
import { CappedCard } from "../containers/CappedCard";
import { noteDay } from "../../lib/manuscriptProfile";
import { UserTask } from "../../types";
import "./bookProfile.css";

export interface NotesPaneProps {
  notes: UserTask[];
  /** Writes a note against this manuscript. Absent → the pane reads without offering to write. */
  onWrite?: (text: string, detail: string) => void;
  /** Opens the Noteboard, where every note lives and where one is edited or ticked off. */
  onOpenNoteboard: () => void;
}

export const NotesPane: React.FC<NotesPaneProps> = ({ notes, onWrite, onOpenNoteboard }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const close = () => { setOpen(false); setTitle(""); setBody(""); };
  const save = () => {
    /* ⚠️ THE TITLE IS THE NOTE. `text` is required on a `UserTask` and `detail` is the optional
       second line, so a note with a body and no title would store its words in the optional field
       and leave the required one empty — which reads as an untitled blank everywhere else the
       collection is shown. The button is disabled until there is one. */
    if (!title.trim()) return;
    onWrite?.(title.trim(), body.trim());
    close();
  };

  return (
    <div className="msp-blk">
      <SectionHeader
        title="Notes"
        meta={`${notes.length} on this manuscript`}
        actions={
          <button type="button" className="msp-linkact" onClick={onOpenNoteboard}>
            Open Noteboard ›
          </button>
        }
      />

      <div className="msp-notegrid">
        {notes.map((n) => (
          <CappedCard key={n.id} tint="reference" label="Note" className="msp-paper">
            <div className="msp-ptitle">{n.text}</div>
            {/* An absent body renders nothing — never an empty line, never a placeholder. */}
            {n.detail && <div className="msp-ptext">{n.detail}</div>}
            {/* ⚠️ AND AN UNDATED NOTE STATES NO DATE rather than today's. */}
            {noteDay(n.createdAt) && <div className="msp-pdate">{noteDay(n.createdAt)}</div>}
          </CappedCard>
        ))}

        {/* ⚠️ THE GHOST IS RENDERED ONLY WHERE IT CAN ACTUALLY WRITE. Without a handler it would be
            a control that looks like an invitation and does nothing. */}
        {onWrite && !open && (
          <button type="button" className="msp-ghostcard" onClick={() => setOpen(true)}>
            <span className="msp-gicon" aria-hidden="true">✎</span>
            <span className="msp-gtitle">Write a note</span>
            <span className="msp-gsub">A thought about this book.</span>
          </button>
        )}

        {onWrite && open && (
          <div className="sa-card msp-composer">
            <div className="sa-cardbody">
              <input
                className="msp-cinput"
                value={title}
                autoFocus
                placeholder="What is it about?"
                aria-label="Note title"
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="msp-cbody"
                rows={4}
                value={body}
                placeholder="The thought itself. Optional."
                aria-label="Note"
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="msp-cacts">
                <button type="button" className="msv-btn sm" onClick={close}>Cancel</button>
                <button
                  type="button"
                  className="msv-btn sm msv-primary"
                  onClick={save}
                  disabled={!title.trim()}
                >
                  Save note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {notes.length === 0 && !onWrite && (
        <p className="msp-empty">No notes about this book yet.</p>
      )}
    </div>
  );
};
