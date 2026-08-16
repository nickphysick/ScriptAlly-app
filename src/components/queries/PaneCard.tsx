/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PaneCard — the reading pane's card shell (Pack B §2, ref design-refs/95-tracking-half.html).
 *
 * ⚠️ THREE HAND-ROLLED COPIES IS WHY THE HEADERS COULD DRIFT. Tracking, What you sent and Notes were
 * three inline `<div className="f12-card">` blocks in Queries.tsx, each rebuilding the same header
 * band from scratch. Nothing kept their glyph size, their title weight or their padding in step
 * except three people writing the same thing — and one of them already had a pink band where the
 * other two had sage.
 *
 * ⚠️ THE SHELL IS SHARED; THE BODIES ARE NOT. The three contents are genuinely different — a
 * timeline, an inventory, a thread — so the body is `children` and nothing about it is
 * parameterised. A card component that tried to describe all three would be a worse version of JSX.
 *
 * ⚠️ THE META IS THE HEADER'S JOB, AND THAT IS THE POINT OF PUTTING IT HERE. Each body used to state
 * its own count somewhere inside it; stating it in the band means the body never has to, and the
 * three counts cannot come to look different from each other.
 */
import React from "react";

export const PaneCard: React.FC<{
  /** The band's glyph — a small line icon, drawn by the caller so each card keeps its own. */
  glyph: React.ReactNode;
  title: string;
  /**
   * Right-aligned, mono, uppercase: "Queried", "3 items", "1 note". Derived by the caller from the
   * selectors it already reads — never counted a second time in here.
   *
   * Omitted when there is nothing true to say, rather than rendered empty: a band with a blank slot
   * where a figure belongs reads as a figure that failed to load.
   */
  meta?: string;
  /**
   * A CONTROL in the band, after the meta — Notes' expand, Tracking's task count.
   *
   * ⚠️ A SLOT, NOT A SECOND `meta`. The distinction is that this one is interactive: `meta` states a
   * fact and must never be clickable, because a figure that silently does something when pressed is
   * the worst kind of hidden control. Anything that acts comes through here and looks like it acts.
   *
   * ⚠️ AND IT PUSHES `meta` OFF THE RIGHT EDGE RATHER THAN REPLACING IT. Both can be true at once
   * (Notes states "1 note" AND expands), so the band has room for the pair.
   */
  action?: React.ReactNode;
  /** Extra classes on the card — the stacked column's members take their flex from here. */
  className?: string;
  /** §8 — the expanded card measures and holds its own floor, so nothing below it reflows. */
  style?: React.CSSProperties;
  /** §8 — an outside-click collapse needs to know where "inside" is. */
  cardRef?: React.Ref<HTMLElement>;
  children: React.ReactNode;
}> = ({ glyph, title, meta, action, className, style, cardRef, children }) => (
  <section ref={cardRef} className={`f12-card${className ? " " + className : ""}`} style={{ minWidth: 0, minHeight: 0, ...style }}>
    {/**
      * ⚠️ THE FRAME EXISTS SO THE RIM CAN SURROUND THE HEADER (§2), and it is a real element rather
      * than a class on the section because the two jobs are incompatible: the card must NOT clip,
      * or it would clip its own ring; the header's fill must BE clipped, or it would square off the
      * card's rounded corners. One element cannot do both, so there are two.
      */}
    <div className="f12-cfr">
      <div className="f12-chh">
        <span className="qp-cardgl" aria-hidden="true">{glyph}</span>
        <span>{title}</span>
        {meta && <span className="qp-cardmeta">{meta}</span>}
        {action}
      </div>
      {children}
    </div>
  </section>
);
