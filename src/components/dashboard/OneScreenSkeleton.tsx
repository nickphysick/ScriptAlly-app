/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenSkeleton — the ghost shell shown while the dashboard's data resolves
 * (ref design-refs/dashboard-cappuccino-v34.html, `#skeleton`).
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
import React, { useLayoutEffect, useRef, useState } from "react";
import { EdgeFadeScroll } from "../EdgeFadeScroll";

/** ⚠️ THE REF'S OWN FEED RHYTHM — `#skeleton .sk-r` alternates a centred day caption with event
 *  blocks at 96 / 86 / 110 / 96 / 86. A single repeated height reads as a list of identical rows,
 *  which is the one thing the activity column never is. */
const FEED: Array<"cap" | number> = ["cap", 96, 86, "cap", 110, 96, 86, "cap", 96, 86];

/**
 * ⚠️ THE COUNT IS DERIVED FROM THE CONTAINER, NEVER WRITTEN DOWN (v34, Phase 3).
 *
 * It was `[0,1,2,3,4,5,6,7].map(...)` — eight blocks, at every width, chosen by hand. The loaded
 * card shows 15 / 15 / 12 / 10 whole tickets at 1536 / 1710 / 1920 / 2520, so the cover stopped
 * short by seven at the narrow end and left a void at the card's foot that the real card fills.
 *
 * ⚠️ AND THE CONTAINER HAD TO BE THE SAME CONTAINER FIRST, WHICH IS THE REAL FAULT THIS FIXES.
 * The ghost put `.os-tkgrid` DIRECTLY IN THE CARD; the real card puts it inside an
 * `EdgeFadeScroll` — `.os-tbodywrap` > `.os-tbody`, and `.os-tbody` carries `padding: 6px 18px
 * 10px`. Those two 18px insets are 36px the ghost's grid did not have, and `auto-fill` resolves
 * against the container's width: measured, the ghost resolved FOUR columns at 1920 and SIX at 2520
 * where the real card resolves THREE and FIVE. The cover was laying out a differently-shaped grid
 * from the card it stands for, at half the widths we measure, and no gate asked.
 *
 * ⚠️ SO IT MOUNTS THE REAL `EdgeFadeScroll` RATHER THAN TWO DIVS WEARING ITS CLASS NAMES. That
 * component supplies `flex: 1 1 auto`, `min-height: 0` and `overflow-y: auto` as INLINE styles;
 * restating them here would put three declarations in this file that have to be kept in step with
 * a component nobody would think to check. Same argument as wearing `.os-tkgrid` itself.
 *
 * ⚠️ THE TILE HEIGHT IS READ OFF A RENDERED TILE, NOT TYPED. The first pass renders exactly one
 * block so there is something to measure; `useLayoutEffect` runs BEFORE paint, so the corrected
 * count is on screen in the same frame and nothing flashes. A number here would be a restated
 * value of the kind this file's own header warns about — and `.os-sk-ticket` was 82px against a
 * real ticket of 75.8, which is that drift already committed.
 *
 * ⚠️ THE OBSERVER WATCHES THE PORT'S OWN BOX, AND THAT CANNOT LOOP. `.os-tbodywrap` is `flex: 1;
 * min-height: 0`, so the scrollport's height is set by the card and is independent of what is
 * inside it — adding blocks cannot change the measurement that decided how many to add. (The
 * standing warning about a `ResizeObserver` on a scroller is the opposite case: it says nothing
 * when the CONTENT grows, which is exactly the reading we do not want.)
 */
const SkeletonTicketGrid: React.FC = () => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(1);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const port = grid?.parentElement;
    if (!grid || !port) return undefined;

    const fit = () => {
      const probe = grid.firstElementChild as HTMLElement | null;
      if (!probe) return;
      const gs = getComputedStyle(grid);
      const ps = getComputedStyle(port);
      const tile = probe.getBoundingClientRect().height;
      if (!tile) return;
      const cols = gs.gridTemplateColumns.split(" ").filter(Boolean).length;
      const rowGap = parseFloat(gs.rowGap) || 0;
      const avail = port.clientHeight - parseFloat(ps.paddingTop) - parseFloat(ps.paddingBottom)
        - parseFloat(gs.paddingBottom);
      const rows = Math.max(1, Math.floor((avail + rowGap) / (tile + rowGap)));
      setCount(cols * rows);
    };

    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(port);
    return () => ro.disconnect();
  }, []);

  return (
    <EdgeFadeScroll fade="#fffdf9" outerClassName="os-tbodywrap" scrollClassName="os-tbody">
      <div className="os-tkgrid" ref={gridRef}>
        {Array.from({ length: count }, (_, i) => <div className="os-sk os-sk-ticket" key={i} />)}
      </div>
    </EdgeFadeScroll>
  );
};

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
            {/* ⚠️ THE CARD'S OWN GRID, IN THE CARD'S OWN SCROLLER, AT A COUNT DERIVED FROM BOTH —
                ref `.sk-tickets`, and see `SkeletonTicketGrid` above for what each of those three
                words had to be fixed to make the next one mean anything. `.os-tkgrid` ITSELF, not a
                copy of it: the ghost restated `repeat(auto-fill, minmax(288px, 1fr))` for one pass
                and had ALREADY drifted, because the real grid steps to `minmax(240px, 1fr)` below
                1700 and the copy did not. */}
            <SkeletonTicketGrid />
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
