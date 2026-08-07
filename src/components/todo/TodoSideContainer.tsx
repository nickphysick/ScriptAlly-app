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
import React, { useState } from "react";
import { Settings2 } from "lucide-react";
import { TODO_FACETS, TodoFacetId } from "../../lib/todoBoardSort";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { TagDef } from "../../types";
import { TagPicker } from "./TagPicker";
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
  /* ⚠️ TAGS, FOR REAL (tasks-pages P5) — the Coming-soon box retires. The rows are the user's
     own definitions with live usage counts; selection is MULTI (additive with FILTERS: Urgent
     AND #synopsis), and a clear control appears the moment anything is active. */
  tags?: TagDef[];
  tagCounts?: Map<string, number>;
  selectedTags?: string[];
  onToggleTag?: (id: string) => void;
  /* ⚠️ ONE CLEAR FOR BOTH NARROWINGS (board-optimise P2). It used to sit on the TAGS cap and
     reset tags alone — so a page narrowed by Urgent AND #synopsis needed two different gestures
     in two different places to get back, and neither said it was only half a reset. It sits
     beside FILTERS now (the first narrowing you meet), renders only while SOMETHING is active,
     and resets the facet and the tags together. */
  onClearAll?: () => void;
  /** The inline ＋ New tag row's create path — the SAME TagPicker create the composer uses. */
  onCreateTag?: (tag: TagDef) => void;
}

export const TodoSideContainer: React.FC<TodoSideContainerProps> = ({
  counts, active, onSelect, onOpenTaskSettings, onNoteboard,
  tags = [], tagCounts, selectedTags = [], onToggleTag, onClearAll, onCreateTag,
}) => {
  /* The inline create row opens the ONE picker rather than a second create field — creation
     happens where tagging happens (tasks-pages P5), and this is simply another door to it. */
  const [creating, setCreating] = useState(false);
  const narrowed = active !== "all" || selectedTags.length > 0;
  return (
  <aside className="tds" aria-label="Filters">
    {/* ⚠️ FILTERS, NOT LISTS (board+dock P2) — renamed because the rows now DO what the heading
        says. "Lists" named five things you could look at; these four narrow what the board shows,
        all four columns at once, one active at a time. */}
    <div className="tds-cap tds-tagcap">
      Filters
      {narrowed && onClearAll && (
        <button type="button" className="tds-tagclear" onClick={onClearAll}>Clear</button>
      )}
    </div>
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

    {/* ⚠️ THE REAL TAGS LIST (tasks-pages P5) — the "Coming soon" box is retired. Multi-select
        rows (additive with FILTERS above), usage counts derived live, and a clear control the
        moment any are active. No tags yet = one quiet line pointing at where creation lives. */}
    <div className="tds-cap">Tags</div>
    {tags.length === 0 ? (
      <div className="tds-tagnone">Tag notes and tasks as you write them — they gather here.</div>
    ) : (
      <div className="tds-group" role="group" aria-label="Tags">
        {tags.map((t) => {
          const on = selectedTags.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`tds-row${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => onToggleTag?.(t.id)}
            >
              {/* ⚠️ FILLED, the FILTERS grammar (tasks-audit P3) — a solid dot in the tag's strong
                  tone, never an outlined ring: two dot styles in one sidebar read as two systems. */}
              <span className="tds-sw" style={{ background: TAG_PALETTE[t.colour].tx }} aria-hidden="true" />
              <span className="tds-lbl">#{t.label}</span>
              <span className="tds-ct">{tagCounts?.get(t.id) ?? 0}</span>
            </button>
          );
        })}
      </div>
    )}

    {/* ⚠️ THE INLINE ＋ New tag ROW (board-optimise P2) — creation reachable from the place the
        tags are READ, not only from an item you happen to be tagging. It opens the ONE
        TagPicker's create path; a second create field here would be a second set of rules about
        what a label may be. */}
    {onCreateTag && (
      creating ? (
        <div className="tds-newtag">
          <TagPicker
            compact
            tags={tags}
            selected={[]}
            onToggle={(id) => { onToggleTag?.(id); setCreating(false); }}
            onCreate={(tag) => { onCreateTag(tag); setCreating(false); }}
          />
          <button type="button" className="tds-newtagx" onClick={() => setCreating(false)}>Done</button>
        </div>
      ) : (
        <button type="button" className="tds-row tds-newrow" onClick={() => setCreating(true)}>
          <span className="tds-sw tds-newsw" aria-hidden="true">＋</span>
          <span className="tds-lbl">New tag</span>
        </button>
      )
    )}

    <div className="tds-grow" />

    <button type="button" className="tds-foot" onClick={onOpenTaskSettings}>
      <Settings2 aria-hidden="true" />
      Task settings
    </button>
  </aside>
  );
};
