/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TopNavShell — the second shell (shell-rebuild pack, Phase 4; ref
 * design-refs/shell-topnav-mega.html), for pages you READ rather than work in.
 *
 * ⚠️ NO DESK AND NO CAPSULES. This is a flat warm page — the workspace's sage desk and floating
 * capsule are the other shell's idiom, and mixing them makes two shells look like one shell
 * behaving inconsistently.
 *
 * ⚠️⚠️ ONE MORPHING SURFACE, NOT FOUR MENUS (Baked 16). Every section's pane is stacked
 * absolutely inside a single wrap. Sliding along the nav does not close and reopen anything: the
 * wrap's HEIGHT morphs while the outgoing pane leaves and the incoming pane arrives from the
 * direction of travel. Four separate menus would each open and close on their own, which reads
 * as flicker no easing can hide.
 *
 * ⚠️ T2 — THE HEIGHT IS SET IN JS, and it cannot be otherwise. CSS `height:auto` does not
 * animate, so the wrap is measured from the active pane's `offsetHeight`. The `+ 2` is the wrap's
 * own top and bottom borders under `border-box` — it is not a fudge factor, and removing it
 * clips the pane's last two pixels.
 *
 * ⚠️ T1 — THE SEAM BELONGS TO THE MEGA, NOT THE BAR. Absolutely-positioned children paint over
 * their parent's borders, so a `border-bottom` on the bar is covered by the open panel. The
 * hairline is the MEGA's own `border-top`, and the bar's goes transparent while open.
 *
 * The account menu is the SHARED `AccountMenu`, and the search pill, help button and avatar are
 * the shared primitives — one component each, used by both shells.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { AccountMenu } from "./AccountMenu";
import { invokeCapture } from "./railNav";
import { NAV_MENUS, NavMenu, NavRun, navPanels } from "../../lib/topNav";
import { AvatarChip, HelpButton, SearchPill } from "./primitives";
import "./primitives.css";
import "./topNav.css";

/** Baked 17's timings, named once so the component and its locks read the same numbers. */
const INTENT_MS = 100;
const GRACE_MS = 160;
/** How long the outgoing pane is kept mounted so it can travel off. Matches the pane transition. */
const EXIT_MS = 300;

export interface TopNavShellProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath: (path: string) => void;
  onOpenSearch?: () => void;
  searchOpenerRef?: React.RefObject<HTMLButtonElement | null>;
  /** Onboarding renders in this shell with the menus SUPPRESSED — full width, nothing to click
   *  away into. The masthead and the brand stay, so the page still looks like the product. */
  suppressMenus?: boolean;
  /** Live figures for the right-hand panels — derived by the host from existing selectors. */
  panelInput: { overdue: number; idle: number; packagelessManuscripts: number };
  children: React.ReactNode;
}

const ORDER = NAV_MENUS.map((m) => m.key);

export const TopNavShell: React.FC<TopNavShellProps> = ({
  onNavigate, onNavigatePath, onOpenSearch, searchOpenerRef, suppressMenus = false, panelInput,
  children,
}) => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useScriptAllyDb();
  const [open, setOpen] = useState<NavMenu["key"] | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [wrapH, setWrapH] = useState(0);
  /* ⚠️ THE OUTGOING PANE IS TRACKED IN STATE, not left to CSS. Baked 16 wants it to EXIT toward
     the opposite side, and a pane that has simply lost `.on` has nothing to tell it which way
     that is — the direction is a fact about the transition, not about either pane. */
  const [exiting, setExiting] = useState<{ key: NavMenu["key"]; dir: 1 | -1 } | null>(null);

  const mastRef = useRef<HTMLElement>(null);
  const paneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const intentTimer = useRef<number | null>(null);
  const graceTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  /** The section we came FROM, so the incoming pane knows which way to travel. */
  const prevOpen = useRef<NavMenu["key"] | null>(null);

  const panels = navPanels(panelInput);

  /* The exit timer is deliberately NOT cleared here: it belongs to a pane that is already
     travelling off, and cancelling it would strand that pane mid-flight. */
  const clearTimers = useCallback(() => {
    if (intentTimer.current) { window.clearTimeout(intentTimer.current); intentTimer.current = null; }
    if (graceTimer.current) { window.clearTimeout(graceTimer.current); graceTimer.current = null; }
  }, []);

  /* T2 — measure the ACTIVE pane and set the wrap. Re-measured whenever the section changes,
     because the panes are different heights and that difference IS the morph. */
  useEffect(() => {
    if (!open) { setWrapH(0); return; }
    const el = paneRefs.current[open];
    if (el) setWrapH(el.offsetHeight + 2);
  }, [open, panelInput.overdue, panelInput.idle, panelInput.packagelessManuscripts]);

  const show = useCallback((key: NavMenu["key"]) => {
    clearTimers();
    setOpen((cur) => {
      if (cur === key) return cur;
      if (cur) {
        const dir: 1 | -1 = ORDER.indexOf(key) > ORDER.indexOf(cur) ? 1 : -1;
        prevOpen.current = cur;
        setExiting({ key: cur, dir });
        if (exitTimer.current) window.clearTimeout(exitTimer.current);
        exitTimer.current = window.setTimeout(() => setExiting(null), EXIT_MS);
      } else {
        prevOpen.current = null;
      }
      return key;
    });
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    prevOpen.current = null;
    setExiting(null);
    setOpen(null);
  }, [clearTimers]);

  /* Baked 17 — hover with a 100ms intent delay when CLOSED, but an instant morph once open.
     Waiting again between sections would make the surface stutter while the cursor slides. */
  const onEnter = useCallback((key: NavMenu["key"]) => {
    clearTimers();
    if (open) { show(key); return; }
    intentTimer.current = window.setTimeout(() => show(key), INTENT_MS);
  }, [open, show, clearTimers]);

  /* The grace period is what stops the boundary between bar and panel flickering. */
  const scheduleClose = useCallback(() => {
    clearTimers();
    graceTimer.current = window.setTimeout(hide, GRACE_MS);
  }, [hide, clearTimers]);

  useEffect(() => () => {
    clearTimers();
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
  }, [clearTimers]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && mastRef.current?.contains(t)) return;
      hide();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, hide]);

  useEffect(() => { hide(); setAccountOpen(false); }, [pathname, hide]);

  const perform = useCallback((run: NavRun) => {
    hide();
    if (run.kind === "path") onNavigatePath(run.path);
    else if (run.kind === "capture") invokeCapture(run.capture, onNavigate);
    else onNavigate(run.tab, run.sub);
  }, [onNavigate, onNavigatePath, hide]);

  /** Which way a pane travels: +1 moving right along the bar, −1 coming back, 0 opening fresh. */
  const dirFor = (key: NavMenu["key"]): 0 | 1 | -1 => {
    const from = prevOpen.current;
    if (!from || from === key) return 0;
    return ORDER.indexOf(key) > ORDER.indexOf(from) ? 1 : -1;
  };

  return (
    <div className="tn-app">
      <header
        ref={mastRef}
        className={`tn-mast${scrolled ? " scrolled" : ""}${open ? " megaopen" : ""}`}
        onMouseLeave={scheduleClose}
        onMouseEnter={clearTimers}
      >
        <div className="tn-row">
          {/* Baked 15 — the ink tile and the wordmark, both Playfair. THE ROUTE HOME. */}
          <button
            type="button"
            className="tn-brand"
            onClick={() => onNavigatePath("/dashboard")}
            title="Dashboard"
          >
            <span className="tn-tile" aria-hidden="true">S</span>
            <span className="tn-wm">ScriptAlly</span>
          </button>

          {/* ⚠️ THREE HEADINGS, not four. `Learn` is gone: no route exists for it anywhere in the
              app, and a heading that opens onto nothing advertises a section that does not. */}
          {!suppressMenus && (
            <div className="tn-links">
              {NAV_MENUS.map((menu) => (
                <button
                  key={menu.key}
                  type="button"
                  className={`tn-nl${open === menu.key ? " open" : ""}`}
                  aria-expanded={open === menu.key}
                  aria-haspopup="menu"
                  onMouseEnter={() => onEnter(menu.key)}
                  onMouseLeave={() => { if (intentTimer.current) { window.clearTimeout(intentTimer.current); intentTimer.current = null; } }}
                  /* Click toggles, for touch — where there is no hover to open with. */
                  onClick={() => (open === menu.key ? hide() : show(menu.key))}
                >
                  {menu.label}
                  <ChevronDown aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          <div className="tn-right">
            <SearchPill onOpen={() => onOpenSearch?.()} />
            <HelpButton onOpen={() => onNavigatePath("/help")} />
            {currentUser && (
              <span className="tn-acctwrap">
                <button
                  type="button"
                  className={`tn-acct${accountOpen ? " open" : ""}`}
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  title="Account"
                >
                  <AvatarChip name={currentUser.name ?? ""} size={34} />
                  <span className="tn-nm">{currentUser.name}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                {/* THE SHARED AccountMenu — the same component the workspace shell mounts. */}
                <AccountMenu
                  open={accountOpen}
                  onClose={() => setAccountOpen(false)}
                  name={currentUser.name}
                  email={currentUser.email}
                  plan={currentUser.plan}
                  onNavigatePath={onNavigatePath}
                  onSignOut={logout}
                />
              </span>
            )}
          </div>
        </div>

        {/* ⚠️ ONE WRAP. Its height is JS-measured (T2); its top border is the seam (T1). */}
        {!suppressMenus && (
          <div
            className={`tn-megawrap${open ? " show" : ""}`}
            style={{ height: open ? wrapH : 0 }}
            onMouseEnter={clearTimers}
            onMouseLeave={scheduleClose}
          >
            {NAV_MENUS.map((menu) => {
              const on = open === menu.key;
              const out = exiting?.key === menu.key;
              // Incoming travels FROM the direction of travel; outgoing leaves the opposite way.
              const d = on ? dirFor(menu.key) : out ? exiting!.dir : 0;
              return (
                <div
                  key={menu.key}
                  ref={(el) => { paneRefs.current[menu.key] = el; }}
                  className={`tn-mega${on ? " on" : ""}${out ? " out" : ""}`}
                  data-dir={on || out ? d : undefined}
                  role="menu"
                  aria-label={menu.label}
                  aria-hidden={!on}
                >
                  <div className="tn-minner" style={{ ["--cols" as string]: menu.columns.length }}>
                    {menu.columns.map((col) => (
                      <div className="tn-mcol" key={col.cap}>
                        <span className="tn-cap">{col.cap}</span>
                        {col.items.map((item) => (
                          <button
                            type="button"
                            role="menuitem"
                            className="tn-mi"
                            key={item.label}
                            tabIndex={on ? 0 : -1}
                            onClick={() => perform(item.run)}
                          >
                            <span className="tn-mt">
                              <span className="tn-t">{item.label}</span>
                              <span className="tn-s">{item.blurb}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                    {/* THE EDITORIAL PANEL, behind a vertical hairline. Baked 19: the Queries
                        figure is LIVE; Agents and Materials read their own derived figures too,
                        which is more than the pack asked for and costs nothing — every one comes
                        from a selector that already exists. */}
                    <div className="tn-promo">
                      <span className="tn-cap2">{panels[menu.key].cap}</span>
                      <h5>{panels[menu.key].headline}</h5>
                      <p>{panels[menu.key].body}</p>
                      <button
                        type="button"
                        className="tn-lk"
                        tabIndex={on ? 0 : -1}
                        onClick={() => perform({ kind: "path", path: panels[menu.key].path })}
                      >
                        {panels[menu.key].linkLabel}
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* Baked 17 — the scrim dims the page beneath the open section, and closes on click. */}
      <div
        className={`tn-scrim${open ? " show" : ""}`}
        aria-hidden="true"
        onClick={hide}
      />

      <div className="tn-page" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 8)}>
        {children}
      </div>
    </div>
  );
};
