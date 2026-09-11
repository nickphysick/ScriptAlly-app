/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryEmptyCard — the Query Centre's two empty moments (Grid pass §6; ref
 * `design-refs/query-grid-enhancements-v1.html`, section 4).
 *
 * ⚠️ TWO CARDS FOR TWO MOMENTS, AND WHICH ONE IS NOT THIS FILE'S DECISION. A brand-new account and a
 * filtered-to-zero grid are different facts; `gridEmptyKind` decides between them and this only
 * draws what it is told. Nothing here counts anything either — the filtered card's line arrives
 * already built, from the same facts the cards themselves state.
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
  first: {
    slot: "empty · first",
    title: "Your first query goes here",
    line: "Log the agents you've written to and ScriptAlly will keep the dates, the nudges and the replies straight for you.",
    cta: "+ Log your first query",
    alt: "or import a spreadsheet",
  },
  filtered: {
    slot: "empty · filtered",
    title: "Nothing needs you right now",
    cta: "See what's waiting",
    alt: "or clear the filter",
  },
} as const;

/**
 * ⚠️ NOT IN THE REF, AND KEPT ON PURPOSE. The welcome pane this card replaces offered the import
 * template beside the importer, and an earlier pack locked that route as surviving "as a quiet
 * alternative, not a deletion". The importer does not offer the template itself, so dropping it here
 * would remove the only in-app way to it. It rides the alternative line, in that line's own voice.
 */
export const TEMPLATE_HREF = "/ScriptAlly-pipeline-import-template.xlsx";

export type QueryEmptyCardProps =
  | { kind: "first"; onLog: () => void; onImport: () => void; logRef?: React.Ref<HTMLButtonElement> }
  | { kind: "filtered"; line: string | null; onSeeWaiting: (() => void) | null; onClear: () => void };

export const QueryEmptyCard: React.FC<QueryEmptyCardProps> = (p) => {
  if (p.kind === "first") {
    const c = EMPTY_COPY.first;
    return (
      <div className="qce qce--first">
        <IlloSlot className="qce-illo" name={c.slot} width={96} height={96} round />
        <h3 className="qce-h">{c.title}</h3>
        <p className="qce-p">{c.line}</p>
        <button ref={p.logRef} type="button" className="qce-cta" onClick={p.onLog}>
          {c.cta}
        </button>
        <span className="qce-alts">
          <button type="button" className="qce-alt" onClick={p.onImport}>
            {c.alt}
          </button>
          <span className="qce-dot" aria-hidden="true">·</span>
          <a className="qce-alt" href={TEMPLATE_HREF} download>
            download the template
          </a>
        </span>
      </div>
    );
  }

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
