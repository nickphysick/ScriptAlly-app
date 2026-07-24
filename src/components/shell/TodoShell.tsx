/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoShell — the To-do workspace frame (design-refs/todo-workspace-shell.html, todo-fix48).
 * ONE shared component: an always-on parchment navigation sidebar (WORKSPACE + a slotted
 * FILTER section + a foot), and a parchment breadcrumb bar joined to it by matching borders,
 * with the search relocated into the bar as a white pill before the account block. The page's
 * own content (hero + panel) renders as children in the body region.
 *
 * Built for /todo (the nav is centralised through railNav; the shell mounts here while the
 * NavDrawer keeps serving the other routes — see reports/todo-workspace-shell.md). It reuses
 * the `.t-f12` token layer (pastilles, fonts, F12Account) and touches no locked component:
 * the breadcrumb is drawn here from plain text (QUERYING / To-do), so the locked header
 * components are untouched.
 *
 * The ACTIVE-STATE LAW is parchment-only: an active nav item or filter row inverts to the soft
 * white card (#fdfcfa fill, #e0d6c6 hairline, whisper shadow, ink text, weight 700) — NEVER a
 * burgundy fill (asserted in todoWorkspaceShell.test.ts). Below --tsh-collapse the sidebar
 * folds to an icon rail (labels → tooltips; the FILTER section → a filter icon opening the
 * page's existing overlay).
 */
import React from "react";
import { F12Account } from "./F12Shell";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import "./todoShell.css";

export interface TodoNavItem {
  key: string;
  label: string;
  /** A decorative glyph (unicode or small node) — never load-bearing; the label carries meaning. */
  icon: React.ReactNode;
  /** Router path; the shell calls onNavigate(tab, sub?) via the resolver the caller passes. */
  onClick: () => void;
  /** Derived count shown right-aligned (Queries, To-do); omit for the rest. */
  count?: number;
}

export interface TodoFootItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export interface TodoShellProps {
  /** The WORKSPACE nav rows (Dashboard · Queries · Agents · To-do · Packages). */
  workspace: TodoNavItem[];
  /** Which workspace key is lit (always "todo" here, but the shell is route-agnostic). */
  activeKey: string;
  /** The FILTER section's rows — the page owns them so they carry all reactive behaviour. */
  filterSection: React.ReactNode;
  /** The foot rows (Task settings · Help centre). */
  foot: TodoFootItem[];
  /** The breadcrumb: parents (navigable) then the bold current page. */
  crumbParents?: { label: string; onClick: () => void }[];
  crumbCurrent: string;
  onAccount: () => void;
  /** The brand's home-route link (→ dashboard, mirroring the NavDrawer). */
  onBrand: () => void;
  /** Icon-rail mode (< --tsh-collapse): labels become tooltips, the filter section folds. */
  collapsed?: boolean;
  /** A focused session is opening/running: the sidebar slides off left, the search fades. */
  clearing?: boolean;
  /** In the icon rail, the filter icon opens the page's existing overlay. */
  onFilterIcon?: () => void;
  children: React.ReactNode;
}

export const TodoShell: React.FC<TodoShellProps> = ({
  workspace, activeKey, filterSection, foot, crumbParents = [], crumbCurrent,
  onAccount, onBrand, collapsed = false, clearing = false, onFilterIcon, children,
}) => (
  <div className={`t-f12 tsh-root${collapsed ? " tsh-collapsed" : ""}${clearing ? " tsh-clearing" : ""}`}>
    <aside className="tsh-nav" aria-label="Workspace navigation">
      {/* CENTRING/BRAND — the app's real mark + wordmark, at the NavDrawer's proportions,
          linking home; no fabricated glyphs. */}
      <button type="button" className="tsh-brand" onClick={onBrand} aria-label="ScriptAlly — go to dashboard">
        <img src="/scriptally-logo-new.png" alt="" aria-hidden="true" width={34} height={34} className="tsh-brandmark" />
        <span className="tsh-brandword"><ScriptAllyLogo heightPx={38} /></span>
      </button>

      <div className="tsh-nk" aria-hidden>WORKSPACE</div>
      <nav aria-label="Workspace">
        {workspace.map((n) => (
          <button
            key={n.key}
            type="button"
            className={`tsh-ni${n.key === activeKey ? " on" : ""}`}
            aria-current={n.key === activeKey ? "page" : undefined}
            title={collapsed ? n.label : undefined}
            onClick={n.onClick}
          >
            <span className="tsh-ic" aria-hidden>{n.icon}</span>
            <span className="tsh-nlab">{n.label}</span>
            {typeof n.count === "number" && <span className="tsh-n">{n.count}</span>}
          </button>
        ))}
      </nav>

      {/* The FILTER section: its rows are the page's, carrying counts, zero-dimming, the struck
          old totals and the active-search chip. Collapsed, it folds to a single filter icon
          that opens the page's existing overlay. */}
      <div className="tsh-nk tsh-filterhead" aria-hidden>FILTER</div>
      {collapsed ? (
        <button type="button" className="tsh-ni tsh-filtericon" title="Filter" aria-label="Filter" onClick={onFilterIcon}>
          <span className="tsh-ic" aria-hidden>⚲</span>
        </button>
      ) : (
        <div className="tsh-filter">{filterSection}</div>
      )}

      <div className="tsh-spacer" />

      {foot.map((f) => (
        <button key={f.key} type="button" className="tsh-ni" title={collapsed ? f.label : undefined} onClick={f.onClick}>
          <span className="tsh-ic" aria-hidden>{f.icon}</span>
          <span className="tsh-nlab">{f.label}</span>
        </button>
      ))}
    </aside>

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
        {/* CENTRING/SEARCH — the bar returns to breadcrumb + user; the search moved to the
            panel's items row. F12Account is pushed right by its own margin-left:auto. */}
        <F12Account onClick={onAccount} />
      </div>
      <div className="tsh-body">{children}</div>
    </div>
  </div>
);
