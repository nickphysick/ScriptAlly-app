/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The packages page's tab rail — Builder and Tracking.
 * Reference: `design-refs/packages-tabs.html` and `builder-refined.html`, `.tabsrow` / `.tab`.
 *
 * ⚠️ IT LIVES HERE RATHER THAN IN `shell/`, AND THAT IS A DECISION (F-BL). A primitive earns its
 * place from a SECOND caller, and there is one. `ManuscriptTabs` is the counter-example already in
 * the tree: a tab rail written for one page, typed to that page's key union, which nothing else can
 * use — promoted early, it would have been the same shape with a `shell/` path. If a third surface
 * wants tabs, the two get reconciled then, against two real sets of requirements rather than one
 * and a guess.
 *
 * ⚠️ TAB STATE IS LOCAL — no route, no URL param, no persistence, the same law `ManuscriptTabs`
 * states. This component is controlled and holds nothing.
 */
import React from "react";
import "./packageTabs.css";

export type PackageTabKey = "builder" | "tracking";

export interface PackageTabsProps {
  active: PackageTabKey;
  onChange: (key: PackageTabKey) => void;
  /** `3 · 8` — packages built, then everything in the rail. */
  builderCount: string;
  /**
   * `18 sent`, or **null when nothing has been sent** — which is what makes the Tracking tab absent
   * rather than empty (D3).
   *
   * ⚠️ ABSENT, NOT DISABLED. A writer setting up sees one tab and no seam; a greyed second tab
   * advertises a surface they cannot reach and invites them to wonder what they have done wrong.
   * The tab appears the moment it has something to say.
   */
  trackingCount: string | null;
}

export const PackageTabs: React.FC<PackageTabsProps> = ({
  active, onChange, builderCount, trackingCount,
}) => (
  <div className="pkgt-row" role="tablist" aria-label="Submission packages">
    <button
      type="button" role="tab" id="pkgt-tab-builder"
      aria-selected={active === "builder"} aria-controls="pkgt-panel-builder"
      className={`pkgt-tab${active === "builder" ? " pkgt-tab--on" : ""}`}
      onClick={() => onChange("builder")}
    >
      Builder
      {/* ⚠️ THE COUNT IS PART OF THE LABEL, so the other tab is never a blind click (D2). */}
      <span className="pkgt-c">{builderCount}</span>
    </button>
    {trackingCount !== null && (
      <button
        type="button" role="tab" id="pkgt-tab-tracking"
        aria-selected={active === "tracking"} aria-controls="pkgt-panel-tracking"
        className={`pkgt-tab${active === "tracking" ? " pkgt-tab--on" : ""}`}
        onClick={() => onChange("tracking")}
      >
        Tracking
        <span className="pkgt-c">{trackingCount}</span>
      </button>
    )}
  </div>
);
