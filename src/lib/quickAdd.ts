/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AGENT LINK + GENRE HYGIENE — what survives of the quick-add strip's pure half (v11 P4, 25 Sep).
 *
 * The strip itself — QuickField, the Tab walk, the per-field diff and the advisory warnings —
 * retired with the flip card that rendered it (recoverable at 2d160183's parent). What stays is
 * what still has a caller: the submissions-URL scheme allowlist (`normaliseSubmissionsUrl` /
 * `isLiveHref` / `hrefFor`, rendered by the pop-up's Website link) and `commitTypedGenre` (the
 * pop-up form's "+ Other" input). The file keeps its name so the git history of the allowlist
 * stays one line.
 *
 * ⚠️ THE SCHEME ALLOWLIST IS AN ALLOWLIST BY CONSTRUCTION, NOT A DENYLIST. It does not hunt for
 * `javascript:` and `data:` — a denylist loses to `JaVaScRiPt:`, to a tab inside the word, to a
 * leading NUL, and to whatever the next parser quirk turns out to be. The rule is total: a stored
 * value either ALREADY begins `http://` or `https://`, or it is prefixed with `https://`. Anything
 * else — any other scheme, any mangling of one — comes out as the PATH of an https URL, which is
 * inert. There is no input that reaches a render site as a dangerous scheme.
 *
 * ⚠️ AND IT LIVES HERE BECAUSE THE IMPORTER WILL NEED IT. This is the same stored-XSS path parked
 * for Smart Import: a URL arriving from a CSV or an email is the identical problem, and it should
 * meet the identical function rather than a second one written from memory.
 */

/**
 * ⚠️ TOTAL, AND SAFE FOR EVERY INPUT. Returns the value to store. Never throws, never returns a
 * value whose scheme is anything but http or https.
 */
export function normaliseSubmissionsUrl(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  /* already an http(s) URL — the only two schemes that survive as themselves */
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  /* a protocol-relative or path-leading value loses its slashes before it is prefixed, so
     "//agency.co.uk" becomes the host rather than an empty one (the ref does the same) */
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/**
 * Is a stored value safe to put in an `href`? The render sites ask this rather than re-deriving
 * the test, so a value that got into the store by some other route — an import, a legacy record —
 * is checked at the point it would become live rather than trusted because it was stored.
 */
export const isLiveHref = (stored: string): boolean => /^https?:\/\//i.test((stored ?? "").trim());

/** The href for a stored submissions page, or null when it must not be one. */
export const hrefFor = (stored: string): string | null => {
  const v = normaliseSubmissionsUrl(stored);
  return v && isLiveHref(v) ? v : null;
};

/**
 * The genre a reader has TYPED but not yet picked — committed as a chip, or null when there is
 * nothing to commit.
 *
 * ⚠️ ENTER MUST NOT DISCARD WHAT IS IN THE FIELD. Measured before this existed: typing
 * "Historical fiction" into the genres popover narrowed the suggestion list to that one entry, and
 * Enter then saved the PICKED chips — of which there were none — so the popover closed, nothing
 * was written, and the reader had every reason to believe they had added a genre. That is the
 * inert-control family: worse than a control that does nothing, because it looks like it worked.
 *
 * ⚠️ AND IT CANONICALISES AGAINST THE SUGGESTIONS, case-insensitively. The suggestions are the
 * writer's OWN genres from elsewhere in their list, so typing "historical fiction" beside an
 * existing "Historical fiction" would otherwise give them two genres that are the same genre —
 * and then two filter rows, two board captions and two tiles, none of which can be reconciled
 * afterwards. A genre that matches nothing is added exactly as typed: the list is a convenience,
 * never a closed vocabulary.
 */
export function commitTypedGenre(
  value: string,
  genres: readonly string[],
  suggestions: readonly string[],
): string[] | null {
  const typed = (value ?? "").trim();
  if (!typed) return null;
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const canonical = suggestions.find((g) => same(g, typed)) ?? typed;
  if (genres.some((g) => same(g, canonical))) return null;
  return [...genres, canonical];
}
