/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK CARD — a ledger card in the Query Centre desk's language (Contact list v15 §3): a title with an icon circle,
 * a rubber stamp, a big figure beside two tiled rows, and a small chart. Built for the Contact list and named for a swap.
 *
 * ⚠️ THE STAMP AND THE HATCHED TREND ARE COPIES OF THE QUERY CENTRE'S (ruling 2) — `QcDesk.tsx` (`Trend`, `smooth`,
 * `trendPoints`) and `qcv131.css` (`.qc131-stamp`). The Query Centre keeps its own until a later prompt unifies the two;
 * change one and you must look at the other.
 *
 * ⚠️ A CARD'S OWN COLOUR SHOWS ONLY IN ITS ICON CIRCLE, ITS STAMP AND ITS CHART (§1.6). The title is ink.
 * ⚠️ A PRESSABLE CARD is a group with a full-cover button behind its contents (the Query Centre desk's pattern), so the
 *    whole card answers a press and the contents stay plain text for a reader.
 */
import React, { useId } from "react";
import "./desk.css";

export interface DeskRowView { n: number; text: string; tone?: "blue" | "terra" }

export const DeskCard: React.FC<{
  probe: string;
  title: string;
  icon: React.ReactNode;
  /** the card's colour, and its 12% tint (pre-computed — never a runtime colour-mix) */
  colour: string;
  tint: string;
  /** the progress stripe's second colour (absent = one colour) */
  colour2?: string;
  stamp: string | null;
  big: string;
  small: string | null;
  rows: readonly DeskRowView[];
  chart: React.ReactNode;
  /** the full-cover press, and its accessible name; absent = the card is not pressable */
  onPress?: () => void;
  pressLabel?: string;
}> = ({ probe, title, icon, colour, tint, colour2, stamp, big, small, rows, chart, onPress, pressLabel }) => (
  <section className={`dsk-card${onPress ? " is-press" : ""}`} role="group" aria-label={title} data-dk={probe}
    style={{ ["--dk-c" as string]: colour, ["--dk-tint" as string]: tint, ...(colour2 ? { ["--dk-c2" as string]: colour2 } : {}) } as React.CSSProperties}>
    {onPress && <button type="button" className="dsk-hit" data-dk-press={probe} aria-label={pressLabel ?? title} onClick={onPress} />}
    <header className="dsk-hd">
      <h3 className="dsk-title" data-dk-part="title"><span className="dsk-ic" aria-hidden="true">{icon}</span>{title}</h3>
      {stamp && <span className="dsk-stamp" data-dk-part="stamp">{stamp}</span>}
    </header>
    <div className="dsk-body">
      <div className="dsk-big"><b data-dk-part="big">{big}</b>{small && <small data-dk-part="small">{small}</small>}</div>
      <ul className="dsk-rows">
        {rows.map((r, i) => (
          <li key={i} className="dsk-row" data-dk-part="row">
            <span className={`dsk-tile${r.tone ? ` is-${r.tone}` : ""}`}>{r.n}</span><span className="dsk-lb">{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
    {chart}
  </section>
);

/* ── the charts ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The trend's box: a 340×40 viewBox stretched to the card (the Query Centre's is 340×52; the brief's chart is 40). */
const TW = 340, TH = 40;
/** Points across the box, inset 4 at each end; heights to the series' own maximum. (Copied from QcDesk.) */
function trendPoints(values: readonly number[]): [number, number][] {
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const n = values.length;
  return values.map((v, i) => [4 + (i * (TW - 8)) / Math.max(1, n - 1), TH - 5 - ((v - min) / span) * (TH - 14)]);
}
/** Catmull-Rom through the points, written as cubic Béziers. (Copied from QcDesk.) */
function smooth(p: readonly [number, number][]): string {
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** The hatched line: the running count as an inked line over hatching, ending in a ringed dot. (QcDesk's `Trend`.) */
export const HatchedTrend: React.FC<{ values: readonly number[]; label: string; startLabel: string }> = ({ values, label, startLabel }) => {
  const uid = useId().replace(/:/g, "");
  const P = trendPoints(values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0]);
  const line = smooth(P);
  const last = P[P.length - 1];
  return (
    <div className="dsk-chart" data-dk-chart="trend">
      <div className="dsk-plot"><svg viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <defs>
          <filter id={`dkpen-${uid}`} x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves={2} seed={3} />
            <feDisplacementMap in="SourceGraphic" scale="1.3" />
          </filter>
          <pattern id={`dkhatch-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--dk-c)" strokeWidth="1.1" opacity=".35" />
          </pattern>
        </defs>
        <path d={`${line} L${last[0]} ${TH} L${P[0][0]} ${TH}Z`} fill={`url(#dkhatch-${uid})`} filter={`url(#dkpen-${uid})`} />
        <path d={line} fill="none" stroke="var(--dk-c)" strokeWidth="2.2" strokeLinecap="round" filter={`url(#dkpen-${uid})`} />
        <circle cx={last[0]} cy={last[1]} r="4" fill="var(--dk-c)" />
        <circle cx={last[0]} cy={last[1]} r="7" fill="none" stroke="var(--dk-c)" strokeWidth="1" opacity=".5" />
      </svg></div>
      <div className="dsk-ax" aria-hidden="true"><span>{startLabel}</span><span>Now</span></div>
    </div>
  );
};

/** Weekly bars: this week solid, the earlier weeks at 45%; the axis names the first week's month, the series and Now. */
export const WeekBarChart: React.FC<{ values: readonly number[]; label: string; startLabel: string; middle: string }> = ({ values, label, startLabel, middle }) => {
  const max = Math.max(1, ...values);
  return (
    <div className="dsk-chart" data-dk-chart="bars">
      <div className="dsk-bars" role="img" aria-label={label}>
        {values.map((v, i) => (
          <i key={i} className={i === values.length - 1 ? "is-now" : undefined} data-dk-bar={v} style={{ height: `${Math.max(7.5, (v / max) * 100)}%` }} />
        ))}
      </div>
      <div className="dsk-ax" aria-hidden="true"><span>{startLabel}</span><span>{middle}</span><span>Now</span></div>
    </div>
  );
};

/** A progress bar (not a line): a striped fill on a light track, the label on the left and nothing on the right. */
export const ProgressChart: React.FC<{ filled: number; total: number; label: string }> = ({ filled, total, label }) => {
  const pct = total ? Math.min(100, Math.max(0, (filled / total) * 100)) : 0;
  return (
    <div className="dsk-chart" data-dk-chart="progress">
      <div className="dsk-pgw"><span className="dsk-pgb" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled} aria-label={label}>
        <i style={{ width: `${pct}%` }} />
      </span></div>
      <div className="dsk-ax" aria-hidden="true"><span>{label}</span></div>
    </div>
  );
};
