/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenSkeleton — the ghost shell shown while the dashboard's data resolves
 * (ref design-refs/dashboard-cappuccino-v33.html, `#skeleton`).
 *
 * ⚠️ IT REUSES THE REAL LAYOUT CLASSES — `os-content`, `os-grid`, `os-greet`, `os-colL`,
 * `os-toprow`, `os-colR` — RATHER THAN RESTATING THE GRID. That is the whole design of this file:
 * "a generic grid of grey rectangles is not acceptable — the point is that the layout does not jump
 * when data lands." A second copy of the grid would agree with the first on the day it was written
 * and drift the first time a column width moved, and it would drift SILENTLY, because nothing
 * renders both at once to compare.
 *
 * ⚠️ AND FROM v33 IT REUSES THE REAL CARD CLASSES TOO — `os-card`, `os-aut`, `os-lead`, `os-ahead`,
 * `os-lbody`, `os-chartwrap`, `os-tasks`, `os-th2`, `os-actv`, `os-comtile`. The class NAMES were
 * always reused; the BOXES were not. Every ghost card was a plain grey rectangle carrying a
 * hand-written height, so the paper, the hairline, the radius, the padding and — the expensive one
 * — the flex and aspect-ratio budgets that decide how tall the top row is were all restated or
 * missing. Wearing the real classes, the ghost's boxes ARE the page's boxes, and the only numbers
 * left in this file's CSS are the sizes of the grey blocks INSIDE them.
 *
 * ⚠️ THE GHOST'S FIVE MEASUREMENT HANDLES ARE `data-sk` ATTRIBUTES, NOT CLASSES — the same
 * reasoning `OneScreenPanel` states for `data-probe`: a class would have to be styled by something
 * to justify its existence, and an attribute is inert, so it can never be the reason a check
 * passes. They are `data-sk` rather than `data-probe` because the page underneath is MOUNTED and
 * carries its own `data-probe`s; two of each in one document is how the Phase 4 gate came to read
 * the real page settling beneath the cover and report a 60.7px jump nothing could move.
 *
 * ⚠️ IT IS AN OVERLAY, NOT A REPLACEMENT. The real page stays mounted underneath: the cards need
 * to exist for the entrance stagger to find them when the skeleton lifts, and keeping them means
 * "no layout shift" is true by construction rather than by matching numbers.
 */
import React from "react";

/** ⚠️ THE REF'S OWN FEED RHYTHM — `#skeleton .sk-r` alternates a centred day caption with event
 *  blocks at 96 / 86 / 110 / 96 / 86. A single repeated height reads as a list of identical rows,
 *  which is the one thing the activity column never is. */
const FEED: Array<"cap" | number> = ["cap", 96, 86, "cap", 110, 96, 86, "cap", 96, 86];

export const OneScreenSkeleton: React.FC<{
  /** Dissolving — mounted, on its way out, with the finished page live beneath it. */
  leaving?: boolean;
}> = ({ leaving = false }) => (
  /* aria-hidden: a screen reader is told nothing by a shape. The wait itself is announced by the
     page's live regions when the content lands. */
  <div className={`os-skelpage${leaving ? " out" : ""}`} aria-hidden="true">
    <div className="os-content">
      {/* ⚠️ `.os-grid` WAS MISSING, AND IT IS WHY THE GHOST WAS NEVER WHERE THE PAGE IS (v33,
          Phase 4). This file's own header said it reuses the real layout classes so the ghost
          "cannot be misaligned" — true of the class NAMES and false of the STRUCTURE. The page
          gained `.os-grid` between the hero and the columns; the skeleton never did, so `.os-colL`
          and `.os-colR` fell into `.os-content`'s flex COLUMN and stacked. Measured at 2520 before
          the fix: the activity ghost at x≈0 against a loaded column at x≈1860.
          Nothing compared the two until this pass built the gate that does. */}
      <div className="os-grid" data-sk="grid">
        <div className="os-colL">
          {/* ⚠️ THE HERO IS INSIDE THE LEFT COLUMN, as it is on the page (v26 moved it there and
              the ghost stayed behind). While it was a sibling of `.os-grid` the whole grid started
              94px low and both columns with it — measured Δy +98 on the activity ghost. */}
          <div className="os-greet">
            <div className="os-sk os-sk-h1" />
            <div className="os-sk os-sk-sub" />
            {/* ⚠️ THREE STAT ROWS, NOT ONE BLOCK (v33, Phase 4) — ref `.sk-stats`. The counters were
                a single 82px ghost, which is the shape of the box and says nothing about what is
                coming; an illustration square beside a label and a figure is what actually lands. */}
            <div className="os-sk-stats">
              {[0, 1, 2].map((i) => (
                <div className="os-sk-stat" key={i}>
                  <div className="os-sk os-sk-ill" />
                  <div>
                    <div className="os-sk os-sk-statlab" />
                    <div className="os-sk os-sk-statfig" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="os-toprow" data-sk="toprow">
            {/* the manuscript tile — ref `#skeleton .sk-top > .sk-card:first-child` */}
            <div className="os-card os-aut os-aut-compact os-sk-aut">
              <div className="os-sk os-sk-autpic" />
              <div className="os-sk os-sk-autttl" />
              <div className="os-sk-row">
                <div className="os-sk os-sk-autchip" />
                <div className="os-sk os-sk-autchip narrow" />
              </div>
              <div className="os-sk os-sk-autcap" />
            </div>
            {/* ⚠️ THE CHART GHOST IS THE CHART CARD'S OWN THREE BOXES — band, body, plot — because
                that is where the top row's height comes from. `.os-chartwrap` carries
                `aspect-ratio: 1000 / 330`, so the ghost's plot is as tall a fraction of its width
                as the real one at every width, with no number to keep in step. Stating a height
                here instead is what made the ghost row 60.7px short at 1536 and 3.3 at 1710. */}
            <div className="os-card os-lead">
              <div className="os-ahead">
                <div className="os-sk os-sk-chmark" />
                <div className="os-sk os-sk-chttl" />
                <div className="os-sk os-sk-chchips" />
                <div className="os-sk os-sk-chbrush" />
              </div>
              <div className="os-lbody">
                <div className="os-chartwrap os-sk os-sk-chplot" />
              </div>
            </div>
          </div>

          <div className="os-card os-tasks" data-sk="todo-card">
            <div className="os-th2">
              <div className="os-sk os-sk-tkmark" />
              <div className="os-sk os-sk-tkttl" />
              <div className="os-sk os-sk-tkbadge" />
              <div className="os-sk os-sk-tkall" />
            </div>
            {/* the to-do rule — one band the width of the card, in the card's own rule zone */}
            <div className="os-rulezone">
              <div className="os-sk os-sk-tkrule" />
            </div>
            {/* ⚠️ EIGHT TICKET BLOCKS IN THE CARD'S OWN GRID (v33, Phase 4) — ref `.sk-tickets`.
                ⚠️ AND IT IS `.os-tkgrid` ITSELF, NOT A COPY OF IT. The ghost restated
                `repeat(auto-fill, minmax(288px, 1fr))` for one pass and had ALREADY drifted: the
                real grid steps to `minmax(240px, 1fr)` below 1700 and the copy did not, so the
                ghost reflowed at a different width from the card it stands for. Exactly the fault
                this file's own header warns about, committed by the file. */}
            <div className="os-tkgrid">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div className="os-sk os-sk-ticket" key={i} />)}
            </div>
          </div>
        </div>

        <div className="os-colR">
          {/* ⚠️ NOT A CARD, AND THE GHOST MUST NOT BE ONE EITHER — `.os-actv` is a hairline column
              (`border-left`, 26px of padding, no paper). A grey rounded rectangle here drew a card
              where the page has none, so the loading state promised a container that never came. */}
          <div className="os-card os-actv" data-sk="activity-card">
            <div className="os-ahead">
              <div className="os-sk os-sk-acmark" />
              <div className="os-sk os-sk-acttl" />
              <div className="os-sk os-sk-account" />
            </div>
            <div className="os-sk-acfeed">
              {FEED.map((h, i) => (h === "cap"
                ? <div className="os-sk os-sk-acday" key={i} />
                : <div className="os-sk os-sk-acbub" style={{ height: h }} key={i} />))}
            </div>
          </div>
          <div className="os-card os-comtile" data-sk="community-tile">
            <div className="os-sk os-sk-comill" />
            <div className="os-sk-comtx">
              <div className="os-sk os-sk-comttl" />
              <div className="os-sk os-sk-comln" />
              <div className="os-sk os-sk-comln short" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
