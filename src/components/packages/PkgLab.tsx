/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PkgLab — DEV-only review harness for the Package Workshop (#/pkg-lab). Renders the two-tab surface
 * over local stubs so it can be eyeballed WITHOUT signing in (the real route is auth-gated). A theme
 * toggle (.t-capp / .t-bold / .t-edn) proves the single-look claim; a view toggle covers the three
 * data states the route can be in — no materials, materials but no packages, and populated. The Pro
 * Pro-selling landing that used to be the default view here was retired with the route's zero-package
 * state. TEMP — remove when the workshop ships (Phase D owns pkg-lab itself).
 */
import React, { useState } from "react";
import { ManuscriptVersion, SubmissionPackage, Query, Agent, ComponentType, QueryStatus } from "../../types";
import { PackageTabs, PackageTab } from "./PackageTabs";
import { WorkshopTab } from "./WorkshopTab";
import { AnalyticsTab, AnalyticsScope } from "./AnalyticsTab";
import { PageHeader } from "../shell/PageHeader";
import { ShieldCheck, Plus } from "lucide-react";
import "./packageWorkshop.css";
import { Tour } from "../Tour";
import { EXAMPLE_VERSIONS, EXAMPLE_PACKAGES, EXAMPLE_QUERIES, EXAMPLE_AGENTS, WORKSHOP_TOUR_STEPS } from "./tourExample";
import { FONT_MONO, FONT_SERIF } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold" | "t-edn";
type View = "empty" | "partial" | "full";

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
const AG = (id: string, name: string, agency: string): Agent => ({ id, name, agency, responseTimeWeeks: 8, noResponseMeansNo: false } as unknown as Agent);
const MOCK_AGENTS: Agent[] = [AG("a1", "Hartley Books", "Hartley Lit"), AG("a2", "Vane & Co", ""), AG("a3", "Marsh Literary", ""), AG("a4", "Ash & Quill", "")];
// Dated so the analytics have real spans to work with: a send in week i, and — where the agent came
// back — a reply 2–6 weeks later. The last send of each package is left silent and long overdue, so
// the waiting/overdue treatments have something to render.
const DAY = 86400000;
const iso = (msAgo: number) => new Date(Date.parse("2026-07-28T00:00:00.000Z") - msAgo).toISOString().slice(0, 10);
const Q = (packageId: string, i: number, status: QueryStatus, sentDaysAgo: number, replyAfterDays: number | null): Query => {
  const base: Record<string, unknown> = {
    id: `q-${packageId}-${i}`, manuscriptId: "m", packageId,
    agentId: MOCK_AGENTS[i % MOCK_AGENTS.length].id, status, dateSent: iso(sentDaysAgo * DAY),
  };
  if (replyAfterDays !== null) {
    const on = iso((sentDaysAgo - replyAfterDays) * DAY);
    base.hasAgentResponded = true;
    if (status === QueryStatus.FULL_REQUESTED) base.fullRequestedDate = on; else base.rejectedDate = on;
  }
  return base as unknown as Query;
};
/** n sends; the first r drew a full request, the next few were rejected, the last is still silent. */
const sends = (packageId: string, n: number, r: number): Query[] =>
  Array.from({ length: n }, (_, i) => {
    const sentDaysAgo = 150 - i * 12;
    if (i < r) return Q(packageId, i, QueryStatus.FULL_REQUESTED, sentDaysAgo, 14 + i * 7);
    if (i < n - 1) return Q(packageId, i, QueryStatus.REJECTED, sentDaysAgo, 21 + i * 5);
    return Q(packageId, i, QueryStatus.QUERIED, sentDaysAgo, null); // still out, well past any window
  });
const MOCK_QUERIES: Query[] = [
  ...sends("p1", 5, 1),
  ...sends("p2", 6, 2),
];

const proPill = (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate)", background: "#e7eef3", border: "1px solid #cfdde6", borderRadius: 999, padding: "4px 10px" }}>Pro</span>
);
const msChip = (
  <span className="pkgw-ctl">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v6l2-1.5L12 10V4" /></svg>Murphy&apos;s Day Out
  </span>
);

export const PkgLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");
  const [view, setView] = useState<View>("empty");
  const [tour, setTour] = useState(false);
  const [pulseAdd, setPulseAdd] = useState(false);
  const [tab, setTab] = useState<PackageTab>("workshop");
  const [newPkgSignal, setNewPkgSignal] = useState(0);
  const [scope, setScope] = useState<AnalyticsScope>("all");
  const [openPkg, setOpenPkg] = useState<string | null>(null);
  // Stateful so the workshop's create/save round-trips in the lab.
  const [versions, setVersions] = useState<ManuscriptVersion[]>(MOCK_VERSIONS);
  const [pkgs, setPkgs] = useState<SubmissionPackage[]>(MOCK_PACKAGES);
  const noop = () => {};
  const startTour = () => { setView("full"); setTour(true); setPulseAdd(false); };
  // Mirror the real flow: the tour ends into the (empty) workshop with the Add-materials pulse.
  const endTour = () => { setTour(false); setView("empty"); setPulseAdd(true); };

  // The empty view starts materials-clear so the FR4 middle + analytics empty states show.
  const emptyVersions: ManuscriptVersion[] = [];
  // One type only — exercises both "materials but no packages" and "only one or two types".
  const lettersOnly = versions.filter((v) => v.componentType === ComponentType.QUERY_LETTER);
  const emptyPackages: SubmissionPackage[] = [];

  // The real header the host mounts — the shared PageHeader (full), then the tab strip beneath it.
  // Mirrored here rather than approximated so lab screenshots match production chrome exactly.
  const mockSlab = (
    <>
      <PageHeader
        variant="full"
        title="Package Workshop"
        description="Bundle your materials once, then send them without rebuilding each time."
        titleAdornment={<span className="pkgw-propill"><ShieldCheck aria-hidden="true" />Pro</span>}
        actionsSlot={
          <div className="pkgw-hact">
            {msChip}
            <button type="button" className="pkgw-btn pkgw-btn--primary" onClick={() => { setTab("workshop"); setNewPkgSignal((n) => n + 1); }}>
              <Plus aria-hidden="true" style={{ width: 15, height: 15 }} />New package
            </button>
          </div>
        }
      />
      <div className="pkgw-strip">
        <ShieldCheck className="sh" aria-hidden="true" />
        <span className="stx">
          <b>Every package keeps its own scorecard.</b> ScriptAlly records which letter, synopsis and pages
          went to each agent — so you can see which combination gets replies, rather than guessing.
        </span>
      </div>
      <PackageTabs tab={tab} onTab={setTab} />
    </>
  );

  return (
    <div className={theme} style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--desk)", overflow: "hidden" }}>
      {/* Lab toolbar (not part of the workshop chrome) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--bd)", flexWrap: "wrap", flexShrink: 0 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>#/pkg-lab</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["empty", "partial", "full"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => { setView(v); setTour(false); setPulseAdd(false); }} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: view === v ? "var(--band)" : "#fffefb", color: view === v ? "var(--burg)" : "var(--ink)" }}>
              {v === "empty" ? "No materials" : v === "partial" ? "Materials, no pkgs" : "Full workshop"}
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

      {/* Stage — sized to the viewport minus the toolbar, mirroring the real pkg-root (host). */}
      <div className="pkg-root pkgw" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "18px 28px 16px", gap: 12, overflowY: "auto", background: "var(--shell-canvas)" }}>
        {mockSlab}
        {tab === "analytics" ? (
          <div className="pkgw-tv" role="tabpanel" aria-label="Analytics">
            <AnalyticsTab
              versions={view === "full" ? versions : view === "partial" ? lettersOnly : emptyVersions}
              packages={view === "full" ? pkgs : emptyPackages}
              queries={view === "full" ? MOCK_QUERIES : []}
              agents={MOCK_AGENTS}
              activePackageId="p2"
              scope={scope}
              onScope={setScope}
              now={Date.parse("2026-07-28T00:00:00.000Z")}
              onOpenQueries={() => window.alert("→ Queries Hub (the real route navigates)")}
              onOpenPackage={(pid) => { setTab("workshop"); setOpenPkg(pid); }}
              onNewPackage={() => { setTab("workshop"); setNewPkgSignal((n) => n + 1); }}
              onTryExample={startTour}
            />
          </div>
        ) : view === "empty" || view === "partial" ? (
          <div className="pkgw-tv" role="tabpanel" aria-label="Workshop"><WorkshopTab
            versions={view === "partial" ? lettersOnly : emptyVersions}
            packages={emptyPackages}
            queries={[]}
            activePackageId={null}
            onCreateVersion={(type, name, contentDraft) => { const id = `v-lab-${versions.length}`; setVersions((vs) => [...vs, { id, manuscriptId: "m", userId: "lab", componentType: type, versionName: name, fileAttached: false, createdDate: "2026-01-03T00:00:00.000Z", contentDraft }]); return id; }}
            onUpdateVersion={noop}
            onDeleteVersion={noop}
            onSavePackage={() => `p-lab-${pkgs.length}`}
            onMakeActive={noop}
            onTryExample={startTour}
            pulseAddMaterials={pulseAdd}
            onDismissPulse={() => setPulseAdd(false)}
          /></div>
        ) : (
          <div className="pkgw-tv" role="tabpanel" aria-label="Workshop"><WorkshopTab
            versions={tour ? EXAMPLE_VERSIONS : versions}
            packages={tour ? EXAMPLE_PACKAGES : pkgs}
            queries={tour ? EXAMPLE_QUERIES : MOCK_QUERIES}
            activePackageId={tour ? null : "p2"}
            newPackageSignal={newPkgSignal}
            openPackageId={openPkg}
            onOpenedPackage={() => setOpenPkg(null)}
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
            onMakeActive={noop}
            onTryExample={startTour}
          /></div>
        )}
      </div>
      {tour && <Tour steps={WORKSHOP_TOUR_STEPS} onDone={endTour} badge="Example data — cleared when the tour ends" />}
    </div>
  );
};
