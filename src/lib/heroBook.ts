/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHICH BOOK IS THE HERO, AND HOW ITS COVER IS SET ══════════════════════════════════════════
 *
 * Ref: `design-refs/manuscripts-hero-landing.html` (generated from the brief's prose; it says so).
 */
import { Manuscript, Query } from "../types";

const toMs = (d: unknown): number | null => {
  if (typeof d !== "string" || !d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
};

/** The most recent send for one book, or null where nothing has gone out. */
export const lastSentMs = (manuscriptId: string, queries: readonly Query[]): number | null => {
  const sent = queries.filter((q) => q.manuscriptId === manuscriptId)
    .map((q) => toMs(q.dateSent)).filter((t): t is number => t !== null);
  return sent.length ? Math.max(...sent) : null;
};

/**
 * The hero: the book most recently sent from.
 *
 * ⚠️ A BOOK THAT HAS NEVER BEEN SENT FROM IS NOT DISQUALIFIED, it simply sorts last — otherwise a
 * writer whose whole shelf is unsent would have no hero at all, which is the state a new account is
 * in. Ties and the all-unsent case fall back to the shelf's own order, so the choice is never
 * arbitrary between two equal candidates.
 */
export const heroManuscript = (
  ordered: readonly Manuscript[],
  queries: readonly Query[],
): Manuscript | null => {
  if (!ordered.length) return null;
  let best = ordered[0];
  let bestMs = lastSentMs(best.id, queries);
  for (const m of ordered.slice(1)) {
    const ms = lastSentMs(m.id, queries);
    if (ms !== null && (bestMs === null || ms > bestMs)) { best = m; bestMs = ms; }
  }
  return best;
};

/** The rest of the shelf, in the shelf's order, with the hero removed. */
export const alsoOnShelf = (ordered: readonly Manuscript[], hero: Manuscript | null): Manuscript[] =>
  hero ? ordered.filter((m) => m.id !== hero.id) : [...ordered];

/**
 * ⚠️ THE COVER IS A FIXED BOX AND THE TITLE IS NOT A FIXED LENGTH. A cover typeset at one size
 * overflows the moment somebody names their book something long — and it is a BOX WITH A HEIGHT, so
 * the overflow is a crop rather than a reflow: the bottom of the title simply disappears, which is
 * the worst way for it to fail because nothing looks broken.
 *
 * ⚠️ SO THE SCALE IS A DERIVATION, NOT A GUESS AT ONE SIZE. Bands rather than a continuous fit,
 * because a continuous one produces a different size for every book on a shelf and the covers stop
 * looking like a set.
 */
export const coverTitleSize = (title: string): number => {
  const n = title.trim().length;
  if (n <= 18) return 24;
  if (n <= 28) return 20;
  if (n <= 42) return 17;
  return 14;
};

/**
 * ⚠️ AND THE AUTHOR LINE HAS THE SAME PROBLEM, one line further down. A 30-character name under a
 * 40-character title is the case that overflows: each fits alone, and together they do not.
 */
export const coverAuthorSize = (author: string): number => (author.trim().length <= 22 ? 8 : 7);

/**
 * The cover's whole type setting, so a caller cannot take one half and forget the other.
 *
 * ⚠️ THE TITLE IS CLAMPED AS A BACKSTOP, not as the fit. The band above is what makes it fit; the
 * clamp is what stops a pathological title (one 90-character word) pushing the rule and the author
 * out of the box. Both are needed: the clamp alone would crop ordinary long titles silently.
 */
export const coverType = (title: string, author: string): {
  titleSize: number; authorSize: number; titleLines: number;
} => ({
  titleSize: coverTitleSize(title),
  authorSize: coverAuthorSize(author),
  titleLines: coverTitleSize(title) >= 20 ? 4 : 5,
});
