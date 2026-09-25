/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v12 — the page's two small dialogs.
 *
 * EDIT DETAILS is the existing edit-details flow's field set (title · genre · age category · word
 * count · logline · status · shelved reason), now including logline prominently plus the two new
 * facts, setting and series. It writes through `updateManuscript`, the same single writer the
 * locked AllManuscripts editor used — the FLOW is reused at the write path, because the old
 * dialog's JSX lives inside a locked file and cannot be imported.
 *
 * ⚠️ SETTING AND SERIES RIDE A SECOND WRITE, DELIBERATELY. The Firestore update allowlist does not
 * carry either key yet (the rules line is drafted for Nick in the run report), and `hasOnly` fails
 * the WHOLE write on one unlisted changed key — so folding them into the base payload would make
 * every title edit fail while the window lasts. The base write always succeeds; the second write
 * carries only the two new keys, only when they changed, and a denial is REPORTED in the dialog
 * rather than swallowed (a silent denial is the affectedKeys trap this repo documents).
 *
 * NEW VERSION appends a `BookVersion` through lib/bookVersions' own writers (`newBookVersionId`,
 * `appendBookVersion`) — the module that owns the shape — via the same `updateManuscript`.
 *
 * Both dialogs sit on `useOverlay` (trap, focus return, Escape, scrim, inert, scroll lock) — the
 * app's one overlay implementation, never a second.
 */
import React, { useRef, useState } from "react";
import { useOverlay } from "../../shell/useOverlay";
import { appendBookVersion, bookVersionsOf, newBookVersionId, BOOK_VERSION_KINDS, KIND_LABEL } from "../../../lib/bookVersions";
import { ManuscriptStatus } from "../../../types";
import type { BookVersionKind, Manuscript } from "../../../types";

export interface EditDetailsProps {
  ms: Manuscript;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  onClose: () => void;
}

const STATUSES: ManuscriptStatus[] = Object.values(ManuscriptStatus);

export const Msv12EditDetails: React.FC<EditDetailsProps> = ({ ms, updateManuscript, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onClose, captureEscape: true, scrimClasses: ["msv12-scrim"], onScrimClick: onClose,
  });
  const [d, setD] = useState({
    title: ms.title, genre: ms.genre, ageCategory: ms.ageCategory,
    wordCount: String(ms.wordCount ?? ""), logline: ms.logline ?? "",
    setting: ms.setting ?? "", series: ms.series ?? "",
    status: ms.status, shelvedReason: ms.shelvedReason ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!d.title.trim()) { setErr("A manuscript needs a title."); return; }
    setBusy(true);
    setErr(null);
    try {
      await updateManuscript(ms.id, {
        title: d.title.trim(), genre: d.genre.trim(), ageCategory: d.ageCategory.trim(),
        wordCount: Math.max(0, parseInt(d.wordCount.replace(/[^0-9]/g, ""), 10) || 0),
        logline: d.logline, status: d.status, shelvedReason: d.shelvedReason,
      });
    } catch {
      setErr("That didn’t save. Nothing was recorded.");
      setBusy(false);
      return;
    }
    /* the two new facts, alone — see the header. Only when changed, so an untouched dialog
       performs one write, not two. */
    const settingChanged = (d.setting.trim() || undefined) !== (ms.setting ?? undefined);
    const seriesChanged = (d.series.trim() || undefined) !== (ms.series ?? undefined);
    if (settingChanged || seriesChanged) {
      try {
        await updateManuscript(ms.id, {
          ...(settingChanged ? { setting: d.setting.trim() || undefined } : {}),
          ...(seriesChanged ? { series: d.series.trim() || undefined } : {}),
        } as Partial<Manuscript>);
      } catch {
        setErr("Everything saved except Setting and Series — recording those needs a rules deploy that hasn’t landed yet.");
        setBusy(false);
        return;
      }
    }
    onClose();
  };

  return (
    <div className="msv12-own" onKeyDown={trapTab} onClick={scrimClick}>
      <div className="msv12-scrim">
        <div
          className="msv12-dlg" role="dialog" aria-modal="true" aria-label="Edit details"
          data-msv12="edit-dialog" ref={rootRef} tabIndex={-1}
        >
          <div className="msv12-dhead">
            <h3>Edit details</h3>
            <p>The facts the hero states. Materials and comps have their own sections.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-f-title">Title</label>
              <input id="msv12-f-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-genre">Genre</label>
              <input id="msv12-f-genre" value={d.genre} onChange={(e) => setD({ ...d, genre: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-age">Age category</label>
              <input id="msv12-f-age" value={d.ageCategory} onChange={(e) => setD({ ...d, ageCategory: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-words">Word count</label>
              <input id="msv12-f-words" inputMode="numeric" value={d.wordCount} onChange={(e) => setD({ ...d, wordCount: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-status">Status</label>
              <select id="msv12-f-status" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as ManuscriptStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-f-logline">Logline</label>
              <textarea id="msv12-f-logline" value={d.logline} onChange={(e) => setD({ ...d, logline: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-setting">Setting</label>
              <input id="msv12-f-setting" placeholder="e.g. West Cork, today" value={d.setting} onChange={(e) => setD({ ...d, setting: e.target.value })} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-f-series">Series</label>
              <input id="msv12-f-series" placeholder="Standalone unless it isn’t" value={d.series} onChange={(e) => setD({ ...d, series: e.target.value })} />
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
              <button type="submit" className="msv12-btn msv12-btn--dark" disabled={busy}>Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ══ new book version ═════════════════════════════════════════════════════════════════════════ */

export const Msv12NewVersion: React.FC<{
  ms: Manuscript;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  onClose: () => void;
}> = ({ ms, updateManuscript, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onClose, captureEscape: true, scrimClasses: ["msv12-scrim"], onScrimClick: onClose,
  });
  const existing = bookVersionsOf(ms);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<BookVersionKind>(existing.length === 0 ? "initial" : "revision");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!name.trim()) { setErr("Name the version for the edit it represents."); return; }
    setBusy(true);
    const trimmed = note.trim();
    const entry = {
      id: newBookVersionId(), name: name.trim(), kind,
      createdDate: new Date().toISOString().slice(0, 10),
      ...(trimmed ? { note: trimmed } : {}),
    };
    try {
      await updateManuscript(ms.id, { bookVersions: appendBookVersion(existing, entry) });
      onClose();
    } catch {
      setErr("That didn’t save. Nothing was recorded.");
      setBusy(false);
    }
  };

  return (
    <div className="msv12-own" onKeyDown={trapTab} onClick={scrimClick}>
      <div className="msv12-scrim">
        <div
          className="msv12-dlg" role="dialog" aria-modal="true" aria-label="New version"
          data-msv12="new-version-dialog" ref={rootRef} tabIndex={-1}
        >
          <div className="msv12-dhead">
            <h3>New version</h3>
            <p>Name it for the edit it represents — partials and fulls are cut from a version.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-v-name">Name</label>
              <input id="msv12-v-name" placeholder="e.g. Fast-paced opening" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="msv12-fld">
              <label htmlFor="msv12-v-kind">Kind</label>
              <select id="msv12-v-kind" value={kind} onChange={(e) => setKind(e.target.value as BookVersionKind)}>
                {BOOK_VERSION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </div>
            <div className="msv12-fld msv12-fld--w">
              <label htmlFor="msv12-v-note">What changed</label>
              <textarea id="msv12-v-note" placeholder="e.g. Cut the prologue; opens on the ferry." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {err ? <div className="msv12-derr" role="alert">{err}</div> : null}
            <div className="msv12-dfoot">
              <button type="button" className="msv12-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="msv12-btn msv12-btn--dark" disabled={busy}>Add version</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
