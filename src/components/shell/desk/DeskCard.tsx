/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK CARD (Contact list v15.2 §2; ref design-refs/contact-list-v15-2.html `.ic-it`): a white card with an ink
 * disc icon breaking out of its top-left corner, one line of text, a month-on-month line and a small chart at the
 * bottom right. Built for the Contact list and named for a swap.
 *
 * ⚠️ v15's LEDGER CARD (title row, stamp, two tiled rows, hatched trend, weekly bars, striped bar) IS RETIRED FROM THIS
 *    FILE. The Query Centre's own stamp and sparkline (`QcDesk.tsx`, `qcv131.css`) were never read from here and are
 *    untouched.
 * ⚠️ THE CHARTS ARE `aria-hidden`; THE CARD'S ACCESSIBLE LABEL SAYS WHAT THEY DRAW.
 * ⚠️ A PRESSABLE CARD is a group with a full-cover button behind its contents, so the whole card answers a press and
 *    the contents stay plain text for a reader.
 */
import React from "react";
import "./desk.css";

export interface DeskMoM { dir: "up" | "down" | "none"; text: string }

export const DeskCard: React.FC<{
  probe: string;
  icon: React.ReactNode;
  /** the line: the figure, then the rest ("41" + "agents on file") */
  figure: string;
  rest: string;
  /** the whole card, said aloud (the charts are hidden from assistive tech) */
  label: string;
  /** the month-on-month line; null hides it (nothing true to say) */
  mom: DeskMoM | null;
  chart: React.ReactNode;
  /** the full-cover press, and its accessible name; absent = the card is not pressable */
  onPress?: () => void;
  pressLabel?: string;
}> = ({ probe, icon, figure, rest, label, mom, chart, onPress, pressLabel }) => (
  <section className={`dsk-card${onPress ? " is-press" : ""}`} role="group" aria-label={label} data-dk={probe}>
    {onPress && <button type="button" className="dsk-hit" data-dk-press={probe} aria-label={pressLabel ?? label} onClick={onPress} />}
    <span className="dsk-disc" data-dk-part="disc" aria-hidden="true">{icon}</span>
    <p className="dsk-line" data-dk-part="line"><b data-dk-part="figure">{figure}</b> {rest}</p>
    <div className="dsk-foot">
      {mom ? (
        <span className={`dsk-mom is-${mom.dir}`} data-dk-part="mom" data-dir={mom.dir}>
          {mom.dir !== "none" && (
            <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
              <path d={mom.dir === "up" ? "M6 2.2 10 7.4H2z" : "M6 9.8 2 4.6h8z"} fill="currentColor" />
            </svg>
          )}
          {mom.text}
        </span>
      ) : <span />}
      {chart}
    </div>
  </section>
);

/* ── the charts ── */

const LW = 112, LH = 38;
/** A line: the values across a 112 × 38 box (inset 3 at each side, 6 from the top, 4 from the foot), a 7% fill under
    it and an end dot. One `<path>` carries the line; its points are published for the lock. */
export const LineChart: React.FC<{ values: readonly number[]; caption: string }> = ({ values, caption }) => {
  const v = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const max = Math.max(...v), min = Math.min(...v), span = Math.max(1, max - min);
  const pts = v.map((y, i) => [3 + (i * (LW - 6)) / (v.length - 1), LH - 4 - ((y - min) / span) * (LH - 10)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <span className="dsk-chart" data-dk-chart="line" aria-hidden="true">
      <svg className="dsk-svg dsk-svg--line" viewBox={`0 0 ${LW} ${LH}`}>
        <path d={`${d} L${last[0].toFixed(1)},${LH} L${pts[0][0].toFixed(1)},${LH} Z`} fill="#2a3a52" fillOpacity=".07" />
        <path data-dk-line={values.join(",")} d={d} fill="none" stroke="#2a3a52" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="3.2" fill="#2a3a52" />
      </svg>
      <small>{caption}</small>
    </span>
  );
};

/** A ring from 12 o'clock on a 42-unit box (circumference 100): active in ink, closed in pale blue, the rest the track. */
export const RingChart: React.FC<{ active: number; closed: number; total: number; caption: string }> = ({ active, closed, total, caption }) => {
  const share = (n: number) => (total > 0 ? Math.max(0, Math.min(100, (n / total) * 100)) : 0);
  const a = share(active), c = Math.min(100 - a, share(closed));
  const arc = (len: number, from: number, colour: string, part: string) => len > 0 && (
    <circle data-dk-arc={part} data-dk-share={len.toFixed(2)} r="15.915" cx="21" cy="21" fill="none" stroke={colour} strokeWidth="6"
      strokeDasharray={`${len.toFixed(2)} ${(100 - len).toFixed(2)}`} strokeDashoffset={(25 - from).toFixed(2)} />
  );
  return (
    <span className="dsk-chart" data-dk-chart="ring" aria-hidden="true">
      <svg className="dsk-svg dsk-svg--ring" viewBox="0 0 42 42">
        <circle r="15.915" cx="21" cy="21" fill="none" stroke="#e6eaef" strokeWidth="6" />
        {arc(a, 0, "#2a3a52", "active")}
        {arc(c, a, "#9fb0c4", "closed")}
      </svg>
      <small>{caption}</small>
    </span>
  );
};

/** A bar: the share filled, in ink on a pale track. */
export const BarChart: React.FC<{ pct: number; caption: string }> = ({ pct, caption }) => (
  <span className="dsk-chart" data-dk-chart="bar" aria-hidden="true">
    <span className="dsk-pg"><i data-dk-fill={pct} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></span>
    <small>{caption}</small>
  </span>
);
