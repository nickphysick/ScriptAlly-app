/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 Part C (design-refs/query-centre-v150/, screens 01, 02, 04) — the list's title, its count line,
 * and the List | Birds-eye switch, centred above the list. Text with rules to the list's edges, never a box.
 *
 * ⚠️ THE COUNT LINE FOLLOWS THE ACTIVE FILTER: its figures are the rows the view is showing, never the manuscript's.
 * ⚠️ THE SWITCH IS HERE AND NOT IN THE NAVY BAR (a baked decision; QC150-L5 asserts the bar has none).
 */
import React from "react";
import type { QcView150 } from "../../../lib/qc150";
import "./qcv150.css";

const LIST_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
const BIRDS_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M4 12h14M4 17h6" /><circle cx="14" cy="7" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="11" cy="17" r="1.6" /></svg>;

export const QcListTitle150: React.FC<{
  view: QcView150;
  onView: (v: QcView150) => void;
  /** List: the rows shown, the heard-back share of them, and the grouping and sort in words */
  list: { n: number; heardPct: number; group: string; sort: string } | null;
  /** Birds-eye: the live rows shown */
  birds: { n: number } | null;
  loading: boolean;
}> = ({ view, onView, list, birds, loading }) => (
  <div className="qc150-lt" data-qc150="title">
    <div className="qc150-ltt"><h2 data-qc150="title-text">Here’s every query you’ve sent</h2></div>
    <p className="qc150-lts" data-qc150="count-line" data-view={view}>
      {view === "list" ? (
        list ? <><b>{list.n}</b> {list.n === 1 ? "query" : "queries"} &nbsp;·&nbsp; <b>{list.heardPct}%</b> heard back &nbsp;·&nbsp; {list.group}, {list.sort}</> : " "
      ) : (
        birds ? <><b>{birds.n}</b> live {birds.n === 1 ? "query" : "queries"} &nbsp;·&nbsp; on one timeline &nbsp;·&nbsp; most urgent first</> : " "
      )}
    </p>
    <div className="qc150-vsw" role="group" aria-label="View" data-qc150="switch">
      <button type="button" aria-pressed={view === "list"} data-v="list" disabled={loading} onClick={() => onView("list")}>{LIST_ICON}List</button>
      <button type="button" aria-pressed={view === "birds"} data-v="birds" disabled={loading} onClick={() => onView("birds")}>{BIRDS_ICON}Birds-eye</button>
    </div>
  </div>
);
