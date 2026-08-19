/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackagesOverview — what the Submission packages route lands on: a page-local rail of three
 * registers (Materials · Packages · Tracking) beside a stage carrying the problem statement and the
 * how-it-works infographic.
 * Design authority: design-refs/submission-packages-restructure.html.
 *
 * ⚠️ THIS REPLACES THE TAB STRIP AS THE PAGE'S NAVIGATION, NOT THE EDITORS BEHIND IT. The Workshop
 * and Analytics surfaces are unchanged and still do all the real work; what changed is how you
 * reach them. `+ ADD`, `+ NEW`, the register rows and the Tracking rows all hand off to flows that
 * already existed — this component builds no editor, no composer and no analytics of its own.
 *
 * ⚠️ EVERY STATE HERE IS DERIVED AT READ TIME (D2). Empty versus in-use is `versions.length` and
 * `packages.length`; the infographic's progress is those two plus a count of queries that carry a
 * package. There is no `hasSeenOverview` flag, no stored step, and nothing this page writes.
 */
import React from "react";
import "./packagesOverview.css";

export interface PackagesOverviewProps {
  /** Rail — Materials register. */
  materialCount: number;
  /** Rail — Packages register. */
  packageCount: number;
  /** Open the existing materials editor (WorkshopTab's own, via the host's signal). */
  onAddMaterial: () => void;
  /** Open a fresh package draft — the same signal the header's `New package` sends. */
  onNewPackage: () => void;
}

/** One rail panel: sage head, mono label, derived count chip, optional outlined action. */
const Panel: React.FC<{
  label: string;
  chip?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}> = ({ label, chip, action, children }) => (
  <section className="pkgo-panel">
    <div className="pkgo-head">
      <span className="pkgo-lbl">{label}</span>
      <span className="pkgo-meta">
        {chip !== undefined && <span className="pkgo-chip">{chip}</span>}
        {action && (
          <button type="button" className="pkgo-add" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </span>
    </div>
    <div className="pkgo-body">{children}</div>
  </section>
);

export const PackagesOverview: React.FC<PackagesOverviewProps> = ({
  materialCount,
  packageCount,
  onAddMaterial,
  onNewPackage,
}) => (
  <div className="pkgo-grid">
    <aside className="pkgo-rail" aria-label="Registers">
      <Panel label="Materials" chip={String(materialCount)} action={{ label: "+ ADD", onClick: onAddMaterial }}>
        {null}
      </Panel>
      <Panel label="Packages" chip={String(packageCount)} action={{ label: "+ NEW", onClick: onNewPackage }}>
        {null}
      </Panel>
      {/* ⚠️ TRACKING CARRIES NO ACTION, deliberately — you do not "add" a reply. Its head is a label
          and, once anything has gone out, a count; the rows beneath are the route to the existing
          analytics view. */}
      <Panel label="Tracking">{null}</Panel>
    </aside>

    <div className="pkgo-stage">{null}</div>
  </div>
);
