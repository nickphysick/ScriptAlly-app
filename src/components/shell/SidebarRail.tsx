/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarRail — the 80px labelled rail (sidebar rail v1, 5 Nov; refs design-refs/shell/sidebar-rail-v1.css
 * + .js, the `.qr-c` layer).
 *
 * SHELL NAV v3 (13 Nov; ref design-refs/shell-nav-v3.html): the rail is PLACES — one row per section of the nav
 * (Dashboard, Queries, Agents, Materials, Tasks), labelled and drawn with the section's own label and icon. A row is
 * lit while the current page belongs to its section; nothing is lit on /your-notes, Settings, Plans, Help or Import.
 * A click goes to the section's `def` page, or the first page of the section this account is not locked out of
 * (`railTargetFor`). The pages of a place are the folder tabs in the bar. Rail v2's More panel and per-page rail
 * flags are deleted. The five rows carry no tooltip: the label is on the row.
 *
 * ⚠️ IT OWNS NO NAVIGATION STATE. Which row is lit is the shell's `hit` (the route); the rows are `workspaceNav`'s
 * sections, the one nav model the expanded sidebar reads too.
 *
 * ⚠️ EVERY LABEL SETS ITS OWN FONT FAMILY in sidebarRail.css. brand.tsx names a face on every bare
 * `span`; a label that inherited would render in the body sans (it did, in the mock).
 */
import React from "react";
import { ShellHit, ShellSection } from "../../lib/workspaceShell";
import { railSectionFor, railTargetFor, SETTINGS_RAIL_LABELS } from "../../lib/workspaceNav";
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
  /** Pro entitlements the user does NOT have: decides where a row's click lands (`railTargetFor`). */
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
  /** Your notes v1: the Feedback button's dot shows only while a reply on Your notes is unseen */
  newReplies?: number;
  feedbackRef?: React.Ref<HTMLButtonElement>;
  onAccount?: (anchor: HTMLElement) => void;
  initials: string;
  /** The account's name and plan line, for the avatar's tooltip. */
  who: string;
  planLabel: string;
  tip: (title: string, sub?: string, kbd?: string) => TipProps;
  toggleKbd: string;
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
  settingsMode, settingsSection, onSettings, onBack, onFeedback, feedbackOpen = false, newReplies = 0, feedbackRef,
  onAccount, initials, who, planLabel, tip, toggleKbd,
}) => {
  const lit = settingsMode ? null : railSectionFor(sections, hit);

  const row = (sec: ShellSection, i: number) => {
    const on = sec.id === lit;
    const count = sec.id === "tasks" ? todoCount : 0;
    return (
      <React.Fragment key={sec.id}>
        <button
          type="button"
          className={`wsr-ni${on ? " wsr-on" : ""}`}
          data-go={sec.id}
          aria-label={sec.label}
          aria-current={on ? "page" : undefined}
          onClick={() => onGo(railTargetFor(sec, locked))}
        >
          <span className="wsr-ic">{icons[sec.icon ?? sec.id]}</span>
          <span className="wsr-lbl">{sec.label}</span>
          {/* v51.1 — the badge is the "needs you" count (boardFigures' cards), not the To-do list's rows: its tooltip says so */}
          {count > 0 && <span className="wsr-ct" data-shell="count" aria-label={`${count} need you now`} title={`${count} need you now`}>{railCount(count)}</span>}
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
        {sections.map(row)}
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
          <span className="wsr-fbi">{FEEDBACK_ICON}{newReplies > 0 ? <i aria-hidden="true" data-probe="feedback-dot" /> : null}</span>
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
