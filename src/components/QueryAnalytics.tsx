/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAnalytics — Queries → Analytics, v26 (design-refs/analytics-v26/analytics-v26.html): one short page that shows
 * how the campaign is going in pictures anyone can read, and links each finding to the page where the writer acts on it.
 *
 *   A  the shared workspace header (analytics/A26Header)
 *   B  What to do next (Everyday) · or "Patterns appear after 5 replies" (Early)
 *   C  What happened to your {sent} queries?
 *   D  Is it getting better? · Who says yes? (Everyday)
 *   E  How long do replies take? · Do nudges work? (Everyday) — in Early, How long sits beside F
 *   F  How do you compare? (the one outside figure, behind SHOW_OUTSIDE_COMPARISON)
 *   G  the closing line, then AppFooter
 *   H  day one: the header, then "How it works"
 *
 * ⚠️ EVERY FIGURE IS COUNTED FROM WHAT THE WRITER HAS LOGGED (lib/analyticsV26). Nothing is estimated, forecast or
 *    inferred; the one exception is F, which says so on the page.
 * ⚠️ IT READS AND DERIVES. NOTHING ELSE. No write, no callable, no `recomputeQuery`, no stored field behind any number.
 * ⚠️ ONE MANUSCRIPT, NEVER AN AGGREGATE. Scope is the manuscript in the bar's switcher —
 *    `localStorage["scriptally_active_manuscript_id"]`, written by `BarSwitcher` before it re-opens the route. It is
 *    read every render, and the derivation is keyed on `useLocation().key` as well as the data, so a switch can never
 *    leave the page stating the previous book.
 * ⚠️ BELOW 768px THIS PAGE IS NOT MOUNTED: phone/pages/PageRoutes's `AnalyticsRoute` draws the phone app's own page.
 * ⚠️ THE PAGE LIVES IN THIS FILE — `workspacePageGrid.test.tsx` and `pageStructure.test.ts` read the path. Its parts live
 *    in `analytics/`.
 */
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { AppFooter } from "./shell/AppFooter";
import { PageGuide } from "./shell/PageGuide";
import { useScriptAllyDb } from "../lib/db";
import { resolveScopedManuscript } from "../lib/shellSidebar";
import { useQcLoad } from "./queries/centre/useQcLoad";
import { analyticsModel } from "../lib/analyticsModel";
import { openQueryDrawer } from "../lib/queryActions/drawerStore";
import { limitForReview } from "../lib/analyticsReviewAid";
import { requestPageGuide } from "../lib/pageGuide";
import { quietWeeksOf } from "../lib/queryState";
import { LoadFailed } from "./notes/LoadFailed";
import { useLoadFailure } from "./notes/useLoadFailure";
import { BENCHMARKS_QUERYTRACKER, benchmark, expectedByNow, type Benchmarks } from "../lib/analyticsV24";
import { buildV26, mostOneIn } from "../lib/analyticsV26";
import { openResponse } from "../lib/queryPanelStore";
import { A26TipLayer } from "./analytics/A26Bits";
import { A26Header } from "./analytics/A26Header";
import { A26Early, A26Next, type A26Links } from "./analytics/A26Next";
import { A26What } from "./analytics/A26What";
import { A26Better, A26Who } from "./analytics/A26Better";
import { A26Long, A26Nudges } from "./analytics/A26Long";
import { A26Compare, SHOW_OUTSIDE_COMPARISON } from "./analytics/A26Compare";
import { A26DayOne, A26_GUIDE_STEPS } from "./analytics/A26DayOne";
import "./analytics/a26.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** G — the closing line. */
export function closingLine(replies: number, compareAbove: boolean): string {
  const first = `${compareAbove ? "Apart from the comparison above, every" : "Every"} figure comes from what you${"’"}ve logged.`;
  return replies > 0 ? `${first} With ${replies} ${replies === 1 ? "reply" : "replies"}, one more can shift things noticeably.` : first;
}

type DevHooks = { __SA_AN26_BENCH?: Benchmarks; __SA_AN26_NO_COMPARE?: boolean; __SA_AN26?: unknown };

export const QueryAnalytics: React.FC<{ onNavigate?: (tab: string, sub?: string) => void }> = ({ onNavigate }) => {
  const { queries, activities, agents, manuscripts, packages, versions, tasks, currentUser, collectionsReady, activitiesReady } = useScriptAllyDb();
  const location = useLocation();
  const navigate = useNavigate();

  /* Read every render — see the scope note above. */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const manuscript = resolveScopedManuscript(manuscripts, storedMs);
  const quietWeeks = quietWeeksOf(currentUser);

  /* ⚠️ DEV ONLY, GATED HERE AT THE CALL SITE: the AN26-F1 lock swaps the anchors to prove the panels read them, and
     turns the comparison off to prove the constant removes both its places. A statically replaced MODE makes both
     dead in a production build. */
  const dev = import.meta.env.MODE === "production" || typeof window === "undefined" ? null : (window as unknown as DevHooks);
  const anchors: Benchmarks = dev?.__SA_AN26_BENCH ?? BENCHMARKS_QUERYTRACKER;
  const showCompare = SHOW_OUTSIDE_COMPARISON && !(dev?.__SA_AN26_NO_COMPARE === true);

  /** ⚠️ ONE CLOCK PER DERIVATION, so every figure on the page agrees about what today is. */
  const { v26, bench, expected } = React.useMemo(() => {
    const nowMs = Date.now();
    const own = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    /* ⚠️ THE DEV REVIEW AID IS GATED HERE, AT THE CALL SITE: a statically replaced MODE makes the branch
       dead in a production build, so the module is unreachable from it. */
    const scoped = import.meta.env.MODE === "production" ? own : limitForReview(own);
    const m = analyticsModel({ queries: scoped, activities, agents, packages, versions, range: "all", nowMs, title: manuscript?.title });
    const v = buildV26({ items: m.items, activities, agents, tasks, nowMs, quietWeeks });
    const e = expectedByNow(m.items, nowMs);
    return { v26: v, bench: benchmark(v.outcomes, e, anchors), expected: e };
    /* location.key: a switch re-opens the route, and the book in scope is read from storage */
  }, [queries, activities, agents, packages, versions, tasks, manuscript, quietWeeks, anchors, location.key]);

  /* ⚠️ DEV ONLY, GATED HERE AT THE CALL SITE: the AN26 locks compare what the page DRAWS with what the model SAYS. */
  React.useEffect(() => {
    if (import.meta.env.MODE === "production") return;
    (window as unknown as DevHooks).__SA_AN26 = { v26, bench, anchors, showCompare, manuscriptId: manuscript?.id ?? null };
  }, [v26, bench, anchors, showCompare, manuscript]);

  const load = useQcLoad(collectionsReady && activitiesReady);
  const anFail = useLoadFailure();

  const record = React.useCallback(() => { openResponse(); }, []);
  const logFirst = React.useCallback(() => openQueryDrawer({ mode: "log" }), []);
  /* the links out. ⚠️ Queries and the Contact list have no filter a link can set today: both open unfiltered (listed
     for Nick). Settings opens at Preferences, where "A query goes quiet after" is. */
  const links = React.useMemo<A26Links>(() => ({
    queries: () => onNavigate?.("queries"),
    agents: () => onNavigate?.("agents"),
    quiet: () => navigate("/account/preferences"),
  }), [onNavigate, navigate]);

  const v = v26;
  const sent = v.outcomes.sent;
  const replies = v.tally.all;
  const dayOne = !load.loading && manuscript !== null && sent === 0;
  const everyday = v.state === "everyday";

  let body: React.ReactNode;
  if (anFail) {
    body = <LoadFailed words={anFail.words} onRetry={anFail.retry} busy={anFail.busy} probe="analytics" />;
  } else if (load.loading) {
    body = <><span className="a26-sk" /><span className="a26-sk" /></>;
  } else if (manuscript === null) {
    body = (
      <p className="a26-blank" data-a26="blank">
        Analytics follow a manuscript. Add one and its queries, requests and reply times will be gathered here.
      </p>
    );
  } else if (dayOne) {
    body = <A26DayOne onLog={logFirst} />;
  } else {
    const nudgesShown = everyday && v.nudges.rows.length > 0;
    body = (
      <>
        {everyday ? (v.findings.length ? <A26Next findings={v.findings} links={links} /> : null) : <A26Early replies={replies} />}
        <A26What sent={sent} now={v.now} path={v.path} />
        {everyday ? (
          <div className="a26-sec" data-a26="row-d">
            <div className={`a26-two a26-two--eq${v.rounds ? "" : " a26-two--one"}`}>
              {v.rounds ? <A26Better rounds={v.rounds} links={links} /> : null}
              <A26Who who={v.who} links={links} />
            </div>
          </div>
        ) : null}
        <div className="a26-sec" data-a26="row-e">
          <div className={`a26-two${(everyday ? nudgesShown : showCompare) ? "" : " a26-two--one"}`}>
            <A26Long t={v.times} links={links} />
            {everyday ? (nudgesShown ? <A26Nudges n={v.nudges} links={links} /> : null)
              : showCompare ? <A26Compare bench={bench} anchors={anchors} o={v.outcomes} e={expected} /> : null}
          </div>
        </div>
        {everyday && showCompare ? (
          <div className="a26-sec" data-a26="row-f"><A26Compare bench={bench} anchors={anchors} o={v.outcomes} e={expected} /></div>
        ) : null}
        <p className="a26-note" data-a26="closing">{closingLine(replies, everyday && showCompare)}</p>
      </>
    );
  }

  return (
    <div className="qa-wrap">
      <WorkspacePageGrid className="qa-wpg" scrollLabel="Analytics" masthead={null}>
        <div className="a26-page" data-a26="page" data-a26-state={load.loading ? "loading" : manuscript === null ? "no-ms" : v.state}
          data-sent={sent} data-replies={replies} data-ms={manuscript?.id ?? ""} data-phase={load.phase}>
          <A26TipLayer>
            <A26Header loading={load.loading || !!anFail} dayOne={dayOne && !anFail} noMs={!load.loading && !anFail && manuscript === null}
              sent={sent} replies={replies} asked={v.outcomes.asked} oldestWeeks={v.oldestWaiting} msTitle={manuscript?.title || null}
              mostOneIn={showCompare ? mostOneIn(anchors.requestRate) : null}
              onRecord={record} onGuide={requestPageGuide} onLog={logFirst} />
            <div className="a26-flow" data-a26="flow">{body}</div>
            {onNavigate ? <AppFooter onNavigate={onNavigate} /> : null}
          </A26TipLayer>
          <PageGuide page="analytics" steps={A26_GUIDE_STEPS} />
        </div>
      </WorkspacePageGrid>
    </div>
  );
};
