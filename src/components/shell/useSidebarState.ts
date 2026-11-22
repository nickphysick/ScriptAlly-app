/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSidebarState — the desktop sidebar's three states (sidebar rail v1, 5 Nov; ref
 * design-refs/shell/sidebar-rail-v1.js: openFloat · pin · toRail · applyPinned · narrow · migration).
 *
 *   RAIL    the 80px labelled rail. The default.
 *   FLOAT   the full 248px sidebar slid OVER the page. Its layout footprint stays 80px, so the page never
 *           re-lays out; it goes away when a page is picked, the page is clicked, Escape, `[`, its close
 *           button, or a dialog opening.
 *   PINNED  the full sidebar beside the page. Remembered across navigation and sessions.
 *
 * ⚠️ THE STATE IS TWO FACTS AND A DERIVATION. `pinned` is the writer's preference (stored); `floating` is
 * transient. What shows is derived: a page HOLD (sidebarForce: the Query Centre's pinned list, the full-
 * screen lists) shows the rail; a pinned preference shows pinned where there is room (≥1100px wide) and
 * the rail where there is not, keeping the preference; otherwise floating or the rail. A narrow window
 * never forgets the pin — widening restores it.
 *
 * ⚠️ MIGRATION: on the first load of this version, a stored `scriptally:sidebar-collapsed === "0"` (the old
 * expanded sidebar) starts PINNED; anything else starts on the RAIL. The new key then owns the state.
 *
 * The motion (width, margin, the page's glide) is WorkspaceShell's, imperatively on the panel: this hook
 * only says which state is showing and how it got there.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { releaseSidebarHolds, sidebarHeld, sidebarInstant, subscribeSidebarHold } from "./sidebarForce";
import { SIDEBAR_COLLAPSED_KEY, isEditableTarget } from "./useSidebarCollapsed";
import { SHORTCUTS, matchesShortcut } from "../../lib/shortcuts";

export type SidebarMode = "rail" | "float" | "pinned";

/** The new state key: "1" pinned, "0" not. */
export const SIDEBAR_PINNED_KEY = "scriptally:sidebar-pinned";
/** Below this width a pinned sidebar shows as the rail (the preference is kept) and the pin is disabled. */
export const NARROW_QUERY = "(max-width: 1099px)";

/**
 * The stored pin. With no new key yet, the old expanded sidebar ("0" under the collapse key) migrates to
 * pinned and anything else to the rail — and the answer is written, so the new key owns it from now on.
 */
export function readPinned(storage: Pick<Storage, "getItem" | "setItem"> | null): boolean {
  try {
    const v = storage?.getItem(SIDEBAR_PINNED_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    const migrated = storage?.getItem(SIDEBAR_COLLAPSED_KEY) === "0";
    storage?.setItem(SIDEBAR_PINNED_KEY, migrated ? "1" : "0");
    return migrated;
  } catch {
    return false;
  }
}

export function writePinned(storage: Pick<Storage, "setItem"> | null, pinned: boolean): void {
  try { storage?.setItem(SIDEBAR_PINNED_KEY, pinned ? "1" : "0"); } catch { /* private mode: the state is per visit */ }
}

/** What shows, from the two facts and the window. Pure, so it is locked directly. */
export function sidebarMode(o: { pinned: boolean; floating: boolean; narrow: boolean; held: boolean }): SidebarMode {
  if (o.held) return "rail";
  if (o.pinned && !o.narrow) return "pinned";
  if (o.floating) return "float";
  return "rail";
}

const store = (): Storage | null => (typeof localStorage === "undefined" ? null : localStorage);

function subscribeNarrow(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}
const readNarrow = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.(NARROW_QUERY).matches;

export interface SidebarState {
  mode: SidebarMode;
  /** The stored preference — true even while a narrow window shows the rail. */
  pinned: boolean;
  narrow: boolean;
  /** RAIL → FLOAT (releasing a page's hold, as the old toggle did). */
  openFloat: () => void;
  /** FLOAT or PINNED → RAIL. */
  toRail: () => void;
  /** FLOAT → PINNED. Refused where the window is too narrow to pin. */
  pin: () => void;
  /** `[` and the panel icon: RAIL → FLOAT; FLOAT or PINNED → RAIL. */
  toggle: () => void;
  /** Transitions may run (two rAFs after mount, and not during a hold's instant restore). */
  ready: boolean;
}

export function useSidebarState(): SidebarState {
  const [pinned, setPinnedState] = useState<boolean>(() => readPinned(store()));
  const [floating, setFloating] = useState(false);
  const narrow = useSyncExternalStore(subscribeNarrow, readNarrow, () => false);
  const held = useSyncExternalStore(subscribeSidebarHold, sidebarHeld, () => false);
  const instant = useSyncExternalStore(subscribeSidebarHold, sidebarInstant, () => false);
  const mode = sidebarMode({ pinned, floating, narrow, held });

  const setPinned = useCallback((v: boolean) => { setPinnedState(v); writePinned(store(), v); }, []);

  const openFloat = useCallback(() => {
    if (sidebarHeld()) releaseSidebarHolds();
    setFloating(true);
  }, []);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const toRail = useCallback(() => {
    setFloating(false);
    if (modeRef.current === "pinned") setPinned(false);
  }, [setPinned]);
  const pin = useCallback(() => {
    if (readNarrow()) return;
    setPinned(true);
    setFloating(false);
  }, [setPinned]);
  const toggle = useCallback(() => {
    if (modeRef.current === "rail") openFloat();
    else toRail();
  }, [openFloat, toRail]);

  /* a hold arriving while the sidebar floats puts the float away */
  useEffect(() => { if (held) setFloating(false); }, [held]);

  /* `[` (ignored while typing) and ⌘\ toggle — the shortcut the collapse used, unchanged */
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const [chord, bare] = SHORTCUTS.sidebar.chords;
    const onKey = (e: KeyboardEvent) => {
      const hit = matchesShortcut({ ...SHORTCUTS.sidebar, chords: [chord] }, e)
        || (matchesShortcut({ ...SHORTCUTS.sidebar, chords: [bare] }, e) && !isEditableTarget(e.target));
      if (!hit) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    let id2 = 0;
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, []);

  return { mode, pinned, narrow, openFloat, toRail, pin, toggle, ready: ready && !instant };
}
