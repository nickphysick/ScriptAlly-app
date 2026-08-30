/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE TWO-VIEW TAB RAIL ═════════════════════════════════════════════════════════════════════
 * (ref design-refs/qc-two-views.html — the rail below the masthead.)
 *
 * ⚠️ IT IS SHARED BECAUSE ITS STICKY BEHAVIOUR IS, not because its labels are. Query Centre and
 * Manuscripts name their views differently and count different things; what they cannot differ on
 * is where the rail sits when the collapsed bar is showing. That offset is the one thing a page
 * must not restate — it is the bar's height, and this repo has paid twice for a `top` that encoded
 * another element's height as a number.
 *
 * ⚠️ THE VIEW IS A ROUTE, NOT LOCAL STATE, so this component navigates rather than setting state.
 * A deep link from To-do, Calendar or Noteboard has to be able to open a record directly; with the
 * view in component state that link can only ever land on the browsing view and hope.
 */
import React from "react";

export interface ViewTab {
  /** the route value this tab selects */
  key: string;
  label: string;
  /** the mono figure beside the label — omitted rather than zeroed where there is nothing to count */
  count?: number;
}

export const ViewTabs: React.FC<{
  tabs: ViewTab[];
  active: string;
  onSelect: (key: string) => void;
  /** the page's own controls, right-aligned in the rail (the ref draws Filters and Sort there) */
  tools?: React.ReactNode;
  label: string;
}> = ({ tabs, active, onSelect, tools, label }) => (
  <div className="vtabs" role="tablist" aria-label={label}>
    <div className="vtabs-in">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === active}
          className={`vtab${t.key === active ? " vtab--on" : ""}`}
          onClick={() => onSelect(t.key)}
        >
          {t.label}
          {/* ⚠️ OMITTED WHEN ABSENT, NEVER RENDERED AS `0`. A tab that says `Detail view 0` states a
              count of nothing; `undefined` is a different fact from zero and reads as one. */}
          {t.count !== undefined && <i>{t.count}</i>}
        </button>
      ))}
      {tools && <div className="vtabs-tools">{tools}</div>}
    </div>
  </div>
);
