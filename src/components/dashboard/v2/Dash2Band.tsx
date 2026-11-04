/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · the navy title band (Part A; ref design-refs/dashboard-v2, screens/01).
 *
 * The manuscript's title, "by {author}" under it, and the three actions as pills. ⚠️ NO STATUS LABEL OF ANY KIND:
 * the band names the book, never where it stands. Each button opens the app's existing flow; nothing here writes.
 * At ≤1320px the two outline buttons show their icons only, keeping their accessible names.
 */
import React from "react";

const Pen = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path className="d2-gl" d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" /></svg>);
const Reply = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path className="d2-gl" d="M9 8L4 12l5 4M4 12h10a6 6 0 016 6" /></svg>);
const AddPerson = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path className="d2-gl" d="M10 11a4 4 0 100-8 4 4 0 000 8zM3 21a7 7 0 0114 0M19 8v6M16 11h6" /></svg>);

export const Dash2Band: React.FC<{
  loading: boolean;
  title: string;
  author: string;
  /** false before the first query: the set-up card carries the first steps then (first visit v1) */
  buttons: boolean;
  onLog: () => void;
  onRecord: () => void;
  onAddAgent: () => void;
}> = ({ loading, title, author, buttons, onLog, onRecord, onAddAgent }) => (
  <header className="d2-band" data-d2="band" data-loading={loading ? "1" : "0"}>
    <div className="d2-bandtx">
      <h1 className="d2-title" data-d2="title">{title || (loading ? " " : "Your manuscript")}</h1>
      {author && <p className="d2-by" data-d2="by">by {author}</p>}
    </div>
    {buttons && (
      <div className="d2-acts" data-d2="buttons">
        <button type="button" className="d2-pill d2-pill--pri" data-d2="log" onClick={onLog}><Pen /><span>Log a query</span></button>
        <button type="button" className="d2-pill" data-d2="record" aria-label="Record a response" onClick={onRecord}><Reply /><span>Record a response</span></button>
        <button type="button" className="d2-pill" data-d2="add-agent" aria-label="Add an agent" onClick={onAddAgent}><AddPerson /><span>Add an agent</span></button>
      </div>
    )}
  </header>
);
