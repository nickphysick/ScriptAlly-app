/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's loading bones for the three live views (the well round, §4).
 *
 * ⚠️ IT MIRRORS THE REAL CARD'S CLASS TREE RATHER THAN MATCHING ITS NUMBERS. Every box here is a
 * `.qcc-*` the loaded card also renders, with a `.qcs` modifier that paints it and empties it —
 * so the height, the gaps and the column tracks come from `queryCard.css` itself. A skeleton
 * built from its own measurements agrees with the card until somebody edits one of them, and the
 * jump it then causes is the exact fault a skeleton exists to prevent. This one cannot drift:
 * there is one set of dimensions and both states read it.
 *
 * ⚠️ THE BONES ARE HIDDEN FROM ASSISTIVE TECH AND THE WELL SAYS `aria-busy`. A screen reader gets
 * "loading" once from the live region, not a description of eleven grey rectangles.
 *
 * ⚠️ NO SPINNER, ANYWHERE. A spinner says "something is happening"; a skeleton says "this is what
 * is coming, and here is where it will be" — which is the whole reason the geometry matters.
 */
import React from "react";
import "./queryGridSkeleton.css";

/** one card's bones — the loaded card's own anatomy, emptied */
const Bone: React.FC = () => (
  <span className="qcc qcs" aria-hidden="true">
    {/* ⚠️ THE BAND NEEDS CONTENT-HEIGHT OF ITS OWN. Its class supplies the padding and nothing
        else — measured, an empty band was 26px against the loaded 51, because the real one is
        sized by a 24px StatusDot beside two lines of type. Reusing a class is not the same as
        reusing a height when the class does not set one. */}
    <span className="qcc-band qcs-band"><span className="qcs-bandfill" /></span>
    <span className="qcc-body">
      <span className="qcc-who">
        <span className="qcc-chip qcs-b" />
        <span className="qcc-whotx">
          <span className="qcs-l" style={{ width: "62%" }} />
          <span className="qcs-l" style={{ width: "40%" }} />
        </span>
        <span className="qcc-leaf qcs-b qcs-leaf" />
      </span>
      {/* ⚠️ NO SEPARATE RULE ELEMENT: `.qcc-fact` CARRIES THE HAIRLINE ITSELF, as a border-top
          with its own margin and padding. The first draft drew a `.qcs-rule` as well and was
          still 37px SHORT of the loaded card — a double rule and a missing row at once, which is
          what happens when a skeleton is assembled from a description of the card instead of from
          the card. The materials row is the missing one; it sits inside the fact. */}
      <span className="qcc-fact">
        <span className="qcc-facttx">
          <span className="qcs-l" style={{ width: "54%" }} />
          <span className="qcs-l" style={{ width: "36%" }} />
        </span>
        <span className="qcc-mats">
          {[...Array(4)].map((_, i) => <span key={i} className="qcc-ic qcs-b" />)}
        </span>
      </span>
    </span>
  </span>
);

/** one dense list row's bones — the list's own grid, emptied */
const RowBone: React.FC = () => (
  <div className="qlv-row qcs" aria-hidden="true">
    <span className="qlv-bar" />
    {[...Array(7)].map((_, i) => (
      <span key={i} className="qcs-cell"><span className="qcs-l" style={{ width: i === 1 ? "70%" : "48%" }} /></span>
    ))}
  </div>
);

export interface QueryGridSkeletonProps {
  /** which view is showing — the bones take that view's shape, never a generic block */
  view: "grid" | "list" | "board" | "calendar";
  /** true while the cover is dissolving, so the crossfade happens in place */
  out?: boolean;
}

/* ⚠️ THE COUNTS ARE THE BRIEF'S, AND THEY ARE ABOUT FILLING THE FOLD rather than predicting the
   data. Six cards, eight rows, three per column: enough that the well is not half empty while the
   query loads, few enough that the page does not reflow when the real number arrives — the well
   scrolls either way. */
export const QueryGridSkeleton: React.FC<QueryGridSkeletonProps> = ({ view, out }) => {
  const cls = `qcs-wrap${out ? " qcs-wrap--out" : ""}`;
  if (view === "list") {
    return (
      <div className={cls}>
        <span className="qc-skel-sr">Loading your queries</span>
        <div className="qlv" aria-hidden="true">
          {[...Array(8)].map((_, i) => <RowBone key={i} />)}
        </div>
      </div>
    );
  }
  if (view === "board") {
    return (
      <div className={cls}>
        <span className="qc-skel-sr">Loading your queries</span>
        <div className="qcs-board" aria-hidden="true">
          {[...Array(4)].map((_, c) => (
            <div className="qcs-col" key={c}>
              <span className="qcs-colhead qcs-b" />
              {[...Array(3)].map((_, i) => <Bone key={i} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={cls}>
      <span className="qc-skel-sr">Loading your queries</span>
      <div className="qcc-grid" aria-hidden="true">
        {[...Array(6)].map((_, i) => <Bone key={i} />)}
      </div>
    </div>
  );
};
