/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PkgLab — DEV-only review harness for the Submission Package Builder (#/pkg-lab). Renders the
 * builder's presentational views over local stubs + a tiny fixture so they can be eyeballed WITHOUT
 * signing in (the real page is Pro + auth-gated). A theme toggle (.t-capp / .t-bold) proves the
 * var(--…) tokens, and a view toggle switches first-visit vs the populated packages home. TEMP —
 * remove when the feature ships.
 */
import React, { useState } from "react";
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType, QueryStatus } from "../../types";
import { FirstVisitHome } from "./FirstVisitHome";
import { MaterialsRail } from "./MaterialsRail";
import { PackagesHome } from "./PackagesHome";
import { PackageStats } from "./PackageStats";
import { Composer } from "./Composer";
import { MaterialsManager } from "./MaterialsManager";
import { MaterialModal } from "./MaterialModal";
import { JourneyStrip } from "./JourneyStrip";
import { WorkedExample } from "./WorkedExample";
import { PackageWorkshop } from "./PackageWorkshop";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { emptySelection } from "./typeMeta";
import { FONT_MONO, FONT_SERIF } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold" | "t-edn";
type View = "workshop" | "first" | "packages" | "composer" | "manager" | "wins";

const V = (id: string, componentType: ComponentType, versionName: string, fileName: string, contentDraft?: string): ManuscriptVersion => ({
  id, manuscriptId: "m", userId: "lab", componentType, versionName, fileAttached: true, fileName, createdDate: "2026-01-01T00:00:00.000Z", contentDraft,
});
const MOCK_VERSIONS: ManuscriptVersion[] = [
  V("v-ql1", ComponentType.QUERY_LETTER, "Comp-led rework", "MDO_Query_v2.docx", "Dear Ms Hartley, THE LIGHTHOUSE AT WICK POINT is an 82,000-word literary mystery in the vein of The Lamplighters and Magpie Murders. When retired keeper Elspeth Marr finds a stranger's coat folded on the rocks below her light, the past she buried starts washing back in."),
  V("v-syn1", ComponentType.SYNOPSIS, "One-page synopsis", "MDO_Synopsis.docx"),
  V("v-pg1", ComponentType.SAMPLE_PAGES, "Chapters 1–3", "MDO_Pages_1-3.docx"),
];
const PK = (id: string, packageName: string, ql: string, syn: string, pg: string): SubmissionPackage => ({
  id, manuscriptId: "m", userId: "lab", packageName, queryLetterVersionId: ql, synopsisVersionId: syn, samplePagesVersionId: pg, status: "Active", createdDate: "2026-01-01T00:00:00.000Z",
});
const MOCK_PACKAGES: SubmissionPackage[] = [
  PK("p1", "Comp-led · v1", "v-ql1", "v-syn1", ""),
  PK("p2", "Hartley bespoke", "v-ql1", "v-syn1", "v-pg1"),
];
const Q = (packageId: string, i: number, status: QueryStatus): Query => ({ id: `q-${packageId}-${i}`, manuscriptId: "m", packageId, status } as unknown as Query);
// n sends for a package, the first r of which reached a full request — enough for the stats page to
// cross MIN_SENDS_FOR_CLAIM and show its full layout (winner + ranked bars + best-by-type).
const sends = (packageId: string, n: number, r: number): Query[] =>
  Array.from({ length: n }, (_, i) => Q(packageId, i, i < r ? QueryStatus.FULL_REQUESTED : QueryStatus.REJECTED));
const MOCK_QUERIES: Query[] = [
  ...sends("p1", 5, 2), // 40% request rate
  ...sends("p2", 6, 4), // 67% — the winner (shares v-ql1/v-syn1 with p1; owns v-pg1)
];

export const PkgLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");
  const [view, setView] = useState<View>("first");
  const noop = () => {};
  // Material modal (Phase 9) — every add/edit affordance opens it here so all entry points are previewable.
  // Versions are STATEFUL so the modal round-trips: creates append, edits apply, and a composer-origin
  // create demonstrates the auto-slot (same seam the real host wires).
  const [versions, setVersions] = useState<ManuscriptVersion[]>(MOCK_VERSIONS);
  const [pkgs, setPkgs] = useState<SubmissionPackage[]>(MOCK_PACKAGES); // stateful so the workshop's save round-trips
  const [matModal, setMatModal] = useState<{ type: ComponentType; version: ManuscriptVersion | null; fromComposer?: boolean; seedName?: string; seedContent?: string } | null>(null);
  const [autoPick, setAutoPick] = useState<{ type: ComponentType; versionId: string; token: number } | undefined>(undefined);
  const openMat = (type: ComponentType) => setMatModal({ type, version: null });
  const composerMat = (type: ComponentType) => setMatModal({ type, version: null, fromComposer: true });
  const editMat = (v: ManuscriptVersion) => setMatModal({ type: v.componentType, version: v });
  const dupMat = (v: ManuscriptVersion) => setMatModal({ type: v.componentType, version: null, seedName: `Copy of ${v.versionName}`, seedContent: v.contentDraft ?? "" });
  // Worked-examples popup (Phase 10) — opened from the first-visit "See this example in full →".
  const [example, setExample] = useState<string | null>(null);
  const saveMat = (name: string, content: string) => {
    if (!matModal) return;
    if (matModal.version) {
      const vid = matModal.version.id;
      setVersions((vs) => vs.map((v) => (v.id === vid ? { ...v, versionName: name, contentDraft: content } : v)));
    } else {
      const id = `v-lab-${versions.length}`; // adds only in the lab, so length is collision-free
      setVersions((vs) => [...vs, { id, manuscriptId: "m", userId: "lab", componentType: matModal.type, versionName: name, fileAttached: false, createdDate: "2026-01-02T00:00:00.000Z", contentDraft: content }]);
      if (matModal.fromComposer) setAutoPick((p) => ({ type: matModal.type, versionId: id, token: (p?.token ?? 0) + 1 }));
    }
    setMatModal(null);
  };

  // Mock qhbar chrome so the lab proves the header renders above the views (the real page mounts it).
  const proPill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "4px 10px" }}>Pro</span>
  );
  const largerProPill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "6px 14px" }}>Pro</span>
  );
  const msChip = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: "var(--ink)", background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 10, padding: "9px 16px" }}>
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--burg)" strokeWidth={1.8} strokeLinejoin="round"><path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2z" /><path d="M4 18a2 2 0 012-2h13" /></svg>Murphy&apos;s Day Out
    </span>
  );

  return (
    <div className={theme} style={{ minHeight: "100vh", background: "var(--desk)", padding: "20px 16px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1200, margin: "0 auto 18px", flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>#/pkg-lab</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["workshop", "first", "packages", "composer", "manager", "wins"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => { setView(v); setAutoPick(undefined); /* a remounting Composer must not re-apply a stale pick */ }} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: view === v ? "var(--band)" : "#fffefb", color: view === v ? "var(--burg)" : "var(--ink)" }}>
              {v === "workshop" ? "Workshop" : v === "first" ? "First-visit" : v === "packages" ? "Packages" : v === "composer" ? "Composer" : v === "manager" ? "Manager" : "See what wins"}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["t-capp", "t-bold", "t-edn"] as Theme[]).map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: theme === t ? "var(--band)" : "#fffefb", color: theme === t ? "var(--burg)" : "var(--ink)" }}>
              {t === "t-capp" ? "Cappuccino" : t === "t-bold" ? "Bold Pastille" : "Editorial"}
            </button>
          ))}
        </div>
      </div>

      {view !== "workshop" && (
        <div style={{ maxWidth: 1200, margin: "0 auto 14px" }}>
          <HubHeaderBar title={view === "first" ? "Submission Packages" : "Submission Package Builder"} titleAfter={view === "first" ? largerProPill : proPill} right={view === "first" ? undefined : msChip} style={{ padding: "20px 24px", gap: 14, boxShadow: "none" }} titleStyle={{ fontWeight: 700, fontSize: 26, color: "var(--ink)" }} />
        </div>
      )}

      {view === "workshop" ? (
        <div style={{ maxWidth: 1480, margin: "0 auto" }}>
          {/* Mock qhbar for the workshop (the real host mounts ChromeSlab): crumb + title + Pro + chip. */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 8px 22px" }}>
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--hdr)", opacity: 0.6 }}>Scriptally / Manuscripts / Submission Packages</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <span style={{ fontFamily: FONT_SERIF, fontSize: 25, fontWeight: 800, color: "var(--hdr)" }}>Package Workshop</span>
                {proPill}
              </div>
            </div>
            <span style={{ marginLeft: "auto" }}>{msChip}</span>
          </div>
          <PackageWorkshop
            versions={versions}
            packages={pkgs}
            queries={MOCK_QUERIES}
            onCreateVersion={(type, name) => setVersions((vs) => [...vs, { id: `v-lab-${vs.length}`, manuscriptId: "m", userId: "lab", componentType: type, versionName: name, fileAttached: false, createdDate: "2026-01-03T00:00:00.000Z", contentDraft: "" }])}
            onEditVersion={editMat}
            onSavePackage={(baseId, f) => {
              if (baseId) {
                setPkgs((ps) => ps.map((p) => (p.id === baseId ? { ...p, packageName: f.packageName, queryLetterVersionId: f.queryLetterVersionId, synopsisVersionId: f.synopsisVersionId, samplePagesVersionId: f.samplePagesVersionId } : p)));
                return baseId;
              }
              const id = `p-lab-${Date.now()}`;
              setPkgs((ps) => [...ps, { id, manuscriptId: "m", userId: "lab", packageName: f.packageName, queryLetterVersionId: f.queryLetterVersionId, synopsisVersionId: f.synopsisVersionId, samplePagesVersionId: f.samplePagesVersionId, status: "Active", createdDate: "2026-01-04T00:00:00.000Z" }]);
              return id;
            }}
          />
        </div>
      ) : view === "first" ? (
        <section style={{ maxWidth: 1200, margin: "0 auto", background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
          {/* Mirrors Nick's dev fixture (1 letter, 0 packages): letters-only → one LIVE card + two examples. */}
          <FirstVisitHome versions={versions.filter((v) => v.componentType === ComponentType.QUERY_LETTER)} onBuild={noop} onCreate={openMat} onEditMaterial={editMat} onExample={setExample} />
        </section>
      ) : view === "packages" ? (
        <>
          <div style={{ maxWidth: 1200, margin: "0 auto 14px" }}><JourneyStrip view="home" /></div>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <MaterialsRail versions={versions} onCreate={openMat} onManage={noop} />
            <section style={{ flex: 1, minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
              <PackagesHome packages={MOCK_PACKAGES} versions={versions} queries={MOCK_QUERIES} onNew={noop} onEdit={noop} onCopy={noop} onSeeWins={() => setView("wins")} />
            </section>
          </div>
        </>
      ) : view === "wins" ? (
        <>
          <div style={{ maxWidth: 1200, margin: "0 auto 14px" }}><JourneyStrip view="wins" /></div>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <MaterialsRail versions={versions} onCreate={openMat} onManage={noop} />
            <section style={{ flex: 1, minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
              <PackageStats packages={MOCK_PACKAGES} versions={versions} queries={MOCK_QUERIES} onBack={() => setView("packages")} />
            </section>
          </div>
        </>
      ) : view === "composer" ? (
        <>
          <div style={{ maxWidth: 1200, margin: "0 auto 14px" }}><JourneyStrip view="composer" /></div>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <MaterialsRail versions={versions} onCreate={openMat} onManage={noop} />
            {/* Composer brings its own .c2 container — the section is bare. */}
            <section style={{ flex: 1, minWidth: 0 }}>
              <Composer versions={versions} packages={MOCK_PACKAGES} initialName="" initialSelection={emptySelection()} onSave={noop} onCancel={noop} onCreate={composerMat} autoPick={autoPick} />
            </section>
          </div>
        </>
      ) : (
        <>
          <div style={{ maxWidth: 1200, margin: "0 auto 14px" }}><JourneyStrip view="gallery" /></div>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <MaterialsRail versions={versions} onCreate={openMat} onManage={noop} />
            <section style={{ flex: 1, minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
              <MaterialsManager versions={versions} packages={MOCK_PACKAGES} queries={MOCK_QUERIES} onBack={noop} onEdit={editMat} onCreate={openMat} onDuplicate={dupMat} />
            </section>
          </div>
        </>
      )}

      {matModal && (
        <MaterialModal
          type={matModal.type}
          editing={matModal.version !== null}
          initialName={matModal.version?.versionName ?? matModal.seedName ?? ""}
          initialContent={matModal.version?.contentDraft ?? matModal.seedContent ?? ""}
          onCancel={() => setMatModal(null)}
          onSave={saveMat}
        />
      )}

      {example && (
        <WorkedExample exKey={example} onClose={() => setExample(null)} onUse={() => setExample(null)} />
      )}
    </div>
  );
};
