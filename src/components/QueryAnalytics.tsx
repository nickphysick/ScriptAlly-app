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
import type { LivingHeader } from "./shell/PageHeader";
import { analyticsHeaderCopy } from "../lib/livingHeaders";
import { useLivingCountOverride } from "../lib/livingHeaderReview";
import { openQueryDrawer } from "../lib/queryActions/drawerStore";
import { MastheadSectionContext } from "./shell/mastheadSection";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../lib/db";
import { resolveScopedManuscript } from "../lib/shellSidebar";
import { useQcLoad } from "./queries/centre/useQcLoad";
import { AnalyticsRange } from "../lib/analytics";
import { analyticsModel } from "../lib/analyticsModel";
import { AnvSkeleton } from "./analytics/AnvSkeleton";
import { AnalyticsExhibit } from "./analytics/AnalyticsExhibit";
import { StoryRail } from "./analytics/StoryRail";
import { AnvHero, AnvJourney, AnvRange } from "./analytics/AnvJourney";
import { AnvFacts, AnvReplyChart } from "./analytics/AnvFacts";
import { AnvEndings, AnvStages } from "./analytics/AnvTwoUp";
import { AnvCaveats, AnvVolume } from "./analytics/AnvVolume";
import "./analytics/anvFrame.css";
import "./analytics/anvRail.css";
import "./analytics/anvJourney.css";
import "./analytics/anvCharts.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const NO_SECTION = { section: null };

/** The empty state's two lines (living headers v3 §4) — the ref's, verbatim. */
export const ANALYTICS_EMPTY_HEADING = "Nothing to measure yet";
export const ANALYTICS_EMPTY_SUBLINE = "Once your queries start coming back, this page shows how the querying is going — what became of each one, how long agents take, and whether it’s changing.";

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

  /* ── the living header (living headers v3) ── the count is every query on the manuscript, and the
     subline reads the ALL-TIME model, so moving the range control never rewrites the header. */
  const allModel = React.useMemo(() => {
    if (range === "all") return model;
    const scoped = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    return analyticsModel({ queries: scoped, activities, agents, packages, versions, range: "all", nowMs: Date.now() });
  }, [model, range, queries, activities, agents, packages, versions, manuscript]);
  const lhOverride = import.meta.env.MODE !== "production" ? useLivingCountOverride() : null;
  const anCount = lhOverride != null && lhOverride >= 0 ? lhOverride : allModel.total;
  const exhibit = !load.loading && manuscript !== null && anCount === 0;
  const living: LivingHeader | undefined = manuscript ? {
    count: load.loading ? null : anCount,
    copy: (n) => analyticsHeaderCopy(n, { answered: allModel.replies, requests: allModel.requests, medianDays: allModel.medianWaitDays }),
    empty: { heading: ANALYTICS_EMPTY_HEADING, subline: [ANALYTICS_EMPTY_SUBLINE] },
  } : undefined;

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
  } else if (exhibit) {
    body = (
      <div className="anv-exbelow" data-anv="empty">
        <AnalyticsExhibit />
        {/* the ref's one quiet link — a real route: the log-a-query journey */}
        <p className="lh-hint" data-lh="hint">
          <button type="button" className="lh-hint-link" onClick={() => openQueryDrawer({ mode: "log", manuscriptId: manuscript?.id })}>Log your first query ›</button>
        </p>
      </div>
    );
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
          <div className="anv-twoup" data-anv="twoup">
            <AnvEndings model={model} />
            <AnvStages model={model} />
          </div>
          <AnvVolume model={model} />
          {/* ⚠️ THE CAVEATS ARE THE LAST THING ON THE PAGE — measured (analyticsV2a "caveats-last") */}
          <AnvCaveats model={model} />
        </div>
        <StoryRail events={model.story.events} foot={model.story.foot} />
      </>
    );
  }

  return (
    <div className="qa-wrap">
      <WorkspacePageGrid className="qa-wpg" scrollLabel="Analytics" masthead={null}>
        <div className={pageClass} data-anv="page" data-sent={model.sent} data-since={model.sinceMs ?? ""} data-range={range} data-phase={load.phase}>
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
                description={manuscript ? undefined : "How your querying is going — and what the numbers can't tell you."}
                living={living}
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
