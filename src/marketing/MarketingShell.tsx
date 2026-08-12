/**
 * MarketingShell — tier-1 chrome (design refs: landing-v13.html nav + chrome-overview-v1.html
 * tier map). Pinned desk-coloured top nav whose bottom hairline fades in once the WINDOW has
 * scrolled past 4px (the marketing tier scrolls the document — the stage-scroll rules are
 * workspace-only). Right side is auth-aware via the pure marketingNavState:
 *   logged out → Log in (ghost, → #/login) + "Start tracking — it's free" (→ #/signup)
 *   logged in  → "Open dashboard" + avatar chip — never an auto-redirect.
 *
 * Pre-auth hashes stay the auth transport (the holding page's existing links depend on them);
 * App.tsx owns what a hash renders — the shell only sets window.location.hash.
 */

import React, { useEffect, useState } from "react";
import "./marketing.css";
import { marketingNavState, MarketingNavUser } from "./marketingNav";

export const MarketingShell: React.FC<{
  user: MarketingNavUser | null | undefined;
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Current marketing path — Features scrolls in-page on "/", navigates home from elsewhere. */
  path: string;
  children: React.ReactNode;
}> = ({ user, onNavigate, path, children }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = marketingNavState(user);

  const toFeatures = () => {
    if (path === "/") {
      document.getElementById("mk-features")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      onNavigate("landing");
    }
  };

  return (
    <div className="mk-scope">
      <div className={"mk-navwrap" + (scrolled ? " mk-scrolled" : "")}>
        <nav className="mk-nav" aria-label="Marketing">
          <button type="button" className="mk-brand mk-brand-link" onClick={() => onNavigate("landing")} aria-label="ScriptAlly home">
            <span className="mk-monogram">S</span>
            <span className="mk-wordmark">ScriptAlly</span>
          </button>
          <div className="mk-links">
            <button type="button" onClick={toFeatures}>Features</button>
            <button type="button" onClick={() => onNavigate("pricing")}>Pricing</button>
          </div>
          <div className="mk-navright">
            {nav.showLogIn && (
              <button type="button" className="mk-btn mk-ghost" onClick={() => { window.location.hash = "#/login"; }}>
                Log in
              </button>
            )}
            {nav.mode === "anon" ? (
              <button type="button" className="mk-btn" onClick={() => { window.location.hash = "#/signup"; }}>
                {nav.primaryLabel}
              </button>
            ) : (
              <>
                <button type="button" className="mk-btn" onClick={() => onNavigate("dashboard")}>
                  {nav.primaryLabel}
                </button>
                <span className="mk-avatar" aria-hidden="true">{nav.avatarInitial}</span>
              </>
            )}
          </div>
        </nav>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
