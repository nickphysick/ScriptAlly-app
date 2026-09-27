/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The three count cards (v11 §3.3), a multi-select OR over the list. MOVED, NOT RESTYLED, by page
 * header v2 §4: they left the retired hero and sit at the top of the page column, below the rule.
 */
import React from "react";
import type { ContactCard, ContactCardKey } from "../../../lib/contactList";

export const CountCards: React.FC<{
  cards: ContactCard[];
  sel: ReadonlySet<ContactCardKey>;
  onToggle: (k: ContactCardKey) => void;
  row?: boolean;
}> = ({ cards, sel, onToggle, row = false }) => (
  <div className={`clv-tiles${row ? " clv-tiles--row" : ""}${sel.size ? " clv-tiles--any" : ""}`} data-clv="tiles" role="group" aria-label="Filter by standing">
    {cards.map((c) => (
      <button
        key={c.key}
        type="button"
        className="clv-kt"
        data-k={c.key}
        data-clv="tile"
        aria-pressed={sel.has(c.key)}
        onClick={() => onToggle(c.key)}
      >
        <span className="clv-kh">
          <b>{c.count}</b>
          <span className="clv-kn">
            <span>{c.name}</span>
            <small className={c.urgent ? "clv-pd" : undefined}>{c.fact}</small>
          </span>
        </span>
      </button>
    ))}
  </div>
);
