/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission Package Builder — a per-manuscript Pro page (Manuscripts → "Submission packages", route
 * /manuscripts/packages), rebuilt into the Queries-Hub Cappuccino / Bold themed system. It renders
 * inside the global AppShell stage (no nav of its own) and is scoped to the active manuscript via
 * localStorage["scriptally_active_manuscript_id"] (the existing convention).
 *
 * Design source of truth: design-refs/scriptally-package-builder-cappuccino.html — sample it for
 * every colour; theme surfaces come from var(--…) tokens (index.css). This REUSES the existing data
 * model (ManuscriptVersion = "materials" in UI vocabulary, SubmissionPackage) and the packageMetrics
 * engine unchanged — no new collections, no renamed fields. The builder UI surfaces only the three
 * types (Query Letter / Synopsis / Sample Pages); Full Manuscript stays in the data but gets no shelf,
 * slot or modal here (reserved for the future full-request flow).
 *
 * Phase 2 (this file): route + AppShell-stage shell + the Hub-style header (title + Pro pill +
 * manuscript selector) + the empty content pane. The materials rail, first-visit home, packages home,
 * composer, materials gallery, material modal and worked-examples popup arrive in later phases.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { ComponentType, SubmissionPackage } from "../types";
import { HubHeaderBar } from "./shell/HubHeaderBar";
import { FirstVisitHome } from "./packages/FirstVisitHome";
import { MaterialsRail } from "./packages/MaterialsRail";
import { PackagesHome } from "./packages/PackagesHome";
import { Composer } from "./packages/Composer";
import { emptySelection, selectionFromPackage, SlotSelection } from "./packages/typeMeta";
import { FONT_SERIF, FONT_MONO } from "../lib/designTokens";
import { ChevronDown, Lock } from "lucide-react";

export const SubmissionPackages: React.FC = () => {
  const { currentUser, manuscripts, versions, packages, queries, addPackage, updatePackage } = useScriptAllyDb();

  const [activeMsId, setActiveMsId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("scriptally_active_manuscript_id") : null,
  );
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const msMenuRef = useRef<HTMLDivElement>(null);
  // Composer working state (Phase 7): null = home; set = building/editing a package in the pane.
  const [composer, setComposer] = useState<{ name: string; sel: SlotSelection; editId: string | null } | null>(null);

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
  // First-visit: no materials AND no (active) packages for this manuscript. The materials rail and the
  // packages home appear once either count is non-zero.
  const firstVisit = msVersions.length === 0 && msPackages.length === 0;

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setActiveMsId(id);
    localStorage.setItem("scriptally_active_manuscript_id", id);
    setMsMenuOpen(false);
  };
  const multiMs = manuscripts.length > 1;

  // Composer (Phase 7) — new / edit / copy all open the same view; save does the add or update.
  const openNew = () => setComposer({ name: "", sel: emptySelection(), editId: null });
  const openEdit = (pkg: SubmissionPackage) => setComposer({ name: pkg.packageName, sel: selectionFromPackage(pkg), editId: pkg.id });
  const openCopy = (pkg: SubmissionPackage) => setComposer({ name: `Copy of ${pkg.packageName}`, sel: selectionFromPackage(pkg), editId: null });
  const saveComposer = (name: string, sel: SlotSelection) => {
    if (!msId) return;
    const slots = {
      queryLetterVersionId: sel[ComponentType.QUERY_LETTER],
      synopsisVersionId: sel[ComponentType.SYNOPSIS],
      samplePagesVersionId: sel[ComponentType.SAMPLE_PAGES],
    };
    if (composer?.editId) updatePackage(composer.editId, { packageName: name, ...slots });
    else addPackage({ manuscriptId: msId, packageName: name, ...slots });
    setComposer(null);
  };
  // Later-phase targets — stubbed until their phases (materials manager = P8, create-modal = P9,
  // worked-examples = P10).
  const openManage = () => {};
  const openCreate = (_type: ComponentType) => {};
  const openExample = (_key: string) => {};

  // Book glyph for the manuscript selector — burgundy strokes, sampled from the mockup .msel.
  const bookIcon = (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" style={{ color: "var(--burg)", flexShrink: 0 }} aria-hidden="true">
      <path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2z" />
      <path d="M4 18a2 2 0 012-2h13" />
    </svg>
  );

  // Slate Pro pill — mockup .pro (slate text on a slate-tint pill). Lock icon per the app convention.
  const proPill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "4px 10px" }}>
      <Lock style={{ width: 9, height: 9 }} strokeWidth={2.4} aria-hidden="true" /> Pro
    </span>
  );
  // First-visit shows a larger Pro badge (and no manuscript chip) — a leaner header for that state.
  const largerProPill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "6px 14px" }}>
      <Lock style={{ width: 11, height: 11 }} strokeWidth={2.4} aria-hidden="true" /> Pro
    </span>
  );

  // Right slot of the header: the manuscript selector chip. One manuscript = plain, non-interactive;
  // 2+ = a button with a chevron that opens the switcher and re-scopes the builder's context.
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
              <button key={m.id} type="button" role="option" aria-selected={on} onClick={() => selectMs(m.id)} className="pkg-msopt" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", fontFamily: FONT_SERIF, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? "var(--burg)" : "var(--ink)", background: on ? "var(--band)" : "transparent", border: "none", borderRadius: 7, padding: "9px 11px", cursor: "pointer" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="pkg-root" style={{ height: "100%", display: "flex", flexDirection: "column", padding: 16, gap: 14, overflow: "hidden", background: "var(--desk)" }}>
      <style>{`
        .pkg-msopt:hover { background: var(--band) !important; }
        @media (max-width: 768px) {
          .pkg-root { height: auto; min-height: 100%; overflow: visible; }
          .pkg-workspace { flex-direction: column; }
        }
      `}</style>

      {!activeMs ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No manuscripts yet</div>
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--muted)", maxWidth: 420, lineHeight: 1.5, margin: "0 auto" }}>Add a manuscript from the Manuscripts list first — packages are built per manuscript.</div>
          </div>
        </div>
      ) : (
        <>
          <HubHeaderBar
            title={firstVisit ? "Submission Packages" : "Submission Package Builder"}
            titleAfter={firstVisit ? largerProPill : proPill}
            right={firstVisit ? undefined : msSelector}
            style={{ padding: "20px 24px", gap: 14, boxShadow: "none" }}
            titleStyle={{ fontWeight: 700, fontSize: 26, color: "var(--ink)" }}
          />
          <div className="pkg-workspace" style={{ flex: 1, minHeight: 0, display: "flex", gap: 14 }}>
            {/* Materials rail — shown once the manuscript has any material or package (mockup .qlist). */}
            {!firstVisit && <MaterialsRail versions={msVersions} onCreate={openCreate} onManage={openManage} />}
            {/* Content pane — hugs content height and scrolls internally (mockup .pane). First-visit is
                white in both themes; the packages home sits on the themed pane surface. */}
            {/* Composer supplies its own bordered container (.c2), so the pane goes bare for it. */}
            <section className="pkg-pane" style={{ flex: 1, minWidth: 0, background: composer ? "transparent" : "#fffefb", border: composer ? "none" : "var(--bdw) solid var(--bd)", borderRadius: composer ? 0 : "var(--chromerad)", alignSelf: "flex-start", maxHeight: "100%", overflowY: "auto", padding: composer ? 0 : "16px 16px 20px" }}>
              {composer ? (
                <Composer
                  versions={msVersions}
                  packages={msPackages}
                  editingId={composer.editId ?? undefined}
                  initialName={composer.name}
                  initialSelection={composer.sel}
                  onSave={saveComposer}
                  onCancel={() => setComposer(null)}
                  onCreate={openCreate}
                />
              ) : firstVisit ? (
                <FirstVisitHome onBuild={openNew} onCreate={openCreate} onExample={openExample} />
              ) : (
                <PackagesHome packages={msPackages} versions={msVersions} queries={msQueries} onNew={openNew} onEdit={openEdit} onCopy={openCopy} />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
