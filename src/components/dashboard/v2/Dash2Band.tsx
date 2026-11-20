/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · the navy title band (Part A; ref design-refs/dashboard-v2, screens/01).
 *
 * v2.1 (ref design-refs/dashboard-v2-1, screens/01): a rust mono "{n} weeks querying" tag 6px above the title, drawn
 * only once a query has been sent.
 *
 * DASHBOARD v3 (ref design-refs/dashboard-v3.html), Phase 1: no sentence and no "Log a query" here — Log a query lives
 * in the top bar only. Right of the title, the STAGE MARKS: for each stage holding a query, the real `StatusDot`, the
 * count in the typewriter face and the stage word in small serif (queried, partial, full, offer, then closed, dimmed).
 * A stage at zero draws nothing; day one draws no marks. Then two outline buttons, Record a response and Add an agent:
 * no filled button in the header. Below 1180px the marks hide, and the band never wraps or grows.
 *
 * ⚠️ THE COUNTS ARE `stageMarks` (lib/dash3): `stageOf` over each query's derived status, the Query Centre's own table.
 * ⚠️ Each button opens the app's existing flow; nothing here writes.
 */
import React from "react";
import { weeksTag } from "../../../lib/dash2";
import { MARK_STATUS, MARK_WORD, type StageMark } from "../../../lib/dash3";
import { StatusDot } from "../../StatusDot";

const Reply = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path className="d2-gl" d="M9 8L4 12l5 4M4 12h10a6 6 0 016 6" /></svg>);
const AddPerson = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path className="d2-gl" d="M10 11a4 4 0 100-8 4 4 0 000 8zM3 21a7 7 0 0114 0M19 8v6M16 11h6" /></svg>);

export const MARKS_LABEL = "Where your queries stand";

export const Dash2Band: React.FC<{
  loading: boolean;
  title: string;
  author: string;
  /** v2.1: whole weeks since the first send; null before it, and the tag is not drawn */
  weeks?: number | null;
  /** v3: the stage marks, already in order and without zeros; empty on day one */
  marks?: readonly StageMark[];
  onRecord: () => void;
  onAddAgent: () => void;
}> = ({ loading, title, author, weeks = null, marks = [], onRecord, onAddAgent }) => (
  <header className="d2-band" data-d2="band" data-loading={loading ? "1" : "0"}>
    <div className="d2-bandtx">
      {!loading && weeks != null && <p className="d2-wq" data-d2="weeks-tag">{weeksTag(weeks)}</p>}
      <h1 className="d2-title" data-d2="title">{title || (loading ? " " : "Your manuscript")}</h1>
      {author && <p className="d2-by" data-d2="by">by {author}</p>}
    </div>
    {!loading && marks.length > 0 && (
      <ul className="d3-marks" aria-label={MARKS_LABEL} data-d3="marks">
        {marks.map((m) => (
          <li key={m.stage} className={m.stage === "closed" ? "is-closed" : undefined} data-d3="mark" data-stage={m.stage} data-n={m.n}>
            <StatusDot status={MARK_STATUS[m.stage]} overrideSize={20} tone="inherit" decorative />
            <b>{m.n.toLocaleString("en-GB")}</b><small>{MARK_WORD[m.stage]}</small>
          </li>
        ))}
      </ul>
    )}
    <div className="d2-acts" data-d2="buttons">
      <button type="button" className="d2-pill" data-d2="record" aria-label="Record a response" onClick={onRecord}><Reply /><span>Record a response</span></button>
      <button type="button" className="d2-pill" data-d2="add-agent" aria-label="Add an agent" onClick={onAddAgent}><AddPerson /><span>Add an agent</span></button>
    </div>
  </header>
);
