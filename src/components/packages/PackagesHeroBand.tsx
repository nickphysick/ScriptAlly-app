/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The hero, as a BAND beneath the page header.
 * Design authority: design-refs/submission-packages-recut-v2.html (`.hero`).
 *
 * ⚠️ RE-CUT, BECAUSE THE FIRST VERSION WAS A VOID (D2). Conforming moved the title and subtitle into
 * the shared `PageHeader` — correctly — and what was left of the ref's hero shipped unchanged: a
 * stat line and two buttons adrift in a wide white box, with the only content of any weight in a
 * blush panel on the right. Measured, its left column held 136px of ink in a 246px row. The fault
 * was never the alignment (top, centred, both were tried); it was that nothing had been PROMOTED to
 * fill the space the title left.
 *
 * ⚠️ SO THE PROBLEM STATEMENT IS NOW THE BAND'S HEADLINE. It moved out of the blush panel and became
 * the thing you read first — which is what the ref does, and what the band is for: the page title
 * says what this page is, the headline says why you would use it. The panel keeps the illustration
 * alone.
 *
 * ⚠️ STILL NO `<h1>` AND NO SUBTITLE. Both belong to `PageHeader`, and a band repeating either would
 * put the same words on screen twice an inch apart — the duplication the first conformed screenshot
 * caught. The headline is not the subtitle: it is the Caveat question, which the header has no slot
 * for and never carried.
 *
 * ⚠️ AND NO PRO MARKER (D1). The wax seal is deleted with its styles and nothing replaces it here.
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
      {/* The band's headline — the ref's Caveat question, promoted out of the blush panel. */}
      <p className="pkgb-prob">Fed up of guessing which materials are landing with agents?</p>
      <p className="pkgb-say">
        Every package keeps its own scorecard. ScriptAlly records{" "}
        <b>which letter, synopsis and pages went to each agent</b> — so the answer sits on the page,
        not in your head.
      </p>
      <div className="pkgb-hero-foot">
        {/* The page's ONE filled control. Everything else on the page is an outline. */}
        <button
          type="button"
          className="pkgb-btn pkgb-btn--primary"
          onClick={onNewPackage}
          disabled={!canBuild}
        >
          ＋ New package
        </button>
        {/* ⚠️ A RULE, NOT A GAP. The stat line is a different KIND of thing from the button beside
            it — one acts, one reports — and 16px of air reads as "these go together". */}
        <span className="pkgb-hero-rule" aria-hidden="true" />
        {/* ⚠️ DERIVED AT READ TIME, like every count on this page. */}
        <span className="pkgb-statline">
          <b>{materials}</b> {materials === 1 ? "material" : "materials"} · <b>{packages}</b>{" "}
          {packages === 1 ? "package" : "packages"} · <b>{sent}</b> sent
        </span>
        {manuscriptControl}
      </div>
    </div>
    {/* ⚠️ THE ONLY BLUSH SURFACE IN THE BAND — the container itself is white. A blush half against a
        white half made the band read as two panes rather than one object. */}
    <IllustrationSlot id="hero" icon="desk" px={92} />
  </section>
);
