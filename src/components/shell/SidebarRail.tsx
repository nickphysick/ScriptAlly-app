/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarRail — the 80px labelled rail (sidebar rail v1, 5 Nov; refs design-refs/shell/sidebar-rail-v1.css
 * + .js, the `.qr-c` layer).
 *
 * SIDEBAR RAIL v2 (6 Nov; refs design-refs/sidebar-rail-v2): the five places used most — Dashboard, Queries,
 * Agents, Letters, Tasks — each one click to its own page, then More for everything else (`MorePanel`). An item
 * lights only on its own page; on a page that lives in More, More lights and takes that page's short name. The
 * section cards of rail v1, their trays, their animation and the per-section last-used memory are deleted.
 *
 * ⚠️ IT OWNS NO NAVIGATION STATE. Which item is lit is the shell's `hit` (the route); the items and More's groups are
 * `workspaceNav`'s `railItems` / `moreGroups`, read from the one nav model the expanded sidebar reads too.
 *
 * ⚠️ EVERY LABEL SETS ITS OWN FONT FAMILY in sidebarRail.css. brand.tsx names a face on every bare
 * `span`; a label that inherited would render in the body sans (it did, in the mock).
 */
import React from "react";
import { ShellHit, ShellSection } from "../../lib/workspaceShell";
import { morePageFor, railItems, railLabelOf, SETTINGS_RAIL_LABELS } from "../../lib/workspaceNav";
import { ACCOUNT_ROUTES, AccountSectionId } from "../../lib/accountRoutes";
import "./sidebarRail.css";

/** The handlers a rail anchor takes for its tooltip — the shell's `railTipFor`, already bound. */
export type TipProps = Record<string, unknown>;

export interface SidebarRailProps {
  sections: ShellSection[];
  icons: Record<string, React.ReactNode>;
  hit: ShellHit | null;
  /** The To-do board's total — the only count in the nav. */
  todoCount: number;
  /** Pro pages the user is NOT entitled to: their row carries the Pro tag. Empty today. */
  locked: ReadonlySet<string>;
  onGo: (path: string) => void;
  /** The expand control (the panel glyph under the hawk). */
  onExpand: () => void;
  expandRef?: React.Ref<HTMLButtonElement>;
  expanded: boolean;
  /** The manuscript tile — the shell's BarSwitcher in its rail placement. */
  switcher: React.ReactNode;
  markSrc: string;
  settingsMode: boolean;
  settingsSection: AccountSectionId | null;
  onSettings: (id: AccountSectionId) => void;
  onBack: () => void;
  onFeedback?: () => void;
  feedbackOpen?: boolean;
  feedbackRef?: React.Ref<HTMLButtonElement>;
  onAccount?: (anchor: HTMLElement) => void;
  initials: string;
  /** The account's name and plan line, for the avatar's tooltip. */
  who: string;
  planLabel: string;
  tip: (title: string, sub?: string, kbd?: string) => TipProps;
  toggleKbd: string;
  /** The More button and its panel (Part B); drawn by the shell so it can hold the panel's state. */
  more?: React.ReactNode;
}

const FEEDBACK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
  </svg>
);
export const PANEL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15" />
  </svg>
);
/* More: the ellipsis */
export const MORE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" />
  </svg>
);
const BACK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
);
/* the settings sections' glyphs, as the ref draws them (24 box, currentColor) */
const SETTINGS_ICONS: Record<string, React.ReactNode> = {
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  security: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  plan: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  notifications: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  preferences: <><path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M1 14h6" /><path d="M9 8h6" /><path d="M17 16h6" /></>,
  tasks: <><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></>,
  data: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></>,
};
const settingsIcon = (id: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SETTINGS_ICONS[id]}</svg>
);

/** "99+" above 99. */
export const railCount = (n: number): string => (n > 99 ? "99+" : String(n));

export const SidebarRail: React.FC<SidebarRailProps> = ({
  sections, icons, hit, todoCount, locked, onGo, onExpand, expandRef, expanded, switcher, markSrc,
  settingsMode, settingsSection, onSettings, onBack, onFeedback, feedbackOpen = false, feedbackRef,
  onAccount, initials, who, planLabel, tip, toggleKbd, more,
}) => {
  const page = settingsMode ? null : hit?.child ?? null;
  const items = railItems(sections);
  const morePage = settingsMode ? null : morePageFor(sections, hit);
  const sectionOf = (id: string) => sections.find((x) => (x.children ?? []).some((c) => c.id === id));

  const item = (ch: (typeof items)[number], i: number) => {
    const on = ch.id === page;
    const sec = sectionOf(ch.id);
    /* the Pro tag: the page's own entitlement, or its section's (Letters sits in Materials) — dormant today */
    const pro = (!!ch.pro && locked.has(ch.pro)) || (!!sec?.pro && locked.has(sec.pro));
    const count = ch.id === "list" ? todoCount : 0;
    return (
      <React.Fragment key={ch.id}>
        <button
          type="button"
          className={`wsr-ni${on ? " wsr-on" : ""}`}
          data-go={ch.id}
          aria-label={ch.label}
          aria-current={on ? "page" : undefined}
          onClick={() => onGo(ch.path)}
          {...tip(ch.label)}
        >
          <span className="wsr-ic">{icons[ch.icon ?? ch.id]}</span>
          <span className="wsr-lbl">{railLabelOf(ch)}</span>
          {count > 0 && <span className="wsr-ct" data-shell="count" aria-label={`${count} to do`}>{railCount(count)}</span>}
          {pro && <span className="wsr-pro" data-shell="pro" aria-label="Pro">Pro</span>}
        </button>
        {i === 0 && <div className="wsr-sep" aria-hidden="true" />}
      </React.Fragment>
    );
  };

  return (
    <div className={`wsr${settingsMode ? " wsr-settings" : ""}`} data-shell="rail">
      <div className="wsr-lgo">
        <button type="button" className="wsr-home" onClick={() => onGo("/dashboard")} aria-label="QueryHawk, go to Dashboard" {...tip("QueryHawk · go to Dashboard")}>
          <img src={markSrc} alt="" aria-hidden="true" width={34} height={34} />
        </button>
        <button
          ref={expandRef}
          type="button"
          className="wsr-tog"
          onClick={onExpand}
          aria-label="Expand sidebar"
          aria-expanded={expanded}
          aria-controls="ws-sidebar"
          aria-keyshortcuts="BracketLeft Meta+Backslash Control+Backslash"
          {...tip("Expand sidebar", undefined, `[  ${toggleKbd}`)}
        >
          {PANEL_ICON}
        </button>
      </div>
      <div className="wsr-mswrap">{switcher}</div>
      <nav className="wsr-nav" aria-label="Main">
        {items.map(item)}
        {more ?? (
          <button type="button" className={`wsr-ni wsr-more${morePage ? " wsr-on" : ""}`} data-go="more" aria-label={morePage ? `More: ${morePage.label}` : "More"}>
            <span className="wsr-ic">{MORE_ICON}</span>
            <span className="wsr-lbl">{morePage ? railLabelOf(morePage) : "More"}</span>
          </button>
        )}
      </nav>
      <nav className="wsr-setnav" aria-label="Settings">
        <button type="button" className="wsr-ni wsr-back" onClick={onBack} aria-label="Back to the app">
          <span className="wsr-ic">{BACK_ICON}</span>
          <span className="wsr-lbl">Back</span>
        </button>
        <div className="wsr-sep" aria-hidden="true" />
        {ACCOUNT_ROUTES.map((r) => {
          const on = settingsMode && settingsSection === r.id;
          return (
            <button
              type="button"
              key={r.id}
              className={`wsr-ni wsr-setni${on ? " wsr-on" : ""}`}
              data-set={r.id}
              aria-label={r.label}
              aria-current={on ? "page" : undefined}
              onClick={() => onSettings(r.id)}
            >
              <span className="wsr-ic">{settingsIcon(r.id)}</span>
              <span className="wsr-lbl">{SETTINGS_RAIL_LABELS[r.id] ?? r.label}</span>
            </button>
          );
        })}
      </nav>
      {onFeedback && (
        <button ref={feedbackRef} type="button" className="wsr-fb" data-probe="feedback-rail" onClick={onFeedback} aria-expanded={feedbackOpen} aria-label="Give feedback" {...tip("Give feedback")}>
          <span className="wsr-fbi">{FEEDBACK_ICON}<i aria-hidden="true" /></span>
          <span className="wsr-t">Feedback</span>
        </button>
      )}
      <div className="wsr-foot">
        <button type="button" className="wsr-av" aria-haspopup="menu" aria-label="Account" onClick={(e) => onAccount?.(e.currentTarget)} {...tip(who || "Account", planLabel)}>
          {initials}
        </button>
      </div>
    </div>
  );
};
