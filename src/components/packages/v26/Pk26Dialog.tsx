/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — New package and Package details. v39.1 Part H: they open in the app's slide-out drawer (the
 * package drawer's frame: `p6-layer` > `p6-cx-dim` + `aside.p6-cx-drw`, ref `#drw`), not a centred dialog. The header is
 * the package's own colour and follows the chosen swatch live, before anything is saved. The form is the ref's
 * (`pa-`, pk391.generated.css). Every handler, write and validation is v39's; only the container changed. Name (required), who it's for (optional), an icon from twelve, a colour from eight (v39), and for a new package "Start from": empty,
 * or a copy of the active package. Opened from the pencil or the icon tile it renames and re-icons a package and
 * offers "Delete package" — refused, with the reason, for one that has gone out with queries. Enter submits.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PACKAGE_ICONS, type PackageColour, type PackageIcon, type SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { colourOf, firstFreeColour, PACKAGE_COLOURS, pcStyle } from "../../../lib/packagesV39";
import { Pic, PicBare } from "./icons";
import type { Pk26Model } from "./usePk26Model";

/** `version`: a new package opened from Versions' "Add to a package" starts with that version as its pages. */
/** `focus: "note"` opens Package details with "Who it's for" focused (the header bar's "+ Add a note", v26.1). */
/** `copyOf` (v38): the package drawer's "Make a copy" opens New package with "a copy of {name}" chosen. */
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
  /* v39 C: a new package starts on the first colour no live package uses (Harbour when all eight are taken) */
  const [col, setCol] = useState<PackageColour>(p ? colourOf(p) : firstFreeColour(model.msPkgs));
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
      const done = await model.saveDetails(p, { name, note, icon: ic, colour: col });
      setBusy(false);
      if (done) onClose();
      return;
    }
    const known = version && model.versionRows.some((v) => v.id === version) ? version : null;
    const id = await model.createPackage({ name, note, icon: ic, colour: col, from: from === "empty" ? null : from, ...(known ? { piece: { kind: "ver" as const, id: known } } : {}) });
    setBusy(false);
    if (id) { onCreated(id); onClose(); }
  };
  const del = async () => { if (!p) return; if (await model.deletePkg(p)) onClose(); };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void ok(); } };

  return (
    <aside className={`p6-cx-drw${shown ? " p6-on" : ""}`} role="dialog" aria-modal="true" aria-labelledby="p6-pdT" data-pk26="dialog" data-pk391="pd">
      <div className="p8-dh p8-dpk" style={pcStyle({ colour: col })} data-pk391="pd-head">
        <span className="p8-ddisc"><Pic ic={ic} cls="p8-pic" /></span>
        <div className="p8-tx"><h3 className="p6-id-pdT" id="p6-pdT">{p ? p.packageName : "New package"}</h3><small>{p ? "Package details" : "Name it, choose how it looks, then fill it in the builder."}</small></div>
        <button type="button" className="p8-cx-x" aria-label="Close" onClick={onClose}>✕</button>
      </div>
      <div className="pa-db pa-pd-b" style={pcStyle({ colour: col })}>
        <label className="pa-pd-f"><span>Name</span><input ref={nameRef} className={`pa-id-pdName p6-id-pdName${err ? " p6-err" : ""}`} value={name} placeholder="e.g. Standard UK, US agents, Agents who want 50 pages" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(false); }} onKeyDown={onEnter} /></label>
        <label className="pa-pd-f"><span>Who it’s for <em>optional</em></span><input ref={noteRef} className="pa-id-pdNote p6-id-pdNote" value={note} placeholder="e.g. Agents who ask for a synopsis" autoComplete="off" onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} /></label>
        <div className="pa-pd-f"><span>Icon <em>so you can spot it in the Query Centre</em></span>
          <div className="pa-pd-ics" role="radiogroup" aria-label="Icon" data-pk391="pd-ics">
            {PACKAGE_ICONS.map((k) => <button type="button" key={k} role="radio" aria-checked={ic === k} aria-label={k} onClick={() => setIc(k)}><PicBare ic={k} /></button>)}
          </div>
        </div>
        <div className="pa-pd-f"><span>Colour</span>
          <div className="pa-pd-cols" role="radiogroup" aria-label="Colour" data-pk39="dlg-cols">
            {PACKAGE_COLOURS.map((c) => <button type="button" key={c.key} role="radio" aria-checked={col === c.key} aria-label={c.name} title={c.name} data-col={c.key} style={{ ["--sw" as string]: c.hex }} onClick={() => setCol(c.key)} />)}
          </div>
        </div>
        {p ? null : (
          <div className="pa-pd-f"><span>Start from</span>
            <div className="pa-pd-from p6-pd-from" role="radiogroup">
              <button type="button" role="radio" aria-checked={from === "empty"} onClick={() => setFrom("empty")}><b>Empty</b><small>Drag pieces in yourself</small></button>
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
