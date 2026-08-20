/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IllustrationSlot — a plate held at the size the final artwork will occupy.
 *
 * ⚠️ THE PLATE IS THE POINT, NOT THE LINE DRAWING INSIDE IT. Every slot on this page reserves its
 * space now, so the day the watercolours land they are dropped in behind the same box and nothing
 * around them reflows. A page that grew its artwork later would have every panel's rhythm settled
 * against drawings that were not there.
 *
 * ⚠️ THREE SIZES, NAMED RATHER THAN PASSED AS PIXELS. A `size={54}` prop would let any call site
 * ask for any box, and then the page has as many illustration sizes as it has slots. The sizes are
 * a rule — 54 beside a stat, 120 in an empty state, 168×150 beside the journey — so they are a
 * union.
 *
 * ⚠️ AND THEY ARE `aria-hidden`. Every one of these sits beside text that already says the thing;
 * announcing "hourglass" before "Still out — 12" is a screen reader reading the decoration twice.
 */
import React from "react";

export type IllustrationSize = "stat" | "empty" | "hero";

/** The stand-in drawings. Swapped for the real artwork; the plate around them does not change. */
export type IllustrationKey = "plane" | "hourglass" | "pages" | "ratio" | "clock" | "post" | "journey";

const STROKE = { fill: "none", stroke: "#c9beb2", strokeWidth: 1.4, strokeLinejoin: "round" as const };

const ART: Record<IllustrationKey, React.ReactNode> = {
  plane: (
    <svg viewBox="0 0 40 40" {...STROKE}>
      <path d="M6 21 L34 9 L21 31 L18 23 Z" />
      <path d="M18 23 L34 9" />
    </svg>
  ),
  hourglass: (
    <svg viewBox="0 0 40 40" {...STROKE}>
      <path d="M13 8 h14" />
      <path d="M13 32 h14" />
      <path d="M15 8 c0 8 10 8 10 0" />
      <path d="M15 32 c0 -8 10 -8 10 0" />
    </svg>
  ),
  pages: (
    <svg viewBox="0 0 40 40" {...STROKE}>
      <path d="M11 8 h13 l5 5 v19 h-18 Z" />
      <path d="M16 20 h9 M16 25 h9" />
    </svg>
  ),
  ratio: (
    <svg viewBox="0 0 40 40" {...STROKE}>
      <circle cx="20" cy="20" r="12" />
      <path d="M20 8 a12 12 0 0 1 8.5 20.5" stroke="#d8bfb4" />
      <circle cx="20" cy="20" r="4.5" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 40 40" {...STROKE}>
      <circle cx="20" cy="20" r="12" />
      <path d="M20 12 v8.5 l5 3" />
    </svg>
  ),
  post: (
    <svg viewBox="0 0 60 60" {...STROKE} strokeWidth={1.5}>
      <rect x="10" y="18" width="40" height="27" rx="3" />
      <path d="M10 20 l20 15 l20 -15" />
      <path d="M22 12 q8 -6 16 0" strokeDasharray="3 4" />
    </svg>
  ),
  journey: (
    <svg viewBox="0 0 100 100" fill="none">
      <path d="M14 66 q18 -14 36 -6 t36 -20" stroke="#d8c9b8" strokeWidth={1.4} strokeDasharray="3 5" strokeLinecap="round" />
      <rect x="22" y="52" width="22" height="15" rx="2" stroke="#c9beb2" strokeWidth={1.3} />
      <path d="M22 53 l11 8 l11 -8" stroke="#c9beb2" strokeWidth={1.3} />
      <path d="M62 28 l20 8 l-13 4 l-3 9 l-4 -11 z" stroke="#c9beb2" strokeWidth={1.3} strokeLinejoin="round" />
    </svg>
  ),
};

export const IllustrationSlot: React.FC<{ art: IllustrationKey; size?: IllustrationSize }> = ({
  art,
  size = "stat",
}) => (
  /* ILLUSTRATION SLOT — replace the inner <svg> with the artwork; keep the plate and its size. */
  <div className={`an-illo an-illo--${size}`} aria-hidden="true">
    {ART[art]}
  </div>
);
