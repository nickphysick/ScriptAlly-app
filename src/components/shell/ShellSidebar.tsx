/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellSidebar — the CAPSULE panel's contents below the brand (ref
 * design-refs/scriptally-capsule-shell.html), rendered into ShellSide's children slot:
 *
 *   Accordion nav (Dashboard flat; Querying / Agents / Shelf, one open at a time, following
 *   the route; children indented 44px, NO vertical hairline; active = pink fill ONLY — no
 *   burgundy, ever) → flexible spacer → bare manuscript row (sage tile, Playfair title, mono
 *   subtitle, chevron; persists the shared scriptally_active_manuscript_id key) → two cream
 *   task pills (Urgent / House, by the To-do board's own selectors) → the four-tile action
 *   strip (the existing capture contracts; blue is reserved for Pro) → the Upgrade row (slate
 *   PRO pill · "Upgrade to Pro" · chevron; hidden for Pro) → the user block (avatar · name ·
 *   plan — no utility buttons in this idiom; Task settings' reachability is a report flag).
 *
 * All derivations live in lib/shellSidebar.ts (pure, unit-locked).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutGrid, Send, Users, Book, ChevronRight, ChevronsUpDown, Plus, Reply, UserPlus, BookPlus, Settings,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import { invokeCapture } from "./railNav";
import {
  SHELL_DASHBOARD, SHELL_SECTIONS, SHELL_SETUP_PATHS, ShellV2Section,
  railClickPlan, shellPageForPath, shellSectionKeyForPath,
} from "./shellV2Nav";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { Mark } from "./ShellV2";
import {
  SHELL_PRO_COPY, manuscriptInitials, manuscriptSubtitle, resolveActiveManuscript,
  sideNavCounts, sidebarBoardTiles, taskPills,
} from "../../lib/shellSidebar";

/** The shared active-manuscript key (the Package Workshop / Comps / Manuscripts convention). */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** The live nav counts (flyouts pack) — the SAME recipe the panel uses, exposed as a hook so
 *  the collapsed rail's flyouts read identical numbers. Pure derivation over in-memory state;
 *  the rail and the panel each memoise their own copy (cheap, and never disagreeing). */
export function useShellNavCounts(): Record<string, number> {
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, packages } = useScriptAllyDb();
  const tiles = useMemo(
    () => sidebarBoardTiles({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now: Date.now(), mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, currentUser?.mutedTaskRules],
  );
  return sideNavCounts({
    queries, agents, manuscripts, packages,
    todoTotal: tiles.urgent + tiles.housekeeping + tiles.notes,
  });
}

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>> = {
  querying: Send,
  agents: Users,
  shelf: Book,
};

export const ShellSidebarBody: React.FC<{
  /** The legacy navigate bridge — the capture interceptions (Log query etc.) run through it. */
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Router-direct path navigation (clears the global search) — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
  /** The accordion's open section — OWNED BY AppShell (rail-icon-toggle pack) so the row's
   *  click policy can read the real open section at click time. null = none open. */
  openSection: "querying" | "agents" | "shelf" | null;
  /** ONE capsule, two widths (one-sidebar pack): collapsed hides every label region. */
  collapsed?: boolean;
  /** Rail-driven browsing — expand + open this section (null = open none). Never navigates. */
  onBrowse?: (section: ShellV2Section["key"] | null) => void;
  /** The open section's row toggles the capsule shut (rail-icon-toggle, unchanged). */
  onCollapse?: () => void;
  /** Hover flyout hooks — supplied by the capsule so a collapsed row can still reach a page. */
  ribProps?: (key: string) => Record<string, unknown>;
}> = ({ onNavigate, onNavigatePath, openSection, collapsed = false, onBrowse, onCollapse, ribProps = () => ({}) }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, packages,
  } = useScriptAllyDb();
  const { pathname } = useLocation();

  // ── derivations ──
  const tiles = useMemo(
    () => sidebarBoardTiles({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now: Date.now(), mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // The To-do page's own dep discipline: the data arrays are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, currentUser?.mutedTaskRules],
  );
  const pills = taskPills(tiles);
  const total = tiles.urgent + tiles.housekeeping + tiles.notes;
  const counts = sideNavCounts({ queries, agents, manuscripts, packages, todoTotal: total });
  const hit = shellPageForPath(pathname);
  const routeRib = shellSectionKeyForPath(pathname); // the highlight stays truthful to the PAGE

  // ── the row click POLICY is unchanged (rail-selects-a-section + rail-icon-toggle): one
  // element now carries it, so a section row browses, the open section's row collapses, and a
  // single-destination row navigates. The accordion header and the rail rib were two controls
  // for one idea; merged, `railClickPlan` is that idea's single home. ──
  const onRowClick = (key: string) => {
    const plan = railClickPlan(key as "dashboard" | ShellV2Section["key"] | "setup", pathname, collapsed, openSection);
    if (plan.kind === "navigate") onNavigatePath(plan.path);
    else if (plan.kind === "browse") onBrowse?.(plan.section);
    else onCollapse?.();
  };

  // ── the CREATE popover (one-sidebar P3) — the four existing capture contracts, unchanged ──
  const [newOpen, setNewOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);
  const runCapture = (kind: "query" | "record" | "agent" | "manuscript") => {
    setNewOpen(false);
    if (kind === "manuscript") onNavigate("manuscripts", "Add a manuscript");
    else invokeCapture(kind, onNavigate);
  };
  useEffect(() => {
    if (!newOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && newRef.current?.contains(t)) return;
      setNewOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setNewOpen(false); } };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [newOpen]);
  useEffect(() => { if (collapsed) setNewOpen(false); }, [collapsed]);
  // (The accordion's open-section state LIVES IN AppShell now — rail-icon-toggle pack: the
  // rail's click policy must read it, so one owner. Route-sync + snap-on-collapse moved up.)

  // ── manuscript switcher ──
  const [storedMsId, setStoredMsId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  });
  const activeMs = resolveActiveManuscript(manuscripts, storedMsId);
  const [msOpen, setMsOpen] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const pickManuscript = (id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* private mode */ }
    setStoredMsId(id);
    setMsOpen(false);
  };
  useEffect(() => {
    if (!msOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && deckRef.current?.contains(t)) return;
      setMsOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [msOpen]);
  const msQueries = (id: string) => queries.filter((q) => q.manuscriptId === id);

  const showUpgrade = !!currentUser && currentUser.plan !== UserPlan.PRO;
  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* ── THE ONE SIDEBAR (one-sidebar pack — ref design-refs/scriptally-sidebar-final.html) ──
          The rail and the panel are ONE capsule that changes width. EVERY item is the same row
          shape: a 48px glyph cell then a label region. The glyph sits at the same x in both
          states — collapsing hides the label region and NOTHING else. Rows that do not survive
          collapse carry `drop`. ── */}
      <div className="sv2-row sv2-brand drop">
        <span className="sv2-g" aria-hidden="true"><Mark /></span>
        <span className="sv2-l"><span className="sv2-wm"><ScriptAllyLogo heightPx={22} /></span></span>
      </div>

      {/* Dashboard — flat, no children */}
      <button
        type="button"
        className={`sv2-row${pathname === SHELL_DASHBOARD.path ? " on" : ""}`}
        aria-current={pathname === SHELL_DASHBOARD.path ? "page" : undefined}
        title={collapsed ? SHELL_DASHBOARD.label : undefined}
        onClick={() => onRowClick("dashboard")}
        {...ribProps("dashboard")}
      >
        <span className="sv2-g" aria-hidden="true"><LayoutGrid /></span>
        <span className="sv2-l"><span className="sv2-lb">{SHELL_DASHBOARD.label}</span></span>
      </button>

      {SHELL_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.key];
        const open = !collapsed && openSection === section.key;
        const lit = routeRib === section.key;
        return (
          <React.Fragment key={section.key}>
            <button
              type="button"
              className={`sv2-row${lit ? " on" : ""}${open ? " open" : ""}`}
              aria-expanded={open}
              title={collapsed ? section.label : undefined}
              onClick={() => onRowClick(section.key)}
              {...ribProps(section.key)}
            >
              <span className="sv2-g" aria-hidden="true"><Icon /></span>
              <span className="sv2-l">
                <span className="sv2-lb">{section.label}</span>
                <ChevronRight className="sv2-cv" aria-hidden="true" />
              </span>
            </button>
            {/* children indent INSIDE the label region; their glyph cell is empty */}
            <div className={`sv2-kids${open ? " open" : ""}`}>
              {section.pages.map((page) => {
                const on = hit?.page.key === page.key;
                const count = counts[page.key];
                return (
                  <button
                    key={page.key}
                    type="button"
                    className={`sv2-krow${on ? " on" : ""}`}
                    aria-current={on ? "page" : undefined}
                    onClick={() => onNavigatePath(page.path)}
                  >
                    <span className="sv2-g" aria-hidden="true" />
                    <span className="sv2-l">
                      <span className="sv2-lb">{page.label}</span>
                      {count !== undefined && <span className="sv2-ct">{count}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}

      <div className="sv2-gap" />

      {/* ── the bottom cluster ── */}
      <div className="sv2-slab drop">Working on</div>
      {activeMs ? (
        <div className="sv2-mswrap drop" ref={deckRef}>
          <button
            type="button"
            className="sv2-row tall"
            onClick={() => setMsOpen((v) => !v)}
            aria-expanded={msOpen}
            aria-haspopup="listbox"
          >
            <span className="sv2-g" aria-hidden="true"><span className="sv2-tile">{manuscriptInitials(activeMs.title)}</span></span>
            <span className="sv2-l">
              <span className="sv2-stack">
                <span className="sv2-t1">{activeMs.title}</span>
                <span className="sv2-t2">{manuscriptSubtitle(activeMs, msQueries(activeMs.id))}</span>
              </span>
              <ChevronsUpDown className="sv2-cv" aria-hidden="true" />
            </span>
          </button>
          {msOpen && (
            <div className="sv2-mspop" role="listbox" aria-label="Manuscripts">
              {manuscripts.map((m) => (
                <div key={m.id} role="option" aria-selected={m.id === activeMs.id} className="sv2-msrow" onClick={() => pickManuscript(m.id)}>
                  <span className="sv2-msn">{m.title}</span>
                  <span className="sv2-msc">{manuscriptSubtitle(m, msQueries(m.id))}</span>
                </div>
              ))}
              <div className="sv2-msdiv" />
              <div className="sv2-msadd" onClick={() => { setMsOpen(false); onNavigate("manuscripts", "Add a manuscript"); }}>
                <Plus aria-hidden="true" /> Add a manuscript
              </div>
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="sv2-row tall drop" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
          <span className="sv2-g" aria-hidden="true"><span className="sv2-tile">+</span></span>
          <span className="sv2-l">
            <span className="sv2-stack">
              <span className="sv2-t1">Add a manuscript</span>
              <span className="sv2-t2">Your book goes here</span>
            </span>
          </span>
        </button>
      )}

      <div className="sv2-hr drop" />

      {/* NEW — the create popover (one-sidebar P3) */}
      <div className={`sv2-popwrap drop${newOpen ? " open" : ""}`} ref={newRef}>
        <div className="sv2-pop" role="menu" aria-label="Create">
          <div className="sv2-pk">Create</div>
          <button type="button" className="sv2-prow" role="menuitem" onClick={() => runCapture("query")}>
            <Send aria-hidden="true" /><span className="sv2-lb">Log a query</span><span className="sv2-kb">⌘L</span>
          </button>
          <button type="button" className="sv2-prow" role="menuitem" onClick={() => runCapture("record")}>
            <Reply aria-hidden="true" /><span className="sv2-lb">Record a response</span><span className="sv2-kb">⌘R</span>
          </button>
          <div className="sv2-pdiv" />
          <button type="button" className="sv2-prow" role="menuitem" onClick={() => runCapture("agent")}>
            <UserPlus aria-hidden="true" /><span className="sv2-lb">Add an agent</span>
          </button>
          <button type="button" className="sv2-prow" role="menuitem" onClick={() => runCapture("manuscript")}>
            <BookPlus aria-hidden="true" /><span className="sv2-lb">Add a manuscript</span>
          </button>
        </div>
        <button type="button" className="sv2-row new tall" aria-expanded={newOpen} aria-haspopup="menu" onClick={() => setNewOpen((v) => !v)}>
          <span className="sv2-g" aria-hidden="true"><span className="sv2-plus"><Plus /></span></span>
          <span className="sv2-l"><span className="sv2-lb">New</span><span className="sv2-kbd">⌘N</span></span>
        </button>
      </div>

      {showUpgrade && (
        <button type="button" className="sv2-row pro tall drop" onClick={() => onNavigatePath("/plans")}>
          <span className="sv2-g" aria-hidden="true"><span className="sv2-propill">PRO</span></span>
          <span className="sv2-l"><span className="sv2-lb">{SHELL_PRO_COPY}</span><ChevronRight className="sv2-cv" aria-hidden="true" /></span>
        </button>
      )}

      {/* SETTINGS — its own row (one-sidebar P2): it must survive collapse, so it can no longer
          live as a gear inside the user row. */}
      <button
        type="button"
        className={`sv2-row${SHELL_SETUP_PATHS.has(pathname) ? " on" : ""}`}
        aria-current={SHELL_SETUP_PATHS.has(pathname) ? "page" : undefined}
        title={collapsed ? "Settings" : undefined}
        onClick={() => onRowClick("setup")}
        {...ribProps("setup")}
      >
        <span className="sv2-g" aria-hidden="true"><Settings /></span>
        {/* The row reads "Settings" (the pack's wording); the nav CONFIG still calls this
            family "Setup" for the crumb + flyout kicker — flagged, not unified here. */}
        <span className="sv2-l"><span className="sv2-lb">Settings</span></span>
      </button>

      {currentUser && (
        <button type="button" className="sv2-row tall" onClick={() => onNavigatePath("/account")}>
          <span className="sv2-g" aria-hidden="true"><span className="sv2-av">{initials}</span></span>
          <span className="sv2-l">
            <span className="sv2-stack">
              <span className="sv2-un">{currentUser.name}</span>
              <span className="sv2-ur">{currentUser.plan === UserPlan.PRO ? "Pro plan" : "Free plan"}</span>
            </span>
          </span>
        </button>
      )}
    </>
  );
};
