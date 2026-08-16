/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * marketingMarks — the monoline glyphs the public pages draw, traced from the refs.
 *
 * ⚠️ THEY ARE STROKE-ONLY AND TAKE THEIR COLOUR FROM CSS. Every path here is `fill: none` with the
 * stroke set by the plate rule (`.mk-docplate svg`), so a mark cannot carry a hex of its own and a
 * future retint is one stylesheet change. This is the opposite of `manuscriptMarks.tsx`, whose
 * fills are baked on purpose — those are illustrations that must read identically in three themes;
 * these are chrome inside a single-palette tier.
 *
 * ⚠️ NOT `ArtSlot`. That component's own docblock rejects illustration in page headers and its slot
 * names are a closed union owned by the To-do workspace; a marketing plate is neither.
 */

import React from "react";

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
