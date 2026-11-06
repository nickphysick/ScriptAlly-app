/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbPiles — the Piles view (Corkboard v2, Part D; ref design-refs/corkboard-v13/, `drawPiles`).
 *
 * ⚠️ PILES ARE TAGS. A note's pile is its FIRST tag (lib/corkboard `pileOf`), or Loose notes; there is no second
 *    grouping. One pile per tag in use, A to Z, Loose notes last, each showing its top three post-its (the pinned
 *    one on top) with "#tag" and "{n} notes".
 *
 * Opening a pile shows a shelf of every pile in miniature, with "← All piles" and a dashed New pile, then the open
 * pile's notes as the wall. Drag a note onto another mini pile and its first tag becomes that pile's (the others
 * stay); drop it on New pile and a name field appears, which mints through the app's own tag minter. The page owns
 * every write; this file only says where a note was dropped.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Pile } from "../../../lib/corkboard";
import { CbWall, type WallNote } from "./CbWall";

export interface PileNote { id: string; hex: string; text: string; matches: boolean }

export interface CbPilesProps {
  piles: Pile<PileNote>[];
  label: (k: string) => string;
  open: string | null;
  onOpen: (k: string | null) => void;
  /** the open pile's notes, drawn as the wall */
  wall: WallNote[];
  draggable: boolean;
  narrowing: boolean;
  find: string;
  menuFor: string | null;
  onOpenNote: (id: string) => void;
  onMenu: (id: string, anchor: HTMLElement) => void;
  onMove: (noteId: string, pile: string) => void;
  onNewPile: (noteId: string, name: string) => void;
  /** Corkboard v2.1: the dashed "+ Start a pile" tile at the grid's end (ref v14 `#ghostPile`) */
  onStart?: () => void;
  /** Corkboard v2.1: "+ Add notes to this pile" in an open named pile */
  onAddNotes?: (k: string) => void;
}

const nNotes = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;

export const CbPiles: React.FC<CbPilesProps> = ({ piles, label, open, onOpen, wall, draggable, narrowing, find, menuFor, onOpenNote, onMenu, onMove, onNewPile, onStart, onAddNotes }) => {
  const [over, setOver] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (naming) nameRef.current?.focus(); }, [naming]);

  const cur = open !== null ? piles.find((p) => p.k === open) : undefined;
  /* the open pile emptied (its last note moved away): back to All piles */
  useEffect(() => { if (open !== null && !cur) onOpen(null); }, [open, cur, onOpen]);

  if (open === null || !cur) {
    return (
      <div className="cb2-piles" data-cb2="piles">
        <div className="cb2-phead" data-cb2="piles-head">
          <div>
            <h2>Your piles</h2>
            <p>{piles.some((p) => p.k)
              ? "A pile is a tag. Open one to see its notes, or drag a note onto another pile to move it."
              : "A pile gathers notes on the same theme, like agents to look into or synopsis notes. Start one and pick the notes to go in it."}</p>
          </div>
          <button type="button" className="cb2-btn cb2-btn--navy cb2-btn--sm2" data-cb2="start-pile-btn" onClick={() => onStart?.()}>+ Start a pile</button>
        </div>
        <div className="cb2-pgrid">
          {piles.map((p) => {
            const top = p.notes.slice(0, 3);
            /* find fades a pile with no match, unless the pile's own name matches (the ref's hitPile) */
            const q = find.trim().toLowerCase();
            const dim = narrowing && !p.notes.some((n) => n.matches) && !(q && label(p.k).toLowerCase().includes(q));
            return (
              <button key={p.k || "__loose"} type="button" className={`cb2-pile${dim ? " cb2-pile--dim" : ""}`} data-pile={p.k}
                aria-label={`${label(p.k)}, ${nNotes(p.notes.length)}`} onClick={() => onOpen(p.k)}>
                <div className="cb2-stack">
                  {top.length ? top.slice().reverse().map((n, i, a) => (
                    <div key={n.id} className={`cb2-paper cb2-s${a.length - i}`} style={{ ["--c" as string]: n.hex }}>
                      <div className="cb2-body cb2-body--pile">{n.text}</div>
                    </div>
                  )) : <div className="cb2-emptystack" data-cb2="empty-stack">Nothing in it yet</div>}
                </div>
                <div className="cb2-lab"><b>{label(p.k)}</b><span>{nNotes(p.notes.length)}</span></div>
              </button>
            );
          })}
          <div className="cb2-gwrap">
            <button type="button" className="cb2-ghost" data-cb2="ghost-pile" onClick={() => onStart?.()}>
              <b>+ Start a pile</b>
              <small>Name it, then pick the notes</small>
            </button>
            <div className="cb2-glab">New pile</div>
          </div>
        </div>
      </div>
    );
  }

  const dropOn = (k: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setOver(null);
    if (id) onMove(id, k);
  };
  return (
    <div className="cb2-piles" data-cb2="pile-open">
      <div className="cb2-shelf" data-cb2="shelf">
        <button type="button" className="cb2-back" data-cb2="all-piles" onClick={() => onOpen(null)}>← All piles</button>
        {piles.map((p) => (
          <button key={p.k || "__loose"} type="button" className={`cb2-mini${p.k === open ? " cb2-mini--on" : ""}${over === p.k ? " cb2-mini--over" : ""}`}
            data-mini={p.k} aria-label={`${label(p.k)}, ${nNotes(p.notes.length)}`} onClick={() => onOpen(p.k)}
            onDragOver={draggable && p.k !== open ? (e) => { e.preventDefault(); if (over !== p.k) setOver(p.k); } : undefined}
            onDragLeave={() => setOver((o) => (o === p.k ? null : o))}
            onDrop={draggable && p.k !== open ? dropOn(p.k) : undefined}>
            <span className="cb2-sq" aria-hidden="true">
              {p.notes.slice(0, 2).reverse().map((n) => <i key={n.id} style={{ background: n.hex }} />)}
            </span>
            <b>{label(p.k)}</b>
            <small>{p.notes.length}</small>
          </button>
        ))}
        <div className={`cb2-mini cb2-newp${over === "__new" ? " cb2-mini--over" : ""}`} data-cb2="new-pile"
          onDragOver={draggable ? (e) => { e.preventDefault(); if (over !== "__new") setOver("__new"); } : undefined}
          onDragLeave={() => setOver((o) => (o === "__new" ? null : o))}
          onDrop={draggable ? (e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) { setNaming(id); setName(""); } } : undefined}>
          <span className="cb2-sq" aria-hidden="true"><i />+</span>
          {naming ? (
            <span className="cb2-pname">
              <input ref={nameRef} value={name} placeholder="Name the pile" aria-label="Name the pile" data-cb2="pile-name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); const id = naming; setNaming(null); if (name.trim()) onNewPile(id, name); }
                  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setNaming(null); }
                }}
                onBlur={() => setNaming(null)} />
            </span>
          ) : <><b>New pile</b><small>drop a note here</small></>}
        </div>
      </div>
      <div className="cb2-openhead">
        <h2>{label(cur.k)}</h2><span>{nNotes(cur.notes.length)}</span><span className="cb2-grow" />
        {cur.k ? <button type="button" className="cb2-btn cb2-btn--sm2" data-cb2="add-notes" onClick={() => onAddNotes?.(cur.k)}>+ Add notes to this pile</button> : null}
      </div>
      {cur.notes.length
        ? <CbWall notes={wall} draggable={draggable} reorder={false} menuFor={menuFor} onOpen={onOpenNote} onMenu={onMenu} />
        : (
          <div className="cb2-pempty" data-cb2="pile-empty"
            onDragOver={draggable ? (e) => e.preventDefault() : undefined}
            onDrop={draggable ? (e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, cur.k); } : undefined}>
            <b>Nothing in this pile yet</b>Add notes with the button above, or drag one here from another pile.
          </div>
        )}
    </div>
  );
};
