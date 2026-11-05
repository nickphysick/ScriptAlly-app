/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarRail — the 80px labelled rail (sidebar rail v1, 5 Nov; refs design-refs/shell/sidebar-rail-v1.css
 * + .js, the `.qr-c` layer).
 *
 * One row per SECTION, its icon over a short label. The section you are in, if it has several pages,
 * opens into a soft card with its pages beneath as small rows; a one-page section (Dashboard, Materials)
 * gets the pill behind its icon instead. Clicking a section goes to the page you last used in it.
 *
 * ⚠️ IT OWNS NO NAVIGATION STATE. Which section is lit is the shell's `hit` (the route); the last page
 * per section is `lib/railMemory`; the manuscript menu, the feedback panel and the account menu are the
 * shell's own components, opened from here. The rail is a second view of the same nav model, never a
 * second model.
 *
 * ⚠️ EVERY LABEL SETS ITS OWN FONT FAMILY in sidebarRail.css. brand.tsx names a face on every bare
 * `span`; a label that inherited would render in the body sans (it did, in the mock).
 */
import React, { useEffect, useRef, useState } from "react";
import { ShellHit, ShellSection } from "../../lib/workspaceShell";
import { railPageLabel, railSectionLabel, SETTINGS_RAIL_LABELS } from "../../lib/workspaceNav";
import { ACCOUNT_ROUTES, AccountSectionId } from "../../lib/accountRoutes";
import { railPageFor } from "../../lib/railMemory";
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
  settingsMode, settingsSection, onSettings, onBack, onFeedback, feedbackOpen = false, feedbackRef,
  onAccount, initials, who, planLabel, tip, toggleKbd,
}) => {
  const current = settingsMode ? null : hit?.section ?? null;
  const page = settingsMode ? null : hit?.child ?? null;

  /* the pill grows out of the icon when the page changes, and only then */
  const [anim, setAnim] = useState(false);
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) { firstPage.current = false; return undefined; }
    setAnim(false);
    const raf = requestAnimationFrame(() => setAnim(true));
    const t = window.setTimeout(() => setAnim(false), 450);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); };
  }, [page]);

  const dash = sections.filter((s) => s.id === "workspace");
  const rest = sections.filter((s) => s.id !== "workspace");

  const group = (sec: ShellSection) => {
    const kids = sec.children ?? [];
    const multi = kids.length > 1;
    const on = sec.id === current;
    const open = on && multi;
    const single = !multi ? kids[0] : null;
    const proHead = !!single?.pro && locked.has(single.pro);
    const count = sec.id === "tasks" ? todoCount : 0;
    return (
      <div key={sec.id} className={`wsr-grp${multi ? " wsr-multi" : ""}${open ? " open" : ""}`} data-sec={sec.id}>
        <button
          type="button"
          className={`wsr-ni${on ? " wsr-on" : ""}`}
          data-sec={sec.id}
          aria-label={railSectionLabel(sec)}
          aria-expanded={multi ? open : undefined}
          aria-current={on ? (multi ? "true" : "page") : undefined}
          onClick={() => onGo(railPageFor(sec, hit))}
          {...(single ? tip(single.label) : {})}
        >
          <span className="wsr-ic">{icons[sec.icon ?? sec.id]}</span>
          <span className="wsr-lbl">{railSectionLabel(sec)}</span>
          {count > 0 && <span className="wsr-ct" data-shell="count" aria-label={`${count} to do`}>{railCount(count)}</span>}
          {proHead && <span className="wsr-pro" aria-label="Pro">Pro</span>}
        </button>
        {multi && (
          <div className="wsr-tray">
            <div className="wsr-tray-in">
              {kids.map((ch) => {
                const here = ch.id === page && on;
                return (
                  <button
                    type="button"
                    key={ch.id}
                    className={`wsr-sp${here ? " wsr-cur" : ""}`}
                    data-go={ch.id}
                    tabIndex={open ? 0 : -1}
                    aria-label={ch.label}
                    aria-current={here ? "page" : undefined}
                    onClick={() => onGo(ch.path)}
                  >
                    <span className="wsr-spl">{railPageLabel(ch)}</span>
                    {ch.pro && locked.has(ch.pro) && <span className="wsr-spp" aria-label="Pro">Pro</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`wsr${settingsMode ? " wsr-settings" : ""}${anim ? " wsr-anim" : ""}`} data-shell="rail">
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
        {dash.map(group)}
        <div className="wsr-sep" aria-hidden="true" />
        {rest.map(group)}
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
