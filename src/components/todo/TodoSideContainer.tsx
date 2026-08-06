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
import { TODO_FACETS, TodoFacetId } from "../../lib/todoBoardSort";
import "./todoSide.css";

export interface TodoSideContainerProps {
  /** Derived counts, one per facet — from the cards the columns render, never a second tally. */
  counts: Record<TodoFacetId, number>;
  /** The active facet. `all` is the default and the reset — there is no null state. */
  active: TodoFacetId;
  onSelect: (id: TodoFacetId) => void;
  onOpenTaskSettings: () => void;
  /** The road sign — notes are not on this board, so the row points at where they are. */
  onNoteboard: () => void;
}

export const TodoSideContainer: React.FC<TodoSideContainerProps> = ({
  counts, active, onSelect, onOpenTaskSettings, onNoteboard,
}) => (
  <aside className="tds" aria-label="Filters">
    {/* ⚠️ FILTERS, NOT LISTS (board+dock P2) — renamed because the rows now DO what the heading
        says. "Lists" named five things you could look at; these four narrow what the board shows,
        all four columns at once, one active at a time. */}
    <div className="tds-cap">Filters</div>
    <div className="tds-group" role="group" aria-label="Filters">
      {TODO_FACETS.map((l) => {
        const on = active === l.id;
        return (
          <button
            key={l.id}
            type="button"
            className={`tds-row${on ? " on" : ""}`}
            aria-pressed={on}
            /* ⚠️ ONE ACTIVE AT A TIME, and "Everything" IS the way back — so there is no toggle-
               off state to leave the board in. Clicking the active row does nothing rather than
               dropping you into a fourth, unnamed state that looks identical to Everything. */
            onClick={() => onSelect(l.id)}
          >
            <span className="tds-sw" style={{ background: l.swatch }} aria-hidden="true" />
            <span className="tds-lbl">{l.label}</span>
            {/* A zero is shown, unlike the nav badge: these four sit together, and a blank where
                the others carry figures reads as a loading fault rather than "none". */}
            <span className="tds-ct">{counts[l.id] ?? 0}</span>
          </button>
        );
      })}
    </div>

    {/* ⚠️ THE ROAD SIGN, replacing the Notes row (P2). Notes are not on this board at all — a
        note has no date and no tick, so three of the four columns are meaningless for it. A facet
        that could only ever return nothing reads as a fault; a sign that says where they DO live
        is the honest thing to put in its place. */}
    <button type="button" className="tds-sign" onClick={onNoteboard}>
      Notes to self live on the <b>Noteboard →</b>
    </button>

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
