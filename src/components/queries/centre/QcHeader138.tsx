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
import React from "react";
import { GLYPHS, pressedGlyph, sentWords138, type GlyphKey, type StageSet } from "../../../lib/qc138";
import { StageGlyph } from "./StageGlyph";
import "./qcv138.css";

export const QC_EYEBROW = "— QUERY CENTRE —";
export const QC_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };

export const GlyphRow: React.FC<{
  counts: Record<GlyphKey, number> | null;
  stages: StageSet;
  onGlyph: (k: GlyphKey) => void;
  loading: boolean;
}> = ({ counts, stages, onGlyph, loading }) => {
  const on = pressedGlyph(stages);
  return (
    <div className="qc138-gr" data-qc138="glyphs">
      <div className="qc138-gl" role="group" aria-label="Where your queries stand" data-on={on ?? undefined}>
        {GLYPHS.map((g) => (
          <React.Fragment key={g.key}>
            {g.key === "cl" ? <i className="qc138-gdiv" aria-hidden="true" /> : null}
            <button type="button" className={`qc138-sg${g.key === "cl" ? " qc138-sg--cl" : ""}`} data-qc138="glyph-btn" data-k={g.key}
              data-yours={g.yours ? "" : undefined}
              aria-pressed={on === g.key} aria-label={`${g.name}, ${counts ? counts[g.key] : 0}`}
              disabled={loading} onClick={() => onGlyph(g.key)}>
              <span className="qc138-sgi"><StageGlyph k={g.key} /><b data-qc138="glyph-n">{counts ? counts[g.key] : ""}</b></span>
              <span className="qc138-sgl" aria-hidden="true">{g.lines[0]}{g.lines[1] ? <><br />{g.lines[1]}</> : null}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
      <div className="qc138-key" data-qc138="key">
        <span><StageGlyph k="key" className="qc138-kk" /> Dashed ring: your move</span>
        <span>Tap a glyph to filter</span>
      </div>
    </div>
  );
};

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
  /** Part B — the filter row, under the header's rule */
  children?: React.ReactNode;
}> = ({ loading, total, msTitle, counts, stages, onGlyph, onLog, onRecord, logDisabled = false, logRef, children }) => (
  <header className="qc138-hd" data-qc138="header" data-qcv="open-header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <img className="qc138-shadow" data-qc138="shadow" alt="" aria-hidden="true" src={`${QC_SHADOW.src}?v=${QC_SHADOW.version}`} />
    <div className="qc138-tr" data-qc138="header-row">
      <div className="qc138-tb" data-qc138="title-block">
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
      </div>
      <div className="qc138-acts" data-qc138="acts">
        <button type="button" className="qc138-b1" data-qcv="oh-log" ref={logRef} disabled={loading || logDisabled} onClick={onLog}>+ Log a query</button>
        <button type="button" className="qc138-b2" data-qcv="oh-record" disabled={loading} onClick={onRecord}>Record a response</button>
      </div>
      <GlyphRow counts={loading ? null : counts} stages={stages} onGlyph={onGlyph} loading={loading} />
    </div>
    {children}
    <i className="qc138-sentinel" data-qc138="pin-sentinel" aria-hidden="true" />
  </header>
);
