/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages (route /manuscripts/packages) — the host: manuscript scoping, the two modals,
 * and every write this page makes. The page itself is `PackagesOverview`; the masthead is
 * `PackagesHero`.
 *
 * Design authority: `design-refs/submission-packages-broadsheet.html` for the layout,
 * `design-refs/submission-packages-flow.html` for the modal flows.
 *
 * ⚠️ THE HEADER BOUNDARY. The hero is passed as the grid's existing `masthead` node — a public
 * `ReactNode` prop — so the shared `PageHeader` and `WorkspacePageGrid` are untouched. They belong
 * to the parallel masthead session. Nothing here reads or compensates for `--header-inset`.
 *
 * ⚠️ NO PRO GATE ON THIS ROUTE, and the wax seal is branding rather than a gate. Package CREATION is
 * Pro-gated inside `addPackage` (db.tsx) — the builder surfaces that refusal instead of swallowing
 * it, which the old composer did. See F-E in the flow report.
 *
 * ⚠️ THE WORKSHOP AND ANALYTICS SURFACES ARE UNREACHABLE FROM HERE (flow pack D9) and stay on disk
 * for the DEV `#/pkg-lab` route. Do not re-open a route into them to give the guided tour a door —
 * that tour's missing entry point is F-F, and it wants a decision, not a shortcut.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PackageTracking } from "./packages/PackageTracking";
import { useScriptAllyDb } from "../lib/db";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../types";
import { useNavigate } from "react-router-dom";
import { PackagesTeachFirst } from "./packages/PackagesTeachFirst";
import { PackagesBand } from "./packages/PackagesBand";
import { TrackingBand } from "./packages/TrackingBand";
import { FootnoteBand } from "./packages/FootnoteBand";
import { RemovePopover } from "./packages/RemovePopover";
import { PackagesHeroBand } from "./packages/PackagesHeroBand";
import { MaterialsBand } from "./packages/MaterialsBand";
import { packageHolders, packagedQueries } from "../lib/packagesOverview";
import { MaterialModal, MaterialDraftResult } from "./packages/MaterialModal";
import { PackageModal, PackageDraftResult } from "./packages/PackageModal";
import { canBuildPackage, createPayload, updatePayload } from "../lib/materialDraft";
import { trackingTotals } from "../lib/packageTracking";
import { deleteField } from "firebase/firestore";
import { Tour } from "./Tour";
import { WORKSHOP_TOUR_STEPS } from "./packages/tourExample";
import { FONT_SERIF } from "../lib/designTokens";
import { PageHeader } from "./shell/PageHeader";
import { WorkspacePageGrid, PageTally } from "./shell/WorkspacePageGrid";
import { PackagesDrawer } from "./packages/PackagesDrawer";
import { ChevronDown, ShieldCheck, Plus } from "lucide-react";
import "./packages/packageWorkshop.css";

export const SubmissionPackages: React.FC = () => {
  const { currentUser, manuscripts, versions, packages, queries, activities, agents, addVersion, updateVersion, deleteVersion, archiveVersion, addPackage, updatePackage, deletePackage, retirePackage, updateUserProfile } = useScriptAllyDb();
  /**
   * ⚠️ NEVER AUTO-OPENS (D7). Plain component state, seeded `false`: no localStorage, no first-run
   * trigger, nothing watching the teach→workspace transition. A drawer that opened itself would
   * interrupt someone who came to the page to do something, and the one thing this drawer knows is
   * that it was asked for.
   */
  const [howOpen, setHowOpen] = useState(false);
  const navigate = useNavigate();

  const [activeMsId, setActiveMsId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("scriptally_active_manuscript_id") : null,
  );
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const msMenuRef = useRef<HTMLDivElement>(null);
  // The guided tour. While active the workshop renders the PURE example fixture (never persisted) and
  // the gold badge; on end we clear it and stamp hasSeenTour so it never auto-runs again.
  const [tourActive, setTourActive] = useState(false);
  /* Which surface is showing. Component-local UI state by design — deliberately NOT persisted and
     deliberately not a route, so you always land on the overview.

     ⚠️ THE TAB STRIP IS GONE AND THIS IS WHAT REPLACED IT (restructure D1). `PackageTab` was two
     values and this is three, because the overview is a real destination rather than a third tab:
     the rail IS the navigation now, and Workshop and Analytics are what it opens. The strip's
     component survives untouched for the DEV `#/pkg-lab` route, which still mounts it. */
  /* ⚠️ THE `view` STATE IS GONE, AND SO ARE BOTH BRANCHES IT SWITCHED (D9, R5's whole list).
     Materials open the modal, packages open the builder, and Tracking is a dashboard on the stage —
     so nothing on this page could set `view` to anything but "overview" any more, which made the
     WorkshopTab and AnalyticsTab branches unreachable code. Traced to a rendered root before
     removing, in both directions: the two components, `BackToOverview`, the four signal states and
     the analytics scope were reachable ONLY from those branches. The COMPONENTS stay on disk and
     stay mounted by `#/pkg-lab`; what is deleted is this page's dead switch. */
  /* The material modal (flow pack Phase 2). `matModal` is the open flag; `matEditing` is the record
     being edited, or null when adding. Both local — a modal is not a destination. */
  const [matModal, setMatModal] = useState(false);
  const [matEditing, setMatEditing] = useState<ManuscriptVersion | null>(null);
  /* ⚠️ THE TYPE THE MODAL OPENS ON, AND IT IS PART OF THE MODAL'S KEY. The band's three columns each
     add a material of their own type, so `+ ADD` under Synopses must skip the type step and land on
     Synopsis. Keying the mount on it means clicking Letters after Synopses is a remount rather than a
     stale draft seeded from the previous type — the same reason `matEditing.id` is in the key. */
  const [matPreselect, setMatPreselect] = useState<ComponentType | null>(null);
  /* The package builder (flow pack Phase 3). */
  const [pkgModal, setPkgModal] = useState(false);
  const [pkgEditing, setPkgEditing] = useState<SubmissionPackage | null>(null);
  /** The package being COPIED (D-D2). Never set at the same time as `pkgEditing`. */
  const [pkgDuplicating, setPkgDuplicating] = useState<SubmissionPackage | null>(null);

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
  /* ⚠️ THE LEDGER'S EVENTS ARE SCOPED TO THE MANUSCRIPT LIKE EVERY OTHER FIGURE ON THIS PAGE.
     `Activity.manuscriptId` is stored, so this is a filter rather than a join — but scoping it
     matters: the band's counts are all manuscript-scoped, and a "Latest activity" list spanning
     every book would name events none of the numbers above it include. */
  const msActivities = useMemo(() => activities.filter((a) => a.manuscriptId === msId), [activities, msId]);
  /* ⚠️ NAME, THEN AGENCY, THEN NOTHING — the app never invents a name for an agent it cannot
     resolve, and it never uses a pronoun for one either. An agency-less agent is valid in this
     model (name OR agency), so both are tried. */
  const agentName = useCallback((agentId: string): string | null => {
    const a = agents.find((x) => x.id === agentId);
    if (!a) return null;
    return [a.name, a.agency].find((x) => !!x?.trim()) ?? null;
  }, [agents]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setActiveMsId(id);
    localStorage.setItem("scriptally_active_manuscript_id", id);
    setMsMenuOpen(false);
  };
  const multiMs = manuscripts.length > 1;

  // ── Workshop persistence — all scoped to the active manuscript. ──
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
    setMatPreselect(null);
  };

  /** Open the modal on an existing material. One opener, so every surface opens it the same way. */
  const openMaterial = (id: string) => {
    setMatEditing(msVersions.find((x) => x.id === id) ?? null);
    setMatPreselect(null);
    setMatModal(true);
  };

  /**
   * The builder's write. Create or update through the SAME `addPackage` / `updatePackage` the
   * Workshop composer uses.
   *
   * ⚠️ THE EMPTY SAMPLE SLOT IS `""`, NOT AN ABSENT KEY. `isValidPackage` requires all three slot
   * keys to be PRESENT, so omitting one fails the rule outright — this is the single place on this
   * page where `deleteField()` would be the wrong instinct, and the modal sends `UNFILLED_SLOT`.
   */
  const savePackageDraft = async (d: PackageDraftResult): Promise<string | null> => {
    if (!msId) return "No manuscript is selected.";
    const fields = {
      packageName: d.name.trim() || "Untitled package",
      queryLetterVersionId: d.letterId,
      synopsisVersionId: d.synopsisId,
      samplePagesVersionId: d.sampleId,
      /* ⚠️ ALWAYS SENT, EVEN WHEN BLANK — `updatePackage` turns blank into `deleteField()`, which is
         how the writer CLEARS the line. Omitting the key here instead would make a cleared field
         indistinguishable from an untouched one, and the old text would survive the edit. */
      otherMaterials: d.otherMaterials,
    };
    if (pkgEditing) {
      /* ⚠️ THE REFUSAL IS RETURNED, NOT DISCARDED. `updatePackage` now declines a slot write on a
         SENT package and hands back the reason; dropping it here would close the modal on a write
         that never happened — which is the silent-denial family this page has been bitten by twice,
         and precisely the "edited the package, nothing changed, no feedback" fault being fixed. */
      const err = await updatePackage(pkgEditing.id, fields);
      if (err) return err;
    } else {
      /* ⚠️ THE REFUSAL IS RETURNED, NOT DISCARDED. `addPackage` declines on a FREE plan with a
         reason; the existing `savePackage` above drops it on the floor (`res.success ? … :
         undefined`), which is why a free user's Save appeared to work and did nothing. */
      const res = await addPackage({ manuscriptId: msId, ...fields });
      if (!res.success) return res.error ?? "Couldn't save that package.";
    }
    setPkgModal(false);
    setPkgEditing(null);
    setPkgDuplicating(null);
    return null;
  };


  // ── Guided tour ──
  const hasSeenTour = !!currentUser.hasSeenTour;
  // End (finish OR skip): drop the example data + stamp hasSeenTour so it never auto-runs again. The
  // write rides the parked user-update rules allowlist — silently denied (graceful) until it deploys.
  const endTour = () => {
    setTourActive(false);
    if (!hasSeenTour) void updateUserProfile({ hasSeenTour: true });
  };
  // The ONE way into the guided tour: the example-data band on the workshop's empty state and the
  // matching action on the analytics empty state both call this. hasSeenTour still stamps on end.
  const startTour = () => setTourActive(true);

  /* ⚠️ THE GUIDED TOUR IS CURRENTLY UNREACHABLE, AND THAT IS A CONSEQUENCE TO DECIDE ON, NOT A BUG
     TO PATCH BLIND. Its only two doors were `onTryExample` on WorkshopEmpty and AnalyticsEmpty —
     both on surfaces this page no longer opens (D9). So `startTour` has no caller, `tourActive` can
     never become true, and the `<Tour>` overlay below cannot render.

     The machinery is left INTACT rather than deleted: where a tour belongs on the restructured page
     is a product decision (the modal's type step? the onboarding stage?), and deleting a feature to
     tidy up a sweep would make that decision by accident. Flagged as F-F. What IS removed is the
     `EXAMPLE_*` aliasing, which only ever fed the two retired surfaces.

     ⚠️ Do not "fix" this by re-opening a Workshop route — that is the thing D9 retired. Give the
     tour a door on a surface that still exists. */

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

      {/* ⚠️ THIS PAGE CONFORMS (F-E, ruled). The masthead is the SHARED `PageHeader` with
          `variant="workspace"`, so the census in `workspacePageGrid.test.tsx` stays green by
          conforming rather than by gaining an entry, and no shared header file is touched. The
          hero lives on as `PackagesHeroBand`, immediately beneath — everything the ref drew except
          the page title, which belongs to the header alone.

          ⚠️ AND THERE IS NO PRO MARKER ON THIS PAGE AT ALL (D1). The wax seal that rode
          `titleAdornment` is deleted with its styles, and no page-local Pro badge replaces it.
          Checked before removing: `PageHeader` renders no Pro marker of its own — the seal was
          entirely this page's code passing an existing prop — so unmounting it needed no shared
          edit and left nothing behind in the shell. See F-K in the report. */}
      <WorkspacePageGrid className="pkgw-wpg" scrollLabel="Package Workshop" masthead={
        <PageHeader
          variant="workspace"
          mark="packages"
          title="Submission packages"
          description="Bundle your materials once, then send them without rebuilding each time."
          /* ⚠️ NO ACTIONS SLOT — AND THE SHARED MASTHEAD ENFORCES THAT WITH A THROW, not a comment.
             `PageHeader` refuses `actions` on `variant="workspace"`: a masthead with nothing
             actionable never needs restoring mid-visit, so it can scroll away on a scrolling page
             and vanish outright on a fill page without stranding a control. "How it works" was
             tried here first and belongs in the band head instead, beside the page's own count. */
        />
      }>
      {/**
        * ⚠️ THE PAGE'S BODY CARRIES THE PAGE'S RHYTHM — the grid's chrome must not be inside it
        * (in-flow masthead, step 5).
        *
        * `.pkgw .wpg-scroll` was `display: flex; flex-direction: column; gap: 14px`, because this
        * page's panels are separated by that gap and it was the scroller's own children they were
        * separating. The masthead and the control row are children of that scroller now, so the
        * page's BODY rhythm was being applied to the grid's CHROME: measured at 1440×900, this
        * page's control row sat 14px lower than every other page's — 16px of masthead margin plus
        * 14px of page gap.
        *
        * ⚠️ THE RULE'S OWN COMMENT ARGUED AGAINST THIS FIX AND WAS WRONG: "a single wrapper would
        * collapse those gaps into one." True of a PLAIN wrapper; not of one carrying the same
        * `display: flex; gap: 14px`, which reproduces the rhythm exactly one level down. It is the
        * third comment in this pack that was true when written and stopped being true when
        * something moved underneath it.
        */}
      <div className="pkgw-body">
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
          {/* ⚠️ THE REAL, MANUSCRIPT-SCOPED DATA — never the tour fixture. `wsVersions` and its
              siblings swap to `EXAMPLE_*` while the guided tour runs, which was right for the
              Workshop (the tour drove it) and wrong here: the overview is where you see what YOU
              have, and a register quietly listing four invented materials is a page lying about
              the writer's own work. The tour never opens on this surface. */}
          {/* ⚠️ THE BAND SITS DIRECTLY BENEATH THE HEADER, and it is the ref's hero minus the title
              (F-E, ruled: this page conforms). Rendered inside the page body rather than as chrome,
              so it scrolls with the content exactly as the masthead above it now does. */}
          {msVersions.length + msPackages.length > 0 ? (
            <>
            <PackagesHeroBand
              materials={msVersions.length}
              packages={msPackages.length}
              sent={trackingTotals(msPackages, msQueries).sent}
              manuscriptControl={msSelector}
              canBuild={canBuildPackage(msVersions)}
              onNewPackage={() => { setPkgEditing(null); setPkgModal(true); }}
            />
            {/* ⚠️ THE MATERIALS BAND REPLACES THE RAIL'S MATERIALS PANEL (D1) — mounted here and
                deleted there in the same commit, so the two never coexist. */}
              {/* ⚠️ PACKAGES LEAD (D-B1). Materials came first and it read as a filing
                  cabinet with the point of the feature underneath it — the packages ARE the
                  feature, and the shelf is what they are built from. Measured, not assumed:
                  the first screenshot of this rebuild had "Your packages" below the fold. */}
            {/* ⚠️ THE RAIL IS GONE, AND ITS REGISTERS WITH IT (D1). Materials, Packages and Tracking
                are bands on the page now — the rail was an index of two of them beside the things it
                indexed, which is a second copy of a list rather than a way to reach it. Nothing
                navigated anywhere: every rail row scrolled to a tile three inches to its right. */}
            {/**
              * ⚠️ THE BOUNDARY MOVED, AND IT IS A BEHAVIOUR CHANGE RATHER THAN A RE-SKIN (D-A).
              * It was `msPackages.length > 0`, so a writer who had saved three materials and not yet
              * built a package still met the teaching screen — and their materials were invisible.
              * The state is now `materials + packages === 0`: nothing filed, nothing to file with.
              *
              * ⚠️ DERIVED, NEVER STORED. It comes back if a writer clears everything out, which is
              * correct — they are a first-time user of a feature they now have no record in. A
              * `hasSeenPackages` flag would strand them on a workspace with nothing to show.
              */}
              <PackagesBand
                packages={msPackages}
                versions={msVersions}
                queries={msQueries}
                onOpenPackage={(id) => {
                  setPkgEditing(msPackages.find((p) => p.id === id) ?? null);
                  setPkgDuplicating(null);
                  setPkgModal(true);
                }}
                onNewPackage={() => { setPkgEditing(null); setPkgDuplicating(null); setPkgModal(true); }}
                onHowItWorks={() => setHowOpen(true)}
                /* ⚠️ A CREATE, NOT AN EDIT — `pkgEditing` stays null, so Save writes a NEW document
                   and the sent package is untouched, which is the entire point of D-D2. */
                onDuplicatePackage={(id) => {
                  setPkgEditing(null);
                  setPkgDuplicating(msPackages.find((p) => p.id === id) ?? null);
                  setPkgModal(true);
                }}
                /* §3 — ⚠️ DERIVED, NEVER STORED. The count is a read over the queries already in
                   memory; nothing writes to the package when one is logged, so a deleted query
                   stops being counted with no cleanup. See `sendsWithPackage`. */
                renderTracking={(p) => (
                  <PackageTracking
                    packageId={p.id}
                    queries={msQueries}
                    agentName={agentName}
                    onOpenQuery={(id) => navigate(`/queries?q=${id}`)}
                    user={currentUser}
                    onAttach={() => navigate("/queries")}
                  />
                )}
                /* ⚠️ THE SAME POPOVER THE SHEETS USE, AND THE SAME DECISION FUNCTION. A package
                   nothing has been sent with is deleted; one that has travelled is archived,
                   because a query still points at it and it is the record of what was in the
                   envelope. `removalChoice` is given the PACKAGE's own id against the queries, so
                   "has anything been sent with this" is what decides. */
                renderRemove={(p) => (
                  <RemovePopover
                    id={p.id}
                    name={p.packageName}
                    typeLabel="package"
                    subject="package"
                    holders={packageHolders(p.id, msQueries, agentName)}
                    onDelete={deletePackage}
                    onArchive={retirePackage}
                  />
                )}
              />
            <MaterialsBand
              versions={msVersions}
              packages={msPackages}
              onAddMaterial={(type) => { setMatEditing(null); setMatPreselect(type); setMatModal(true); }}
              onOpenMaterial={openMaterial}
              /* ⚠️ THE PAGE PASSES BOTH WRITERS AND CHOOSES NEITHER (Ruling 2). Which one runs is
                 decided inside the popover from `removalChoice`, off the same packages this page
                 already hands the band — so the sheet's usage line, the popover's wording and the
                 act performed are three readings of one number. */
              onDeleteMaterial={deleteVersion}
              onArchiveMaterial={archiveVersion}
            />
              <TrackingBand
                packages={msPackages}
                versions={msVersions}
                queries={msQueries}
                onLogQuery={() => navigate("/queries")}
              />
              <FootnoteBand />
            </>
          ) : (
            <PackagesTeachFirst onAddMaterial={() => { setMatPreselect(null); setMatEditing(null); setMatModal(true); }} />
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
        key={matEditing?.id ?? `new-${matPreselect ?? "material"}`}
        editing={matEditing}
        versions={msVersions}
        preselect={matPreselect}
        onClose={() => { setMatModal(false); setMatEditing(null); setMatPreselect(null); }}
        onSave={saveMaterial}
      />}

      {pkgModal && <PackageModal
        key={pkgEditing?.id ?? (pkgDuplicating ? `dup-${pkgDuplicating.id}` : "new-package")}
        editing={pkgEditing}
        duplicating={pkgDuplicating}
        existingNames={msPackages.map((p) => p.packageName)}
        versions={msVersions}
        packageCount={msPackages.length}
        onClose={() => { setPkgModal(false); setPkgEditing(null); setPkgDuplicating(null); }}
        onSave={savePackageDraft}
      />}
      </div>
      </WorkspacePageGrid>

      {/* ⚠️ OUTSIDE THE GRID, because it is an overlay rather than page content — `Form11Drawer`
          fixes itself to the viewport and paints its own scrim, so nesting it inside the scroll row
          would put a fixed element inside a clipping container for no reason. */}
      <PackagesDrawer open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
};
