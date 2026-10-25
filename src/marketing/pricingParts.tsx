/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pieces /pricing draws the same at every width: the price as the refs set it, and the four perk
 * cards' line drawings. Shared by `PricingPage` (above 760px) and `PricingPhone` (at and below), so
 * neither tree keeps a copy of the other's.
 */
import React from "react";
import type { Pv4Perk } from "./pricingCopy";

/** A price as the ref draws it: an optional "from", a small £, the figure, an optional unit. */
export const Price: React.FC<{ amount: string; from?: string; per?: string }> = ({ amount, from, per }) => (
  <div className="mk-pv4price">
    {from && <span className="mk-pv4from">{from}</span>}
    <span className="mk-pv4cur">£</span>
    <span className="mk-pv4amt">{amount}</span>
    {per && <span className="mk-pv4per">{per}</span>}
  </div>
);

/** The four perk cards' line drawings — the ref's inline SVGs, path for path. */
export const PERK_ICON: Record<Pv4Perk["icon"], React.ReactNode> = {
  gift: <><path d="M20 12v9H4v-9" /><path d="M2 7h20v5H2z" /><path d="M12 21V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>,
  import: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></>,
};

