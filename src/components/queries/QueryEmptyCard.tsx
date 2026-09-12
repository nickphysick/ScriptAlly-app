/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryEmptyCard — the Query Centre's two empty moments (Grid pass §6; ref
 * `design-refs/query-grid-enhancements-v1.html`, section 4).
 *
 * ⚠️ ONE CARD NOW, AND THE `first` VARIANT IS RETIRED (empty-states pack, Phase 2). The blank
 * account is the feature-led page — `QueryEmptyFeatures` — so the card that used to answer it is
 * DELETED rather than left reachable: a replacement that is added keeps its original alive, and
 * the two would have read almost the same. `gridEmptyKind` still decides which empty moment it is
 * and still returns "first"; the PAGE now branches on that ahead of this component.
 *
 * ⚠️ WHAT STAYS IS THE FILTERED CARD, whose claim is narrower and whose line arrives already
 * built, from the same facts the cards themselves state. Nothing here counts anything.
 *
 * ⚠️ THE ILLUSTRATION IS A PLACEHOLDER UNTIL ARTWORK EXISTS, AND IT SAYS SO. `IlloSlot` draws the
 * hatched slot with its name on it; dropping the art in later is one prop, and the chrome that
 * admits the slot is unfilled comes off with it.
 */
import React from "react";
import "./queryEmptyCard.css";
import { IlloSlot } from "./IlloSlot";

/** The ref's words, verbatim — section 4 of the enhancements ref. The spec reads them back from it. */
export const EMPTY_COPY = {
  /* ⚠️ `first` IS GONE WITH ITS CARD (Phase 2) — its words live in `queryEmptyCopy.ts` now, where
     the feature-led hero reads them. Two copies of a first-run sentence is two sentences the day
     one is edited. */
  filtered: {
    slot: "empty · filtered",
    title: "Nothing needs you right now",
    cta: "See what's waiting",
    alt: "or clear the filter",
  },
} as const;

/**
 * ⚠️ EXPORTED, AND ITS ONE CONSUMER IS NOW THE FEATURE-LED HERO (Phase 2). An earlier pack locked
 * this route as surviving "as a quiet alternative, not a deletion": the importer does not offer the
 * template itself, so dropping it would remove the only in-app way to it. The hero's second link is
 * that route; the constant stays HERE because this file is where the lock that guards it looks.
 */
export const TEMPLATE_HREF = "/ScriptAlly-pipeline-import-template.xlsx";

/** ⚠️ NO LONGER A UNION — the `first` member went with its card (Phase 2). Kept as a named type so
 *  the call site reads the same and a future second moment has somewhere to go. */
export type QueryEmptyCardProps =
  { kind: "filtered"; line: string | null; onSeeWaiting: (() => void) | null; onClear: () => void };

export const QueryEmptyCard: React.FC<QueryEmptyCardProps> = (p) => {
  const c = EMPTY_COPY.filtered;
  return (
    <div className="qce qce--filtered">
      <IlloSlot className="qce-illo" name={c.slot} width={96} height={96} round />
      <h3 className="qce-h">{c.title}</h3>
      {/* ⚠️ OMITTED, NOT EMPTIED, when nothing is with an agent — a line about zero queries says
          nothing, and a CTA into a tile that holds nothing is a control that does nothing. */}
      {p.line && <p className="qce-p">{p.line}</p>}
      {p.onSeeWaiting && (
        <button type="button" className="qce-cta" onClick={p.onSeeWaiting}>
          {c.cta}
        </button>
      )}
      <button type="button" className="qce-alt" onClick={p.onClear}>
        {c.alt}
      </button>
    </div>
  );
};
