/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v137 §B — "AT A GLANCE": one white strip of four cells (ref design-refs/query-centre/
 * query-centre-v137.html `.gl`). Queries sent, with its weekly bars; With you, With agents and Closed, each with
 * its agents' faces. It replaces v136's active and inactive bands.
 *
 * ⚠️ CHOOSING A CELL FILTERS THE LIST. Cells 2–4 set the list's court filter; pressing the pressed one, or cell 1,
 *    clears it. The court filter sits BESIDE the list's own one-value filter (the chips), and both apply. A press
 *    never scrolls.
 * ⚠️ THE FIGURES ARE v136's (`deskSections`, `facesFor`), in the strip's words (`lib/qcStrip`). Cell 1 is the three
 *    courts added up, so the four cells always agree.
 * ⚠️ THE BARS ARE DECORATION (`aria-hidden`): the line under the figure states the facts. Each bar's popup is the
 *    list's own popup (`useTip`).
 * ⚠️ WHILE LOADING every cell holds its size: the figure, the line, the bars and the faces are blanks of their boxes.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { TileCourt } from "../../../lib/qcSummary";
import type { DeskSection } from "../../../lib/qcDesk";
import type { Face } from "../../../lib/qcFaces";
import { sentLine, stripLine, type StripPart, type StripSent } from "../../../lib/qcStrip";
import { discsThatFit } from "./QcGlance";
import { useTip } from "./QcList132";
import "./qcvPage.css";
import "./qcvStrip137.css";

export const STRIP_LABEL: Record<"all" | TileCourt, string> = { all: "Queries sent", you: "With you", agent: "With agents", closed: "Closed" };
export const STRIP_HEADING = "At a glance";
export const STRIP_KICKER = "Where your queries are now";
export const STRIP_HINT = "Choose a card to filter the list";

const Line: React.FC<{ parts: readonly StripPart[]; loading: boolean }> = ({ parts, loading }) => (
  <span className={`qcs-line${loading ? " qcs-blank" : ""}`} data-qcv="strip-line">
    {parts.map((p, i) => (
      <React.Fragment key={i}>
        {i > 0 ? ", " : null}
        <b className={!loading && p.hot ? "is-hot" : undefined} data-qcv="strip-n" data-hot={!loading && p.hot ? "true" : "false"}>{loading ? 0 : p.n}</b> {p.text}
      </React.Fragment>
    ))}
  </span>
);

const Bars: React.FC<{ sent: StripSent; loading: boolean }> = ({ sent, loading }) => {
  const n = sent.weeks.length || 1;
  const max = Math.max(1, ...sent.weeks.map((w) => w.n));
  const slot = 100 / n, bw = slot * 0.64;
  return (
    <svg className={`qcs-bars${loading ? " qcs-blank" : ""}`} data-qcv="strip-bars" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      {!loading && sent.weeks.map((w, i) => {
        const x = i * slot + (slot - bw) / 2;
        const last = i === sent.weeks.length - 1;
        /* an empty week is a 1px tick; this week's is rust even when it is empty, so the last mark is always "now" */
        if (w.n === 0) return <rect key={w.start} data-qcv="strip-bar" data-n="0" data-last={last ? "true" : "false"} data-tip={w.tip} x={x} y={39} width={bw} height={1} fill={last ? "#a2452a" : "rgba(28, 19, 15, 0.15)"} />;
        const h = Math.max(3, (w.n / max) * 38);
        return <rect key={w.start} data-qcv="strip-bar" data-n={w.n} data-last={last ? "true" : "false"} data-tip={w.tip} x={x} y={40 - h} width={bw} height={h} rx={1.2} fill={last ? "#a2452a" : "#2d3a50"} />;
      })}
    </svg>
  );
};

const Faces: React.FC<{ court: TileCourt; faces: readonly Face[]; total: number; loading: boolean }> = ({ court, faces, total, loading }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ w: number; disc: number }>({ w: 0, disc: 26 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const w = el.clientWidth;
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--qcs-disc")) || 26;
      if (w > 0) setBox((b) => (b.w === w && b.disc === d ? b : { w, disc: d }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = loading ? 0 : discsThatFit(box.w, faces.length, total, box.disc, box.disc - 5, 40);
  const rest = total - k;
  return (
    <span ref={ref} className="qcs-faces" data-qcv="strip-faces" data-shown={loading ? undefined : k} aria-hidden="true">
      {faces.slice(0, k).map((f, i) => (
        <span key={f.id} className={`qcs-fc qcs-fc--${court}`} data-qcv="strip-face" data-tip={f.name} data-tl={f.line} style={{ zIndex: k - i }}>{f.initials}</span>
      ))}
      {!loading && rest > 0 && <span className="qcs-more" data-qcv="strip-more">+{rest}</span>}
    </span>
  );
};

export const QcStrip: React.FC<{
  sections: readonly DeskSection[];
  sent: StripSent;
  faces?: readonly Face[];
  /** the court the list is filtered to, or null */
  active?: TileCourt | null;
  /** a court cell: set that court, or clear it when it is already set */
  onCourt: (key: TileCourt) => void;
  /** cell 1: clear the court */
  onAll: () => void;
  loading?: boolean;
  /** cell 1: every query for the manuscript in view, withdrawn and signed included. It is the list's unfiltered count, and it need not be the three courts added up (they hold no withdrawn or signed query). */
  total: number;
}> = ({ sections, sent, faces = [], active = null, onCourt, onAll, loading = false, total }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tip = useTip(ref);
  const said = (label: string, n: number, parts: readonly StripPart[]) => (loading ? `${label}: loading` : `${label}: ${n}. ${parts.map((p) => `${p.n} ${p.text}`).join(", ")}`);
  const allParts = sentLine(sent);
  return (
    <section className="qcs" data-qcv="strip-wrap" aria-labelledby="qcs-h">
      <div className="qcs-head">
        <h2 className="qcs-h" id="qcs-h" data-qcv="strip-heading">{STRIP_HEADING}</h2>
        <span className="qcs-k" data-qcv="strip-kicker">{STRIP_KICKER}</span>
        <i className="qcs-hint" data-qcv="strip-hint">{STRIP_HINT}</i>
      </div>
      <div ref={ref} className="qcs-box" data-qcv="strip" data-loading={loading ? "true" : "false"} {...tip.handlers}>
        <button type="button" className="qcs-cell" data-qcv="strip-cell" data-k="all" aria-pressed={false} disabled={loading}
          aria-label={`${said(STRIP_LABEL.all, total, allParts)}. Show all`} onClick={onAll}>
          <span className="qcs-lb" data-qcv="strip-label">{STRIP_LABEL.all}</span>
          <span className="qcs-cue" aria-hidden="true">Show all</span>
          <b className={`qcs-fig${loading ? " qcs-blank" : ""}`} data-qcv="strip-fig">{loading ? "00" : total}</b>
          <Line parts={allParts} loading={loading} />
          <span className="qcs-foot"><Bars sent={sent} loading={loading} /></span>
        </button>
        {sections.map((s) => {
          const parts = stripLine(s);
          const on = active === s.key;
          return (
            <button key={s.key} type="button" className={`qcs-cell${on ? " is-on" : ""}`} data-qcv="strip-cell" data-k={s.key} aria-pressed={on} disabled={loading}
              aria-label={`${said(STRIP_LABEL[s.key], s.total, parts)}. ${on ? "Showing these in the list" : "Show these in the list"}`} onClick={() => onCourt(s.key)}>
              <span className="qcs-lb" data-qcv="strip-label">{STRIP_LABEL[s.key]}</span>
              <span className="qcs-cue" aria-hidden="true">Show these ↓</span>
              <b className={`qcs-fig${loading ? " qcs-blank" : ""}`} data-qcv="strip-fig">{loading ? "00" : s.total}</b>
              <Line parts={parts} loading={loading} />
              <span className="qcs-foot"><Faces court={s.key} faces={faces.filter((f) => f.court === s.key)} total={s.total} loading={loading} /></span>
            </button>
          );
        })}
      </div>
      {tip.node}
    </section>
  );
};
