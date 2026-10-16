/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A list that can take over the content area (Comparable titles v25, Part F). Shared, so the Contact
 * list can adopt it: the page supplies its storage key, whether its route is on screen and its
 * scroller, and hides its own sections off the `full` flag.
 *
 * What the hook owns:
 *   - the URL is the state (`?full=1`), so Back and a shared link respect it; entering pushes,
 *     leaving replaces;
 *   - the device remembers it (`localStorage[storageKey]`): arriving with no parameter and a
 *     remembered "1" puts the parameter back;
 *   - the shell's sidebar is HELD at its icons while it is on (`sidebarForce`), and is whatever the
 *     writer left it the moment it is off — nothing is written, so nothing needs restoring;
 *   - the scroll position you left from is put back on the way out;
 *   - Escape leaves it LAST (`ESC_LEVEL.pageMode`), after every popover, drawer and dialog.
 *
 * v138.6 §A — THE PIN. The Query Centre and the Contact list share this one hook through `usePinList(page)`: their
 * state is remembered per page (`PIN_KEYS`), restored on the FIRST frame (no sidebar transition, no header flash),
 * and the hook owns their F key. Comparable titles still calls `useFullScreenList` directly, unchanged.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED, so nothing here acts unless `routeActive` — a page that is
 * not on screen must not hold another page's sidebar shut.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ESC_LEVEL, escapeDepth, useEscapeLayer } from "../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut, type Shortcut } from "../../lib/shortcuts";
import { holdSidebarCollapsed } from "./sidebarForce";

export const FULL_PARAM = "full";
/** How long the way out holds the scroll position: the sidebar's own transition, with room. */
const SETTLE_MS = 600;

export interface FullScreenList {
  full: boolean;
  setFull: (on: boolean) => void;
  toggle: () => void;
}

/** v138.6 — the two pinnable lists, and where each remembers its pin (localStorage, per device) */
export type PinPage = "queries" | "agents";
export const PIN_KEYS: Record<PinPage, string> = { queries: "sa.pinList.queries", agents: "sa.pinList.agents" };
/** the Contact list's v16 key, read once so a list pinned before v138.6 stays pinned */
const LEGACY_PIN_KEYS: Partial<Record<PinPage, string>> = { agents: "sa.contactsFull" };
/** each page's F, as the shortcut sheet lists it (one entry per page's scope; this one hook binds both) */
const PIN_SHORTCUT = { queries: SHORTCUTS.qcPin, agents: SHORTCUTS.contactsFull } as const;

const remembered = (key: string): boolean => {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
};
const remember = (key: string, on: boolean) => {
  try { if (on) localStorage.setItem(key, "1"); else localStorage.removeItem(key); } catch { /* a private window: the URL still carries it */ }
};

/** v138.6 — the pin for a list page: `useFullScreenList` on that page's key, restored on the first frame, with F */
export function usePinList(page: PinPage, o: { routeActive: boolean; scroller: () => HTMLElement | null }): FullScreenList {
  return useFullScreenList({ storageKey: PIN_KEYS[page], legacyKey: LEGACY_PIN_KEYS[page], routeActive: o.routeActive, scroller: o.scroller, pin: PIN_SHORTCUT[page] });
}

export function useFullScreenList(o: {
  storageKey: string; routeActive: boolean; scroller: () => HTMLElement | null;
  /** v138.6 — a pin (its shortcut's id): restored on the first frame and owning that key (the two list pages; not
      Comparable titles) */
  pin?: Shortcut;
  /** a key the state was stored under before (read when `storageKey` has nothing) */
  legacyKey?: string;
}): FullScreenList {
  const location = useLocation();
  const navigate = useNavigate();
  /* ⚠️ A PIN IS RESTORED ON THE FIRST FRAME: on arriving with no parameter, a remembered pin counts as on at once,
     before the effect below puts the parameter back. Read through an effect alone, the page painted unpinned (its
     header, an open sidebar) and then pinned, which is a flash and an animation the reader did not ask for. */
  const arrivedKey = useRef<string | null>(null);
  const pendingRestore = !!o.pin && o.routeActive && arrivedKey.current !== location.key;
  if (o.pin && o.legacyKey && typeof localStorage !== "undefined") {
    try { if (localStorage.getItem(o.storageKey) === null && localStorage.getItem(o.legacyKey) === "1") { localStorage.setItem(o.storageKey, "1"); localStorage.removeItem(o.legacyKey); } } catch { /* */ }
  }
  const param = new URLSearchParams(location.search).get(FULL_PARAM) === "1";
  const full = o.routeActive && (param || (pendingRestore && remembered(o.storageKey)));
  const restoring = useRef(false);
  const back = useRef(0);
  const scroller = useRef(o.scroller);
  scroller.current = o.scroller;

  const go = useCallback((on: boolean, replace: boolean) => {
    const q = new URLSearchParams(location.search);
    if (on) q.set(FULL_PARAM, "1"); else q.delete(FULL_PARAM);
    const search = q.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace });
  }, [location.pathname, location.search, navigate]);

  const setFull = useCallback((on: boolean) => {
    if (!o.routeActive || on === full) return;
    if (on) back.current = scroller.current()?.scrollTop ?? 0;
    remember(o.storageKey, on);
    go(on, !on);
  }, [full, go, o.routeActive, o.storageKey]);

  /* the device remembers: arriving on the route with no parameter puts it back (once per arrival) */
  useEffect(() => {
    if (!o.routeActive) { arrivedKey.current = null; return; }
    if (arrivedKey.current === location.key) return;
    arrivedKey.current = location.key;
    if (!param && remembered(o.storageKey)) { restoring.current = true; go(true, true); }
    else if (param) remember(o.storageKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.routeActive, location.key]);

  /* the sidebar is held at its icons for exactly as long as the list is full screen and on screen. A pin holds it
     in a LAYOUT effect, before the first paint, and a restored pin with no transition. */
  const firstHold = useRef(true);
  useLayoutEffect(() => {
    if (!o.pin || !full) return undefined;
    const instant = firstHold.current && (pendingRestore || restoring.current);
    firstHold.current = false;
    restoring.current = false;
    return holdSidebarCollapsed({ instant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, o.pin]);
  useEffect(() => (!o.pin && full ? holdSidebarCollapsed() : undefined), [full, o.pin]);

  /* in: to the top. out: back to where you left from. A layout effect, so neither is painted wrong. */
  const was = useRef(full);
  useLayoutEffect(() => {
    if (was.current === full) return;
    was.current = full;
    const el = scroller.current();
    if (!el) return;
    if (full) { el.scrollTop = 0; return; }
    const y = back.current;
    el.scrollTop = y;
    /* ⚠️ THE PAGE IS STILL MOVING: the sidebar opens over ~0.24s, the sheet narrows with it, and the
       sections that were hidden re-wrap at each width on the way — so a position set once lands
       somewhere else (measured: 34px out at a 1280 window). Hold it until the layout has settled,
       and let go at once if the reader scrolls for themselves. */
    let id = 0;
    const until = performance.now() + SETTLE_MS;
    const stop = () => { cancelAnimationFrame(id); off(); };
    const off = () => { for (const t of ["wheel", "touchstart", "pointerdown", "keydown"] as const) window.removeEventListener(t, stop, true); };
    const tick = () => {
      if (el.scrollTop !== y) el.scrollTop = y;
      if (performance.now() < until) id = requestAnimationFrame(tick); else off();
    };
    for (const t of ["wheel", "touchstart", "pointerdown", "keydown"] as const) window.addEventListener(t, stop, true);
    id = requestAnimationFrame(tick);
    return stop;
  }, [full]);

  useEscapeLayer(full, () => setFull(false), ESC_LEVEL.pageMode);

  /* v138.6 §A — F toggles a pin: not in a field, not with a modifier held, and not while anything is open (the query
     drawer, or any layer on the escape stack beyond the pin's own) */
  const keyState = useRef({ full, setFull, on: o.routeActive && !!o.pin, id: o.pin });
  keyState.current = { full, setFull, on: o.routeActive && !!o.pin, id: o.pin };
  useEffect(() => {
    if (!o.pin) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const k = keyState.current;
      if (!k.on || !k.id || !matchesShortcut(k.id, e)) return;
      if (e.shiftKey || isEditableTarget(e.target)) return;
      if (document.querySelector(".qad-root.is-open") || escapeDepth() > (k.full ? 1 : 0)) return;
      e.preventDefault();
      k.setFull(!k.full);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [o.pin]);

  return { full, setFull, toggle: () => setFull(!full) };
}
