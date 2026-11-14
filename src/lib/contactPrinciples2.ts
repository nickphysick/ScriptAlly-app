/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v2 (design-refs/contact-list-principles-v2/contact-list-principles-v4.html, the pp2 layer).
 *
 * (QC layout v1 deleted "List health nudged in", `healthNudge`: the navy header places List health in the Query
 * Centre's right-hand column, against the list's right edge, so there is nothing to pull in.)
 */

/** THE LIST HEALTH RING IN BRAND COLOURS (wherever it is drawn on a light ground): navy for what's filled in, soft pink
 *  for what's missing, at every score — it no longer follows `healthTone` (which went green at 80 and above). */
export const BRAND_RING = { arc: "#2a3a52", track: "#ecc0ae" } as const;
