/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission Package Builder → the single-page Package Workshop (route /manuscripts/packages, Pro).
 * Renders inside the global AppShell stage (no nav of its own), scoped to the active manuscript via
 * localStorage["scriptally_active_manuscript_id"]. This host provides the page header (the
 * standard PageHeader: title + Pro pill + the manuscript switcher) + the manuscript-scoped data and persistence,
 * and mounts the two-tab surface for everything else. At ZERO packages the WORKSHOP'S OWN first-run
 * empty state renders — for every user on every plan. (A Pro-selling landing used to sit in front of
 * it; it was retired because this route has no Pro gate, so it was pitching the feature to people who
 * already had it. If a real gate ever lands, a persuasion surface belongs at /plans or on the public
 * site, not on an authenticated route.)
 *
 * The old multi-view builder (FirstVisitHome / PackagesHome / Composer / MaterialsManager /
 * MaterialsRail / JourneyStrip / PackageStats view / WorkedExample / the MaterialModal popup) was
 * retired for the workshop; the packageMetrics engine + TypeGlyph stay (the masthead is the
 * app-standard PageHeader since the shell rollout — HubHeaderBar is deleted, ChromeSlab unused here).
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { resolveActivePackage } from "../lib/packageMetrics";
import { ComponentType, ManuscriptVersion } from "../types";
import { useNavigate } from "react-router-dom";
import { PackageSaveFields } from "./packages/PackageWorkshop";
import { WorkshopTab } from "./packages/WorkshopTab";
import { AnalyticsTab, AnalyticsScope } from "./packages/AnalyticsTab";
import { PackagesOverview } from "./packages/PackagesOverview";
import { MaterialModal, MaterialDraftResult } from "./packages/MaterialModal";
import { createPayload, updatePayload } from "../lib/materialDraft";
import { deleteField } from "firebase/firestore";
import { Tour } from "./Tour";
import { EXAMPLE_VERSIONS, EXAMPLE_PACKAGES, EXAMPLE_QUERIES, EXAMPLE_AGENTS, WORKSHOP_TOUR_STEPS } from "./packages/tourExample";
import { FONT_SERIF } from "../lib/designTokens";
import { PageHeader } from "./shell/PageHeader";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { ChevronDown, ShieldCheck, Plus } from "lucide-react";
import "./packages/packageWorkshop.css";

/** The three surfaces this route can show. The overview is where you land. */
type PkgView = "overview" | "workshop" | "analytics";

/**
 * The way back from a surface the rail opened.
 *
 * ⚠️ IT IS OUTLINED, NOT FILLED, and that is the page's one-filled-control rule (D5) rather than a
 * taste call: `New package` in the header is the single filled thing on this route, so every other
 * control on it — the rail's `+ ADD` / `+ NEW`, and this — is an outline. It is also why this is
 * not a pink "Done"-style button, which is what a return control usually wants to be here.
 */
const BackToOverview: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" className="pkgo-back" onClick={onClick}>
    ← Overview
  </button>
);

export const SubmissionPackages: React.FC = () => {
  const { currentUser, manuscripts, versions, packages, queries, agents, addVersion, updateVersion, deleteVersion, addPackage, updatePackage, updateUserProfile, setActivePackage } = useScriptAllyDb();
  const navigate = useNavigate();

  const [activeMsId, setActiveMsId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("scriptally_active_manuscript_id") : null,
  );
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const msMenuRef = useRef<HTMLDivElement>(null);
  // The guided tour. While active the workshop renders the PURE example fixture (never persisted) and
  // the gold badge; on end we clear it and stamp hasSeenTour so it never auto-runs again.
  const [tourActive, setTourActive] = useState(false);
  // Pulse the "＋ Add materials" affordance after the tour ends with no materials yet (FR4).
  const [pulseAdd, setPulseAdd] = useState(false);
  /* Which surface is showing. Component-local UI state by design — deliberately NOT persisted and
     deliberately not a route, so you always land on the overview.

     ⚠️ THE TAB STRIP IS GONE AND THIS IS WHAT REPLACED IT (restructure D1). `PackageTab` was two
     values and this is three, because the overview is a real destination rather than a third tab:
     the rail IS the navigation now, and Workshop and Analytics are what it opens. The strip's
     component survives untouched for the DEV `#/pkg-lab` route, which still mounts it. */
  const [view, setView] = useState<PkgView>("overview");
  // Bumped by the header's "＋ New package" — the workshop opens a fresh draft on each change.
  const [newPkgSignal, setNewPkgSignal] = useState(0);
  // Bumped by the rail's "+ ADD" — the workshop opens its MATERIALS editor on each change.
  const [openMatSignal, setOpenMatSignal] = useState(0);
  // The rail asked the workshop to open one material for editing.
  const [openMat, setOpenMat] = useState<string | null>(null);
  /* The material modal (flow pack Phase 2). `matModal` is the open flag; `matEditing` is the record
     being edited, or null when adding. Both local — a modal is not a destination. */
  const [matModal, setMatModal] = useState(false);
  const [matEditing, setMatEditing] = useState<ManuscriptVersion | null>(null);
  // Analytics scope: "all" or a package id. Local UI state, like the tab itself.
  const [scope, setScope] = useState<AnalyticsScope>("all");
  // A recommendation asked the Workshop tab to open a particular package.
  const [openPkg, setOpenPkg] = useState<string | null>(null);

  // Default to the first manuscript when none is selected / the saved one is gone.
  useEffect(() => {
    if (manuscripts.length === 0) return;
    if (!activeMsId || !manuscripts.some((m) => m.id === activeMsId)) {
      const first = manuscripts[0].id;
      setActiveMsId(first);
      localStorage.setItem("scriptally_active_manuscript_id", first);
    }
  }, [manuscripts, activeMsId]);

  // Outside-click closes the manuscript menu.
  useEffect(() => {
    if (!msMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (msMenuRef.current && !msMenuRef.current.contains(e.target as Node)) setMsMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [msMenuOpen]);

  const activeMs = useMemo(() => manuscripts.find((m) => m.id === activeMsId) ?? manuscripts[0], [manuscripts, activeMsId]);
  const msId = activeMs?.id;
  const msVersions = useMemo(() => versions.filter((v) => v.manuscriptId === msId), [versions, msId]);
  const msPackages = useMemo(() => packages.filter((p) => p.manuscriptId === msId && p.status !== "Retired"), [packages, msId]);
  const msQueries = useMemo(() => queries.filter((q) => q.manuscriptId === msId), [queries, msId]);
  // The manuscript's chosen active package — read-only here; null when unset, retired, missing or
  // cross-manuscript. It drives the ACTIVE card treatment and which card is editable.
  const activePkg = useMemo(() => resolveActivePackage(activeMs, msPackages), [activeMs, msPackages]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setActiveMsId(id);
    localStorage.setItem("scriptally_active_manuscript_id", id);
    setMsMenuOpen(false);
  };
  const multiMs = manuscripts.length > 1;

  // ── Workshop persistence — all scoped to the active manuscript. ──
  const createVersion = async (type: ComponentType, name: string, contentDraft: string): Promise<string | undefined> => {
    if (!msId) return undefined;
    return addVersion({ manuscriptId: msId, componentType: type, versionName: name, fileAttached: false, contentDraft, contentType: "text" });
  };
  /**
   * The material modal's write. Create or update, through the SAME primitives the Workshop editor
   * uses (R2) — this page adds no second persistence path.
   *
   * ⚠️ `unset` BECOMES `deleteField()` HERE, and only here. `lib/materialDraft` decides WHAT a mode
   * switch has to clear and is unit-locked on it; the Firestore sentinel is a detail of the write,
   * so it lives at the write. Turning a pasted material into a name-only one has to clear the body
   * and its count, and a `0` there would say the document is empty rather than unread.
   */
  const saveMaterial = async (d: MaterialDraftResult) => {
    if (!msId) return;
    if (matEditing) {
      const { set, unset } = updatePayload(d);
      const fields: Record<string, unknown> = { ...set };
      for (const key of unset) fields[key] = deleteField();
      await updateVersion(matEditing.id, fields);
    } else {
      await addVersion(createPayload(d, msId) as Parameters<typeof addVersion>[0]);
    }
    setMatModal(false);
    setMatEditing(null);
  };

  const savePackage = async (baseId: string | null, fields: PackageSaveFields): Promise<string | undefined> => {
    if (!msId) return undefined;
    if (baseId) { await updatePackage(baseId, fields); return baseId; }
    const res = await addPackage({ manuscriptId: msId, ...fields });
    return res.success ? res.id : undefined;
  };

  // ── Guided tour ──
  const hasSeenTour = !!currentUser.hasSeenTour;
  // End (finish OR skip): drop the example data + stamp hasSeenTour so it never auto-runs again. The
  // write rides the parked user-update rules allowlist — silently denied (graceful) until it deploys.
  const endTour = () => {
    setTourActive(false);
    if (!hasSeenTour) void updateUserProfile({ hasSeenTour: true });
    // The tour ends on the empty workshop — nudge the writer to their first real action.
    if (msVersions.length === 0) setPulseAdd(true);
  };
  // The ONE way into the guided tour: the example-data band on the workshop's empty state and the
  // matching action on the analytics empty state both call this. hasSeenTour still stamps on end.
  const startTour = () => setTourActive(true);

  // While the tour runs the workshop shows the PURE example fixture (never persisted); otherwise the
  // real manuscript-scoped data. The example writes are no-ops (host handlers ignore them).
  const noop = () => undefined;
  const wsVersions = tourActive ? EXAMPLE_VERSIONS : msVersions;
  const wsPackages = tourActive ? EXAMPLE_PACKAGES : msPackages;
  const wsQueries = tourActive ? EXAMPLE_QUERIES : msQueries;
  const wsAgents = tourActive ? EXAMPLE_AGENTS : agents;

  // Book glyph for the manuscript selector — burgundy strokes.
  const bookIcon = (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" style={{ color: "var(--burg)", flexShrink: 0 }} aria-hidden="true">
      <path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2z" />
      <path d="M4 18a2 2 0 012-2h13" />
    </svg>
  );

  // Header right slot: the manuscript selector chip. One manuscript = plain; 2+ = a switcher menu.
  /* ⚠️ THE CHIP IS A CLASS, NOT AN INLINE STYLE, AND THAT IS WHAT LETS IT SCALE. Inline styles
     cannot be reached by `.wsh--scrolled`, so while this was a style object the selector sat at its
     resting 15px/9px in a 52px strip where every other element had stepped down — the header's
     height was right and its contents were not. It is also the third time an inline style on this
     page has been invisible to a rule that needed it (the root's `overflowY`, then its 28px side
     padding). `.pkgw-mschip` carries the same declarations. */
  const chipShell: React.CSSProperties = {};
  const msSelector = activeMs ? (
    <div ref={msMenuRef} style={{ position: "relative" }}>
      {multiMs ? (
        <button type="button" onClick={() => setMsMenuOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={msMenuOpen} className="pkgw-mschip">
          {bookIcon}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{activeMs.title}</span>
          <ChevronDown style={{ width: 15, height: 15, color: "var(--muted)", flexShrink: 0, transform: msMenuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} aria-hidden="true" />
        </button>
      ) : (
        <span className="pkgw-mschip pkgw-mschip--static">
          {bookIcon}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>{activeMs.title}</span>
        </span>
      )}
      {multiMs && msMenuOpen && (
        <div role="listbox" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 220, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 10, boxShadow: "0 10px 26px rgba(29,23,18,.18)", padding: 6, zIndex: 40 }}>
          {manuscripts.map((m) => {
            const on = m.id === activeMs.id;
            return (
              <button key={m.id} type="button" role="option" aria-selected={on} onClick={() => selectMs(m.id)} className="pkg-msopt" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", fontFamily: FONT_SERIF, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? "var(--burg)" : "var(--ink)", background: on ? "linear-gradient(135deg, var(--band-a), var(--band-b))" : "transparent", border: "none", borderRadius: 7, padding: "9px 11px", cursor: "pointer" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  /* ⚠️ THE SIDE PADDING IS GONE (strip-fixes §3/§4), for a related reason and with the same
     invisibility: 28px each side here inset the whole GRID, so this page's header sat 28px
     narrower than the Contact list's and its scroller stopped reaching the container edge. Inline,
     so no stylesheet lock could see it — the width lock added at step 1 reads page CSS and passed
     this page while it was wrong.

     ⚠️ `overflowY: "auto"` IS GONE FROM THIS ROOT, and it was an INLINE style — which is why
     neither the CSS locks nor a grep of packageWorkshop.css could see it. It wrapped the whole
     grid in a scrollport of its own, so the plate and tool row scrolled away on this page while
     every other converted page pinned them. The grid's row 3 is the scroller. */
  return (
    <div className="pkg-root pkgw" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "0 0 16px" /* no top inset — the grid owns the gap above the header */, gap: 14, overflow: "hidden" }}>
      <style>{`
        .pkg-msopt:hover { background: linear-gradient(135deg, var(--band-a), var(--band-b)) !important; }
        @media (max-width: 768px) { .pkg-root { height: auto; min-height: 100%; overflow: visible; } }
      `}</style>

      {/* The standard page header (shell rollout Phase 5) — full variant. The grand slab's
          Pro pill and package-count pulse are dropped with it (no title-adornment/meta slots
          under the header law); the manuscript selector keeps its function in the row below
          the rule until the sidebar switcher is live-wired — see the rollout report. */}
      {/* The Pro header format, shared by all three states of this page (landing, empty, populated).
          The SHARED PageHeader is reused unmodified: the Pro pill rides `titleAdornment`, the
          manuscript selector + primary action ride `actionsSlot` on the title's line (the floating
          chip on its own row is gone), and its own rule is restyled to the 2px Pro rule under the
          `.pkgw` scope — Discover's pattern, so there is no second rule and no fork of a component
          eleven pages share. */}
      {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9). The plate is row 1; the strip, the tabs
          and the workshop scroll in row 3. No toolbar → no row 2 and no hairline. */}
      <WorkspacePageGrid className="pkgw-wpg" scrollLabel="Package Workshop" plate={
        <PageHeader
          variant="workspace"
          mark="packages"
          title="Submission packages"
          description="Bundle your materials once, then send them without rebuilding each time."
          titleAdornment={<span className="pkgw-propill"><ShieldCheck aria-hidden="true" />Pro</span>}
          actionsSlot={activeMs ? (
            <div className="pkgw-hact">
              {msSelector}
              {/* ⚠️ THE SHARED BUTTON, NOT `.pkgw-btn`. A page-specific button class in a header is a
                  second implementation of the strip's control ladder — this one happened to agree
                  (38 → 30) because it was given an explicit working height in a previous pass,
                  which is exactly how it read as correct while being a copy. `--primary` and
                  `svh-btn-primary` resolve to the same three constants (`--pink` / `--pink-b` /
                  `--burg`), so nothing about it looks different; it simply stops being separate.
                  `.pkgw-btn` survives for the page BODY, where it belongs. */}
              <button type="button" className="svh-btn svh-btn-primary" onClick={() => { setView("workshop"); setNewPkgSignal((n) => n + 1); }}>
                <Plus aria-hidden="true" style={{ width: 15, height: 15 }} />New package
              </button>
            </div>
          ) : undefined}
        />
      }>
      {/* ⚠️ `.pkgw-strip` IS RETIRED FROM THIS PAGE (restructure). It carried the scorecard sentence
          as a thin band above the tab row; the overview's problem-statement card is that same
          sentence promoted to the stage, in the ref's own words. Keeping both would state the
          page's one argument twice, a few pixels apart. Removed from the render rather than hidden;
          its CSS stays in packageWorkshop.css because the DEV `#/pkg-lab` route still draws it. */}
      {!activeMs ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No manuscripts yet</div>
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--muted)", maxWidth: 420, lineHeight: 1.5, margin: "0 auto" }}>Add a manuscript from the Manuscripts list first — packages are built per manuscript.</div>
          </div>
        </div>
      ) : (
        <>
          {view === "overview" ? (
            /* ⚠️ THE REAL, MANUSCRIPT-SCOPED DATA — never the tour fixture. `wsVersions` and its
               siblings swap to `EXAMPLE_*` while the guided tour runs, which is right for the
               Workshop (the tour drives it) and wrong here: the overview is where you see what YOU
               have, and a register quietly listing four invented materials is a page lying about
               the writer's own work. The tour never opens on this surface. */
            <PackagesOverview
              versions={msVersions}
              packages={msPackages}
              queries={msQueries}
              /* ⚠️ THESE NO LONGER HAND OFF TO THE WORKSHOP (D9). Both open the new modal in place;
                 the Workshop's own materials editor stays on disk and stays reachable from
                 `#/pkg-lab`, but this page does not send anyone to it any more. */
              onAddMaterial={() => { setMatEditing(null); setMatModal(true); }}
              onOpenMaterial={(id) => {
                const v = msVersions.find((x) => x.id === id) ?? null;
                setMatEditing(v);
                setMatModal(true);
              }}
              onNewPackage={() => { setView("workshop"); setNewPkgSignal((n) => n + 1); }}
              onOpenPackage={(id) => { setView("workshop"); setOpenPkg(id); }}
              onOpenTracking={() => setView("analytics")}
            />
          ) : view === "workshop" ? (
            /* ⚠️ `role="tabpanel"` IS GONE FROM BOTH SURFACES, and dropping it was required rather
               than tidy: a tabpanel with no tablist is a broken ARIA relationship, and the strip
               that provided the tablist is retired (D1). They are labelled regions now, reached
               from the rail. */
            <div className="pkgw-tv" role="region" aria-label="Workshop">
              <BackToOverview onClick={() => setView("overview")} />
              <WorkshopTab
                versions={wsVersions}
                packages={wsPackages}
                queries={wsQueries}
                activePackageId={tourActive ? null : activePkg?.id ?? null}
                onCreateVersion={tourActive ? noop : createVersion}
                onUpdateVersion={tourActive ? noop : (id, f) => updateVersion(id, f)}
                onDeleteVersion={tourActive ? noop : (id) => deleteVersion(id)}
                onSavePackage={tourActive ? noop : savePackage}
                onMakeActive={tourActive || !msId ? noop : (pid) => void setActivePackage(msId, pid)}
                onTryExample={startTour}
                newPackageSignal={newPkgSignal}
                openMaterialsSignal={openMatSignal}
                openMaterialId={openMat}
                onOpenedMaterial={() => setOpenMat(null)}
                openPackageId={openPkg}
                onOpenedPackage={() => setOpenPkg(null)}
                pulseAddMaterials={pulseAdd && !tourActive}
                onDismissPulse={() => setPulseAdd(false)}
              />
            </div>
          ) : (
            <div className="pkgw-tv" role="region" aria-label="Tracking">
              <BackToOverview onClick={() => setView("overview")} />
              <AnalyticsTab
                versions={wsVersions}
                packages={wsPackages}
                queries={wsQueries}
                agents={wsAgents}
                activePackageId={tourActive ? null : activePkg?.id ?? null}
                scope={scope}
                onScope={setScope}
                onOpenQueries={() => navigate("/queries")}
                onOpenPackage={(pid) => { setView("workshop"); setOpenPkg(pid); }}
                onNewPackage={() => { setView("workshop"); setNewPkgSignal((n) => n + 1); }}
                onTryExample={startTour}
              />
            </div>
          )}
        </>
      )}

      {tourActive && (
        <Tour steps={WORKSHOP_TOUR_STEPS} onDone={endTour} badge="Example data — cleared when the tour ends" />
      )}

      {/* The material modal — mounted at page level so it overlays whatever surface is showing. */}
      {/* ⚠️ MOUNTED ONLY WHILE OPEN, AND KEYED. A fresh mount per opening is what lets the modal seed
          its draft in `useState` initialisers instead of an effect — which is what removed the
          type-grid flash when opening a material to edit. The key makes reopening a DIFFERENT
          material a remount rather than a stale-state hazard. */}
      {matModal && <MaterialModal
        key={matEditing?.id ?? "new-material"}
        editing={matEditing}
        versions={msVersions}
        onClose={() => { setMatModal(false); setMatEditing(null); }}
        onSave={saveMaterial}
      />}
      </WorkspacePageGrid>
    </div>
  );
};
