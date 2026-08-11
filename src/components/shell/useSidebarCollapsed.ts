/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSidebarCollapsed — the workspace sidebar's collapsed-to-rail state (sidebar-collapse pack;
 * ref design-refs/sidebar-collapse-v1.html).
 *
 * ⚠️ THIS IS THE SECOND COLLAPSE THE SHELL HAS OWNED, AND THE FIRST WAS A GHOST. AppShell carried
 * the sv2 tuck machinery (`panelCollapsed`, `sa.shellSideTucked`, a ⌘\ binding) whose only styled
 * element was deleted by the app-shell-v2 rebuild — it was swept in the commit before this hook
 * landed, which is what freed ⌘\ for the successor. The old key is deliberately NOT migrated:
 * its collapse-on-navigate wrote "1" on every route change for two weeks, so its stored value
 * says "collapsed" for everyone regardless of choice.
 *
 * ⚠️ THE KEY DIVERGES FROM THE HOUSE `sa.` PREFIX by the pack's explicit instruction — the pack
 * names `scriptally:sidebar-collapsed` verbatim, and a stated name beats a convention.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const SIDEBAR_COLLAPSED_KEY = "scriptally:sidebar-collapsed";

/** Storage read, tolerant of private mode. Pure over an injected storage so node tests can run it. */
export function readSidebarCollapsed(storage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return storage?.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(storage: Pick<Storage, "setItem"> | null, collapsed: boolean): void {
  try {
    storage?.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode — the state simply does not persist */
  }
}

/** A bare-letter shortcut must never fire while the user is typing. */
export function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || !!el.isContentEditable;
}

/**
 * The keyboard grammar, pure so it is testable in the node environment:
 *   · ⌘\ / Ctrl+\ — always (a chord cannot be typed into a field by accident);
 *   · bare `[`   — only outside editables, with no modifier held.
 * Recon note: `[` was bound nowhere; ⌘\ was bound to the swept ghost and is claimed by its
 * successor rather than shared with it.
 */
export function sidebarShortcut(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}): "toggle" | null {
  if ((e.metaKey || e.ctrlKey) && e.key === "\\") return "toggle";
  if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditableTarget(e.target)) return "toggle";
  return null;
}

export interface SidebarCollapsedState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  /**
   * False for the first paint, true one frame later — the width transition is gated on this.
   * ⚠️ WITHOUT IT, RESTORING A COLLAPSED SIDEBAR ANIMATES SHUT ON EVERY LOAD: the state is read
   * synchronously (below), but a transition declared unconditionally still runs from the
   * stylesheet's 264px the moment layout settles. Two rAFs, not one — the first can land inside
   * the same frame as hydration and the class would arrive with the initial style pass.
   */
  ready: boolean;
}

export function useSidebarCollapsed(): SidebarCollapsedState {
  /* ⚠️ READ SYNCHRONOUSLY IN THE INITIALISER, never in an effect — an effect-based read renders
     expanded first and snaps shut after paint on every load of a collapsed sidebar. */
  const [collapsed, setCollapsedState] = useState<boolean>(() =>
    readSidebarCollapsed(typeof localStorage === "undefined" ? null : localStorage),
  );
  const [ready, setReady] = useState(false);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    writeSidebarCollapsed(typeof localStorage === "undefined" ? null : localStorage, v);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      writeSidebarCollapsed(typeof localStorage === "undefined" ? null : localStorage, next);
      return next;
    });
  }, []);

  /* The latest toggle in a ref so the one window listener never re-binds. */
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sidebarShortcut(e) !== "toggle") return;
      // The chord gets preventDefault (some browsers own ⌘\); the bare letter must not — a
      // prevented `[` would also swallow it from any future in-page use.
      if (e.metaKey || e.ctrlKey) e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, []);

  return { collapsed, toggle, setCollapsed, ready };
}
