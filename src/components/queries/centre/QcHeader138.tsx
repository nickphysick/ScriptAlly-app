/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §A — THE CENTRED LIGHT HEADER (Contact list v17.1's, on the page colour): the eyebrow,
 * "{N} queries sent", "for {manuscript}", two buttons, the hawk shadow behind the title, and on the right the
 * page's signature: the glyph row, seven large ink stage glyphs with their counts, which filter the list.
 *
 * ⚠️ NO ILLUSTRATION. The courier disc of v137 is gone; `hawk-shadow.png` stays, placed as v17.1 places it.
 * ⚠️ {N} IS THE MANUSCRIPT-SCOPED COUNT and the seven counts sum to it (`glyphCounts`).
 * ⚠️ THE GLYPHS SHARE THE STAGE SET WITH THE STAGE PILL (Part B): a press never scrolls.
 * ⚠️ THE TITLE KEEPS `data-page-title`, and takes focus from the pinned row's "back to the top".
 */
import React, { useLayoutEffect, useRef } from "react";
import { GLYPHS, pressedGlyph, sentWords138, type GlyphKey, type StageSet } from "../../../lib/qc138";
import { StageGlyph } from "./StageGlyph";
import "../../shell/pageHeroFrame.css"; /* v138.5 — the inset the Contact list reads too */
import "./qcv138.css";

export const QC_EYEBROW = "— QUERY CENTRE —";
export const QC_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };

/** "Partial requested, 2 queries" — the button's name; the hover label says "Partial requested · 2" */
export const glyphName138 = (name: string, n: number): string => `${name}, ${n} ${n === 1 ? "query" : "queries"}`;
export const glyphTip138 = (name: string, n: number): string => `${name} · ${n}`;

/**
 * v138.5 §B — THE STATUS GLYPHS, centred at the top of the header: seven 62 × 56 buttons with 38px glyphs, no counts
 * on show. Hover (or keyboard focus) shows a dark label 10px below, "{status} · {count}". Selection is the Stage
 * filter: a press sets it to that status and a second press clears it (`pressGlyph`), so the glyphs and the Stage
 * pill can never disagree.
 * ⚠️ NO NATIVE `title`: the label is the only tooltip. It is `aria-hidden`; the button's name carries the count.
 */
export const GlyphRow: React.FC<{
  counts: Record<GlyphKey, number> | null;
  stages: StageSet;
  onGlyph: (k: GlyphKey) => void;
  loading: boolean;
}> = ({ counts, stages, onGlyph, loading }) => {
  const on = pressedGlyph(stages);
  return (
    <div className="qc138-gl" role="group" aria-label="Where your queries stand" data-qc138="glyphs" data-on={on ?? undefined}>
      {GLYPHS.map((g, gi) => {
        const n = counts ? counts[g.key] : 0;
        return (
          <button key={g.key} type="button" className={`qc138-sg${g.key === "cl" ? " qc138-sg--cl" : ""}`} data-qc138="glyph-btn" data-k={g.key}
            data-yours={g.yours ? "" : undefined} data-n={counts ? n : undefined}
            aria-pressed={on === g.key} aria-label={glyphName138(g.name, n)}
            disabled={loading} onClick={() => onGlyph(g.key)} style={{ ["--gi" as string]: gi }}>
            <StageGlyph k={g.key} />
            <span className="qc138-gtip" data-qc138="glyph-tip" aria-hidden="true">{glyphTip138(g.name, n)}</span>
          </button>
        );
      })}
    </div>
  );
};

/** v138.5 §A — the desk hawk, left of the title (decorative) */
export const QC_DESK_HAWK = { src: "/images/query-centre/desk-hawk.webp", version: 1, w: 440, h: 405 };

export const QcHeader138: React.FC<{
  loading: boolean;
  /** the manuscript-scoped count; null while loading */
  total: number | null;
  msTitle: string | null;
  counts: Record<GlyphKey, number> | null;
  stages: StageSet;
  onGlyph: (k: GlyphKey) => void;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  /** v138 §H — the page-load entrance has not finished (v138.5: the glyphs show no counts, so nothing ticks in) */
  entering?: boolean;
  /** v138.5 §C — the header grid's right-hand column (the weekly chart) */
  chart?: React.ReactNode;
  /** Part B — the filter row, under the header's rule */
  children?: React.ReactNode;
}> = ({ loading, total, msTitle, counts, stages, onGlyph, onLog, onRecord, logDisabled = false, logRef, chart, children }) => {
  /* v138.5 §C — THE ONE WRITER of the chart card's height: the title block's own height (eyebrow to the foot of
     the buttons), written on the header grid on mount and whenever that block resizes. No polling. */
  const gridRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const g = gridRef.current, t = titleRef.current;
    if (!g || !t) return undefined;
    const write = () => g.style.setProperty("--qc138-bt-h", `${Math.round(t.getBoundingClientRect().height * 100) / 100}px`);
    write();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(write);
    ro.observe(t);
    return () => ro.disconnect();
  }, []);
  return (
  <header className="qc138-hd phf" data-qc138="header" data-qcv="open-header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    {/* header rules v1.1 (decision 4) — the status row is no longer rendered on this page: the Filters menu's "Where it
        stands" does its job, and the eyebrow is the first thing under the sheet's top. GlyphRow stays, unmounted. */}
    {/* v138.5 §A — the header grid: hawk · title block · spacer · chart. The hawk hangs out into the inset. */}
    <div className="qc138-hg phf-row" data-qc138="header-row" ref={gridRef}>
      <img className="qc138-hawk" data-qc138="hawk" alt="" aria-hidden="true" draggable={false}
        src={`${QC_DESK_HAWK.src}?v=${QC_DESK_HAWK.version}`} width={QC_DESK_HAWK.w} height={QC_DESK_HAWK.h} />
      <div className="qc138-bt" data-qc138="title-block" ref={titleRef}>
        <span className="qc138-ey" data-qc138="eyebrow">{QC_EYEBROW}</span>
        <h1 className="qc138-title" data-page-title="" data-qc138="title" tabIndex={-1}
          aria-label={total === null ? "Queries sent" : `${total} ${sentWords138(total)}`}>
          <span aria-hidden="true">
            {total === null ? <span className="qc138-blank" data-qc138="title-blank">00</span> : <span data-qc138="title-n">{total}</span>}
            {" "}{sentWords138(total ?? 0)}
          </span>
        </h1>
        <div className="qc138-by" data-qc138="byline">
          {msTitle ? <span className="qc138-byt">for <i className="qc138-ms" data-qc138="ms">{msTitle}</i></span> : <span className="qc138-byt">for every book</span>}
        </div>
        <div className="qc138-acts" data-qc138="acts">
          <button type="button" className="qc138-b1" data-qcv="oh-log" ref={logRef} disabled={loading || logDisabled} onClick={onLog}>+ Log a query</button>
          <button type="button" className="qc138-b2" data-qcv="oh-record" disabled={loading} onClick={onRecord}>Record a response</button>
        </div>
      </div>
      <span className="qc138-hsp" aria-hidden="true" />
      {/* v138.5 §D — the faint flying hawk, upper right, over the chart card at rest and under it on hover */}
      <img className="qc138-shadow" data-qc138="shadow" alt="" aria-hidden="true" src={`${QC_SHADOW.src}?v=${QC_SHADOW.version}`} />
      <div className="qc138-cc" data-qc138="chart-col">{chart}</div>
    </div>
    {children}
    <i className="qc138-sentinel" data-qc138="pin-sentinel" aria-hidden="true" />
  </header>
  );
};
