/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellSidebar — the v2 sidebar's contents below the masthead (Phase 3 of the shell rollout;
 * ref design-refs/scriptally-shell-v2.html), rendered into ShellSide's children slot:
 *
 *   Pages nav (section-scoped, parchment-highlight active state ONLY — no burgundy, ever)
 *   → partition → manuscript "paper deck" switcher (persists the shared
 *   scriptally_active_manuscript_id key) → Tasks & reminders contents-ledger (counts by the
 *   To-do board's own selectors; zero rows hidden) → 2×2 action tiles (the existing capture
 *   contracts — no new forms) → flexible spacer → Pro line (pack option A, session dismiss)
 *   → user block (Form 11 avatar chip + task-settings / help icon buttons).
 *
 * All derivations live in lib/shellSidebar.ts (pure, unit-locked). The action tiles carry no
 * keyboard hints yet — the mockup's ⌘L/⌘R/⌘⇧A/⌘⇧M chords don't exist in the app (and ⌘L is
 * browser-owned), so hints would lie; flagged in the rollout report rather than faked.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Send, Reply, UserPlus, BookPlus, Plus, ChevronsUpDown, SlidersHorizontal, HelpCircle,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import { invokeCapture } from "./railNav";
import { SHELL_SECTIONS, shellPageForPath } from "./shellV2Nav";
import {
  LEDGER_EMPTY_NOTE, SHELL_PRO_COPY, ledgerRows, manuscriptInitials, manuscriptSubtitle,
  resolveActiveManuscript, sideNavCounts, sidebarBoardTiles,
} from "../../lib/shellSidebar";

/** The shared active-manuscript key (the Package Workshop / Comps / Manuscripts convention). */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const ShellSidebarBody: React.FC<{
  /** The legacy navigate bridge — the capture interceptions (Log query etc.) run through it. */
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Router-direct path navigation (clears the global search) — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
}> = ({ onNavigate, onNavigatePath }) => {
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
  const rows = ledgerRows(tiles);
  const total = tiles.urgent + tiles.housekeeping + tiles.notes;
  const counts = sideNavCounts({ queries, agents, manuscripts, packages, todoTotal: total });
  const hit = shellPageForPath(pathname);
  const section = hit?.section ?? SHELL_SECTIONS[0];

  // ── manuscript switcher ──
  const [storedMsId, setStoredMsId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  });
  const activeMs = resolveActiveManuscript(manuscripts, storedMsId);
  const pickManuscript = (id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* private mode */ }
    setStoredMsId(id);
    setMsOpen(false);
  };
  const [msOpen, setMsOpen] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
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

  // ── Pro line (session-only dismiss; hidden for Pro) ──
  const [proHidden, setProHidden] = useState(false);
  const showPro = !!currentUser && currentUser.plan !== UserPlan.PRO && !proHidden;

  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const openTaskSettings = () => {
    // The sheet lives in the (always-mounted) To-do page — same event pattern as the tour replay.
    window.dispatchEvent(new CustomEvent("sa:open-task-settings"));
    onNavigatePath("/todo");
  };

  return (
    <>
      {/* ── Pages (section-scoped) ── */}
      <div className="sv2-seclabel sv2-first">Pages</div>
      <div className="sv2-nav">
        {section.pages.map((page) => {
          const on = hit?.page.key === page.key;
          const count = counts[page.key];
          return (
            <button
              key={page.key}
              type="button"
              className={on ? "sv2-navbtn on" : "sv2-navbtn"}
              aria-current={on ? "page" : undefined}
              onClick={() => onNavigatePath(page.path)}
            >
              <span className="sv2-navlbl">{page.label}</span>
              {count !== undefined && <span className="sv2-navcnt">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="sv2-partition" />

      {/* ── Manuscript switcher — the paper deck ── */}
      {activeMs ? (
        <div className="sv2-msdeck" ref={deckRef}>
          <button
            type="button"
            className="sv2-ms"
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
        <button type="button" className="sv2-ms sv2-msdeck" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
          <span className="sv2-mstile" aria-hidden="true">+</span>
          <span className="sv2-mstxt">
            <span className="sv2-mst1">Add a manuscript</span>
            <span className="sv2-mst2">Your book goes here</span>
          </span>
        </button>
      )}

      {/* ── Tasks & reminders — the contents ledger ── */}
      <div className="sv2-desk">
        <div className="sv2-dh">
          <span className="sv2-dt">Tasks &amp; reminders</span>
          {rows.length > 0 && <span className="sv2-dv">{total}</span>}
        </div>
        {rows.map((row) => (
          <button key={row.key} type="button" className="sv2-drow" onClick={() => onNavigatePath("/todo")}>
            <i className={`sv2-pip sv2-pip-${row.key}`} aria-hidden="true" />
            <span className="sv2-dn">{row.label}</span>
            <span className="sv2-ldr" aria-hidden="true" />
            <span className="sv2-dc">{row.count}</span>
          </button>
        ))}
        {rows.length === 0 && <div className="sv2-emptynote">{LEDGER_EMPTY_NOTE}</div>}
      </div>

      {/* ── Actions — existing capture contracts, no new forms ── */}
      <div className="sv2-seclabel">Actions</div>
      <div className="sv2-acts">
        <button type="button" className="sv2-act" onClick={() => invokeCapture("query", onNavigate)}>
          <Send aria-hidden="true" /><span className="sv2-actlb">Log query</span>
        </button>
        <button type="button" className="sv2-act" onClick={() => invokeCapture("record", onNavigate)}>
          <Reply aria-hidden="true" /><span className="sv2-actlb">Record response</span>
        </button>
        <button type="button" className="sv2-act" onClick={() => invokeCapture("agent", onNavigate)}>
          <UserPlus aria-hidden="true" /><span className="sv2-actlb">Add agent</span>
        </button>
        <button type="button" className="sv2-act" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
          <BookPlus aria-hidden="true" /><span className="sv2-actlb">Add manuscript</span>
        </button>
      </div>

      <div className="sv2-air" />

      {/* ── Pro line — one row, no card, no meter ── */}
      {showPro && (
        <div className="sv2-pro" role="button" tabIndex={0}
          onClick={() => onNavigatePath("/plans")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigatePath("/plans"); }}>
          <i className="sv2-prodot" aria-hidden="true" />
          <span className="sv2-protxt">{SHELL_PRO_COPY}</span>
          <span className="sv2-proarrow" aria-hidden="true">›</span>
          <button
            type="button"
            className="sv2-prox"
            title="Dismiss"
            aria-label="Dismiss"
            onClick={(e) => { e.stopPropagation(); setProHidden(true); }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── User block ── */}
      {currentUser && (
        <div className="sv2-userblk">
          <span className="sv2-av" aria-hidden="true">{initials}</span>
          <span className="sv2-ub">
            <span className="sv2-un">{currentUser.name}</span>
            <span className="sv2-ur">{currentUser.plan === UserPlan.PRO ? "Pro plan" : "Free plan"}</span>
          </span>
          <button type="button" className="sv2-iconbtn" title="Task settings" aria-label="Task settings" onClick={openTaskSettings}>
            <SlidersHorizontal aria-hidden="true" />
          </button>
          <button type="button" className="sv2-iconbtn" title="Help centre" aria-label="Help centre" onClick={() => onNavigatePath("/help")}>
            <HelpCircle aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
};
