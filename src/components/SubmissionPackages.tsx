/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Submission packages v26 (route /queries/packages; 25 Oct) ═════════════════════════════════════════════════
 * Ref: design-refs/submission-packages-v26/submission-packages-v26.html (SUPERSEDES packages-v4 and materials/packages-v3).
 * The packages-led page: the navy header (or, for a writer with no letters or synopses yet, the promise with its
 * animation), the tab bar, and then either the builder and Results, or the Query letters / Synopses table.
 *
 * ⚠️ /manuscripts/packages REDIRECTS HERE with its query string (lib/packagesRoute), so every deep link still works:
 *    `?pkg={id}` opens that package in the builder, `?tab=builder` opens New package, `?tab=tracking` scrolls to
 *    Results, and `?new=1&version={id}` (from Versions) opens New package with that version as its pages.
 * ⚠️ THE CSS IS GENERATED from the ref's computed styles (packages/v26/pk26.generated.css; scripts/pk26/), so the
 *    markup below mirrors the ref's element for element, with the `p6-` prefix. Change the ref, regenerate.
 * ⚠️ OPEN TO ALL (D7). Nothing on this page reads the plan; the PRO tag is visual, as on Versions.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { usePk26Model } from "./packages/v26/usePk26Model";
import { HowItWorks, Pk26Header, Pk26Hero } from "./packages/v26/Pk26Header";
import { Pk26Tabs, type PageTab } from "./packages/v26/Pk26Tabs";
import { Pk26Builder } from "./packages/v26/Pk26Builder";
import { Pk26Results } from "./packages/v26/Pk26Results";
import { Pk26Materials } from "./packages/v26/Pk26Materials";
import { Pk26Drawer, type DrawerView } from "./packages/v26/Pk26Drawer";
import { Pk26Dialog, type DialogView } from "./packages/v26/Pk26Dialog";
import "./packages/v26/pk26.generated.css";
import "./packages/v26/pk26.css";

export const SubmissionPackages: React.FC<{ active?: boolean; onNavigate?: (tab: string, sub?: string) => void }> = ({ active: routeActive = true }) => {
  const model = usePk26Model();
  const { activeMs, live, active, msId, collectionsReady, letters, synopses, versionRows, comps } = model;
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<PageTab>("pk");
  const [curId, setCurId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [dialog, setDialog] = useState<DialogView | null>(null);
  const [how, setHow] = useState(false);
  const current = useMemo(() => live.find((p) => p.id === curId) ?? active ?? live[0] ?? null, [live, curId, active]);

  /* a different manuscript is a different page */
  const lastMs = useRef(msId);
  useEffect(() => { if (lastMs.current && lastMs.current !== msId) { setDrawer(null); setDialog(null); setCurId(null); } lastMs.current = msId; }, [msId]);

  /* ── deep links, read on every arrival ── */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const part = (k: string) => rootRef.current?.querySelector<HTMLElement>(`[data-pk26="${k}"]`) ?? null;
  const [pending, setPending] = useState<{ pkg?: string; track?: boolean } | null>(null);
  useEffect(() => {
    if (!routeActive) return;
    const q = new URLSearchParams(location.search);
    const t = q.get("tab");
    if (t === "builder") setDialog({ m: "new" });
    if (q.get("new") === "1") setDialog({ m: "new", version: q.get("version") ?? undefined });
    if (t === "tracking") { setTab("pk"); setPending({ track: true }); }
    const pkg = q.get("pkg");
    if (pkg) { setTab("pk"); setPending({ pkg }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, routeActive]);
  useLayoutEffect(() => {
    if (!pending) return;
    if (pending.pkg) {
      if (!live.some((p) => p.id === pending.pkg)) return;
      setCurId(pending.pkg);
      part("builder")?.scrollIntoView({ block: "start" });
    }
    if (pending.track) part("results")?.scrollIntoView({ block: "start" });
    setPending(null);
  }, [pending, live]);

  /* the empty state: a writer with no letters or synopses yet (only once every collection has answered) */
  const empty = !!activeMs && collectionsReady && letters.length === 0 && synopses.length === 0;
  const inUse = versionRows.find((v) => v.inUse) ?? null;
  const goQueries = (ids: string[]) => navigate({ pathname: "/queries", search: ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "" });
  const goVersions = () => navigate("/manuscripts/versions");
  const goComps = () => navigate("/manuscripts/comps");
  const openNewMaterial = (k: "let" | "syn" | "ver") => setDrawer(k === "ver" ? { m: "newver", parentId: null } : { m: "newmat", kind: k });

  return (
    <WorkspacePageGrid scrollLabel="Submission packages" masthead={null}>
      <div ref={rootRef} className={`p6${empty ? " p6-new" : ""}`} data-pk26="page">
        {empty ? <Pk26Hero onBuild={() => part("builder")?.scrollIntoView({ block: "start", behavior: "smooth" })} onHow={() => setHow(true)} />
          : <Pk26Header count={collectionsReady ? live.length : null} title={activeMs?.title ?? null} onNew={() => setDialog({ m: "new" })} onHow={() => setHow(true)} />}
        <Pk26Tabs tab={tab} onTab={setTab}
          counts={{ pk: live.length, let: letters.length, syn: synopses.length, ver: versionRows.length, comps: comps.length }}
          inUseVersionNum={inUse ? (inUse.original ? "O" : String(inUse.num)) : null} onVersions={goVersions} onComps={goComps} />
        {tab === "pk" ? (
          <div className="p6-id-vPk">
            <Pk26Builder model={model} current={current} onSelect={setCurId}
                onNewPackage={() => setDialog({ m: "new" })} onEditPackage={(p, focus) => setDialog({ m: "edit", id: p.id, ...(focus ? { focus } : {}) })}
                onOpenMaterial={(k, id) => setDrawer(k === "ext" ? { m: "ext", id } : { m: "mat", kind: k, id })}
                onNewMaterial={openNewMaterial} onOpenVersions={goVersions} onOpenComps={goComps} />
            <Pk26Results model={model} empty={empty} onSeeQueries={goQueries} />
          </div>
        ) : (
          <Pk26Materials model={model} kind={tab} onOpen={(id) => setDrawer({ m: "mat", kind: tab, id })} onAdd={() => setDrawer({ m: "newmat", kind: tab })} onOpenComps={goComps} />
        )}
      </div>
      <Pk26Drawer model={model} view={routeActive ? drawer : null} go={setDrawer} onSeeQueries={goQueries} onOpenComps={goComps} />
      <Pk26Dialog model={model} view={routeActive ? dialog : null} onClose={() => setDialog(null)} onCreated={(id) => { setCurId(id); setTab("pk"); }} />
      <HowItWorks open={routeActive && how} onClose={() => setHow(false)} />
    </WorkspacePageGrid>
  );
};

export default SubmissionPackages;
