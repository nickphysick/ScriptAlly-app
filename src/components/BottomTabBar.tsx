/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PHONE'S TAB BAR (Phone app v2, Part 1B; ref design-refs/phone-app-v2/src/screens.js `tabbar()`, app.css `.tabbar`
 * `.tb` `.plus`). A floating capsule with five slots: Home · Queries · [+] · To-do · Agents.
 *
 *  - The chosen tab is a NAVY pill behind a white icon; its label is navy.
 *  - The + is a blush disc in the centre slot. While its sheet is open it is the close button (`aria-expanded`, the
 *    plus turns 45°).
 *  - To-do carries the badge: the To-do tray's own tally of tasks due today or earlier (`lib/todoDueTally`, the
 *    tray's `dayBuckets` overdue + today). No badge at zero. The Queries Your-move badge is retired from the bar.
 *  - It tucks away as the page scrolls down and comes back when it scrolls up (`away`, driven by the shell's one
 *    scroll listener with the ref's thresholds), and it is not drawn on a page opened from the menu or on a pushed
 *    detail screen (`hidden`).
 *
 * SUPERSEDES the Queries on a phone v1 five-tab bar (Home · Queries · Agents · Analytics · More): Analytics moved to the
 * menu, and More's "you" sheet is the menu behind your initials (PhoneMenu).
 *
 * Phone only: the bar is `display: none` at 768px and up (class + media query, never inline — the shell CSS law).
 */
import React from "react";
import { PI } from "./phone/phoneIcons";

type TabKey = "home" | "queries" | "todo" | "agents";

/** The four tab routes. Everything else on a phone is a page opened from the menu, with the page band and no bar. */
export function tabFor(pathname: string): TabKey | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/dashboard") return "home";
  if (p === "/queries") return "queries";
  if (p === "/todo" || p.startsWith("/todo/")) return "todo";
  if (p === "/agents" || p.startsWith("/agents/")) return "agents";
  return null;
}
/** a menu page: any workspace route that is not one of the four tabs */
export const isMenuPage = (pathname: string): boolean => tabFor(pathname) === null;

const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: "home", label: "Home", path: "/dashboard" },
  { key: "queries", label: "Queries", path: "/queries" },
  { key: "todo", label: "To-do", path: "/todo" },
  { key: "agents", label: "Agents", path: "/agents" },
];

interface BottomTabBarProps {
  /** the router's pathname; it decides the chosen tab */
  pathname: string;
  /** go to a path (a tap on the tab you are on scrolls it back to the top instead) */
  onGo: (path: string) => void;
  /** the + : open its sheet, or close it while open */
  onPlus: () => void;
  plusOpen?: boolean;
  /** the To-do badge: tasks due today or earlier (none at zero) */
  badge?: number;
  /** tucked away while scrolling down */
  away?: boolean;
  /** not drawn: a pushed detail screen or a page opened from the menu */
  hidden?: boolean;
  /** Phone fixes v1 (1B): there is more of the page below, so the edge fade shows */
  more?: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ pathname, onGo, onPlus, plusOpen = false, badge = 0, away = false, hidden = false, more = false }) => {
  if (hidden) return null;
  const on = tabFor(pathname);
  const tab = (t: (typeof TABS)[number]) => {
    const active = on === t.key;
    return (
      <button key={t.key} type="button" className="pa-tb" data-tab={t.key} data-pa="tab"
        onClick={() => onGo(t.path)}
        aria-label={t.key === "todo" && badge > 0 ? `To-do, ${badge} due` : t.label}
        aria-current={active ? "page" : undefined}>
        <span className="pa-tbi">{PI[t.key]}</span>
        {t.label}
        {t.key === "todo" && badge > 0 ? <span className="pa-tbbadge" data-pa="tab-badge" aria-hidden="true">{badge}</span> : null}
      </button>
    );
  };
  return (<>
    {/* Phone fixes v1 (1B; boot.js `.fx-b2 .app::after`): the edge fade is anchored to the screen's foot and runs
        up behind the frosted bar, so content scrolls clearly behind it. It goes when the bar tucks away and at
        the end of the page. */}
    <div className={`pa-edgefade${away || !more ? " off" : ""}`} aria-hidden="true" data-pa="edgefade" />
    <nav className={`pa-tabbar${away ? " away" : ""}${plusOpen ? " plus-open" : ""}`} aria-label="Primary" data-pa="tabbar">
      {tab(TABS[0])}
      {tab(TABS[1])}
      <button type="button" className="pa-plus" data-pa="plus" aria-label={plusOpen ? "Close" : "Log something"}
        aria-haspopup="dialog" aria-expanded={plusOpen} onClick={onPlus}>
        {PI.plus}
      </button>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </nav>
  </>);
};
