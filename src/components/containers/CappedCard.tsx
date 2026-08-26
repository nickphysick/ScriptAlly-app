/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE CAPPED CARD — a tinted cap strip over a hairline body ═════════════════════════════════
 *
 * The `.card > .cap + .in` of `design-refs/manuscripts-book-profile.html`.
 *
 * ⚠️ THE CAP IS `CardBand`, IMPORTED FROM `packages/` — not a copy of it. That component declares
 * itself the single implementation of a band head ("the legend must render this component, never a
 * reproduction"), so the honest way to draw one here is to render it. It was widened additively to
 * take a general tint plus a caller-supplied glyph; the material kinds it already served are
 * untouched, and the packages page renders byte-identically.
 *
 * ⚠️ THE TINT IS A COLOUR AND NOT A CLAIM. `pink` here does not mean "query letter" — the four
 * tints carry material-type names on the packages page, where the cards ARE materials, and general
 * names everywhere else. See the cap grammar at the top of `containers.css`.
 */
import React from "react";
import { CardBand, CapTint } from "../packages/CardBand";
import "./containers.css";

export type { CapTint };

export interface CappedCardProps {
  tint: CapTint;
  /** What the cap says the card is. */
  label: string;
  /** The cap's mark. Optional — a cap with no glyph is a label on a tint, which is fine. */
  glyph?: React.ReactNode;
  /** A mono note pushed to the cap's right edge — a count, a standing word, `Pro`. */
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const CappedCard: React.FC<CappedCardProps> = ({
  tint, label, glyph, right, children, className,
}) => (
  <div className={`sa-card${className ? ` ${className}` : ""}`}>
    <CardBand kind={tint} label={label} glyph={glyph} right={right} className={`sa-cap--${tint}`} />
    <div className="sa-cardbody">{children}</div>
  </div>
);
