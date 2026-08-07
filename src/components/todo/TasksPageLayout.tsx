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
 *  1. The content region's TOP PADDING IS A SINGLE TOKEN — `--tdb-chrome-gap` (44px) — AND SO IS
 *     ITS GUTTER — `--tdb-col-gutter` (40px) — both carried by the `.tdb-col` geometry this
 *     component owns, with `.tdb-col`'s max width and auto-centring as the one horizontal cap.
 *     Every page title sits at the same offset on BOTH axes because every page renders THIS
 *     component and NOTHING ELSE caps or pads the column: the route slots carry no
 *     contentVariant (tasks-audit addendum — three slots' leftover read caps made the board's
 *     title start further left below the cap-bite width), and this file's own stylesheet
 *     restates neither padding. Today's squash was the top half of the same fault.
 *  2. Order: header block (Playfair title → one-line subtitle → tool row) spanning the FULL
 *     content width → hairline (the tool row's own bottom rule) → beneath it, the page sidebar
 *     and the page body starting on the same line. The sidebar begins BELOW the hairline,
 *     aligned with the content — never level with the title.
 *  3. ⚠️ THE TOOL ROW IS THE ONLY HOME FOR PAGE CONTROLS — nothing floats mid-page, and its
 *     right slot holds the page's pink creation action (callers order controls; `<TplGrow/>`
 *     is the spacer that pins the pink to the right).
 *  4. ⚠️ THE SIDEBAR IS THE TO-DO LIST'S ALONE (tasks-viewport P1). It was already OPTIONAL —
 *     absent means no aside element at all, never an empty gutter — and now exactly ONE page
 *     passes it. Today, Calendar and Noteboard are header block → hairline → full-width content.
 *     The freed width is the point rather than a side effect: Calendar's cells grow taller before
 *     they need to fold, and Today's two columns breathe. (Task settings therefore needs a second
 *     door — Phase 5 — because the sidebar's foot is no longer reachable from three of the four.)
 *  5. ⚠️ THE PAGE NEVER SCROLLS (tasks-viewport P1). The frame is the viewport, the header block
 *     is fixed, and scrolling belongs to the `<TplZone>`s below it. The `min-height: 0` chain
 *     this depends on is documented at the foot of tasksLayout.css — every link must declare its
 *     part, and jsdom cannot check that the chain resolves.
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

export interface TplZoneProps {
  children: React.ReactNode;
  /** ⚠️ THE HEM RENDERS IFF CONTENT CONTINUES. A hem over a list that fits is a fade to nothing —
   *  it says "there is more" when there is not. Callers pass the same predicate that decides
   *  whether the zone can overflow at all. */
  hem?: boolean;
  className?: string;
  /** For the scroll-restore contract: the zone is the scroller now, not the page. */
  scrollRef?: React.Ref<HTMLDivElement>;
  label?: string;
}

/**
 * ⚠️ THE ONLY THING ON A TASKS PAGE THAT SCROLLS (tasks-viewport P1). One primitive, so the four
 * pages cannot each invent their own overflow — which is how the board came to scroll its whole
 * document while the others scrolled the stage, two behaviours for one page family.
 *
 * The hem is the LAST child so it sits at the zone's foot; it is sticky with a negative margin,
 * so it costs no height and cannot open a gap beneath short content.
 */
export const TplZone: React.FC<TplZoneProps> = ({ children, hem = true, className, scrollRef, label }) => (
  <div
    ref={scrollRef}
    className={`tpl-zone${className ? ` ${className}` : ""}`}
    /* a scrollable region needs to be reachable by keyboard, and named when it is */
    tabIndex={0}
    role={label ? "region" : undefined}
    aria-label={label}
  >
    {children}
    {hem && <span className="tpl-hem" aria-hidden />}
  </div>
);

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
