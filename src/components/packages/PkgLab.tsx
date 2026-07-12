/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PkgLab — DEV-only review harness for the Package Workshop (#/pkg-lab). Renders the surviving
 * presentational surfaces — the PackageShowcase LANDING (Pro sell) and the PackageWorkshop — over
 * local stubs so they can be eyeballed WITHOUT signing in (the real route is Pro + auth-gated). A
 * theme toggle (.t-capp / .t-bold / .t-edn) proves the var(--…) tokens (the showcase is deliberately
 * Cappuccino-only); a view toggle switches the Showcase vs an empty workshop (0 materials → FR4
 * middle/analytics empties) vs a populated workshop. The stage is sized to the viewport (minus this
 * toolbar) so the FR2 viewport-fit + internal-scroll behaviour is real here. TEMP — remove when the
 * workshop ships.
 */
import React, { useState } from "react";
import { ManuscriptVersion, SubmissionPackage, Query, Agent, ComponentType, QueryStatus } from "../../types";
import { PackageShowcase } from "./PackageShowcase";
import { PackageWorkshop } from "./PackageWorkshop";
import { Tour } from "../Tour";
import { EXAMPLE_VERSIONS, EXAMPLE_PACKAGES, EXAMPLE_QUERIES, EXAMPLE_AGENTS, WORKSHOP_TOUR_STEPS } from "./tourExample";
import { FONT_MONO, FONT_SERIF } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold" | "t-edn";
type View = "showcase" | "empty" | "full";

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
const AG = (id: string, name: string, agency: string): Agent => ({ id, name, agency } as unknown as Agent);
const MOCK_AGENTS: Agent[] = [AG("a1", "Hartley Books", "Hartley Lit"), AG("a2", "Vane & Co", ""), AG("a3", "Marsh Literary", ""), AG("a4", "Ash & Quill", "")];
const Q = (packageId: string, i: number, status: QueryStatus): Query => ({ id: `q-${packageId}-${i}`, manuscriptId: "m", packageId, agentId: MOCK_AGENTS[i % MOCK_AGENTS.length].id, status } as unknown as Query);
// n sends for a package, the first r of which reached a full request — enough for the analytics panel
// to cross MIN_SENDS_FOR_CLAIM and show its full layout.
const sends = (packageId: string, n: number, r: number): Query[] =>
  Array.from({ length: n }, (_, i) => Q(packageId, i, i < r ? QueryStatus.FULL_REQUESTED : QueryStatus.REJECTED));
const MOCK_QUERIES: Query[] = [
  ...sends("p1", 5, 2), // 40% request rate
  ...sends("p2", 6, 4), // 67% — the stronger package
];

const proPill = (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "4px 10px" }}>Pro</span>
);
const msChip = (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 600, color: "var(--ink)", background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 10, padding: "9px 16px" }}>
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--burg)" strokeWidth={1.8} strokeLinejoin="round"><path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2z" /><path d="M4 18a2 2 0 012-2h13" /></svg>Murphy&apos;s Day Out
  </span>
);

export const PkgLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");
  const [view, setView] = useState<View>("showcase");
  const [tour, setTour] = useState(false);
  const [pulseAdd, setPulseAdd] = useState(false);
  // Stateful so the workshop's create/save round-trips in the lab.
  const [versions, setVersions] = useState<ManuscriptVersion[]>(MOCK_VERSIONS);
  const [pkgs, setPkgs] = useState<SubmissionPackage[]>(MOCK_PACKAGES);
  const noop = () => {};
  const startTour = () => { setView("full"); setTour(true); setPulseAdd(false); };
  // Mirror the real flow: the tour ends into the (empty) workshop with the Add-materials pulse.
  const endTour = () => { setTour(false); setView("empty"); setPulseAdd(true); };

  // The empty view starts materials-clear so the FR4 middle + analytics empty states show.
  const emptyVersions: ManuscriptVersion[] = [];
  const emptyPackages: SubmissionPackage[] = [];

  // Mock qhbar (the real host mounts ChromeSlab): crumb + title + Pro + manuscript chip.
  const mockSlab = (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "2px 4px 6px", flexShrink: 0 }}>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--hdr)", opacity: 0.6 }}>Scriptally / Manuscripts / Submission Packages</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 25, fontWeight: 800, color: "var(--hdr)" }}>Package Workshop</span>
          {proPill}
        </div>
      </div>
      <span style={{ marginLeft: "auto" }}>{msChip}</span>
    </div>
  );

  return (
    <div className={theme} style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--desk)", overflow: "hidden" }}>
      {/* Lab toolbar (not part of the workshop chrome) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--bd)", flexWrap: "wrap", flexShrink: 0 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>#/pkg-lab</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["showcase", "empty", "full"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => { setView(v); setTour(false); setPulseAdd(false); }} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: view === v ? "var(--band)" : "#fffefb", color: view === v ? "var(--burg)" : "var(--ink)" }}>
              {v === "showcase" ? "Showcase" : v === "empty" ? "Empty workshop" : "Full workshop"}
            </button>
          ))}
          <button type="button" onClick={startTour} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--burg)", background: tour ? "var(--band)" : "#fffefb", color: "var(--burg)" }}>▶ Run tour</button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["t-capp", "t-bold", "t-edn"] as Theme[]).map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: theme === t ? "var(--band)" : "#fffefb", color: theme === t ? "var(--burg)" : "var(--ink)" }}>
              {t === "t-capp" ? "Cappuccino" : t === "t-bold" ? "Bold Pastille" : "Editorial"}
            </button>
          ))}
        </div>
      </div>

      {/* Stage — sized to the viewport minus the toolbar, mirroring the real pkg-root (host). The
          showcase is full-bleed (its own ground + internal scroll), so it bypasses the padded slab. */}
      {view === "showcase" ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <PackageShowcase manuscriptTitle="Murphy's Day Out" onUnlockPro={() => window.alert("Unlock with Pro → /plans")} onTryExample={() => { setView("empty"); startTour(); }} />
        </div>
      ) : (
      <div className="pkg-root" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "18px 28px 16px", gap: 12, overflow: "hidden", background: "var(--desk)" }}>
        {mockSlab}
        {view === "empty" ? (
          <PackageWorkshop
            versions={emptyVersions}
            packages={emptyPackages}
            queries={[]}
            agents={MOCK_AGENTS}
            onCreateVersion={(type, name, contentDraft) => { const id = `v-lab-${versions.length}`; setVersions((vs) => [...vs, { id, manuscriptId: "m", userId: "lab", componentType: type, versionName: name, fileAttached: false, createdDate: "2026-01-03T00:00:00.000Z", contentDraft }]); return id; }}
            onUpdateVersion={noop}
            onDeleteVersion={noop}
            onSavePackage={() => `p-lab-${pkgs.length}`}
            onStartTour={startTour}
            pulseAddMaterials={pulseAdd}
            onDismissPulse={() => setPulseAdd(false)}
          />
        ) : (
          <PackageWorkshop
            versions={tour ? EXAMPLE_VERSIONS : versions}
            packages={tour ? EXAMPLE_PACKAGES : pkgs}
            queries={tour ? EXAMPLE_QUERIES : MOCK_QUERIES}
            agents={tour ? EXAMPLE_AGENTS : MOCK_AGENTS}
            onCreateVersion={tour ? () => undefined : (type, name, contentDraft) => { const id = `v-lab-${versions.length}`; setVersions((vs) => [...vs, { id, manuscriptId: "m", userId: "lab", componentType: type, versionName: name, fileAttached: false, createdDate: "2026-01-03T00:00:00.000Z", contentDraft }]); return id; }}
            onUpdateVersion={tour ? noop : (id, f) => setVersions((vs) => vs.map((v) => (v.id === id ? { ...v, versionName: f.versionName, contentDraft: f.contentDraft } : v)))}
            onDeleteVersion={tour ? noop : (id) => setVersions((vs) => vs.filter((v) => v.id !== id))}
            onSavePackage={tour ? () => undefined : (baseId, f) => {
              if (baseId) {
                setPkgs((ps) => ps.map((p) => (p.id === baseId ? { ...p, packageName: f.packageName, queryLetterVersionId: f.queryLetterVersionId, synopsisVersionId: f.synopsisVersionId, samplePagesVersionId: f.samplePagesVersionId } : p)));
                return baseId;
              }
              const id = `p-lab-${pkgs.length}`;
              setPkgs((ps) => [...ps, { id, manuscriptId: "m", userId: "lab", packageName: f.packageName, queryLetterVersionId: f.queryLetterVersionId, synopsisVersionId: f.synopsisVersionId, samplePagesVersionId: f.samplePagesVersionId, status: "Active", createdDate: "2026-01-04T00:00:00.000Z" }]);
              return id;
            }}
            onStartTour={startTour}
          />
        )}
      </div>
      )}
      {tour && <Tour steps={WORKSHOP_TOUR_STEPS} onDone={endTour} badge="Example data — cleared when the tour ends" />}
    </div>
  );
};
