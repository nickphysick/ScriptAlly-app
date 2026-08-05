/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoSideContainer — the page's own side container (To-do workspace pack, Phase 1; ref
 * design-refs/todo-workspace-pages.html).
 *
 * ⚠️ IT CARRIES NO PAGE LINKS (owner's call, correcting the ref). The app sidebar's To-do group is
 * the SOLE navigation for the four pages, and the active page state lives there alone. The ref
 * draws a TASKS section repeating the four; building it would give one set of destinations two nav
 * surfaces and two active states, which is how a workspace starts disagreeing about where you are.
 *
 * So this is a FILTER surface, not a nav one: LISTS narrows the current page, TAGS will do the
 * same when tags exist, and Task settings sits at the foot.
 *
 * ⚠️ TAGS IS DISABLED, NOT ABSENT. There is no tag model in the repo — no field, no rules, nothing
 * (Phase 0 recon). The audit's item 8 asks for a tag picker in the composer and the item sheet;
 * that is law this pack cannot implement, so it defers WITH the section. An affordance that says
 * "coming" is honest; a live-looking control that filtered nothing would not be.
 *
 * Follows the page-local sidebar pattern the Package Workshop established (`.pkgw-side`, a fixed
 * flex:none column beside a flex:1 main) — a pattern, not a shared component: there is no in-page
 * sidebar component in the repo to reuse.
 */
import React from "react";
import { Settings2 } from "lucide-react";
import { TODO_LISTS, TodoListId } from "../../lib/todoRoutes";
import "./todoSide.css";

export interface TodoSideContainerProps {
  /** Derived counts, one per list — never stored, never recomputed here. */
  counts: Record<TodoListId, number>;
  /** The active filter, or null for "everything". Filtering is the page's job; this only asks. */
  active: TodoListId | null;
  onSelect: (id: TodoListId | null) => void;
  onOpenTaskSettings: () => void;
}

export const TodoSideContainer: React.FC<TodoSideContainerProps> = ({
  counts, active, onSelect, onOpenTaskSettings,
}) => (
  <aside className="tds" aria-label="Filters">
    <div className="tds-cap">Lists</div>
    <div className="tds-group" role="group" aria-label="Lists">
      {TODO_LISTS.map((l) => {
        const on = active === l.id;
        return (
          <button
            key={l.id}
            type="button"
            className={`tds-row${on ? " on" : ""}`}
            aria-pressed={on}
            /* Clicking the active row clears the filter — the row is a toggle, so there is always
               a way back to "everything" without hunting for a reset control. */
            onClick={() => onSelect(on ? null : l.id)}
          >
            <span className="tds-sw" style={{ background: l.swatch }} aria-hidden="true" />
            <span className="tds-lbl">{l.label}</span>
            {/* A zero is shown here, unlike the nav badge: this is a LIST of five, and a blank
                where the other four carry figures reads as a loading fault rather than "none". */}
            <span className="tds-ct">{counts[l.id] ?? 0}</span>
          </button>
        );
      })}
    </div>

    <div className="tds-cap">Tags</div>
    <div className="tds-soon" aria-disabled="true">
      <span className="tds-soon-t">Coming soon</span>
      <span className="tds-soon-s">Tag notes and tasks, then filter by them here.</span>
    </div>

    <div className="tds-grow" />

    <button type="button" className="tds-foot" onClick={onOpenTaskSettings}>
      <Settings2 aria-hidden="true" />
      Task settings
    </button>
  </aside>
);
