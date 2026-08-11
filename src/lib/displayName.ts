/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * displayName — the sidebar account row's name, and the initials that must agree with it.
 *
 * ⚠️ ONE INPUT, ONE MODULE, TWO OUTPUTS — and that is the whole reason this file exists rather
 * than a formatter beside an unrelated initials helper. If the row shortens to "Bethany C." while
 * the avatar chip derives "BC" from its own copy of the splitting rules, the two agree by
 * COINCIDENCE: a mononym, a trailing space or a hyphenated surname pulls them apart, and nothing
 * fails — the chip just stops matching the name beside it. Both read the same normalised string.
 *
 * ⚠️ IT DOES NOT OWN EVERY INITIALS FUNCTION IN THE APP, deliberately. `initialsOf` in
 * searchSuggestionsCore is a DIFFERENT contract — up to three letters, "?" for nothing, drawn on
 * search result rows — and folding the two together would make one surface's fallback the other's.
 * The duplicate this file DID replace is the shell's own local `initials`, which was the same
 * contract written twice.
 */

/**
 * ⚠️ MEASURED, NOT CHOSEN — and RE-MEASURED, because the inputs the pack derived it from have both
 * moved. Browser-measured against the BUILT stylesheet in this stacked layout, Inter 14px/600:
 *
 *     the name's box .................. 142px   (was ~81px inline beside the pill)
 *     19 characters ................... 139px   fits
 *     20 characters ................... 145px   over
 *     "Bethany Costello" (16) ......... 114px   fits whole — the pack's motivating case
 *
 * The pack states 19 against a 169px budget at 13.5px in a 264px sidebar. This app is a 224px
 * sidebar at 14px, so the number was re-derived rather than inherited — the pack's own rule.
 *
 * ⚠️ IT LANDS ON 19 AGAIN, AND THAT IS A COINCIDENCE, NOT A CONFIRMATION. The two changes pull
 * opposite ways: the narrower column takes width away (169 → 142), the larger type spends more of
 * what is left (13.5 → 14). The character count survives by luck. Anyone reading "19" here and
 * inferring the budget is 169px would be wrong by 27 pixels.
 *
 * If the type, the padding, the avatar or the sidebar width moves again: re-measure. Never nudge
 * this by feel — the failure is silent, a name that ellipsises where it used to fit.
 */
export const SIDEBAR_NAME_MAX = 19;

/** Trim, and collapse every run of internal whitespace to one space. */
const normalise = (n: string | null | undefined): string => (n ?? "").trim().replace(/\s+/g, " ");

/**
 * The sidebar's display form of a name.
 *
 * ≤ the budget → unchanged. Over it, with a surname to work with → "Bethany Costello" becomes
 * "Bethany C." — a deliberate short form rather than a severed word.
 *
 * ⚠️ AND IF THE SHORT FORM IS *STILL* OVER, THE ORIGINAL COMES BACK. A very long first name
 * ("Bartholomew Fotheringay") initialises to something that will itself be ellipsised, and
 * "Bartholomew C…" is doubly lossy: the reader loses the surname to the formatter AND the first
 * name to the CSS. One honest truncation beats a mangled one, so the full name is returned and
 * `text-overflow: ellipsis` — which the row already carries — does the cutting.
 *
 * A single word has no surname to initialise and is likewise returned for the CSS to handle. This
 * function NEVER constructs an ellipsis itself; that belongs to the stylesheet, which knows the
 * actual pixel width and can cut mid-glyph.
 */
export function formatSidebarName(fullName: string | null | undefined): string {
  const clean = normalise(fullName);
  if (!clean || clean.length <= SIDEBAR_NAME_MAX) return clean;

  const words = clean.split(" ");
  if (words.length < 2) return clean; // a mononym — nothing to initialise

  const short = `${words[0]} ${words[words.length - 1]!.charAt(0).toUpperCase()}.`;
  return short.length <= SIDEBAR_NAME_MAX ? short : clean;
}

/**
 * Up to two initials for the avatar chip, from the SAME normalised string the display name reads.
 *
 * ⚠️ THE EM DASH IS THE EXISTING PLACEHOLDER, kept: an empty avatar circle reads as a rendering
 * fault, where "—" reads as "we do not know your name yet". `formatSidebarName` returns "" for the
 * same input, because an empty string in a text row is simply an absent row — the two disagree
 * about the FALLBACK on purpose, and about nothing else.
 */
export function getInitials(fullName: string | null | undefined): string {
  const clean = normalise(fullName);
  if (!clean) return "—";
  return clean
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
