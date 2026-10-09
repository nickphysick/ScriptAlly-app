/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK CARD (Contact list v15.2 §2; ref design-refs/contact-list-v15-2.html `.ic-it`): a white card with an ink
 * disc icon breaking out of its top-left corner, one line of text, a comparison line and a small chart (weekly bars,
 * a ring or a bar) at the bottom right. Built for the Contact list and named for a swap.
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
  /** the comparison line (month on month, or week on week); null hides it (nothing true to say) */
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
/* ⚠️ THE LINE CHART (v15.2's six month-end points) IS RETIRED with the On file card it drew (v15.3). Recover it from
   `aa4e299a` if a line is ever wanted back. */
/** Weekly bars (v15.3 §4): one bar per week on a 112 × 38 box, oldest first. Each bar is inset 2.5 at each side of its
    slot; the LAST (this week) is solid ink and the earlier ones ink at 22%; a week with none is a 2-unit stub. */
export const WeekBars: React.FC<{ values: readonly number[]; caption: string }> = ({ values, caption }) => {
  const max = Math.max(1, ...values), slot = LW / Math.max(1, values.length);
  return (
    <span className="dsk-chart" data-dk-chart="weeks" data-dk-bars={values.join(",")} aria-hidden="true">
      <svg className="dsk-svg dsk-svg--bars" viewBox={`0 0 ${LW} ${LH}`}>
        {values.map((v, i) => {
          const h = v > 0 ? Math.max(2, (v / max) * (LH - 2)) : 2;
          return <rect key={i} data-dk-bar={v} x={(i * slot + 2.5).toFixed(1)} y={(LH - h).toFixed(1)} width={(slot - 5).toFixed(1)} height={h.toFixed(1)} rx="2"
            fill="#2a3a52" fillOpacity={i === values.length - 1 ? 1 : 0.22} />;
        })}
      </svg>
      <small>{caption}</small>
    </span>
  );
};

/** A ring from 12 o'clock on a 42-unit box (circumference 100): active in ink, closed in GREY (v15.3 §5: closed is grey
    everywhere on this page — the faces, the key and this arc), the rest the track. */
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
        {arc(c, a, "#b3aca5", "closed")}
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
