/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the list card's cap, pinned under the toolbar's strip (the Contact list's card): the column
 * heads, on the deeper blush heading row. Agent, Where it stands and Next sort; Sent by and Materials are plain heads.
 */
import React, { useEffect, useRef, useState } from "react";
import { pressSort, type Sort151, type SortKey151 } from "../../../lib/qc151";

const COLS: { key: SortKey151 | null; label: string; cls: string }[] = [
  { key: "agent", label: "Agent", cls: "c-ag" },
  { key: "stage", label: "Where it stands", cls: "c-j" },
  { key: null, label: "Sent by", cls: "c-sm" },
  { key: null, label: "Materials", cls: "c-mat" },
  { key: "due", label: "Next", cls: "c-nx" },
];

export const ListCap169: React.FC<{ sort: Sort151; onSort: (s: Sort151) => void }> = ({ sort, onSort }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  /* pinned only: the cap paints the page's ground round its white top (the Contact list's `data-clq-stuck`) */
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const sc = el.closest(".wpg-scroll") as HTMLElement | null; const tgt: HTMLElement | Window = sc ?? window;
    const on = () => { const top = parseFloat(getComputedStyle(el).top) || 0; const box = (sc ?? document.documentElement).getBoundingClientRect(); setStuck(el.getBoundingClientRect().top - (sc ? box.top : 0) <= top + 0.5); };
    on(); tgt.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { tgt.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const arrow = sort.desc ? "↓" : "↑";
  return (
    <div className="qc169-cap" ref={ref} data-qc169="cap" data-stuck={stuck ? "" : undefined}>
      <div className="qc169-capin">
        <div className="qc169-top">
          <div className="qc169-th" data-qc169="heads">
            {COLS.map((c) => (
              <span key={c.label} className={`qc169-thc ${c.cls}`} data-col={c.cls}>
                {c.key ? <button type="button" className={sort.key === c.key ? "on" : ""} onClick={() => onSort(pressSort(sort, c.key!))}>{c.label}{sort.key === c.key ? <i>{arrow}</i> : null}</button> : c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
