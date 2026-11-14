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
 * ⚠️ THE CARD IS THE SHARED `shell/ViewsPanel` (Contact list — Query Centre layout v1 extracted it from here, markup
 *    unchanged): this file says what the Query Centre's views, rows and counts are, and nothing about how they look.
 *    The Contact list mounts the same panel (ContactViews). Its look is qcv156.css §6, whose rules name `.cl27` beside
 *    `.qc151.qc153` at the same specificity.
 */
import React from "react";
import { QueryStatus } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { toggleStand } from "../../../lib/qc140";
import { MORE_ROWS_153, railOn, type RailCounts } from "../../../lib/qc153Rail";
import { VIEWS_156, moreActive156, selectView156, statusRows156, viewOf156 } from "../../../lib/qc156";
import { ViewsPanel } from "../../shell/ViewsPanel";
import "./qcv156.css";

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
  return (
    <ViewsPanel hook="data-qc156" label="Views" loading={loading}
      resetDisabled={railOn(f) === 0} onReset={onReset}
      views={VIEWS_156.map((v) => ({
        key: v.key, label: v.label, icon: v.icon, title: v.line, disabled: false, on: view === v.key,
        n: v.key === "all" ? allN : counts.quick[v.key] ?? 0, onPick: () => onFilters(selectView156(f, v.key)),
      }))}
      refine={[{
        id: "st", label: "Status",
        ticks: statusRows156(counts.stand, f).map(({ row, n, on }) => ({
          key: row.key, data: "status", n, on, onToggle: () => onFilters(toggleStand(f, row)),
          label: <><StatusDot status={row.statuses[0] as QueryStatus} overrideSize={15} decorative />{row.label}</>,
        })),
      }]}
      more={{
        summary: "What you sent, dates", active: moreActive156(f),
        groups: [
          { id: "snt", label: "What you sent", ticks: sent.map((o) => {
            const on = f.sent.includes(o.key);
            return { key: o.key === SENT_NONE ? "none" : o.key, data: "sent", label: o.name, n: counts.sent[o.key] ?? 0, on, title: o.line,
              onToggle: () => onFilters({ ...f, sent: on ? f.sent.filter((x) => x !== o.key) : [...f.sent, o.key] }) };
          }) },
          { id: "dt", label: "Dates", ticks: MORE_ROWS_153.map((r) => ({
            key: r.key, data: "date", label: r.label, n: counts.more[r.key] ?? 0, on: f[r.key], onToggle: () => onFilters({ ...f, [r.key]: !f[r.key] }),
          })) },
        ],
      }}
      showing={`${showing} showing`}
      exportLabel={`Export ${showing} ${showing === 1 ? "query" : "queries"}`} exportDisabled={showing === 0} onExport={onExport}
    />
  );
};
