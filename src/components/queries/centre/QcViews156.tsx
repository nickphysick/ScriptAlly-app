/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 §6 (design-refs/query-centre-v156.html) — THE VIEWS PANEL, in the filter column, replacing the
 * filter rail (QcRail153, deleted with it). One white card, 268 wide:
 *
 *   Views · Reset          over a 2px navy rule
 *   the five views         All queries, then the quick filters (today's labels and counts), one at a time
 *   Refine · within this view
 *     Status               one tick box per stage row with a count in this view (StatusDot, label, count)
 *   More filters           "What you sent, dates" and a caret; closed unless one of its filters is set
 *     What you sent        the rounds / packages
 *     Dates                Due this week, Past their reply date, Missing materials, Over a year
 *   n showing · Export n queries
 *
 * ⚠️ IT IS A PRESENTATION OF THE PAGE'S ONE FILTER STATE (`Qc138Filters`), never a second model: every control writes
 *    through `onFilters`, and every count is the rail's faceted count (lib/qc153Rail `railCounts`), so the numbers are
 *    the ones the quick filters, the status rows and the More switches showed before. A view is a quick field
 *    (lib/qc156 `selectView156`).
 * ⚠️ THE CARD'S BONES ARE THE SHARED RAIL'S: the `qc153-rail` card (its stickiness and the tall-rail rule, v154 §6),
 *    the `qc153-rbd` head with Reset, and the `qc153-rft` foot — the classes the Contact list's rail (ContactRail27)
 *    renders too. The Contact list has no "Views" panel to share (v156 Step 0); this card's look is the v156 ref's,
 *    in qcv156.css, scoped to `.qc156-views`, so the Contact list's rail does not change.
 */
import React, { useEffect, useId, useState } from "react";
import { QueryStatus } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { toggleStand } from "../../../lib/qc140";
import { MORE_ROWS_153, railOn, type RailCounts } from "../../../lib/qc153Rail";
import { VIEWS_156, moreActive156, selectView156, statusRows156, viewOf156, type ViewIcon156 } from "../../../lib/qc156";
import "./qcv156.css";

const S = { viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const ICONS: Record<ViewIcon156, React.ReactNode> = {
  list: <svg {...S}><path d="M3 5h12M3 9h12M3 13h12" /></svg>,
  you: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="M9 5.6v4.1M9 12.2v.1" /></svg>,
  clock: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="M9 5.4V9l2.5 1.6" /></svg>,
  plane: <svg {...S}><path d="M15.5 2.5 2.5 8l5 1.8L9.3 15z" /><path d="M15.5 2.5 7.5 9.8" /></svg>,
  doc: <svg {...S}><path d="M4.5 2.5h6l3 3v10h-9z" /><path d="M7 9h4.5M7 12h4.5" /></svg>,
};
const CARET = <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M2 4h8L6 9z" /></svg>;

/** a round or package the writer has sent ("What you sent"), or SENT_NONE for "Nothing recorded" */
export interface RailSent { key: string; name: string; line?: string }

export interface QcViews156Props {
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
  counts: RailCounts;
  /** All queries' count: the list under everything but the view */
  allN: number;
  sent: readonly RailSent[];
  onReset: () => void;
  showing: number;
  onExport: () => void;
  loading?: boolean;
}

export const QcViews156: React.FC<QcViews156Props> = ({ filters: f, onFilters, counts, allN, sent, onReset, showing, onExport, loading = false }) => {
  const view = viewOf156(f);
  const isMore = moreActive156(f);
  const [more, setMore] = useState(isMore);
  /* a More filter set from anywhere (on arrival, a pill, a link) opens the section; folding never clears a filter */
  useEffect(() => { if (isMore) setMore(true); }, [isMore]);
  const moreId = useId();
  const statuses = statusRows156(counts.stand, f);
  const box = (on: boolean) => <i className="qc156-ck" aria-hidden="true">{on ? <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.6l4.6-5" /></svg> : null}</i>;
  const tick = (key: string, data: string, label: React.ReactNode, n: number, on: boolean, onClick: () => void, title?: string) => (
    <button key={key} type="button" role="checkbox" aria-checked={on} className={`qc156-vc${on ? " is-on" : ""}`} data-qc156={data} data-k={key} data-n={n}
      title={title} disabled={loading || (!on && n === 0)} onClick={onClick}>
      {box(on)}<span className="qc156-vct">{label}</span><em>{n}</em>
    </button>
  );
  return (
    <aside className="qc153-rail qc156-views" aria-label="Views" data-qc156="views">
      <div className="qc153-rin">
        <div className="qc153-rbd qc156-vh" data-qc156="views-head">
          <b>Views</b>
          <button type="button" className="qc153-rst" data-qc156="reset" disabled={railOn(f) === 0 || loading} onClick={onReset}>Reset</button>
        </div>

        <div className="qc156-vl" role="radiogroup" aria-label="Views">
          {VIEWS_156.map((v) => {
            const on = view === v.key;
            const n = v.key === "all" ? allN : counts.quick[v.key] ?? 0;
            return (
              <button key={v.key} type="button" role="radio" aria-checked={on} className={`qc156-vr${on ? " is-on" : ""}`} data-qc156="view" data-k={v.key} data-n={n}
                title={v.line} disabled={loading} onClick={() => onFilters(selectView156(f, v.key))}>
                {ICONS[v.icon]}<span>{v.label}</span><em>{n}</em>
              </button>
            );
          })}
        </div>

        <div className="qc156-vs" data-qc156="refine">
          <h3 className="qc156-vsh">Refine<small>within this view</small></h3>
          <p className="qc156-vsl" id={`${moreId}-st`}>Status</p>
          <div role="group" aria-labelledby={`${moreId}-st`}>
            {statuses.map(({ row, n, on }) => tick(row.key, "status", <><StatusDot status={row.statuses[0] as QueryStatus} overrideSize={15} decorative />{row.label}</>, n, on,
              () => onFilters(toggleStand(f, row))))}
          </div>
        </div>

        <div id={moreId} className="qc156-mb" data-qc156="more-body" hidden={!more || undefined}>
          <p className="qc156-vsl" id={`${moreId}-snt`}>What you sent</p>
          <div role="group" aria-labelledby={`${moreId}-snt`}>
            {sent.map((o) => {
              const on = f.sent.includes(o.key);
              return tick(o.key === SENT_NONE ? "none" : o.key, "sent", o.name, counts.sent[o.key] ?? 0, on,
                () => onFilters({ ...f, sent: on ? f.sent.filter((x) => x !== o.key) : [...f.sent, o.key] }), o.line);
            })}
          </div>
          <p className="qc156-vsl" id={`${moreId}-dt`}>Dates</p>
          <div role="group" aria-labelledby={`${moreId}-dt`}>
            {MORE_ROWS_153.map((r) => tick(r.key, "date", r.label, counts.more[r.key] ?? 0, f[r.key], () => onFilters({ ...f, [r.key]: !f[r.key] })))}
          </div>
        </div>
        <button type="button" className="qc156-mf" data-qc156="more" aria-expanded={more} aria-controls={moreId} onClick={() => setMore((m) => !m)}>
          <span><b>More filters</b><small>What you sent, dates</small></span><i aria-hidden="true">{CARET}</i>
        </button>

        <div className="qc153-rft qc156-vf" data-qc156="foot">
          <span data-qc156="showing">{showing} showing</span>
          <button type="button" className="qc156-exp" data-qc156="export" disabled={loading || showing === 0} onClick={onExport}>Export {showing} {showing === 1 ? "query" : "queries"}</button>
        </div>
      </div>
    </aside>
  );
};
