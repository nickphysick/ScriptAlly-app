/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CORKBOARD ON A PHONE (Phone app v2, Part 5C; ref design-refs/phone-app-v2/src/todov.js `screenTodo2` at CBV A,
 * app.css `.note`, `.nopin`, `.grid2`). `/todo/corkboard` (old address /todo/noteboard) below 768px (NoteboardRoute chooses).
 *
 * ⚠️ THE ORDER IS THE NOTEBOARD'S OWN — `orderNotes(sortNotes(userTasks), prefs.order)`, the same call
 * TodoNoteboardPage makes — and the model and writes are unchanged: an edit opens the Part 4 note flow (the
 * noteboard's own `updateUserTask`), a delete is the noteboard's receipt-and-restore (`noteReceipt` →
 * `deleteUserTask`, Undo → `restoreUserTask`, the document written back verbatim).
 *
 * The tilt is stable per note: derived from its id, never random per render (the ref's −2° to +2°).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { formatDate } from "../../../lib/dates";
import { linkifyBody, noteColour, noteReceipt, noteboardPrefs, orderNotes, sortNotes } from "../../../lib/noteboard";
import { showUndoBar } from "../../../lib/queryActions/drawerStore";
import { openPhoneCompose } from "../../../lib/phoneCompose";
import { usePhoneBandSlot } from "../../phone/phoneBandStore";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import type { UserTask } from "../../../types";
import "./todoPhone.css";

/** a note's tilt in degrees, from its id: the same id is the same tilt on every render and every device */
export function noteTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.round(((Math.abs(h) % 401) / 100 - 2) * 10) / 10; // −2.0 … +2.0
}
/** the writer's three papers (todoNoteboard.css --nb-yellow, --pink, --nb-sage) */
const PAPER: Record<string, string> = { yellow: "#fbf3d9", pink: "#f5e2da", sage: "#e9ede6" };
const dateOf = (n: UserTask) => { const t = Date.parse(n.createdAt ?? ""); return Number.isFinite(t) ? formatDate(new Date(t), { day: "numeric", month: "short" }) : ""; };

export const CorkPhone: React.FC = () => {
  const { userTasks, currentUser, deleteUserTask, restoreUserTask } = useScriptAllyDb();
  const navigate = useNavigate();
  const notes = useMemo(() => orderNotes(sortNotes(userTasks), noteboardPrefs(currentUser).order), [userTasks, currentUser]);
  const [open, setOpen] = useState<UserTask | null>(null);

  usePhoneBandSlot("/todo/corkboard", (
    <div className="pa-bstats pa-cbband" data-pa="cork-band"><span><b className="pa-num" data-pa="notes-n">{notes.length}</b> {notes.length === 1 ? "note pinned" : "notes pinned"}</span></div>
  ), [notes.length]);

  const remove = async (n: UserTask) => {
    const receipt = noteReceipt(n);
    setOpen(null);
    await deleteUserTask(n.id);
    showUndoBar({ message: `Removed — “${n.text}”`, sub: "", undo: async () => { await restoreUserTask(receipt); } });
  };

  return (
    <div className="pa-td pa-cork" data-pa="cork">
      <div className="pa-tdbody">
        <div className="pa-seg" role="tablist" aria-label="To-do">
          <button type="button" role="tab" aria-pressed="false" aria-selected="false" data-pa="seg-tasks" onClick={() => navigate("/todo")}>Tasks</button>
          <button type="button" role="tab" aria-pressed="true" aria-selected="true" data-pa="seg-cork">Corkboard</button>
        </div>
        <p className="pa-lede">Notes to yourself. Pin anything you want to remember about agents, materials or your book.</p>
        <div className="pa-grid2" data-pa="notes">
          {notes.map((n) => (
            <button type="button" key={n.id} className="pa-note" data-pa="note" data-id={n.id} data-tilt={noteTilt(n.id)}
              style={{ background: PAPER[noteColour(n)] ?? PAPER.yellow, transform: `rotate(${noteTilt(n.id)}deg)` }} onClick={() => setOpen(n)}>
              <span className="pa-notetx">{n.text}</span>
              <small>{dateOf(n)}</small>
            </button>
          ))}
          <button type="button" className="pa-note nopin" data-pa="add-note" onClick={() => openPhoneCompose("note")}>{PI.plus}<span>Add a note</span></button>
        </div>
      </div>

      <MobileSheet open={!!open} onClose={() => setOpen(null)} ariaLabel="Note" pa={{ height: "auto", white: true, className: "pa-notesheet" }}>
        {open ? (
          <div className="pa-noteread" data-pa="note-sheet">
            <div className="pa-noteread-tx">{linkifyBody(open.text ?? "")}</div>
            <small>{dateOf(open)}</small>
            <div className="pa-noteacts">
              <button type="button" className="pa-btn" data-pa="note-edit" onClick={() => { const n = open; setOpen(null); openPhoneCompose("note", { id: n.id, text: n.text ?? "" }); }}>{PI.edit}Edit</button>
              <button type="button" className="pa-notedel" data-pa="note-delete" onClick={() => void remove(open)}>Delete</button>
            </div>
          </div>
        ) : null}
      </MobileSheet>
    </div>
  );
};
