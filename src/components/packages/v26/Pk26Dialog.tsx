/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — New package and Package details. v39.1 Part H: they open in the app's slide-out drawer (the
 * package drawer's frame: `p6-layer` > `p6-cx-drw`, ref `#drw`), not a centred dialog. v41 F: the header is the
 * Archivist on cream. v42 E: the words are lib/packagesV42's, and there is no colour field. The form is the ref's
 * (`pa-`, pk391.generated.css). Every handler, write and validation is v39's; only the container changed. Name (required), who it's for (optional), an icon from twelve, (v42: no colour; v39's eight are retired from the form), and for a new package "Start from": empty,
 * or a copy of the active package. Opened from the pencil or the icon tile it renames and re-icons a package and
 * offers "Delete package" — refused, with the reason, for one that has gone out with queries. Enter submits.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PACKAGE_ICONS, type PackageIcon, type SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { pcStyle } from "../../../lib/packagesV39";
import { EDIT_SUB, editTitle, ICON_HINT, NEW_SUB, NEW_TITLE } from "../../../lib/packagesV42";
import { PicBare } from "./icons";
import type { Pk26Model } from "./usePk26Model";

/** `version`: a new package opened from Versions' "Add to a package" starts with that version as its pages. */
/** `focus: "note"` opens Package details with "Who it's for" focused (the header bar's "+ Add a note", v26.1). */
/** `copyOf` (v38): the package drawer's "Make a copy" opens New package with "a copy of {name}" chosen. */
/** v41: the drawer header's art, the page's Archivist (public/images/packages/packages-hawk-standing.png) */
export const DRAWER_ART = "/images/packages/packages-hawk-standing.png";

export type DialogView = { m: "new"; version?: string; copyOf?: string } | { m: "edit"; id: string; focus?: "note" };

export const Pk26Dialog: React.FC<{ model: Pk26Model; view: DialogView | null; onClose: () => void; onCreated: (id: string) => void }> = ({ model, view, onClose, onCreated }) => {
  useEscapeLayer(!!view, onClose, ESC_LEVEL.pageModal);
  const [shown, setShown] = useState(false);
  useEffect(() => { if (!view) { setShown(false); return; } const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, [!!view]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!view) return null;
  const p = view.m === "edit" ? model.msPkgs.find((x) => x.id === view.id) ?? null : null;
  return createPortal(
    <div className="p6-layer" data-pk391="pd-layer">
      <div className={`p6-cx-dim${shown ? " p6-on" : ""}`} onClick={onClose} />
      <Body key={view.m === "edit" ? view.id : `new-${view.copyOf ?? ""}`} shown={shown} model={model} p={p} version={view.m === "new" ? view.version : undefined} copyOf={view.m === "new" ? view.copyOf : undefined} focusNote={view.m === "edit" && view.focus === "note"} onClose={onClose} onCreated={onCreated} />
    </div>,
    document.body,
  );
};

const Body: React.FC<{ shown: boolean; model: Pk26Model; p: SubmissionPackage | null; version?: string; copyOf?: string; focusNote?: boolean; onClose: () => void; onCreated: (id: string) => void }> = ({ shown, model, p, version, copyOf, focusNote, onClose, onCreated }) => {
  const [name, setName] = useState(p?.packageName ?? "");
  const [note, setNote] = useState(p?.note ?? "");
  const [ic, setIc] = useState<PackageIcon>(p ? iconOf(p) : "star");
  /* v42 A/E: no colour field. Package colours are not shown anywhere; an edit leaves a stored colour as it is, and a new
     package is written without one (absent reads as Harbour, and nothing paints it). */
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
    <aside className={`p6-cx-drw${shown ? " p6-on" : ""}`} role="dialog" aria-modal="true" aria-labelledby="p6-pdT" data-pk26="dialog" data-pk391="pd">
      {/* v41 Part F: the drawer header option A — the Archivist on cream, one line under the title (ref `.k4-dh`) */}
      <div className="p41-dh" data-pk391="pd-head" data-pk41="drawer-head">
        <img className="p41-dh-art" src={DRAWER_ART} alt="" aria-hidden="true" />
        <div className="p41-dh-tx"><h3 className="p6-id-pdT p41-dh-h" id="p6-pdT">{p ? editTitle(p.packageName) : NEW_TITLE}</h3>
          <small data-pk42="drawer-sub">{p ? EDIT_SUB : NEW_SUB}</small></div>
        <button type="button" className="p41-dh-x" aria-label="Close" onClick={onClose}>✕</button>
      </div>
      <div className="pa-db pa-pd-b" style={pcStyle(p)}>
        <label className="pa-pd-f"><span>Name</span><input ref={nameRef} className={`pa-id-pdName p6-id-pdName${err ? " p6-err" : ""}`} value={name} placeholder="e.g. Standard UK, US agents, Agents who want 50 pages" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(false); }} onKeyDown={onEnter} /></label>
        <label className="pa-pd-f"><span>Who it’s for <em>optional</em></span><input ref={noteRef} className="pa-id-pdNote p6-id-pdNote" value={note} placeholder="e.g. Agents who ask for a synopsis" autoComplete="off" onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} /></label>
        <div className="pa-pd-f"><span>Icon</span>
          <small className="p42-hint" data-pk42="icon-hint">{ICON_HINT}</small>
          <div className="pa-pd-ics" role="radiogroup" aria-label="Icon" data-pk391="pd-ics">
            {PACKAGE_ICONS.map((k) => <button type="button" key={k} role="radio" aria-checked={ic === k} aria-label={k} onClick={() => setIc(k)}><PicBare ic={k} /></button>)}
          </div>
        </div>
        {p ? null : (
          <div className="pa-pd-f"><span>Start from</span>
            <div className="pa-pd-from p6-pd-from" role="radiogroup">
              <button type="button" role="radio" aria-checked={from === "empty"} onClick={() => setFrom("empty")}><b>Empty</b><small>Pick each piece yourself</small></button>
              {used ? <button type="button" role="radio" aria-checked={from === used.id} onClick={() => setFrom(used.id)}><b>A copy of {used.packageName}</b><small>Same letter, synopsis and pages. Swap what’s different.</small></button> : null}
            </div>
          </div>
        )}
      </div>
      <div className="p8-df">
        {p ? <button type="button" className="pa-pd-del" data-pk391="pd-del" onClick={() => void del()}>Delete package</button> : <span />}
        <div className="p8-bt"><button type="button" className="p8-cx-b p8-g" onClick={onClose}>Cancel</button><button type="button" className="p8-cx-b p8-p" disabled={busy} data-pk391="pd-ok" onClick={() => void ok()}>{p ? "Save" : "Create package"}</button></div>
      </div>
    </aside>
  );
};
