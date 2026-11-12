/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — THE CHROME (design-refs/phone-app-v4/, `.tb`, `.mini`): v3's tab bar and order, which slides away when
 * the page scrolls down past 80px and comes back on any scroll up; past 300px a slim navy bar with the page's name stands
 * in for the header; a pushed page keeps a navy header with its back arrow. Below 768px only.
 *
 * ⚠️ A ROOT PAGE DRAWS ITS OWN HEADER (the navy card with its cast member), so the shell draws none there — only the
 *    slim bar once the page is scrolled.
 */
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribeV3, v3Overlay } from "../v3/v3Store";
import { V3_TABS, v3TabFor, type V3Tab } from "../../../lib/phoneV3Nav";
import { useV3Maybe } from "../v3/V3Provider";
import { I4, IconBtn, type V4IconName } from "./V4Parts";
import "./phoneV4.css";

export const V4_HIDE_AT = 80;
export const V4_MINI_AT = 300;

/** the stage's scroll: how far down, and whether the last move was down */
export function useStageScroll(scroller: () => HTMLElement | null, routeKey: string): { y: number; down: boolean } {
  const [st, setSt] = useState({ y: 0, down: false });
  const last = useRef(0);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    /* the bar can mount before the stage does: look again on the next frame until it exists */
    const el = scroller() ?? document.getElementById("app-stage-scroll");
    if (!el) { if (tries > 120) return undefined; const f = requestAnimationFrame(() => setTries((t) => t + 1)); return () => cancelAnimationFrame(f); }
    let frame = 0;
    last.current = el.scrollTop;
    setSt({ y: el.scrollTop, down: false });
    const read = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = el.scrollTop;
        const down = y > last.current;
        last.current = y;
        setSt((p) => (p.y === y && p.down === down ? p : { y, down }));
      });
    };
    el.addEventListener("scroll", read, { passive: true });
    return () => { el.removeEventListener("scroll", read); cancelAnimationFrame(frame); };
  }, [scroller, routeKey, tries]);
  return st;
}

const TAB_ICON: Record<V3Tab, V4IconName> = { today: "today", queries: "queries", agents: "agents", you: "user" };

export const V4TabBar: React.FC<{
  pathname: string; onGo: (path: string, tab: V3Tab) => void; onPlus: () => void; hidden?: boolean;
  scroller: () => HTMLElement | null;
}> = ({ pathname, onGo, onPlus, hidden, scroller }) => {
  const v = useV3Maybe();
  const o = useSyncExternalStore(subscribeV3, v3Overlay, v3Overlay);
  const { y, down } = useStageScroll(scroller, pathname);
  const on = v3TabFor(pathname);
  useEffect(() => {
    document.body.classList.add("pa4-on", "pa3-on");
    return () => document.body.classList.remove("pa4-on", "pa3-on");
  }, []);
  if (hidden) return null;
  const tucked = down && y > V4_HIDE_AT;
  const badge = v?.ordered.length ?? 0;
  const tab = (t: (typeof V3_TABS)[number]) => {
    const active = on === t.key;
    return (
      <button key={t.key} type="button" className={active ? "on" : ""} data-pa4="tab" data-pa3="tab" data-tab={t.key}
        aria-current={active ? "page" : undefined}
        aria-label={t.key === "today" && badge > 0 ? `Today, ${badge} ${badge === 1 ? "task" : "tasks"}` : t.label}
        onClick={() => onGo(t.path, t.key)}>
        <I4 n={TAB_ICON[t.key]} />{t.label}
      </button>
    );
  };
  return (
    <nav className={`pa4-tb${tucked ? " hide" : ""}`} aria-label="Primary" data-pa4="tabbar" data-pa3="tabbar" data-tucked={tucked ? "1" : "0"}>
      {tab(V3_TABS[0])}
      {tab(V3_TABS[1])}
      <button type="button" className="p" data-pa4="plus" data-pa3="plus" aria-label={o?.type === "plus" ? "Close" : "Log a query"}
        aria-haspopup="dialog" aria-expanded={o?.type === "plus"} onClick={onPlus}>
        <span><I4 n="plus" /></span>
      </button>
      {tab(V3_TABS[2])}
      {tab(V3_TABS[3])}
    </nav>
  );
};

/** past 300px on a root page: the slim navy bar — the tab's name (tap it to go back to the top) and search, nothing else
 *  (Phone app v4.1, baked decision 4) */
export const V4MiniBar: React.FC<{ title: string; pathname: string; scroller: () => HTMLElement | null; onSearch: () => void }> = ({ title, pathname, scroller, onSearch }) => {
  const { y } = useStageScroll(scroller, pathname);
  const on = y > V4_MINI_AT;
  return (
    <div className={`pa4-mini${on ? " on" : ""}`} data-pa4="mini" data-on={on ? "1" : "0"} aria-hidden={on ? undefined : true}>
      <button type="button" className="t" data-pa41="mini-title" tabIndex={on ? 0 : -1}
        onClick={() => scroller()?.scrollTo({ top: 0, behavior: "smooth" })}>{title}</button>
      <IconBtn label="Search" n="search" pa4="mini-search" onClick={onSearch} />
    </div>
  );
};

/** a pushed page's header: back, the page's name, the page's one icon */
export const V4PushedHeader: React.FC<{ title: string; onBack: () => void; extra?: React.ReactNode; slot?: React.ReactNode }> = ({ title, onBack, extra, slot }) => (
  <>
    <header className="pa4-ph" data-pa4="pushed-header" data-pa3="header" data-root="0">
      <IconBtn label="Back" n="back" pa4="back" onClick={onBack} />
      <h1 className="t" data-pa3="title">{title}</h1>
      {extra}
    </header>
    {slot ? <div className="pa3-pslot" data-pa3="page-slot">{slot}</div> : null}
  </>
);

/** a pushed page the layer draws over everything (the task list, everyone on the list): back arrow, name, its own scroll */
export const V4Page: React.FC<{ title: string; onBack: () => void; pa4: string; children: React.ReactNode; foot?: React.ReactNode; extra?: React.ReactNode }> = ({ title, onBack, pa4, children, foot, extra }) => (
  <div className="pa4-page pa4" role="dialog" aria-modal="true" aria-label={title} data-pa4={pa4}>
    <div className="pa4-topbar">
      <IconBtn label="Back" n="back" pa4="back" onClick={onBack} />
      <h1 className="pa4-ph-t" style={{ flex: 1, minWidth: 0, margin: 0, padding: "0 4px" }}><span className="pa4-n">{title}</span></h1>
      {extra}
    </div>
    <div className="pa4-scroll" data-pa4="page-scroll">{children}</div>
    {foot ? <div className="pa4-act" data-pa4="act">{foot}</div> : null}
  </div>
);
