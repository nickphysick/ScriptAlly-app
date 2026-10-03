/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAnalytics — Queries → Analytics (ref design-refs/analytics-v13.html).
 *
 * ⚠️ IT READS AND DERIVES. NOTHING ELSE. Every figure and sentence comes from `analyticsModel`'s `v13`
 * block at read time; no write, no callable, no `recomputeQuery`, no stored field behind any number.
 *
 * ⚠️ ONE MANUSCRIPT, NEVER AN AGGREGATE. Scope is the manuscript in the bar's switcher —
 * `localStorage["scriptally_active_manuscript_id"]`, written by `BarSwitcher` before it re-opens the
 * route. It is read every render, and the derivation is keyed on `useLocation().key` as well as the
 * data, so a switch can never leave the page stating the previous book.
 *
 * ⚠️ THE PAGE OPENS ON A FEATURE CONTAINER, NOT A LIVING HEADER (v13, superseding living headers v3 on
 * this page only). The page's name lives in the bar's breadcrumb (`/queries/analytics` stays in
 * `LIVING_ROUTES`); the grid draws no masthead. No time-range control and no Export: the ref has
 * neither (both noted in the run report for Nick).
 *
 * ⚠️ THE PAGE LIVES IN THIS FILE — `workspacePageGrid.test.tsx` and `pageStructure.test.ts` read the
 * path. Its parts live in `analytics/`.
 */
import React from "react";
import { useLocation } from "react-router-dom";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../lib/db";
import { resolveScopedManuscript } from "../lib/shellSidebar";
import { useQcLoad } from "./queries/centre/useQcLoad";
import { analyticsModel } from "../lib/analyticsModel";
import { DotNav, Feature, Section, Skeleton, TipProvider, useReveal } from "./analytics/A13Frame";
import { A13Empty } from "./analytics/A13Empty";
import { Funnel, Volume } from "./analytics/A13Figures";
import "./analytics/a13.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const QueryAnalytics: React.FC = () => {
  const { queries, activities, agents, manuscripts, packages, versions, collectionsReady, activitiesReady } = useScriptAllyDb();
  const location = useLocation();
  const pageRef = React.useRef<HTMLDivElement | null>(null);

  /* Read every render — see the scope note above. */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const manuscript = resolveScopedManuscript(manuscripts, storedMs);

  /** ⚠️ ONE CLOCK PER DERIVATION, so every figure on the page agrees about what today is. */
  const model = React.useMemo(() => {
    const scoped = manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : [];
    return analyticsModel({ queries: scoped, activities, agents, packages, versions, range: "all", nowMs: Date.now(), title: manuscript?.title });
    /* location.key: a switch re-opens the route, and the book in scope is read from storage */
  }, [queries, activities, agents, packages, versions, manuscript, location.key]);

  const load = useQcLoad(collectionsReady && activitiesReady);
  const v = model.v13;

  /**
   * ⚠️ "ABOUT A VIEWPORT TALL" IS THE SCROLLPORT, MEASURED — never `100vh` with the ref's constant
   * offset, which is a guess at the chrome above its own scroller. Published as `--a13-port`; a zero
   * reading is the page before layout (or hidden under a sibling route) and is refused.
   */
  React.useLayoutEffect(() => {
    const page = pageRef.current;
    const scroller = page?.closest(".wpg-scroll") as HTMLElement | null;
    if (!page || !scroller) return undefined;
    const put = () => { const h = scroller.clientHeight; if (h > 0) page.style.setProperty("--a13-port", `${h}px`); };
    put();
    const ro = new ResizeObserver(put);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);

  /** Scroll the page's own scroller to a section (or, on the empty page, to the first example). */
  const go = React.useCallback((sec: number) => {
    const page = pageRef.current;
    const scroller = page?.closest(".wpg-scroll") as HTMLElement | null;
    const target = (page?.querySelector(`[data-a13="sec"][data-sec="${sec}"]`) ?? page?.querySelector('[data-a13="example"]')) as HTMLElement | null;
    if (!scroller || !target) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 10;
    scroller.scrollTo({ top, behavior: "smooth" });
  }, []);

  const empty = !load.loading && manuscript !== null && model.total === 0;
  useReveal(pageRef, [load.loading, empty, model]);

  let body: React.ReactNode;
  if (load.loading) {
    body = <Skeleton />;
  } else if (manuscript === null) {
    body = (
      <p className="a13-blank" data-a13="blank">
        Analytics follow a manuscript. Add one and its queries, requests and reply times will be gathered here.
      </p>
    );
  } else if (empty) {
    body = <A13Empty model={model} onGo={() => go(0)} />;
  } else {
    body = (
      <>
        <Feature model={model} onGo={() => go(0)} />
        <Section sec={0} num="Fall-off by stage" headline={v.funnel.headline} artH={140}
          lede="Each row is a stage, and its bar is how many queries reached it. The note beside each bar is how many went on from the stage before."
          art={["Illustration · letters sorted", "into four trays"]}>
          <Funnel model={model} />
        </Section>
        <Section sec={1} num="Queries sent" headline={v.sentByMonth.headline} lede={v.sentByMonth.lede} white
          art={["Illustration · the Courier", "with a bundle of letters"]} readings={v.sentByMonth.readings}>
          <Volume model={model} />
        </Section>
        <Section sec={2} num="Response rate" headline={v.rate.headline} lede={v.rate.lede} flip
          art={["Illustration · the Archivist", "opening the post"]} readings={v.rate.readings} />
        <Section sec={3} num="Response window honesty" headline="What agents said, against when they replied" lede={v.reply.lede} white
          art={["Illustration · a calendar", "on the agent's wall"]} readings={v.reply.readings} />
        <Section sec={4} num="Wait times by stage" headline="How long each step has taken" flip
          lede="Left: the gap between one stage and the next, from the fastest query to the slowest, with the median marked. Right: how many weeks each closed query ran before it ended. The later stages rest on very few queries."
          art={["Illustration · an hourglass", "on the desk"]} readings={v.waits.readings} />
        <Section sec={5} num="How things stand" headline="Every query against time, up to today" lede={v.lanes.lede} white
          art={["Illustration · the hawk", "over the field"]} readings={v.lanes.readings} />
        <section className="a13-chap" data-a13="sec" data-sec={6} id="a13-sec-6">
          <div className="a13-num a13-rv">What the numbers can&apos;t tell you</div>
          <h2 className="a13-big a13-tw a13-rv d1">{v.caveats.headline}</h2>
          <div className="a13-cav a13-rv d2">
            {v.caveats.notes.map((n) => <div key={n.title}><h4 className="a13-tw">{n.title}</h4><p>{n.text}</p></div>)}
          </div>
        </section>
      </>
    );
  }

  const pageClass = ["a13-page", load.loading ? "a13-page--loading" : "", load.blank ? "a13-page--blank" : ""].filter(Boolean).join(" ");
  return (
    <div className="qa-wrap">
      <WorkspacePageGrid className="qa-wpg" scrollLabel="Analytics" masthead={null}>
        <div className={pageClass} ref={pageRef} data-a13="page" data-sent={model.sent} data-phase={load.phase}>
          <TipProvider>
            <div className="a13-flow" data-a13="flow">{body}</div>
            {!load.loading && manuscript !== null && !empty ? <DotNav pageRef={pageRef} onGo={go} /> : null}
          </TipProvider>
        </div>
      </WorkspacePageGrid>
    </div>
  );
};
