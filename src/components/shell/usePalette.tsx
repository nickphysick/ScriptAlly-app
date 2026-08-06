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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { buildCorpus, rankItems } from "../../lib/searchPalette";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { SearchPalette } from "./SearchPalette";

export interface UsePaletteInput {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath: (path: string) => void;
  setSearchQuery: (v: string) => void;
}

export interface PaletteHandle {
  openPalette: () => void;
  searchOpenerRef: React.RefObject<HTMLButtonElement | null>;
  /** Render this somewhere above the page tree. One instance serves every route. */
  palette: React.ReactElement;
}

export function usePalette({ onNavigate, onNavigatePath, setSearchQuery }: UsePaletteInput): PaletteHandle {
  const { pathname } = useLocation();
  const { agents, queries, manuscripts } = useScriptAllyDb();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const searchOpenerRef = useRef<HTMLButtonElement>(null);
  const openPalette = useCallback(() => { setTerm(""); setOpen(true); }, []);

  /* THE CORPUS — built from already-loaded state (DbProvider subscribes on every route), so the
     palette never fetches and has no loading state. Rebuilt when the data changes, not per
     keystroke; the ranking is the cheap part. */
  const corpus = useMemo(
    () => buildCorpus({
      agents, queries, manuscripts, now: Date.now(),
      agentLabel: (a) => ({ primary: agentPrimary(a), secondary: agentSecondary(a) }),
    }),
    [agents, queries, manuscripts],
  );
  const items = useMemo(() => rankItems(corpus, term), [corpus, term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) return;
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
      items={items}
      setSearchQuery={setSearchQuery}
      openerRef={searchOpenerRef}
      term={term}
      setTerm={setTerm}
    />
  );

  return { openPalette, searchOpenerRef, palette };
}
