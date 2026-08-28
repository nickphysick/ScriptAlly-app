/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The packages page's tab rail — Packages · Builder · Tracking.
 * Reference: `design-refs/three-tabs.html`, `.tabsrow` / `.tab`.
 *
 * ⚠️ IT LIVES HERE RATHER THAN IN `shell/`, AND THAT IS A DECISION (F-BL). A primitive earns its
 * place from a SECOND caller, and there is one. `ManuscriptTabs` is the counter-example already in
 * the tree: a tab rail written for one page, typed to that page's key union, which nothing else can
 * use — promoted early, it would have been the same shape with a `shell/` path.
 *
 * ⚠️ TAB STATE IS NOW THE URL, WHICH SUPERSEDES THIS FILE'S OWN EARLIER LAW. It used to read "no
 * route, no URL param, no persistence… a tab that wrote to the URL would turn a within-page toggle
 * into navigation the shell must model". D3 reverses that deliberately, and the reason the old rule
 * gave is the reason the reversal is safe: the shell does NOT have to model it, because `?tab=` is a
 * search param on a route the shell already owns. What the writer gets is a tab that survives a
 * reload and a link that lands where it says — which a within-page toggle cannot give.
 */
import React from "react";
import "./packageTabs.css";

export type PackageTabKey = "packages" | "builder" | "tracking";

/** The reading order of the ref, and the order a writer meets them: what you have, what you make, how it went. */
export const PACKAGE_TABS: readonly PackageTabKey[] = ["packages", "builder", "tracking"];

export const TAB_LABEL: Record<PackageTabKey, string> = {
  packages: "Packages",
  builder: "Builder",
  tracking: "Tracking",
};

export interface PackageTabsProps {
  active: PackageTabKey;
  onChange: (key: PackageTabKey) => void;
  /**
   * The count beside each label, or **null to hide that tab entirely** (D2).
   *
   * ⚠️ ABSENT, NOT DISABLED. A writer setting up sees the tabs that have something behind them; a
   * greyed tab advertises a surface they cannot reach and invites them to wonder what they have
   * done wrong. Builder is never null — it is where a writer with nothing at all begins.
   */
  counts: Record<PackageTabKey, string | null>;
  /** The manuscript chip, rendered at the end of the row (D14). Absent until Part D. */
  end?: React.ReactNode;
}

export const PackageTabs: React.FC<PackageTabsProps> = ({ active, onChange, counts, end }) => (
  <div className="pkgt-row" role="tablist" aria-label="Submission packages">
    {PACKAGE_TABS.map((k) => (
      counts[k] === null ? null : (
        <button
          key={k}
          type="button" role="tab" id={`pkgt-tab-${k}`}
          aria-selected={active === k} aria-controls={`pkgt-panel-${k}`}
          className={`pkgt-tab${active === k ? " pkgt-tab--on" : ""}`}
          onClick={() => onChange(k)}
        >
          {TAB_LABEL[k]}
          {/* ⚠️ THE COUNT IS PART OF THE LABEL, so the other tabs are never a blind click (D1). */}
          <span className="pkgt-c">{counts[k]}</span>
        </button>
      )
    ))}
    {end && <span className="pkgt-end">{end}</span>}
  </div>
);
