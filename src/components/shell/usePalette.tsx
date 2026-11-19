/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * usePalette — the command palette's hosting, extracted so BOTH shells mount the same one
 * (shell-rebuild pack, Phase 5).
 *
 * ⚠️ IT WAS INSIDE AppShell, which meant the top-nav shell had no palette at all: on /dashboard
 * the search pill opened nothing and ⌘K did nothing. Copying the block into the second shell
 * would have registered ⌘K twice — two listeners, both calling preventDefault, on the app's one
 * universal shortcut. A hook is what makes "exactly one implementation" survive two hosts.
 *
 * ⚠️ ⌘K IS STILL REGISTERED ONCE PER MOUNTED SHELL, and the shells are mutually exclusive by
 * route (lib/shellForRoute), so exactly one listener is ever live. That is a property of the
 * routing, not of this file — if both shells ever render together, this is where the double
 * registration will come from.
 */
import { SHORTCUTS, matchesShortcut } from "../../lib/shortcuts";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { buildCorpus } from "../../lib/searchPalette";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { SearchPalette } from "./SearchPalette";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { corpusSources } from "../../lib/searchSources";
import { quietWeeksOf } from "../../lib/queryState";
import { HELP_ARTICLE_LIST } from "../../content/help/articles";
import { articleText } from "../../content/help/model";

/** Recently opened, on THIS DEVICE ONLY (search v1): five ids, newest first, no repeats. Nothing goes to Firestore. */
export const RECENTS_KEY = (uid: string) => `qh.search.recents.${uid}`;
export const RECENTS_KEPT = 5;
export function readRecents(uid: string | undefined): string[] {
  if (!uid) return [];
  try {
    const v = JSON.parse(localStorage.getItem(RECENTS_KEY(uid)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENTS_KEPT) : [];
  } catch { return []; }
}
export function pushRecent(list: readonly string[], id: string): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, RECENTS_KEPT);
}

/** The written help articles as search reads them — title, lede and plain text, no Help Centre page code. */
const HELP_SOURCE = HELP_ARTICLE_LIST.map((a) => ({ slug: a.slug, title: a.title, lede: a.lede, body: articleText(a) }));

/** The workspace's active manuscript id — the same key the shell's selector writes. */
const readActiveMs = (): string | null => {
  try { return typeof window === "undefined" ? null : localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; }
};

export interface UsePaletteInput {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  onNavigatePath: (path: string) => void;
  /**
   * The sidebar's own icon for a page path (follow-up 2, §3): a Go-to row shows the SAME mark its
   * sidebar row does, never a generic grid. The host owns the icon map; null means "not a sidebar page".
   */
  pageIcon?: (path: string) => React.ReactNode | null;
  /** ⚠️ UNREAD since search v1: an agent row opens the agent's card, and the Agents hand-off was left out (the
   *  Contact list reads its filter only when it first mounts). Kept on the input so the hosts need not change. */
  setSearchQuery?: (v: string) => void;
}

export interface PaletteHandle {
  openPalette: () => void;
  searchOpenerRef: React.RefObject<HTMLButtonElement | null>;
  /** Attach to the DESKTOP search pill — see SearchPalette on why both exist. */
  desktopSearchRef: React.RefObject<HTMLButtonElement | null>;
  /** Render this somewhere above the page tree. One instance serves every route. */
  palette: React.ReactElement;
}

export function usePalette({ onNavigate, onNavigatePath, pageIcon }: UsePaletteInput): PaletteHandle {
  const { pathname } = useLocation();
  const db = useScriptAllyDb();
  const { agents, queries, manuscripts } = db;

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const searchOpenerRef = useRef<HTMLButtonElement>(null);
  const desktopSearchRef = useRef<HTMLButtonElement>(null);
  const openPalette = useCallback(() => { setTerm(""); setOpen(true); }, []);
  const uid = db.currentUser?.id;
  const [recents, setRecents] = useState<string[]>([]);
  /* read on opening, so another tab's opens are seen; a record that no longer exists is skipped by the search core */
  useEffect(() => { if (open) setRecents(readRecents(uid)); }, [open, uid]);
  const onOpened = useCallback((id: string) => {
    if (!uid) return;
    const next = pushRecent(readRecents(uid), id);
    setRecents(next);
    try { localStorage.setItem(RECENTS_KEY(uid), JSON.stringify(next)); } catch { /* private mode: this device keeps none */ }
  }, [uid]);

  /* THE CORPUS — built from already-loaded state (DbProvider subscribes on every route), so the
     palette never fetches and has no loading state. Rebuilt when the data changes, not per
     keystroke; the ranking is the cheap part. */
  /* ⚠️ BUILT ONLY WHILE OPEN: the task chain is the To-do board's whole assembly, so it is not run on every write while
     the palette is shut. Opening rebuilds it from the state as it is. */
  const corpus = useMemo(() => {
    if (!open) return [];
    const now = Date.now();
    const activeMs = resolveScopedManuscript(manuscripts, readActiveMs()) ?? null;
    return buildCorpus({
      agents, queries,
      agentLabel: (a) => ({ primary: agentPrimary(a), secondary: agentSecondary(a) }),
      activeManuscriptTitle: activeMs?.title,
      ...corpusSources({
        tasks: db.tasks, userTasks: db.userTasks, queries, agents, manuscripts, taskFlags: db.taskFlags,
        activities: db.activities, packages: db.packages, versions: db.versions, mutedTaskRules: db.currentUser?.mutedTaskRules,
      }, { now, quietWeeks: quietWeeksOf(db.currentUser), activeMs, help: HELP_SOURCE }),
    });
  }, [open, agents, queries, manuscripts, db.tasks, db.userTasks, db.taskFlags, db.activities, db.packages, db.versions, db.currentUser]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* the key is the registry's (lib/shortcuts.ts) — the sheet lists what this reads */
      if (!matchesShortcut(SHORTCUTS.search, e)) return;
      // ⌘K WORKS FROM ANYWHERE, INCLUDING INSIDE A TEXT FIELD — deliberately no editable-target
      // guard. It is the one shortcut that should never be swallowed by whatever has focus.
      e.preventDefault();
      // Baked 20 — it TOGGLES. Pressing it again with the palette open closes it, which is what
      // every palette does and what the hand expects when the shortcut is a switch.
      setOpen((v) => {
        if (v) return false;
        setTerm("");
        return true;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The palette is a doorway, not a place: any navigation closes it.
  useEffect(() => { setOpen(false); }, [pathname]);

  const palette = (
    <SearchPalette
      open={open}
      onClose={() => setOpen(false)}
      onNavigate={onNavigate}
      onNavigatePath={onNavigatePath}
      corpus={corpus}
      recents={recents}
      onOpened={onOpened}
      openerRef={searchOpenerRef}
      desktopOpenerRef={desktopSearchRef}
      term={term}
      setTerm={setTerm}
      pageIcon={pageIcon}
      activeManuscriptTitle={open ? resolveScopedManuscript(manuscripts, readActiveMs())?.title : undefined}
    />
  );

  return { openPalette, searchOpenerRef, desktopSearchRef, palette };
}
