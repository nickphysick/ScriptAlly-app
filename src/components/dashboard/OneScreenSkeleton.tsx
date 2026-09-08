/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenSkeleton — the ghost shell shown while the dashboard's data resolves (ref
 * design-refs/dashboard-audit.html, `.skel`).
 *
 * ⚠️ IT REUSES THE REAL LAYOUT CLASSES — `os-content`, `os-greet`, `os-gl`, `os-colL`, `os-toprow`,
 * `os-colR` — RATHER THAN RESTATING THE GRID. That is the whole design of this file, and it is
 * what the pack is actually asking for: "a generic grid of grey rectangles is not acceptable — the
 * point is that the layout does not jump when data lands." A second copy of the grid would agree
 * with the first on the day it was written and drift the first time a column width moved, and it
 * would drift SILENTLY, because nothing renders both at once to compare. Reusing the rules means
 * the ghost cannot be misaligned: it is positioned by the same declarations as the thing it
 * stands for.
 *
 * ⚠️ SO ONLY THE BLOCKS' OWN SIZES LIVE IN THIS FILE'S CSS, and each is the measured height of the
 * card it covers, not a guess (see `--os-sk-counters-h` and `--os-sk-goal-h` in oneScreen.css).
 *
 * ⚠️ IT IS AN OVERLAY, NOT A REPLACEMENT. The real page stays mounted underneath: the cards need
 * to exist for the entrance stagger to find them when the skeleton lifts, and keeping them means
 * "no layout shift" is true by construction rather than by matching numbers.
 */
import React from "react";

export const OneScreenSkeleton: React.FC<{
  /** Dissolving — mounted, on its way out, with the finished page live beneath it. */
  leaving?: boolean;
}> = ({ leaving = false }) => (
  /* aria-hidden: a screen reader is told nothing by a shape. The wait itself is announced by the
     page's live regions when the content lands. */
  <div className={`os-skelpage${leaving ? " out" : ""}`} aria-hidden="true">
    <div className="os-content">
      <div className="os-greet">
        <div className="os-gl">
          <div className="os-sk os-sk-h1" />
          <div className="os-sk os-sk-sub" />
          <div className="os-sk-pills">
            <div className="os-sk os-sk-pill" />
            <div className="os-sk os-sk-pill narrow" />
          </div>
        </div>
        <div className="os-sk os-sk-counters" />
      </div>

      {/* ⚠️ TWO COLUMNS AND A TOP ROW, MATCHING THE PAGE BENEATH (ref v22, Phase 3). The ghosts
          read the real layout classes, so a column width, a gap or a row that moves in the page
          moves here with it — the point of this file, and the reason the skeleton had to be part
          of the layout change rather than a follow-up. The goals ghost is retired with its card;
          Community's is now the strip beneath both columns. */}
      <div className="os-colL">
        <div className="os-toprow">
          <div className="os-sk os-sk-card os-sk-aut" />
          <div className="os-sk os-sk-card os-sk-chart" />
        </div>
        <div className="os-sk os-sk-tasks" />
      </div>

      <div className="os-colR">
        <div className="os-sk os-sk-actv" />
      </div>
      <div className="os-sk os-sk-comstrip" />
    </div>
  </div>
);
