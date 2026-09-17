/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenHeader — the dashboard's header row (stage 1, 17 Sep): the greeting and one line of live
 * figures on the left, the hawk at the right-hand end, bottom edges level.
 *
 * ⚠️ IT REPLACED THE THREE STAT CARDS AND THE "What's on your desk today?" LINE, which were deleted
 * rather than hidden — `OneScreenCounters`, `headerCounters` and the counters' caveats went with
 * them. The figures the cards stated live on the chart and the to-do card beneath this row.
 *
 * ⚠️ IT RENDERS TWICE WHILE THE PAGE LOADS, AND IT IS THE SAME COMPONENT BOTH TIMES. The loading
 * cover (`OneScreenSkeleton`) draws this row in place of grey bars — the brief's "no skeleton, no zero
 * placeholder" — and because it is this component rather than a drawing of it, the cover's row is
 * the page's row to the pixel: nothing below it can jump when the cover lifts. `ghost` strips the
 * one thing a second copy must not carry, the measurement probes (the page beneath the cover is
 * mounted and carries its own, and two of each is how a gate once read the wrong page).
 *
 * ⚠️ THE GREETING IS AN `h1` WITH TWO CLASSES OF SPECIFICITY ON PURPOSE. `lib/brand.tsx` injects
 * `h1:not(.wsh-title) { font-family: … !important }` at runtime on every route; between two
 * `!important` declarations the more specific wins, and that selector is 0-1-1. The rule that sets
 * Special Elite is `.os-greet .os-hello` (0-2-0) — see oneScreen.css.
 */
import React from "react";
import { greetingText, HEADER_ART, lineClauses, type DashHeaderLine } from "../../lib/dashHeader";

export interface OneScreenHeaderProps {
  firstName: string;
  /**
   * The counts, or a new account's Getting Started line — see `dashHeaderLine`. Null until the
   * collections land: the line then renders its words without figures, never as zeros.
   */
  line: DashHeaderLine | null;
  /**
   * The tour launcher, when the account is young enough to be offered it. It sits beside the
   * greeting because the counts line holds the two clauses and nothing else.
   */
  tour?: { onStart: () => void; buttonRef?: React.Ref<HTMLButtonElement> } | null;
  /** the loading cover's copy — no probes */
  ghost?: boolean;
}

const figure = (n: number) => n.toLocaleString("en-GB");

export const OneScreenHeader: React.FC<OneScreenHeaderProps> = ({ firstName, line, tour = null, ghost = false }) => {
  const [first, second] = lineClauses(line);
  const probe = (name: string) => (ghost ? undefined : name);
  const clause = (c: typeof first) => (
    /* ⚠️ A CLAUSE NEVER BREAKS INSIDE ITSELF — "3 tasks" on one line and "waiting on you" on the
       next reads as two statements. If the line must wrap it wraps at the dot. */
    <span className="os-hdc">
      {c.n !== null && <><b>{figure(c.n)}</b>{" "}</>}
      {c.noun}
    </span>
  );
  return (
    <div className="os-greet" data-probe={probe("hero")}>
      <div className="os-hdtx">
        <div className="os-hdrow">
          <h1 className="os-hello" data-probe-text={probe("greeting")}>{greetingText(firstName)}</h1>
          {tour && (
            <button type="button" ref={tour.buttonRef} className="os-tourchip" onClick={tour.onStart}>
              Take the tour
            </button>
          )}
        </div>
        <p className="os-hdcounts" data-probe-text={probe("header-counts")}>
          {clause(first)}
          {/* ⚠️ THE SPACES ARE REAL TEXT AND DRAW AT ZERO WIDTH. The brief sets the dot 8px either
              side, which is a margin — but a bare margin leaves "out·3" in the text a screen reader
              reads and a reader copies. `.os-hdsep` is `font-size: 0`, so its spaces take no room,
              and the dot inside it carries the line's own size and the two 8px margins. */}
          <span className="os-hdsep"> <span className="os-hddot">·</span> </span>
          {clause(second)}
        </p>
      </div>
      <img
        className="os-hdart"
        src={`${HEADER_ART.src}?v=${HEADER_ART.version}`}
        width={HEADER_ART.width}
        height={HEADER_ART.height}
        alt=""
        decoding="async"
        data-probe={probe("header-illustration")}
      />
    </div>
  );
};
