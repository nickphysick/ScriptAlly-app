/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TasksPageLayout — the ONE page grid every Tasks page stands on (tasks-pages pack, Phase 1;
 * ref design-refs/tasks-pages.html).
 *
 * ⚠️ THE ALIGNMENT CONTRACT. The four Tasks pages used to disagree about their own top edge:
 * To-do list drew header → hairline → sidebar below; Today mounted its sidebar level with the
 * title and its header squashed against the top bar — because each page hand-assembled the same
 * geometry and one of them missed the column. The contract, once, here:
 *
 *  1. The content region's TOP PADDING IS A SINGLE TOKEN — `--tdb-chrome-gap` (44px), carried by
 *     the `.tdb-col` geometry this component now owns. Every page title's baseline sits at the
 *     same offset because every page renders THIS component; Today's squash was this token (and
 *     the whole column) simply missing from that page.
 *  2. Order: header block (Playfair title → one-line subtitle → tool row) spanning the FULL
 *     content width → hairline (the tool row's own bottom rule) → beneath it, the page sidebar
 *     and the page body starting on the same line. The sidebar begins BELOW the hairline,
 *     aligned with the content — never level with the title.
 *  3. ⚠️ THE TOOL ROW IS THE ONLY HOME FOR PAGE CONTROLS — nothing floats mid-page, and its
 *     right slot holds the page's pink creation action (callers order controls; `<TplGrow/>`
 *     is the spacer that pins the pink to the right).
 *  4. The sidebar is ONE component (TodoSideContainer — FILTERS · road-sign line · TAGS · Task
 *     settings) and it is OPTIONAL per page: the Noteboard renders none, so `sidebar` absent
 *     means no aside element at all — never an empty gutter.
 */
import React from "react";
import "./tasksLayout.css";

export interface TasksPageLayoutProps {
  title: string;
  /** The one-line subtitle under the title. Optional — a page with nothing to say says nothing. */
  subtitle?: string;
  /** The page's controls — the ONLY place they may live. Right slot = the pink creation action. */
  tools: React.ReactNode;
  /** The shared side container. Absent = the body takes the full width (the Noteboard). */
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

/** The tool row's spacer — everything after it sits in the right slot. */
export const TplGrow: React.FC = () => <span className="tpl-grow" aria-hidden />;

export const TasksPageLayout: React.FC<TasksPageLayoutProps> = ({ title, subtitle, tools, sidebar, children }) => (
  /* `.tdb-col` is the SINGLE geometry owner (max-width, gutters, and the top token) — the layout
     wears it rather than restating its numbers. `.tpl` adds only what the contract needs. */
  <div className="tdb-col tpl">
    <header className="tpl-head">
      <h1 className="tpl-title">{title}</h1>
      {subtitle && <p className="tpl-sub">{subtitle}</p>}
      {/* the hairline lives on this row's bottom edge — the header ends where the columns begin */}
      <div className="tpl-tools tdb-tools">{tools}</div>
    </header>
    <div className="tpl-cols">
      {sidebar && <aside className="tpl-side">{sidebar}</aside>}
      <div className="tpl-body">{children}</div>
    </div>
  </div>
);
