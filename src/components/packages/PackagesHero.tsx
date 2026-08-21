/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The broadsheet hero — this page's masthead.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.hero`).
 *
 * ⚠️ IT IS PAGE-LOCAL BY CONSTRUCTION, AND THAT IS THE CONCURRENCY BOUNDARY. A parallel session owns
 * the shared masthead shell; this component is passed as the grid's existing `masthead` node — a
 * public `ReactNode` prop — so `PageHeader`, `pageHeader.css`, `WorkspacePageGrid` and
 * `workspacePageGrid.css` are untouched. Nothing here reads or compensates for `--header-inset`:
 * the hero fills whatever width the shell hands it.
 *
 * ⚠️ IT DIVERGES FROM THE SHARED PAGE-HEADER PATTERN ON PURPOSE, AND THAT NEEDS A RULING (F-E). The
 * masthead slot's new contract says *identity only — no actions*, and the parallel session has moved
 * every page's buttons into a sticky control row. The broadsheet ref puts this page's actions and
 * its stat line **in the hero**. Both cannot be true, and keeping both would state the same two
 * things twice a few inches apart. The ref is built as specified and the divergence is flagged
 * rather than pre-empted — see F-E. If the ruling goes the other way, the fix is to lift
 * `actions` and `statline` out of here and back into the grid's `toolbar`.
 */
import React from "react";
import { IllustrationSlot, WaxSeal } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

export interface PackagesHeroProps {
  /**
   * ⚠️ REQUIRED BY THE GRID, AND RENDERED FROM THE SAME PROP — not a duplicate literal.
   *
   * `WorkspacePageGrid` introspects its `masthead` element for a `title` prop and THROWS in
   * development without one: its folded mini bar states the page's name and reads it off the
   * masthead rather than being handed it twice, so the two can never disagree. The error text names
   * `PageHeader` as the way to satisfy that, but the check is `masthead.props.title` — so a
   * page-local masthead honours the contract simply by exposing the prop, which is what this does.
   * The `<h1>` below renders THIS value, so the bar and the hero are one string.
   */
  title: string;
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

export const PackagesHero: React.FC<PackagesHeroProps> = ({
  title, materials, packages, sent, manuscriptControl, onNewPackage, canBuild,
}) => (
  <header className="pkgb-hero">
    <div className="pkgb-hero-l">
      <div className="pkgb-titlerow">
        {/* ⚠️ PLAIN PLAYFAIR INK. The burgundy-italic accent word is banned app-wide. */}
        <h1>{title}</h1>
        <WaxSeal />
      </div>
      <p className="pkgb-hero-sub">
        Bundle your materials once, then send them without rebuilding each time.
      </p>
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
  </header>
);
