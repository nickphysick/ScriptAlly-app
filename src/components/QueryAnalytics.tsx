/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAnalytics — Queries → Analytics (ref design-refs/analytics-v2a.html, "A · Journey, rebuilt big").
 *
 * ⚠️ IT READS AND DERIVES. NOTHING ELSE. Every figure comes from `analyticsModel` at read time; no
 * `updateDoc`, no callable, no `recomputeQuery`, no stored field behind any number.
 *
 * ⚠️ ONE MANUSCRIPT, NEVER AN AGGREGATE. Scope is the manuscript in the bar's switcher —
 * `localStorage["scriptally_active_manuscript_id"]`, which `BarSwitcher` writes before re-opening the
 * route. It is read EVERY RENDER and the derivation is keyed on `useLocation().key` as well as the
 * data, so a switch can never leave the page stating the previous book (the Contact list's fault).
 *
 * ⚠️ THE PAGE LIVES IN THIS FILE, because `workspacePageGrid.test.tsx` and `pageStructure.test.ts`
 * read this path. Its parts live in `analytics/`.
 *
 * ⚠️ THE HEADER IS THE PAGE'S FIRST ROW, NOT THE GRID'S MASTHEAD (`masthead={null}`) — the full
 * `PageHeader` spans the group and the column and the story rail sit beneath its rule, exactly as on
 * the Contact list, Comparable titles and Submission packages. No eyebrow, no actions: the ref's
 * Share card and Export have no working mechanism behind them (Step 0 §D, §E), so neither is drawn.
 */
import React from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "./shell/PageHeader";
import { MastheadSectionContext } from "./shell/mastheadSection";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../lib/db";
import { resolveScopedManuscript } from "../lib/shellSidebar";
import { useQcLoad } from "./queries/centre/useQcLoad";
import { AnalyticsRange } from "../lib/analytics";
import { analyticsModel } from "../lib/analyticsModel";
import { AnvSkeleton } from "./analytics/AnvSkeleton";
import { AnvEmpty, AnvEmptyRow } from "./analytics/AnvEmpty";
import { StoryRail } from "./analytics/StoryRail";
import { AnvHero, AnvJourney, AnvRange } from "./analytics/AnvJourney";
import { AnvFacts, AnvReplyChart } from "./analytics/AnvFacts";
import "./analytics/anvFrame.css";
import "./analytics/anvRail.css";
import "./analytics/anvJourney.css";
import "./analytics/anvCharts.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const NO_SECTION = { section: null };

/**
 * The empty state's rows, each illustrated with the page's own component populated from the example.
 * Order: the funnel, the reply window, the story — the three the go-ahead names.
 */
const EMPTY_ROWS: AnvEmptyRow[] = [
  {
    key: "journey",
    heading: "The journey so far",
    sub: "How far your queries reached — asked for more, read in full, an offer — and where each stage's queries stand today.",
    art: (m) => <AnvJourney model={m} example />,
  },
  {
    key: "reply",
    heading: "When replies arrived",
    sub: "Each reply drawn against the response window its agency states — the window from the Contact list, the reply from your record.",
    art: (m) => <AnvReplyChart model={m} example />,
  },
  {
    key: "story",
    heading: "The story so far",
    sub: "Every first — the first request, the first full, an offer — dated as it happened, with the gaps between them.",
    art: (m) => <StoryRail events={m.story.events} foot={m.story.foot} example />,
  },
];

export const QueryAnalytics: React.FC = () => {
  const { queries, activities, agents, manuscripts, packages, versions, collectionsReady, activitiesReady } = useScriptAllyDb();
  const location = useLocation();

  /**
   * ⚠️ LOCAL STATE, AND IT STAYS THAT WAY. A URL param would turn a way of looking at the same
   * queries into a place the shell has to model; a persisted one would have a writer return next
   * week to a three-month window they set once and forgot.
   */
  const [range, setRange] = React.useState<AnalyticsRange>("all");

  /* Read every render — see the scope note above. */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const manuscript = resolveScopedManuscript(manuscripts, storedMs);

  /**
   * ⚠️ ONE CLOCK PER DERIVATION, taken when the inputs change rather than on every render, so every
   * figure on the page agrees about what today is.
   */
  const model = React.useMemo(() => {
    const scoped = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    return analyticsModel({ queries: scoped, activities, agents, packages, versions, range, nowMs: Date.now() });
    /* location.key: a switch re-opens the route, and the book in scope is read from storage */
  }, [queries, activities, agents, packages, versions, manuscript, range, location.key]);

  const load = useQcLoad(collectionsReady && activitiesReady);
  const title = manuscript?.title ?? "";

  const pageClass = [
    "anv-page",
    load.loading ? "anv-page--loading" : "",
    load.blank ? "anv-page--blank" : "",
    load.entering ? "anv-page--enter" : "",
  ].filter(Boolean).join(" ");

  let body: React.ReactNode;
  if (load.loading) {
    body = <AnvSkeleton />;
  } else if (manuscript === null) {
    body = (
      <div className="anv-main" data-anv="main">
        <p className="anv-blank" data-anv="blank">
          Analytics follow a manuscript. Add one and its queries, requests and reply times will be gathered here.
        </p>
      </div>
    );
  } else if (model.total === 0) {
    body = <AnvEmpty title={title} rows={EMPTY_ROWS} />;
  } else {
    body = (
      <>
        <div className="anv-main" data-anv="main">
          <AnvHero model={model} />
          <AnvRange value={range} onChange={setRange} />
          <AnvJourney model={model} />
          <AnvFacts model={model} />
          <div className="anv-sec" data-anv="sec-timings">
            <h2 className="anv-tw">Timings</h2>
            <span className="anv-note">
              {model.replies === 0
                ? "No query has a dated reply yet"
                : `Based on the ${model.replies} ${model.replies === 1 ? "query that has" : "queries that have"} had a reply`}
            </span>
          </div>
          <AnvReplyChart model={model} />
        </div>
        <StoryRail events={model.story.events} foot={model.story.foot} />
      </>
    );
  }

  return (
    <div className="qa-wrap">
      <WorkspacePageGrid className="qa-wpg" scrollLabel="Analytics" masthead={null}>
        <div className={pageClass} data-anv="page" data-sent={model.sent} data-phase={load.phase}>
          <div className="anv-group" data-anv="group">
            <div className="anv-head" data-anv="head">
              {/* ⚠️ NO EYEBROW (the ref's header has none, and the go-ahead says so). The shared
                  header takes its section from the shell's context; this page provides none for its
                  own header rather than teaching `PageHeader` a prop the shell would then have to
                  keep in step with its breadcrumb. */}
              <MastheadSectionContext.Provider value={NO_SECTION}>
              <PageHeader
                variant="full"
                title="Analytics"
                description={
                  manuscript
                    ? <>How <em>{title}</em> is going with agents — and what the numbers can't tell you.</>
                    : "How your querying is going — and what the numbers can't tell you."
                }
              />
              </MastheadSectionContext.Provider>
            </div>
            {body}
          </div>
        </div>
      </WorkspacePageGrid>
    </div>
  );
};
