/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 §C — THE PINNED ROW. Once the header has scrolled away, one slim page-coloured row lies along
 * the page sheet's top edge at the sheet's full width: the count (back to the top), the three group pills (the
 * summary card's own filter), what is showing, a search box that mirrors the header's, and "+ Add an agent".
 * The column headings stick directly under it, at the list's width (contactV17.css).
 *
 * ⚠️ ITS FRAME IS THE SHELL'S `PinnedRow` (pinned-row fix, 15 Oct): a child of the page sheet at `top: 0; left: 0;
 *    right: 0`, so its left, top and width are the sheet's own at every window size. Its height is the sheet lip's
 *    covered strip + 64 (`--pin-row-h`, one writer in PinnedRow), and its contents are centred in the 64 a reader can
 *    see; the headings' sticky `top` reads the same `--pin-row-h` (`--cl17-pin-h`).
 * ⚠️ THE ONE THING JS DECIDES IS WHETHER IT IS SHOWN: `useContactPinned`, a sentinel at the header's foot read
 *    on scroll with a hysteresis (on at 12px or less under the scroller's top, off above 48), so a 1px scroll
 *    across the line cannot flip it back and forth.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: the row is portalled only while this page is the one on screen.
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { PinnedRow } from "../../shell/PinnedRow";
import { LetterTabs } from "./ContactLetters";

/** shown at or under this many px between the sentinel and the scroller's top; hidden again above `PIN_OFF` */
export const PIN_ON = 12;
export const PIN_OFF = 48;
export const nextPin = (was: boolean, gap: number): boolean => (was ? gap <= PIN_OFF : gap <= PIN_ON);

/**
 * Whether the pinned row is shown. `anchor` is any element inside the page's group; the sentinel is the group's
 * `[data-cl17="pin-sentinel"]`. In full screen the header is hidden and the row is always shown.
 */
export function useContactPinned(anchor: React.RefObject<HTMLElement | null>, on: boolean, full: boolean): boolean {
  const [pinned, setPinned] = useState(false);
  useLayoutEffect(() => {
    if (!on) { setPinned(false); return undefined; }
    if (full) { setPinned(true); return undefined; }
    const group = anchor.current?.closest<HTMLElement>(".clv-group");
    const sc = group?.closest<HTMLElement>(".wpg-scroll");
    const sentinel = group?.querySelector<HTMLElement>('[data-cl17="pin-sentinel"]');
    if (!group || !sc || !sentinel) return undefined;
    let was = false;
    const read = () => {
      const s = sentinel.getBoundingClientRect();
      /* a hidden header has no box: that is "not laid out", never "scrolled away" */
      if (s.width === 0 && s.height === 0 && s.top === 0) return;
      const next = nextPin(was, s.top - sc.getBoundingClientRect().top);
      if (next !== was) { was = next; setPinned(next); }
    };
    read();
    sc.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => { sc.removeEventListener("scroll", read); window.removeEventListener("resize", read); };
  }, [anchor, on, full]);
  return pinned;
}

export const ContactPinnedRow: React.FC<{
  /** any element inside the page: the row is portalled into its page sheet */
  anchor: React.RefObject<HTMLElement | null>;
  /** this page is on screen, over a list */
  on: boolean;
  shown: boolean;
  total: number;
  showing: number;
  filtered: boolean;
  /** v18 §A — the list's letter counts, the current letter and the one pick */
  letterCounts: ReadonlyMap<string, number>;
  current: string | null;
  onLetter: (letter: string) => void;
  onClear: () => void;
  find: string;
  onFind: (v: string) => void;
  onAdd: () => void;
  onTop: () => void;
}> = ({ anchor, on, shown, total, showing, filtered, letterCounts, current, onLetter, onClear, find, onFind, onAdd, onTop }) => {
  /* the frame (box, height, cover, content row) is the shell's PinnedRow; this page styles only its contents */
  return (
    <PinnedRow anchor={anchor} on={on} shown={shown} className="cl17-pin" innerClassName="cl17-pin-in" attrs={{ "data-cl17": "pinned" }} innerAttrs={{ "data-cl17": "pinned-in" }}>
        <button type="button" className="cl17-pin-t" data-cl17="pinned-count" data-pin-text="" title="Back to the top" onClick={onTop}>
          {total} {total === 1 ? "agent" : "agents"}
        </button>
        {/* v18 §A — the compact letters take the group pills' place */}
        <LetterTabs variant="pin" counts={letterCounts} current={current} onPick={onLetter} />
        {filtered ? (
          <span className="cl17-pin-f" data-cl17="pinned-showing" role="status">
            <b>{showing}</b> of <b>{total}</b><span aria-hidden="true"> · </span>
            <button type="button" data-cl17="pinned-clear" onClick={onClear}>Clear</button>
          </span>
        ) : null}
        <span className="cl17-pin-sp" />
        <label className="cl17-pin-s" data-cl17="pinned-find">
          <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" autoComplete="off" />
        </label>
        <button type="button" className="cl17-pin-a" data-cl17="pinned-add" aria-label="Add an agent" onClick={onAdd}>
          <span className="cl18-pa-w" aria-hidden="true">+ Add an agent</span><span className="cl18-pa-p" aria-hidden="true">+</span>
        </button>
        <button type="button" className="cl17-pin-u" data-cl17="pinned-top" title="Back to the top" aria-label="Back to the top" onClick={onTop}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg>
        </button>
    </PinnedRow>
  );
};
