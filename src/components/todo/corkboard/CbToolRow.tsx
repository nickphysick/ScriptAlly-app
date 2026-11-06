/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbToolRow — the Corkboard's tool row (Corkboard v2, Part B; ref design-refs/corkboard-v13/, `.fr`): find, the tag
 * pills (scrolling sideways, fading at the right), the "N of M match" count while something narrows, then the
 * Corkboard / Piles switch and the sort pill (the Corkboard view only). The tag pills are hidden in Piles.
 *
 * ⚠️ THE PILLS READ THE UNFILTERED BOARD, and so do their counts: derived from what is shown they would vanish as
 *    they were used.
 */
import React, { useEffect, useRef, useState } from "react";
import { SORT_LABEL, SORTS, type BoardSort, type BoardView } from "../../../lib/corkboard";

export interface CbToolRowProps {
  find: string;
  onFind: (v: string) => void;
  chips: { id: string | null; label: string; n: number }[];
  tag: string | null;
  onTag: (id: string | null) => void;
  /** the "N of M match" words, only while something narrows */
  count: string | null;
  view: BoardView;
  onView: (v: BoardView) => void;
  sort: BoardSort;
  onSort: (s: BoardSort) => void;
  findRef?: React.Ref<HTMLInputElement>;
}

const Grid = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" /><rect x="9" y="1.5" width="5.5" height="5.5" rx="1" /><rect x="1.5" y="9" width="5.5" height="5.5" rx="1" /><rect x="9" y="9" width="5.5" height="5.5" rx="1" /></svg>
);
const Stack = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="4" width="9" height="9" rx="1" /><path d="M5 2h8.5a1 1 0 0 1 1 1v8.5" /></svg>
);

export const CbToolRow: React.FC<CbToolRowProps> = ({ find, onFind, chips, tag, onTag, count, view, onView, sort, onSort, findRef }) => {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key, true); };
  }, [open]);
  const piles = view === "piles";
  return (
    <div className="cb2-fr" data-cb2="tools" role="group" aria-label="Find and arrange">
      <label className="cb2-find">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
        <input ref={findRef} value={find} placeholder="Find a note" aria-label="Find a note" data-cb2="find"
          onChange={(e) => onFind(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape" && find) { e.stopPropagation(); onFind(""); } }} />
        {find ? <button type="button" aria-label="Clear" onClick={() => onFind("")}>✕</button> : null}
      </label>
      {piles ? null : <span className="cb2-sep" aria-hidden="true" />}
      {piles ? null : (
        <div className="cb2-chips" data-cb2="chips">
          {chips.map((c) => (
            <button key={c.id ?? "all"} type="button" className={`cb2-pill${tag === c.id ? " cb2-pill--set" : ""}`} aria-pressed={tag === c.id}
              data-chip={c.id ?? "all"} onClick={() => onTag(c.id)}>
              {c.id === null ? c.label : `#${c.label}`} <span className="cb2-chip">{c.n}</span>
            </button>
          ))}
        </div>
      )}
      {count ? <span className="cb2-fcount" data-cb2="fcount">{count}</span> : null}
      <span className="cb2-grow" />
      <div className="cb2-seg" role="group" aria-label="View" data-cb2="view">
        <button type="button" aria-pressed={!piles} data-view="board" onClick={() => onView("board")}><Grid />Corkboard</button>
        <button type="button" aria-pressed={piles} data-view="piles" onClick={() => onView("piles")}><Stack />Piles</button>
      </div>
      {piles ? null : (
        <div className="cb2-pw" ref={wrap}>
          <button ref={btn} type="button" className="cb2-pill" data-cb2="sort" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span>{SORT_LABEL[sort]}</span>
            <svg viewBox="0 0 10 10" fill="none" strokeWidth="1.6" aria-hidden="true"><path d="m2 3.5 3 3 3-3" /></svg>
          </button>
          {open ? (
            <div className="cb2-pp" role="menu" data-cb2="sort-pop">
              {SORTS.map((s) => (
                <button key={s} type="button" className="cb2-opt" role="menuitemradio" aria-checked={sort === s} data-sort={s}
                  onClick={() => { onSort(s); setOpen(false); }}>{SORT_LABEL[s]}</button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
