/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 Part A — EDIT DETAILS IS THE SLIDE-IN DRAWER (design-refs/manuscripts-v28/manuscripts-v28.html).
 *
 * It is the shared `HalfDrawer` (shell): the right-hand drawer the Contact list's Housekeeping and the Comparable titles
 * drawer use. The page supplies the head (a title-page disc, the book's title, "The book's details. Edit anything; save
 * once."), five numbered sections, and the foot ("Querying since …", Cancel, Save details). Every way in opens it:
 * the header's Edit details, the book view's Edit details and "Add one", the logline strip's "Add one", and the guide.
 *
 * ⚠️ ONE MANUSCRIPT WRITE. Save sends one `updateManuscript`; Cancel, Escape and the dim discard. Optional text fields
 *    are omitted when cleared (`deleteField()`), never stored as "".
 * ⚠️ OPEN-ON-FIELD (v27 Part C) survives: `focus` scrolls its section to the middle of the drawer's body and focuses the
 *    field with the caret at the end. The sections keep v27's `data-ms21-sect` markers, which the guide's spotlight reads.
 */
import React, { useEffect, useRef, useState } from "react";
import { deleteField, type FieldValue } from "firebase/firestore";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { useToast } from "../../toast/ToastProvider";
import { AGE_CATEGORIES, PREDEFINED_GENRES } from "../../../lib/manuscripts";
import { STATUS_ORDER, STATUS_WORDS } from "../../../lib/manuscriptV21";
import { sinceDay } from "../../../lib/manuscriptV27";
import { ManuscriptStatus } from "../../../types";
import type { Manuscript } from "../../../types";
import "./msv28.css";

/** The sections the drawer can open on (the guide's four steps, and the book view's "Add one"). */
export type EditField = "basics" | "logline" | "elevatorPitch" | "synopsis";

export const DRAWER_SUB = "The book’s details. Edit anything; save once.";
export const PITCH_PLACEHOLDER = "e.g. A ferry skipper races the tide to bring his brother home.";
export const PITCH_HINT = "Keep it on the tip of your tongue. You never know when the right person might ask what your book’s all about.";
export const SYNOPSIS_HINT = "The whole story in brief, ending included.";
export const LOGLINE_HINT = "One or two sentences.";

/** A text field as it belongs in the payload: null when unchanged; `deleteField()` when cleared. */
export const textPatch = (next: string, prev: string | undefined): string | FieldValue | null => {
  const t = next.trim();
  if (t === (prev ?? "").trim()) return null;
  return t ? t : deleteField();
};
/** A typed count as a whole number, or null when the field holds none. */
export const wordsOf = (raw: string): number | null => {
  const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const withStored = (list: readonly string[], stored: string | undefined): string[] =>
  !stored || list.includes(stored) ? [...list] : [...list, stored];

/**
 * Open on a field: the section is scrolled to the middle of the drawer's body and the field takes focus, caret at the
 * end. Waits a frame for the slide-in's first layout.
 */
const useOpenOn = (bodyRef: React.RefObject<HTMLDivElement | null>, field: EditField | undefined) => {
  useEffect(() => {
    if (!field) return undefined;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const body = bodyRef.current;
        const sect = body?.querySelector<HTMLElement>(`[data-ms21-sect="${field}"]`);
        if (!body || !sect) return;
        const r = sect.getBoundingClientRect(), v = body.getBoundingClientRect();
        body.scrollTop += (r.top + r.height / 2) - (v.top + v.height / 2);
        const el = sect.querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input");
        if (el) {
          el.focus({ preventScroll: true });
          const n = el.value.length;
          try { el.setSelectionRange(n, n); } catch { /* a field with no caret */ }
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [bodyRef, field]);
};

const X = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>
);

const Sect: React.FC<{ n: number; id: string; title: React.ReactNode; tag?: string; optional?: boolean; children: React.ReactNode }> = ({ n, id, title, tag, optional, children }) => (
  <section className="ms28-sect" data-ms21-sect={id} data-ms28="sect">
    <h4><span className="ms28-n" aria-hidden="true">{n}</span><span className="ms28-sh" data-ms28="sect-title">{title}</span>{tag ? <span className="ms28-h4s" data-ms28="tag">{tag}</span> : null}{optional ? <em>optional</em> : null}</h4>
    {children}
  </section>
);

export const MsEditDrawer: React.FC<{
  ms: Manuscript;
  since: string | null;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  onClose: () => void;
  /** a save landed (the guide ends its spotlight) */
  onSaved?: () => void;
  focus?: EditField;
}> = ({ ms, since, updateManuscript, onClose, onSaved, focus }) => {
  const { showToast } = useToast();
  const bodyRef = useRef<HTMLDivElement>(null);
  useOpenOn(bodyRef, focus);
  const [d, setD] = useState({
    title: ms.title, genre: ms.genre, ageCategory: ms.ageCategory,
    wordCount: ms.wordCount > 0 ? ms.wordCount.toLocaleString("en-GB") : "", logline: ms.logline ?? "",
    elevatorPitch: ms.elevatorPitch ?? "", synopsis: ms.synopsis ?? "",
    setting: ms.setting ?? "", series: ms.series ?? "",
    status: ms.status, shelvedReason: ms.shelvedReason ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const genres = withStored(PREDEFINED_GENRES, ms.genre);
  const ages = withStored(AGE_CATEGORIES, ms.ageCategory);

  const save = async () => {
    if (busy) return;
    if (!d.title.trim()) { setErr("A manuscript needs a title."); return; }
    setBusy(true);
    setErr(null);
    const patches = {
      setting: textPatch(d.setting, ms.setting), series: textPatch(d.series, ms.series),
      elevatorPitch: textPatch(d.elevatorPitch, ms.elevatorPitch), synopsis: textPatch(d.synopsis, ms.synopsis),
    };
    const payload: Record<string, unknown> = {
      title: d.title.trim(), genre: d.genre.trim(), ageCategory: d.ageCategory.trim(),
      wordCount: wordsOf(d.wordCount) ?? 0, logline: d.logline, status: d.status, shelvedReason: d.shelvedReason,
    };
    for (const [k, v] of Object.entries(patches)) if (v !== null) payload[k] = v;
    try {
      await updateManuscript(ms.id, payload as Partial<Manuscript>);
    } catch {
      setErr("That didn’t save. Nothing was recorded.");
      setBusy(false);
      return;
    }
    showToast({ message: "Saved the book’s details." });
    onSaved?.();
    onClose();
  };
  const day = sinceDay(since);

  return (
    <HalfDrawer
      probe="ms-edit" open onClose={onClose} label={`Edit details: ${ms.title}`} width="min(640px, 54vw)" bodyRef={bodyRef}
      head={(
        <div className="ms28-dh" data-ms28="drawer-head">
          <span className="ms28-disc" aria-hidden="true"><i>{ms.title}</i></span>
          <div className="ms28-tx"><h3 className="ms28-dt">{ms.title}</h3><small>{DRAWER_SUB}</small></div>
          <button type="button" className="ms28-x" aria-label="Close" data-ms28="drawer-close" onClick={onClose}><X /></button>
        </div>
      )}
      foot={(
        <div className="ms28-df" data-ms28="drawer-foot">
          <span>{day ? `Querying since ${day}.` : "Not querying yet."}</span>
          {err ? <span className="ms28-err" role="alert">{err}</span> : null}
          <span className="ms28-bt">
            <button type="button" className="ms28-b g" data-ms21="cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="ms28-b p" data-ms21="save" disabled={busy} onClick={() => void save()}>Save details</button>
          </span>
        </div>
      )}
    >
      <div className="ms28-db" data-ms21="edit-dialog" data-ms28="drawer-body">
        <Sect n={1} id="basics" title="The book">
          <label className="ms28-fld"><span>Title <i className="ms28-req">*</i></span>
            <input id="ms21-f-title" className="big" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
          <label className="ms28-fld"><span>Genre</span>
            <select id="ms21-f-genre" value={d.genre} onChange={(e) => setD({ ...d, genre: e.target.value })}>
              {!d.genre ? <option value="">Choose one</option> : null}
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select></label>
          <div className="ms28-frow">
            <label className="ms28-fld"><span>Word count</span>
              <input id="ms21-f-words" inputMode="numeric" value={d.wordCount} onChange={(e) => setD({ ...d, wordCount: e.target.value })} /></label>
          </div>
          <label className="ms28-fld"><span>Age category</span>
            <select id="ms21-f-age" value={d.ageCategory} onChange={(e) => setD({ ...d, ageCategory: e.target.value })}>
              {!d.ageCategory ? <option value="">Choose one</option> : null}
              {ages.map((a) => <option key={a} value={a}>{a}</option>)}
            </select></label>
          <div className="ms28-fld"><span id="ms21-f-status">Where it stands</span>
            <div className="ms28-type" role="radiogroup" aria-labelledby="ms21-f-status" data-ms21="status-seg">
              {STATUS_ORDER.map((s) => (
                <button type="button" role="radio" key={s} aria-checked={d.status === s} onClick={() => setD({ ...d, status: s })}>{STATUS_WORDS[s]}</button>
              ))}
            </div>
          </div>
          {d.status === ManuscriptStatus.SHELVED ? (
            <label className="ms28-fld"><span>Shelved reason</span>
              <input id="ms21-f-shelved" value={d.shelvedReason} onChange={(e) => setD({ ...d, shelvedReason: e.target.value })} /></label>
          ) : null}
        </Sect>
        <Sect n={2} id="logline" title="Logline">
          <label className="ms28-fld">
            <textarea id="ms21-f-logline" rows={3} aria-label="Logline" value={d.logline} onChange={(e) => setD({ ...d, logline: e.target.value })} />
            <p className="ms28-hint" data-ms21="logline-hint">{LOGLINE_HINT}</p></label>
        </Sect>
        <Sect n={3} id="elevatorPitch" title="Elevator pitch" optional>
          <label className="ms28-fld">
            <textarea id="ms21-f-pitch" rows={3} aria-label="Elevator pitch" data-ms21="pitch" placeholder={PITCH_PLACEHOLDER} value={d.elevatorPitch} onChange={(e) => setD({ ...d, elevatorPitch: e.target.value })} />
            <p className="ms28-hint" data-ms21="pitch-hint">{PITCH_HINT}</p></label>
        </Sect>
        <Sect n={4} id="synopsis" title="Synopsis" optional>
          <label className="ms28-fld">
            <textarea id="ms21-f-synopsis" rows={5} aria-label="Synopsis" data-ms21="synopsis" value={d.synopsis} onChange={(e) => setD({ ...d, synopsis: e.target.value })} />
            <p className="ms28-hint" data-ms21="synopsis-hint">{SYNOPSIS_HINT}</p></label>
        </Sect>
        <Sect n={5} id="more" title="Setting and series" optional>
          <div className="ms28-frow ms28-frow--2">
            <label className="ms28-fld"><span>Setting</span><input id="ms21-f-setting" value={d.setting} onChange={(e) => setD({ ...d, setting: e.target.value })} /></label>
            <label className="ms28-fld"><span>Series</span><input id="ms21-f-series" placeholder="Standalone" value={d.series} onChange={(e) => setD({ ...d, series: e.target.value })} /></label>
          </div>
        </Sect>
      </div>
    </HalfDrawer>
  );
};
