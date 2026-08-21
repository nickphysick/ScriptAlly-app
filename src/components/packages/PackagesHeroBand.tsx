/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The broadsheet hero, as a BAND beneath the page header.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.hero`).
 *
 * ⚠️ IT IS NOT THE MASTHEAD, AND THAT IS NICK'S RULING (F-E, closed: this page CONFORMS). The
 * parallel session's standardisation holds — the page keeps their `PageHeader` with
 * `variant="workspace"`, the census in `workspacePageGrid.test.tsx` stays green by CONFORMING rather
 * than by gaining an entry, and no shared header file is edited or weakened. This band is everything
 * the ref's hero carried **except the page title**, rendered immediately beneath that header.
 *
 * ⚠️ NO `<h1>` AND NO SUBTITLE HERE. Both belong to `PageHeader` — the title as its `title`, the
 * subtitle as its `description` — and a band that repeated either would put the same words on screen
 * twice an inch apart, which is exactly what conforming was meant to avoid. The subtitle duplication
 * was visible in the first conformed screenshot and removed; what is left is the material the header
 * has no slot for: the derived stat line, the actions, and the blush panel.
 *
 * ⚠️ AND THE WAX SEAL IS NOT HERE EITHER — it went into `PageHeader`'s `titleAdornment`, which is an
 * existing prop taking arbitrary content (`titleAdornment?: React.ReactNode`, "rendered inline
 * immediately right of the title text"). That is the first branch of the ruling: a slot exists, so
 * the seal uses it and the standard Pro pill is NOT also rendered — one Pro marker, not two. No
 * shared file was changed to make that possible.
 *
 * ⚠️ IT DOES NOT COMPENSATE FOR THE WIDTH IT IS GIVEN. F6 remains the header session's; the band
 * fills whatever the shell hands it, with no negative margin and no inset arithmetic.
 */
import React from "react";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

export interface PackagesHeroBandProps {
  /** Derived counts for the stat line — never stored. */
  materials: number;
  packages: number;
  sent: number;
  /** The manuscript switcher, rendered by the host (it owns the menu's state). */
  manuscriptControl?: React.ReactNode;
  onNewPackage: () => void;
  /** Locked until there is at least one covering letter and one synopsis (flow pack D4). */
  canBuild: boolean;
}

export const PackagesHeroBand: React.FC<PackagesHeroBandProps> = ({
  materials, packages, sent, manuscriptControl, onNewPackage, canBuild,
}) => (
  <section className="pkgb-hero" aria-label="At a glance">
    <div className="pkgb-hero-l">
      {/* ⚠️ DERIVED AT READ TIME, like every count on this page. */}
      <p className="pkgb-statline">
        <b>{materials}</b> {materials === 1 ? "material" : "materials"} · <b>{packages}</b>{" "}
        {packages === 1 ? "package" : "packages"} · <b>{sent}</b> sent
      </p>
      <div className="pkgb-hero-actions">
        {/* The page's ONE filled control. Everything else on the page is an outline. */}
        <button
          type="button"
          className="pkgb-btn pkgb-btn--primary"
          onClick={onNewPackage}
          disabled={!canBuild}
        >
          ＋ New package
        </button>
        {manuscriptControl}
      </div>
    </div>
    <div className="pkgb-hero-r">
      <p className="pkgb-prob">Fed up of guessing which materials are landing with agents?</p>
      <IllustrationSlot
        id="hero"
        brief={"desk scene — letters sorted\ninto a wrapped parcel"}
      />
    </div>
  </section>
);
