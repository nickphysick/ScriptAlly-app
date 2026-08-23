/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Noteboard empty state's three illustrations. Reference:
 * design-refs/noteboard-empty-state.html — the three `.step-art` scenes, lifted PATH FOR PATH.
 *
 * ⚠️ THE GEOMETRY IS THE REF'S AND IS NOT RE-DERIVED. Every rect, path, transform and stroke
 * width below is the mockup's own; nothing was redrawn "to taste". A previous run of this pack
 * stopped rather than invent it, which is why it is here to copy.
 *
 * ⚠️ THE FILLS ARE BAKED — these are ILLUSTRATIONS, NOT THEMED SURFACES. Nothing reads
 * `currentColor`, a token, or a `var()`, so a scene renders identically in Cappuccino, Bold
 * Pastille and Editorial. That is `manuscriptMarks.tsx`'s decision and this follows it rather
 * than inventing a second pattern.
 *
 * ⚠️ AND THEY ARE FLAT: no gradient, no filter, no shadow, no partial opacity inside any SVG.
 * Palette colours only. The flat-paper law covers the artwork as well as the notes.
 *
 * ⚠️ NOT `ArtSlot`, DELIBERATELY. Its registry does carry a `"noteboard-empty"` slot, which makes
 * it look like the obvious home — but it renders `<img src=…>` and `src` is absent for every slot
 * it holds, so adopting it would reintroduce a raster dependency these illustrations exist to
 * avoid. The slot is left registered and unused.
 */
import React from "react";

interface ArtProps {
  /** The ref draws each scene on a 250×130 viewBox inside a 250px-max box. */
  className?: string;
}

/** ONE — a note being written. */
export const WriteItDownArt: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 250 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A note being written" className={className}>
    <path d="M14 112 H236" stroke="#e7ddd2" strokeWidth="2" strokeLinecap="round" />
    <rect x="46" y="26" width="112" height="72" rx="5" fill="#e9ede6" stroke="#c9d3c5" strokeWidth="1.5" transform="rotate(-5 102 62)" />
    <rect x="60" y="22" width="112" height="72" rx="5" fill="#f5e2da" stroke="#e8c8bc" strokeWidth="1.5" transform="rotate(3 116 58)" />
    <rect x="54" y="32" width="122" height="76" rx="5" fill="#fbf3d9" stroke="#eddfae" strokeWidth="1.5" />
    <path d="M68 54 H150 M68 68 H158 M68 82 H124" stroke="#c9b98a" strokeWidth="2" strokeLinecap="round" />
    <g transform="rotate(38 186 60)">
      <rect x="178" y="22" width="13" height="58" rx="2.5" fill="#f5e2da" stroke="#7c3a2a" strokeWidth="1.5" />
      <path d="M178 80 L184.5 96 L191 80 Z" fill="#fdfaf5" stroke="#7c3a2a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M181.5 89 L184.5 96 L187.5 89 Z" fill="#3a1c14" />
      <path d="M178 34 H191" stroke="#7c3a2a" strokeWidth="1.5" />
    </g>
  </svg>
);

/** TWO — three coloured notes with tags. */
export const ColourAndTagArt: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 250 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three coloured notes with tags" className={className}>
    <path d="M14 112 H236" stroke="#e7ddd2" strokeWidth="2" strokeLinecap="round" />
    <g transform="rotate(-7 62 66)">
      <rect x="26" y="34" width="72" height="66" rx="5" fill="#fbf3d9" stroke="#eddfae" strokeWidth="1.5" />
      <path d="M38 52 H84 M38 64 H76" stroke="#c9b98a" strokeWidth="2" strokeLinecap="round" />
      <rect x="38" y="76" width="34" height="13" rx="6.5" fill="#fdfaf5" stroke="#c9b98a" strokeWidth="1.2" />
    </g>
    <g>
      <rect x="90" y="28" width="72" height="66" rx="5" fill="#f5e2da" stroke="#e8c8bc" strokeWidth="1.5" />
      <path d="M102 46 H148 M102 58 H140" stroke="#cfa694" strokeWidth="2" strokeLinecap="round" />
      <rect x="102" y="70" width="38" height="13" rx="6.5" fill="#fdfaf5" stroke="#cfa694" strokeWidth="1.2" />
    </g>
    <g transform="rotate(7 190 66)">
      <rect x="154" y="34" width="72" height="66" rx="5" fill="#e9ede6" stroke="#c9d3c5" strokeWidth="1.5" />
      <path d="M166 52 H212 M166 64 H204" stroke="#a8b7a5" strokeWidth="2" strokeLinecap="round" />
      <rect x="166" y="76" width="30" height="13" rx="6.5" fill="#fdfaf5" stroke="#a8b7a5" strokeWidth="1.2" />
    </g>
  </svg>
);

/** THREE — a note gaining a date, appearing on a calendar. */
export const DatedNoteArt: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 250 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A note gaining a date, appearing on a calendar" className={className}>
    <path d="M14 112 H236" stroke="#e7ddd2" strokeWidth="2" strokeLinecap="round" />
    <rect x="24" y="30" width="88" height="70" rx="5" fill="#f5e2da" stroke="#e8c8bc" strokeWidth="1.5" />
    <path d="M36 48 H96 M36 60 H88" stroke="#cfa694" strokeWidth="2" strokeLinecap="round" />
    {/* the sage stitched date badge — the same dashed grammar the card's own task badge wears */}
    <rect x="36" y="72" width="52" height="15" rx="7.5" fill="#fdfaf5" stroke="#8a9e88" strokeWidth="1.3" strokeDasharray="3 2.5" />
    <path d="M43 79.5 l3.5 3.5 l6 -7" stroke="#5a6e58" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M58 80 H82" stroke="#8a9e88" strokeWidth="2" strokeLinecap="round" />
    <path d="M120 66 H144" stroke="#7c3a2a" strokeWidth="2" strokeLinecap="round" />
    <path d="M138 60 L145 66 L138 72" stroke="#7c3a2a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="154" y="30" width="72" height="70" rx="5" fill="#fdfaf5" stroke="#c9d3c5" strokeWidth="1.5" />
    <path d="M154 46 H226" stroke="#c9d3c5" strokeWidth="1.5" />
    <path d="M170 24 V38 M210 24 V38" stroke="#8a9e88" strokeWidth="2" strokeLinecap="round" />
    <g fill="#dfe5dc">
      <rect x="163" y="55" width="12" height="10" rx="2" />
      <rect x="184" y="55" width="12" height="10" rx="2" />
      <rect x="205" y="55" width="12" height="10" rx="2" />
      <rect x="163" y="72" width="12" height="10" rx="2" />
      <rect x="205" y="72" width="12" height="10" rx="2" />
    </g>
    <rect x="184" y="72" width="12" height="10" rx="2" fill="#e8c8bc" stroke="#7c3a2a" strokeWidth="1.3" />
  </svg>
);
