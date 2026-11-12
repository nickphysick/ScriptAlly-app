/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * marketingMarks — the monoline glyphs the public pages draw, traced from the refs.
 *
 * ⚠️ THEY ARE STROKE-ONLY AND TAKE THEIR COLOUR FROM CSS. Every path here is `fill: none` with the
 * stroke set by the plate rule (`.mk-docplate svg`), so a mark cannot carry a hex of its own and a
 * future retint is one stylesheet change. (One exception, noted at `STATUS_GLYPHS`: its discs fill
 * with `currentColor`, which is still CSS's colour and never a hex.) This is the opposite of
 * `manuscriptMarks.tsx`, whose fills are baked on purpose — those are illustrations that must read
 * identically in three themes; these are chrome inside a single-palette tier.
 *
 * ⚠️ NOT `ArtSlot`. That component's own docblock rejects illustration in page headers and its slot
 * names are a closed union owned by the To-do workspace; a marketing plate is neither.
 */

import React from "react";

/* ⚠️ `MarketingIllustration` IS DELETED (21 Oct). Its last consumer was About's three vision
   bands, which now draw page-local brush-wash plates in the landing's unframed style; the dashed
   rim and tinted ground it existed to draw are retired with `.mk-illo*`. */

/**
 * The six states a query passes through, in pipeline order: outline → half-disc → full disc, with
 * the solid ring for what came back and the page for an offer. Drawn for the status band's
 * carousel and repeated, dimmed, under the footer's strapline.
 *
 * ⚠️ THE ONE PLACE IN THIS FILE THAT FILLS ANYTHING — and still no hex: every fill and stroke is
 * `currentColor`, so the colour is set once on the row in CSS and the active carousel mark can
 * take a different one without eleven values following it.
 *
 * ⚠️ NOT `StatusDot`'s VOCABULARY. The app's dot is a tinted disc with a plane, chevron or star
 * inside; nothing was reused because there was nothing to reuse, and `StatusDot` is untouched.
 */
/* ⚠️ EXPORTED SO A LOCK CAN RECONCILE `STATUS_GLYPH_COUNT` AGAINST IT (18 Sep). The footer's row
   used to be reconciled against `STATUS_STEPS` — the status band's six descriptions — which was a
   genuine second derivation while the carousel rendered them. The carousel is deleted and that copy
   went with it, so the count is checked against the table that owns it. Nothing renders this array
   directly; `StatusGlyph` is the only way to draw one. */
export const STATUS_GLYPHS: React.ReactNode[] = [
  <circle cx={12} cy={12} r={10} key="g" />,
  <>
    <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
    <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} />
    <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
    <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} />
    <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
  </>,
  <>
    <path d="M5.5 2.5h9l4.5 4.5v14.5h-13.5z" strokeLinejoin="round" />
    <path d="M14 2.5V7.5h5" strokeLinejoin="round" />
    <path d="M8.5 12h7M8.5 15.5h7" strokeLinecap="round" />
    <path d="M8.5 18.8c1.5-1.6 2.6 1.4 4-.2 1-1.1 2 .6 3 .2" strokeWidth={1.7} strokeLinecap="round" />
  </>,
];

/** How many states there are — the carousel and the footer both walk exactly this many. */
export const STATUS_GLYPH_COUNT = STATUS_GLYPHS.length;

/** One state's mark. Decorative everywhere it appears: a label, where one is needed, is the caller's. */
export const StatusGlyph: React.FC<{ index: number }> = ({ index }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    {STATUS_GLYPHS[index]}
  </svg>
);

/** The small paper plane in the footer's base line. Stroke-only; the rule colours it. */
export const PaperPlane: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.5 2.5 15 21.5l-3.8-8.7L2.5 9z" />
    <path d="M21.5 2.5 11.2 12.8" />
  </svg>
);

/* ⚠️ `IdeaBulb` and `CommitmentTick` ARE DELETED. The bulb's only consumer was About's turn line;
   the tick's was About's three promises, removed 21 Oct with `.mk-ctick`. */

