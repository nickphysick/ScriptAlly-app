/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The material modal — add a covering letter, synopsis or sample; reopen one to edit it.
 * Design authority: design-refs/submission-packages-flow.html.
 *
 * ⚠️ IT PERSISTS NOTHING ITSELF. Every write goes out through the host's `addVersion` /
 * `updateVersion` — the primitives the Workshop editor has always used (R2). This component owns the
 * DRAFT and the chassis; `lib/materialDraft.ts` owns what a draft becomes; the host owns the write.
 * That split is why the payload decisions are unit-locked rather than buried in a submit handler.
 *
 * ⚠️ TWO STEPS ON ADD, ONE ON EDIT. Adding starts at the type tiles because the type determines the
 * name ladder and the content sub-line; editing opens straight to the form, because the type of an
 * existing material is not a thing you change — a synopsis that became a letter is a different
 * material, and silently converting one would leave every package that references it pointing at
 * the wrong kind of thing.
 */
import React, { useEffect, useRef, useState } from "react";
import { ComponentType, ManuscriptVersion } from "../../types";
import {
  MatMode, CONTENT_SUB, modeOf, suggestName, sourceLabel, typeTiles,
} from "../../lib/materialDraft";
import { TYPE_META } from "./typeMeta";
import "./packagesFlow.css";

/** The ref's three line-art glyphs, one per type. */
const TYPE_ART: Record<string, React.ReactNode> = {
  [ComponentType.QUERY_LETTER]: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 8l9 6 9-6" />
    </svg>
  ),
  [ComponentType.SYNOPSIS]: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z" /><path d="M9 9h7M9 13h7M9 17h5" />
    </svg>
  ),
  [ComponentType.SAMPLE_PAGES]: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
      <path d="M5 4h8l4 4v12H5z" /><path d="M13 4v4h4" /><path d="M8 12h8M8 16h6" />
    </svg>
  ),
};

export interface MaterialDraftResult {
  type: ComponentType;
  name: string;
  mode: MatMode;
  text: string;
  refName: string;
}

export interface MaterialModalProps {
  /** The material being edited, or null to add a new one. */
  editing: ManuscriptVersion | null;
  /** Every material on the manuscript — for held counts and the name ladder. */
  versions: ManuscriptVersion[];
  /** Skip the type step and open the form on this type (the register's per-type entry). */
  preselect?: ComponentType | null;
  onClose: () => void;
  onSave: (draft: MaterialDraftResult) => void;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  editing, versions, preselect = null, onClose, onSave,
}) => {
  /**
   * ⚠️ SEEDED IN THE `useState` INITIALISERS, NOT AN EFFECT — and driving the real page is what
   * caught why. With an effect, the first render of an EDIT still had `type === null`, so the modal
   * painted its type-picker grid for a frame before the effect replaced it: clicking a material to
   * edit it flashed "what kind of thing is this?" at you. The measurement caught it as
   * `onTypeStep: true` on a modal whose title already read "Edit material".
   *
   * The host mounts this component only while open and gives it a `key`, so every opening is a fresh
   * mount and these initialisers run exactly once per opening — which is also what makes reopening a
   * DIFFERENT material impossible to get wrong, the bug the effect version was written to avoid.
   */
  const [type, setType] = useState<ComponentType | null>(
    editing ? editing.componentType : preselect,
  );
  const [name, setName] = useState(
    editing ? editing.versionName : preselect ? suggestName(preselect, versions) : "",
  );
  const [mode, setMode] = useState<MatMode>(editing ? modeOf(editing) : "paste");
  const [text, setText] = useState(editing?.contentDraft ?? "");
  const [refName, setRefName] = useState(editing?.fileName ?? editing?.contentLink ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  /* Select the suggested name on open so it can be typed straight over (the ref's behaviour). */
  useEffect(() => {
    if (type !== null && !editing) setTimeout(() => nameRef.current?.select(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ⚠️ ESCAPE CLOSES, AND IT IS NOT CAPTURED. This is a modal over a page that owns no Escape
     handling of its own, so a plain bubbling listener is enough; capturing would reach past other
     surfaces' business, which is the mistake the shell's quick-action popover documents. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function startType(t: ComponentType) {
    setType(t);
    setName(suggestName(t, versions));
    setMode("paste");
    setText("");
    setRefName("");
    /* the ref selects the suggestion so it can be typed straight over */
    setTimeout(() => nameRef.current?.select(), 50);
  }

  const onForm = type !== null;
  const title = editing ? "Edit material" : "Add a material";

  return (
    <div
      className="pkgf-backdrop"
      /* click the scrim, not the card */
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="pkgf-modal">
        <div className="pkgf-frame">
          <div className="pkgf-band">
            <span className="pkgf-title">{title}</span>
            <button type="button" className="pkgf-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="pkgf-body">
            {!onForm ? (
              <>
                <div className="pkgf-typegrid">
                  {typeTiles(versions).map((t) => (
                    <button key={t.type} type="button" className="pkgf-typetile" onClick={() => startType(t.type)}>
                      {TYPE_ART[t.type]}
                      <span className="pkgf-tname">{t.label}</span>
                      <span className="pkgf-tcount">{t.held} held</span>
                    </button>
                  ))}
                </div>
                <div className="pkgf-hint">
                  Pick what you're adding. You can keep as many versions of each as you like.
                </div>
              </>
            ) : (
              <>
                {/* ⚠️ ONLY WHEN ADDING. On edit there is no type step to go back to — see the header. */}
                {!editing && (
                  <button type="button" className="pkgf-crumb" onClick={() => setType(null)}>‹ Change type</button>
                )}

                <div className="pkgf-fld">
                  <label htmlFor="pkgf-mat-name">Name this {TYPE_META[type].label.toLowerCase()}</label>
                  <input
                    id="pkgf-mat-name" ref={nameRef} type="text" autoComplete="off"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                  <div className="pkgf-sub">A short handle you'll recognise in a list — not the document's title.</div>
                </div>

                <div className="pkgf-fld">
                  <label>Content</label>
                  <div className="pkgf-seg" role="group" aria-label="Content mode">
                    <button type="button" className={mode === "paste" ? "on" : ""} onClick={() => setMode("paste")}>
                      PASTE TEXT
                    </button>
                    {/* ⚠️ VISIBLE AND DISABLED (D2) — there is no Firebase Storage in this app; see F-A.
                        Hiding it would say attaching was never intended; greyed with SOON says not yet. */}
                    <button type="button" disabled title="Attaching a file needs file storage — not built yet">
                      ATTACH FILE<span className="pkgf-soon">SOON</span>
                    </button>
                    <button type="button" className={mode === "ref" ? "on" : ""} onClick={() => setMode("ref")}>
                      NAME ONLY
                    </button>
                  </div>

                  {mode === "paste" ? (
                    <>
                      <textarea
                        aria-label="Material text" placeholder="Write it here, or paste it in."
                        value={text} onChange={(e) => setText(e.target.value)}
                      />
                      <div className="pkgf-sub">{CONTENT_SUB[type]}</div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text" aria-label="File name" autoComplete="off"
                        placeholder="e.g. Hook-first v3.docx"
                        value={refName} onChange={(e) => setRefName(e.target.value)}
                      />
                      <div className="pkgf-sub">Just the file name, for your own reference — nothing is uploaded.</div>
                    </>
                  )}
                </div>

                <div className="pkgf-actions">
                  <button type="button" className="pkgf-btn" onClick={onClose}>Cancel</button>
                  <button
                    type="button" className="pkgf-btn pkgf-btn--primary"
                    onClick={() => onSave({ type, name, mode, text, refName })}
                  >
                    {editing ? "Save changes" : "Save material"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Re-exported so the register and the modal cannot disagree about a material's one-line source. */
export { sourceLabel };
