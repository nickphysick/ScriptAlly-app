/**
 * MarketingShell — tier-1 chrome (design refs: landing-v13.html nav + chrome-overview-v1.html
 * tier map). Pinned desk-coloured top nav that condenses once a 40px sentinel at the top of the
 * document has scrolled out of view (the marketing tier scrolls the document — the stage-scroll
 * rules are workspace-only). Right side is auth-aware via the pure marketingNavState:
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
  /* ⚠️ AND THE TRIGGER IS A SENTINEL, NOT A `scrollY` THRESHOLD — the threshold version was a
     FEEDBACK LOOP. It condensed on `scrollY > 12`; condensing SHORTENS the nav (88 → 72 at full
     width, 76 → 68 with the burger, 134.8 → 126.8 wrapped); a shorter nav reflows everything after
     it; and within a few pixels of the threshold the two states chased each other. A sentinel at
     the top of the document sits BEFORE the nav in flow, so nothing the nav does to its own height
     can move it.
     ⚠️ AND THE SENTINEL ALONE DOES NOT FINISH THE JOB — MEASURED, not assumed. With ONE sentinel
     the class still flipped 2–4 times per direction at 901/1440/2080. The residual cause is SCROLL
     ANCHORING: the nav shortening pulls content up, the browser compensates by moving `scrollY`
     itself, and the sentinel is crossed again from underneath. `window.scrollTo(0, 50)` measured
     as `scrollY === 41`. It is the ORIGINAL loop with the browser, rather than a threshold, as the
     second party — so no choice of trigger element can fix it, only a gap wider than the drift.
     Measured drift: 0px at 390, 2px at 901, 4px at 1440/2080. (Suppressing the 200ms condense
     transition makes it WORSE — 19px and 15 flips — because the height change lands in one step
     for anchoring to answer in one step. The transition was damping the fault, not causing it.)
     ⚠️ SO THERE ARE TWO SENTINELS, AND THE HYSTERESIS IS THE POINT. 40px tall for the condense,
     8px for the release: condense when the tall one leaves, release when the short one returns,
     hold between. The 32px gap is 8× the worst measured drift. They are the same two numbers as
     the scroll fallback below — one rule, two implementations, so the two paths cannot disagree
     about where the nav changes state. */
  const condenseRef = useRef<HTMLDivElement | null>(null);
  const releaseRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const condense = condenseRef.current;
    const release = releaseRef.current;
    if (condense && release && typeof IntersectionObserver !== "undefined") {
      /* Each edge only ever asserts ONE direction, which is what makes the pair a hysteresis
         rather than two competing triggers: the tall box says "condensed" when it leaves and says
         nothing when it returns; the short box says "full" when it returns and nothing when it
         leaves. Both fire once on observe, so the state is correct on a deep-linked load too. */
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.target === condense && !e.isIntersecting) setScrolled(true);
          if (e.target === release && e.isIntersecting) setScrolled(false);
        });
      }, { threshold: 0 });
      io.observe(condense);
      io.observe(release);
      return () => io.disconnect();
    }
    /* The same two edges for a browser without the API. */
    const onScroll = () => setScrolled((was) => (was ? window.scrollY > 8 : window.scrollY > 40));
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
      {/* The condense's two triggers. They have to be AHEAD of the nav in flow — see the effect
          above — and they take no space: each cancels its own height with a matching negative
          margin, so both sit at document y=0. The skip link is absolutely positioned, so these are
          the first in-flow boxes on the page. */}
      <div className="mk-navsentinel mk-navsentinel--condense" ref={condenseRef} aria-hidden="true" />
      <div className="mk-navsentinel mk-navsentinel--release" ref={releaseRef} aria-hidden="true" />
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
              <button type="button" className="mk-btn mk-btn--ink" onClick={() => onNavigate("founders")}>
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
