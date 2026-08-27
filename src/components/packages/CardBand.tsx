/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE CARD BAND — one head, three call sites, and a legend that renders it ══════════════════
 *
 * ⚠️ THE LEGEND MUST RENDER THIS COMPONENT, NEVER A REPRODUCTION (D6). Same law as `StatusDot`'s
 * legends: a key that draws its own swatch is a second implementation of the thing it is explaining,
 * and it goes on being right about a band that has since changed. Here that risk is not theoretical
 * — the package card hand-wrote its own parcel `<svg>` while the material cards went through
 * `TypeGlyph`, so the page already had two ways of drawing a band head before anyone asked for a
 * third.
 *
 * ⚠️ `kind` IS `ComponentType | "package"`, NOT A CLASS NAME. The caller says what the card IS; the
 * band decides the tint, the glyph and the modifier. A caller passing `pkgb-t-let` could pass a
 * class that does not exist and get an unstyled band with nothing to point at.
 */
import React from "react";
import { ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META } from "./typeMeta";
import "./packagesBroadsheet.css";

/**
 * ⚠️ THE FOUR TINTS ARE A SECOND, GENERAL VOCABULARY FOR THE SAME FOUR COLOURS — added so a card
 * that is NOT a material can still draw its band head through this component rather than through a
 * reproduction of it, which is the one thing this file's head forbids. A caller passing a tint
 * supplies its own `glyph` and `label`; the material kinds keep resolving both from `TYPE_META`.
 *
 * ⚠️ AND A TINT IS NOT A `ComponentType`, NOR A COLOUR. It is what the colour MEANS — `outgoing` is
 * what you send and what is out with somebody, `incoming` is what came back. `slate` would name the
 * hex and `pro` names the gate. Widening `ComponentType` to carry these would have put a display
 * category into the data model; naming them after materials would make every non-material card that
 * used one state something untrue.
 */
export type CapTint = "outgoing" | "incoming" | "pro" | "reference";

export const CAP_TINTS: readonly CapTint[] = ["outgoing", "incoming", "pro", "reference"];

export type BandKind = ComponentType | "package" | CapTint;

/** The band's tint modifier, by kind. The card takes the same class. */
export const BAND_CLASS: Record<string, string> = {
  package: "pkgb-t-pkg",
  [ComponentType.QUERY_LETTER]: "pkgb-t-let",
  [ComponentType.SYNOPSIS]: "pkgb-t-syn",
  [ComponentType.SAMPLE_PAGES]: "pkgb-t-sam",
};

/** What the band says it is. A package is not a `ComponentType`, so its label lives here. */
export const BAND_LABEL: Record<string, string> = {
  package: "Submission package",
  [ComponentType.QUERY_LETTER]: TYPE_META[ComponentType.QUERY_LETTER].label,
  [ComponentType.SYNOPSIS]: TYPE_META[ComponentType.SYNOPSIS].label,
  [ComponentType.SAMPLE_PAGES]: TYPE_META[ComponentType.SAMPLE_PAGES].label,
};

/** The four kinds the page bands, in the order the legend reads them: the parent, then its parts. */
export const BAND_KINDS: readonly BandKind[] = [
  "package", ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS, ComponentType.SAMPLE_PAGES,
];

/**
 * ⚠️ THE PARCEL IS DRAWN HERE BECAUSE `TypeGlyph` IS KEYED BY `ComponentType`, WHICH HAS NO PACKAGE
 * MEMBER — a package is not a material. Widening that enum to carry a UI concept would put a display
 * category into the data model, which is the wrong direction; one branch in one component is the
 * smaller cost. It is the same parcel the Query Centre's sent strip draws.
 */
const PARCEL = (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 4 28 10v12L16 28 4 22V10z" />
    <path d="M16 15 28 10M16 15v13M16 15 4 10" />
  </svg>
);

const IS_TINT = (k: BandKind): k is CapTint => (CAP_TINTS as readonly string[]).includes(k);

export interface CardBandProps {
  kind: BandKind;
  /** Overrides the standing label — the legend uses it to name the colour's meaning. REQUIRED when
   *  `kind` is a tint, which names a colour and therefore cannot name a thing. */
  label?: string;
  /** A mono note pushed to the right of the band, e.g. `Locked`. */
  right?: React.ReactNode;
  /** The mark, for a TINTED band. The material kinds resolve their own and ignore this. */
  glyph?: React.ReactNode;
  /** Additive — the tint class for a general band. Packages passes nothing, so every band on that
   *  page renders byte-identically to before this widening. */
  className?: string;
}

export const CardBand: React.FC<CardBandProps> = ({ kind, label, right, glyph, className }) => (
  <div className={className ? `pkgb-cardhead ${className}` : "pkgb-cardhead"}>
    {IS_TINT(kind) ? glyph : kind === "package" ? PARCEL : <TypeGlyph type={kind} size={16} />}
    <span className="pkgb-chlbl">{label ?? BAND_LABEL[kind]}</span>
    {right && <span className="pkgb-chrt">{right}</span>}
  </div>
);

/**
 * The legend under the materials shelf (D6).
 *
 * ⚠️ IT RENDERS `CardBand` ITSELF — that is the whole point, and it is why the band had to become a
 * component first. Each entry is a real band at its real size, with the name of what it marks.
 */
export const BandLegend: React.FC = () => (
  <div className="pkgb-legend" aria-label="What the colours mean">
    {BAND_KINDS.map((k) => (
      <div key={String(k)} className={`pkgb-legcell ${BAND_CLASS[String(k)]}`}>
        <CardBand kind={k} />
      </div>
    ))}
  </div>
);
