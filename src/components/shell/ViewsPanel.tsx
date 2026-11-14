/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE VIEWS PANEL — extracted from Query Centre v156's `QcViews156` (design-refs/query-centre-v156.html §6) so the
 * Contact list mounts the same card (Contact list — Query Centre layout v1). One white card in the filter column:
 *
 *   Views · Reset          over a 2px navy rule
 *   the views              a radio list: an icon, the label, the count; the selected one navy
 *   Refine · within this view
 *     <groups>             a sub-label over tick-box rows (a box, the label, the count)
 *   More filters           a full-width row with its summary and a caret; its groups behind it, open while one is set
 *   foot                   "n showing" and the export
 *
 * ⚠️ PRESENTATION ONLY: every view, row and button is handed in by the page with its own count and its own write. This
 *    component holds one piece of state, whether More filters is open, and opens it whenever one of its filters is set
 *    from anywhere (on arrival, a pill, a link); folding never clears a filter.
 * ⚠️ IT RENDERS THE QUERY CENTRE'S OWN CLASSES (`qc153-rail` — the card's stickiness — and `qc156-*`, queries/centre/
 *    qcv156.css §6, whose rules name `.cl27` beside `.qc151.qc153`). `QcViews156` renders through this and
 *    qcViews156.test.tsx holds its markup.
 * ⚠️ THE `data-*` PROBES ARE THE CALLER'S (`hook`: `data-qc156` on the Query Centre, `data-clq` on the Contact list):
 *    every workspace page stays mounted, so a probe that counts one page's hooks across the document must not count
 *    the other's.
 */
import React, { useEffect, useId, useState } from "react";
/* ⚠️ only the sheet QcViews156 imported: a new import here could reorder the bundle's stylesheets under the Query Centre */
import "../queries/centre/qcv156.css";

const S = { viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
/** the views' icons (the Query Centre's five) */
export type ViewIcon = "list" | "you" | "clock" | "plane" | "doc";
export const VIEW_ICONS: Record<ViewIcon, React.ReactNode> = {
  list: <svg {...S}><path d="M3 5h12M3 9h12M3 13h12" /></svg>,
  you: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="M9 5.6v4.1M9 12.2v.1" /></svg>,
  clock: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="M9 5.4V9l2.5 1.6" /></svg>,
  plane: <svg {...S}><path d="M15.5 2.5 2.5 8l5 1.8L9.3 15z" /><path d="M15.5 2.5 7.5 9.8" /></svg>,
  doc: <svg {...S}><path d="M4.5 2.5h6l3 3v10h-9z" /><path d="M7 9h4.5M7 12h4.5" /></svg>,
};
const CARET = <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M2 4h8L6 9z" /></svg>;
const TICK = <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.6l4.6-5" /></svg>;

export interface ViewsPanelView { key: string; label: string; icon: ViewIcon; n: number; on: boolean; title?: string; disabled: boolean; onPick: () => void }
export interface ViewsPanelTick {
  key: string;
  /** the row's probe value (`data-qc156="status"`, `data-clq="genre"` …) */
  data: string;
  label: React.ReactNode;
  n: number;
  on: boolean;
  onToggle: () => void;
  title?: string;
}
export interface ViewsPanelGroup {
  /** the sub-label's id suffix (`${useId()}-${id}`) */
  id: string;
  label: string;
  ticks: readonly ViewsPanelTick[];
  /** drawn in place of the rows when there are none */
  empty?: React.ReactNode;
}

export interface ViewsPanelProps {
  /** the probe attribute (`data-qc156`, `data-clq`) */
  hook: `data-${string}`;
  /** the card's and the views list's accessible name */
  label: string;
  resetDisabled: boolean;
  onReset: () => void;
  views: readonly ViewsPanelView[];
  refine: readonly ViewsPanelGroup[];
  more: { summary: string; groups: readonly ViewsPanelGroup[]; active: boolean };
  showing: React.ReactNode;
  exportLabel: string;
  exportDisabled: boolean;
  onExport: () => void;
  loading?: boolean;
}

export const ViewsPanel: React.FC<ViewsPanelProps> = ({ hook, label, resetDisabled, onReset, views, refine, more: m, showing, exportLabel, exportDisabled, onExport, loading = false }) => {
  const h = (v: string) => ({ [hook]: v });
  const [more, setMore] = useState(m.active);
  /* a More filter set from anywhere opens the section; folding never clears a filter */
  useEffect(() => { if (m.active) setMore(true); }, [m.active]);
  const moreId = useId();
  const box = (on: boolean) => <i className="qc156-ck" aria-hidden="true">{on ? TICK : null}</i>;
  const tick = (t: ViewsPanelTick) => (
    <button key={t.key} type="button" role="checkbox" aria-checked={t.on} className={`qc156-vc${t.on ? " is-on" : ""}`} {...h(t.data)} data-k={t.key} data-n={t.n}
      title={t.title} disabled={loading || (!t.on && t.n === 0)} onClick={t.onToggle}>
      {box(t.on)}<span className="qc156-vct">{t.label}</span><em>{t.n}</em>
    </button>
  );
  const group = (g: ViewsPanelGroup) => (
    <React.Fragment key={g.id}>
      <p className="qc156-vsl" id={`${moreId}-${g.id}`}>{g.label}</p>
      <div role="group" aria-labelledby={`${moreId}-${g.id}`}>
        {g.ticks.map(tick)}
        {g.ticks.length === 0 && g.empty ? g.empty : null}
      </div>
    </React.Fragment>
  );
  return (
    <aside className="qc153-rail qc156-views" aria-label={label} {...h("views")}>
      <div className="qc153-rin">
        <div className="qc153-rbd qc156-vh" {...h("views-head")}>
          <b>Views</b>
          <button type="button" className="qc153-rst" {...h("reset")} disabled={resetDisabled || loading} onClick={onReset}>Reset</button>
        </div>

        <div className="qc156-vl" role="radiogroup" aria-label={label}>
          {views.map((v) => (
            <button key={v.key} type="button" role="radio" aria-checked={v.on} className={`qc156-vr${v.on ? " is-on" : ""}`} {...h("view")} data-k={v.key} data-n={v.n}
              title={v.title} disabled={loading || v.disabled} onClick={v.onPick}>
              {VIEW_ICONS[v.icon]}<span>{v.label}</span><em>{v.n}</em>
            </button>
          ))}
        </div>

        <div className="qc156-vs" {...h("refine")}>
          <h3 className="qc156-vsh">Refine<small>within this view</small></h3>
          {refine.map(group)}
        </div>

        <div id={moreId} className="qc156-mb" {...h("more-body")} hidden={!more || undefined}>
          {m.groups.map(group)}
        </div>
        <button type="button" className="qc156-mf" {...h("more")} aria-expanded={more} aria-controls={moreId} onClick={() => setMore((x) => !x)}>
          <span><b>More filters</b><small>{m.summary}</small></span><i aria-hidden="true">{CARET}</i>
        </button>

        <div className="qc153-rft qc156-vf" {...h("foot")}>
          <span {...h("showing")}>{showing}</span>
          <button type="button" className="qc156-exp" {...h("export")} disabled={loading || exportDisabled} onClick={onExport}>{exportLabel}</button>
        </div>
      </div>
    </aside>
  );
};
