/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2.1 — the material drawer and the rename modal (ref packages-v2-1.html
 * `openDrawer` / `openRename`).
 *
 * ⚠️ THE DRAWER IS READ-ONLY. It shows a material's own saved text (or a version's note) and where it
 * is used; nothing in it edits contents. Rename changes the LABEL on the same record (Nick, 28 Sep):
 * same id, no new version, and a sent package that holds it stays locked.
 *
 * ⚠️ ALWAYS MOUNTED AND `visibility: hidden` WHEN CLOSED, so the slide has somewhere to come from and
 * nothing inside can be tabbed into while it is shut. Both render inside the page root (not a portal)
 * because the `--ppv-*` aliases are declared on `.ppv-page`.
 */
import React, { useEffect, useRef, useState } from "react";
import { MatKind } from "../../lib/packagesPage";

const KIND_LABEL: Record<MatKind, string> = { letter: "Query letter", synopsis: "Synopsis", version: "Version" };

export interface DrawerItem {
  id: string;
  kind: MatKind;
  name: string;
  meta: string;
  /** a letter's or synopsis's saved text (`contentDraft`) */
  text?: string | null;
  fileName?: string | null;
  link?: string | null;
  /** a version's "what changed" */
  note?: string | null;
  uses: { name: string; retired: boolean }[];
}

export interface PkgMaterialDrawerProps {
  item: DrawerItem | null;
  onClose: () => void;
  onRename: (item: DrawerItem) => void;
}

export const PkgMaterialDrawer: React.FC<PkgMaterialDrawerProps> = ({ item, onClose, onRename }) => {
  const open = !!item;
  const xRef = useRef<HTMLButtonElement | null>(null);
  /* keep the last item so the drawer has content while it slides out */
  const [shown, setShown] = useState<DrawerItem | null>(item);
  useEffect(() => { if (item) setShown(item); }, [item]);
  useEffect(() => { if (open) requestAnimationFrame(() => xRef.current?.focus()); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const d = shown;
  let body: React.ReactNode = null;
  if (d) {
    if (d.kind === "version") {
      body = (<>
        <div className="ppv-lbl" data-ppv="d-label">What changed</div>
        <div className="ppv-dtext" data-ppv="d-text">{d.note?.trim() ? d.note : "Nothing written about this version."}</div>
      </>);
    } else if (d.text?.trim()) {
      body = <div className="ppv-dtext" data-ppv="d-text">{d.text}</div>;
    } else if (d.fileName) {
      body = <div className="ppv-dtext" data-ppv="d-text">Saved as a file: {d.fileName}</div>;
    } else if (d.link) {
      body = <div className="ppv-dtext" data-ppv="d-text"><a href={d.link} target="_blank" rel="noreferrer">{d.link}</a></div>;
    } else {
      body = <div className="ppv-dtext" data-ppv="d-text">No text saved for this one.</div>;
    }
  }

  return (
    <>
      <div className={`ppv-dscrim${open ? " is-open" : ""}`} data-ppv="dscrim" onClick={onClose} />
      <aside className={`ppv-drawer${open ? " is-open" : ""}`} data-ppv="mdrawer" role="dialog" aria-modal="true" aria-labelledby="ppv-d-title">
        {d ? (<>
          <div className="dh">
            <div>
              <span className="ppv-lbl" data-ppv="d-kind">{KIND_LABEL[d.kind]}</span>
              <h3 id="ppv-d-title">{d.name}</h3>
              <div className="cm">{d.meta}</div>
            </div>
            <button type="button" className="dx" aria-label="Close" ref={xRef} onClick={onClose}>×</button>
          </div>
          <div className="db">
            {body}
            <div className="ppv-lbl ppv-lbl--uses">Used in</div>
            {d.uses.length ? (
              <ul className="ppv-duses" data-ppv="d-uses">
                {d.uses.map((u) => <li key={u.name}><i className="mk" aria-hidden="true" />{u.name}{u.retired ? <> <span className="ppv-tag ppv-tag--plain">Retired</span></> : null}</li>)}
              </ul>
            ) : <p className="cm ppv-dnone">No packages yet.</p>}
          </div>
          <div className="df">
            <button type="button" className="ppv-btn" data-ppv="d-close" onClick={onClose}>Close</button>
            <button type="button" className="ppv-btn ppv-btn--dark" data-ppv="d-rename" onClick={() => onRename(d)}>Rename</button>
          </div>
        </>) : null}
      </aside>
    </>
  );
};

export interface RenameModalProps {
  kind: MatKind;
  name: string;
  onClose: () => void;
  /** resolves false when the write did not land — the modal stays open */
  onSave: (name: string) => Promise<boolean>;
}

export const PkgRenameModal: React.FC<RenameModalProps> = ({ kind, name, onClose, onSave }) => {
  const [value, setValue] = useState(name);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  const save = async () => {
    if (busy) return;
    const v = value.trim();
    if (!v) { setErr("Add a name to save it."); inputRef.current?.focus(); return; }
    setBusy(true);
    const ok = await onSave(v);
    setBusy(false);
    if (!ok) setErr("That didn't save. Try again.");
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key === "Tab") {
      const f = [...(modalRef.current?.querySelectorAll<HTMLElement>("input, button:not([disabled])") ?? [])];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); void save(); }
  };
  return (
    <div className="ppv-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ppv-modal" role="dialog" aria-modal="true" aria-labelledby="ppv-r-title" data-ppv="rename" ref={modalRef} onKeyDown={onKey}>
        <div className="mh">
          <h3 id="ppv-r-title">Rename {KIND_LABEL[kind].toLowerCase()}</h3>
          <p>Packages that use it will show the new name.</p>
        </div>
        <div className="mb">
          <div className="ppv-f w">
            <label htmlFor="ppv-r-name">Name</label>
            <input id="ppv-r-name" ref={inputRef} autoComplete="off" value={value} maxLength={120}
              onChange={(e) => { setValue(e.target.value); if (err) setErr(""); }} />
            <span className="err" data-ppv="r-err" role="alert">{err}</span>
          </div>
        </div>
        <div className="mf">
          <button type="button" className="ppv-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ppv-btn ppv-btn--dark" data-ppv="r-save" disabled={busy} onClick={() => void save()}>Save name</button>
        </div>
      </div>
    </div>
  );
};
