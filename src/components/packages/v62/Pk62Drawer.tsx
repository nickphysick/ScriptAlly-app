/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.9 — New package and Edit package, in the app's slide-out drawer. The fields are the ones
 * the page has always had: the name, "Who is it for?" (the package's note) and its icon.
 *   New    "Name it, then pick its pieces on the page."             · Create package
 *   Edit   "Rename it, or change its icon or its note."             · Save
 * Edit also offers, at its foot:
 *   - never sent:                    "Delete this package"
 *   - sent:                          "You can't delete this package because agents have received it."
 *   - sent, not retired, not in use: "Retire this package" (Retire had no place in the ref; it is the page's only way)
 * The drawer traps focus, closes on Escape, the scrim or ✕, and gives focus back to the button that opened it.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PACKAGE_ICONS, type PackageIcon, type SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { useOverlay } from "../../shell/useOverlay";
import { PicBare } from "../v26/icons";
import type { PkInfo } from "./usePk62";

export type DrawerView = { m: "new" } | { m: "edit"; id: string };

const Body: React.FC<{
  p: SubmissionPackage | null;
  i: PkInfo | null;
  onClose: () => void;
  onCreate: (d: { name: string; note: string; icon: PackageIcon }) => Promise<boolean>;
  onSave: (p: SubmissionPackage, d: { name: string; note: string; icon: PackageIcon }) => Promise<boolean>;
  onDelete: (p: SubmissionPackage) => Promise<boolean>;
  onRetire: (p: SubmissionPackage) => Promise<boolean>;
}> = ({ p, i, onClose, onCreate, onSave, onDelete, onRetire }) => {
  const [name, setName] = useState(p?.packageName ?? "");
  const [note, setNote] = useState(p?.note ?? "");
  const [ic, setIc] = useState<PackageIcon>(p ? iconOf(p) : "box");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["k62-dim"], onScrimClick: onClose });
  useEscapeLayer(true, onClose, ESC_LEVEL.pageModal);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const ok = async () => {
    if (busy) return;
    if (!name.trim()) { setErr(true); nameRef.current?.focus(); return; }
    setBusy(true);
    const done = p ? await onSave(p, { name, note, icon: ic }) : await onCreate({ name, note, icon: ic });
    setBusy(false);
    if (done) onClose();
  };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void ok(); } };
  const onIconKey = (e: React.KeyboardEvent) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const n = PACKAGE_ICONS.indexOf(ic);
    const next = PACKAGE_ICONS[(n + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + PACKAGE_ICONS.length) % PACKAGE_ICONS.length];
    setIc(next);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-pk62-icon="${next}"]`)?.focus());
  };
  const canRetire = !!p && !!i && i.sent && !i.retired && !i.inUse;

  return (
    <div className="k62-dim k62-layer" ref={rootRef} tabIndex={-1} onClick={scrimClick} onKeyDown={trapTab} data-pk62="drawer-layer">
      <aside className="k62-hdr" role="dialog" aria-modal="true" aria-labelledby="k62-hdrT" aria-describedby="k62-hdrS" data-pk62="drawer">
        <div className="k62-hdr-head">
          <h3 id="k62-hdrT">{p ? "Edit package" : "New package"}</h3>
          <small id="k62-hdrS">{p ? "Rename it, or change its icon or its note." : "Name it, then pick its pieces on the page."}</small>
          <button type="button" className="k62-hdr-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="k62-hdr-body">
          <label className="k62-fld"><span>Name</span>
            <input ref={nameRef} value={name} className={err ? "k62-err" : undefined} aria-invalid={err || undefined} placeholder="e.g. Agents who want a synopsis" autoComplete="off"
              data-pk62="d-name" onChange={(e) => { setName(e.target.value); setErr(false); }} onKeyDown={onEnter} />
            {err ? <small className="k62-err-t" role="alert">Give it a name.</small> : null}
          </label>
          <label className="k62-fld"><span>Who is it for?</span>
            <input value={note} placeholder="A note to yourself" autoComplete="off" data-pk62="d-note" onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} />
            <small>Just for you. Agents don’t see this.</small>
          </label>
          <div className="k62-fld"><span id="k62-icL">Icon</span>
            <div className="k62-icons" role="radiogroup" aria-labelledby="k62-icL" onKeyDown={onIconKey}>
              {PACKAGE_ICONS.map((k) => (
                <button type="button" key={k} role="radio" aria-checked={ic === k} aria-label={k} tabIndex={ic === k ? 0 : -1} data-pk62-icon={k} onClick={() => setIc(k)}><PicBare ic={k} /></button>
              ))}
            </div>
          </div>
          {p && i ? (i.sent ? <p data-pk62="cant-delete">You can’t delete this package because agents have received it.</p>
            : <button type="button" className="k62-go" data-pk62="delete" onClick={async () => { if (await onDelete(p)) onClose(); }}>Delete this package</button>) : null}
          {canRetire ? <p className="k62-retire"><button type="button" className="k62-go" data-pk62="retire" onClick={async () => { if (await onRetire(p!)) onClose(); }}>Retire this package</button></p> : null}
        </div>
        <div className="k62-hdr-foot">
          <button type="button" className="k62-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="k62-btn k62-pri" disabled={busy} data-pk62="d-ok" onClick={() => void ok()}>{p ? "Save" : "Create package"}</button>
        </div>
      </aside>
    </div>
  );
};

export const Pk62Drawer: React.FC<{
  view: DrawerView | null;
  pkgOf: (id: string) => SubmissionPackage | null;
  infoOf: (p: SubmissionPackage) => PkInfo;
  onClose: () => void;
  onCreate: (d: { name: string; note: string; icon: PackageIcon }) => Promise<boolean>;
  onSave: (p: SubmissionPackage, d: { name: string; note: string; icon: PackageIcon }) => Promise<boolean>;
  onDelete: (p: SubmissionPackage) => Promise<boolean>;
  onRetire: (p: SubmissionPackage) => Promise<boolean>;
}> = ({ view, pkgOf, infoOf, onClose, ...rest }) => {
  if (!view) return null;
  const p = view.m === "edit" ? pkgOf(view.id) : null;
  if (view.m === "edit" && !p) return null;
  return createPortal(<Body key={view.m === "edit" ? view.id : "new"} p={p} i={p ? infoOf(p) : null} onClose={onClose} {...rest} />, document.body);
};
