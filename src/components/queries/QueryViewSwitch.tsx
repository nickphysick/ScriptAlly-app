/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The view switch (colours-v2 run, Phase 2; ref query-centre-v9-views-locked.html). Playfair
 * segmented control, right of Sort. Every view shares the drawer, the tiles, Filter/Group/Sort and
 * the search — the switch changes the RENDERER and nothing else, which is why it holds no state of
 * its own beyond which one is showing.
 */
import React from "react";
import "./queryViewSwitch.css";

export type QueryView = "grid" | "list" | "board" | "calendar";

export const QUERY_VIEWS: readonly { key: QueryView; label: string }[] = [
  { key: "grid", label: "Grid" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "calendar", label: "Calendar" },
];

const Icon: React.FC<{ view: QueryView }> = ({ view }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {view === "grid" && <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>}
    {view === "list" && <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>}
    {view === "board" && <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="9.5" y="4" width="5" height="11" rx="1.5" /><rect x="16" y="4" width="5" height="14" rx="1.5" /></>}
    {view === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>}
  </svg>
);

export const QueryViewSwitch: React.FC<{ view: QueryView; onView: (v: QueryView) => void }> = ({ view, onView }) => (
  <div className="qvs" role="group" aria-label="View">
    {QUERY_VIEWS.map((v) => (
      <button
        key={v.key}
        type="button"
        className={view === v.key ? "qvs-on" : undefined}
        aria-pressed={view === v.key}
        onClick={() => onView(v.key)}
      >
        <Icon view={v.key} />
        {v.label}
      </button>
    ))}
  </div>
);
