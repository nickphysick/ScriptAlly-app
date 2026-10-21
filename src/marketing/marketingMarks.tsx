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

/** Which mark a contact-page tile carries — the address, or one of the three reasons to write. */
export type ContactTileKind = "mail" | "questions" | "broken" | "privacy";

/* ⚠️ WHOLE CLASS STRINGS, NOT AN INTERPOLATED TONE. A class built as `mk-ctile--${tone}` is
   invisible to every search for it, and a dead-class sweep then reports three live rules as dead.
   The tone belongs to the kind: rose for writing to us, grey for a fault, slate for your data. */
const TILE_CLASS: Record<ContactTileKind, string> = {
  mail: "mk-ctile mk-ctile--rose mk-ctile--mail",
  questions: "mk-ctile mk-ctile--rose",
  broken: "mk-ctile mk-ctile--grey",
  privacy: "mk-ctile mk-ctile--slate",
};

/**
 * The rounded tiles on the contact page (17 Sep). They replace the ref's plates, and the
 * speech bubble gains the tail the old open circle never had.
 */
export const ContactTile: React.FC<{ kind: ContactTileKind }> = ({ kind }) => (
  <span className={TILE_CLASS[kind]} aria-hidden="true">
    <svg viewBox="0 0 24 24">
      {kind === "mail" ? (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3.8 7l8.2 6.2L20.2 7" />
        </>
      ) : kind === "questions" ? (
        <>
          <path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7.5L7 21v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
          <path d="M7.5 10h9M7.5 13.2h6" />
        </>
      ) : kind === "broken" ? (
        <>
          <path d="M10.3 4.2 3.3 17a2 2 0 0 0 1.7 3h14a2 2 0 0 0 1.7-3l-7-12.8a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 16.5v.5" />
        </>
      ) : (
        <>
          <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" />
          <path d="M9.2 12.2l2 2 3.6-4" />
        </>
      )}
    </svg>
  </span>
);

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

/** Privacy = a shield with a tick. Terms = a document. Straight from the two refs. */
export const LegalPlate: React.FC<{ doc: "terms" | "privacy" }> = ({ doc }) =>
  doc === "privacy" ? (
    <svg viewBox="0 0 24 24">
      <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" />
      <path d="M9.2 12.2l2 2 3.6-4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24">
      <path d="M6 3.5h9l4 4v13H6z" />
      <path d="M15 3.5V8h4" />
      <path d="M9 12h7M9 15.5h7" />
    </svg>
  );
