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
  LayoutGrid, Send, Users, Book, ChevronRight, ChevronsUpDown, Plus, Reply, UserPlus, BookPlus,
  Settings, ListChecks,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import { invokeCapture } from "./railNav";
import { SHELL_DASHBOARD, SHELL_SECTIONS, ShellV2Section, shellPageForPath } from "./shellV2Nav";
import {
  localYMD, manuscriptInitials, manuscriptSubtitle, planLine, resolveActiveManuscript,
  sideNavCounts, sidebarBoardTiles,
} from "../../lib/shellSidebar";
import { assembleBoard } from "../../lib/todoBoard";
import { groupHousekeeping, hkGapCount } from "../../lib/todoHousekeeping";
import { isFlagSuppressing } from "../../lib/taskFlags";
import { todoBadgeCount, todoCounts } from "../../lib/todoCount";

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
  /* ⚠️ THE COUNTING LAW (audit item 1). This used to be `urgent + housekeeping + NOTES`, which is
     what made the badge say 44 while the lists totalled 52 — two numbers both called "To-do", and
     nothing defining either. Notes are dateless and nothing chases them, so they must not inflate
     a figure that means "things waiting on you"; open user TASKS take their place.

     The number comes from lib/todoCount, the law's one implementation, so the badge cannot drift
     from the page counts or the board. */
  const todoTotal = useMemo(() => {
    const now = Date.now();
    const board = assembleBoard({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now, mutedTaskRules: currentUser?.mutedTaskRules, today: localYMD(now),
    });
    const groups = groupHousekeeping(board.hk, agents, currentUser?.mutedTaskRules, queries);
    const stale = board.hk.filter((c) => c.taskType === "no_response_close");
    const snoozed = taskFlags.filter((f) => isFlagSuppressing(f, now)).length;
    return todoBadgeCount(todoCounts(board, hkGapCount(groups) + stale.length, snoozed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules]);

  return sideNavCounts({ queries, agents, manuscripts, packages, todoTotal });
}

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>> = {
  querying: Send,
  // Kept in step with ShellV2's RAIL_ICONS — a section absent from either map renders no glyph.
  todo: ListChecks,
  agents: Users,
  shelf: Book,
};


/** THE MANUSCRIPT SCOPE CONTROL (top-bar rebuild) — the SAME switcher that used to sit in the
 *  sidebar, moved whole rather than rebuilt: same shared `scriptally_active_manuscript_id` key,
 *  same popover, same resolve/pick helpers. It lives in the bar because every figure on screen
 *  is filtered by it, and in the sidebar it vanished the moment the panel collapsed. */
export const ShellScope: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const { manuscripts, queries } = useScriptAllyDb();
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

  if (!activeMs) {
    return (
      <button type="button" className="sv2-scope" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
        <span className="sv2-scopetile" aria-hidden="true">+</span>
        <span className="sv2-scopet">Add a manuscript</span>
      </button>
    );
  }
  return (
    <span className="sv2-scopewrap" ref={deckRef}>
      <button type="button" className="sv2-scope" onClick={() => setMsOpen((v) => !v)} aria-expanded={msOpen} aria-haspopup="listbox">
        <span className="sv2-scopetile" aria-hidden="true">{manuscriptInitials(activeMs.title)}</span>
        <span className="sv2-scopet">{activeMs.title}</span>
        <ChevronsUpDown className="sv2-scopechev" aria-hidden="true" />
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
    </span>
  );
};

export const ShellSidebarBody: React.FC<{
  /** The legacy navigate bridge — the capture interceptions (Log query etc.) run through it. */
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Router-direct path navigation (clears the global search) — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
  /** The accordion's open section — OWNED BY AppShell (rail-icon-toggle pack) so the rail's
   *  click policy can read the real open section at click time. null = none open. */
  openSection: ShellV2Section["key"] | null;
  /** Accordion header click — AppShell toggles the section open/shut. */
  onToggleSection: (key: ShellV2Section["key"]) => void;
}> = ({ onNavigate, onNavigatePath, openSection, onToggleSection }) => {
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
  const plan = planLine(currentUser?.plan);
  /* ⚠️ THE SAME LAW AS THE BADGE (audit item 1). This body used to total
     `urgent + housekeeping + notes` independently, which is exactly how two "To-do" numbers came
     to exist. It reads the hook now, so there is one derivation and no second answer. */
  const counts = useShellNavCounts();
  const total = counts.todo ?? 0;
  const hit = shellPageForPath(pathname);
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

  // ── the New popover (panel-foot pack) — dismissal follows the scope chip's own pattern:
  // pointerdown outside closes, and Escape closes. Escape is NOT captured/stopped here: this is
  // permanent chrome sitting beside pages that own their own Escape (an open agent card's draft
  // discard), so swallowing the key at the shell would reach past this popover's business.
  const [newOpen, setNewOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!newOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && newRef.current?.contains(t)) return;
      setNewOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNewOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [newOpen]);
  // A navigation must not leave a popover hanging over the new page's panel.
  useEffect(() => { setNewOpen(false); }, [pathname]);

  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* ── Accordion nav ── */}
      <nav className="sv2-acc" aria-label="Pages">
        <button
          type="button"
          className={`sv2-asec sv2-flat${pathname === SHELL_DASHBOARD.path ? " on" : ""}`}
          aria-current={pathname === SHELL_DASHBOARD.path ? "page" : undefined}
          onClick={() => onNavigatePath(SHELL_DASHBOARD.path)}
        >
          <LayoutGrid className="sv2-ai" aria-hidden="true" />
          <span className="sv2-albl">{SHELL_DASHBOARD.label}</span>
        </button>

        {SHELL_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.key];
          const open = openSection === section.key;
          return (
            <React.Fragment key={section.key}>
              <button
                type="button"
                className={`sv2-asec${open ? " open" : ""}`}
                aria-expanded={open}
                onClick={() => onToggleSection(section.key)}
              >
                <Icon className="sv2-ai" aria-hidden="true" />
                <span className="sv2-albl">{section.label}</span>
                {/* THE GROUP ROW KEEPS THE URGENCY DOT AND THE COUNT (workspace P1). To-do
                    became a section, and the badge has to survive that: collapsed, the group
                    row is all you can see, so a count that lived only on a child would vanish
                    exactly when it is doing its job. The figure is the counting law's own
                    (lib/todoCount, via the badge hook) — notes excluded — and the child row
                    drops its copy so the same number is never stated twice in one column. */}
                {section.key === "todo" && (
                  <>
                    {tiles.urgent > 0 && <span className="sv2-akdot" aria-label={`${tiles.urgent} urgent`} />}
                    <span className="sv2-akct">{total}</span>
                  </>
                )}
                <ChevronRight className="sv2-acv" aria-hidden="true" />
              </button>
              <div className={`sv2-akids${open ? " open" : ""}`}>
                {section.pages.map((page) => {
                  const on = hit?.page.key === page.key;
                  const count = counts[page.key];
                  return (
                    <button
                      key={page.key}
                      type="button"
                      className={`sv2-akid${on ? " on" : ""}`}
                      aria-current={on ? "page" : undefined}
                      onClick={() => onNavigatePath(page.path)}
                    >
                      <span className="sv2-aklbl">{page.label}</span>
                      {/* URGENCY IS ON THE GROUP ROW NOW (workspace P1) — one 6px burgundy dot
                          beside the To-do count, where it survives the group collapsing. A count
                          says how much; the dot says some of it will not wait. */}
                      {count !== undefined && page.key !== "todo" && <span className="sv2-akct">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sv2-half" />

      {/* (The manuscript row and its "Working on" heading LEFT for the top bar — top-bar
          rebuild. No duplication: the scope control exists once, in the chrome, so it survives
          the panel collapsing. Removing it also relieves the crowding in this half.) */}
      {/* ── QUICK ACTIONS — two controls, not four unlabelled tiles (panel-foot pack). The four
          tiles' four contracts all survive: three creates moved into New's popover, and Record
          a response was PROMOTED to its own button because it is the one you reach for while
          holding a reply, not while thinking about making something. ── */}
      <div className="sv2-slab">Quick actions</div>
      <div className="sv2-qa">
        <div className={`sv2-newwrap${newOpen ? " open" : ""}`} ref={newRef}>
          {newOpen && (
            <div className="sv2-pop" role="menu" aria-label="Create">
              <div className="sv2-pk">Create</div>
              <button type="button" className="sv2-prow" role="menuitem" onClick={() => { setNewOpen(false); invokeCapture("query", onNavigate); }}>
                <Send aria-hidden="true" />
                <span className="sv2-plb">Log a query</span>
              </button>
              <button type="button" className="sv2-prow" role="menuitem" onClick={() => { setNewOpen(false); invokeCapture("agent", onNavigate); }}>
                <UserPlus aria-hidden="true" />
                <span className="sv2-plb">Add an agent</span>
              </button>
              <button type="button" className="sv2-prow" role="menuitem" onClick={() => { setNewOpen(false); onNavigate("manuscripts", "Add a manuscript"); }}>
                <BookPlus aria-hidden="true" />
                <span className="sv2-plb">Add a manuscript</span>
              </button>
            </div>
          )}
          {/* The mockup shows ⌘L / ⌘N hints. They are NOT rendered: no shortcut registry exists,
              so a hint would advertise a key that does nothing (standing report flag). */}
          <button type="button" className="sv2-b1" aria-expanded={newOpen} aria-haspopup="menu" onClick={() => setNewOpen((v) => !v)}>
            <Plus aria-hidden="true" />
            New
          </button>
        </div>
        <button type="button" className="sv2-b2" onClick={() => invokeCapture("record", onNavigate)}>
          <Reply aria-hidden="true" />
          Record a response
        </button>
      </div>

      {/* ── THE FOOT — the upsell is FOLDED INTO THE PLAN LINE (panel-foot pack, treatment 1).
          The standalone upgrade row is gone: a persistent sold-looking row in permanent chrome
          is a thing you learn to stop seeing, and the panel foot is already where someone goes
          when they think about their account. The plan is stated as fact; "Upgrade" is a plain
          slate link in that same line. Pro users get the plan and no link. ── */}
      {currentUser && (
        <>
          <div className="sv2-fdiv" aria-hidden="true" />
          {/* Settings is in the panel foot AND stays a rail rib — it has to survive the panel
              collapsing, and the rail is the collapsed state. */}
          <button type="button" className="sv2-frow2" onClick={() => onNavigatePath("/account")}>
            <Settings className="sv2-fi" aria-hidden="true" />
            <span className="sv2-flb">Settings</span>
          </button>
          <button type="button" className="sv2-usr" onClick={() => onNavigatePath("/account")}>
            <span className="sv2-av" aria-hidden="true">{initials}</span>
            <span className="sv2-ub">
              <span className="sv2-un">{currentUser.name}</span>
              <span className="sv2-ur">
                {plan.label}
                {plan.upgrade && (
                  <>
                    {" · "}
                    <span
                      className="sv2-uplink"
                      role="link"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onNavigatePath("/plans"); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onNavigatePath("/plans"); }
                      }}
                    >
                      Upgrade
                    </span>
                  </>
                )}
              </span>
            </span>
            <ChevronRight className="sv2-ucv" aria-hidden="true" />
          </button>
        </>
      )}
    </>
  );
};
