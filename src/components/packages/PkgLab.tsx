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
import { Composer } from "./Composer";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { emptySelection } from "./typeMeta";
import { FONT_MONO } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold";
type View = "first" | "packages" | "composer";

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
const Q = (packageId: string, status: QueryStatus): Query => ({ id: `q-${Math.round(status.length + packageId.length)}-${packageId}-${status}`, manuscriptId: "m", packageId, status } as unknown as Query);
const MOCK_QUERIES: Query[] = [
  Q("p1", QueryStatus.FULL_REQUESTED), Q("p1", QueryStatus.QUERIED), Q("p1", QueryStatus.REJECTED),
  Q("p2", QueryStatus.QUERIED),
];

export const PkgLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");
  const [view, setView] = useState<View>("first");
  const noop = () => {};

  // Mock qhbar chrome so the lab proves the header renders above the views (the real page mounts it).
  const proPill = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "4px 10px" }}>Pro</span>
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
          {(["first", "packages", "composer"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: view === v ? "var(--band)" : "#fffefb", color: view === v ? "var(--burg)" : "var(--ink)" }}>
              {v === "first" ? "First-visit" : v === "packages" ? "Packages" : "Composer"}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["t-capp", "t-bold"] as Theme[]).map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: theme === t ? "var(--band)" : "#fffefb", color: theme === t ? "var(--burg)" : "var(--ink)" }}>
              {t === "t-capp" ? "Cappuccino" : "Bold Pastille"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto 14px" }}>
        <HubHeaderBar title="Submission Package Builder" titleAfter={proPill} right={msChip} style={{ padding: "20px 24px", gap: 14, boxShadow: "none" }} titleStyle={{ fontWeight: 700, fontSize: 26, color: "var(--ink)" }} />
      </div>

      {view === "first" ? (
        <section style={{ maxWidth: 1200, margin: "0 auto", background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
          <FirstVisitHome onBuild={noop} onCreate={noop} onExample={noop} />
        </section>
      ) : view === "packages" ? (
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <MaterialsRail versions={MOCK_VERSIONS} onCreate={noop} onManage={noop} />
          <section style={{ flex: 1, minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
            <PackagesHome packages={MOCK_PACKAGES} versions={MOCK_VERSIONS} queries={MOCK_QUERIES} onNew={noop} onEdit={noop} onCopy={noop} />
          </section>
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <MaterialsRail versions={MOCK_VERSIONS} onCreate={noop} onManage={noop} />
          <section style={{ flex: 1, minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px" }}>
            <Composer versions={MOCK_VERSIONS} packages={MOCK_PACKAGES} initialName="" initialSelection={emptySelection()} onSave={noop} onCancel={noop} onCreate={noop} />
          </section>
        </div>
      )}
    </div>
  );
};
