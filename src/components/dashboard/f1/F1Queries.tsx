/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — ACTIVE AND CLOSED, ONE CARD (Part C; ref design-refs/dashboard-feed-v1/ screens 01 and 04).
 *
 * The navy header reads "{n} active queries" or "{n} closed", with an Active | Closed pill switch at its right. The
 * body is 224px whichever view is showing, so switching moves nothing below the card.
 *
 * ⚠️ THE TWO VIEWS ARE THE APP'S OWN CARDS — `OneScreenChart` and `ClosedHoop` — with their own bands hidden by this
 * card's sheet (df1.css), never rebuilt. Both stay mounted in one grid cell: the hidden one is `visibility: hidden`,
 * `inert` and `aria-hidden`, so the chart keeps its measured size and its grain, and the Closed hoop keeps its stacks.
 */
import React, { useState } from "react";

export type QueriesView = "active" | "closed";
export const QUERIES_SWITCH: readonly { key: QueriesView; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
];

export const F1Queries: React.FC<{
  /** the header's words for each view: "18 active queries", "3 closed" */
  activeTitle: string;
  closedTitle: string;
  active: React.ReactNode;
  closed: React.ReactNode;
}> = ({ activeTitle, closedTitle, active, closed }) => {
  const [view, setView] = useState<QueriesView>("active");
  return (
    <section className="df1-q" data-df1="queries-card" data-view={view} aria-label="Your queries">
      <div className="df1-qfr">
        <div className="df1-qbd">
          <h2 className="df1-qttl" data-df1="queries-title">{view === "active" ? activeTitle : closedTitle}</h2>
          <div className="df1-qtg" role="group" aria-label="Show">
            {QUERIES_SWITCH.map((s) => (
              <button key={s.key} type="button" data-df1-q={s.key} aria-pressed={view === s.key} onClick={() => setView(s.key)}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="df1-qv" data-df1="queries-body">
          <div className="df1-qpane df1-qpane--active" data-df1="pane-active" aria-hidden={view !== "active" || undefined} inert={view !== "active" || undefined}>{active}</div>
          <div className="df1-qpane df1-qpane--closed" data-df1="pane-closed" aria-hidden={view !== "closed" || undefined} inert={view !== "closed" || undefined}>{closed}</div>
        </div>
      </div>
    </section>
  );
};
