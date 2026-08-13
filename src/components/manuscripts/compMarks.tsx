/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The three illustrated marks on the Comparable titles hero rail — a stack of books, a query letter
 * with one line lit, and a catalogue stamp with a tick. Ported from design-refs/comparable-titles-v5.
 *
 * ⚠️ THEY CARRY NO `mix-blend-mode`, AND THAT IS A RULING, NOT AN OVERSIGHT (Amendment 2 §6: "the
 * marks system wins"). The pack's global rule — "illustrated marks use mix-blend-mode: multiply" —
 * describes the app's RASTER marks, which were painted on a white field that had to be dropped.
 * Those were retired at `a7b5d54`. These are inline SVG with genuine transparency and no white field
 * to remove, so multiply would only darken the sage and pink washes against a tinted rail. The live
 * house law is `manuscriptMarks.tsx`'s, and it forbids blend on exactly this shape.
 *
 * ⚠️ FILLS ARE BAKED, NEVER TOKENS. Same rule as `manuscriptMarks.tsx`: an illustration renders
 * identically in all three themes. A `var()` here would make one drawing into three, and the sage/
 * pink/parchment palette is the illustration's own, not the page's.
 *
 * ⚠️ AND THEY ARE NOT lucide GLYPHS. The pack is explicit: these are illustrated marks, not stroke
 * icons, and substituting a monoline icon changes what the rail is.
 */
import React from "react";

/** A stack of three bound books, seen end-on — the shelf the comps sit on. */
export const CompsSavedMark: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <path d="M9 32.5h26a1.6 1.6 0 0 1 1.6 1.6v2.4a1.6 1.6 0 0 1-1.6 1.6H9a1.6 1.6 0 0 1-1.6-1.6v-2.4A1.6 1.6 0 0 1 9 32.5Z" fill="#e9ede6" stroke="#5a6e58" strokeWidth="1.2" />
    <path d="M11.5 25.6h23a1.6 1.6 0 0 1 1.6 1.6v3.7a1.6 1.6 0 0 1-1.6 1.6h-23a1.6 1.6 0 0 1-1.6-1.6v-3.7a1.6 1.6 0 0 1 1.6-1.6Z" fill="#f5e2da" stroke="#7c3a2a" strokeWidth="1.2" />
    <path d="M14 18.7h18a1.6 1.6 0 0 1 1.6 1.6v3.7a1.6 1.6 0 0 1-1.6 1.6H14a1.6 1.6 0 0 1-1.6-1.6v-3.7a1.6 1.6 0 0 1 1.6-1.6Z" fill="#fdfaf5" stroke="#7c3a2a" strokeWidth="1.2" />
    <path d="M16.4 20.6v4.9M29.6 27.5v4.9" stroke="#c9a89e" strokeWidth="1.1" />
    <path d="M13.5 34.4v3.7" stroke="#8a9e88" strokeWidth="1.1" />
  </svg>
);

/** A query letter with one line struck through in soft pink — the line these comps compose. */
export const InYourQueryMark: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <path d="M11.5 8.5h17.4L34 13.6V35a1.6 1.6 0 0 1-1.6 1.6H11.5A1.6 1.6 0 0 1 9.9 35V10.1a1.6 1.6 0 0 1 1.6-1.6Z" fill="#fdfaf5" stroke="#7c3a2a" strokeWidth="1.2" />
    <path d="M28.6 8.7v4.6a.9.9 0 0 0 .9.9h4.3" stroke="#7c3a2a" strokeWidth="1.2" />
    <path d="M14 18h11M14 22.4h16M14 31.2h7" stroke="#c9a89e" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M13.4 26.6h16.8" stroke="#f5e2da" strokeWidth="4.4" strokeLinecap="round" />
    <path d="M13.4 26.6h16.8" stroke="#7c3a2a" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** A catalogue stamp with a sage tick — the check standing behind the ✓ VERIFIED chip. */
export const VerifiedMark: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <path d="M22 8.6 25 11l3.7-1.3.9 3.8 3.8.9L32.1 18l2.4 3-3 2.4 1.3 3.7-3.8.9-.9 3.8-3.7-1.3L22 33l-2.4-2.5-3.7 1.3-.9-3.8-3.8-.9 1.3-3.7-2.4-3 2.4-3-1.3-3.7 3.8-.9.9-3.8 3.7 1.3L22 8.6Z" fill="#e9ede6" stroke="#5a6e58" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="m17.6 21.4 3.2 3.2 6.4-7" stroke="#5a6e58" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.5 35.6h13" stroke="#c9a89e" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
