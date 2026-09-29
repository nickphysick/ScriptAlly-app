/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's empty-page words that outlived the feature-led page (retired by living headers
 * §3, which replaced that page with the shared header's empty state and an exhibition). What is left
 * is the one derivation the new empty state still reads: which book the page can name.
 */

/**
 * The title the hero's lede names, or null for the book-less sentence.
 *
 * ⚠️ THE SCOPE FIRST, THEN THE ONLY-ONE CASE, THEN NOTHING. The ref's lede names a manuscript, and
 * a brand-new account usually has exactly one with the scope chip still on "All" — so reading the
 * scope alone would print the book-less sentence to the writer whose book the page is plainly about.
 * Naming one of SEVERAL unscoped manuscripts is the opposite fault: it would state that this page
 * is about a book the writer did not choose. Two cases where the answer is unambiguous, and null
 * wherever it is not.
 */
export const heroBookTitle = (
  scoped: { title?: string } | null | undefined,
  all: readonly { title?: string }[],
): string | null => {
  const t = scoped?.title?.trim();
  if (t) return t;
  if (all.length === 1) {
    const only = all[0]?.title?.trim();
    if (only) return only;
  }
  return null;
};
