/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2 — the Materials rail's body and the add-material modal (ref `renderRail`,
 * `openMatModal`). The card, the stickiness and the height are the shared `PageRail`'s.
 *
 * ⚠️ THE MODAL TRAPS FOCUS AND RENDERS INSIDE THE PAGE ROOT, NOT A PORTAL: the `--ppv-*` aliases are
 * declared on `.ppv-page`, and a portal to `body` would read none of them (the house portal-scope
 * law). `position: fixed` escapes the scroller without needing one.
 *
 * ⚠️ A VERSION HAS NO WORD-COUNT FIELD. The mock draws one; `BookVersion` has no word count, so the
 * field would take a number and store it nowhere (a false premise, reported).
 */
import React, { useEffect, useRef, useState } from "react";
import { MatKind, MaterialItem } from "../../lib/packagesPage";
import { countWords } from "../../lib/materialDraft";

const PLURAL: Record<MatKind, string> = { letter: "Query letters", synopsis: "Synopses", version: "Versions" };
const LABEL: Record<MatKind, string> = { letter: "Query letter", synopsis: "Synopsis", version: "Version" };

export type MatAct = "open" | "edit" | "rename" | "away";

export interface PkgMaterialsProps {
  mats: Record<MatKind, MaterialItem[]>;
  metaOf: (m: MaterialItem) => string;
  composing: boolean;
  inPkg: (m: MaterialItem) => boolean;
  onChip: (m: MaterialItem) => void;
  onDragStart: (m: MaterialItem) => void;
  onDragEnd: () => void;
  onAdd: (k: MatKind, opener: HTMLElement) => void;
  /** the ⋯ menu (v2.1, E5): Open · Rename · Put away; `more` is the ⋯ button, for focus to return to */
  onMenu?: (act: MatAct, m: MaterialItem, more: HTMLElement | null) => void;
  /** put-away letters and synopses — the only route back for them, so it renders only when there are any */
  putAway?: MaterialItem[];
  onRestore?: (m: MaterialItem) => void;
}

/** E5: book versions have no retired field, so they can be opened and renamed but never put away. */
export const menuActs = (k: MatKind): MatAct[] => (k === "version" ? ["open", "rename"] : ["open", "edit", "rename", "away"]);
const ACT_LABEL: Record<MatAct, string> = { open: "Open", edit: "Edit", rename: "Rename", away: "Put away" };

export const PkgMaterials: React.FC<PkgMaterialsProps> = ({ mats, metaOf, composing, inPkg, onChip, onDragStart, onDragEnd, onAdd, onMenu, putAway = [], onRestore }) => {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const moreRefs = useRef(new Map<string, HTMLButtonElement>());
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = (focusBack: boolean) => {
    const id = menuFor;
    setMenuFor(null);
    if (focusBack && id) requestAnimationFrame(() => moreRefs.current.get(id)?.focus());
  };
  /* opening focuses the first item */
  useEffect(() => { if (menuFor) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); }, [menuFor]);
  /* Esc, or a press outside the menu and its own ⋯, closes it and returns focus to the ⋯ */
  useEffect(() => {
    if (!menuFor) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(true); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || moreRefs.current.get(menuFor)?.contains(t)) return;
      closeMenu(true);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", onDown, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuFor]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  };

  return (
  <div className="ppv-rbody">
    {composing
      ? <p className="ppv-rhint">Click a material to put it in the package, or drag it onto a slot.</p>
      : <p className="ppv-rhint ppv-rhint--quiet">Click any material to start a package with it.</p>}
    {(["letter", "synopsis", "version"] as MatKind[]).map((k) => (
      <React.Fragment key={k}>
        <div className="ppv-mh">
          <b>{PLURAL[k]}</b><span className="ppv-pill">{mats[k].length}</span><span className="grow" />
          <button type="button" className="ppv-mini" data-add={k} onClick={(e) => onAdd(k, e.currentTarget)}>+ Add</button>
        </div>
        <div className="ppv-mats">
          {mats[k].length ? mats[k].map((m) => {
            const inp = composing && inPkg(m);
            const openMenu = menuFor === m.id;
            return (
              <div key={m.id} className="ppv-chiprow">
                {/* ⚠️ A `div role="button"`, NOT A <button>: Chromium never starts a native drag on a
                    button, so a draggable <button> is a chip that cannot be dragged (measured — no
                    dragstart fires). Enter and Space are handled here to keep it a real control. */}
                <div role="button" tabIndex={0} className={`ppv-chip${k === "version" ? " is-ver" : ""}${composing ? " is-composing" : ""}${inp ? " is-in" : ""}`}
                  data-mat={m.id} draggable={composing} aria-pressed={composing ? inp : undefined}
                  aria-label={composing ? `${inp ? "In package" : "Add to package"}: ${m.name}` : undefined}
                  onClick={() => onChip(m)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChip(m); } }}
                  onDragStart={(e) => { if (!composing) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", m.id); e.dataTransfer.effectAllowed = "copy"; onDragStart(m); }}
                  onDragEnd={onDragEnd}>
                  <i aria-hidden="true" />
                  <span className="cx">
                    <span className="cn">{m.name}{m.current ? <> <span className="ppv-tag ppv-tag--ms">Current</span></> : null}</span>
                    <span className="cm">{metaOf(m)}</span>
                  </span>
                  {composing ? <span className="add">{inp ? "✓ In" : "Add"}</span> : null}
                </div>
                {/* ⚠️ A SIBLING OF THE CHIP, NEVER INSIDE IT: interactive elements cannot nest, and the ⋯
                    must never fill or empty a composer slot (the chip's click does that). */}
                <button type="button" className="ppv-more" data-ppv="more" data-more={m.id}
                  ref={(el) => { if (el) moreRefs.current.set(m.id, el); else moreRefs.current.delete(m.id); }}
                  aria-label={`More for ${m.name}`} aria-haspopup="menu" aria-expanded={openMenu}
                  onClick={() => (openMenu ? closeMenu(true) : setMenuFor(m.id))}>⋯</button>
                {openMenu ? (
                  <div className="ppv-mmenu" role="menu" aria-label={`${m.name}`} data-ppv="mmenu" ref={menuRef} onKeyDown={onMenuKey}>
                    {menuActs(k).map((a) => (
                      <button key={a} type="button" role="menuitem" data-mact={a}
                        onClick={() => { const more = moreRefs.current.get(m.id) ?? null; setMenuFor(null); onMenu?.(a, m, more); }}>{ACT_LABEL[a]}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }) : <div className="ppv-memp">None yet.</div>}
        </div>
      </React.Fragment>
    ))}
    {/* ⚠️ THE ONLY WAY BACK FOR A PUT-AWAY MATERIAL (v2 kept it; v2.1 draws it as the mock does, an
        open list under a plain header). Absent unless something is put away. */}
    {putAway.length ? (
      <div data-ppv="putaway">
        <div className="ppv-mh ppv-mh--away"><b>Put away</b><span className="ppv-pill">{putAway.length}</span></div>
        <div className="ppv-mats">
          {putAway.map((m) => (
            <div key={m.id} className="ppv-away" data-away={m.id}>
              <span>{m.name}<span className="cm">{LABEL[m.kind]}</span></span>
              <button type="button" className="ppv-mini" data-ppv="restore-mat" onClick={() => onRestore?.(m)}>Restore</button>
            </div>
          ))}
        </div>
      </div>
    ) : null}
  </div>
  );
};

export interface MatModalProps {
  kind: MatKind;
  onClose: () => void;
  /** resolves false when the write did not land — the modal stays open */
  onSave: (d: { name: string; text: string; note: string }) => Promise<boolean>;
  /**
   * Editing a letter or synopsis (Part B §B2). `locked` is the sentence a SENT version shows —
   * "v3 has been sent, so your changes become v4." — and the name then starts as the next version's.
   */
  editing?: { from: string; name: string; text: string; locked: string | null };
}

export const PkgMaterialModal: React.FC<MatModalProps> = ({ kind, onClose, onSave, editing }) => {
  const isV = kind === "version";
  const [name, setName] = useState(editing?.name ?? "");
  const [text, setText] = useState(editing?.text ?? "");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const words = countWords(text);

  const save = async () => {
    if (busy) return;
    if (!name.trim()) { setErr("Add a name to save it."); nameRef.current?.focus(); return; }
    setBusy(true);
    const ok = await onSave({ name: name.trim(), text, note: note.trim() });
    setBusy(false);
    if (!ok) setErr("That didn't save. Try again.");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key === "Tab") {
      const f = [...(modalRef.current?.querySelectorAll<HTMLElement>("input, textarea, button:not([disabled])") ?? [])];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); void save(); }
  };

  return (
    <div className="ppv-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ppv-modal" role="dialog" aria-modal="true" aria-labelledby="ppv-m-title" data-ppv="modal" ref={modalRef} onKeyDown={onKey}>
        <div className="mh">
          <h3 id="ppv-m-title">{editing ? `Edit ${editing.from}` : `Add ${isV ? "a version" : `a ${LABEL[kind].toLowerCase()}`}`}</h3>
          <p>{isV ? "Name it for the edit it represents, like “Fast-paced opening”." : "Paste the text so its word count is kept with it."}</p>
          {editing?.locked ? <div className="ppv-lockedit" data-ppv="lockedit" role="status">{editing.locked}</div> : null}
        </div>
        <div className="mb">
          <div className="ppv-f w">
            <label htmlFor="ppv-m-name">Name <span className="req">*</span></label>
            <input id="ppv-m-name" ref={nameRef} autoComplete="off" value={name} maxLength={120}
              placeholder={isV ? "e.g. Fast-paced opening" : kind === "letter" ? "e.g. Query letter v4" : "e.g. Synopsis, 2 pages"}
              onChange={(e) => { setName(e.target.value); if (err) setErr(""); }} />
            <span className="err" data-ppv="m-err" role="alert">{err}</span>
          </div>
          {isV ? (
            <div className="ppv-f w">
              <label htmlFor="ppv-m-note">What changed</label>
              <textarea id="ppv-m-note" rows={3} maxLength={2000} placeholder="e.g. Cut the prologue; opens on the ferry." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          ) : (
            <div className="ppv-f w">
              <label htmlFor="ppv-m-text">Text</label>
              <textarea id="ppv-m-text" rows={7} placeholder={`Paste your ${LABEL[kind].toLowerCase()} here`} value={text} onChange={(e) => setText(e.target.value)} />
              <span className="hint" id="ppv-m-count" aria-live="polite">{words.toLocaleString("en-GB")} word{words === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
        <div className="mf">
          <button type="button" className="ppv-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ppv-btn ppv-btn--dark" data-ppv="m-save" disabled={busy} onClick={() => void save()}>{editing ? (editing.locked ? `Save as ${name.trim() || editing.name}` : "Save") : `Add ${isV ? "version" : LABEL[kind].toLowerCase()}`}</button>
        </div>
      </div>
    </div>
  );
};
