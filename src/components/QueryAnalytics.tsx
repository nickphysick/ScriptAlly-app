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
import { Caveats, Funnel, OverTime, Records, ShareBars, TrainingLog } from "./analytics/A17Figures";
import { A21Header, usePhone } from "./analytics/A21Header";
import { A21Desk } from "./analytics/A21Desk";
import { A21Window } from "./analytics/A21Window";
import { A21Steps } from "./analytics/A21Steps";
import { A21Records } from "./analytics/A21Records";
import { A21Stand } from "./analytics/A21Stand";
import { A21Empty } from "./analytics/A21Empty";
import { buildV21, windowLede } from "../lib/analyticsV21";
import { openResponsePicker, responsePickerHosted } from "../lib/queryPanelStore";
import "./analytics/a17.css";
import "./analytics/a21.css"; /* after a17: v21 restates its desktop rules */

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
  const { model, v21 } = React.useMemo(() => {
    const nowMs = Date.now();
    const own = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    /* ⚠️ THE DEV REVIEW AID IS GATED HERE, AT THE CALL SITE: a statically replaced MODE makes the branch
       dead in a production build, so the module is unreachable from it (AN17-16 cuts the fixture with it). */
    const scoped = import.meta.env.MODE === "production" ? own : limitForReview(own);
    const m = analyticsModel({ queries: scoped, activities, agents, packages, versions, range: "all", nowMs, title: manuscript?.title });
    return { model: m, v21: buildV21(m, agents, nowMs) };
    /* location.key: a switch re-opens the route, and the book in scope is read from storage */
  }, [queries, activities, agents, packages, versions, manuscript, location.key]);

  const load = useQcLoad(collectionsReady && activitiesReady);
  const v = model.v17;
  const names = NAV_NAMES(model.sent);

  const phone = usePhone();
  /** "+ Record a response": query panel v2's picker where the Query Centre hosts it, else the drawer. */
  const record = React.useCallback(() => { if (responsePickerHosted()) openResponsePicker(); else openQueryDrawer({ mode: "resp" }); }, []);

  /** Scroll the page's own scroller to a section (or, on the empty page, to the first example). */
  const go = React.useCallback((sec: number) => {
    const page = pageRef.current;
    const scroller = page?.closest(".wpg-scroll") as HTMLElement | null;
    const target = (page?.querySelector(`[data-a17="sec"][data-sec="${sec}"]`) ?? page?.querySelector('[data-a17="example"]')) as HTMLElement | null;
    if (!scroller || !target) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12;
    const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ top, behavior: still ? "auto" : "smooth" });
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
    body = <A21Empty title={manuscript?.title || null} onImport={() => onNavigate?.("import")} />;
  } else {
    const b = v.banners;
    /* v21 §D/§E: two sections are rebuilt and renamed; their kickers and ledes come with them */
    const wl = windowLede(v21.window);
    const b3 = { ...b[3], title: "Replies against the stated window" };
    const b4 = { ...b[4], count: "from query to offer", title: "How long each step takes", sentence: "The usual number of days between one stage and the next, and how long queries ran before they ended. The later steps rest on very few queries, so they will move as more come in." };
    body = (
      <>
        <Glance cells={v.glance} />
        <A21Desk cards={v21.desk} onGo={go} />
        <Section sec={0} banner={b[0]}><Funnel model={model} /></Section>
        <Section sec={1} banner={b[1]} readings={v.log.readings} tint><TrainingLog model={model} /></Section>
        <Section sec={2} banner={b[2]} readings={v.rate.readings}><ShareBars model={model} /></Section>
        <Section sec={3} banner={b3} readings={v.reply.readings} tint lede={<>{wl.lead}{wl.bold ? <b>{wl.bold}</b> : null}{wl.rest}</>}><A21Window w={v21.window} /></Section>
        <Section sec={4} banner={b4}><A21Steps steps={v21.steps} endings={v21.endings} /></Section>
        <Section sec={5} banner={b[5]} tint
          desktop={<A21Records rec={v21.records} count={b[5].count} title={b[5].title} msTitle={manuscript.title || null} onOverTime={() => go(6)} />}><Records model={model} /></Section>
        <Section sec={6} banner={b[6]} readings={v.overTime.readings}><OverTime model={model} /></Section>
        <A21Stand model={model} v21={v21} banner={b[7]} />
        <Section sec={8} banner={b[8]} ws><Caveats model={model} /></Section>
      </>
    );
  }

  const pageClass = ["a17-page", load.loading ? "a17-page--loading" : "", load.blank ? "a17-page--blank" : ""].filter(Boolean).join(" ");
  return (
    <div className="qa-wrap">
      <WorkspacePageGrid className="qa-wpg" scrollLabel="Analytics" masthead={null}>
        <div className={pageClass} ref={pageRef} data-a17="page" data-sent={model.sent} data-dated={v.dated} data-ms={manuscript?.id ?? ""} data-phase={load.phase}>
          <TipProvider>
            {/* v21 §A: the desktop opens on the light header; the phone keeps v17's band (decision 5) */}
            {!phone && !empty && manuscript !== null ? (
              <A21Header loading={load.loading} sent={model.sent} replies={model.replies} msTitle={manuscript.title || null}
                rows={load.loading ? null : v21.standing} inside={load.loading ? null : v21.inside}
                onRecord={record} onRead={() => go(0)} onRing={() => go(3)} />
            ) : null}
            {phone && !empty ? <PageHeader
              variant="full"
              band
              bandFixed
              panel
              title="Less guesswork, better results"
              description="Patterns, stats and insights to help you query smarter."
              primary={{ label: "Take a look ↓", onClick: () => go(0) }}
              secondary={{ label: "Record a response", onClick: () => openQueryDrawer({ mode: "resp" }) }}
              art={<BandDisc />}
            /> : null}
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
