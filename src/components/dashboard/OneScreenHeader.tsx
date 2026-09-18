/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenHeader — the dashboard's header (stage 1, 17 Sep; v16, 18 Sep).
 *
 *   Hello, Bethany.
 *   18 queries out · 3 waiting on you · Day 1,018
 *
 * ⚠️ NO ILLUSTRATION (v16). The hawk stood at the right-hand end of this row and is deleted with its
 * file; the ref's header is the greeting and one line of figures, and the page's pictures are the
 * quick-action tiles. The clauses are `dashHeader.lineClauses`' — as many as the state has, joined by
 * the dot, so the getting-started line keeps its two and the counts line gains the day.
 *
 * ⚠️ IT RENDERS TWICE WHILE THE PAGE LOADS, AND IT IS THE SAME COMPONENT BOTH TIMES. The loading
 * cover draws this row rather than a grey bar, so the cover's row is the page's row to the pixel and
 * nothing below it jumps when the cover lifts. `ghost` strips the measurement probes, because two of
 * each is how a gate once read the wrong page.
 *
 * ⚠️ THE GREETING IS AN `h1` WITH TWO CLASSES OF SPECIFICITY ON PURPOSE. `lib/brand.tsx` injects
 * `h1:not(.wsh-title) { font-family: … !important }` at runtime on every route; between two
 * `!important` declarations the more specific wins, and that selector is 0-1-1. The rule that sets
 * Special Elite is `.os-greet .os-hello` (0-2-0) — see oneScreen.css.
 */
import React from "react";
import { greetingText, lineClauses, type DashHeaderLine } from "../../lib/dashHeader";

export interface OneScreenHeaderProps {
  firstName: string;
  /**
   * The counts, or a new account's Getting Started line — see `dashHeaderLine`. Null until the
   * collections land: the line then renders its words without figures, never as zeros.
   */
  line: DashHeaderLine | null;
  /**
   * The tour launcher, when the account is young enough to be offered it. It sits beside the
   * greeting because the line beneath is figures and nothing else.
   */
  tour?: { onStart: () => void; buttonRef?: React.Ref<HTMLButtonElement> } | null;
  /** the loading cover's copy — no probes */
  ghost?: boolean;
}

const figure = (n: number) => n.toLocaleString("en-GB");

export const OneScreenHeader: React.FC<OneScreenHeaderProps> = ({ firstName, line, tour = null, ghost = false }) => {
  const clauses = lineClauses(line);
  const probe = (name: string) => (ghost ? undefined : name);
  return (
    <div className="os-greet" data-probe={probe("hero")}>
      <div className="os-hdrow">
        <h1 className="os-hello" data-probe-text={probe("greeting")}>{greetingText(firstName)}</h1>
        {tour && (
          <button type="button" ref={tour.buttonRef} className="os-tourchip" onClick={tour.onStart}>
            Take the tour
          </button>
        )}
      </div>
      <p className="os-hdcounts" data-probe-text={probe("header-counts")}>
        {clauses.map((c, i) => (
          <React.Fragment key={c.noun}>
            {/* ⚠️ THE SPACES ARE REAL TEXT AND DRAW AT ZERO WIDTH. The dot is set 8px either side,
                which is a margin — but a bare margin leaves "out·3" in the text a screen reader reads
                and a reader copies. `.os-hdsep` is `font-size: 0`, so its spaces take no room, and
                the dot inside it carries the line's own size and the two margins. */}
            {i > 0 && <span className="os-hdsep"> <span className="os-hddot">·</span> </span>}
            {/* ⚠️ A CLAUSE NEVER BREAKS INSIDE ITSELF — "3 tasks" on one line and "waiting on you" on
                the next reads as two statements. If the line must wrap it wraps at a dot. */}
            <span className="os-hdc">
              {c.n !== null && <><b>{figure(c.n)}</b>{" "}</>}
              {c.noun}
            </span>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
};
