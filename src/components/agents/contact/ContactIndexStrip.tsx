/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactIndexStrip — the A–Z index (v12 §4): 27 cells, "All · N" first on parchment, then the
 * letters, each carrying its count when it has agents; letterless cells are quiet and inert.
 * The counts come in from the page (letterCounts over the SAME filtered set the list shows,
 * §9), so a filter moves the strip and the dividers together — one derivation, two readers.
 *
 * ⚠️ v13 §6: THE STRIP IS NO LONGER STICKY. It sits inside the slate workspace, white, at the head
 * of the rows (the mock's `.idx`); once the page scrolls, the sticky slim bar's mini A–Z (1441px
 * and wider) is the index that stays in reach. v12's sticky strip and its three offset tokens retired.
 *
 * ⚠️ THE MARKED CELL IS DERIVED, NEVER AN OBSERVER'S MEMORY. The brief suggests an
 * IntersectionObserver on the dividers; the house law (CLAUDE.md, the IO-misses-are-permanent
 * entry) is that "which divider is at the top" derives from scrollTop on scroll, rAF-throttled
 * — an event you did not receive can never correct itself. The page computes `marked` that way
 * and this component only draws it.
 */
import React from "react";

const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface ContactIndexStripProps {
  /** the filtered list's size — the "All · N" cell (§9: the same set the list shows) */
  total: number;
  counts: ReadonlyMap<string, number>;
  /** the marked letter (a pick, or the divider nearest the sticky bar while scrolling) */
  marked: string | null;
  onPick: (letter: string | null) => void;
}

export const ContactIndexStrip: React.FC<ContactIndexStripProps> = ({ total, counts, marked, onPick }) => (
  <div className="clv-idxwrap" data-clv="idxwrap">
    <div className="clv-idx" data-clv="idx" role="navigation" aria-label="Index of agents by surname">
      <button type="button" className="clv-ixtab clv-ixall" data-clv="ixall" onClick={() => onPick(null)}>
        All · {total}
      </button>
      {AZ.map((L) => {
        const n = counts.get(L) ?? 0;
        return (
          <button
            key={L}
            type="button"
            className={`clv-ixtab${n ? " has" : ""}${marked === L ? " on" : ""}`}
            data-clv="ixtab"
            data-letter={L}
            disabled={!n}
            aria-current={marked === L || undefined}
            onClick={() => onPick(L)}
          >
            {L}
            {n > 0 && <i>{n}</i>}
          </button>
        );
      })}
    </div>
  </div>
);
