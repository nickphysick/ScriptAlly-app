/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §C — THE PINNED BAND (ref design-refs/query-centre-v140/, screens 09–12): navy, 72 tall, the
 * sheet's full width, above the cream toolbar. Left to right:
 *
 *   "{N} queries sent" · the breakdown (v141 §E) · the heard-back ring · + Log a query
 *
 * v141 §E (ref design-refs/query-centre-v141/, the mock's `.pband.b2`): the overdue pill and the weekly chart are gone;
 * the breakdown takes the width between hairlines — the four sets' bar along its top, the four sets beneath it, each a
 * button setting the one "Where it stands" filter (`Qc138Filters.where`), shared with the hero card and the Filters menu.
 * When the sets would collide (MEASURED, not a breakpoint) the band goes `tight`: the labels shorten, the ring's subline
 * and the "queries sent" words shrink; still colliding, `tighter`, and the words go (the number stays).
 *
 * and the desk hawk (the hero's drawing) 22 from the sheet's left, running down from the band onto the toolbar.
 *
 * Built from Contact list v19's pinned band (`agents/contact/ContactListHead`, page-local): a lift candidate.
 *
 * ⚠️ THE FIGURES: the four sets are lib/qcSummary `whereCounts` (the hero card's, so the two cannot disagree); heard
 *    back is `bandFigures` (lib/qc140), `placeOf`'s "more" and "passed" over every query.
 * ⚠️ THE DRAWING IS NEVER CLIPPED: it keeps its natural aspect (440 × 405, so 137 × 126), is absolutely placed inside
 *    the sticky stack and lies above the band and the toolbar (z 3) and clear of every control, which start 196 in.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { QC_DESK_HAWK } from "./QcHeader138";
import type { BandFigures } from "../../../lib/qc140";
import { sentWords138 } from "../../../lib/qc138";
import { WHERE_KEYS, WHERE_LABEL, type WhereKey } from "../../../lib/qcSummary";
import { WhereBar, WhereMark } from "./QcWhere141";

/** the ring: r 15 on a 40 box, a 5px stroke; the arc starts at twelve o'clock */
const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

type Fit = "" | "tight" | "tighter";
/** do any two of these boxes overlap (or run past the right edge)? */
const collides = (els: HTMLElement[], right: number, ink = false): boolean => {
  /* `ink`: a set's 9px of side padding is invisible until it is hovered or pressed, so two sets collide when their
     CONTENT boxes do (the mock's own spacing has the padding boxes overlap by design) */
  const bs = els.map((e) => {
    const r = e.getBoundingClientRect();
    if (!ink) return { left: r.left, right: r.right, width: r.width };
    const cs = getComputedStyle(e);
    const l = r.left + parseFloat(cs.paddingLeft), rr = r.right - parseFloat(cs.paddingRight);
    return { left: l, right: rr, width: rr - l };
  }).filter((b) => b.width > 0);
  for (let i = 0; i < bs.length; i++) {
    if (bs[i].right > right + 0.5) return true;
    if (i > 0 && bs[i].left < bs[i - 1].right - 0.5) return true;
  }
  return false;
};

export const QcBand140: React.FC<{
  fig: BandFigures;
  counts: Record<WhereKey, number>;
  where: WhereKey | null;
  onWhere: (k: WhereKey) => void;
  onLog: () => void;
  loading?: boolean;
}> = ({ fig, counts, where, onWhere, onLog, loading = false }) => {
  const arc = (Math.min(100, Math.max(0, fig.heardPct)) / 100) * RING_C;
  const answered = fig.more + fig.passed;
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>("");
  const sig = `${fig.total}|${WHERE_KEYS.map((k) => counts[k]).join(",")}|${fig.heardPct}`;
  /* §E — tight / tighter, MEASURED: the band's direct children and the breakdown's buttons, each against its neighbour */
  useLayoutEffect(() => {
    const band = ref.current;
    if (!band) return undefined;
    const measure = () => {
      if (band.clientWidth === 0) return;
      const bad = () => {
        const kids = [...band.children].filter((c) => !c.classList.contains("qc140-bart")) as HTMLElement[];
        const right = band.getBoundingClientRect().right;
        const sets = [...band.querySelectorAll<HTMLElement>("[data-qc141='band-set']")];
        /* the sets hang 9px past their row by design (the mock's -9 margin, so a pressed set's fill reaches into the
           breakdown's padding): measure their ink against the breakdown's content edge */
        const bk = band.querySelector<HTMLElement>("[data-qc141='band-breakdown']");
        return collides(kids, right) || collides(sets, bk ? bk.getBoundingClientRect().right - parseFloat(getComputedStyle(bk).paddingRight) : right, true);
      };
      let next: Fit = "";
      for (const f of ["", "tight", "tighter"] as Fit[]) {
        band.classList.remove("tight", "tighter");
        if (f) band.classList.add(f);
        if (f === "tighter") band.classList.add("tight");
        next = f;
        if (!bad()) break;
      }
      /* leave the classes as the result says, so a render that does not change `fit` keeps them */
      band.classList.remove("tight", "tighter");
      if (next) band.classList.add("tight");
      if (next === "tighter") band.classList.add("tighter");
      band.dataset.fit = next || "full";
      setFit((cur) => (cur === next ? cur : next));
    };
    measure();
    let live = true;
    void document.fonts?.ready.then(() => { if (live) measure(); });
    if (typeof ResizeObserver === "undefined") return () => { live = false; };
    let w = band.clientWidth;
    const ro = new ResizeObserver(() => { if (band.clientWidth !== w) { w = band.clientWidth; measure(); } });
    ro.observe(band);
    return () => { live = false; ro.disconnect(); };
  }, [sig]);
  return (
    <div className={`qc140-band qc141-band${fit === "tighter" ? " tight tighter" : fit === "tight" ? " tight" : ""}`} data-qc140="band" data-fit={fit || "full"} ref={ref}>
      <img className="qc140-bart" data-qc140="band-art" src={`${QC_DESK_HAWK.src}?v=${QC_DESK_HAWK.version}`} width={QC_DESK_HAWK.w} height={QC_DESK_HAWK.h}
        alt="" aria-hidden="true" draggable={false} />
      <p className="qc140-bn" data-qc140="band-count">
        <b data-qc140="band-figure">{fig.total}</b><span>{sentWords138(fig.total)}</span>
      </p>
      <div className={`qc141-bk${where ? " pk" : ""}`} data-qc141="band-breakdown">
        <WhereBar counts={counts} className="qc141-bsb" />
        <div className="qc141-rws">
          {WHERE_KEYS.map((k) => {
            const on = where === k;
            return (
              <button key={k} type="button" className={on ? "on" : undefined} data-qc141="band-set" data-k={k} data-n={counts[k]} aria-pressed={on} disabled={loading}
                title={`${WHERE_LABEL[k].label}: ${counts[k]}`} onClick={() => onWhere(k)}>
                <WhereMark k={k} tone="band" /><b>{counts[k]}</b><span className="qc141-lf">{WHERE_LABEL[k].label}</span><span className="qc141-ls">{WHERE_LABEL[k].short}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="qc140-hb" data-qc140="band-heard" title={`${answered} of ${fig.total} ${fig.total === 1 ? "agent has" : "agents have"} answered`}>
        <svg className="qc140-ring" data-qc140="band-ring" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
          <circle cx="20" cy="20" r={RING_R} fill="none" stroke="rgba(244,238,229,.18)" strokeWidth="5" />
          {arc > 0 ? (
            <circle cx="20" cy="20" r={RING_R} fill="none" stroke="#f4eee5" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${arc} ${RING_C}`} transform="rotate(-90 20 20)" />
          ) : null}
        </svg>
        <span className="qc140-bt">
          <b data-qc140="band-heard-pct">{fig.heardPct}% heard back</b>
          <small data-qc140="band-more">{answered} of {fig.total} {fig.total === 1 ? "agent" : "agents"}</small>
        </span>
      </div>
      <button type="button" className="qc140-blog" data-qc140="band-log" onClick={onLog}>+ Log a query</button>
    </div>
  );
};
