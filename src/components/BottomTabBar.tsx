/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bottom tab bar — the phone's primary navigation (Queries on a phone v1; ref design-refs/queries-mobile-v1/, Nick's
 * ruling of 28 Oct: the five-tab bar on every phone page). Full width along the foot of the screen, five equal tabs:
 * Home · Queries · Agents · Analytics · More.
 *
 *  - The chosen tab is a NAVY pill (#2a3a52, 52 × 32, radius 12) with a white icon; its label is ink.
 *  - Queries carries a pink badge with a black number: the active manuscript's Your-move count, the same figure the
 *    Queries page's first chip shows. No badge at zero.
 *  - More opens the shell's own "you" sheet (To-do, packages, import, settings, help, sign out); it is never "on".
 *  - Analytics is `/queries/analytics`, so Queries is on for every other `/queries` path.
 *
 * Hidden at ≥md and on pushed detail screens (`hidden`). Geometry and colour live in mobileShell.css (class + media
 * query, never inline — the shell CSS footgun law).
 */
import React from "react";

interface BottomTabBarProps {
  /** the router's pathname; it decides the chosen tab */
  pathname: string;
  /** go to a path */
  onGo: (path: string) => void;
  /** open the "you" sheet */
  onMore: () => void;
  /** the Your-move count for the Queries badge (none at zero) */
  badge?: number;
  /** True while the active route shows a pushed detail screen — the bar stands down. */
  hidden?: boolean;
}

const sv = (d: React.ReactNode) => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{d}</svg>;
const ICON = {
  home: sv(<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />),
  queries: sv(<><path d="M3 11l18-7-7 18-2.5-7.5z" /><path d="M11.5 14.5 21 4" /></>),
  agents: sv(<><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.5 3.2-5 6-5s5.2 1.5 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c2.4 0 4.3 1.3 5 4" /></>),
  analytics: sv(<><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>),
  more: sv(<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>),
};

type TabKey = "home" | "queries" | "agents" | "analytics";
/** which tab the path lights: Analytics is a Queries path of its own; anything else lights nothing */
export function tabFor(pathname: string): TabKey | null {
  if (pathname.startsWith("/queries/analytics")) return "analytics";
  if (pathname === "/queries" || pathname.startsWith("/queries/")) return "queries";
  if (pathname.startsWith("/dashboard")) return "home";
  if (pathname.startsWith("/agents")) return "agents";
  return null;
}

const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: "home", label: "Home", path: "/dashboard" },
  { key: "queries", label: "Queries", path: "/queries" },
  { key: "agents", label: "Agents", path: "/agents" },
  { key: "analytics", label: "Analytics", path: "/queries/analytics" },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ pathname, onGo, onMore, badge = 0, hidden = false }) => {
  if (hidden) return null;
  const on = tabFor(pathname);
  return (
    <nav className="sa-mtabbar" aria-label="Primary" data-qm1="tabbar">
      {TABS.map((t) => {
        const active = on === t.key;
        return (
          <button
            key={t.key} type="button" className={`sa-mtab${active ? " on" : ""}`} data-tab={t.key}
            onClick={() => onGo(t.path)}
            aria-label={t.key === "queries" && badge > 0 ? `Queries, ${badge} your move` : t.label}
            aria-current={active ? "page" : undefined}
          >
            <span className="sa-mtabic">{ICON[t.key]}</span>
            <span className="sa-mtablb">{t.label}</span>
            {t.key === "queries" && badge > 0 ? <em className="sa-mtabbd" data-qm1="tab-badge" aria-hidden="true">{badge}</em> : null}
          </button>
        );
      })}
      <button type="button" className="sa-mtab" data-tab="more" aria-label="More" aria-haspopup="dialog" onClick={onMore}>
        <span className="sa-mtabic">{ICON.more}</span>
        <span className="sa-mtablb">More</span>
      </button>
    </nav>
  );
};
