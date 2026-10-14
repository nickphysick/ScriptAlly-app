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
import React, { useEffect, useRef, useState } from "react";
import { GLYPHS, pressedGlyph, sentWords138, type GlyphKey, type StageSet } from "../../../lib/qc138";
import { StageGlyph } from "./StageGlyph";
import "./qcv138.css";

export const QC_EYEBROW = "— QUERY CENTRE —";
export const QC_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };

/**
 * v138 §H — a count ticks from 0 to its value over 520ms (ease-out cubic) after `delay`, on the first figures only.
 * `run` is read once, when the figure first arrives, so a later change of count never replays it.
 */
const TickIn: React.FC<{ n: number; delay: number; run: boolean }> = ({ n, delay, run }) => {
  const first = useRef(run && !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  const [shown, setShown] = useState(first.current ? 0 : n);
  const done = useRef(!first.current);
  useEffect(() => {
    if (done.current) { setShown(n); return undefined; }
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / 520));
      setShown(Math.round(n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step); else done.current = true;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); done.current = true; setShown(n); };
  }, [n, delay]);
  return <>{shown}</>;
};

export const GlyphRow: React.FC<{
  counts: Record<GlyphKey, number> | null;
  stages: StageSet;
  onGlyph: (k: GlyphKey) => void;
  loading: boolean;
  /** the page-load entrance has not finished yet: the counts tick in */
  entering?: boolean;
}> = ({ counts, stages, onGlyph, loading, entering = false }) => {
  const on = pressedGlyph(stages);
  return (
    <div className="qc138-gr" data-qc138="glyphs">
      <div className="qc138-gl" role="group" aria-label="Where your queries stand" data-on={on ?? undefined}>
        {GLYPHS.map((g, gi) => (
          <React.Fragment key={g.key}>
            {g.key === "cl" ? <i className="qc138-gdiv" aria-hidden="true" /> : null}
            <button type="button" className={`qc138-sg${g.key === "cl" ? " qc138-sg--cl" : ""}`} data-qc138="glyph-btn" data-k={g.key}
              data-yours={g.yours ? "" : undefined}
              aria-pressed={on === g.key} aria-label={`${g.name}, ${counts ? counts[g.key] : 0}`}
              disabled={loading} onClick={() => onGlyph(g.key)} style={{ ["--gi" as string]: gi }}>
              <span className="qc138-sgi"><StageGlyph k={g.key} /><b data-qc138="glyph-n">{counts ? <TickIn n={counts[g.key]} delay={140 + gi * 55} run={entering} /> : ""}</b></span>
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
  /** v138 §H — the page-load entrance has not finished */
  entering?: boolean;
  /** Part B — the filter row, under the header's rule */
  children?: React.ReactNode;
}> = ({ loading, total, msTitle, counts, stages, onGlyph, onLog, onRecord, logDisabled = false, logRef, entering = false, children }) => (
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
      <GlyphRow counts={loading ? null : counts} stages={stages} onGlyph={onGlyph} loading={loading} entering={entering} />
    </div>
    {children}
    <i className="qc138-sentinel" data-qc138="pin-sentinel" aria-hidden="true" />
  </header>
);
