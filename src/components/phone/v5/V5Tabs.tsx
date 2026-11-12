/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A — THE TAB STRIP THAT PINS UNDER THE SLIM BAR (design-refs/phone-app-v5/phone-hub-v5.html
 * `.stabs` and its scroll script). Today (Queries · Agents · Activity) and Materials (Packages · Letters · Versions ·
 * Comps) share it. Below 768px only.
 *
 * The ref's rule, kept exactly: `pin = scrollTop >= strip.offsetTop - barHeight`. The strip's natural place is read from
 * a zero-height mark just above it (a sticky element's own offset moves once it sticks); the bar's height is MEASURED by
 * the slim bar itself (V5MiniBar publishes it here), never a constant. While pinned the slim bar is on and the strip
 * sticks right under it; both stay pinned after a tab switch, because a switch never scrolls above the strip's pinned
 * place and the body below the strip is never shorter than the room under it.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import "./phoneV5.css";

const SCROLL_ID = "app-stage-scroll";
const scrollerEl = (): HTMLElement | null => (typeof document === "undefined" ? null : document.getElementById(SCROLL_ID));

/* ── the one store: the slim bar's measured height, and which page's strip is pinned ── */
let barH = 0;
const pins = new Map<string, boolean>();
const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setBarHeight(h: number): void { if (h > 0 && Math.abs(h - barH) > 0.5) { barH = h; emit(); } }
export const barHeight = (): number => barH;
export function setPinned(page: string, on: boolean): void { if ((pins.get(page) ?? false) !== on) { pins.set(page, on); emit(); } }
export function usePinned(page: string | null): boolean {
  return useSyncExternalStore(subscribe, () => (page ? pins.get(page) ?? false : false), () => false);
}
export const useBarHeight = (): number => useSyncExternalStore(subscribe, barHeight, () => 0);

/** the pure rule (ref): the strip is pinned once its natural top has reached the bar's bottom */
export const pinnedAt = (markTop: number, barBottom: number): boolean => markTop <= barBottom + 0.5;

export interface V5TabStripProps<T extends string> {
  /** the page's name in the store ("today", "materials") — the slim bar reads it */
  page: string;
  tabs: readonly { key: T; label: string }[];
  value: T;
  onPick: (t: T) => void;
  /** the chosen tab's body */
  children: React.ReactNode;
  label: string;
  /** bump to bring the strip to its pinned place (a door that names a tab: "See who's next to query", `/agents`) */
  reveal?: number;
}

export function V5TabStrip<T extends string>({ page, tabs, value, onPick, children, label, reveal = 0 }: V5TabStripProps<T>): React.ReactElement {
  const mark = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const bar = useBarHeight();
  const [stick, setStick] = useState<number | null>(null);
  const [minH, setMinH] = useState<number | null>(null);
  const [pin, setPin] = useState(false);
  const lastY = useRef(0);

  /* where the scroller's top must be for the strip to sit pinned under the bar */
  const pinTop = useCallback((): number | null => {
    const sc = scrollerEl(), m = mark.current;
    if (!sc || !m || !m.getClientRects().length) return null;
    const scTop = sc.getBoundingClientRect().top;
    const s = Math.max(0, barH - scTop);
    return m.getBoundingClientRect().top - scTop + sc.scrollTop - s;
  }, []);

  const read = useCallback(() => {
    const sc = scrollerEl(), m = mark.current;
    if (!sc || !m || !m.getClientRects().length) return; // this page is not on screen
    lastY.current = sc.scrollTop;
    const scTop = sc.getBoundingClientRect().top;
    const s = Math.max(0, barH - scTop);
    setStick((p) => (p === s ? p : s));
    const st = strip.current?.offsetHeight ?? 0;
    const room = Math.max(0, sc.clientHeight - s - st);
    setMinH((p) => (p === room ? p : room));
    const on = barH > 0 && pinnedAt(m.getBoundingClientRect().top, barH);
    setPin((p) => (p === on ? p : on));
    setPinned(page, on);
  }, [page]);

  useEffect(() => {
    let frame = 0, tries = 0;
    let sc = scrollerEl();
    const onScroll = () => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; read(); }); };
    let ro: ResizeObserver | null = null;
    const attach = () => {
      sc = scrollerEl();
      if (!sc) { if (tries++ < 120) frame = requestAnimationFrame(attach); return; }
      frame = 0;
      sc.addEventListener("scroll", onScroll, { passive: true });
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(onScroll);
        ro.observe(sc);
        const root = mark.current?.parentElement;
        if (root) ro.observe(root);
      }
      read();
    };
    attach();
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      sc?.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", onScroll);
      setPinned(page, false);
    };
  }, [read, page]);
  /* the bar measured (or re-measured): read again */
  useEffect(() => { read(); }, [bar, read]);

  /* a switch keeps the strip where it is: past it, the new tab opens at the strip's pinned place; never at the top */
  const was = useRef(value);
  useLayoutEffect(() => {
    if (was.current === value) return;
    was.current = value;
    const sc = scrollerEl(), t = pinTop();
    if (sc && t != null && lastY.current > t) sc.scrollTop = t;
    read();
  }, [value, pinTop, read]);
  /* a door that names a tab brings the strip up to its pinned place, so the tab it opened is what shows */
  useLayoutEffect(() => {
    if (!reveal) return;
    const sc = scrollerEl(), t = pinTop();
    if (sc && t != null) sc.scrollTop = Math.max(0, t);
    read();
  }, [reveal, pinTop, read]);

  return (
    <>
      <div ref={mark} className="pa5-tabs-mark" data-pa5="tabs-mark" aria-hidden="true" />
      <div ref={strip} className={`pa5-tabs${pin ? " pin" : ""}`} data-pa5="tabs" data-page={page} data-pin={pin ? "1" : "0"} role="tablist" aria-label={label}
        style={stick != null ? { top: stick } : undefined}>
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" id={`pa5-${page}-tab-${t.key}`} aria-controls={`pa5-${page}-panel`} aria-selected={t.key === value}
            className={t.key === value ? "on" : ""} data-pa5="tab" data-tab={t.key} onClick={() => { if (t.key !== value) onPick(t.key); }}>
            {t.label}
          </button>
        ))}
      </div>
      <div ref={body} className="pa5-tabbody" id={`pa5-${page}-panel`} role="tabpanel" aria-labelledby={`pa5-${page}-tab-${value}`} data-pa5="tab-body" data-tab={value}
        style={minH != null ? { minHeight: minH } : undefined}>
        {children}
      </div>
    </>
  );
}
