/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TopNavShell — the second shell (ref design-refs/scriptally-topnav-v2.html), for pages you READ
 * rather than work in: Dashboard, Settings, Plan & billing, Help centre.
 *
 * ⚠️ NO DESK AND NO CAPSULES. This is a flat warm page — the workspace's sage desk and floating
 * capsules are the other shell's idiom, and mixing them would make two shells look like one shell
 * behaving inconsistently.
 *
 * ⚠️ THE HAIRLINE APPEARS ON SCROLL ONLY, where the workspace bar's is permanent. That asymmetry
 * is deliberate: the workspace hairline completes the corner with its capsule edge, and there is
 * no capsule here, so there is no corner to complete.
 *
 * The account menu is the SHARED `AccountMenu`, not a copy — two would drift.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, Search, ArrowRight } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { AccountMenu } from "./AccountMenu";
import { invokeCapture } from "./railNav";
import { NAV_MENUS, NavMenu, NavRun, navPanels } from "../../lib/topNav";
import "./topNav.css";

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

export const TopNavShell: React.FC<TopNavShellProps> = ({
  onNavigate, onNavigatePath, onOpenSearch, searchOpenerRef, suppressMenus = false, panelInput, children,
}) => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useScriptAllyDb();
  const [open, setOpen] = useState<NavMenu["key"] | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mastRef = useRef<HTMLElement>(null);
  const panels = navPanels(panelInput);

  // Scrim + Escape + outside-click all close a mega-menu; any navigation closes it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && mastRef.current?.contains(t)) return;
      setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  useEffect(() => { setOpen(null); setAccountOpen(false); }, [pathname]);

  const perform = useCallback((run: NavRun) => {
    setOpen(null);
    if (run.kind === "path") onNavigatePath(run.path);
    else if (run.kind === "capture") invokeCapture(run.capture, onNavigate);
    else onNavigate(run.tab, run.sub);
  }, [onNavigate, onNavigatePath]);

  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="tn-app">
      <header ref={mastRef} className={`tn-mast${scrolled ? " scrolled" : ""}`}>
        <div className="tn-row">
          {/* THE WORDMARK IS THE ROUTE HOME — which is why there is no Dashboard nav item. */}
          <button type="button" className="tn-brand" onClick={() => onNavigatePath("/dashboard")} title="Dashboard">
            <ScriptAllyLogo heightPx={26} />
          </button>

          {/* ⚠️ THREE HEADINGS, not four. `Learn` is gone: its only real destination is Help
              centre, which the account menu carries, and a heading that opens onto one link
              advertises a section that does not exist. It returns when there are guides. */}
          {!suppressMenus && NAV_MENUS.map((menu) => (
            <button
              key={menu.key}
              type="button"
              className={`tn-nl${open === menu.key ? " open" : ""}`}
              aria-expanded={open === menu.key}
              aria-haspopup="menu"
              onClick={() => setOpen((v) => (v === menu.key ? null : menu.key))}
            >
              {menu.label}
              <ChevronDown aria-hidden="true" />
            </button>
          ))}

          <div className="tn-right">
            <button type="button" className="tn-srch" onClick={onOpenSearch} ref={searchOpenerRef}>
              <Search aria-hidden="true" />
              <span>Search…</span>
              <span className="tn-k" aria-hidden="true">⌘K</span>
            </button>
            {currentUser && (
              <span className="tn-acctwrap">
                <button
                  type="button"
                  className={`tn-acct${accountOpen ? " open" : ""}`}
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-haspopup="menu"
                  title="Account"
                >
                  <span className="tn-av" aria-hidden="true">{initials}</span>
                  <span className="tn-nm">{currentUser.name}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                {/* THE SHARED AccountMenu — the same component the workspace bar mounts. */}
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

        {/* THE MEGA-MENUS — same page colour, separated by SHADOW alone. Columns are rendered
            from content: one to three, never three reserved. The menus are thinner than the
            mockup drew them (half its items had no route), which is why the live panel matters
            more here than it did there — it is what stops a short menu looking empty. */}
        {!suppressMenus && NAV_MENUS.map((menu) => (
          <div key={menu.key} className={`tn-mega${open === menu.key ? " on" : ""}`} role="menu" aria-label={menu.label}>
            <div className="tn-minner" style={{ ["--cols" as string]: menu.columns.length }}>
              {menu.columns.map((col) => (
                <div className="tn-mcol" key={col.cap}>
                  <span className="tn-cap">{col.cap}</span>
                  {col.items.map((item) => (
                    <button type="button" role="menuitem" className="tn-mi" key={item.label} onClick={() => perform(item.run)}>
                      <span className="tn-mt">
                        <span className="tn-t">{item.label}</span>
                        <span className="tn-s">{item.blurb}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="tn-promo">
                <span className="tn-cap2">{panels[menu.key].cap}</span>
                <h5>{panels[menu.key].headline}</h5>
                <p>{panels[menu.key].body}</p>
                <button type="button" className="tn-lk" onClick={() => perform({ kind: "path", path: panels[menu.key].path })}>
                  {panels[menu.key].linkLabel}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </header>

      {open && <div className="tn-scrim" aria-hidden="true" onClick={() => setOpen(null)} />}

      <div className="tn-page" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 4)}>
        {children}
      </div>
    </div>
  );
};
