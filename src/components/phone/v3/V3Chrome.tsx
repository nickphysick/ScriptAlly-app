/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE SHELL'S TWO PIECES: the slim navy header and the docked tab bar (ref `.hd`, `#tabs`).
 * Below 768px only: AppShell mounts these in place of PhoneBand and BottomTabBar when `useIsMobile()` says so, and at
 * 768px and up it renders exactly what it did before.
 *
 * ⚠️ WHAT LEFT THE HEADER (baked decision 3): the manuscript chip, the user disc, the feedback icon and the stat-tile
 *    band. A root carries its title, at most one page icon (`extra`) and search; a pushed page carries the back arrow,
 *    its title and, under the header, the page's own key figure (`slot`) where it set one.
 */
import React, { useEffect, useMemo, useState } from "react";
import { V3I } from "./v3Icons";
import { V3_SHRINK_AT, V3_TABS, v3TabFor, type V3Tab } from "../../../lib/phoneV3Nav";
import { useV3TodayCount } from "./useV3";
import "./phoneV3.css";

export interface V3HeaderProps {
  title: string;
  /** a tab's own page (30px title that shrinks) or a pushed page (back arrow, 21px title) */
  root: boolean;
  /** the one page icon before search (Queries: Birds-eye/List; Agents: add; You: Settings) */
  extra?: React.ReactNode;
  /** a pushed page's own key figure, set under the header */
  slot?: React.ReactNode;
  onSearch: () => void;
  onBack: () => void;
  /** the page's scroller: the header shrinks once it has scrolled past 18px */
  scroller: () => HTMLElement | null;
  /** changes on every navigation, so the shrink is re-read against the new page */
  routeKey: string;
}

export const V3Header: React.FC<V3HeaderProps> = ({ title, root, extra, slot, onSearch, onBack, scroller, routeKey }) => {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const el = scroller();
    if (!el) return undefined;
    let frame = 0;
    /* capture: a page that scrolls an inner box is heard too (scroll does not bubble) */
    const read = (e?: Event) => {
      if (frame) return;
      const t = (e?.target as HTMLElement | null) ?? el;
      frame = requestAnimationFrame(() => { frame = 0; setSmall(("scrollTop" in t ? t.scrollTop : el.scrollTop) > V3_SHRINK_AT); });
    };
    setSmall(el.scrollTop > V3_SHRINK_AT);
    el.addEventListener("scroll", read, { passive: true, capture: true });
    return () => { el.removeEventListener("scroll", read, { capture: true } as EventListenerOptions); cancelAnimationFrame(frame); };
  }, [scroller, routeKey]);
  return (
    <>
      <header className={`pa3-hd${root ? "" : " sub"}${root && small ? " sm" : ""}`} data-pa3="header" data-root={root ? "1" : "0"}>
        {root ? null : (
          <button type="button" className="pa3-ib pa3-back" aria-label="Back" data-pa3="back" onClick={onBack}><V3I n="back" /></button>
        )}
        <h1 className="pa3-ht" data-pa3="title">{title}</h1>
        {extra}
        <button type="button" className="pa3-ib pa3-search" aria-label="Search" data-pa3="search" onClick={onSearch}><V3I n="search" /></button>
      </header>
      {!root && slot ? <div className="pa3-pslot" data-pa3="page-slot">{slot}</div> : null}
    </>
  );
};

/** a round icon button for the header's one page icon */
export const V3HeaderIcon: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; pa3?: string; pressed?: boolean }> = ({ label, onClick, children, pa3, pressed }) => (
  <button type="button" className="pa3-ib" aria-label={label} data-pa3={pa3} aria-pressed={pressed} onClick={onClick}>{children}</button>
);

export interface V3TabBarProps {
  pathname: string;
  onGo: (path: string, tab: V3Tab) => void;
  onPlus: () => void;
  plusOpen: boolean;
  /** Today's task count: the badge (none at zero) */
  badge: number;
}

const TAB_ICON: Record<V3Tab, React.ReactNode> = { today: <V3I n="today" />, queries: <V3I n="queries" />, agents: <V3I n="agents" />, you: <V3I n="user" /> };

/** the docked bar: Today · Queries · + · Agents · You, white, a hairline on top, the safe area under it */
export const V3TabBar: React.FC<V3TabBarProps> = ({ pathname, onGo, onPlus, plusOpen, badge }) => {
  const on = v3TabFor(pathname);
  /* the stage clears the bar while it is mounted (phoneV3.css reads the class) */
  useEffect(() => {
    document.body.classList.add("pa3-on");
    return () => document.body.classList.remove("pa3-on");
  }, []);
  const tab = (t: (typeof V3_TABS)[number]) => {
    const active = on === t.key;
    return (
      <button key={t.key} type="button" className={`pa3-tb${active ? " on" : ""}`} data-pa3="tab" data-tab={t.key}
        aria-current={active ? "page" : undefined}
        aria-label={t.key === "today" && badge > 0 ? `Today, ${badge} ${badge === 1 ? "task" : "tasks"}` : t.label}
        onClick={() => onGo(t.path, t.key)}>
        <span className="pa3-tw">{TAB_ICON[t.key]}{t.key === "today" && badge > 0 ? <span className="pa3-bd" data-pa3="badge" aria-hidden="true">{badge}</span> : null}</span>
        {t.label}
      </button>
    );
  };
  return (
    <nav className="pa3-tabs" aria-label="Primary" data-pa3="tabbar">
      {tab(V3_TABS[0])}
      {tab(V3_TABS[1])}
      <button type="button" className="pa3-plus" data-pa3="plus" aria-label={plusOpen ? "Close" : "Log something"}
        aria-haspopup="dialog" aria-expanded={plusOpen} onClick={onPlus}>
        <span><V3I n="plus" /></span>
      </button>
      {tab(V3_TABS[2])}
      {tab(V3_TABS[3])}
    </nav>
  );
};

/** the bar as the shell mounts it: its badge is Today's own task count (one source, `useV3TodayCount`) */
export const V3TabBarHost: React.FC<Omit<V3TabBarProps, "badge"> & { hidden?: boolean }> = ({ hidden, ...p }) => {
  /* a fresh clock on every navigation, so the count is read against the page you are on */
  const now = useMemo(() => Date.now(), [p.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = useV3TodayCount(now);
  if (hidden) return null;
  return <V3TabBar {...p} badge={n} />;
};
