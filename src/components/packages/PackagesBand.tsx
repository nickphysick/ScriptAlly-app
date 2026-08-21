/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The packages band — one card per package, plus the ghost that builds another.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.pkg-grid`).
 *
 * ⚠️ THE STAMP IS DERIVED FROM THE PACKAGE ID, NOT ITS POSITION (D7). An index-based choice
 * re-stamps every card below a deleted one, so archiving your first package would silently redraw
 * the rest — a change with no cause the writer can see. Nothing is stored: a `stamp` field would be
 * a decoration in the data model, and the first thing anyone would ask is why it cannot be chosen.
 *
 * ⚠️ AND THE BIN IS THE SAME `RemovePopover` THE SHEETS USE. A package nothing has been sent with is
 * deleted; one that has travelled is ARCHIVED, because it is the record of what went in an envelope
 * and a query still points at it. One component, one decision function, two record types.
 */
import React from "react";
import { ManuscriptVersion, Query, SubmissionPackage } from "../../types";
import { packageTiles, tileFooter, MISSING_SLOT } from "../../lib/packagesOverview";
import { packageStamp } from "../../lib/packageTracking";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

export interface PackagesBandProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  onOpenPackage: (id: string) => void;
  onNewPackage: () => void;
  /** Rendered per card when given — the archive/delete control. */
  renderRemove?: (pkg: SubmissionPackage) => React.ReactNode;
}

export const PackagesBand: React.FC<PackagesBandProps> = ({
  packages, versions, queries, onOpenPackage, onNewPackage, renderRemove,
}) => {
  const tiles = packageTiles(packages, versions, queries);
  const byId = new Map(packages.map((p) => [p.id, p]));

  return (
    <section className="pkgb-band" aria-labelledby="pkgb-pkg-h">
      <div className="pkgb-bandhead">
        <h2 id="pkgb-pkg-h">Your packages</h2>
        <span className="pkgb-tag">{packages.length} built</span>
      </div>

      <div className="pkgb-pkggrid">
        {tiles.map((t) => {
          const foot = tileFooter(t);
          const pkg = byId.get(t.id);
          return (
            <div key={t.id} className="pkgb-pkgcard" data-package={t.id}>
              <IllustrationSlot id={`stamp-${t.id}`} brief={packageStamp(t.id)} shape="stamp" tiny />
              <h3 className="pkgb-pkgname">
                <button type="button" className="pkgb-sopen" onClick={() => onOpenPackage(t.id)}>
                  {t.name}
                </button>
              </h3>
              <div className="pkgb-slots">
                {t.slots.map((sl) => (
                  <span key={sl.label} className="pkgb-slot">
                    <span className="pkgb-slt">{sl.label}</span>
                    {/* ⚠️ THREE STATES, THREE TREATMENTS. `Not included` is the writer's choice and
                        reads quiet; `No longer available` is a fact about the data and reads as a
                        fault, because it is one. They were one `null` until §3. */}
                    <span className={
                      sl.state === "held" ? "pkgb-sln"
                        : sl.state === "missing" ? "pkgb-sln pkgb-sln--gone"
                          : "pkgb-sln pkgb-sln--none"
                    }>
                      {sl.state === "empty" ? "Not included" : sl.name ?? MISSING_SLOT}
                    </span>
                  </span>
                ))}
              </div>
              <div className="pkgb-pkgfoot">
                {"idle" in foot ? (
                  <span className="pkgb-idle">{foot.idle}</span>
                ) : (
                  <>
                    <span className="pkgb-out">{foot.out}</span>
                    <span className="pkgb-in">{foot.replied}</span>
                    <span className="pkgb-in">{foot.requests}</span>
                  </>
                )}
                <span className="pkgb-footspacer" />
                {pkg && renderRemove?.(pkg)}
              </div>
            </div>
          );
        })}

        {/* The ghost is last, and it carries its own illustration slot per the ref. */}
        <button type="button" className="pkgb-ghost pkgb-pkgghost" onClick={onNewPackage}>
          <IllustrationSlot id="pkg-ghost" brief={"open parcel,\nempty"} width={64} height={64} tiny />
          <span className="pkgb-gt">Build another package</span>
          <span className="pkgb-gs">A different letter, a different length of synopsis.</span>
        </button>
      </div>
    </section>
  );
};
