/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The board's own top bar — the week pager, and the density pair.
 *
 * ⚠️ IT IS A SIBLING OF THE BOARD, NOT PART OF IT, and it is shared for the same reason the board
 * is: two pages drawing their own pager would be two answers to "how far does a step move the
 * window", and this repo's rule is that two boards answering one question separately do not diverge
 * in detail — they diverge in STRUCTURE. A pager that stepped differently would put the same wait
 * at two different places on two pages.
 *
 * ⚠️ ONE WINDOW, NINETY DAYS, PAGED BY THE WEEK. There is no 2/4/6-month picker and there has not
 * been since v58: `timelineRanges.ts` carries ONE entry and the harness's own `setRangeTo` throws
 * saying the range control is gone. A host that renders a range picker is inventing a control the
 * board does not have.
 *
 * ⚠️ THE SEARCH IS OPTIONAL BECAUSE ONE HOST ALREADY HAS ONE. To-do's board owns its search; Query
 * Centre's toolbar owns the page's, and a second field inside the board would be two search boxes
 * narrowing the same rows. Absent, not disabled.
 */
import React from "react";

/** ⚠️ TWO DENSITIES. `Regular` is retired everywhere as a word, and the old 124/104 with it —
    three steps were two more answers to a question with one good one. */
export const DENSITY_LABEL: Record<"comfortable" | "compact", string> = {
  comfortable: "Comfortable", compact: "Compact",
};
/**
 * ⚠️ THE WINDOW STEPS BY A WEEK (v58). The ref moves its own window seven days a click, so the
 * board SLIDES rather than jumping — a whole-window step leaves no overlap for the eye to carry
 * across, which is what the ‹ WEEK / WEEK › labels promise and a page-jump does not deliver. It
 * lives with the pager because the pager is the only thing that may decide it, and both pages now
 * page with it.
 */
export const WEEK_STEP = 7;

export type BoardDensity = "comfortable" | "compact";

export interface TimelineWinbarProps {
  /** the window's span, as the board writes it */
  rangeLabel: string;
  onBack: () => void;
  onForward: () => void;
  /** ⚠️ ONLY ONCE THE WINDOW HAS MOVED — a Today link beside a board already showing today is a
      control that does nothing. */
  showToday: boolean;
  onToday: () => void;
  density: BoardDensity;
  onDensity: (d: BoardDensity) => void;
  search?: { value: string; onChange: (v: string) => void; label: string };
}

export const TimelineWinbar: React.FC<TimelineWinbarProps> = ({
  rangeLabel, onBack, onForward, showToday, onToday, density, onDensity, search,
}) => (
  <div className="tl-winbar">
    <div className="tl-wleft">
      <button type="button" className="tl-wchv" aria-label="Back one week" onClick={onBack}>‹</button>
      <span className="tl-rng">{rangeLabel}</span>
      <button type="button" className="tl-wchv" aria-label="Forward one week" onClick={onForward}>›</button>
      {showToday && (
        <button type="button" className="tl-todaylink" onClick={onToday}>
          Today
        </button>
      )}
    </div>
    {/* ⚠️ THE MIDDLE COLUMN IS HELD OPEN EVEN WITH NO SEARCH IN IT. `.tl-winbar` is
        `grid-template-columns: auto 1fr auto`, so a bar with only two children puts the density
        pair in the FLEXIBLE middle and it stretches the width of the bar — measured on the first
        mount, where it ran from the pager to the right edge. An empty, `aria-hidden` span keeps the
        density in the third column, so the bar reads the same on a page that has no search of its
        own as on the one that does. */}
    {search ? (
      <input className="tl-search" type="search" value={search.value}
        aria-label={search.label}
        placeholder={search.label}
        onChange={(e) => search.onChange(e.target.value)} />
    ) : <span aria-hidden />}
    <div className="tl-dseg" role="group" aria-label="Density">
      {(["comfortable", "compact"] as const).map((d) => (
        <button key={d} type="button" data-on={d === density}
          aria-pressed={d === density}
          onClick={() => onDensity(d)}>{DENSITY_LABEL[d]}</button>
      ))}
    </div>
  </div>
);
