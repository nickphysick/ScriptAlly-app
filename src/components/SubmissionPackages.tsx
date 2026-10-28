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
 * ══ v40 (26 Oct; ref design-refs/submission-packages-v40/) ══ lifecycle and locking: every package is Draft → Ready
 *    → Out with agents (lib/packagesV40.packageStage). The page is header → tabs → the SHELF ("On query": everything
 *    that has gone out, locked, opening a read-only drawer) → the WORKBENCH (Draft and Ready only) → Tracking.
 * ══ v38 (27 Oct; ref design-refs/submission-packages-v38/, built over v40 at Nick's ruling) ══ ONE PAGE, NO TABS:
 *    header → "Your packages" (labels; Pk38Labels) → the builder → the Results band and showcases (Pk38Results). The
 *    Query letters and Synopses tab pages, the shelf and v40's per-tab Tracking are gone; Your materials is the one
 *    place letters, synopses and versions are listed, and `?tab=let|syn|ver` opens it on that list. A label opens
 *    any live package in the builder (one that has gone out opens LOCKED); a retired label, the builder's "Figures"
 *    and every showcase open the package drawer (Pk38Drawer). Every figure is packageReplies' (lib/packagesV38).
 * ⚠️ THE CSS IS GENERATED from the ref's computed styles (packages/v26/pk40.generated.css; scripts/pk40/), so the
 *    markup below mirrors the ref's element for element, with the `p6-` prefix. Change the ref, regenerate.
 * ⚠️ OPEN TO ALL (D7). Nothing on this page reads the plan; the PRO tag is visual, as on Versions.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { usePk26Model } from "./packages/v26/usePk26Model";
import { Pk26Hero } from "./packages/v26/Pk26Header";
import { Pk39HowItWorks } from "./packages/v26/Pk39HowItWorks";
import { Pk39Header } from "./packages/v26/Pk39Header";
import { Pk39Tip } from "./packages/v26/Pk39Tip";
import { Pk26Builder, type LibTab } from "./packages/v26/Pk26Builder";
import { Pk39Labels } from "./packages/v26/Pk39Labels";
import { Pk38Drawer } from "./packages/v26/Pk38Drawer";
import { Pk38Results } from "./packages/v26/Pk38Results";
import { libTabFromParam } from "../lib/packagesV38";
import { Pk26Drawer, type DrawerView } from "./packages/v26/Pk26Drawer";
import { Pk26Dialog, type DialogView } from "./packages/v26/Pk26Dialog";
import "./packages/v26/pk40.generated.css";
import "./packages/v26/pk26.css";
import "./packages/v26/pk38.generated.css";
import "./packages/v26/pk38.css";
import "./packages/v26/pk39.generated.css";
import "./packages/v26/pk39.css";
import "./packages/v26/pk391.css";

export const SubmissionPackages: React.FC<{ active?: boolean; onNavigate?: (tab: string, sub?: string) => void }> = ({ active: routeActive = true }) => {
  const model = usePk26Model();
  const { activeMs, live, active, msId, msPkgs, collectionsReady, letters, synopses, versionRows, comps } = model;
  const location = useLocation();
  const navigate = useNavigate();

  const [curId, setCurId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [dialog, setDialog] = useState<DialogView | null>(null);
  const [how, setHow] = useState(false);
  /** the package drawer (v38): opened from a label, "Figures" or a showcase */
  const [pkdId, setPkdId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  /** Your materials' list — the builder holds it, the page sets it from a deep link */
  const [lib, setLib] = useState<LibTab>("let");
  const retired = useMemo(() => msPkgs.filter((p) => p.status === "Retired"), [msPkgs]);
  /* ⚠️ THE CURRENT PACKAGE IS ANY LIVE ONE (v38): the label chosen, else the active package, else the first */
  const current = useMemo(() => live.find((p) => p.id === curId) ?? (active && live.some((p) => p.id === active.id) ? active : null) ?? live[0] ?? null, [live, curId, active]);
  const pkdPkg = msPkgs.find((p) => p.id === pkdId) ?? null;

  /* a different manuscript is a different page */
  const lastMs = useRef(msId);
  useEffect(() => { if (lastMs.current && lastMs.current !== msId) { setDrawer(null); setDialog(null); setCurId(null); setPkdId(null); } lastMs.current = msId; }, [msId]);

  /* ── deep links, read on every arrival ── */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const part = (k: string) => rootRef.current?.querySelector<HTMLElement>(`[data-pk26="${k}"]`) ?? null;
  const [pending, setPending] = useState<{ pkg?: string; track?: boolean; lib?: boolean; scroll?: boolean } | null>(null);
  useEffect(() => {
    if (!routeActive) return;
    const q = new URLSearchParams(location.search);
    const t = q.get("tab");
    if (t === "builder") setDialog({ m: "new" });
    if (q.get("new") === "1") setDialog({ m: "new", version: q.get("version") ?? undefined });
    if (t === "tracking") setPending({ track: true });
    /* v38: the tab pages are gone; their links open Your materials on that list */
    const lt = libTabFromParam(t);
    if (lt) { setLib(lt); setPending({ lib: true }); }
    const pkg = q.get("pkg");
    if (pkg) setPending({ pkg });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, routeActive]);
  useLayoutEffect(() => {
    if (!pending) return;
    if (pending.pkg) {
      if (!msPkgs.some((p) => p.id === pending.pkg)) return;
      /* a retired package opens its drawer; a live one opens in the builder */
      if (retired.some((p) => p.id === pending.pkg)) setPkdId(pending.pkg);
      else { setCurId(pending.pkg); part("builder")?.scrollIntoView({ block: "start", behavior: pending.scroll ? "smooth" : "auto" }); }
    }
    if (pending.track) part("results")?.scrollIntoView({ block: "start" });
    if (pending.lib) part("lib")?.scrollIntoView({ block: "center" });
    setPending(null);
  }, [pending, msPkgs, retired]);

  /* the empty state: a writer with no letters or synopses yet (only once every collection has answered) */
  const empty = !!activeMs && collectionsReady && letters.length === 0 && synopses.length === 0;
  const goQueries = (ids: string[]) => navigate({ pathname: "/queries", search: ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "" });
  const goVersions = () => navigate("/manuscripts/versions");
  const goComps = () => navigate("/manuscripts/comps");
  const goAnalytics = () => navigate("/queries/analytics");
  /* "Make a copy" (the drawer, the locked builder, the start card): New package with "a copy of {name}" chosen */
  const copy = (p: (typeof msPkgs)[number]) => { setPkdId(null); setDialog({ m: "new", copyOf: p.id }); };
  /* "Edit in the builder": load it, close the drawer, scroll to the builder */
  const editIn = (p: (typeof msPkgs)[number]) => { setPkdId(null); setPending({ pkg: p.id, scroll: true }); };
  const openNewMaterial = (k: "let" | "syn" | "ver") => setDrawer(k === "ver" ? { m: "newver", parentId: null } : { m: "newmat", kind: k });

  return (
    <WorkspacePageGrid className="pk39-wpg" scrollLabel="Submission packages" masthead={null}>
      <div ref={rootRef} className={`p6${empty ? " p6-new" : ""}`} data-pk26="page">
        {empty ? <Pk26Hero onBuild={() => part("builder")?.scrollIntoView({ block: "start", behavior: "smooth" })} onHow={() => setHow(true)} />
          : <Pk39Header title={activeMs?.title ?? null} onNew={() => setDialog({ m: "new" })} onHow={() => setHow(true)} />}
        {/* v39.1 G: the one-line explainer, above Your packages; never on the brand-new page */}
        {empty || !collectionsReady ? null : <Pk39Tip onHow={() => setHow(true)} />}
        <Pk39Labels model={model} currentId={current?.id ?? null} showRetired={showRetired} onShowRetired={setShowRetired}
          onPick={(p) => setCurId(p.id)} onOpenRetired={(p) => setPkdId(p.id)} onNew={() => setDialog({ m: "new" })} />
        <Pk26Builder model={model} retired={retired} current={current} onSelect={setCurId} onFigures={(p) => setPkdId(p.id)} lib={lib} onLib={setLib}
            onNewPackage={() => setDialog({ m: "new" })} onDuplicate={copy} onEditPackage={(p, focus) => setDialog({ m: "edit", id: p.id, ...(focus ? { focus } : {}) })}
            onOpenMaterial={(k, id) => setDrawer(k === "ext" ? { m: "ext", id } : { m: "mat", kind: k, id })}
            onNewMaterial={openNewMaterial} onOpenVersions={goVersions} onOpenComps={goComps} />
        <Pk38Results model={model} onOpenPkg={(p) => setPkdId(p.id)} onOpenMaterial={(k, id) => setDrawer({ m: "mat", kind: k, id })}
          onOpenVersions={goVersions} onSeeQueries={goQueries} onAnalytics={goAnalytics} />
      </div>
      <Pk26Drawer model={model} view={routeActive ? drawer : null} go={setDrawer} onSeeQueries={goQueries} onOpenComps={goComps} />
      <Pk26Dialog model={model} view={routeActive ? dialog : null} onClose={() => setDialog(null)} onCreated={(id) => setPending({ pkg: id, scroll: true })} />
      <Pk38Drawer model={model} p={routeActive ? pkdPkg : null} onClose={() => setPkdId(null)} onCopy={copy} onEdit={editIn} onSeeQueries={goQueries} />
      <Pk39HowItWorks open={routeActive && how} onClose={() => setHow(false)} />
    </WorkspacePageGrid>
  );
};

export default SubmissionPackages;
