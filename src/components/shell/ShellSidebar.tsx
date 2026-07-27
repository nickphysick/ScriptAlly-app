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
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import { invokeCapture } from "./railNav";
import { SHELL_DASHBOARD, SHELL_SECTIONS, shellPageForPath } from "./shellV2Nav";
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
  /** Rail-driven browsing (rail-section-select pack): steer the accordion to this section
   *  (null = open none); `n` bumps so repeat clicks on the same section re-fire. */
  browse?: { sec: "querying" | "agents" | "shelf" | null; n: number } | null;
  /** ANY collapse snaps the accordion back to the current page's section (never drifts). */
  collapsed?: boolean;
}> = ({ onNavigate, onNavigatePath, browse, collapsed = false }) => {
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

  // ── accordion — one section open at a time, following the route ──
  const routeSection = hit?.section?.key ?? null;
  const [openSec, setOpenSec] = useState<string | null>(routeSection ?? "querying");
  useEffect(() => {
    if (routeSection) setOpenSec(routeSection);
  }, [routeSection]);
  // Rail-driven browsing steers the accordion (rail-section-select pack)…
  useEffect(() => {
    if (browse) setOpenSec(browse.sec);
  }, [browse]);
  // …and ANY collapse snaps it back to the section containing the current page, so the panel
  // never drifts from the user's actual location (abandoned browses included).
  useEffect(() => {
    if (collapsed) setOpenSec(routeSection ?? null);
  }, [collapsed, routeSection]);

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
          const open = openSec === section.key;
          return (
            <React.Fragment key={section.key}>
              <button
                type="button"
                className={`sv2-asec${open ? " open" : ""}`}
                aria-expanded={open}
                onClick={() => setOpenSec(open ? null : section.key)}
              >
                <Icon className="sv2-ai" aria-hidden="true" />
                <span className="sv2-albl">{section.label}</span>
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
                      {count !== undefined && <span className="sv2-akct">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sv2-half" />

      {/* ── Manuscript row — bare (no card) ── */}
      {activeMs ? (
        <div className="sv2-mswrap" ref={deckRef}>
          <button
            type="button"
            className="sv2-ms2"
            onClick={() => setMsOpen((v) => !v)}
            aria-expanded={msOpen}
            aria-haspopup="listbox"
          >
            <span className="sv2-mstile" aria-hidden="true">{manuscriptInitials(activeMs.title)}</span>
            <span className="sv2-mstxt">
              <span className="sv2-mst1">{activeMs.title}</span>
              <span className="sv2-mst2">{manuscriptSubtitle(activeMs, msQueries(activeMs.id))}</span>
            </span>
            <span className="sv2-mschev" aria-hidden="true"><ChevronsUpDown /></span>
          </button>
          {msOpen && (
            <div className="sv2-mspop" role="listbox" aria-label="Manuscripts">
              {manuscripts.map((m) => (
                <div
                  key={m.id}
                  role="option"
                  aria-selected={m.id === activeMs.id}
                  className="sv2-msrow"
                  onClick={() => pickManuscript(m.id)}
                >
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
        <button type="button" className="sv2-ms2" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
          <span className="sv2-mstile" aria-hidden="true">+</span>
          <span className="sv2-mstxt">
            <span className="sv2-mst1">Add a manuscript</span>
            <span className="sv2-mst2">Your book goes here</span>
          </span>
        </button>
      )}

      {/* ── Task pills — Urgent / House ── */}
      <div className="sv2-pills">
        {pills.map((pill) => (
          <button key={pill.key} type="button" className="sv2-tpill" onClick={() => onNavigatePath("/todo")}>
            <i className={`sv2-pip sv2-pip-${pill.key}`} aria-hidden="true" />
            <span className="sv2-tn">{pill.count}</span>
            <span className="sv2-tl">{pill.label}</span>
          </button>
        ))}
      </div>

      {/* ── Action strip — the existing capture contracts; blue is reserved for Pro ── */}
      <div className="sv2-strip4">
        <button type="button" className="sv2-gt sv2-gt1" title="Log query" aria-label="Log query" onClick={() => invokeCapture("query", onNavigate)}>
          <Send aria-hidden="true" />
        </button>
        <button type="button" className="sv2-gt sv2-gt2" title="Record response" aria-label="Record response" onClick={() => invokeCapture("record", onNavigate)}>
          <Reply aria-hidden="true" />
        </button>
        <button type="button" className="sv2-gt sv2-gt3" title="Add agent" aria-label="Add agent" onClick={() => invokeCapture("agent", onNavigate)}>
          <UserPlus aria-hidden="true" />
        </button>
        <button type="button" className="sv2-gt sv2-gt3" title="Add manuscript" aria-label="Add manuscript" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
          <BookPlus aria-hidden="true" />
        </button>
      </div>
      <div className="sv2-gcap" aria-hidden="true">Log · Respond · Agent · Manuscript</div>

      {/* ── Upgrade row — slate is Pro's colour; hover never goes burgundy ── */}
      {showUpgrade && (
        <button type="button" className="sv2-upg" onClick={() => onNavigatePath("/plans")}>
          <span className="sv2-propill">PRO</span>
          <span className="sv2-upgt">{SHELL_PRO_COPY}</span>
          <ChevronRight className="sv2-upgchev" aria-hidden="true" />
        </button>
      )}

      {/* ── User block ── */}
      {currentUser && (
        <div className="sv2-usr">
          <span className="sv2-av" aria-hidden="true">{initials}</span>
          <span className="sv2-ub">
            <span className="sv2-un">{currentUser.name}</span>
            <span className="sv2-ur">{currentUser.plan === UserPlan.PRO ? "Pro plan" : "Free plan"}</span>
          </span>
        </div>
      )}
    </>
  );
};
