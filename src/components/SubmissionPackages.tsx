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
import { Pk41HowItWorks } from "./packages/v41/Pk41HowItWorks";
import { Pk41Hawk } from "./packages/v41/Pk41Hawk";
import { Pk26Builder, type LibTab } from "./packages/v26/Pk26Builder";
import { Pk41Banner } from "./packages/v41/Pk41Banner";
import { Pk41Header } from "./packages/v41/Pk41Header";
import { Pk42Tiles } from "./packages/v42/Pk42Tiles";
import { Pk42Empty } from "./packages/v42/Pk42Empty";
import { useScriptAllyDb } from "../lib/db";
import { packagesViaFounding } from "../lib/entitlements";
import { FOUNDING_NOTE_PATH, foundingNoteHidden } from "../lib/packagesV41";
import { Pk38Drawer } from "./packages/v26/Pk38Drawer";
import { Pk41Results } from "./packages/v41/Pk41Results";
import { libTabFromParam } from "../lib/packagesV38";
import { Pk26Drawer, type DrawerView } from "./packages/v26/Pk26Drawer";
import { Pk26Dialog, type DialogView } from "./packages/v26/Pk26Dialog";
import "./packages/v26/pk40.generated.css";
import "./packages/v26/pk26.css";
import "./packages/v26/pk38.generated.css";
import "./packages/v26/pk38.css";
import "./packages/v26/pk39.generated.css";
import "./packages/v26/pk39.css";
import "./packages/v26/pk391.generated.css";
import "./packages/v26/pk391.css";
import "./packages/v26/pk392.css";
import "./packages/v26/pk393.css";
import "./packages/v41/pk41.css";
import "./packages/v42/pk42.css";

export const SubmissionPackages: React.FC<{ active?: boolean; onNavigate?: (tab: string, sub?: string) => void }> = ({ active: routeActive = true }) => {
  const model = usePk26Model();
  const { activeMs, live, active, msId, msPkgs, collectionsReady, letters, synopses, versionRows, comps } = model;
  const location = useLocation();
  const navigate = useNavigate();
  /* v41 B: the founding writer strip — founding writers only, until dismissed (one leaf on the user) */
  const { currentUser, updateUserPaths } = useScriptAllyDb();
  const founding = packagesViaFounding(currentUser);
  const showFounding = founding && !foundingNoteHidden(currentUser);
  const setFoundingHidden = (hidden: boolean) => { void updateUserPaths({ [FOUNDING_NOTE_PATH]: hidden }); };

  const [curId, setCurId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [dialog, setDialog] = useState<DialogView | null>(null);
  const [how, setHow] = useState(false);
  /** the package drawer (v38): opened from a label, "Figures" or a showcase */
  const [pkdId, setPkdId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  /** v39.3: a deep link (`?tab=let|syn|ver`) opens that step of the builder (the Your materials list it opened is retired) */
  const [askStep, setAskStep] = useState<LibTab | null>(null);
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
    if (lt) { setAskStep(lt); setPending({ lib: true }); }
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
    if (pending.lib) part("builder")?.scrollIntoView({ block: "start" });
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
  /* v42 F: the builder shows a live package — or, on the brand-new page with no package at all, v39.3's draft first
     package (the hero's "build" scrolls to it, as built). Otherwise the empty card takes the tiles' and builder's place. */
  const showBuilder = live.length > 0 || (empty && msPkgs.length === 0);

  return (
    <WorkspacePageGrid className="pk39-wpg" scrollLabel="Submission packages" masthead={null}>
      {showFounding ? <Pk41Banner onDismiss={() => setFoundingHidden(true)} /> : null}
      {/* v41 Phase 1: the page is the Dashboard v2 / Contact list language — no header card, explainer, raised panel or
          label tiles (each is replaced by a v41 part, below) */}
      <div ref={rootRef} className={`p6 p41${empty ? " p6-new" : ""}`} data-pk26="page" data-pk41="page">
        {empty ? <Pk26Hero onBuild={() => part("builder")?.scrollIntoView({ block: "start", behavior: "smooth" })} onHow={() => setHow(true)} />
          : <Pk41Header title={activeMs?.title ?? null} onNew={() => setDialog({ m: "new" })} onHow={() => setHow(true)} />}
        {/* v42 F: no live package — the empty card in place of the tiles and the builder */}
        {showBuilder ? null : <Pk42Empty onNew={() => setDialog({ m: "new" })} />}
        {/* v42 C: the stat tiles, a row on the page between the header and the builder (not on the brand-new page); with
            only retired packages, just the "Retired (n)" link */}
        {empty || !msPkgs.length ? null : <Pk42Tiles model={model} currentId={current?.id ?? null} showRetired={showRetired} onShowRetired={setShowRetired}
          onSelect={(p) => setCurId(p.id)} onOpenRetired={(p) => setPkdId(p.id)} />}
        {/* v42 A: the rail is retired; the open package takes the column's full width */}
        {showBuilder ? (
          <div className="p42-ws" data-pk41="workspace">
            <Pk26Builder model={model} current={current} onSelect={setCurId} onFigures={(p) => setPkdId(p.id)} askStep={askStep}
              onDuplicate={copy} onEditPackage={(p, focus) => setDialog({ m: "edit", id: p.id, ...(focus ? { focus } : {}) })}
              onOpenMaterial={(k, id) => setDrawer(k === "ext" ? { m: "ext", id } : { m: "mat", kind: k, id })}
              onNewMaterial={openNewMaterial} onOpenVersions={goVersions} onOpenComps={goComps} />
          </div>
        ) : null}
        <Pk41Results model={model} onOpenPkg={(p) => setPkdId(p.id)} onOpenMaterial={(k, id) => setDrawer({ m: "mat", kind: k, id })}
          onOpenVersions={goVersions} onSeeQueries={goQueries} onAnalytics={goAnalytics} />
      </div>
      <Pk26Drawer model={model} view={routeActive ? drawer : null} go={setDrawer} onSeeQueries={goQueries} onOpenComps={goComps} />
      <Pk26Dialog model={model} view={routeActive ? dialog : null} onClose={() => setDialog(null)} onCreated={(id) => setPending({ pkg: id, scroll: true })} />
      <Pk38Drawer model={model} p={routeActive ? pkdPkg : null} onClose={() => setPkdId(null)} onCopy={copy} onEdit={editIn} onSeeQueries={goQueries} />
      <Pk41HowItWorks open={routeActive && how} onClose={() => setHow(false)}
        onShowFounding={founding && foundingNoteHidden(currentUser) ? () => setFoundingHidden(false) : undefined} />
      {/* v41 G: the Archivist, pinned bottom-right while this page is on screen (portalled; desktop only, by CSS) */}
      <Pk41Hawk on={routeActive && !empty} />
    </WorkspacePageGrid>
  );
};

export default SubmissionPackages;
