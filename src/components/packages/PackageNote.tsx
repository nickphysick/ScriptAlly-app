/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The package's note — click to read, click to edit, Cancel or Escape to abandon (D26).
 * Reference: `design-refs/package-notes.html`, `.notebox` / `.np` / `.notefoot`.
 */
import React, { useEffect, useRef, useState } from "react";
import { NOTE_PLACEHOLDER, NOTE_NEVER } from "../../lib/packageDrawer";
import "./packageNote.css";

export interface PackageNoteProps {
  note: string | null;
  editedAt: string | null;
  onSave: (text: string) => Promise<string | null>;
}

const stamp = (iso: string | null): string => {
  if (!iso) return NOTE_NEVER;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? NOTE_NEVER
    : `Edited ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
};

export const PackageNote: React.FC<PackageNoteProps> = ({ note, editedAt, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  /**
   * ⚠️ THE DRAFT RESETS FROM THE STORED NOTE EVERY TIME EDITING OPENS, not on mount. A draft kept
   * across a cancel would put the abandoned text back the next time the writer clicked in — which
   * is the opposite of what Cancel means.
   */
  useEffect(() => {
    if (!editing) return;
    setDraft(note ?? "");
    setError(null);
    ta.current?.focus();
  }, [editing, note]);

  const cancel = () => { setEditing(false); setError(null); };

  if (!editing) {
    return (
      <div className="pkgn-box">
        {/* ⚠️ A `div` WITH A ROLE, NOT A `button`, because the content is multi-line prose and a
            button collapses whitespace. Enter and Space still reach it, so the keyboard route is
            the same one the mouse takes. */}
        <div
          className={`pkgn-read${note ? "" : " pkgn-read--empty"}`}
          role="button" tabIndex={0}
          aria-label={note ? "Edit this note" : "Add a note"}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } }}
        >
          {/* ⚠️ THE PLACEHOLDER IS THE QUESTIONS, NOT "Add a note" (D28) — a prompt naming the
              action gets an empty box and a writer wondering what belongs in it. */}
          {note ?? NOTE_PLACEHOLDER}
        </div>
        <div className="pkgn-foot">
          <span className="pkgn-m">{note ? stamp(editedAt) : ""}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pkgn-box">
      <textarea
        ref={ta} className="pkgn-ta" rows={4} maxLength={2000}
        placeholder={NOTE_PLACEHOLDER}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        /* ⚠️ ESCAPE ABANDONS, and it is stopped here so it never reaches the drawer's own close —
           a key that closed the whole drawer would discard the note AND the surface it sits on. */
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); cancel(); } }}
      />
      <div className="pkgn-foot">
        {/* ⚠️ THE FAILURE IS SHOWN, NOT SWALLOWED. `updatePackage` returns a reason; dropping it
            would close the editor on a write that never happened. */}
        <span className={`pkgn-m${error ? " pkgn-m--err" : ""}`}>{error ?? stamp(editedAt)}</span>
        <span className="pkgn-sp">
          <button type="button" className="pkgn-btn" onClick={cancel}>Cancel</button>
          <button
            type="button" className="pkgn-btn pkgn-btn--primary" disabled={saving}
            onClick={async () => {
              setSaving(true);
              const err = await onSave(draft);
              setSaving(false);
              if (err) { setError(err); return; }
              setEditing(false);
            }}
          >{saving ? "Saving…" : "Save"}</button>
        </span>
      </div>
    </div>
  );
};
