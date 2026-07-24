/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoShell — THE HARDBACK SPINE (design-refs/spine-shell.html, todo-fix54; supersedes the
 * single-column sidebar of the workspace-shell + polish packs). Three columns inside the
 * `.t-f12` token layer:
 *
 *   .spine-rail   — a 54px full-height INK rail (#2a1a13) owning the top-left corner, beside
 *                   everything incl. the bar. The real logo mark at its head, then the app's
 *                   CATEGORIES as icon buttons (Dashboard · Querying · Agents · Manuscripts)
 *                   with Settings at the foot. Active = a #4a3226 rounded square, icon cream
 *                   #f3e7da — the rail is the one place the parchment-highlight law can't apply
 *                   (there is no parchment here); the ink square is its native equivalent.
 *                   Never burgundy.
 *   .spine-panel  — a 196px parchment (#f5f0e8) column: the real wordmark at its head, then the
 *                   active category's PAGES (icon + label + count), then the current page's
 *                   CONTEXT zone (To-do → the filter rows, full reactive parity). Foot: the
 *                   utility rows (Task settings + Help centre).
 *   .tsh-mainwrap — the content region: the breadcrumb bar (wearing the panel's parchment, so
 *                   bar + panel read as one cream L) over the page body (children).
 *
 * Active-fill law (panel): the warm parchment fill #e6ddcf (hover #ece5d9), fill only — no
 * border, shadow or outline; page rows and filter rows alike. Touches no locked component: the
 * crumb is drawn here from plain text, so the locked header components are untouched.
 */
import React from "react";
import { F12Account } from "./F12Shell";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import "./todoShell.css";

/** A rail category (routes to its default page; the rail reflects the current route). */
export interface SpineCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}

/** A panel page row (icon + label + optional derived count). */
export interface SpinePage {
  key: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  onClick: () => void;
  active: boolean;
}

/** A panel foot utility (Task settings · Help centre). */
export interface SpineFootItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export interface TodoShellProps {
  /** The rail's categories, in order; one is `active`. */
  categories: SpineCategory[];
  /** The rail's foot item (Settings). */
  railFoot: SpineCategory;
  /** The active category's mono label (e.g. "QUERYING"). */
  panelCategory: string;
  /** The active category's page rows. */
  pages: SpinePage[];
  /** The current page's context zone: a ruled mono label + its dynamic content (To-do only). */
  contextLabel?: string;
  contextContent?: React.ReactNode;
  /** The panel foot utilities. */
  foot: SpineFootItem[];
  /** The breadcrumb: parents (navigable) then the bold current page. */
  crumbParents?: { label: string; onClick: () => void }[];
  crumbCurrent: string;
  onAccount: () => void;
  /** The brand's home-route link (the logo/wordmark → dashboard). */
  onBrand: () => void;
  /** < --tsh-collapse: the panel collapses to a rail-triggered overlay. */
  collapsed?: boolean;
  /** Whether the collapsed panel overlay is open. */
  panelOpen?: boolean;
  onPanelDismiss?: () => void;
  /** A focused session is opening/running: the panel slides off left (the rail persists). */
  clearing?: boolean;
  children: React.ReactNode;
}

const RailIcon: React.FC<{ c: SpineCategory }> = ({ c }) => (
  <button
    type="button"
    className={`spine-rli${c.active ? " on" : ""}`}
    onClick={c.onClick}
    title={c.label}
    aria-label={c.label}
    aria-current={c.active ? "page" : undefined}
  >
    <span className="spine-ric" aria-hidden>{c.icon}</span>
  </button>
);

export const TodoShell: React.FC<TodoShellProps> = ({
  categories, railFoot, panelCategory, pages, contextLabel, contextContent, foot,
  crumbParents = [], crumbCurrent, onAccount, onBrand,
  collapsed = false, panelOpen = false, onPanelDismiss, clearing = false, children,
}) => (
  <div className={`t-f12 spine-root${collapsed ? " spine-collapsed" : ""}${panelOpen ? " spine-panelopen" : ""}${clearing ? " spine-clearing" : ""}`}>
    {/* THE RAIL — chrome; it persists through the session and owns the top-left corner. */}
    <aside className="spine-rail" aria-label="Categories">
      <button type="button" className="spine-logo" onClick={onBrand} aria-label="ScriptAlly — go to dashboard">
        <img src="/scriptally-logo-new.png" alt="" aria-hidden="true" width={30} height={30} />
      </button>
      <nav className="spine-railnav" aria-label="Categories">
        {categories.map((c) => <RailIcon key={c.key} c={c} />)}
      </nav>
      <div className="spine-railfoot"><RailIcon c={railFoot} /></div>
    </aside>

    {/* THE PANEL — the active category's pages + the current page's context. */}
    <aside className="spine-panel" aria-label="Pages and filters">
      <button type="button" className="spine-word" onClick={onBrand} aria-label="ScriptAlly — go to dashboard">
        <ScriptAllyLogo heightPx={30} />
      </button>

      <div className="spine-cat" aria-hidden>{panelCategory}</div>
      <nav aria-label={panelCategory}>
        {pages.map((pg) => (
          <button
            key={pg.key}
            type="button"
            className={`spine-ni${pg.active ? " on" : ""}`}
            aria-current={pg.active ? "page" : undefined}
            onClick={pg.onClick}
          >
            <span className="spine-ic" aria-hidden>{pg.icon}</span>
            <span className="spine-nlab">{pg.label}</span>
            {typeof pg.count === "number" && <span className="spine-n">{pg.count}</span>}
          </button>
        ))}
      </nav>

      {contextLabel && (
        <>
          <div className="spine-nk" aria-hidden>{contextLabel}</div>
          <div className="spine-ctx">{contextContent}</div>
        </>
      )}

      <div className="spine-spacer" />
      <div className="spine-panelfoot">
        {foot.map((f) => (
          <button key={f.key} type="button" className="spine-ni" onClick={f.onClick}>
            <span className="spine-ic" aria-hidden>{f.icon}</span>
            <span className="spine-nlab">{f.label}</span>
          </button>
        ))}
      </div>
    </aside>

    {/* the collapsed-panel scrim (below --tsh-collapse; dismiss on outside click) */}
    {collapsed && panelOpen && <div className="spine-scrim" onClick={onPanelDismiss} aria-hidden />}

    <div className="tsh-mainwrap">
      <div className="tsh-bcbar">
        <span className="tsh-bc">
          {crumbParents.map((p) => (
            <React.Fragment key={p.label}>
              <button type="button" className="tsh-bcseg" onClick={p.onClick}>{p.label}</button>
              <span className="tsh-bcsep" aria-hidden>/</span>
            </React.Fragment>
          ))}
          <b>{crumbCurrent}</b>
        </span>
        <F12Account onClick={onAccount} />
      </div>
      <div className="tsh-body">{children}</div>
    </div>
  </div>
);
