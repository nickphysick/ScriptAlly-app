/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackageTabs — the Workshop · Analytics strip (ref design-refs/scriptally-packages-twotab.html).
 *
 * A sibling block beneath PageHeader, never inside it: PageHeader draws title + description + its own
 * closing rule and has no tabs slot (and the header law forbids adding a meta/tabs slot to it). Kept
 * as its own component only so the live host and the DEV harness mount the SAME strip rather than two
 * copies of it. Selection is the caller's state — deliberately not persisted anywhere.
 *
 * `tgt-analytics` rides the Analytics tab: the guided tour's third step used to point at the analytics
 * pane, which the two-tab restructure retires, so the tab is what it highlights now.
 */
import React from "react";

export type PackageTab = "workshop" | "analytics";

export const PackageTabs: React.FC<{
  tab: PackageTab;
  onTab: (t: PackageTab) => void;
}> = ({ tab, onTab }) => (
  <div className="pkgw-tabs" role="tablist" aria-label="Package Workshop views">
    <button
      type="button"
      role="tab"
      aria-selected={tab === "workshop"}
      className={`pkgw-tab${tab === "workshop" ? " on" : ""}`}
      onClick={() => onTab("workshop")}
    >
      Workshop
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={tab === "analytics"}
      id="tgt-analytics"
      className={`pkgw-tab${tab === "analytics" ? " on" : ""}`}
      onClick={() => onTab("analytics")}
    >
      Analytics
    </button>
  </div>
);
