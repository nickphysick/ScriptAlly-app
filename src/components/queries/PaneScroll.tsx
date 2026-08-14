/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PaneScroll — an internal scroller for the Query Centre's reading-pane cards, with NO edge fades
 * (fix pack 3 §1).
 *
 * ⚠️ THIS EXISTS BECAUSE THE FADE WAS THE ONLY THING WRONG WITH `EdgeFadeScroll`, AND THE FADE IS
 * ITS ENTIRE PURPOSE. The three cards needed what that component also provides — a relative flex
 * column whose inner element is `flex: 1 1 auto; min-height: 0; overflow-y: auto` — and none of
 * them needed the two gradient overlays. Passing a "don't fade" flag into a component named for
 * fading would have left the mechanism in place and the name lying about it; copying the flex
 * contract inline at three call sites would have left three copies of the one declaration that
 * makes an internal scroller work at all. So the layout contract is kept and the decoration is
 * dropped, which is the actual shape of the change.
 *
 * ⚠️ AND `EdgeFadeScroll` IS UNTOUCHED — it is still the app's fade-scroller, still correct, and
 * still used by the Agents list and two dashboard surfaces, where a fade IS the right signal
 * because those regions genuinely continue past their frame. This is an opt-out on one page, not a
 * verdict on the mechanism.
 *
 * ⚠️ WHY NO FADE HERE: a fade claims there is more below. Each of these cards is closed by its own
 * foot, so the claim is answered by the card itself — and on the two that do not overflow it was
 * never true at all. Scroll is signalled by the scrollbar.
 *
 * The prop surface is deliberately `EdgeFadeScroll`'s minus `fade`, so the three call sites read
 * the same either way and a future reader can see exactly what was and was not kept.
 */
import React from "react";

export interface PaneScrollProps {
  outerClassName?: string;
  outerStyle?: React.CSSProperties;
  scrollClassName?: string;
  /** DOM id for the SCROLL element — call sites address it. */
  scrollId?: string;
  scrollStyle?: React.CSSProperties;
  /** Optional external handle on the scroll element (keyboard nav / scrollIntoView call sites). */
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  role?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

export const PaneScroll: React.FC<PaneScrollProps> = ({
  outerClassName,
  outerStyle,
  scrollClassName,
  scrollId,
  scrollStyle,
  scrollRef,
  role,
  "aria-label": ariaLabel,
  children,
}) => (
  <div
    className={outerClassName}
    style={{ position: "relative", display: "flex", flexDirection: "column", ...outerStyle }}
  >
    {/* ⚠️ `flex: 1 1 auto`, NOT `1 1 0`. Against a content-sized parent a `0` basis contributes
        nothing and then has no free space to grow into, so it computes to exactly 0 with every
        child mounted and correct — the fault this repo has already paid for twice. `auto` keeps the
        content's own height in the calculation. */}
    <div
      ref={scrollRef}
      role={role}
      aria-label={ariaLabel}
      id={scrollId}
      className={scrollClassName}
      style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", ...scrollStyle }}
    >
      {children}
    </div>
  </div>
);
