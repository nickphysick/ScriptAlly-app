/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DbProvider, useScriptAllyDb } from "./lib/db";
import { BrandProvider } from "./lib/brand";
import { Auth } from "./components/Auth";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./components/Dashboard";
import { Queries } from "./components/Queries";
import { QueriesLanding } from "./components/QueriesLanding";
import { Agents } from "./components/Agents";
import { Discover } from "./components/Discover";
import { Manuscripts } from "./components/Manuscripts";
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
import { LandingPage } from "./features/landing/LandingPage";
import { Palette, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const { currentUser, updateUserProfile } = useScriptAllyDb();

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
      if (tab === "queries") setActiveSubPage("Landing");
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

  // Logged-out front door (no router). Landing by default; the landing's CTAs deep-link
  // into the existing Auth screen via hash. Every branch here lives inside `!currentUser`,
  // so a logged-in visitor never sees the landing and the app path below is untouched.
  if (!currentUser) {
    if (hash === "#/signin") return <Auth initialMode="login" />;
    if (hash === "#/signup" || hash === "#/start") return <Auth initialMode="signup" />;
    return <LandingPage />;
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
      {/* Shared app shell: full-width top bar + left nav rail; routed pages render inside. */}
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
          activeSubPage === "Landing" ? (
            <QueriesLanding onNavigate={handleNavigate} />
          ) : (
            <Queries searchQuery={searchQuery} onNavigate={handleNavigate} activeSubPage={activeSubPage} />
          )
        )}
        {activeTab === "agents" && (
          activeSubPage === "Discover" ? (
            <Discover onNavigate={handleNavigate} />
          ) : (
            <Agents searchQuery={searchQuery} onNavigate={handleNavigate} />
          )
        )}
        {activeTab === "manuscripts" && (
          activeSubPage === "Submission packages" ? (
            <Manuscripts 
              searchQuery={searchQuery} 
              onAddManuscript={() => setIsAddManuscriptOpen(true)}
            />
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

      {/* Focus Mode Overlay Dialog Form */}
      <LogQueryFocusForm
        isOpen={isLogQueryOpen}
        onClose={() => setIsLogQueryOpen(false)}
        onSuccessToast={(msg) => setSuccessToast(msg)}
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

      {/* Footer copyright stamp block */}
      <footer className="bg-[#3a1c14] text-stone-400 py-10 border-t border-[#7c3a2a]/20">
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
      </footer>
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
