/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DbProvider, useScriptAllyDb } from "./lib/db";
import { BrandProvider } from "./lib/brand";
import { Auth } from "./components/Auth";
import { AppShell, StagePage } from "./components/shell/AppShell";
// SidebarShell + QueriesRail are retired from the live path (the global AppShell absorbed the
// Queries rail) but still power the dev-only #/shell-lab review surface.
import { SidebarShell } from "./components/shell/SidebarShell";
import { QueriesRail } from "./components/shell/QueriesRail";
import { EditAgentHost } from "./components/EditAgentHost";
import { EditQueryHost } from "./components/EditQueryHost";
import { Dashboard } from "./components/Dashboard";
import { Queries } from "./components/Queries";
import { QueriesLanding } from "./components/QueriesLanding";
import { Agents } from "./components/Agents";
import { DiscoverNewAgents } from "./components/DiscoverNewAgents";
import { SubmissionPackages } from "./components/SubmissionPackages";
import { DiaryLab } from "./components/dashboard/DiaryLab";
import { AllManuscripts } from "./components/AllManuscripts";
import { ComparableTitlesPage } from "./components/manuscripts/ComparableTitlesPage";
import { Pricing } from "./components/Pricing";
import { ImportCsv } from "./components/ImportCsv";
import { BrandStudio } from "./components/BrandStudio";
import { LogQueryFocusForm } from "./components/LogQueryFocusForm";
import { AddAgentFocusForm } from "./components/AddAgentFocusForm";
import { AddManuscriptFocusForm } from "./components/AddManuscriptFocusForm";
import { HelpCentre } from "./components/HelpCentre";
import { AccountSettings } from "./components/AccountSettings";
// Rail "+ Record a response" host (the dashboard keeps its own independent instance).
import { RecordResponseScreen } from "./components/RecordResponseScreen";
// Route tiers (landing build): marketing chrome for "/" + /pricing, focus chrome for
// /account · /plans · /help; the workspace keeps the AppShell below, untouched.
import { MarketingShell } from "./marketing/MarketingShell";
import { Landing } from "./marketing/Landing";
import { tierForPath, WORKSPACE_PATHS } from "./marketing/routeTiers";
import { FocusShell } from "./components/shell/FocusShell";
import { Onboarding } from "./components/Onboarding";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StatusDotDemo } from "./components/StatusDotDemo";
import { PlansPage } from "./components/PlansPage";
// TEMP (Prompt 2): email-import dev preview route — remove with the Nav dropdown item next prompt.
import { EmailImportDevPage } from "./components/emailImport/EmailImportDevPage";
// TEMP: agents-screen B-redesign dev preview — remove after visual sign-off.
import { SmartImportReview } from "./components/onboarding/SmartImportReview";
import { REVIEW_FIXTURE, REVIEW_FIXTURE_DUPES } from "./components/onboarding/SmartImportReviewFixture";
// TEMP: post-import loader dev preview — remove after visual sign-off.
import { ImportingLoader } from "./components/onboarding/ImportingLoader";
// TEMP: scatter-settle extraction loader dev preview (#/scatter-loader) — remove after sign-off.
import { ScatterSettleLoader, LoaderCard } from "./components/onboarding/ScatterSettleLoader";
// TEMP: duplicate-query reconcile card dev preview (#/reconcile-card) — remove after sign-off.
import { ReconcileCardDevPreview } from "./components/onboarding/ReconcileCard";
import { QueryStatus, SubmissionStatus, SubmissionMethod } from "./types";
// TEMP: Form11Drawer review harness (#/drawer-lab) — renders the Edit Agent / Edit Query drawers over
// a mock record so the shared shell can be eyeballed without signing in. DEV only.
import { EditAgentDrawer } from "./components/EditAgentDrawer";
import { EditQueryDrawer } from "./components/EditQueryDrawer";
// TEMP: query reading-pane review harness (#/reading-pane-lab) — DEV only.
import { QueryTimeline } from "./components/reading-pane/QueryTimeline";
// Dev review surface for the notes pieces (PostIt / quick-add / editor) — #/notes-lab, DEV only.
import { NotesLab } from "./components/notes/NotesLab";
import { Palette, X, Check, HelpCircle, Bell, Settings, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/** TEMP dev harness for the post-import loader (#/import-loader): loops loading → complete so both
 *  states can be reviewed. The real flow drives `complete` from BranchB's commit + 5s floor. */
const ImportingLoaderDevHarness: React.FC = () => {
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setComplete((c) => !c), 4000);
    return () => clearInterval(id);
  }, []);
  // onProceed is a no-op here so the completion state stays on screen for review (no real route).
  return <ImportingLoader complete={complete} onProceed={() => {}} userName="Nick" />;
};

/** TEMP dev harness for the scatter-settle extraction loader (#/scatter-loader): mock raw cells, a
 *  simulated ~2.2s extraction, then it snaps + crystallises. Loops so both states can be reviewed. */
const ScatterLoaderDevHarness: React.FC = () => {
  const SAMPLE: { messy: string; name: string; agency: string; date: string; status: QueryStatus }[] = [
    { messy: 'J. Carter · Carter & Vale · "replied, wants pages" · 44621', name: "Jamal Carter", agency: "Carter & Vale", date: "1 Mar 2022", status: QueryStatus.PARTIAL_REQUESTED },
    { messy: "Okonkwo Lit · fulls req · 12.4.24", name: "Maria Okonkwo", agency: "Okonkwo Literary", date: "12 Apr 2024", status: QueryStatus.FULL_REQUESTED },
    { messy: "Vidal · Quill · sent · 6 May", name: "Tomas Vidal", agency: "The Quill Agency", date: "6 May 2024", status: QueryStatus.QUERIED },
    { messy: "G. Salt · offer!! · 02/13/2024", name: "Gregory Salt", agency: "Penhallow Literary", date: "13 Feb 2024", status: QueryStatus.OFFER },
    { messy: "Mercer · R&R · 18 Apr", name: "Daniel Mercer", agency: "Saltmarsh Literary", date: "18 Apr 2024", status: QueryStatus.REVISE_RESUBMIT },
    { messy: "Webb · rejected · 5.2.24", name: "Marianne Webb", agency: "The Greenhouse", date: "5 Feb 2024", status: QueryStatus.REJECTED },
  ];
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const cycle = () => { setComplete(false); setTimeout(() => setComplete(true), 2200); };
    cycle();
    const id = setInterval(cycle, 8000);
    return () => clearInterval(id);
  }, []);
  const cards: LoaderCard[] = SAMPLE.map((s) => complete ? { messy: s.messy, name: s.name, agency: s.agency, date: s.date, status: s.status } : { messy: s.messy });
  return <ScatterSettleLoader cards={cards} complete={complete} total={28} onProceed={() => {}} userName="Nick" />;
};

/** TEMP dev harness for the shared Form11Drawer (#/drawer-lab): renders EditAgentDrawer over a mock
 *  agent so the extracted shell can be reviewed without signing in. Sits inside DbProvider, so the
 *  drawer's useScriptAllyDb works (queries/manuscripts come back empty when signed out). */
const DrawerLab: React.FC = () => {
  const [which, setWhich] = useState<"agent" | "query">("agent");
  const [open, setOpen] = useState(true);
  const mockAgent = {
    id: "lab-agent", userId: "lab", name: "Eleanor Hart", agency: "Hart & Quill Literary",
    email: "eleanor@hartquill.co.uk", website: "hartquill.co.uk", country: "United Kingdom", city: "London",
    socials: [{ platform: "X / Twitter", handle: "@eleanorhart" }],
    submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
    noResponseMeansNo: false, responseTimeWeeks: 8, starRating: 4,
    genres: ["Literary Fiction", "Upmarket Fiction"],
    materialsWanted: ["Query Letter", "Synopsis", "First 50 pages"],
    mswlNotes: "Voice-driven literary fiction with a strong sense of place.",
    notes: "Met at a conference; very warm in person.",
    dateAdded: new Date().toISOString(), lastCheckedDate: new Date().toISOString(),
  } as any;
  const mockQuery = {
    id: "lab-query", userId: "lab", manuscriptId: "lab-ms", agentId: "lab-agent", packageId: "",
    status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-03-04T10:00:00.000Z",
    personalisationNotes: "Mentioned her love of saltmarsh settings and her recent podcast interview.",
    sendMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query Letter", "Synopsis", "First 50 pages"],
    responseDeadline: "2026-08-01T10:00:00.000Z",
  } as any;
  const btn = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? "#e8c8bc" : "#e0d5c8"}`,
    background: active ? "#f5e2da" : "#fffdf9", color: active ? "#7c3a2a" : "#9c8878",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", cursor: "pointer",
  });
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "fixed", top: 20, left: 20, display: "flex", gap: 8, zIndex: 2000 }}>
        <button style={btn(which === "agent")} onClick={() => { setWhich("agent"); setOpen(true); }}>Agent drawer</button>
        <button style={btn(which === "query")} onClick={() => { setWhich("query"); setOpen(true); }}>Query drawer</button>
        {!open && <button style={btn(false)} onClick={() => setOpen(true)}>Reopen</button>}
      </div>
      {which === "agent"
        ? <EditAgentDrawer agent={mockAgent} isOpen={open} onClose={() => setOpen(false)} />
        : <EditQueryDrawer query={mockQuery} isOpen={open} onClose={() => setOpen(false)} />}
    </div>
  );
};

/** TEMP dev harness for the query reading-pane redesign (#/reading-pane-lab): renders the timeline
 *  over a mock partial-sent query (turnaround + scheduled nudge) so the pipeline can be eyeballed. */
const ReadingPaneLab: React.FC = () => {
  const dayMs = 86400000;
  const sentMs = Date.now() - 41 * dayMs;
  const mockAgent = { id: "lab", name: "Priya Raman", agency: "Saltmarsh Literary", responseTimeWeeks: 8 } as any;
  const mockQuery = {
    id: "lab-q", agentId: "lab", manuscriptId: "lab-ms", status: QueryStatus.PARTIAL_SENT,
    dateSent: new Date(sentMs).toISOString(), sendMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query letter", "Synopsis"],
    nudgeDate: new Date(Date.now() + 9 * dayMs).toISOString(), revisionRound: 1,
  } as any;
  const mockEvents = [
    { type: QueryStatus.QUERIED, createdAt: new Date(sentMs).toISOString() },
    { type: QueryStatus.PARTIAL_REQUESTED, createdAt: new Date(sentMs + dayMs).toISOString() },
    { type: QueryStatus.PARTIAL_SENT, createdAt: new Date(sentMs + 2 * dayMs).toISOString() },
  ];
  // Overdue case (Aisha): queried ~800 days ago, 6-week window — bar must cap + read "no reply yet".
  const overdueSentMs = Date.now() - 800 * dayMs;
  const overdueAgent = { id: "lab2", name: "Aisha Kapoor", agency: "Northwind", responseTimeWeeks: 6 } as any;
  const overdueQuery = { id: "lab-q2", agentId: "lab2", manuscriptId: "lab-ms", status: QueryStatus.QUERIED, dateSent: new Date(overdueSentMs).toISOString(), sendMethod: SubmissionMethod.EMAIL, materialsWanted: ["Query letter"] } as any;
  const overdueEvents = [{ type: QueryStatus.QUERIED, createdAt: new Date(overdueSentMs).toISOString() }];
  const Card = ({ title, q, a, ev }: any) => (
    <div style={{ maxWidth: 360, background: "#fdfaf5", border: "1px solid #e9dfd0", borderRadius: 11, overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "9px 16px", textAlign: "center", background: "linear-gradient(135deg,#f5e2da,#efd5ca)", borderBottom: "1px solid #e8cabb" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: "#241c15" }}>{title}</span>
      </div>
      <div style={{ padding: "16px 16px 18px" }}><QueryTimeline query={q} agent={a} events={ev} /></div>
    </div>
  );
  // Static mock of the new pane header (frame + rail + straddling pills + identity) — geometry check.
  const pill: React.CSSProperties = { background: "#fdfaf5", border: "1.5px solid #241c15", borderRadius: 999, boxShadow: "0 2px 7px rgba(36,28,21,0.20)" };
  const Header = () => (
    <div style={{ position: "relative", paddingTop: 17, width: 620 }}>
      <div style={{ position: "absolute", top: 17, left: 26, right: 26, transform: "translateY(-50%)", zIndex: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ ...pill, display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px 5px 6px" }}>
          <span style={{ width: 21, height: 21, borderRadius: "50%", background: "#f8e7dc", border: "1.6px solid #7c3a2a" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".15em", color: "#7c3a2a", fontWeight: 500, textTransform: "uppercase" }}>PARTIAL SENT</span>
        </div>
        <div style={{ ...pill, padding: "2px 16px 4px", fontFamily: "'Caveat',cursive", fontSize: 21, color: "#241c15", lineHeight: 1.1 }}>waiting on Priya…</div>
      </div>
      <div style={{ position: "relative", border: "1px solid #241c15", borderRadius: 14, background: "#fff", boxShadow: "0 14px 38px rgba(58,28,20,0.11)", overflow: "hidden" }}>
        <div style={{ height: 10, background: "#241c15" }} />
        <div style={{ position: "relative", padding: "18px 28px 21px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "#7c3a2a", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 600 }}>PR</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 27, fontWeight: 600, color: "#2a2017", lineHeight: 1.1 }}>Priya Raman</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#a89a8a", marginTop: 3 }}>Saltmarsh Literary</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#7c3a2a", marginTop: 11 }}>priya.raman@saltmarshliterary.co.uk</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontStyle: "italic", fontSize: 11.5, color: "#8a7d6e", marginTop: 11 }}>“Character-driven thrillers and upmarket book-club fiction.”</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "#f2ede7", padding: 30 }}>
      <div style={{ marginBottom: 30 }}><Header /></div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Card title="Tracking — within window" q={mockQuery} a={mockAgent} ev={mockEvents} />
        <Card title="Tracking — overdue" q={overdueQuery} a={overdueAgent} ev={overdueEvents} />
      </div>
    </div>
  );
};

/** TEMP dev harness for the new SidebarShell chrome (#/shell-lab): renders the rail (global nav +
 *  Queries context stub + a static account chip) and the top strip (breadcrumb + a static utility
 *  cluster) around a placeholder well, so the shell can be eyeballed without signing in. DEV only. */
const ShellLab: React.FC = () => {
  const [tab, setTab] = useState("queries");
  // Mock data so the live QueriesRail (filter rows + StatusDots + counts + sort) can be eyeballed
  // without signing in. Real desk data still requires auth (Queries returns null when signed out).
  const [statusFilters, setStatusFilters] = useState<string[]>(["All"]);
  const [msFilter, setMsFilter] = useState("All");
  const [sort, setSort] = useState("Newest first");
  const mockManuscripts = [{ id: "m1", title: "Murphy's Day Out" }, { id: "m2", title: "The Lantern" }] as any;
  const mockQueries = [
    QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED,
    QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.REJECTED, QueryStatus.NO_RESPONSE,
  ].map((status, i) => ({ id: `q${i}`, status, manuscriptId: i % 2 ? "m2" : "m1" })) as any;
  const account = (
    <div style={{ marginTop: "auto", paddingTop: 13, borderTop: "0.5px solid #e7ddd2", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 29, height: 29, borderRadius: "50%", background: "#fdfaf5", border: "1px solid rgba(124,58,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 13, color: "#7c3a2a" }}>N</span>
      <span style={{ flex: 1, fontFamily: "'Source Sans Pro',sans-serif", fontSize: 12.5, color: "#3a1c14" }}>Nick Physick</span>
      <ChevronDown className="w-3 h-3" style={{ color: "#9a8c80" }} />
    </div>
  );
  const iconBtn: React.CSSProperties = { width: 31, height: 31, borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3a2a" };
  const utility = (
    <>
      <button style={iconBtn}><HelpCircle className="w-4 h-4" /></button>
      <button style={{ ...iconBtn, position: "relative" }}><Bell className="w-4 h-4" /><span style={{ position: "absolute", top: 1, right: 1, background: "#7c3a2a", color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 600, padding: "1px 3px", borderRadius: 5, lineHeight: 1 }}>3</span></button>
      <button style={iconBtn}><Settings className="w-4 h-4" /></button>
      <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#fdfaf5", border: "1px solid rgba(124,58,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 13, color: "#7c3a2a" }}>N</span>
    </>
  );
  return (
    <SidebarShell
      activeTab={tab}
      onNavigate={(t) => setTab(t)}
      breadcrumb={["Queries", "Query Database"]}
      context={
        <QueriesRail
          queries={mockQueries}
          manuscripts={mockManuscripts}
          selectedStatusFilters={statusFilters}
          setSelectedStatusFilters={setStatusFilters}
          selectedManuscriptFilter={msFilter}
          setSelectedManuscriptFilter={setMsFilter}
          sortOption={sort}
          setSortOption={setSort}
        />
      }
      account={account}
      utility={utility}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 16 }}>
        <span style={{ fontFamily: "'Caveat',cursive", fontSize: 22, color: "#9a8c80" }}>
          Live rail at left · desk needs auth (signed-out Queries renders null)
        </span>
      </div>
    </SidebarShell>
  );
};

/** Dev review surface for the canonical StatusDot (no router — reached via #/status-dots). */
const useStatusDotDemoRoute = () => {
  const [isDemo, setIsDemo] = useState(() => window.location.hash === "#/status-dots");
  useEffect(() => {
    const onHashChange = () => setIsDemo(window.location.hash === "#/status-dots");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return isDemo;
};

/** Current location hash, re-rendering on change (no router — same pattern as above).
 *  Used only to choose the logged-out front door (landing vs. the auth deep-links). */
const useHash = () => {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash;
};

/**
 * Maps a legacy (tab, subPageName) navigation call onto a router path. This is the write side of
 * the navigate bridge — existing onNavigate call sites keep their old vocabulary; the read side
 * (path → props) lives in AppContent. Focus-form interceptions never reach this function.
 */
function pathFor(tab: string, subPageName?: string): string {
  switch (tab) {
    case "landing": return "/"; // marketing front door (wordmarks navigate here from any tier)
    case "dashboard": return "/dashboard";
    case "queries": {
      // The orphaned Landing keeps its guarded niche behind a param; named database aliases land
      // on the desk; any OTHER subpage value is a query id (NavSearch deep-selection) — carried
      // through ?q= exactly as Queries' "unrecognised subpage = id" contract expects.
      if (subPageName === "Landing") return "/queries?view=landing";
      const dbAliases = ["Query database", "Queries database", "All queries", "Hub"];
      if (subPageName && !dbAliases.includes(subPageName)) return `/queries?q=${encodeURIComponent(subPageName)}`;
      return "/queries";
    }
    case "agents": return subPageName === "Discover new agents" ? "/agents/discover" : "/agents";
    case "manuscripts": {
      if (subPageName === "Submission packages") return "/manuscripts/packages";
      if (subPageName === "Comparable titles") return "/manuscripts/comps";
      return "/manuscripts";
    }
    // Two distinct pricing surfaces, exactly as before the router: the "pricing" tab renders
    // Pricing; "plans" (user-menu Plans/Upgrade, MaterialsField Pro gate) renders the
    // presentational PlansPage. Consolidating them is a separate decision — not this commit.
    case "pricing": return "/pricing";
    case "plans": return "/plans";
    case "import": return "/import";
    case "help": return "/help";
    case "account": return "/account";
    case "email-import-dev": return "/email-import-dev"; // TEMP dev tab — unreferenced, kept guarded
    default: return "/dashboard";
  }
}

// The workspace route set lives in marketing/routeTiers.ts (one source for the tier model);
// marketing + focus paths return from their tier branches before the unknown-path redirect.

function AppContent() {
  const { currentUser, authReady, updateUserProfile } = useScriptAllyDb();

  // URL routing — replaces the old activeTab/activeSubPage state machine. The path is the single
  // source of truth; pages stay mounted across navigation (StagePage display toggling).
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const routeKey = path.split("/")[1] || "";
  const params = new URLSearchParams(location.search);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isBrandStudioOpen, setIsBrandStudioOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isLogQueryOpen, setIsLogQueryOpen] = useState<boolean>(false);
  // Agent to preselect when the Log-a-Query overlay opens (the Agents page Send-query/Up-next
  // seam — handleNavigate's opts.agentId). Cleared on close so the next plain open is unseeded.
  const [logQueryAgentId, setLogQueryAgentId] = useState<string | null>(null);
  // Manuscript to preselect on the same overlay (the manuscripts-page Send-a-query seam —
  // opts.manuscriptId, the mirror of the agent seam). Same stow/clear lifecycle.
  const [logQueryManuscriptId, setLogQueryManuscriptId] = useState<string | null>(null);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState<boolean>(false);
  const [isAddManuscriptOpen, setIsAddManuscriptOpen] = useState<boolean>(false);
  // Rail "+ Record a response": app-level host for the existing RecordResponseScreen (the
  // dashboard keeps its own local instance — the component is self-contained, both hosts are
  // independent). Interception, never a navigation — same contract as the other captures.
  const [isRecordResponseOpen, setIsRecordResponseOpen] = useState<boolean>(false);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // The navigate bridge — same signature and interception contract as the old state setter, so no
  // onNavigate call site needed touching. Interceptions open overlays and NEVER navigate. The
  // optional third param is additive: opts.agentId preselects the Log-a-Query agent (Agents page
  // Send-query/Up-next; Discover's draft-query wiring will reuse it) and opts.manuscriptId the
  // manuscript (the bookplate hero / Send-first) — every existing two-arg call is untouched.
  const handleNavigate = (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => {
    if (subPageName === "Log a query" || subPageName === "Send a query") {
      setLogQueryAgentId(opts?.agentId ?? null);
      setLogQueryManuscriptId(opts?.manuscriptId ?? null);
      setIsLogQueryOpen(true);
      return;
    }
    if (subPageName === "Add an agent") {
      setIsAddAgentOpen(true);
      return;
    }
    if (subPageName === "Record a response") {
      setIsRecordResponseOpen(true);
      return;
    }
    if (subPageName === "Add a manuscript" || subPageName === "Add a Manuscript") {
      setIsAddManuscriptOpen(true);
      return;
    }
    navigate(pathFor(tab, subPageName));
    // Clear quick filters on direct pivots (matches the old behaviour — never on interceptions)
    setSearchQuery("");
  };

  const isStatusDotDemo = useStatusDotDemoRoute();
  const hash = useHash();
  // Dev-only review surface — never reachable in the production build (import.meta.env.DEV is
  // false there). In prod the #/status-dots hash simply falls through to the normal app/landing.
  if (isStatusDotDemo && import.meta.env.DEV) {
    return <StatusDotDemo />;
  }
  // Dev-only review surface for the presentational plans page (same pattern as #/status-dots).
  // It's also registered in the activeTab switch below; this hash hatch lets it be reviewed
  // without signing in. In prod the hash simply falls through to the normal app/landing.
  if (hash === "#/plans" && import.meta.env.DEV) {
    return <PlansPage />;
  }
  // Dev-only agents-screen B-redesign preview.
  if (hash === "#/import-review-dupes" && import.meta.env.DEV) {
    return <SmartImportReview result={REVIEW_FIXTURE_DUPES} userName="Nick" onSkip={() => {}} />;
  }
  if (hash === "#/import-review" && import.meta.env.DEV) {
    return <SmartImportReview result={REVIEW_FIXTURE} userName="Nick" onSkip={() => {}} />;
  }
  // Dev-only post-import loader preview (auto-loops loading → complete).
  if (hash === "#/import-loader" && import.meta.env.DEV) {
    return <ImportingLoaderDevHarness />;
  }
  // Dev-only scatter-settle extraction loader preview (auto-loops scatter → snap/crystallise).
  if (hash === "#/scatter-loader" && import.meta.env.DEV) {
    return <ScatterLoaderDevHarness />;
  }
  // Dev-only duplicate-query reconcile card preview (working ⇄ sorted, local state).
  if (hash === "#/reconcile-card" && import.meta.env.DEV) {
    return <ReconcileCardDevPreview />;
  }
  // Dev-only notes review surface (PostIt / quick-add / editor) — local state, no persistence.
  if (hash === "#/notes-lab" && import.meta.env.DEV) {
    return <NotesLab />;
  }
  // Dev-only diary depth-carousel review surface (theme-toggleable, no auth, stage-replicating). TEMP.
  if (hash === "#/diary-lab" && import.meta.env.DEV) {
    return <DiaryLab />;
  }
  // Dev-only Form11Drawer review surface (Edit Agent over a mock record). DEV only.
  if (hash === "#/drawer-lab" && import.meta.env.DEV) {
    return <DrawerLab />;
  }
  // Dev-only query reading-pane timeline review surface. DEV only.
  if (hash === "#/reading-pane-lab" && import.meta.env.DEV) {
    return <ReadingPaneLab />;
  }
  // Dev-only SidebarShell chrome review surface (no login) — rail + top strip + breadcrumb + the
  // Queries context stub around a placeholder well. TEMP: remove when the shell migration lands.
  if (hash === "#/shell-lab" && import.meta.env.DEV) {
    return <ShellLab />;
  }

  // Boot: while Firebase Auth is still resolving the session, show a neutral splash — never a
  // landing/auth view. Stops the old "calmer place to query" landing flashing on a hard refresh.
  if (!authReady) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#F5F0EA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 22,
            letterSpacing: "-0.01em",
            color: "#7c3a2a",
            opacity: 0.45,
          }}
        >
          ScriptAlly
        </span>
      </div>
    );
  }

  // ── Marketing tier (public): "/" and "/pricing" render for EVERYONE. A signed-in user is
  // never auto-redirected away from the landing — their nav shows "Open dashboard" instead.
  // The pre-auth hashes stay the auth transport on these routes (#/login · #/signin → sign-in,
  // #/signup → create account — the holding page's existing links keep working); once auth
  // completes while a hash is set, the journey finishes in the workspace.
  const tier = tierForPath(path);
  if (tier === "marketing") {
    const authHash =
      hash === "#/login" || hash === "#/signin" ? "login"
      : hash === "#/signup" ? "signup"
      : null;
    if (authHash) {
      if (!currentUser) return <Auth initialMode={authHash} />;
      return <Navigate to="/dashboard" replace />; // auth just completed (or a stale link) → workspace
    }
    return (
      <MarketingShell user={currentUser} onNavigate={handleNavigate} path={path}>
        {path === "/pricing" ? <Pricing /> : <Landing onNavigate={handleNavigate} />}
      </MarketingShell>
    );
  }

  // Logged-out front door for the app tiers. As a founding-members acquisition page the screen
  // defaults to Create account; an explicit #/login (or #/signin) deep link opens it in sign-in
  // mode instead. (Deep links keep their URL until sign-in — unchanged behaviour.)
  if (!currentUser) {
    if (hash === "#/login" || hash === "#/signin") return <Auth initialMode="login" />;
    return <Auth initialMode="signup" />;
  }

  const freshSignupFlag = sessionStorage.getItem("scriptally_new_signup") === "true";
  if (currentUser.onboardingComplete === false || freshSignupFlag) {
    return (
      <Onboarding
        onComplete={async () => {
          sessionStorage.removeItem("scriptally_new_signup");
          try {
            await updateUserProfile({ onboardingComplete: true });
          } catch (e) {
            console.error("Failed to persist onboardingComplete:", e);
          }
          // Some branch exits land somewhere specific (e.g. A3b "Save & explore agents" → the
          // agent database) rather than the default dashboard.
          const dest = sessionStorage.getItem("scriptally_post_onboarding_tab");
          if (dest) {
            sessionStorage.removeItem("scriptally_post_onboarding_tab");
            handleNavigate(dest);
          }
        }}
      />
    );
  }

  // ── Focus tier (authed — the guard above already ran): slim-bar chrome, no rail. The
  // workspace AppShell unmounts on these routes by design (the rail disappears); page-local
  // workspace state resets on a tier crossing, while Firestore data lives in DbProvider above.
  if (tier === "focus") {
    return (
      <FocusShell path={path} user={currentUser} onNavigate={handleNavigate}>
        {path === "/account" ? (
          <AccountSettings onNavigate={handleNavigate} />
        ) : path === "/plans" ? (
          <PlansPage />
        ) : (
          <HelpCentre />
        )}
      </FocusShell>
    );
  }

  // Any unknown path lands on the dashboard. All the early returns above (dev labs, marketing,
  // auth, onboarding, focus) run first, so a logged-out deep link keeps its URL until sign-in.
  if (!WORKSPACE_PATHS.has(path)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Queries subpage-equivalent, read from the URL: ?view=landing keeps the orphaned Landing
  // guard; ?q=<id> is deep-selection (Queries treats an unrecognised subpage value as a query id,
  // exactly as it did with the old activeSubPage).
  const queriesSub = params.get("view") === "landing" ? "Landing" : (params.get("q") ?? "Query database");
  const agentsDiscover = path === "/agents/discover";
  const manuscriptsPackages = path === "/manuscripts/packages";
  const manuscriptsComps = path === "/manuscripts/comps";
  const showFooter = routeKey !== "queries" && !manuscriptsPackages;

  return (
    <div className="text-[#3a1c14] selection:bg-[#7c3a2a]/20 selection:text-[#3a1c14] selection:font-bold">
      {/* Global AppShell: persistent left rail + the stage (the app's scroll container); pages
          render inside as persistent StagePage slots. EditQueryHost + EditAgentHost mount the
          single Edit Query / Edit Agent drawers as app-level overlays (opened via
          useOpenEditQuery / useOpenEditAgent — no route change, scroll preserved). */}
      <EditQueryHost onSavedToast={(msg) => setSuccessToast(msg)}>
      <EditAgentHost
        onSavedToast={(msg) => setSuccessToast(msg)}
      >
      <AppShell
        routeKey={routeKey}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        theme={currentUser?.queriesTheme === "bold" || currentUser?.queriesTheme === "editorial" ? currentUser.queriesTheme : "cappuccino"}
      >
        {/* The four main pages stay MOUNTED across navigation (display toggling) so page-local
            state — Queries filters/sort/selection above all — survives leaving and returning. */}
        <StagePage active={routeKey === "dashboard"}>
          <Dashboard
            onNavigate={handleNavigate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </StagePage>

        {/* The Queries desk owns its internal scroll (no page scrollbar) — its slot is the same
            box the retired SidebarShell content column gave it: full height, clipped, white. */}
        <StagePage active={routeKey === "queries"} layout="fill" clip background="#ffffff">
          {queriesSub === "Landing" ? (
            <QueriesLanding onNavigate={handleNavigate} />
          ) : (
            <Queries searchQuery={searchQuery} onNavigate={handleNavigate} activeSubPage={queriesSub} inShell />
          )}
        </StagePage>

        <StagePage active={routeKey === "agents"} layout="fillColumn">
          {agentsDiscover ? (
            <DiscoverNewAgents onNavigate={handleNavigate} />
          ) : (
            <Agents searchQuery={searchQuery} onNavigate={handleNavigate} active={routeKey === "agents" && !agentsDiscover} />
          )}
        </StagePage>

        <StagePage active={routeKey === "manuscripts"} layout="fill">
          {manuscriptsPackages ? (
            <SubmissionPackages />
          ) : manuscriptsComps ? (
            <ComparableTitlesPage onNavigate={handleNavigate} />
          ) : (
            <AllManuscripts
              searchQuery={searchQuery}
              onNavigate={handleNavigate}
            />
          )}
        </StagePage>

        {/* Secondary pages mount on demand (same lifecycle as the old conditional render).
            /pricing, /plans, /help and /account left this shell for the marketing/focus tiers
            (see the tier branches above) — the workspace keeps only its own routes. */}
        {/* TEMP (Prompt 2): email-import UI dev preview — relocate the entry button to Record-a-response next prompt, then delete this route. */}
        {routeKey === "email-import-dev" && (
          <StagePage active><EmailImportDevPage onNavigate={handleNavigate} onSuccessToast={(msg) => setSuccessToast(msg)} /></StagePage>
        )}
        {routeKey === "import" && (
          <StagePage active><ImportCsv onNavigate={handleNavigate} /></StagePage>
        )}

        {/* Footer copyright stamp block — in stage flow; hidden on the Queries workspace and the
            Package Builder shell (same visibility rule as before the router). */}
        {showFooter && <footer className="bg-[#3a1c14] text-stone-400 py-10 border-t border-[#7c3a2a]/20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-xs animate-fade-in">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#7c3a2a] flex items-center justify-center text-white font-serif font-bold text-xs shadow">
                  S
                </div>
                <span className="font-serif font-bold text-[#F8F5F0]">ScriptAlly</span>
                <span>&middot; The Literary Querying Companion</span>
              </div>
              <div className="h-4 w-[1px] bg-stone-700 hidden md:block" />
              <button
                onClick={() => handleNavigate("help")}
                className="text-[#dbbdb5] hover:text-[#F8F5F0] transition-colors cursor-pointer font-medium underline decoration-[#dbbdb5]/30 hover:decoration-[#F8F5F0] underline-offset-4"
                id="footer-help-centre-btn"
              >
                Help Centre
              </button>
            </div>
            <p className="font-light text-center md:text-right">
              Crafted for fiction authors querying literary agents. Keep writing, keep pitching. &copy; {new Date().getFullYear()}.
            </p>
          </div>
        </footer>}
      </AppShell>
      </EditAgentHost>
      </EditQueryHost>

      {/* Focus Mode Overlay Dialog Form */}
      <LogQueryFocusForm
        isOpen={isLogQueryOpen}
        onClose={() => { setIsLogQueryOpen(false); setLogQueryAgentId(null); setLogQueryManuscriptId(null); }}
        onSuccessToast={(msg) => setSuccessToast(msg)}
        onNavigate={handleNavigate}
        initialAgentId={logQueryAgentId ?? undefined}
        initialManuscriptId={logQueryManuscriptId ?? undefined}
      />

      <AddAgentFocusForm
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
        onSuccessToast={(msg) => setSuccessToast(msg)}
      />

      <AddManuscriptFocusForm
        isOpen={isAddManuscriptOpen}
        onClose={() => setIsAddManuscriptOpen(false)}
        onSuccessToast={(msg) => setSuccessToast(msg)}
      />

      {/* Rail capture host — the existing RecordResponseScreen (same mount pattern as the
          dashboard's own instance; both are self-contained and independent). */}
      <RecordResponseScreen
        isOpen={isRecordResponseOpen}
        onClose={() => setIsRecordResponseOpen(false)}
        onNavigate={handleNavigate}
        onSuccessToast={(msg) => setSuccessToast(msg)}
      />

      {/* Toast Notification HUD */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-55 bg-stone-900 border border-stone-800 text-[#F8F5F0] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] p-4 flex items-center gap-3 select-none"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <p className="text-xs font-bold leading-none">{successToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Theme Builder — DEV-only builder tool (localStorage theme tweaking). Hidden in
          the production build so normal users can't reach it; use `npm run dev` to access it.
          Offset upward (bottom 72) so it clears the global help "?" FAB now parked bottom-right. */}
      {import.meta.env.DEV && (
        <button
          onClick={() => setIsBrandStudioOpen(true)}
          className="fixed right-6 z-45 w-12 h-12 rounded-full bg-[#7c3a2a] text-white hover:scale-110 active:scale-95 shadow-[0_4px_16px_rgba(124,58,42,0.3)] hover:shadow-[0_8px_24px_rgba(124,58,42,0.45)] transition-all flex items-center justify-center group"
          style={{ bottom: 72 }}
          title="Builder Branding Room"
          id="builder-brand-floater"
        >
          <Palette className="w-5.5 h-5.5 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Designer Studio Overlay Modal — DEV-only (the trigger above is dev-gated too). */}
      {import.meta.env.DEV && isBrandStudioOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="brand-studio-modal">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200/50 w-full max-w-5xl max-h-[90vh] overflow-y-auto relative animate-fade-in-scale p-1">
            {/* Close trigger button */}
            <button
              onClick={() => setIsBrandStudioOpen(false)}
              className="absolute top-5 right-5 z-55 p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
              title="Close Design Room"
              id="close-design-room-btn"
            >
              <X className="w-5 h-5" />
            </button>
            <BrandStudio />
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DbProvider>
        <BrandProvider>
          {/* BrowserRouter carries the URL; the dev-lab hashes (#/shell-lab etc.) and the pre-auth
              #/login / #/signin / #/plans deep links read window.location.hash directly and coexist
              with it (a hash is never part of the pathname). */}
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </BrandProvider>
      </DbProvider>
    </ErrorBoundary>
  );
}
