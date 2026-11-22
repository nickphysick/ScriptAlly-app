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
import React, { useEffect, useRef, useState } from "react";
import { IconBtn } from "./V4Parts";
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

/* Phone app v5: the dock (V4TabBar) and the slim bar (V4MiniBar) are replaced by V5Dock and V5MiniBar
   (components/phone/v5/V5Chrome.tsx), which read the scroll through useStageScroll above. */

/** a pushed page's header: back, the page's name, the page's one icon.
 *  Phone app v5: `sticky` keeps it at the top (the full list of queries, whose Birds-eye ruler sticks under it); its
 *  measured height is published as `--pa5-ph-h` for that ruler. */
export const V4PushedHeader: React.FC<{ title: string; onBack: () => void; extra?: React.ReactNode; slot?: React.ReactNode; sticky?: boolean }> = ({ title, onBack, extra, slot, sticky }) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!sticky || !el) return undefined;
    const put = () => document.body.style.setProperty("--pa5-ph-h", `${el.offsetHeight}px`);
    put();
    document.body.classList.add("pa5-phs");
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(put);
    ro?.observe(el);
    return () => { ro?.disconnect(); document.body.classList.remove("pa5-phs"); document.body.style.removeProperty("--pa5-ph-h"); };
  }, [sticky]);
  return (
    <>
      <header ref={ref} className={`pa4-ph${sticky ? " pa5-phs" : ""}`} data-pa4="pushed-header" data-pa3="header" data-root="0" data-sticky={sticky ? "1" : undefined}>
        <IconBtn label="Back" n="back" pa4="back" onClick={onBack} />
        <h1 className="t" data-pa3="title">{title}</h1>
        {extra}
      </header>
      {slot ? <div className="pa3-pslot" data-pa3="page-slot">{slot}</div> : null}
    </>
  );
};

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
