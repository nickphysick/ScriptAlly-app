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
 *
 * ⚠️ THE ROWS ARE PRESENTATION ONLY — every string they render is built in `lib/packagesOverview.ts`
 * and unit-locked there. A row that formatted its own detail line would be a second place for the
 * register and the analytics view to disagree about a number.
 */
import React from "react";
import { ManuscriptVersion, SubmissionPackage, Query } from "../../types";
import {
  materialRows, packageRows, trackingRows, packagedQueries, replyCount, howItWorks,
} from "../../lib/packagesOverview";
import "./packagesOverview.css";

export interface PackagesOverviewProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  /** Injected so every derived date is testable and the component holds no clock. */
  now?: number;
  /** Open the existing materials editor on a blank new material. */
  onAddMaterial: () => void;
  /** Open the existing materials editor on one material. */
  onOpenMaterial: (id: string) => void;
  /** Open a fresh package draft — the same signal the header's `New package` sends. */
  onNewPackage: () => void;
  /** Open one package for editing in the Workshop. */
  onOpenPackage: (id: string) => void;
  /** Reveal the existing analytics view — Tracking's only job. */
  onOpenTracking: () => void;
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

/**
 * The empty state — dashed, because dashed means provisional (D6).
 *
 * ⚠️ `onClick` IS OPTIONAL AND ITS ABSENCE CHANGES THE ELEMENT, not just the cursor. Tracking's
 * empty note explains what will happen; it is not an invitation, because there is nothing to click
 * — you make a reply arrive by sending a query, not by pressing this. So it renders as a plain
 * `div` with no pointer and no hover, rather than a button that does nothing.
 */
const Ghost: React.FC<{ title?: string; sub: string; onClick?: () => void }> = ({ title, sub, onClick }) =>
  onClick ? (
    <button type="button" className="pkgo-ghost" onClick={onClick}>
      {title && <span className="pkgo-gtitle">{title}</span>}
      <span className="pkgo-gsub">{sub}</span>
    </button>
  ) : (
    <div className="pkgo-ghost pkgo-ghost--inert">
      {title && <span className="pkgo-gtitle">{title}</span>}
      <span className="pkgo-gsub">{sub}</span>
    </div>
  );

export const PackagesOverview: React.FC<PackagesOverviewProps> = ({
  versions, packages, queries, now = Date.now(),
  onAddMaterial, onOpenMaterial, onNewPackage, onOpenPackage, onOpenTracking,
}) => {
  const mats = materialRows(versions, now);
  const pkgs = packageRows(packages, versions, queries);
  const track = trackingRows(packages, versions, queries);
  const live = packagedQueries(packages, queries).length;
  const replies = replyCount(packages, queries);
  const steps = howItWorks(versions.length, packages.length, live);

  return (
    <div className="pkgo-grid">
      <aside className="pkgo-rail" aria-label="Registers">
        <Panel label="Materials" chip={String(versions.length)} action={{ label: "+ ADD", onClick: onAddMaterial }}>
          {mats.length === 0 ? (
            <Ghost
              title="Add a material"
              sub="A covering letter, synopsis or sample — written here or pasted in."
              onClick={onAddMaterial}
            />
          ) : (
            <div className="pkgo-reg">
              {mats.map((m) => (
                <button key={m.id} type="button" className="pkgo-row" onClick={() => onOpenMaterial(m.id)}>
                  <span className="pkgo-type">{m.typeLabel}</span>
                  <span className="pkgo-name">{m.name}</span>
                  <span className="pkgo-detail">{m.detail}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel label="Packages" chip={String(packages.length)} action={{ label: "+ NEW", onClick: onNewPackage }}>
          {pkgs.length === 0 ? (
            <Ghost
              title="Build a package"
              sub="Pick one of each material. You'll need at least a covering letter first."
              onClick={onNewPackage}
            />
          ) : (
            <div className="pkgo-reg">
              {pkgs.map((p) => (
                <button key={p.id} type="button" className="pkgo-row" onClick={() => onOpenPackage(p.id)}>
                  <span className="pkgo-name">{p.name}</span>
                  {/* A package with every slot empty says nothing here rather than printing a blank
                      line — the row's own version of "absence omits itself". */}
                  {p.composition && <span className="pkgo-comp">{p.composition}</span>}
                  <span className="pkgo-detail">{p.sentLine}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* ⚠️ TRACKING CARRIES NO ACTION, deliberately — you do not "add" a reply. Its head is a
            label and, once anything has come back, a count; the rows beneath are the route to the
            existing analytics view, which is the whole of D1's "the rail replaces the tab strip". */}
        <Panel label="Tracking" chip={replies > 0 ? `${replies} ${replies === 1 ? "reply" : "replies"}` : undefined}>
          {track.length === 0 ? (
            <Ghost sub="Replies land here once a package goes out with a query." />
          ) : (
            <div className="pkgo-reg">
              {track.map((t) => (
                <button key={t.key} type="button" className="pkgo-row" onClick={onOpenTracking}>
                  <span className="pkgo-name">{t.name}</span>
                  <span className="pkgo-detail">{t.detail}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </aside>

      <div className="pkgo-stage">
        {/* Phase 3 — problem statement + how-it-works. `steps` is derived here so the stage and the
            rail's chips can only ever be the same counts. */}
        {steps.length > 0 ? null : null}
      </div>
    </div>
  );
};
