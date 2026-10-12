/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §B — "AT A GLANCE": one white strip of four cells (ref design-refs/contact-list-v16/
 * contact-list-v16.html `#gl`). On file, with its weekly bars; Not queried, Querying and Closed, each with its
 * agents' faces. It replaces the desk on the populated page.
 *
 * ⚠️ BUILT BESIDE THE QUERY CENTRE'S `QcStrip`, NOT SHARED WITH IT (recon §0.3): that strip derives its cells
 *    inside, from the Query Centre's own courts, sections and faces, and cannot take cells as props. This one
 *    wears the SAME CLASSES (`.qcs-*`, queries/centre/qcvStrip137.css, already in the one stylesheet), so the box,
 *    the cells, the type, the hover cue, the pressed state, the blanks and the two folds are v137's own rules,
 *    value for value. The lift is listed in the report: one `GlanceStrip` taking `cells`, read by both pages.
 * ⚠️ CHOOSING A CELL FILTERS THE LIST AND NEVER SCROLLS. Cells 2–4 set the list's group; pressing the pressed one,
 *    or cell 1, clears it. The group sits BESIDE the chips, and both apply.
 * ⚠️ THE FACES ARE DECORATION (`aria-hidden`), NOT DOORS: they sit inside the cell's button, and the line above
 *    them states the facts. A press on a face presses its cell.
 * ⚠️ WHILE LOADING every cell holds its size: the figure, the line, the bars and the faces are blanks of their boxes.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { GLANCE_LABEL, type GlanceCell, type GlanceFace, type GlanceKey, type GlanceModel, type GlancePart, type GlanceWeek } from "../../../lib/contactGlance";
import { discsThatFit } from "../../queries/centre/QcGlance";
import "./contactV16.css";

export const GLANCE_HEADING = "At a glance";
export const GLANCE_KICKER = "Where your agents stand";
export const GLANCE_HINT = "Choose a card to filter the list";
/** at most seven faces, then "+{rest}" */
export const GLANCE_FACES = 7;

const Line: React.FC<{ parts: readonly GlancePart[]; loading: boolean }> = ({ parts, loading }) => (
  <span className={`qcs-line${loading ? " qcs-blank" : ""}`} data-cl16="strip-line">
    {parts.map((p, i) => (
      <React.Fragment key={i}>
        {i > 0 ? ", " : null}
        <b className={!loading && p.hot ? "is-hot" : undefined} data-cl16="strip-n" data-hot={!loading && p.hot ? "true" : "false"}>{loading ? 0 : p.n}</b> {p.text}
      </React.Fragment>
    ))}
  </span>
);

const Bars: React.FC<{ weeks: readonly GlanceWeek[]; loading: boolean }> = ({ weeks, loading }) => {
  const n = weeks.length || 1;
  const max = Math.max(1, ...weeks.map((w) => w.n));
  const slot = 100 / n, bw = slot * 0.64;
  return (
    <svg className={`qcs-bars${loading ? " qcs-blank" : ""}`} data-cl16="strip-bars" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      {!loading && weeks.map((w, i) => {
        const x = i * slot + (slot - bw) / 2;
        const last = i === weeks.length - 1;
        /* an empty week is a 1px tick; this week's is rust even when it is empty, so the last mark is always "now" */
        if (w.n === 0) return <rect key={w.start} data-cl16="strip-bar" data-n="0" data-last={last ? "true" : "false"} x={x} y={39} width={bw} height={1} fill={last ? "#a2452a" : "rgba(28, 19, 15, 0.15)"}><title>{w.tip}</title></rect>;
        const h = Math.max(3, (w.n / max) * 38);
        return <rect key={w.start} data-cl16="strip-bar" data-n={w.n} data-last={last ? "true" : "false"} x={x} y={40 - h} width={bw} height={h} rx={1.2} fill={last ? "#a2452a" : "#2d3a50"}><title>{w.tip}</title></rect>;
      })}
    </svg>
  );
};

const Faces: React.FC<{ k: GlanceKey; faces: readonly GlanceFace[]; total: number; loading: boolean }> = ({ k, faces, total, loading }) => {
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
  /* one row: as many as fit, never more than seven */
  const shown = loading ? 0 : Math.min(GLANCE_FACES, discsThatFit(box.w, Math.min(faces.length, GLANCE_FACES), total, box.disc, box.disc - 5, 40));
  const rest = total - shown;
  return (
    <span ref={ref} className="qcs-faces" data-cl16="strip-faces" data-shown={loading ? undefined : shown} aria-hidden="true">
      {faces.slice(0, shown).map((f, i) => (
        <span key={f.id} className={`qcs-fc cl16-fc cl16-fc--${k}`} data-cl16="strip-face" title={f.name} style={{ zIndex: shown - i }}>{f.initials}</span>
      ))}
      {!loading && rest > 0 && shown > 0 && <span className="qcs-more" data-cl16="strip-more">+{rest}</span>}
    </span>
  );
};

/** the model the strip draws while the page settles: every figure a blank of its box */
export const BLANK_GLANCE: GlanceModel = {
  total: 0, week: 0, month: 0, weeks: [],
  cells: [
    { key: "none", n: 0, parts: [{ n: 0, text: "ready to query" }, { n: 0, text: "closed to submissions" }], faces: [] },
    { key: "live", n: 0, parts: [{ n: 0, text: "waiting on you" }, { n: 0, text: "past their reply time" }], faces: [] },
    { key: "closed", n: 0, parts: [{ n: 0, text: "passed" }, { n: 0, text: "no reply" }], faces: [] },
  ],
};

export const ContactStrip: React.FC<{
  model: GlanceModel;
  /** the group the list is filtered to, or null */
  active?: GlanceKey | null;
  /** a group cell: set that group, or clear it when it is already set */
  onGroup: (key: GlanceKey) => void;
  /** cell 1: clear the group */
  onAll: () => void;
  loading?: boolean;
}> = ({ model, active = null, onGroup, onAll, loading = false }) => {
  const allParts: GlancePart[] = [{ n: model.week, text: "added this week" }, { n: model.month, text: "this month" }];
  const said = (label: string, n: number, parts: readonly GlancePart[]) => (loading ? `${label}: loading` : `${label}: ${n}. ${parts.map((p) => `${p.n} ${p.text}`).join(", ")}`);
  return (
    <section className="qcs cl16-gl" data-cl16="strip-wrap" aria-labelledby="cl16-gl-h">
      <div className="qcs-head">
        <h2 className="qcs-h" id="cl16-gl-h" data-cl16="strip-heading">{GLANCE_HEADING}</h2>
        <span className="qcs-k" data-cl16="strip-kicker">{GLANCE_KICKER}</span>
        <i className="qcs-hint" data-cl16="strip-hint">{GLANCE_HINT}</i>
      </div>
      <div className="qcs-box" data-cl16="strip" data-loading={loading ? "true" : "false"}>
        <button type="button" className="qcs-cell" data-cl16="strip-cell" data-k="all" aria-pressed={false} disabled={loading}
          aria-label={`${said(GLANCE_LABEL.all, model.total, allParts)}. Show all`} onClick={onAll}>
          <span className="qcs-lb" data-cl16="strip-label">{GLANCE_LABEL.all}</span>
          <span className="qcs-cue" aria-hidden="true">Show all</span>
          <b className={`qcs-fig${loading ? " qcs-blank" : ""}`} data-cl16="strip-fig">{loading ? "00" : model.total}</b>
          <Line parts={allParts} loading={loading} />
          <span className="qcs-foot"><Bars weeks={model.weeks} loading={loading} /></span>
        </button>
        {model.cells.map((c: GlanceCell) => {
          const on = active === c.key;
          return (
            <button key={c.key} type="button" className={`qcs-cell${on ? " is-on" : ""}`} data-cl16="strip-cell" data-k={c.key} aria-pressed={on} disabled={loading}
              aria-label={`${said(GLANCE_LABEL[c.key], c.n, c.parts)}. ${on ? "Showing these in the list" : "Show these in the list"}`} onClick={() => onGroup(c.key)}>
              <span className="qcs-lb" data-cl16="strip-label">{GLANCE_LABEL[c.key]}</span>
              <span className="qcs-cue" aria-hidden="true">Show these ↓</span>
              <b className={`qcs-fig${loading ? " qcs-blank" : ""}`} data-cl16="strip-fig">{loading ? "00" : c.n}</b>
              <Line parts={c.parts} loading={loading} />
              <span className="qcs-foot"><Faces k={c.key} faces={c.faces} total={c.n} loading={loading} /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
