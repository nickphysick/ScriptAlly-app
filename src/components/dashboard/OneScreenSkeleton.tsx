/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenSkeleton — the ghost shell shown while the dashboard's data resolves
 * (ref design-refs/dashboard-cappuccino-v34.html, `#skeleton`).
 *
 * ⚠️ IT REUSES THE REAL LAYOUT CLASSES — `os-content`, `os-greet`, `os-bd`, `os-row2`, `os-grid`,
 * `os-colL`, `os-colR` (the rows of stages 2–3, 17 Sep) — RATHER THAN RESTATING THE GRID. That is the whole design of this file:
 * "a generic grid of grey rectangles is not acceptable — the point is that the layout does not jump
 * when data lands." A second copy of the grid would agree with the first on the day it was written
 * and drift the first time a column width moved, and it would drift SILENTLY, because nothing
 * renders both at once to compare.
 *
 * ⚠️ AND FROM v33 IT REUSES THE REAL CARD CLASSES TOO — today `os-card`, `os-qa`, `os-qalist`,
 * `os-lead`, `os-achead`, `os-acplot`, `os-cl`, `os-clrows`, `os-tasks`, `os-th2`, `os-actv`, `os-comtile`. The class NAMES were
 * always reused; the BOXES were not. Every ghost card was a plain grey rectangle carrying a
 * hand-written height, so the paper, the hairline, the radius, the padding and — the expensive one
 * — the flex and aspect-ratio budgets that decide how tall the top row is were all restated or
 * missing. Wearing the real classes, the ghost's boxes ARE the page's boxes, and the only numbers
 * left in this file's CSS are the sizes of the grey blocks INSIDE them.
 *
 * ⚠️ THE GHOST'S MEASUREMENT HANDLES ARE `data-sk` ATTRIBUTES, NOT CLASSES — the same
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
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { CLOSED_BUCKETS } from "../../lib/dashClosed";

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
      /* ⚠️ THE GRID'S OWN BOTTOM PADDING IS NOT SUBTRACTED (17 Sep). It sits at the END of the
         scrolled content. When the card holds more tickets than fit (the only case where the space
         decides how many rows show), that padding is below the fold and a row may end anywhere
         down to the scrollport's foot.
         Subtracting it drew one row short whenever the spare space was under 18px: at 1920, once
         the stage-1 header had taken 64px from the card, 13px were spare and the cover left a
         101px void where the card shows a fourth row. The skeleton gate's ticketFill caught it. */
      const avail = port.clientHeight - parseFloat(ps.paddingTop) - parseFloat(ps.paddingBottom);
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
  /**
   * ⚠️ THE PAGE'S OWN HEADER, NOT A DRAWING OF IT (stage 1). The dashboard passes the same
   * `OneScreenHeader` it renders, with its probes off, so the cover's first row is the page's first
   * row to the pixel and the header never shimmers: the brief is that a header waiting on data says
   * its words without figures. It is a slot rather than an import because the words need the
   * writer's name, which only the page has.
   */
  header: React.ReactNode;
  /**
   * ⚠️ AND THE PAGE'S OWN BREAKDOWN, IN ITS GHOST MODE (stage 2) — the section heading keeps its words
   * and the manuscript's title; the figures, pills and fact lines are shimmer blocks in the columns'
   * own boxes. A slot for the same reason as the header: the title is the page's.
   */
  breakdown: React.ReactNode;
}> = ({ leaving = false, header, breakdown }) => (
  /* aria-hidden: a screen reader is told nothing by a shape. The wait itself is announced by the
     page's live regions when the content lands.
     ⚠️ AND `inert`, because the cover is no longer only shapes: the header it carries can hold a
     real button, and `aria-hidden` alone leaves a hidden control in the tab order. */
  <div className={`os-skelpage${leaving ? " out" : ""}`} aria-hidden="true" inert>
    {/* ⚠️ THE SAME FOUR ROWS AS THE PAGE (stages 2–3, 17 Sep), wearing the page's own row and card
        classes, so every width, gap and padding is declared once — in the page's rules — and the
        ghost cannot be laid out differently from the thing it stands for. */}
    <div className="os-content">
      {header}
      {breakdown}

      <div className="os-row2" data-sk="row2">
        {/* the quick actions — the hero button's box, then four action rows and the foot */}
        <div className="os-card os-qa" data-sk="quick-actions">
          <div className="os-sk os-sk-qahero" />
          <div className="os-qalist">
            {/* one ghost per action the card draws — the card's own list, counted, never a number */}
            {QUICK_ACTIONS.map((a) => <div className="os-sk os-sk-qaitem" key={a.key} />)}
          </div>
          <div className="os-qafoot"><div className="os-sk os-sk-qafoot" /></div>
        </div>
        {/* the chart — its header row (the hawk's box sets its height), then the plot and its labels */}
        <div className="os-card os-lead" data-sk="chart-card">
          <div className="os-achead">
            <div className="os-acid">
              <div className="os-sk os-sk-acart" />
              <div className="os-sk os-sk-acstat" />
            </div>
            <div className="os-sk os-sk-actog" />
          </div>
          <div className="os-acbody">
            <div className="os-acplot os-sk os-sk-acplot" />
            <div className="os-acx" />
          </div>
        </div>
        {/* the closed tile — heading, headline, four rows, foot */}
        <div className="os-card os-cl" data-sk="closed-tile">
          <div className="os-clhd"><div className="os-sk os-sk-clttl" /></div>
          <div className="os-clhead"><div className="os-sk os-sk-clhead" /></div>
          <div className="os-clrows">
            {CLOSED_BUCKETS.map((b) => <div className="os-sk os-sk-clrow" key={b.key} />)}
          </div>
          <p className="os-clfoot"><i className="os-sk os-sk-clfoot" /></p>
        </div>
      </div>

      <div className="os-grid" data-sk="grid">
        <div className="os-colL">
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
                see `SkeletonTicketGrid` above for what each of those three words had to be fixed to
                make the next one mean anything. `.os-tkgrid` ITSELF, never a copy of it. */}
            <SkeletonTicketGrid />
          </div>
        </div>

        <div className="os-colR">
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
