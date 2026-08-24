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

import React, { useEffect, useRef, useState } from "react";
import "./marketing.css";
import scriptallyLogo from "../assets/marketing/scriptally-logo.png";
import { marketingNavState, MarketingNavUser } from "./marketingNav";

export const MarketingShell: React.FC<{
  user: MarketingNavUser | null | undefined;
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Current marketing path — Features scrolls in-page on "/", navigates home from elsewhere. */
  path: string;
  children: React.ReactNode;
}> = ({ user, onNavigate, path, children }) => {
  /* ⚠️ A CLASS TOGGLED BY A PASSIVE LISTENER, NOT A SCROLL-LINKED ANIMATION. The condense is a
     state change with a transition, so it runs on the compositor once and stops; a scroll-driven
     animation would recompute on every frame of every scroll for a two-state effect. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * ⚠️ THE MARKETING TIER HAS ITS OWN NAV PANEL, AND `MobileSheet` WAS CONSIDERED AND REJECTED.
   * That component is the app's universal mobile chassis and its docblock says "never a second
   * sheet implementation" — but it locks `#app-stage-scroll`, the WORKSPACE's scroll container,
   * which does not exist on a marketing route. Making that conditional would put a
   * marketing-shaped branch inside a workspace file, so a tier that declares no workspace imports
   * could borrow it: worse coupling than a small second implementation, and invisible to the next
   * person who edits it. A nav dropdown is also not a bottom sheet; the rule is about sheets.
   * What IS reused is `AccountMenu`'s dismissal IDIOM — pointerdown outside, Escape, focus
   * return — rather than a copy of the file.
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    /* Focus moves into the panel on open — its first link, so the reader lands on content. */
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      /* ⚠️ THE TRIGGER COUNTS AS INSIDE. Its own click handler toggles, so a pointerdown-close
         followed by a click-reopen would leave the burger unable to shut its own panel — the
         same reasoning `AccountMenu` records. */
      if (t && (panelRef.current?.contains(t) || burgerRef.current?.contains(t))) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMenu();
      burgerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  const nav = marketingNavState(user);

  const toFeatures = () => {
    if (path === "/") {
      document.getElementById("mk-features")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      onNavigate("landing");
    }
  };

  /** The four nav destinations. `Features` is an in-page anchor on "/" and so is never current. */
  const LINKS: Array<{ label: string; go: () => void; current?: boolean }> = [
    { label: "Features", go: toFeatures },
    { label: "About", go: () => onNavigate("about"), current: path === "/about" },
    { label: "Pricing", go: () => onNavigate("pricing"), current: path === "/pricing" },
    { label: "Contact", go: () => onNavigate("contact"), current: path === "/contact" },
  ];
  const pick = (go: () => void) => () => { closeMenu(); go(); };

  return (
    <div className="mk-scope">
      {/* Before the nav, so it is the first thing a keyboard reaches on every marketing page. */}
      <a className="mk-skip" href="#mk-main">Skip to content</a>
      <div className={"mk-navwrap" + (scrolled ? " mk-scrolled" : "")}>
        <nav className="mk-nav" aria-label="Marketing">
          <button type="button" className="mk-brand mk-brand-link" onClick={() => onNavigate("landing")} aria-label="ScriptAlly home">
            {/* ⚠️ SHIPPED AS SUPPLIED — BLACK, UNTINTED. The ref carries two recoloured variants
                beside this one; Nick chose the black. Do not add a CSS filter or swap the fill:
                the mark is artwork, not an icon that takes the tier's ink.
                `alt=""` because the wordmark beside it already says ScriptAlly — a second
                announcement is noise to a screen reader, and the button's own aria-label names
                the destination. */}
            <img className="mk-logo" src={scriptallyLogo} alt="" />
            <span className="mk-wordmark">ScriptAlly</span>
          </button>
          {/* ⚠️ THE NAV AND THE FOOTER MUST NOT DISAGREE ABOUT WHAT THE SITE CONTAINS. About and
              Contact are real public routes; leaving them footer-only would put the two company
              pages one scroll below the fold on every page that has one. Features stays because it
              is a live in-page anchor on the landing, and the refs' nav simply predates it. */}
          <div className="mk-links">
            {LINKS.map((l) => (
              <button key={l.label} type="button" onClick={l.go}
                      aria-current={l.current ? "page" : undefined}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="mk-navright">
            {nav.showLogIn && (
              <button type="button" className="mk-login" onClick={() => { window.location.hash = "#/login"; }}>
                Log in
              </button>
            )}
            {nav.mode === "anon" ? (
              <button type="button" className="mk-btn mk-btn--ink" onClick={() => { window.location.hash = "#/signup"; }}>
                {nav.primaryLabel}
              </button>
            ) : (
              <>
                <button type="button" className="mk-btn mk-btn--ink" onClick={() => onNavigate("dashboard")}>
                  {nav.primaryLabel}
                </button>
                <span className="mk-avatar" aria-hidden="true">{nav.avatarInitial}</span>
              </>
            )}
          </div>
          <button
            type="button"
            className="mk-burger"
            ref={burgerRef}
            aria-label={menuOpen ? "Close menu" : "Menu"}
            aria-expanded={menuOpen}
            aria-controls="mk-navpanel"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </nav>

        {/* The panel is inside the sticky wrapper so it travels with the nav and inherits its
            ground; it is only reachable below the breakpoint, where the links are hidden. */}
        {menuOpen && (
          <div className="mk-navpanel" id="mk-navpanel" ref={panelRef}>
            {LINKS.map((l) => (
              <button key={l.label} type="button" onClick={pick(l.go)}
                      aria-current={l.current ? "page" : undefined}>
                {l.label}
              </button>
            ))}
            {nav.showLogIn && (
              <button type="button" onClick={pick(() => { window.location.hash = "#/login"; })}>
                Log in
              </button>
            )}
          </div>
        )}
      </div>
      {/* `tabIndex={-1}` so the skip link can actually move focus here, not merely scroll. */}
      <div id="mk-main" tabIndex={-1} style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
