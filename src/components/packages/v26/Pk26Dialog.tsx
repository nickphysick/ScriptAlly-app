/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — New package and Package details: one dialog (ref `#pdlg`, `pkDlg`) with a Harbour
 * header. Name (required), who it's for (optional), an icon from twelve, and for a new package "Start from": empty,
 * or a copy of the active package. Opened from the pencil or the icon tile it renames and re-icons a package and
 * offers "Delete package" — refused, with the reason, for one that has gone out with queries. Enter submits.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PACKAGE_ICONS, type PackageIcon, type SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { Pic, PicBare } from "./icons";
import type { Pk26Model } from "./usePk26Model";

/** `version`: a new package opened from Versions' "Add to a package" starts with that version as its pages. */
/** `focus: "note"` opens Package details with "Who it's for" focused (the header bar's "+ Add a note", v26.1). */
/** `copyOf` (v38): the package drawer's "Make a copy" opens New package with "a copy of {name}" chosen. */
export type DialogView = { m: "new"; version?: string; copyOf?: string } | { m: "edit"; id: string; focus?: "note" };

export const Pk26Dialog: React.FC<{ model: Pk26Model; view: DialogView | null; onClose: () => void; onCreated: (id: string) => void }> = ({ model, view, onClose, onCreated }) => {
  useEscapeLayer(!!view, onClose, ESC_LEVEL.pageModal);
  if (!view) return null;
  const p = view.m === "edit" ? model.msPkgs.find((x) => x.id === view.id) ?? null : null;
  return createPortal(
    <div className="p6-layer">
      <div className="p6-pdlg" data-pk26="dialog" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <Body key={view.m === "edit" ? view.id : `new-${view.copyOf ?? ""}`} model={model} p={p} version={view.m === "new" ? view.version : undefined} copyOf={view.m === "new" ? view.copyOf : undefined} focusNote={view.m === "edit" && view.focus === "note"} onClose={onClose} onCreated={onCreated} />
      </div>
    </div>,
    document.body,
  );
};

const Body: React.FC<{ model: Pk26Model; p: SubmissionPackage | null; version?: string; copyOf?: string; focusNote?: boolean; onClose: () => void; onCreated: (id: string) => void }> = ({ model, p, version, copyOf, focusNote, onClose, onCreated }) => {
  const [name, setName] = useState(p?.packageName ?? "");
  const [note, setNote] = useState(p?.note ?? "");
  const [ic, setIc] = useState<PackageIcon>(p ? iconOf(p) : "star");
  /* the copy offered: the package "Make a copy" came from, else the active one */
  const used = (copyOf ? model.msPkgs.find((x) => x.id === copyOf) : null) ?? model.active;
  const [from, setFrom] = useState<string>(copyOf && used?.id === copyOf ? copyOf : "empty");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const noteRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { const t = setTimeout(() => (focusNote ? noteRef : nameRef).current?.focus(), 30); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = async () => {
    if (busy) return;
    if (!name.trim()) { setErr(true); nameRef.current?.focus(); return; }
    setBusy(true);
    if (p) {
      const done = await model.saveDetails(p, { name, note, icon: ic });
      setBusy(false);
      if (done) onClose();
      return;
    }
    const known = version && model.versionRows.some((v) => v.id === version) ? version : null;
    const id = await model.createPackage({ name, note, icon: ic, from: from === "empty" ? null : from, ...(known ? { piece: { kind: "ver" as const, id: known } } : {}) });
    setBusy(false);
    if (id) { onCreated(id); onClose(); }
  };
  const del = async () => { if (!p) return; if (await model.deletePkg(p)) onClose(); };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void ok(); } };

  return (
    <div className="p6-pd" role="dialog" aria-modal="true" aria-labelledby="p6-pdT">
      <div className="p6-pd-h">
        <span className="p6-pd-prev"><Pic ic={ic} /></span>
        <div><p className="p6-pd-k">{p ? "Package details" : "New package"}</p><h3 className="p6-id-pdT" id="p6-pdT">{p ? p.packageName : "Name your package"}</h3></div>
        <button type="button" className="p6-pd-x" aria-label="Close" onClick={onClose}>✕</button>
      </div>
      <div className="p6-pd-b">
        <label className="p6-pd-f"><span>Name</span><input ref={nameRef} className={`p6-id-pdName${err ? " p6-err" : ""}`} value={name} placeholder="e.g. Standard UK, US agents, Agents who want 50 pages" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(false); }} onKeyDown={onEnter} /></label>
        <label className="p6-pd-f"><span>Who it’s for <em>optional</em></span><input ref={noteRef} className="p6-id-pdNote" value={note} placeholder="e.g. Agents who ask for a synopsis" autoComplete="off" onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} /></label>
        <div className="p6-pd-f"><span>Icon <em>so you can spot it in the Query Centre</em></span>
          <div className="p6-pd-ics" role="radiogroup" aria-label="Icon">
            {PACKAGE_ICONS.map((k) => <button type="button" key={k} role="radio" aria-checked={ic === k} aria-label={k} onClick={() => setIc(k)}><PicBare ic={k} /></button>)}
          </div>
        </div>
        {p ? null : (
          <div className="p6-pd-f"><span>Start from</span>
            <div className="p6-pd-from" role="radiogroup">
              <button type="button" role="radio" aria-checked={from === "empty"} onClick={() => setFrom("empty")}><b>Empty</b><small>Drag pieces in yourself</small></button>
              {used ? <button type="button" role="radio" aria-checked={from === used.id} onClick={() => setFrom(used.id)}><b>A copy of {used.packageName}</b><small>Same letter, synopsis and pages. Swap what’s different.</small></button> : null}
            </div>
          </div>
        )}
      </div>
      <div className="p6-pd-ft">
        {p ? <button type="button" className="p6-pd-del" onClick={() => void del()}>Delete package</button> : <span />}
        <div><button type="button" className="p6-cx-b p6-g" onClick={onClose}>Cancel</button><button type="button" className="p6-cx-b p6-p" disabled={busy} onClick={() => void ok()}>{p ? "Save" : "Create package"}</button></div>
      </div>
    </div>
  );
};
