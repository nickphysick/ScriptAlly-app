/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v21 — the page's three dialogs (design-refs/manuscripts/manuscripts-v21.html, screens
 * 07–09): Edit details, a book version (new, or renamed), and Add your manuscript.
 *
 * EDIT DETAILS is not here any more: v28 moved it to the slide-in drawer (manuscripts/v28/MsEditDrawer).
 *
 * A BOOK VERSION is appended through lib/bookVersions (`newBookVersionId`, `appendBookVersion`) and
 * edited through `renameBookVersion` — name and note, the only edit the model permits. A new one may
 * carry a word count (`BookVersion.wordCount`, optional); an edit cannot change it.
 *
 * ADD YOUR MANUSCRIPT writes through `addManuscript`, the existing writer, with the first version
 * (kind `initial`) in the same document — one write, so a book never exists without it.
 *
 * ⚠️ ALL THREE PORTAL TO `document.body`. `useOverlay` seals the page by setting `inert` on `#root`;
 * a dialog rendered inside the page would be sealed with it. Their sheet (msv21.css) reads only
 * `:root` tokens, so nothing is lost by leaving the page's scope.
 */
import { DEFAULT_AGE } from "../../../lib/ageCategories";
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteField, type FieldValue } from "firebase/firestore";
import { useOverlay } from "../../shell/useOverlay";
import { useToast } from "../../toast/ToastProvider";
import { appendBookVersion, bookVersionsOf, newBookVersionId, renameBookVersion } from "../../../lib/bookVersions";
import { PREDEFINED_GENRES, buildManuscriptPayload } from "../../../lib/manuscripts";
import { londonDay } from "../../../lib/queryingGoals";
import { ManuscriptStatus } from "../../../types";
import type { BookVersion, Manuscript } from "../../../types";

/** Out of `#root`, onto the body — inline only where there is no document (a static render). */
const toBody = (node: React.ReactElement): React.ReactNode =>
  typeof document === "undefined" ? node : createPortal(node, document.body);

/**
 * One of the two optional facts as it belongs in the edit's payload — or null when it did not
 * change, so an untouched fact never rides a write at all.
 *
 * ⚠️ A CLEARED FACT IS REMOVED, NEVER WRITTEN EMPTY. `deleteField()` omits the key, and it is the
 * only option that works here: this app's Firestore rejects `undefined` outright.
 */
export const factPatch = (next: string, prev: string | undefined): string | FieldValue | null => {
  const t = next.trim();
  if (t === (prev ?? "").trim()) return null;
  return t ? t : deleteField();
};

/** A typed count as a whole number, or null when the field holds none. */
export const parseWords = (raw: string): number | null => {
  const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const Shell: React.FC<{
  label: string; title: string; sub: string; probe: string; onClose: () => void;
  onSubmit: () => void; saveLabel: string; busy: boolean; children: React.ReactNode;
}> = ({ label, title, sub, probe, onClose, onSubmit, saveLabel, busy, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onClose, captureEscape: true, scrimClasses: ["ms21-scrim"], onScrimClick: onClose,
  });
  return toBody(
    <div className="msv12-own msv12-layer ms21-layer" onKeyDown={trapTab} onClick={scrimClick}>
      <div className="ms21-scrim">
        <div className="ms21-modal" role="dialog" aria-modal="true" aria-label={label} data-ms21={probe} ref={rootRef} tabIndex={-1}>
          <div className="ms21-mh"><h3>{title}</h3><p>{sub}</p></div>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div className="ms21-form">{children}</div>
            <div className="ms21-mf">
              <button type="button" className="ms21-mc" onClick={onClose}>Cancel</button>
              <button type="submit" className="ms21-ms" data-ms21="save" disabled={busy}>{saveLabel}</button>
            </div>
          </form>
        </div>
      </div>
    </div>,
  );
};

/* ══ edit details ═════════════════════════════════════════════════════════════════════════════ */

/* Manuscripts v28 Part A: Edit details moved to the slide-in drawer (v28/MsEditDrawer); the centred modal is deleted. */

/* ══ a book version — new, or renamed ═════════════════════════════════════════════════════════ */

export const Msv21Version: React.FC<{
  ms: Manuscript;
  /** the version to rename and re-note; null adds a new one */
  editing: BookVersion | null;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  onClose: () => void;
}> = ({ ms, editing, updateManuscript, onClose }) => {
  const { showToast } = useToast();
  const existing = bookVersionsOf(ms);
  const [name, setName] = useState(editing?.name ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [words, setWords] = useState("");
  const [missing, setMissing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) { setMissing(true); nameRef.current?.focus(); return; }
    setBusy(true);
    setErr(null);
    const count = parseWords(words);
    const next = editing
      ? renameBookVersion(existing, editing.id, trimmed, note)
      : appendBookVersion(existing, {
          id: newBookVersionId(), name: trimmed, kind: existing.length === 0 ? "initial" : "revision",
          /* the London calendar day — a UTC date is the previous day after midnight in summer time */
          createdDate: londonDay(new Date()),
          ...(note.trim() ? { note: note.trim() } : {}),
          /* absent when none was given: a version with no count shows no words line, never "0 words" */
          ...(count !== null ? { wordCount: count } : {}),
        });
    try {
      await updateManuscript(ms.id, { bookVersions: next });
    } catch {
      setErr("That didn’t save. Nothing was recorded.");
      setBusy(false);
      return;
    }
    showToast({ message: editing ? `Saved ${trimmed}.` : `Saved ${trimmed} and made it current.` });
    onClose();
  };

  return (
    <Shell
      label={editing ? "Edit version" : "New version"} title={editing ? "Edit version" : "New version"}
      sub={editing ? "Its name and what changed. When it was saved stays as it is." : "A new edit or ordering of the book. It becomes your current version."}
      probe="version-dialog" onClose={onClose} onSubmit={() => void save()} saveLabel="Save version" busy={busy}
    >
      <div className="ms21-fld ms21-fld--w">
        <label htmlFor="ms21-v-name">Name</label>
        <input
          id="ms21-v-name" ref={nameRef} placeholder="e.g. Tighter midpoint" value={name}
          aria-required="true" aria-invalid={missing || undefined} aria-describedby={missing ? "ms21-v-name-err" : undefined}
          onChange={(e) => { setName(e.target.value); if (missing) setMissing(false); }}
        />
        {missing ? <span className="ms21-ferr" id="ms21-v-name-err">Add a name to save it.</span> : null}
      </div>
      <div className="ms21-fld ms21-fld--w">
        <label htmlFor="ms21-v-note">What changed</label>
        <textarea id="ms21-v-note" placeholder="A line for future you." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {editing ? null : (
        <div className="ms21-fld">
          <label htmlFor="ms21-v-words">Word count</label>
          <input
            id="ms21-v-words" inputMode="numeric" value={words}
            placeholder={ms.wordCount > 0 ? String(ms.wordCount) : undefined}
            onChange={(e) => setWords(e.target.value)}
          />
        </div>
      )}
      {err ? <div className="ms21-derr" role="alert">{err}</div> : null}
    </Shell>
  );
};

/* ══ add your manuscript ══════════════════════════════════════════════════════════════════════ */

type AddManuscript = (
  m: Omit<Manuscript, "id" | "userId" | "statusChangedDate"> & { id?: string },
) => Promise<{ success: boolean; error?: string; id?: string }>;

export const Msv21AddManuscript: React.FC<{
  addManuscript: AddManuscript;
  onClose: () => void;
}> = ({ addManuscript, onClose }) => {
  const { showToast } = useToast();
  const [d, setD] = useState({ title: "", genre: PREDEFINED_GENRES[0] ?? "", words: "", logline: "", version: "First draft" });
  const [missing, setMissing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (busy) return;
    const title = d.title.trim();
    if (!title) { setMissing(true); titleRef.current?.focus(); return; }
    setBusy(true);
    setErr(null);
    const count = parseWords(d.words);
    const first: BookVersion = {
      id: newBookVersionId(), name: d.version.trim() || "First draft", kind: "initial",
      createdDate: londonDay(new Date()),
      ...(count !== null ? { wordCount: count } : {}),
    };
    const payload = {
      ...buildManuscriptPayload({
        title, genre: d.genre, ageCategory: DEFAULT_AGE /* v28 Part E: Adult by default */, wordCount: count ?? 0, logline: d.logline,
        status: ManuscriptStatus.DRAFTING,
      }),
      bookVersions: appendBookVersion([], first),
    };
    let result: Awaited<ReturnType<AddManuscript>>;
    try {
      result = await addManuscript(payload);
    } catch {
      result = { success: false };
    }
    if (!result.success) {
      setErr(result.error || "That didn’t save. Nothing was recorded.");
      setBusy(false);
      return;
    }
    showToast({ message: `${title} added.` });
    onClose();
  };

  return (
    <Shell
      label="Add your manuscript" title="Add your manuscript" sub="Just the basics for now. You can add the rest later."
      probe="add-dialog" onClose={onClose} onSubmit={() => void save()} saveLabel="Add manuscript" busy={busy}
    >
      <div className="ms21-fld ms21-fld--w">
        <label htmlFor="ms21-a-title">Title</label>
        <input
          id="ms21-a-title" ref={titleRef} placeholder="e.g. Murphy's Day Out" value={d.title}
          aria-required="true" aria-invalid={missing || undefined} aria-describedby={missing ? "ms21-a-title-err" : undefined}
          onChange={(e) => { setD({ ...d, title: e.target.value }); if (missing) setMissing(false); }}
        />
        {missing ? <span className="ms21-ferr" id="ms21-a-title-err">Add a title to save it.</span> : null}
      </div>
      <div className="ms21-fld">
        <label htmlFor="ms21-a-genre">Genre</label>
        <select id="ms21-a-genre" value={d.genre} onChange={(e) => setD({ ...d, genre: e.target.value })}>
          {PREDEFINED_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="ms21-fld">
        <label htmlFor="ms21-a-words">Word count</label>
        <input id="ms21-a-words" inputMode="numeric" placeholder="e.g. 85000" value={d.words} onChange={(e) => setD({ ...d, words: e.target.value })} />
      </div>
      <div className="ms21-fld ms21-fld--w">
        <label htmlFor="ms21-a-logline">Logline</label>
        <textarea id="ms21-a-logline" placeholder="One or two sentences about the book." value={d.logline} onChange={(e) => setD({ ...d, logline: e.target.value })} />
      </div>
      <div className="ms21-fld ms21-fld--w">
        <label htmlFor="ms21-a-version">Name this first version</label>
        <input id="ms21-a-version" value={d.version} onChange={(e) => setD({ ...d, version: e.target.value })} />
        <span className="ms21-hint">You’ll be able to save new versions as the book changes.</span>
      </div>
      {err ? <div className="ms21-derr" role="alert">{err}</div> : null}
    </Shell>
  );
};
