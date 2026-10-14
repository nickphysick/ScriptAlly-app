/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §A — THE PINNED ROW. Once the header has scrolled away, one slim page-coloured row lies along
 * the page sheet's top edge: the count (back to the top), the glyphs small in one white capsule (the header row's
 * own stage filter), a search box mirroring the header's, "+ Log a query" and ↑. Contact list v17's pattern.
 *
 * ⚠️ ITS BOX IS THE SHEET'S BY CONSTRUCTION: a child of `.ws-window` at `top: 0; left: 0; right: 0`, 68 tall.
 * ⚠️ JS DECIDES ONLY WHETHER IT SHOWS: a sentinel at the header's foot, read on scroll, with a hysteresis (on at
 *    12px under the scroller's top, off above 48), so a 1px scroll across the line cannot flip it.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: portalled only while this page is the one on screen.
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GLYPHS, pressedGlyph, type GlyphKey, type StageSet } from "../../../lib/qc138";
import { StageGlyph } from "./StageGlyph";

export const PIN_ON = 12;
export const PIN_OFF = 48;
export const nextPin = (was: boolean, gap: number): boolean => (was ? gap <= PIN_OFF : gap <= PIN_ON);

export function useQcPinned(anchor: React.RefObject<HTMLElement | null>, on: boolean): boolean {
  const [pinned, setPinned] = useState(false);
  useLayoutEffect(() => {
    if (!on) { setPinned(false); return undefined; }
    const group = anchor.current?.closest<HTMLElement>(".qcv-group") ?? anchor.current;
    const sc = group?.closest<HTMLElement>(".wpg-scroll");
    const sentinel = group?.querySelector<HTMLElement>('[data-qc138="pin-sentinel"]');
    if (!group || !sc || !sentinel) return undefined;
    let was = false;
    const read = () => {
      const s = sentinel.getBoundingClientRect();
      if (s.width === 0 && s.height === 0 && s.top === 0) return;
      const next = nextPin(was, s.top - sc.getBoundingClientRect().top);
      if (next !== was) { was = next; setPinned(next); }
    };
    read();
    sc.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => { sc.removeEventListener("scroll", read); window.removeEventListener("resize", read); };
  }, [anchor, on]);
  return pinned;
}

export const QcPinned138: React.FC<{
  anchor: React.RefObject<HTMLElement | null>;
  on: boolean;
  shown: boolean;
  total: number;
  counts: Record<GlyphKey, number>;
  stages: StageSet;
  onGlyph: (k: GlyphKey) => void;
  find: string;
  onFind: (v: string) => void;
  /** v138.1 §F — "/" focuses this field while the row is pinned */
  findRef?: React.Ref<HTMLInputElement>;
  onLog: () => void;
  onTop: () => void;
}> = ({ anchor, on, shown, total, counts, stages, onGlyph, find, onFind, findRef, onLog, onTop }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(on ? anchor.current?.closest<HTMLElement>(".ws-window") ?? null : null); }, [anchor, on]);
  if (!on || !host) return null;
  const pressed = pressedGlyph(stages);
  return createPortal(
    <div className="qc138-pin" data-qc138="pinned" data-on={shown ? "" : undefined} aria-hidden={shown ? undefined : true} inert={shown ? undefined : true}>
      <div className="qc138-pin-in">
        <button type="button" className="qc138-pin-t" data-qc138="pinned-count" title="Back to the top" onClick={onTop}>
          {total} {total === 1 ? "query" : "queries"}
        </button>
        <span className="qc138-pin-c" role="group" aria-label="Filter by stage" data-qc138="pinned-glyphs">
          {GLYPHS.map((g) => (
            <React.Fragment key={g.key}>
              {g.key === "cl" ? <i className="qc138-pin-div" aria-hidden="true" /> : null}
              <button type="button" data-qc138="pinned-glyph" data-k={g.key} aria-pressed={pressed === g.key}
                aria-label={`${g.name}, ${counts[g.key]}`} onClick={() => onGlyph(g.key)}>
                <StageGlyph k={g.key} /><b>{counts[g.key]}</b>
              </button>
            </React.Fragment>
          ))}
        </span>
        <span className="qc138-pin-sp" />
        <label className="qc138-pin-s" data-qc138="pinned-find">
          <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find a query" aria-label="Find a query" autoComplete="off" />
        </label>
        <button type="button" className="qc138-pin-a" data-qc138="pinned-log" onClick={onLog}>+ Log a query</button>
        <button type="button" className="qc138-pin-u" data-qc138="pinned-top" title="Back to the top" aria-label="Back to the top" onClick={onTop}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg>
        </button>
      </div>
    </div>,
    host,
  );
};
