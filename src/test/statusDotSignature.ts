/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT `StatusDot` EMITS — one definition, for every test that needs to prove a surface drew the
 * locked component rather than a recreation of it.
 *
 * ⚠️ WHY THIS EXISTS. Four suites each wrote their own signature for "this is the real StatusDot",
 * and all four picked something that was true at the time and not load-bearing: three matched
 * `position:relative;width:NNpx` off the wrapper's inline style, and one matched the string
 * `sa-statusdot`, which was only ever the PULSE element's class. The ring set (v21 §9) removed the
 * positioned wrapper and the pulse together, and all four went red at once over a change that did
 * not touch a single one of the surfaces they guard.
 *
 * ⚠️ AND TWO OF THEM HAD ALREADY BEEN WRONG ONCE, in the other direction: `var(--sd-hue)` was taken
 * for a universal signature and is not — the closed set and Offer never read the token — so the
 * assertion reported a correct page as locally drawn. That comment is still in `outcomes.test.tsx`
 * and is worth reading before anyone invents a fifth signature.
 *
 * THE LAW THESE ASSERT, which is what should survive the next redesign: a status is drawn ONLY by
 * `StatusDot`. The signature below is the narrowest thing that is true of every status, at every
 * size, on every surface — the set's own geometry — and it lives here so the next change to the
 * glyphs breaks ONE file loudly instead of four quietly.
 */

/** The viewBox every mark is drawn on, whatever its rendered size. */
export const SD_VIEWBOX = 'viewBox="0 0 24 24"';
/** The ring's radius — present for all nine ring statuses (every status except Offer). */
export const SD_RING = 'r="10"';
/** One ink stroke, stated on the viewBox rather than in pixels, so the family scales together. */
export const SD_STROKE = 'stroke-width="2"';
/** The one colour the set is drawn in. `ghost` is the only other value (#a99e90). */
export const SD_INK = "color:#1c130f";

/**
 * The wrapper's inline style at a given rendered size — proves both that the locked component drew
 * it and that `overrideSize` reached it.
 *
 * ⚠️ IT DOES NOT ASSERT `position`. The wrapper was positioned only to hold an absolutely-placed
 * disc and pulse behind the glyph; with the ring set there is nothing behind anything, so the
 * declaration went. Pinning it again would re-make the mistake this module was written for.
 */
export const sdAt = (px: number): RegExp =>
  new RegExp(`width:${px}px;height:${px}px;flex-shrink:0;display:inline-flex`, "g");

/** Treatments the ring set retired: no surface should be emitting these any more. */
export const SD_RETIRED = ["sa-statusdot__pulse", "var(--sd-hue", "var(--sd-centre"] as const;
