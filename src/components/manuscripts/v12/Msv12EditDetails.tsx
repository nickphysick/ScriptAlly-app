/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v13 — the page's two small dialogs, to design-refs/manuscripts/manuscripts-v13.html.
 *
 * EDIT DETAILS carries the mock's nine fields in the mock's order — title · author name · word count
 * · genre · age category · logline · setting · series · status (segmented) — plus the shelved reason,
 * which the existing flow has always offered and which appears only while Shelved is chosen. No new
 * model field: every one already exists.
 *
 * ⚠️ ONE MANUSCRIPT WRITE. The base fields and the two facts land together or not at all through
 * `updateManuscript`, the single writer (the v12 ruling: the rules carry `setting`/`series` since
 * 19f8fba9, proven against the emulator in tests/rules). A fact rides the payload only when it
 * changed (`factPatch`).
 *
 * ⚠️ AUTHOR NAME IS THE ACCOUNT'S NAME. The model has no pen-name field (manuscriptSummary's
 * `bylineFor` says so), so the byline names `User.name` and this field writes it — through
 * `updateUserProfile`, the account's own writer, as a SECOND write to a different document. It goes
 * only when the name changed, after the manuscript's write has landed, and a failure says which
 * half did not save. Changing it here changes the name the whole app shows (run report).
 *
 * NEW VERSION appends a `BookVersion` through lib/bookVersions' own writers (`newBookVersionId`,
 * `appendBookVersion`), and EDITS one through `renameBookVersion` — name and note, the only edit the
 * model permits (no per-version panel exists to open instead). Its kind is not asked: the mock draws
 * no kind, so the first version is the initial one and every later one a revision.
 *
 * Both dialogs sit on `useOverlay` (trap, focus return, Escape, scrim, inert, scroll lock) — the
 * app's one overlay implementation, never a second.
 *
 * ⚠️ BOTH PORTAL TO `document.body`, AND THAT IS WHAT MAKES THEM USABLE AT ALL. `useOverlay` seals
 * the page by setting `inert` on `#root` and says in its own header that overlays portal out of it.
 * v12 rendered these two INSIDE the page, so opening either made the dialog inert along with
 * everything behind it — no field could be focused and no button pressed — from the day they
 * shipped (25 Sep) until v13. The portal leaves `.msv12-wpg`'s scope, so the host carries
 * `msv12-layer`, which declares the same `--msv12-*` tokens (msv12.css): a `var()` whose defining
 * scope is not an ancestor resolves to nothing, in silence.
 */
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteField, type FieldValue } from "firebase/firestore";
import { useOverlay } from "../../shell/useOverlay";
import { useToast } from "../../toast/ToastProvider";
import { appendBookVersion, bookVersionsOf, newBookVersionId, renameBookVersion } from "../../../lib/bookVersions";
import { AGE_CATEGORIES } from "../../../lib/manuscripts";
import { londonDay } from "../../../lib/queryingGoals";
import { ManuscriptStatus } from "../../../types";
import type { BookVersion, Manuscript, User } from "../../../types";

export interface EditDetailsProps {
  ms: Manuscript;
  /** the account's name — the byline's author */
  authorName: string;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  updateUserProfile: (fields: Partial<User>) => Promise<void>;
  onClose: () => void;
}

/** The mock's four segments, in its order and its words. */
const SEGMENTS: { value: ManuscriptStatus; label: string }[] = [
  { value: ManuscriptStatus.DRAFTING, label: "Drafting" },
  { value: ManuscriptStatus.QUERYING, label: "Querying" },
  { value: ManuscriptStatus.ON_SUBMISSION, label: "On submission" },
  { value: ManuscriptStatus.SHELVED, label: "Shelved" },
];
const STATUS_LABEL: Record<ManuscriptStatus, string> = {
  [ManuscriptStatus.DRAFTING]: "Drafting",
  [ManuscriptStatus.REVISING]: "Revising",
  [ManuscriptStatus.READY_TO_QUERY]: "Ready to query",
  [ManuscriptStatus.QUERYING]: "Querying",
  [ManuscriptStatus.SHELVED]: "Shelved",
  [ManuscriptStatus.ON_SUBMISSION]: "On submission",
};

/** Out of `#root`, onto the body — inline only where there is no document (a static render). */
const toBody = (node: React.ReactElement): React.ReactNode =>
  typeof document === "undefined" ? node : createPortal(node, document.body);

/**
 * One of the hero's two facts as it belongs in the edit's payload — or null when it did not
 * change, so an untouched fact never rides a write at all.
 *
 * ⚠️ A CLEARED FACT IS REMOVED, NEVER WRITTEN EMPTY. `deleteField()` omits the key (absent means
 * unwritten, the `elevatorPitch` convention), and it is the only option that works here: this
 * app's Firestore rejects `undefined` outright (no `ignoreUndefinedProperties`). The first cut sent
 * `undefined`, so every clear threw — and the dialog blamed the rules for it.
 */
export const factPatch = (next: string, prev: string | undefined): string | FieldValue | null => {
  const t = next.trim();
  if (t === (prev ?? "").trim()) return null;
  return t ? t : deleteField();
};

export const Msv12EditDetails: React.FC<EditDetailsProps> = ({ ms, authorName, updateManuscript, updateUserProfile, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onClose, captureEscape: true, scrimClasses: ["msv12-scrim"], onScrimClick: onClose,
  });
  const [d, setD] = useState({
    title: ms.title, author: authorName, genre: ms.genre, ageCategory: ms.ageCategory,
    wordCount: String(ms.wordCount ?? ""), logline: ms.logline ?? "",
    setting: ms.setting ?? "", series: ms.series ?? "",
    status: ms.status, shelvedReason: ms.shelvedReason ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* a stored age outside the list stays selectable, so opening and saving never changes it */
  const ages = AGE_CATEGORIES.includes(ms.ageCategory) || !ms.ageCategory ? AGE_CATEGORIES : [...AGE_CATEGORIES, ms.ageCategory];
  /* likewise a status outside the mock's four (Revising, Ready to query) keeps its own segment */
  const segments = SEGMENTS.some((s) => s.value === ms.status)
    ? SEGMENTS
    : [...SEGMENTS, { value: ms.status, label: STATUS_LABEL[ms.status] ?? ms.status }];

  const save = async () => {
    if (busy) return;
    if (!d.title.trim()) { setErr("A manuscript needs a title."); return; }
    if (!d.author.trim()) { setErr("Add the author name the byline shows."); return; }
    setBusy(true);
    setErr(null);
    const setting = factPatch(d.setting, ms.setting);
    const series = factPatch(d.series, ms.series);
    const payload: Record<string, unknown> = {
      title: d.title.trim(), genre: d.genre.trim(), ageCategory: d.ageCategory.trim(),
      wordCount: Math.max(0, parseInt(d.wordCount.replace(/[^0-9]/g, ""), 10) || 0),
      logline: d.logline, status: d.status, shelvedReason: d.shelvedReason,
      ...(setting !== null ? { setting } : {}),
      ...(series !== null ? { series } : {}),
    };
    try {
      await updateManuscript(ms.id, payload as Partial<Manuscript>);
    } catch {
      setErr("That didn’t save. Nothing was recorded.");
      setBusy(false);
      return;
    }
    if (d.author.trim() !== authorName.trim()) {
      try {
        await updateUserProfile({ name: d.author.trim() });
      } catch {
        setErr("The details saved; the author name didn’t.");
        setBusy(false);
        return;
      }
    }
    showToast({ message: "Details saved." });
    onClose();
  };

  return toBody(
    <div className="msv12-own msv12-layer" onKeyDown={trapTab} onClick={scrimClick}>
      <div className="msv12-scrim">
        <div
          className="msv12-dlg" role="dialog" aria-modal="true" aria-label="Edit details"
          data-msv12="edit-dialog" ref={rootRef} tabIndex={-1}
        >
          <div className="msv12-dhead">
            <h3>Edit details</h3>
            <p>What agents see first: the title, the pitch and the numbers.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-f-title">Title</label>
              <input id="msv12-f-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-author">Author name</label>
              <input id="msv12-f-author" value={d.author} onChange={(e) => setD({ ...d, author: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-words">Word count</label>
              <input id="msv12-f-words" inputMode="numeric" value={d.wordCount} onChange={(e) => setD({ ...d, wordCount: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-genre">Genre</label>
              <input id="msv12-f-genre" value={d.genre} onChange={(e) => setD({ ...d, genre: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-age">Age category</label>
              <select id="msv12-f-age" value={d.ageCategory} onChange={(e) => setD({ ...d, ageCategory: e.target.value })}>
                {!d.ageCategory ? <option value="">Choose one</option> : null}
                {ages.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-f-logline">Logline</label>
              <textarea id="msv12-f-logline" value={d.logline} onChange={(e) => setD({ ...d, logline: e.target.value })} />
              <span className="msv12-hint">One or two sentences. It leads the page and the query line.</span>
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-setting">Setting</label>
              <input id="msv12-f-setting" placeholder="e.g. West Cork, today" value={d.setting} onChange={(e) => setD({ ...d, setting: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-series">Series</label>
              <input id="msv12-f-series" placeholder="Standalone" value={d.series} onChange={(e) => setD({ ...d, series: e.target.value })} />
            </div>
            <div className="msv12-fld msv12-fld--w">
              <span className="msv12-fl" id="msv12-f-status">Status</span>
              <div className="msv12-seg" role="group" aria-labelledby="msv12-f-status">
                {segments.map((s) => (
                  <button
                    type="button" key={s.value} aria-pressed={d.status === s.value}
                    className={d.status === s.value ? "msv12-on" : undefined}
                    onClick={() => setD({ ...d, status: s.value })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {d.status === ManuscriptStatus.SHELVED ? (
              <div className="msv12-fld msv12-fld--w">
                <label htmlFor="msv12-f-shelved">Shelved reason</label>
                <input id="msv12-f-shelved" value={d.shelvedReason} onChange={(e) => setD({ ...d, shelvedReason: e.target.value })} />
              </div>
            ) : null}
            {err ? <div className="msv12-derr" role="alert">{err}</div> : null}
            <div className="msv12-dfoot">
              <button type="button" className="msv12-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="msv12-btn msv12-btn--dark" disabled={busy}>Save details</button>
            </div>
          </form>
        </div>
      </div>
    </div>,
  );
};

/* ══ a book version — new, or renamed ═════════════════════════════════════════════════════════ */

export const Msv12NewVersion: React.FC<{
  ms: Manuscript;
  /** the version to rename and re-note; null adds a new one */
  editing: BookVersion | null;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  onClose: () => void;
}> = ({ ms, editing, updateManuscript, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onClose, captureEscape: true, scrimClasses: ["msv12-scrim"], onScrimClick: onClose,
  });
  const existing = bookVersionsOf(ms);
  const [name, setName] = useState(editing?.name ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
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
    const next = editing
      ? renameBookVersion(existing, editing.id, trimmed, note)
      : appendBookVersion(existing, {
          id: newBookVersionId(), name: trimmed, kind: existing.length === 0 ? "initial" : "revision",
          /* the London calendar day, as the type states — a UTC date is the previous day after
             midnight in British Summer Time */
          createdDate: londonDay(new Date()),
          ...(note.trim() ? { note: note.trim() } : {}),
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

  return toBody(
    <div className="msv12-own msv12-layer" onKeyDown={trapTab} onClick={scrimClick}>
      <div className="msv12-scrim">
        <div
          className="msv12-dlg" role="dialog" aria-modal="true" aria-label={editing ? "Edit version" : "New version"}
          data-msv12="new-version-dialog" ref={rootRef} tabIndex={-1}
        >
          <div className="msv12-dhead">
            <h3>{editing ? "Edit version" : "New version"}</h3>
            <p>{editing ? "Its name and what changed. When it was saved stays as it is." : "A new ordering or edit of the book. It becomes the current version."}</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-v-name">Name <span className="msv12-req" aria-hidden="true">*</span></label>
              <input
                id="msv12-v-name" ref={nameRef} placeholder="e.g. Tighter midpoint" value={name}
                aria-required="true" aria-invalid={missing || undefined} aria-describedby={missing ? "msv12-v-name-err" : undefined}
                onChange={(e) => { setName(e.target.value); if (missing) setMissing(false); }}
              />
              {missing ? <span className="msv12-ferr" id="msv12-v-name-err">Add a name to save it.</span> : null}
            </div>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-v-note">What changed</label>
              <textarea id="msv12-v-note" placeholder="A line for future you." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {err ? <div className="msv12-derr" role="alert">{err}</div> : null}
            <div className="msv12-dfoot">
              <button type="button" className="msv12-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="msv12-btn msv12-btn--dark" disabled={busy}>Save version</button>
            </div>
          </form>
        </div>
      </div>
    </div>,
  );
};
