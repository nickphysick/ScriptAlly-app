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
import { isPackageLocked, LOCKED_NOTE, LOCKED_WHY } from "../../lib/packageMetrics";
import { packageStamp } from "../../lib/packageTracking";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

export interface PackagesBandProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  onOpenPackage: (id: string) => void;
  onNewPackage: () => void;
  /**
   * ⚠️ THE WAY FORWARD FROM A LOCKED PACKAGE (D-D2), AND IT SHIPS WITH THE LOCK. Without it the rule
   * is a dead end — the writer wanted a different combination and the app just refuses.
   */
  onDuplicatePackage?: (id: string) => void;
  /** Rendered per card when given — the archive/delete control. */
  renderRemove?: (pkg: SubmissionPackage) => React.ReactNode;
  /**
   * ⚠️ A RENDER PROP, following `renderRemove`'s own pattern (§3, ref 177 right panel). The derived
   * tracking block needs the page's agent lookup and its navigation, neither of which belongs to
   * this band — so the band says WHERE it goes and the page says what it is.
   */
  renderTracking?: (pkg: SubmissionPackage) => React.ReactNode;
}

export const PackagesBand: React.FC<PackagesBandProps> = ({
  packages, versions, queries, onOpenPackage, onNewPackage, onDuplicatePackage, renderRemove, renderTracking,
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
              <IllustrationSlot id={`stamp-${t.id}`} icon={packageStamp(t.id)} px={36} shape="stamp" />
              <h3 className="pkgb-pkgname">
                <button type="button" className="pkgb-sopen" onClick={() => onOpenPackage(t.id)}>
                  {t.name}
                </button>
              </h3>
              {/**
                * ⚠️ THE LOCK IS VISIBLE WHERE THE EDITING HAPPENS (D-D3), and that is the whole
                * point of putting it on the card rather than only in the refusal. The reported
                * fault — edited the package, query unchanged, no feedback — was SILENCE, not a bug:
                * nothing on the page said a sent package cannot change, so the app looked broken
                * rather than principled.
                *
                * ⚠️ AND THE WAY ON SITS IN THE SAME BREATH. A note that states a refusal and offers
                * nothing is where a writer stops; `Duplicate & edit` is what the rule costs them,
                * and it belongs beside the sentence that imposes it.
                */}
              {pkg && isPackageLocked(pkg) && (
                <div className="pkgb-locked">
                  <span className="pkgb-locked-note">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    {LOCKED_NOTE}
                  </span>
                  <span className="pkgb-locked-why">{LOCKED_WHY}</span>
                  {onDuplicatePackage && (
                    <button type="button" className="pkgb-dup" onClick={() => onDuplicatePackage(t.id)}>
                      Duplicate &amp; edit
                    </button>
                  )}
                </div>
              )}
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
                {/* ⚠️ THE FREE-TEXT LINE, AND ONLY WHEN IT IS FILLED (D-B3). The three rows above
                    always render, because "considered and left out" is a fact about the package's
                    shape. There is no such fact about free text, so an empty Other is simply not a
                    row — a permanent blank one would make every package look unfinished.

                    ⚠️ AND IT IS VISUALLY A NOTE, NOT A FOURTH MATERIAL. Caveat, in burgundy: the
                    same hand the page already uses for the writer's own words. It reads as
                    something typed rather than something chosen, which is exactly what it is — and
                    it is why nothing counts it, ranks it, or offers it in a dropdown. */}
                {t.other && (
                  <span className="pkgb-slot">
                    <span className="pkgb-slt">Other</span>
                    <span className="pkgb-sln pkgb-sln--other">{t.other}</span>
                  </span>
                )}
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
              {/* §3 — the derived tracking block, beneath the card's own foot. */}
              {pkg && renderTracking?.(pkg)}
            </div>
          );
        })}

        {/* The ghost is last, and it carries its own illustration slot per the ref. */}
        <button type="button" className="pkgb-ghost pkgb-pkgghost" onClick={onNewPackage}>
          <IllustrationSlot id="pkg-ghost" icon="parcelOpen" px={54} />
          <span className="pkgb-gt">Build another package</span>
          <span className="pkgb-gs">A different letter, a different length of synopsis.</span>
        </button>
      </div>
    </section>
  );
};
