/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MaterialModal — the create / edit dialog for a single material (query letter · synopsis · sample
 * pages), opened from every "add a new …" affordance (the rail ＋, the first-visit library cards, the
 * composer's "Add a new …", and the materials manager's sheets [edit] + ghost tiles [create]). Ported
 * from the mockup #modal: a scrim-backed 440px card with a type-tinted band (glyph tile + title + ✕),
 * a Title field, a disabled "Attach file — coming soon" row (no Storage in v1, per the scope fence),
 * and one textarea. Presentational only — the host (SubmissionPackages) owns persistence and decides
 * add vs update from whether it handed over a version to edit.
 *
 * Deliberate deviation from the mockup, flagged in the report: the mockup labels the textarea "Notes";
 * we wire it to contentDraft (the material's body text) and label it "The text", because contentDraft
 * is the ONLY content channel that exists (file-attach is "coming soon") and it is what drives every
 * preview (versionSnippet) — i.e. exactly the "add the text in the editor" the manager promises. The
 * separate `notes` field stays out of this dialog for now.
 *
 * All classes are scoped under .pkgmatm — generic names (.modal / .overlay / .f-input / .soon) must not
 * leak — and none is the bare .ti (that is Tabler Icons, whose global !important would mangle the text).
 */
import React, { useEffect, useState } from "react";
import { ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META } from "./typeMeta";
import { lockStageScroll } from "../../lib/stageScroll";
import { FONT_SERIF, FONT_MONO, FONT_SANS } from "../../lib/designTokens";

/** type → modal tint class (drives band + save-hover colour). */
const MOD_CLASS: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "m-letter",
  [ComponentType.SYNOPSIS]: "m-syn",
  [ComponentType.SAMPLE_PAGES]: "m-pages",
};
const NAME_PH: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "e.g. Comp-led rework",
  [ComponentType.SYNOPSIS]: "e.g. One-page synopsis",
  [ComponentType.SAMPLE_PAGES]: "e.g. Chapters 1–3",
};
const TEXT_PH: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "Paste your query letter here — the first line becomes its preview…",
  [ComponentType.SYNOPSIS]: "Paste your synopsis here — the first line becomes its preview…",
  [ComponentType.SAMPLE_PAGES]: "Paste your opening pages here — the first line becomes their preview…",
};

const clipIcon = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.5l-8.5 8.5a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8" /></svg>
);

export interface MaterialModalProps {
  /** Which material type this dialog creates/edits — drives the band tint, glyph, title and placeholders. */
  type: ComponentType;
  /** true = editing an existing material (title reads "Edit …", save reads "Save changes"). */
  editing: boolean;
  initialName: string;
  initialContent: string;
  onCancel: () => void;
  /** The host persists: create (addVersion) when !editing, else update (updateVersion). */
  onSave: (name: string, content: string) => void;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({ type, editing, initialName, initialContent, onCancel, onSave }) => {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);
  const m = TYPE_META[type];
  const canSave = name.trim().length > 0; // versionName is required (rules: size >= 1); content is optional.

  // Lock the stage scroll while open (convention — src/lib/stageScroll.ts); released on unmount.
  useEffect(() => lockStageScroll(), []);
  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const save = () => { if (canSave) onSave(name.trim(), content); };

  return (
    // onMouseDown (not onClick) so a text selection that drifts onto the backdrop can't close-and-lose edits.
    <div className="pkgmatm" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "New"} ${m.label.toLowerCase()}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <style>{`
        .pkgmatm { position:fixed; inset:0; background:rgba(36,28,21,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .pkgmatm .modal { width:440px; max-width:100%; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:14px; overflow:hidden; box-shadow:0 18px 50px rgba(36,28,21,.3); position:relative; }
        .t-capp .pkgmatm .modal::after { content:''; position:absolute; inset:6px; border:1px solid var(--burg); pointer-events:none; border-radius:8px; }
        .pkgmatm .modal-band { padding:16px 20px; display:flex; align-items:center; gap:11px; }
        .pkgmatm .modal.m-letter .modal-band { background:var(--tl); }
        .pkgmatm .modal.m-syn .modal-band { background:var(--ts); }
        .pkgmatm .modal.m-pages .modal-band { background:var(--tp); }
        .pkgmatm .mb-ic { width:32px; height:32px; border-radius:9px; background:rgba(255,254,251,.65); color:var(--ink); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgmatm .modal-band h3 { font-family:${FONT_SERIF}; font-size:19px; font-weight:700; color:var(--ink); }
        .pkgmatm .modal-x { background:none; border:0; font-size:17px; color:var(--muted); cursor:pointer; position:relative; z-index:2; margin-left:auto; line-height:1; }
        .pkgmatm .modal-x:hover { color:var(--burg); }
        .pkgmatm .modal-body { padding:20px; position:relative; z-index:1; }
        .pkgmatm .f-lab { font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
        .pkgmatm .f-input, .pkgmatm .f-area { width:100%; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:9px; padding:11px 13px; font-family:${FONT_SANS}; font-size:13.5px; color:var(--ink); outline:none; margin-bottom:14px; }
        .pkgmatm .f-input:focus, .pkgmatm .f-area:focus { border-color:var(--burg); }
        .pkgmatm .f-area { min-height:120px; resize:vertical; font-family:${FONT_SERIF}; font-size:14.5px; line-height:1.55; }
        .pkgmatm .f-input::placeholder, .pkgmatm .f-area::placeholder { color:#c4b5a5; font-style:italic; }
        .pkgmatm .attach-row { display:flex; align-items:center; gap:9px; border:1.5px dashed #cbb9a6; border-radius:9px; padding:11px 13px; font-size:12.5px; color:var(--muted); margin-bottom:14px; opacity:.75; cursor:not-allowed; font-family:${FONT_SANS}; }
        .pkgmatm .attach-row svg { flex-shrink:0; }
        .pkgmatm .soon { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.08em; text-transform:uppercase; background:#ece0c9; color:#9a7d4e; border:1px solid #e0d0b2; border-radius:5px; padding:2px 7px; margin-left:6px; }
        .pkgmatm .modal-foot { display:flex; justify-content:flex-end; align-items:center; gap:10px; padding:0 20px 20px; position:relative; z-index:1; }
        .pkgmatm .m-cancel { font-size:12.5px; background:none; border:0; color:var(--muted); cursor:pointer; padding:10px 8px; font-family:${FONT_SANS}; }
        .pkgmatm .m-cancel:hover { color:var(--burg); }
        .pkgmatm .m-save { font-family:${FONT_SERIF}; font-size:15px; font-weight:600; color:var(--ink); background:var(--card); border:var(--bdw) solid var(--bd); border-radius:10px; padding:10px 20px; cursor:pointer; }
        /* New-capp only: Save material joins the white/taupe/mocha treatment (hover stays type-tinted). */
        .t-capp .pkgmatm .m-save { color:var(--btnT); border-color:var(--btnBd); }
        .pkgmatm .modal.m-letter .m-save:hover:not(:disabled) { background:var(--tl); }
        .pkgmatm .modal.m-syn .m-save:hover:not(:disabled) { background:var(--ts); }
        .pkgmatm .modal.m-pages .m-save:hover:not(:disabled) { background:var(--tp); }
        .pkgmatm .m-save:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>

      <div className={`modal ${MOD_CLASS[type]}`}>
        <div className="modal-band">
          <span className="mb-ic"><TypeGlyph type={type} size={16} /></span>
          <h3>{editing ? "Edit" : "New"} {m.label.toLowerCase()}</h3>
          <button type="button" className="modal-x" aria-label="Close" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <div className="f-lab">Title</div>
          <input className="f-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={NAME_PH[type]} aria-label="Material title" autoFocus />

          <div className="f-lab">Attach file</div>
          <div className="attach-row" aria-disabled="true" title="File attachments are coming soon">{clipIcon}Attach file <span className="soon">Coming soon</span></div>

          <div className="f-lab">The text</div>
          <textarea className="f-area" value={content} onChange={(e) => setContent(e.target.value)} placeholder={TEXT_PH[type]} aria-label="Material text" />
        </div>

        <div className="modal-foot">
          <button type="button" className="m-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="m-save" disabled={!canSave} title={!canSave ? "Give the material a title first" : undefined} onClick={save}>{editing ? "Save changes" : "Save material"}</button>
        </div>
      </div>
    </div>
  );
};
