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
import { assembleBoardColumns, boardFigures } from "../../lib/todoColumns";

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
  /* ⚠️ THE BADGE IS A CONSUMER OF THE ONE DERIVATION (tasks-pages P2, walk fix 1). It was left
     on the member-unit law when P5 moved the page to cards — 42 in the nav beside "fifteen
     cards" on the page, both "correct" in their own unit. It now walks the SAME
     assembleBoardColumns as every Tasks page and shows the SAME figure the subtitle speaks:
     the live columns' cards. */
  const todoTotal = useMemo(() => {
    const now = Date.now();
    const { cols } = assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now, today: localYMD(now), mutedTaskRules: currentUser?.mutedTaskRules,
    });
    return boardFigures(cols).cards;
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

/* ⚠️ ShellSidebarBody IS GONE (sweep, 6 Aug 2026, −241 lines).
 *
 * It was the CAPSULE shell's accordion panel. The shell rebuild replaced that whole surface with
 * WorkspaceShell, whose IA arrives as a prop from workspaceSections() — and from that moment
 * nothing rendered this component. It survived the claude-il merge only because the merge's job
 * was to reconcile two lines, not to sweep either of them, and it was flagged there for exactly
 * this pass.
 *
 * What is NOT gone, and why this file remains: ShellScope (the manuscript scope control, seated
 * in the top bar) and useShellNavCounts (the badge figure, read by the rail and the panel). Both
 * are live. The accordion went; its two neighbours did not.
 */
