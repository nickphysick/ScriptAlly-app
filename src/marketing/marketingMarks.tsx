/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * marketingMarks — the monoline glyphs the public pages draw, traced from the refs.
 *
 * ⚠️ THEY ARE STROKE-ONLY AND TAKE THEIR COLOUR FROM CSS. Every path here is `fill: none` with the
 * stroke set by the plate rule (`.mk-docplate svg`), so a mark cannot carry a hex of its own and a
 * future retint is one stylesheet change. (One exception, noted at `STATUS_GLYPHS`: its discs and
 * the offer's seal fill with `currentColor`, which is still CSS's colour and never a hex.) This is the opposite of
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
 * The six states a query passes through, in pipeline order: the ring, the half and full centres
 * (dashed while the agent asks, solid once sent), and the star seal for an offer. Drawn for the
 * status band and in the app's footer.
 *
 * ⚠️ THE ONE PLACE IN THIS FILE THAT FILLS ANYTHING — and still no hex: every fill and stroke is
 * `currentColor`, so the colour is set once on the row in CSS.
 *
 * ⚠️ THE SAME DRAWINGS AS `StatusDot`, COPIED RATHER THAN IMPORTED. The public pages load their own
 * bundle (PublicRoot) and do not pull in the app's status component; the paths are the app's own,
 * on its 24 viewBox. The sixth, the offer, is status marks v3's star seal (SEAL_SOLID from
 * design-refs/status-marks-v3.html, one path, fill-rule evenodd, the star cut out of it), which
 * replaced the page. statusGlyphSeal.test.tsx holds it to the reference.
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
  <path
    d="M12.00 2.40A2.78 2.78 0 0 1 16.80 3.69A2.78 2.78 0 0 1 20.31 7.20A2.78 2.78 0 0 1 21.60 12.00A2.78 2.78 0 0 1 20.31 16.80A2.78 2.78 0 0 1 16.80 20.31A2.78 2.78 0 0 1 12.00 21.60A2.78 2.78 0 0 1 7.20 20.31A2.78 2.78 0 0 1 3.69 16.80A2.78 2.78 0 0 1 2.40 12.00A2.78 2.78 0 0 1 3.69 7.20A2.78 2.78 0 0 1 7.20 3.69A2.78 2.78 0 0 1 12.00 2.40ZM12.00 6.70L13.41 10.36L17.33 10.57L14.28 13.04L15.29 16.83L12.00 14.70L8.71 16.83L9.72 13.04L6.67 10.57L10.59 10.36Z"
    fill="currentColor"
    fillRule="evenodd"
    stroke="none"
    key="seal"
  />,
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

