/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenSkeleton — the ghost shell shown while the dashboard's data resolves (v16, 18 Sep).
 *
 * ⚠️ IT REUSES THE REAL LAYOUT CLASSES — `os-content`, `os-greet`, `os-row1`, `os-row2` and the cards'
 * own classes — RATHER THAN RESTATING THE GRID. That is the whole design of this file: "a generic grid
 * of grey rectangles is not acceptable — the point is that the layout does not jump when data lands."
 * A second copy of the grid would agree with the first on the day it was written and drift the first
 * time a column width moved, silently, because nothing renders both at once to compare.
 *
 * ⚠️ THE GHOST'S MEASUREMENT HANDLES ARE `data-sk` ATTRIBUTES, NOT CLASSES — the same reasoning
 * `OneScreenPanel` states for `data-probe`, and they are `data-sk` rather than `data-probe` because
 * the page underneath is MOUNTED and carries its own: two of each in one document is how a gate came
 * to read the real page settling beneath the cover and report a jump nothing could move.
 *
 * ⚠️ IT IS AN OVERLAY, NOT A REPLACEMENT. The real page stays mounted underneath, so "no layout shift"
 * is true by construction rather than by matching numbers.
 *
 * ⚠️ AND THE COUNTS ARE DERIVED FROM THE CONTAINER, NEVER WRITTEN DOWN. A hand-picked number of rows
 * left a void at the card's foot at one width and overflowed at another; the ghost renders one row,
 * measures it in a layout effect (before paint, so nothing flashes) and fills the port it is actually
 * standing in.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { CLOSED_BUCKETS, DONUT } from "../../lib/dashClosed";

/**
 * ⚠️ THE REF'S OWN FEED RHYTHM — a day caption, then entries of unequal height. A single repeated
 * height reads as a list of identical rows, which is the one thing an activity feed never is.
 */
const FEED: Array<"cap" | number> = ["cap", 74, 62, "cap", 84, 62, 74, "cap", 62, 74];

/** Fill a card's scroller with ghost rows of the height one of them actually renders at. */
const GhostRows: React.FC<{ className: string; sk: string }> = ({ className, sk }) => {
  const portRef = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(1);

  useLayoutEffect(() => {
    const port = portRef.current;
    if (!port) return undefined;
    const fit = () => {
      const row = port.firstElementChild as HTMLElement | null;
      if (!row) return;
      const h = row.getBoundingClientRect().height;
      if (h <= 0) return;
      setCount(Math.max(1, Math.floor(port.clientHeight / h)));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    /* ⚠️ THE PORT'S OWN BOX, WHICH CANNOT LOOP — the scroller is `flex: 1; min-height: 0`, so its
       height is the card's and is independent of what is put inside it. */
    const ro = new ResizeObserver(fit);
    ro.observe(port);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="os-scroll" ref={portRef} data-sk={sk}>
      {Array.from({ length: count }, (_, i) => <div className={`os-sk ${className}`} key={i} />)}
    </div>
  );
};

export const OneScreenSkeleton: React.FC<{
  /** Dissolving — mounted, on its way out, with the finished page live beneath it. */
  leaving?: boolean;
  /**
   * ⚠️ THE PAGE'S OWN HEADER, NOT A DRAWING OF IT (stage 1). The dashboard passes the same
   * `OneScreenHeader` it renders, with its probes off, so the cover's first row is the page's first
   * row to the pixel and the header never shimmers: a header waiting on data says its words without
   * figures. It is a slot rather than an import because the words need the writer's name.
   */
  header: React.ReactNode;
}> = ({ leaving = false, header }) => (
  /* aria-hidden: a screen reader is told nothing by a shape. `inert` as well, because the cover is no
     longer only shapes — the header it carries can hold a real button, and `aria-hidden` alone leaves
     a hidden control in the tab order. */
  <div className={`os-skelpage${leaving ? " out" : ""}`} aria-hidden="true" inert>
    <div className="os-content">
      {header}

      <div className="os-row1" data-sk="row1">
        {/* the quick actions — one ghost tile per action the card draws, never a number */}
        <div className="os-card os-qa" data-sk="quick-actions">
          <div className="os-hd"><div className="os-sk os-sk-ttl" /></div>
          <div className="os-qastack">
            {QUICK_ACTIONS.map((a) => <div className="os-sk os-sk-qatile" key={a.key} />)}
          </div>
        </div>

        {/* the chart — the mount's frame, its header row, the plot and the axis */}
        <div className="os-card os-lead" data-sk="chart-card">
          <div className="os-acframe">
            <div className="os-achead">
              <div className="os-acid"><div className="os-sk os-sk-acstat" /></div>
              <div className="os-sk os-sk-mini" />
            </div>
            <div className="os-aclegend"><div className="os-sk os-sk-legend" /></div>
            <div className="os-acbody">
              <div className="os-acplot os-sk os-sk-acplot" />
              {/* ⚠️ THE AXIS IS DRAWN, NOT LEFT EMPTY. An empty `.os-acx` is 0 tall where the real one
                  is 25.8, and the chart is the card that sets the row's height — so the ghost's whole
                  first row came up short and the page jumped when the cover lifted. */}
              <div className="os-acx"><div className="os-sk os-sk-acx" /></div>
            </div>
          </div>
        </div>

        {/* closed — the head, the ring's own box, and one ghost per bucket */}
        <div className="os-card os-cl" data-sk="closed-tile">
          <div className="os-hd"><div className="os-sk os-sk-ttl2" /><div className="os-sk os-sk-mini" /></div>
          <div className="os-clpie">
            <div className="os-sk os-sk-donut" style={{ width: DONUT.box * 0.94, height: DONUT.box * 0.94 }} />
          </div>
          <div className="os-clkey">
            {CLOSED_BUCKETS.map((b) => <div className="os-sk os-sk-clrow" key={b.key} />)}
          </div>
        </div>
      </div>

      <div className="os-row2" data-sk="row2">
        <div className="os-card os-feed" data-sk="activity-card">
          <div className="os-hd"><div className="os-sk os-sk-ttl2" /><div className="os-sk os-sk-mini" /></div>
          <div className="os-scroll" data-sk="feed">
            {FEED.map((h, i) => (h === "cap"
              ? <div className="os-sk os-sk-fday" key={i} />
              : <div className="os-sk os-sk-fent" style={{ height: h }} key={i} />))}
          </div>
        </div>

        <div className="os-card os-todo" data-sk="todo-card">
          <div className="os-hd"><div className="os-sk os-sk-ttl2" /><div className="os-sk os-sk-mini" /></div>
          <GhostRows className="os-sk-tdrow" sk="todo-rows" />
          <p className="os-tdfoot"><i className="os-sk os-sk-tdfoot" /></p>
        </div>
      </div>
    </div>
  </div>
);
