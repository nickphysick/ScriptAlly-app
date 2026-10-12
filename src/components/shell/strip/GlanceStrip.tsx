/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "At a glance" strip, as a shared part (Comparable titles v25, Part B): a heading with a mono
 * tag and a hint, over one white box of pressable cells. Each cell is a label, a figure, one line
 * and a foot.
 *
 * It is the Query Centre v137 strip's box, cells, type and press behaviour (`QcStrip`,
 * `qcvStrip137.css`), built beside it and not lifted from it: that component is bound to the Query
 * Centre's own data and was out of this pack's scope. The Query Centre adopting this part is a
 * follow-up; until then there are two, deliberately.
 *
 * ⚠️ A LOADING CELL HOLDS ITS SIZE: the figure, the line and the foot are drawn and hidden, never
 * left out, so the box is the same height before the data lands as after.
 */
import React from "react";
import "./glanceStrip.css";

export interface GlanceCellProps {
  /** a stable key for probes and locks */
  k: string;
  label: string;
  /** the hover cue, top right ("Show all", "Show these ↓") */
  cue?: string;
  figure: React.ReactNode;
  line: React.ReactNode;
  foot?: React.ReactNode;
  pressed?: boolean;
  onPress: () => void;
}

export const GlanceStrip: React.FC<{
  probe: string;
  heading: string;
  tag: string;
  hint: string;
  loading?: boolean;
  cells: readonly GlanceCellProps[];
  className?: string;
}> = ({ probe, heading, tag, hint, loading = false, cells, className }) => {
  const id = `gst-h-${probe}`;
  return (
    <section className={`gst${className ? ` ${className}` : ""}`} data-gst={probe} aria-labelledby={id}>
      <div className="gst-head">
        <h2 className="gst-h" id={id}>{heading}</h2>
        <span className="gst-k">{tag}</span>
        <i className="gst-hint">{hint}</i>
      </div>
      <div className="gst-box" data-gst-box="" data-loading={loading ? "true" : "false"} aria-busy={loading || undefined}>
        {cells.map((c) => (
          <button key={c.k} type="button" className={`gst-cell${c.pressed ? " is-on" : ""}`} data-gst-cell={c.k}
            aria-pressed={!!c.pressed} disabled={loading} onClick={c.onPress}>
            <span className="gst-lb">{c.label}</span>
            {c.cue && <span className="gst-cue" aria-hidden="true">{c.cue}</span>}
            <b className={`gst-fig${loading ? " gst-blank" : ""}`} data-gst-fig="">{loading ? "00" : c.figure}</b>
            <span className={`gst-line${loading ? " gst-blank" : ""}`} data-gst-line="">{loading ? "Loading" : c.line}</span>
            <span className={`gst-foot${loading ? " gst-blank" : ""}`} data-gst-foot="">{loading ? null : c.foot}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
