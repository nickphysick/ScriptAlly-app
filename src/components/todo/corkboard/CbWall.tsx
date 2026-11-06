/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbWall — the wall: post-its in a grid that reads left to right (`repeat(auto-fill, minmax(232px, 1fr))`, gap 24),
 * each a button that opens the note, with its ⋯ (Corkboard v2, Part C; ref design-refs/corkboard-v13/, `.wall`).
 *
 * DRAG AND DROP: drag a note between two others and a navy line shows where it will land; the drop is the page's
 * one `order` write. ⚠️ A NOTE NEVER CROSSES THE PINNED LINE: pinned notes are first in every sort, so a line drawn
 * between a pinned and an unpinned note would promise a place the note cannot take. No line there, no drop.
 * Below 768px nothing is draggable (the ⋯ menu's Move items do the job).
 *
 * FILTERING FADES, IT DOES NOT HIDE: a note outside the find, the tag or the glance row drops to 22% where it is.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PostIt, type PostItProps } from "./CbPostIt";

export interface WallNote {
  id: string;
  label: string;
  pinned: boolean;
  dim: boolean;
  post: PostItProps;
}

export interface CbWallProps {
  notes: WallNote[];
  draggable: boolean;
  menuFor: string | null;
  onOpen: (id: string) => void;
  onMenu: (id: string, anchor: HTMLElement) => void;
  /** false in an open pile: a note is dragged onto another pile there, never between notes */
  reorder?: boolean;
  /** a drop: `from` lands before (or after) `target` */
  onDrop?: (from: string, target: string, after: boolean) => void;
  /** a fresh note's id, for its landing animation */
  fresh?: string | null;
  id?: string;
}

const Dots = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
);

/** Show "Read all" on every clamped body whose words are actually cut. */
function markClamped(root: HTMLElement | null) {
  if (!root) return;
  for (const b of Array.from(root.querySelectorAll<HTMLElement>(".cb2-body--clamp"))) {
    const btn = b.parentElement?.querySelector<HTMLElement>(".cb2-readall");
    if (btn) btn.hidden = !(b.scrollHeight > b.clientHeight + 2);
  }
}

export const CbWall: React.FC<CbWallProps> = ({ notes, draggable, reorder = true, menuFor, onOpen, onMenu, onDrop, fresh, id }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [line, setLine] = useState<{ id: string; after: boolean } | null>(null);

  /* "Read all": measured after every render that could change a body, on resize, and once the fonts land */
  useLayoutEffect(() => { markClamped(ref.current); });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => markClamped(el));
    ro.observe(el);
    void document.fonts?.ready.then(() => markClamped(el));
    return () => ro.disconnect();
  }, []);

  const pinnedOf = (nid: string) => notes.find((n) => n.id === nid)?.pinned;
  const end = () => { setDrag(null); setLine(null); document.body.classList.remove("cb2-dragging"); };

  return (
    <div className="cb2-wall" ref={ref} id={id} aria-label="Your notes" data-cb2="wall">
      {notes.map((n) => {
        const mark = line?.id === n.id ? (line.after ? " cb2-ins-a" : " cb2-ins-b") : "";
        return (
          <div
            key={n.id}
            className={`cb2-note${n.dim ? " cb2-dim" : ""}${drag === n.id ? " cb2-lift" : ""}${fresh === n.id ? " cb2-fresh" : ""}${mark}`}
            data-cb2-note={n.id}
            role="button"
            tabIndex={0}
            aria-label={n.label}
            draggable={draggable ? true : undefined}
            onClick={(e) => { if ((e.target as HTMLElement).closest("a, .cb2-more, .cb2-lchip, .cb2-readall")) return; onOpen(n.id); }}
            onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); onOpen(n.id); } }}
            onDragStart={draggable ? (e) => {
              setDrag(n.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", n.id);
              document.body.classList.add("cb2-dragging");
            } : undefined}
            onDragEnd={draggable ? end : undefined}
            onDragOver={draggable && reorder ? (e) => {
              if (!drag || drag === n.id || pinnedOf(drag) !== n.pinned) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const after = e.clientX > r.left + r.width / 2;
              if (line?.id !== n.id || line.after !== after) setLine({ id: n.id, after });
            } : undefined}
            onDrop={draggable && reorder ? (e) => {
              e.preventDefault();
              if (drag && line && line.id === n.id) onDrop?.(drag, line.id, line.after);
              end();
            } : undefined}
          >
            <PostIt {...n.post} />
            <button
              type="button"
              className="cb2-more"
              draggable={false}
              aria-label="Actions"
              aria-haspopup="menu"
              aria-expanded={menuFor === n.id}
              data-cb2="more"
              onClick={(e) => { e.stopPropagation(); onMenu(n.id, e.currentTarget); }}
            >
              <Dots />
            </button>
          </div>
        );
      })}
    </div>
  );
};
