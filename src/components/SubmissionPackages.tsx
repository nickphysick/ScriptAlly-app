/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission Package Builder → the single-page Package Workshop (route /manuscripts/packages, Pro).
 * Renders inside the global AppShell stage (no nav of its own), scoped to the active manuscript via
 * localStorage["scriptally_active_manuscript_id"]. This host provides the qhbar chrome (ChromeSlab:
 * crumb + title + Pro pill + the manuscript switcher) + the manuscript-scoped data and persistence,
 * and mounts <PackageWorkshop> for everything else.
 *
 * The old multi-view builder (FirstVisitHome / PackagesHome / Composer / MaterialsManager /
 * MaterialsRail / JourneyStrip / PackageStats view / WorkedExample / the MaterialModal popup) was
 * retired for the workshop; the packageMetrics engine + TypeGlyph + HubHeaderBar/ChromeSlab stay.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { ComponentType } from "../types";
import { PackageWorkshop, PackageSaveFields } from "./packages/PackageWorkshop";
import { FirstVisitHome } from "./packages/FirstVisitHome";
import { FONT_SERIF, FONT_MONO } from "../lib/designTokens";
import { ChromeSlab } from "./shell/ChromeSlab";
import { ChevronDown, Lock } from "lucide-react";

export const SubmissionPackages: React.FC = () => {
  const { currentUser, manuscripts, versions, packages, queries, agents, addVersion, updateVersion, deleteVersion, addPackage, updatePackage } = useScriptAllyDb();

  const [activeMsId, setActiveMsId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("scriptally_active_manuscript_id") : null,
  );
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const msMenuRef = useRef<HTMLDivElement>(null);
  // At zero packages the route shows the FirstVisitHome landing; "entered" flips it to the (empty)
  // workshop once the user clicks Build / the tour link. Reset on manuscript switch so a fresh book
  // shows its own landing. Irrelevant once a manuscript has ≥1 package (the workshop always renders).
  const [entered, setEntered] = useState(false);

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

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setActiveMsId(id);
    localStorage.setItem("scriptally_active_manuscript_id", id);
    setMsMenuOpen(false);
    setEntered(false);
  };
  const multiMs = manuscripts.length > 1;

  // ── Workshop persistence — all scoped to the active manuscript. ──
  const createVersion = async (type: ComponentType, name: string, contentDraft: string): Promise<string | undefined> => {
    if (!msId) return undefined;
    return addVersion({ manuscriptId: msId, componentType: type, versionName: name, fileAttached: false, contentDraft, contentType: "text" });
  };
  const savePackage = async (baseId: string | null, fields: PackageSaveFields): Promise<string | undefined> => {
    if (!msId) return undefined;
    if (baseId) { await updatePackage(baseId, fields); return baseId; }
    const res = await addPackage({ manuscriptId: msId, ...fields });
    return res.success ? res.id : undefined;
  };

  // Book glyph for the manuscript selector — burgundy strokes.
  const bookIcon = (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" style={{ color: "var(--burg)", flexShrink: 0 }} aria-hidden="true">
      <path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2z" />
      <path d="M4 18a2 2 0 012-2h13" />
    </svg>
  );

  // Slate Pro pill (app convention: slate text on a slate-tint pill + lock).
  const proPill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "4px 10px" }}>
      <Lock style={{ width: 9, height: 9 }} strokeWidth={2.4} aria-hidden="true" /> Pro
    </span>
  );

  // Header right slot: the manuscript selector chip. One manuscript = plain; 2+ = a switcher menu.
  const chipShell: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 9, fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 600,
    color: "var(--ink)", background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 10,
  };
  const msSelector = activeMs ? (
    <div ref={msMenuRef} style={{ position: "relative" }}>
      {multiMs ? (
        <button type="button" onClick={() => setMsMenuOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={msMenuOpen} style={{ ...chipShell, padding: "9px 14px", cursor: "pointer" }}>
          {bookIcon}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{activeMs.title}</span>
          <ChevronDown style={{ width: 15, height: 15, color: "var(--muted)", flexShrink: 0, transform: msMenuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} aria-hidden="true" />
        </button>
      ) : (
        <span style={{ ...chipShell, padding: "9px 16px" }}>
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

  return (
    <div className="pkg-root" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "22px 28px 16px", gap: 14, overflow: "hidden", background: "var(--desk)" }}>
      <style>{`
        .pkg-msopt:hover { background: linear-gradient(135deg, var(--band-a), var(--band-b)) !important; }
        @media (max-width: 768px) { .pkg-root { height: auto; min-height: 100%; overflow: visible; } }
      `}</style>

      <ChromeSlab
        grand
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            Package Workshop{proPill}
          </span>
        }
        meta={activeMs ? `${msPackages.length} ${msPackages.length === 1 ? "package" : "packages"}` : undefined}
        tools={activeMs ? msSelector : undefined}
      />

      {!activeMs ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No manuscripts yet</div>
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--muted)", maxWidth: 420, lineHeight: 1.5, margin: "0 auto" }}>Add a manuscript from the Manuscripts list first — packages are built per manuscript.</div>
          </div>
        </div>
      ) : msPackages.length === 0 && !entered ? (
        <FirstVisitHome onBuild={() => setEntered(true)} onTour={() => setEntered(true)} />
      ) : (
        <PackageWorkshop
          versions={msVersions}
          packages={msPackages}
          queries={msQueries}
          agents={agents}
          onCreateVersion={createVersion}
          onUpdateVersion={(id, f) => updateVersion(id, f)}
          onDeleteVersion={(id) => deleteVersion(id)}
          onSavePackage={savePackage}
        />
      )}
    </div>
  );
};
