/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A — THE DOCK AND THE SLIM BAR (design-refs/phone-app-v5/phone-hub-v5.html `dock(on, badge)`,
 * `miniBar`). They replace v4's V4TabBar and V4MiniBar. Below 768px only.
 *
 *   - The dock: Today · To do · + · Materials · Profile, with the ref's icons. It tucks away on a scroll down past 80px
 *     and comes back on any scroll up (v4's behaviour, kept). The badge sits on To do and counts To do's tasks —
 *     `useV3().ordered`, the same array Today's need pill counts. + is v4's quick log.
 *   - The slim bar on every root: the tab's name (tap it to go back to the top) and search; on Today the feedback
 *     button too (the speech bubble; for now it opens the app's one feedback panel). On a page with a tab strip
 *     (Today, Materials) it comes on exactly when the strip reaches it; elsewhere past 300px, as v4.1. It measures its
 *     own height and publishes it for the strip to stick under.
 */
import React, { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { subscribeV3, v3Overlay } from "../v3/v3Store";
import { V3_TABS, v3TabFor, type V3Tab } from "../../../lib/phoneV3Nav";
import { useV3Maybe } from "../v3/V3Provider";
import { useStageScroll, V4_HIDE_AT, V4_MINI_AT } from "../v4/V4Chrome";
import { I4, IconBtn } from "../v4/V4Parts";
import { setBarHeight, usePinned } from "./V5Tabs";
import "../v4/phoneV4.css";
import "./phoneV5.css";

/* the ref's own icon paths (`dock`, `FB`) */
const ICON: Record<V3Tab, string> = {
  today: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  todo: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  materials: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
};
const FEEDBACK_ICON = "M4 5h16v11H9l-5 4z";
const Ic: React.FC<{ d: string }> = ({ d }) => <svg className="pa4-ic" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

/** the To do badge's words for a screen reader */
export const todoLabel = (n: number): string => (n > 0 ? `To do, ${n} ${n === 1 ? "task" : "tasks"}` : "To do");

export const V5Dock: React.FC<{
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
      <button key={t.key} type="button" className={active ? "on" : ""} data-pa5="dock-tab" data-pa4="tab" data-pa3="tab" data-tab={t.key}
        aria-current={active ? "page" : undefined} aria-label={t.key === "todo" ? todoLabel(badge) : t.label}
        onClick={() => onGo(t.path, t.key)}>
        <span className="pa5-dic"><Ic d={ICON[t.key]} />{t.key === "todo" && badge > 0 ? <i className="pa5-bdg" data-pa5="badge" data-n={badge} aria-hidden="true">{badge}</i> : null}</span>
        {t.label}
      </button>
    );
  };
  return (
    <nav className={`pa4-tb pa5-dock${tucked ? " hide" : ""}`} aria-label="Primary" data-pa5="dock" data-pa4="tabbar" data-pa3="tabbar" data-tucked={tucked ? "1" : "0"}>
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

/** the root pages whose tab strip pins under the slim bar */
export function pinPageFor(pathname: string): "today" | "materials" | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/dashboard") return "today";
  if (p === "/materials") return "materials";
  return null;
}

export const V5MiniBar: React.FC<{
  title: string; pathname: string; scroller: () => HTMLElement | null; onSearch: () => void; onFeedback?: () => void;
}> = ({ title, pathname, scroller, onSearch, onFeedback }) => {
  const { y } = useStageScroll(scroller, pathname);
  const pinPage = pinPageFor(pathname);
  const pinned = usePinned(pinPage);
  const on = pinPage ? pinned : y > V4_MINI_AT;
  /* the bar's real height, for the strip to stick under (it is fixed, so its offsetHeight is untouched by the slide) */
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setBarHeight(el.offsetHeight);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`pa4-mini pa5-mini${on ? " on" : ""}`} data-pa5="mini" data-pa4="mini" data-on={on ? "1" : "0"} data-pin={pinPage ?? ""} aria-hidden={on ? undefined : true}>
      <button type="button" className="t" data-pa41="mini-title" tabIndex={on ? 0 : -1}
        onClick={() => scroller()?.scrollTo({ top: 0, behavior: "smooth" })}>{title}</button>
      {onFeedback ? (
        <button type="button" className="pa4-ib" aria-label="Give feedback" data-pa5="feedback-btn" tabIndex={on ? 0 : -1} onClick={onFeedback}><Ic d={FEEDBACK_ICON} /></button>
      ) : null}
      <IconBtn label="Search" n="search" pa4="mini-search" onClick={onSearch} />
    </div>
  );
};
