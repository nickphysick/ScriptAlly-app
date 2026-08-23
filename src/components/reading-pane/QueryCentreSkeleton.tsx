/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE QUERY CENTRE'S LOAD (ref 174, second sheet) ══════════════════════════════════════════
 *
 * ⚠️ WHAT THIS REPLACES IS NOT A BARE SHELL — IT IS A FALSE STATEMENT. Between mount and the first
 * snapshot `queries` is `[]`, and the page's own `queries.length === 0` branch reads that as an
 * empty database: a returning writer with forty queries was shown "No queries yet" and "Your first
 * query starts here" for as long as the load took. The page had the flag to tell those apart
 * (`collectionsReady`) and did not consume it; the Dashboard already did.
 *
 * ⚠️ THE SKELETON IS THE LAYOUT AT REST, so nothing jumps when data lands. The list rows are the
 * REAL `.f12-row` class — not a copy of its geometry — so a row is 56px here because it is 56px
 * there, by construction rather than by a number transcribed into this file. The pane is
 * header-plus-two-cards, the shape every selected query resolves into.
 *
 * ⚠️ AND IT RESOLVES INTO THE UNSELECTED STATE, NEVER A SELECTION. That is now true by
 * construction too: §2 retired both auto-selects, so there is nothing left that could turn a load
 * into a chosen query.
 */
import React from "react";
import "./queryCentreSkeleton.css";

/** Measured on the deployed page, not guessed: `.f12-rows` is 422px tall, `.f12-row` is 56px. */
const SKELETON_ROWS = 7;

/**
 * ⚠️ THE MINIMUM THE SKELETON IS SHOWN FOR, ONCE IT HAS BEEN SHOWN AT ALL. Measured before this
 * landed, a fast load put the skeleton on screen for 109ms — long enough to see and too short to
 * read as anything but a glitch. The floor makes a fast load look deliberate and leaves a slow one
 * exactly as it was: the skeleton lasts as long as the data takes, never less than this.
 *
 * ⚠️ IT IS A FLOOR, NOT A DURATION. Nothing here shows a skeleton after the data has arrived on a
 * page that was ready at mount — that decision is made once, at the first render.
 */
export const SKELETON_FLOOR_MS = 400;

export interface QueryCentreSkeletonProps {
  /**
   * ⚠️ THE LIST'S REAL HEAD — the search and the Filter/Sort controls, passed in rather than drawn.
   * They act on state that exists without data, so there is nothing for them to wait for, and a
   * writer can start typing a search before the rows arrive. Drawing a skeleton block instead put a
   * DIFFERENT box where the 40px `.f12-lhead` goes, so everything below it shifted when data landed
   * — the exact jump a skeleton exists to prevent, built into the skeleton.
   */
  head?: React.ReactNode;
}

export const QueryCentreSkeleton: React.FC<QueryCentreSkeletonProps> = ({ head }) => (
  <div className="f12-body qc-skel" aria-busy="true" aria-live="polite">
    {/* the screen reader gets a sentence; the blocks below are decoration and say so */}
    <span className="qc-skel-sr">Loading your queries</span>

    {/* ⚠️ `aria-hidden` ON THE ROWS ONLY, never the head — the head is real, focusable chrome. */}
    <div className="f12-list">
      {head}
      <div className="f12-rows" aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          /* ⚠️ THE REAL ROW CLASS. Restating `height: 56px` here is how a skeleton comes to be a
             pixel out from the list it stands in — the row grid is the row grid. */
          <div className="f12-row qc-skel-row" key={i}>
            <span className="qc-sk qc-sk-dot" />
            <span className="qc-sk-lines">
              <span className="qc-sk qc-sk-l1" />
              <span className="qc-sk qc-sk-l2" />
            </span>
            <span className="qc-sk qc-sk-date" />
          </div>
        ))}
      </div>
      <div className="f12-lfoot" aria-hidden="true"><span className="qc-sk qc-sk-foot" /></div>
    </div>

    {/* the pane: a header, then two cards — the shape a selected query resolves into */}
    <div className="qc-pane-bare f12-detail qc-skel-pane" aria-hidden="true">
      <div className="qc-skel-head">
        <span className="qc-sk qc-sk-av" />
        <span className="qc-sk-lines">
          <span className="qc-sk qc-sk-h1" />
          <span className="qc-sk qc-sk-h2" />
        </span>
      </div>
      <div className="qc-skel-cards">
        <div className="qc-sk qc-sk-card" />
        <div className="qc-sk qc-sk-card" />
      </div>
    </div>
  </div>
);
