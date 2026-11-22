/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1, Part B — THE HELP MENU, design A "Page card" (design-refs/help-system-v1, screens 01 and 02).
 *
 *   header   blush: `HELP · {PAGE}`, then the page's guide — the ring, "Getting started", "Next: {item}" and Continue —
 *            or "Show the page guide again" (hidden or switched off), or "Open the page guide" (finished). A page
 *            without a guide shows the eyebrow only.
 *   on this page   the page's three articles (`lib/helpArticles`), with read times.
 *   links    Search help (/), What's new (a count of unseen entries), Give feedback, Help Centre →.
 *   foot     PAGE GUIDES and a switch (`sa.guides.off`).
 *
 * ⚠️ KEYBOARD SHORTCUTS ARE NOT HERE. The shortcuts sheet and its own "?" key are unchanged; the menu's trigger is the
 *    bar's "?" button, not the key.
 * ⚠️ THE MENU IS IN THE ONE POP-UP LAYER (Part A); the shell owns its open state, its anchor and its dismissal.
 * ⚠️ IT IS NOT `.sa-pop` / `.ws-helpmenu`: those carry the older menu's padding and row rules (`.ws-helpmenu button`
 *    is display: block), which would fight every row here.
 */
import React from "react";
import { GuideRing } from "./guide/GuideRing";
import { SHOW_ME_ROUND } from "../../lib/dashTour";
import { setGuidesOff, useGuideHub, useGuidesOff } from "../../lib/guideHub";
import { HELP_ARTICLES, PAGE_ARTICLES, articleHref, markWhatsNewSeen, whatsNewUnseen } from "../../lib/helpArticles";
import { menuRows } from "../../lib/menuKeys";
import "./helpMenu.css";

const ic = (d: React.ReactNode, cls = "hm-i") => (
  <svg className={cls} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const HM_ICONS = {
  doc: ic(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></>, "hm-i hm-i--doc"),
  search: ic(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  news: ic(<path d="M12 3l2.2 5.6L20 9.3l-4.4 3.9 1.3 5.8L12 16l-4.9 3 1.3-5.8L4 9.3l5.8-.7z" />),
  talk: ic(<path d="M4 5h16v11H9l-5 4z" />),
  book: ic(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>),
  again: ic(<><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></>),
  arrow: ic(<path d="M5 12h14M13 6l6 6-6 6" />, "hm-i hm-i--arrow"),
};

export interface HelpMenuProps {
  /** the folder tab's name for the page on screen, or null */
  pageName: string | null;
  /** a page on the older one-card guide (lib/pageGuide) offers it here instead */
  legacyGuide: boolean;
  onLegacyGuide: () => void;
  /** Dashboard first visit v2 (Part D): "Show me round again" — offered while the dashboard registers its tour's replay */
  onTour?: () => void;
  /** close the menu; `focusHelp` returns focus to the "?" */
  onClose: (focusHelp: boolean) => void;
  onGo: (path: string) => void;
  onFeedback?: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
}

/** Arrow keys, Home, End and type-ahead through the menu's stops (the switch is one of them). */
export function menuKey(e: React.KeyboardEvent, menu: HTMLElement | null): boolean {
  const rows = menuRows(menu);
  if (!rows.length) return false;
  const i = rows.indexOf(document.activeElement as HTMLElement);
  let next = -1;
  if (e.key === "ArrowDown") next = i < 0 ? 0 : (i + 1) % rows.length;
  else if (e.key === "ArrowUp") next = i < 0 ? rows.length - 1 : (i - 1 + rows.length) % rows.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = rows.length - 1;
  else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const ch = e.key.toLowerCase();
    const label = (el: HTMLElement) => (el.dataset.hmLabel ?? el.textContent ?? "").trim().toLowerCase();
    for (let k = 1; k <= rows.length; k++) {
      const r = rows[(Math.max(i, 0) + k) % rows.length];
      if (label(r).startsWith(ch)) { next = rows.indexOf(r); break; }
    }
    if (next < 0) return false;
  } else return false;
  e.preventDefault();
  rows[next].focus();
  return true;
}

export const HelpMenu: React.FC<HelpMenuProps> = ({ pageName, legacyGuide, onLegacyGuide, onTour, onClose, onGo, onFeedback, menuRef, style }) => {
  const hub = useGuideHub();
  const off = useGuidesOff();
  const guide = hub && pageName && hub.status.page === pageName ? hub : null;
  const arts = (pageName ? PAGE_ARTICLES[pageName] ?? [] : []).map((s) => HELP_ARTICLES[s]).filter(Boolean);
  const news = whatsNewUnseen();
  const eyebrow = pageName ? `Help · ${pageName}` : "Help";
  const go = (path: string) => { onClose(false); onGo(path); };

  let head: React.ReactNode = null;
  if (guide) {
    const { status, cmds } = guide;
    if (status.state === "live" && !off && status.next) {
      head = (
        <div className="hm-guide" data-hm="guide">
          <span className="hm-ring" aria-hidden="true"><GuideRing n={status.n} total={status.total} size={40} /><b>{status.n}/{status.total}</b></span>
          <div className="hm-gt"><h5>Getting started</h5><p>Next: {status.next.title}</p></div>
          <button type="button" role="menuitem" className="hm-go" data-hm="continue" data-hm-label="Continue"
            onClick={() => { onClose(false); cmds.continueNext(); }}>Continue</button>
        </div>
      );
    } else if (status.state === "finished" && !off) {
      head = (
        <button type="button" role="menuitem" className="hm-row hm-again" data-hm="open-guide" onClick={() => { onClose(false); cmds.open(); }}>
          {HM_ICONS.again}<span className="t">Open the page guide</span>
        </button>
      );
    } else {
      head = (
        <button type="button" role="menuitem" className="hm-row hm-again" data-hm="restore"
          onClick={() => { onClose(false); if (off) setGuidesOff(false); cmds.restore(); }}>
          {HM_ICONS.again}<span className="t">Show the page guide again</span>
        </button>
      );
    }
  } else if (legacyGuide) {
    head = (
      <button type="button" role="menuitem" className="hm-row hm-again" data-hm="restore" onClick={() => { onClose(false); onLegacyGuide(); }}>
        {HM_ICONS.again}<span className="t">Show the page guide again</span>
      </button>
    );
  } else if (onTour) {
    head = (
      <button type="button" role="menuitem" className="hm-row hm-again" data-hm="tour" onClick={() => { onClose(false); onTour(); }}>
        {HM_ICONS.again}<span className="t">{SHOW_ME_ROUND}</span>
      </button>
    );
  }

  return (
    <div ref={menuRef} className="hm" role="menu" aria-label={pageName ? `Help, ${pageName}` : "Help"} data-shell="help-menu"
      style={style}
      onKeyDown={(e) => {
        if (menuKey(e, menuRef.current)) return;
        if (e.key === "Tab") { e.preventDefault(); onClose(true); }
      }}>
      <div className="hm-frame">
        <div className="hm-head" data-hm="head">
          <p className="hm-eyb" data-hm="eyebrow">{eyebrow}</p>
          {head}
        </div>
        {arts.length > 0 && (
          <div className="hm-sec" data-hm="articles">
            <span className="hm-sl" aria-hidden="true">ON THIS PAGE</span>
            {arts.map((a) => (
              <button key={a.slug} type="button" role="menuitem" className="hm-row hm-art" data-hm="article" data-slug={a.slug}
                onClick={() => go(articleHref(a.slug))}>
                {HM_ICONS.doc}<span className="t">{a.title}</span><span className="mt">{a.read}</span>
              </button>
            ))}
          </div>
        )}
        <div className="hm-sec" data-hm="links">
          <button type="button" role="menuitem" className="hm-row" data-hm="search" onClick={() => go("/help#search")}>
            {HM_ICONS.search}<span className="t">Search help</span><kbd className="hm-key">/</kbd>
          </button>
          <button type="button" role="menuitem" className="hm-row" data-hm="news" onClick={() => { markWhatsNewSeen(); go("/help#whats-new"); }}>
            {HM_ICONS.news}<span className="t">What's new</span>{news > 0 && <span className="hm-bdg" aria-label={`${news} new`}>{news}</span>}
          </button>
          {onFeedback && (
            <button type="button" role="menuitem" className="hm-row" data-hm="feedback" onClick={() => { onClose(false); onFeedback(); }}>
              {HM_ICONS.talk}<span className="t">Give feedback</span>
            </button>
          )}
          <button type="button" role="menuitem" className="hm-row" data-hm="centre" onClick={() => go("/help")}>
            {HM_ICONS.book}<span className="t">Help Centre</span>{HM_ICONS.arrow}
          </button>
        </div>
        <div className="hm-foot">
          <span className="hm-fl" id="hm-guides-l">PAGE GUIDES</span>
          <button type="button" role="menuitemcheckbox" className="hm-sw" data-hm="switch" data-hm-label="Page guides"
            aria-checked={!off} aria-labelledby="hm-guides-l"
            onClick={() => setGuidesOff(!off)} />
        </div>
      </div>
    </div>
  );
};
