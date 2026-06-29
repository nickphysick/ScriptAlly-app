/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DbProvider, useScriptAllyDb } from "./lib/db";
import { BrandProvider } from "./lib/brand";
import { Auth } from "./components/Auth";
import { AppShell } from "./components/AppShell";
import { EditAgentHost } from "./components/EditAgentHost";
import { EditQueryHost } from "./components/EditQueryHost";
import { Dashboard } from "./components/Dashboard";
import { Queries } from "./components/Queries";
import { QueriesLanding } from "./components/QueriesLanding";
import { QueriesHub } from "./components/QueriesHub";
import { Agents } from "./components/Agents";
import { DiscoverNewAgents } from "./components/DiscoverNewAgents";
import { SubmissionPackages } from "./components/SubmissionPackages";
import { AllManuscripts } from "./components/AllManuscripts";
import { Pricing } from "./components/Pricing";
import { ImportCsv } from "./components/ImportCsv";
import { BrandStudio } from "./components/BrandStudio";
import { LogQueryFocusForm } from "./components/LogQueryFocusForm";
import { AddAgentFocusForm } from "./components/AddAgentFocusForm";
import { AddManuscriptFocusForm } from "./components/AddManuscriptFocusForm";
import { HelpCentre } from "./components/HelpCentre";
import { AccountSettings } from "./components/AccountSettings";
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
import { Palette, X, Check } from "lucide-react";
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

function AppContent() {
  const { currentUser, authReady, updateUserProfile } = useScriptAllyDb();

  // Page routing context state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [activeSubPage, setActiveSubPage] = useState<string>("Dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isBrandStudioOpen, setIsBrandStudioOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isLogQueryOpen, setIsLogQueryOpen] = useState<boolean>(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState<boolean>(false);
  const [isAddManuscriptOpen, setIsAddManuscriptOpen] = useState<boolean>(false);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleNavigate = (tab: string, subPageName?: string) => {
    if (subPageName === "Log a query" || subPageName === "Send a query") {
      setIsLogQueryOpen(true);
      return;
    }
    if (subPageName === "Add an agent") {
      setIsAddAgentOpen(true);
      return;
    }
    if (subPageName === "Add a manuscript" || subPageName === "Add a Manuscript") {
      setIsAddManuscriptOpen(true);
      return;
    }
    setActiveTab(tab);
    if (subPageName) {
      setActiveSubPage(subPageName);
    } else {
      // Set sensible defaults for each tab
      if (tab === "dashboard") setActiveSubPage("Dashboard");
      if (tab === "queries") setActiveSubPage("Hub");
      if (tab === "agents") setActiveSubPage("Agents database");
      if (tab === "manuscripts") setActiveSubPage("All manuscripts");
      if (tab === "pricing") setActiveSubPage("Pricing plans");
      if (tab === "import") setActiveSubPage("Migration desk");
    }
    // Clear quick filters on direct pivots
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
  // Dev-only Form11Drawer review surface (Edit Agent over a mock record). DEV only.
  if (hash === "#/drawer-lab" && import.meta.env.DEV) {
    return <DrawerLab />;
  }
  // Dev-only query reading-pane timeline review surface. DEV only.
  if (hash === "#/reading-pane-lab" && import.meta.env.DEV) {
    return <ReadingPaneLab />;
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

  // Logged-out front door: the public marketing landing is now the separate holding page, and the
  // app is reached via its "Log in" link. As a founding-members acquisition page the screen defaults
  // to Create account; an explicit #/login (or #/signin) deep link opens it in sign-in mode instead.
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

  return (
    <div className="min-h-screen bg-[#F5F0EA] text-[#3a1c14] selection:bg-[#7c3a2a]/20 selection:text-[#3a1c14] selection:font-bold">
      {/* Shared app shell: full-width top bar + left nav rail; routed pages render inside.
          EditQueryHost + EditAgentHost mount the single Edit Query / Edit Agent drawers as app-level
          overlays (opened via useOpenEditQuery / useOpenEditAgent — no route change, scroll preserved).
          EditQueryHost wraps EditAgentHost so an agent-drawer query row can open the query drawer. */}
      <EditQueryHost onSavedToast={(msg) => setSuccessToast(msg)}>
      <EditAgentHost
        onSavedToast={(msg) => setSuccessToast(msg)}
      >
      <AppShell
        activeTab={activeTab}
        activeSubPage={activeSubPage}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      >
        {activeTab === "dashboard" && (
          <Dashboard 
            onNavigate={handleNavigate} 
            searchQuery={searchQuery} 
          />
        )}
        {activeTab === "queries" && (
          activeSubPage === "Hub" ? (
            // Card 3 ("Update an existing query") is a deliberate placeholder for now — the real
            // entry point will be wired later. Until then it surfaces a gentle "coming soon" note.
            <QueriesHub onNavigate={handleNavigate} onUpdateExisting={() => setSuccessToast("Coming soon — you'll be able to update an existing query here.")} />
          ) : activeSubPage === "Landing" ? (
            // Orphaned: the old data-dense overview. No nav path reaches "Landing" now that the
            // global Queries link defaults to "Hub". Kept for reference pending removal.
            <QueriesLanding onNavigate={handleNavigate} />
          ) : (
            <Queries searchQuery={searchQuery} onNavigate={handleNavigate} activeSubPage={activeSubPage} />
          )
        )}
        {activeTab === "agents" && (
          activeSubPage === "Discover new agents" ? (
            <DiscoverNewAgents onNavigate={handleNavigate} />
          ) : (
            <Agents searchQuery={searchQuery} onNavigate={handleNavigate} />
          )
        )}
        {activeTab === "manuscripts" && (
          activeSubPage === "Submission packages" ? (
            <SubmissionPackages />
          ) : (
            <AllManuscripts 
              searchQuery={searchQuery} 
              onNavigate={handleNavigate}
            />
          )
        )}
        {activeTab === "pricing" && (
          <Pricing />
        )}
        {activeTab === "plans" && (
          <PlansPage />
        )}
        {/* TEMP (Prompt 2): email-import UI dev preview — relocate the entry button to Record-a-response next prompt, then delete this route. */}
        {activeTab === "email-import-dev" && (
          <EmailImportDevPage onNavigate={handleNavigate} onSuccessToast={(msg) => setSuccessToast(msg)} />
        )}
        {activeTab === "import" && (
          <ImportCsv onNavigate={handleNavigate} />
        )}
        {activeTab === "help" && (
          <HelpCentre />
        )}
        {activeTab === "account" && (
          <AccountSettings onNavigate={handleNavigate} />
        )}
      </AppShell>
      </EditAgentHost>
      </EditQueryHost>

      {/* Focus Mode Overlay Dialog Form */}
      <LogQueryFocusForm
        isOpen={isLogQueryOpen}
        onClose={() => setIsLogQueryOpen(false)}
        onSuccessToast={(msg) => setSuccessToast(msg)}
        onNavigate={handleNavigate}
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
          the production build so normal users can't reach it; use `npm run dev` to access it. */}
      {import.meta.env.DEV && (
        <button
          onClick={() => setIsBrandStudioOpen(true)}
          className="fixed bottom-6 right-6 z-45 w-12 h-12 rounded-full bg-[#7c3a2a] text-white hover:scale-110 active:scale-95 shadow-[0_4px_16px_rgba(124,58,42,0.3)] hover:shadow-[0_8px_24px_rgba(124,58,42,0.45)] transition-all flex items-center justify-center group"
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

      {/* Footer copyright stamp block — hidden on the Queries workspace and the Package Builder shell */}
      {activeTab !== "queries" && !(activeTab === "manuscripts" && activeSubPage === "Submission packages") && <footer className="bg-[#3a1c14] text-stone-400 py-10 border-t border-[#7c3a2a]/20">
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
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DbProvider>
        <BrandProvider>
          <AppContent />
        </BrandProvider>
      </DbProvider>
    </ErrorBoundary>
  );
}
