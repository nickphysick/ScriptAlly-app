/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bottom tab bar — the mobile primary navigation, rebuilt to the capsule language (Mobile Pass 1;
 * ref design-refs/mobile-concept-v1.html). It floats as ITS OWN CAPSULE (baked decision 1): inset
 * from the screen edges, capsule border + layered shadow, four equal tabs with mono micro-labels.
 * Active = ground-fill pill with ink text (baked decision 3 — never burgundy, never pink; the
 * desktop rail's exact active grammar).
 *
 * Four tabs (baked decision 2): Home (Dashboard) · Queries · Agents · Scripts. To-do has NO tab —
 * it is reached from the dashboard desk line and the you-menu. Route-driven active state via
 * `activeTab` (the shell's routeKey); off-tab routes light nothing.
 *
 * Hidden at ≥md and on pushed detail screens (`hidden` — the shell passes the active route's
 * MobileDetailSpec presence; query detail gets the condensed command bar, the agent editor its
 * own Done/Cancel — baked decision 5). All geometry/colour lives in mobileShell.css — display is
 * class + media-query driven, never inline (the shell CSS footgun law).
 */
import React from "react";
import { Home, Send, Users, BookOpen, LucideIcon } from "lucide-react";

interface BottomTabBarProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  /** True while the active route shows a pushed detail screen — the bar stands down. */
  hidden?: boolean;
}

const TABS: { tab: string; label: string; Icon: LucideIcon }[] = [
  { tab: "dashboard", label: "Home", Icon: Home },
  { tab: "queries", label: "Queries", Icon: Send },
  { tab: "agents", label: "Agents", Icon: Users },
  { tab: "manuscripts", label: "Scripts", Icon: BookOpen },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onNavigate, hidden = false }) => {
  if (hidden) return null;
  return (
    <nav className="sa-mtabbar" aria-label="Primary">
      {TABS.map(({ tab, label, Icon }) => {
        const active = activeTab === tab;
        // Queries goes straight to the hub on mobile — logging/recording are in-page affordances.
        const sub = tab === "queries" ? "Query database" : undefined;
        return (
          <button
            key={tab}
            type="button"
            className={`sa-mtab${active ? " on" : ""}`}
            onClick={() => onNavigate(tab, sub)}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" strokeWidth={active ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
