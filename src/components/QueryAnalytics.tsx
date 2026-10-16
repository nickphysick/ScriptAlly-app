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
import { Glance, SectionTab, Skeleton, TipProvider, useReveal } from "./analytics/A17Frame";
import { A21Header, usePhone } from "./analytics/A21Header";
import { A21Desk } from "./analytics/A21Desk";
import { Sx } from "./analytics/A24Frame";
import { S1Body, s1Readings } from "./analytics/A24S1";
import { S2Body, s2Readings } from "./analytics/A24S2";
import { S3Body, s3Readings } from "./analytics/A24S3";
import { S4Body, s4Readings } from "./analytics/A24S4";
import { A21Empty } from "./analytics/A21Empty";
import { buildV21 } from "../lib/analyticsV21";
import { buildV24, deskV24, heads, ringOf, QUESTIONS } from "../lib/analyticsV24";
import { openResponsePicker, responsePickerHosted } from "../lib/queryPanelStore";
import "./analytics/a17.css";
import "./analytics/a21.css"; /* after a17: v21 restates its desktop rules */
import "./analytics/a24.css"; /* after a21: v24 adds the seven sections and the steps card */

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
  const { model, v21, v24 } = React.useMemo(() => {
    const nowMs = Date.now();
    const own = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    /* ⚠️ THE DEV REVIEW AID IS GATED HERE, AT THE CALL SITE: a statically replaced MODE makes the branch
       dead in a production build, so the module is unreachable from it (AN17-16 cuts the fixture with it). */
    const scoped = import.meta.env.MODE === "production" ? own : limitForReview(own);
    const m = analyticsModel({ queries: scoped, activities, agents, packages, versions, range: "all", nowMs, title: manuscript?.title });
    return { model: m, v21: buildV21(m, agents, nowMs), v24: buildV24(m, nowMs) };
    /* location.key: a switch re-opens the route, and the book in scope is read from storage */
  }, [queries, activities, agents, packages, versions, manuscript, location.key]);

  /* ⚠️ DEV ONLY, GATED HERE AT THE CALL SITE: the AN21 locks compare what the page DRAWS with what the model SAYS.
     A statically replaced MODE makes this dead in a production build, as the review aid above is. */
  React.useEffect(() => {
    if (import.meta.env.MODE === "production") return;
    (window as unknown as { __SA_AN21?: unknown }).__SA_AN21 = { v21, v24, sent: model.sent, replies: model.replies, offers: model.offers, fulls: model.fulls };
  }, [v21, v24, model]);

  const load = useQcLoad(collectionsReady && activitiesReady);
  const v = model.v17;
  const names = [...QUESTIONS];

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
    /* v24 §C: seven question sections, each answering its question in its first sentence */
    const h = heads(v24);
    body = (
      <>
        <Glance cells={v.glance} />
        <A21Desk cards={deskV24(model, v24, v24.nowMs)} onGo={go} />
        <Sx sec={0} head={h[0]} readings={s1Readings(v24)}><S1Body v={v24} /></Sx>
        <Sx sec={1} head={h[1]} readings={s2Readings(v24)}><S2Body v={v24} /></Sx>
        <Sx sec={2} head={h[2]} readings={s3Readings(v24)}><S3Body v={v24} /></Sx>
        <Sx sec={3} head={h[3]} readings={s4Readings(v24)}><S4Body v={v24} /></Sx>
        <Sx sec={4} head={h[4]} />
        <Sx sec={5} head={h[5]} />
        <Sx sec={6} head={h[6]} />
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
                rows={load.loading ? null : v21.standing} inside={load.loading ? null : ringOf(v24.keeping)}
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
