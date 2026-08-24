/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Scout's suggestion card and its returned-run status line.
 *
 * ⚠️ ITS OWN MODULE SO IT CAN BE TESTED AT ALL (v3.1 §7). Both lived in `ComparableTitlesPage.tsx`,
 * which imports `useScriptAllyDb` and therefore initialises Firebase the moment anything imports it
 * — a spec that renders the card died on `auth/invalid-api-key` before reaching an assertion. These
 * two are PURE presentation, so the fix is where they live rather than a mock in the spec.
 *
 * ⚠️ AND THE STATE THEY DRAW SHIPS UNEXERCISED: `SCOUT_LIVE` is false, so a send lands on `notyet`
 * and no browser walk reaches a suggestion card. `compsScoutVerdict.test.tsx` is the only thing that
 * sees this markup, and it is the state carrying the appraisal risk.
 */
import React from "react";
import { Check, Plus, X } from "lucide-react";
import { CompSuggestion, factsChip } from "../../lib/suggestComps";
import { compFacets } from "../../lib/compsPage";

/**
 * The returned-run status — "Returned 21 Aug · 3 titles".
 *
 * ⚠️ IT COUNTS WHAT IS ON SCREEN, not what the run brought back. Dismissing a suggestion or adding
 * one to the shelf removes it from view, and a header still claiming the original figure would be
 * describing a list the reader can see is shorter.
 *
 * ⚠️ AND A MALFORMED DATE LOSES THE DATE, NEVER THE COUNT. The two facts are independent; dropping
 * both because one is unreadable states less than is known.
 */
export function returnedLine(runAt: string, shown: number): string {
  const titles = `${shown} ${shown === 1 ? "title" : "titles"}`;
  const d = new Date(runAt);
  if (!runAt || Number.isNaN(d.getTime())) return `Returned · ${titles}`;
  return `Returned ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${titles}`;
}

export const ScoutRow: React.FC<{
  s: CompSuggestion;
  onShelf: boolean;
  leaving: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}> = ({ s, onShelf, leaving, onAdd, onDismiss }) => {
  const facts = factsChip(s);
  /* ⚠️ "Matched on" NAMES FACTS, AND IT IS THE MODEL'S OWN AXIS SPLIT — never a score and never a
     ranking. "Thriller · Adult" is a fact about the query that surfaced this title; "87% match" or
     "Strong fit" would be a verdict about the writer's book, and no amount of hedging makes one into
     the other. If a future edit needs a number here, it is the wrong number. */
  const matched = compFacets(s);
  const spineText = [String(s.year), (s.media ?? "book").toUpperCase()].join(" · ");
  return (
    <div className={`ct-srow${leaving ? " gone" : ""}`}>
      {/* ⚠️ THE SAME SPINE AS THE COMP CARD (v2 §4), so a suggestion and a recorded comp read as the
          same kind of object — which is exactly what "Add to comps" turns one into. */}
      <div className={`ct-spine${(s.media ?? "book") === "book" ? "" : " screen"}`} aria-hidden="true">
        <span className="yr">{spineText}</span>
      </div>

      <div className="ct-cmain">
        <div className="ct-ctop">
          <span className="ct-ctitle">{s.title}</span>
          <span className="ct-cauthor">{s.author}</span>
        </div>
        {s.publisher && (
          <div className="ct-cmeta"><span><b>{s.publisher}</b></span></div>
        )}
        {matched.length > 0 && (
          <div className="ct-matchline">
            <span className="ct-lbl">Matched on</span>
            {matched.map((m) => <span key={m} className="ct-mchip">{m}</span>)}
          </div>
        )}
        {/* roman, not italic — it is a statement about the book, not a quotation */}
        <div className="why">{s.why}</div>
      </div>

      <div className="ct-saside">
        {/* ⚠️ THE SHARED CHIP, NAMING ITS CATALOGUE — the SAME component and colour as the comp
            card's. One claim, one treatment, both cards: a verification that read one way in the
            list and another in the panel would be two different claims about the same fact. This
            is also the page's provenance line; the ref draws library provenance ("Named on 3 agent
            wish lists"), which needs a library this Scout does not have. */}
        <span className="ct-chip verified"><Check /> Verified · {s.verification.catalogue}</span>
        {facts && <span className="ct-chip facts">{facts}</span>}
        <div className="sacts">
          {/* ⚠️ ADD IS PINK. Blue marks the tier; the verb belongs to the writer, like every action. */}
          <button type="button" className="ct-sadd" disabled={onShelf} onClick={onAdd}>
            {onShelf ? <Check /> : <Plus />}{onShelf ? "Added" : "Add to comps"}
          </button>
          <button type="button" className="ct-sdismiss" aria-label={`Dismiss ${s.title}`} onClick={onDismiss}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};
