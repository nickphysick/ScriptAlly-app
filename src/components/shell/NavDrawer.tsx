/**
 * NavDrawer — the app-wide hidden navigation drawer (replaces the persistent left rail;
 * ref design-refs/queries-hub-v14.html .rail/.scrim anatomy, themed via the existing
 * --rail-* token set so it belongs to whichever of .t-capp/.t-bold/.t-edn is active).
 *
 * Behaviour contract (locked by this component, consumed app-wide):
 *  - opens from any trigger that calls useNavDrawer().toggle (menu buttons in CrumbStrip
 *    and DashTopBar); closes on scrim click, Escape, nav-item select, and the trigger.
 *  - focus is TRAPPED in the panel while open and returns to the opener on close.
 *  - role="dialog" + aria-modal on the panel; triggers carry aria-expanded/aria-controls.
 *  - body scroll locked while open; slide-in honours prefers-reduced-motion (end state).
 *  - z-order: scrim 80 / panel 81 — deliberately above every fixed furniture layer
 *    (help FAB 30, timeline drawer 45/46, modals 50, dropdowns 60) so nothing floats
 *    over the scrim.
 *
 * Contents: the rail's grouped index verbatim from railNav.ts (same items, order and
 * pathname-owned active logic), labels always visible — LABELS ONLY (the count badges were
 * removed in the chrome revision) — then Settings / Help / the account block pinned to the
 * foot. The rail's theme segmented switcher is NOT carried over — the Settings page radio
 * writes the same field.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutGrid, Send, Users, Book, Settings, User, Sparkles, BookOpen, HelpCircle,
  LogOut, Search, Table, Library, ListTodo,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import { burgundy, bodyInk, parchment, FONT_SERIF, FONT_SANS, FONT_MONO, labelColor, mutedInk, hairline } from "../../lib/designTokens";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { RAIL_GROUPS, railActiveKey } from "./railNav";

/* ── Open-state context — AppShell owns the state; triggers + the drawer consume it. ── */

export interface NavDrawerState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const NavDrawerContext = createContext<NavDrawerState | null>(null);
export const NavDrawerProvider = NavDrawerContext.Provider;

/** Null outside the provider (focus tier, tests) — triggers simply don't render there. */
export function useNavDrawer(): NavDrawerState | null {
  return useContext(NavDrawerContext);
}

export const NAV_DRAWER_ID = "sa-nav-drawer";

/* Grouped-index icons — same mapping the rail used (railNav.ts stays React-free). */
const DRAWER_ICONS: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  dashboard: LayoutGrid,
  "queries-hub": Send,
  todo: ListTodo,
  "agents-db": Users,
  "agents-discover": Search,
  manuscripts: Book,
  comps: Library,
  packages: Table,
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/* ── Drawer rows ── */

const DrawerItem: React.FC<{
  label: string;
  Icon?: React.ComponentType<{ style?: React.CSSProperties }>;
  active?: boolean;
  muted?: boolean;
  onClick: () => void;
}> = ({ label, Icon, active, muted, onClick }) => (
  <button
    type="button"
    className="sa-drawer-item"
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", height: 35,
      padding: "0 10px", borderRadius: 9, border: "none", cursor: "pointer", textAlign: "left",
      background: active ? "var(--rail-pill, #f1e9df)" : "transparent",
      color: active ? `var(--rail-ink, ${bodyInk})` : muted ? "var(--rail-label, #9c8878)" : "var(--rail-itemtx, #5a4a40)",
      fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: active ? 600 : 450,
      whiteSpace: "nowrap", transition: "background 0.12s",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--rail-hov, #f7f3ed)"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
  >
    {Icon && (
      <span aria-hidden="true" style={{ display: "flex", flexShrink: 0, width: 16, height: 16, color: active ? `var(--rail-accent, ${burgundy})` : muted ? "var(--rail-label, #9c8878)" : `var(--rail-accent, ${burgundy})`, opacity: active ? 1 : 0.8 }}>
        <Icon style={{ width: 16, height: 16 }} />
      </span>
    )}
    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
  </button>
);

/* ── The drawer ── */

export const NavDrawer: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const ctx = useNavDrawer();
  const { currentUser, logout } = useScriptAllyDb();
  const activeKey = railActiveKey(useLocation().pathname);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const open = ctx?.open ?? false;
  const close = useMemo(() => () => ctx?.setOpen(false), [ctx]);

  /* Open/close side-effects: focus trap in, body scroll lock, restore focus out. */
  useEffect(() => {
    if (!open) { setShowAccount(false); return; }
    restoreRef.current = (document.activeElement as HTMLElement) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first focusable element in the panel once it's in the tree.
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  /* Escape closes; Tab cycles within the panel (focus trap). */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !panel.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!currentUser || !ctx) return null;

  const planLabel = currentUser.plan === UserPlan.PRO ? "Pro" : "Free";
  const go = (tab: string, sub?: string) => { close(); onNavigate(tab, sub); };

  return (
    <>
      <style>{`
        .sa-drawer-scrim {
          position: fixed; inset: 0; z-index: 80;
          background: var(--rail-scrim, rgba(46, 30, 22, 0.28));
          opacity: 0; pointer-events: none; transition: opacity 0.18s ease;
        }
        .sa-drawer-scrim.sa-open { opacity: 1; pointer-events: auto; }
        .sa-drawer-panel {
          position: fixed; top: 0; left: 0; bottom: 0; width: 248px; z-index: 81;
          background: var(--rail-card, #fffefb);
          border-right: var(--rail-bdw, 1px) solid var(--rail-bd, #e7ddd2);
          box-shadow: var(--rail-peek-shadow, 0 12px 40px rgba(58, 28, 20, 0.18));
          display: flex; flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
          visibility: hidden;
        }
        .sa-drawer-panel.sa-open { transform: translateX(0); visibility: visible; }
        @media (prefers-reduced-motion: reduce) {
          .sa-drawer-scrim, .sa-drawer-panel { transition: none !important; }
        }
      `}</style>

      {/* Scrim — click closes. aria-hidden: purely presentational. */}
      <div className={`sa-drawer-scrim${open ? " sa-open" : ""}`} onClick={close} aria-hidden="true" />

      <div
        id={NAV_DRAWER_ID}
        ref={panelRef}
        className={`sa-drawer-panel${open ? " sa-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={open ? undefined : true}
      >
        {/* Brand — mark + wordmark at the top (mirrors the retired rail head, no pin) */}
        <div style={{ display: "flex", alignItems: "center", padding: "16px 12px 12px", minHeight: 58 }}>
          <button
            type="button"
            onClick={() => go("dashboard")}
            aria-label="ScriptAlly — go to dashboard"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", minWidth: 0, flex: 1 }}
          >
            <img src="/scriptally-logo-new.png" alt="" aria-hidden="true" width={36} height={36} style={{ width: 36, height: 36, flexShrink: 0, display: "block" }} />
            <span style={{ display: "flex", overflow: "hidden" }}>
              <ScriptAllyLogo heightPx={44} textColor={burgundy} iconColor={burgundy} />
            </span>
          </button>
        </div>

        {/* Grouped index — items, order and active logic from railNav.ts; labels always visible. */}
        <nav style={{ padding: "2px 12px", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {RAIL_GROUPS.map((group, gi) => (
            <React.Fragment key={group.eyebrow ?? "top"}>
              {group.eyebrow && (
                <div
                  style={{
                    fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "var(--rail-label, #9c8878)",
                    padding: gi === 1 ? "12px 10px 6px" : "14px 10px 6px",
                  }}
                >
                  {group.eyebrow}
                </div>
              )}
              {group.eyebrow && (
                <div aria-hidden="true" style={{ height: 1, background: "var(--rail-hair, #e7ddd2)", margin: "0 10px 4px" }} />
              )}
              {group.items.map((item) => (
                <DrawerItem
                  key={item.key}
                  label={item.label}
                  Icon={DRAWER_ICONS[item.key]}
                  active={activeKey === item.key}
                  onClick={() => go(item.tab, item.sub)}
                />
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Foot — Settings / Help, then the account block, pinned to the bottom. */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ borderTop: "1px solid var(--rail-hair, #e7ddd2)", padding: "6px 12px 8px" }}>
            <DrawerItem label="Settings" Icon={Settings} muted onClick={() => go("account")} />
            <DrawerItem label="Help centre" Icon={HelpCircle} muted onClick={() => go("help")} />
          </div>

          <div style={{ position: "relative", borderTop: "1px solid var(--rail-hair, #e7ddd2)", padding: 8 }}>
            <button
              type="button"
              onClick={() => setShowAccount((v) => !v)}
              aria-expanded={showAccount}
              title="Account"
              style={{ display: "flex", alignItems: "center", gap: 9, padding: 6, borderRadius: 9, background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,42,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  width: 30, height: 30, borderRadius: "50%",
                  background: parchment, border: "1px solid rgba(124,58,42,0.25)",
                  fontFamily: FONT_SERIF, fontSize: 13, fontWeight: 500, color: burgundy,
                }}
              >
                {currentUser.name[0]?.toUpperCase()}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: bodyInk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.name}
                </span>
                <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor }}>
                  {planLabel}
                </span>
              </span>
            </button>

            {/* Account actions — pop UP inside the panel (the focus trap contains it). */}
            {showAccount && (
              <div
                style={{
                  position: "absolute", left: 8, right: 8, bottom: "calc(100% + 6px)",
                  background: parchment, border: "0.5px solid #e0d5c8", borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(58,28,20,0.16)", padding: 4, fontFamily: FONT_SANS, zIndex: 1,
                }}
              >
                <div style={{ padding: "8px 12px", borderBottom: hairline }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: bodyInk }}>{currentUser.name}</p>
                  <p style={{ fontSize: 10, color: mutedInk, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.email}</p>
                </div>
                <div style={{ padding: "4px 0" }}>
                  {([
                    ["My Account", User, () => go("account")],
                    [currentUser.plan === UserPlan.PRO ? "Plans" : "Upgrade to Pro", Sparkles, () => go("plans")],
                    ["Import CSV Data", BookOpen, () => go("import")],
                    ["Help Centre", HelpCircle, () => go("help")],
                  ] as const).map(([label, Icon, act]) => (
                    <button
                      key={label as string}
                      type="button"
                      onClick={act as () => void}
                      className="sa-drawer-item"
                      style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", padding: "6px 12px", borderRadius: 8, fontSize: 12, color: bodyInk }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,42,0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon style={{ width: 13, height: 13, color: burgundy }} /> {label}
                    </button>
                  ))}
                  <div style={{ height: 0.5, background: "#f0e6e0", margin: "4px 2px" }} />
                  <button
                    type="button"
                    onClick={() => { close(); logout(); }}
                    style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", padding: "6px 12px", borderRadius: 8, fontSize: 12, color: bodyInk }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,42,0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <LogOut style={{ width: 13, height: 13 }} /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
