/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAnalytics — Queries → Analytics (ref design-refs/analytics-v17.html), in the Query Centre's v126
 * dress: the greige shell, the shared anthracite band, the at-a-glance strip, nine sections each opening
 * on a banner with perched art over the desk's white frame, the floating section tab, and `AppFooter`.
 *
 * ⚠️ IT READS AND DERIVES. NOTHING ELSE. Every figure and sentence comes from `analyticsModel`'s `v17`
 * block at read time; no write, no callable, no `recomputeQuery`, no stored field behind any number.
 *
 * ⚠️ ONE MANUSCRIPT, NEVER AN AGGREGATE. Scope is the manuscript in the bar's switcher —
 * `localStorage["scriptally_active_manuscript_id"]`, written by `BarSwitcher` before it re-opens the
 * route. It is read every render, and the derivation is keyed on `useLocation().key` as well as the
 * data, so a switch can never leave the page stating the previous book (AN17-18).
 *
 * ⚠️ THE PAGE LIVES IN THIS FILE — `workspacePageGrid.test.tsx` and `pageStructure.test.ts` read the
 * path. Its parts live in `analytics/`.
 */
import React from "react";
import { useLocation } from "react-router-dom";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { PageHeader } from "./shell/PageHeader";
import { AppFooter } from "./shell/AppFooter";
import { useScriptAllyDb } from "../lib/db";
import { resolveScopedManuscript } from "../lib/shellSidebar";
import { useQcLoad } from "./queries/centre/useQcLoad";
import { analyticsModel } from "../lib/analyticsModel";
import { openQueryDrawer } from "../lib/queryActions/drawerStore";
import { limitForReview } from "../lib/analyticsReviewAid";
import { Glance, NAV_NAMES, Section, SectionTab, Skeleton, TipProvider, useReveal } from "./analytics/A17Frame";
import { Endings, Funnel, ReplyWindow, ShareBars, StageGaps, TrainingLog } from "./analytics/A17Figures";
import { A17Empty } from "./analytics/A17Empty";
import "./analytics/a17.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** The band's illustration slot: a 250px white disc, empty until the art arrives (`artSrc`). */
const BandDisc: React.FC<{ artSrc?: string }> = ({ artSrc }) => (
  <span className="a17-disc" data-a17="disc">{artSrc ? <img src={artSrc} alt="" /> : null}</span>
);

export const QueryAnalytics: React.FC<{ onNavigate?: (tab: string, sub?: string) => void }> = ({ onNavigate }) => {
  const { queries, activities, agents, manuscripts, packages, versions, collectionsReady, activitiesReady } = useScriptAllyDb();
  const location = useLocation();
  const pageRef = React.useRef<HTMLDivElement | null>(null);

  /* Read every render — see the scope note above. */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const manuscript = resolveScopedManuscript(manuscripts, storedMs);

  /** ⚠️ ONE CLOCK PER DERIVATION, so every figure on the page agrees about what today is. */
  const model = React.useMemo(() => {
    const own = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    /* ⚠️ THE DEV REVIEW AID IS GATED HERE, AT THE CALL SITE: a statically replaced MODE makes the branch
       dead in a production build, so the module is unreachable from it (AN17-16 cuts the fixture with it). */
    const scoped = import.meta.env.MODE === "production" ? own : limitForReview(own);
    return analyticsModel({ queries: scoped, activities, agents, packages, versions, range: "all", nowMs: Date.now(), title: manuscript?.title });
    /* location.key: a switch re-opens the route, and the book in scope is read from storage */
  }, [queries, activities, agents, packages, versions, manuscript, location.key]);

  const load = useQcLoad(collectionsReady && activitiesReady);
  const v = model.v17;
  const names = NAV_NAMES(model.sent);

  /** Scroll the page's own scroller to a section (or, on the empty page, to the first example). */
  const go = React.useCallback((sec: number) => {
    const page = pageRef.current;
    const scroller = page?.closest(".wpg-scroll") as HTMLElement | null;
    const target = (page?.querySelector(`[data-a17="sec"][data-sec="${sec}"]`) ?? page?.querySelector('[data-a17="example"]')) as HTMLElement | null;
    if (!scroller || !target) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12;
    scroller.scrollTo({ top, behavior: "smooth" });
  }, []);

  const empty = !load.loading && manuscript !== null && model.total === 0;
  useReveal(pageRef, [load.loading, empty, model]);

  let body: React.ReactNode;
  if (load.loading) {
    body = <Skeleton />;
  } else if (manuscript === null) {
    body = (
      <p className="a17-blank" data-a17="blank">
        Analytics follow a manuscript. Add one and its queries, requests and reply times will be gathered here.
      </p>
    );
  } else if (empty) {
    body = <A17Empty />;
  } else {
    const b = v.banners;
    body = (
      <>
        <Glance cells={v.glance} />
        <Section sec={0} banner={b[0]}><Funnel model={model} /></Section>
        <Section sec={1} banner={b[1]} readings={v.log.readings}><TrainingLog model={model} /></Section>
        <Section sec={2} banner={b[2]} readings={v.rate.readings}><ShareBars model={model} /></Section>
        <Section sec={3} banner={b[3]} readings={v.reply.readings}><ReplyWindow model={model} /></Section>
        <Section sec={4} banner={b[4]} readings={v.waits.readings}><div className="a17-two"><StageGaps model={model} /><Endings model={model} /></div></Section>
        <Section sec={5} banner={b[5]}>{null}</Section>
        <Section sec={6} banner={b[6]}>{null}</Section>
        <Section sec={7} banner={b[7]}>{null}</Section>
        <Section sec={8} banner={b[8]}>{null}</Section>
      </>
    );
  }

  const pageClass = ["a17-page", load.loading ? "a17-page--loading" : "", load.blank ? "a17-page--blank" : ""].filter(Boolean).join(" ");
  return (
    <div className="qa-wrap">
      <WorkspacePageGrid className="qa-wpg" scrollLabel="Analytics" masthead={null}>
        <div className={pageClass} ref={pageRef} data-a17="page" data-sent={model.sent} data-dated={v.dated} data-ms={manuscript?.id ?? ""} data-phase={load.phase}>
          <TipProvider>
            {/* the band is the page's own chrome, so it renders through loading and on the empty page */}
            <PageHeader
              variant="full"
              band
              bandFixed
              title="Less guesswork, better results"
              description="Patterns, stats and insights to help you query smarter."
              primary={{ label: "Take a look ↓", onClick: () => go(0) }}
              secondary={{ label: "Record a response", onClick: () => openQueryDrawer({ mode: "resp" }) }}
              art={<BandDisc />}
            />
            <div className="a17-flow" data-a17="flow">{body}</div>
            <div className="a17-after" />
            {onNavigate ? <AppFooter onNavigate={onNavigate} /> : null}
            {!load.loading && manuscript !== null && !empty ? <SectionTab pageRef={pageRef} names={names} onGo={go} /> : null}
          </TipProvider>
        </div>
      </WorkspacePageGrid>
    </div>
  );
};
