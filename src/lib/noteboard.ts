/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * noteboard — the Noteboard's pure layer (build from design-refs/noteboard-mockup.html).
 *
 * Everything here is a function of its arguments: no db, no React, no Firebase. The page is a
 * rendering of these, which is what lets the locks call the SAME function the page calls rather
 * than a literal that agrees with it today.
 */

/**
 * The mockup's band sentence, verbatim. It lives here rather than in the component because the
 * lock reads it from the ref and from the render, and a string typed twice is a string that
 * drifts once.
 */
export const NOTEBOARD_SUBTITLE =
  "Thoughts, snippets, and things worth keeping — pinned where you can see them.";

/**
 * ⚠️ THE TALLY, NOT THE FILTERED VIEW. It counts what is PINNED — a search that hides five notes
 * has not unpinned them, and a count that moved with the search would be describing the query
 * rather than the board.
 */
export const noteCountLabel = (n: number): string => `${n} note${n === 1 ? "" : "s"} pinned`;
