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
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED, so nothing here acts unless `routeActive` — a page that is
 * not on screen must not hold another page's sidebar shut.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { holdSidebarCollapsed } from "./sidebarForce";

export const FULL_PARAM = "full";
/** How long the way out holds the scroll position: the sidebar's own transition, with room. */
const SETTLE_MS = 600;

export interface FullScreenList {
  full: boolean;
  setFull: (on: boolean) => void;
  toggle: () => void;
}

const remembered = (key: string): boolean => {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
};
const remember = (key: string, on: boolean) => {
  try { if (on) localStorage.setItem(key, "1"); else localStorage.removeItem(key); } catch { /* a private window: the URL still carries it */ }
};

export function useFullScreenList(o: { storageKey: string; routeActive: boolean; scroller: () => HTMLElement | null }): FullScreenList {
  const location = useLocation();
  const navigate = useNavigate();
  const full = o.routeActive && new URLSearchParams(location.search).get(FULL_PARAM) === "1";
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
  const arrived = useRef<string | null>(null);
  useEffect(() => {
    if (!o.routeActive) { arrived.current = null; return; }
    if (arrived.current === location.key) return;
    arrived.current = location.key;
    if (!full && remembered(o.storageKey)) go(true, true);
    else if (full) remember(o.storageKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.routeActive, location.key]);

  /* the sidebar is held at its icons for exactly as long as the list is full screen and on screen */
  useEffect(() => (full ? holdSidebarCollapsed() : undefined), [full]);

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

  return { full, setFull, toggle: () => setFull(!full) };
}
