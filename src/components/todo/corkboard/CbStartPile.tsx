/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbStartPile — "Start a pile" and "Add notes to #tag" (Corkboard v2.1, Part B; ref design-refs/corkboard-v14/,
 * `drawStartPile`, screens 03 and 05). One pop-up, two modes:
 *
 *   start — Name it (a "#" field, up to six suggestions that are not piles yet, a clash line that disables the
 *           button), then Put notes in it (optional): every note, ticked or not. "Start the pile".
 *   add   — no name field; only the notes NOT already in this pile. "Add to pile".
 *
 * It writes nothing: the page mints the tag (newTag / createTagDef, as v2's New pile does) and moves the ticked notes
 * by v2's rule (the pile's tag first, the others kept). Portals to `document.body` and carries `.cb2-layer`, like the
 * page's other pop-ups (the app has no shared centred dialog, checkbox or text field; these are the page's own).
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { PILE_SUGGESTIONS, pileSlug } from "../../../lib/corkboard";

export interface PickNote { id: string; hex: string; text: string; pile: string }

export interface CbStartPileProps {
  /** null: start a new pile; a label ("#agents"): add notes to that pile */
  adding: string | null;
  /** the notes to offer, in board order (add mode: only those not in the pile) */
  notes: PickNote[];
  /** every pile's tag LABEL that exists now (in use or started here), lower case, for suggestions and the clash */
  have: ReadonlySet<string>;
  /** ticked on open (the ⋯ menu's New pile… ticks its own note) */
  initial: string[];
  onSave: (name: string, ids: string[]) => void;
  onClose: () => void;
}

const nNotes = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;

export const CbStartPile: React.FC<CbStartPileProps> = ({ adding, notes, have, initial, onSave, onClose }) => {
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Set<string>>(() => new Set(initial));
  const nameRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
    else boxRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const back = opener.current;
    return () => { if (back instanceof HTMLElement) back.focus(); };
  }, []);
  useEscapeLayer(true, onClose, ESC_LEVEL.pageDrawer);

  const slug = pileSlug(name);
  const clash = !adding && !!slug && have.has(slug);
  const ok = adding ? sel.size > 0 : !!slug && !clash;
  const toggle = (id: string, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const save = () => { if (ok) onSave(adding ? "" : slug, notes.filter((n) => sel.has(n.id)).map((n) => n.id)); };

  return createPortal(
    <div className="cb2-layer cb2-scrim" data-cb2="start-pile" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={boxRef} className="cb2-tdlg cb2-sdlg" role="dialog" aria-modal="true" aria-labelledby="cb2-sp-h"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && (e.target as HTMLInputElement).type === "text") { e.preventDefault(); save(); } }}>
        <h2 id="cb2-sp-h" className="cb2-dh">{adding ? `Add notes to ${adding}` : "Start a pile"}</h2>
        <p className="cb2-lede">{adding ? "Tick the notes to move in. Each one takes this pile’s tag." : "A pile is a tag, so it works with Find and the tag pills too."}</p>
        {adding ? null : (
          <>
            <h4 className="cb2-h4">Name it</h4>
            <label className="cb2-pnin">
              <span aria-hidden="true">#</span>
              <input ref={nameRef} type="text" value={name} placeholder="agents-to-look-into" autoComplete="off" aria-label="Name the pile" data-cb2="pile-name-in"
                onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="cb2-sugg" data-cb2="suggestions">
              {PILE_SUGGESTIONS.filter((x) => !have.has(x)).slice(0, 6).map((x) => (
                <button key={x} type="button" data-sugg={x} onClick={() => { setName(x); nameRef.current?.focus(); }}>#{x}</button>
              ))}
            </div>
            {clash ? <p className="cb2-clash" data-cb2="clash">There’s already a pile with that name.</p> : null}
          </>
        )}
        <h4 className="cb2-h4 cb2-h4--gap">{adding ? "Your notes" : <>Put notes in it <small>optional</small></>}</h4>
        <div className="cb2-picks" data-cb2="picks">
          {notes.length ? notes.map((n) => (
            <label key={n.id} data-pick={n.id}>
              <input type="checkbox" checked={sel.has(n.id)} onChange={(e) => toggle(n.id, e.target.checked)} />
              <i style={{ background: n.hex }} aria-hidden="true" />
              <span>{n.text}</span>
              <small>{n.pile}</small>
            </label>
          )) : <p className="cb2-nopicks">No other notes to add.</p>}
        </div>
        <div className="cb2-dacts">
          <span className="cb2-say" data-cb2="chosen">{sel.size ? `${nNotes(sel.size)} chosen` : ""}</span>
          <button type="button" className="cb2-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="cb2-btn cb2-btn--navy" data-cb2="start-save" disabled={!ok} onClick={save}>{adding ? "Add to pile" : "Start the pile"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
