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

/**
 * The public pages' illustration slots — a dashed-rim plate holding a monoline stand-in and a mono
 * caption naming what belongs there.
 *
 * ⚠️ THE PLACEHOLDER SHIPS SO NOTHING SHIFTS LATER. Each slot reserves the space the finished
 * artwork will occupy, and each carries the illustrator's subject in its caption and its aria
 * label — so the brief travels with the slot instead of living in a document nobody opens. Same
 * reasoning as `ArtSlot` in the workspace; a separate implementation because that component's
 * names are a closed union and it declines to appear in page headers.
 *
 * ⚠️ ONE PRIMITIVE, FIVE PANELS. The landing hero, the About mission and the three vision bands
 * all render `MarketingIllustration`. Five hand-rolled plates would be five places to change when the
 * artwork lands, and the rim, the caption and the accessible label would drift apart first.
 *
 * ⚠️ `finished` IS HOW THE REAL ARTWORK ARRIVES. Pass the asset as the child and set the flag: the
 * dashed rim and the caption come off together and the label stops saying "placeholder". Without
 * it the finished illustration would ship inside the chrome that means "not drawn yet".
 */
export type MarketingIlloKey = "landingHero" | "mission" | "simplify" | "waste" | "time";

/** Which tinted ground the plate sits on. `plate` is the parchment. */
export type IlloGround = "blush" | "sage" | "plate";

interface MarketingIlloSpec {
  /** Rendered as the slot's caption and, with a prefix, as its accessible label. */
  caption: string;
  /** The illustrator's subject, from the refs' own markup. */
  subject: string;
  ground: IlloGround;
  /** The statement heroes take the taller plate and the larger art. */
  tall?: boolean;
  art: React.ReactNode;
}

/* The two statement heroes share one drawing: the landing and the About mission are the same
   promise told twice, and the refs draw the same paper plane over the same stacked letters. */
const PLANE_OVER_LETTERS = (
  <svg viewBox="0 0 200 150">
    <path d="M18 74 L176 26 L104 118 L88 84 Z" strokeLinejoin="round" />
    <path d="M88 84 L176 26" />
    <rect x="74" y="104" width="76" height="15" rx="4" />
    <rect x="74" y="126" width="56" height="15" rx="4" />
  </svg>
);

const MARKETING_ILLOS: Record<MarketingIlloKey, MarketingIlloSpec> = {
  landingHero: {
    caption: "Illustration · Hero",
    subject: "desk scene, paper plane over stacked query letters",
    ground: "blush",
    tall: true,
    art: PLANE_OVER_LETTERS,
  },
  mission: {
    caption: "Illustration · Mission",
    subject: "desk scene, paper plane over stacked query letters",
    ground: "blush",
    tall: true,
    art: PLANE_OVER_LETTERS,
  },
  simplify: {
    caption: "Illustration · The tangle, untangled",
    subject: "tangled thread resolving into a straight line / tidy index card",
    ground: "sage",
    art: (
      <svg viewBox="0 0 120 96">
        <path d="M8 60 C 20 20, 34 84, 46 48 S 66 22, 72 48" />
        <path d="M72 48 H 112" />
        <circle cx="112" cy="48" r="3" />
      </svg>
    ),
  },
  waste: {
    caption: "Illustration · Stories found",
    subject: "manuscript in a bottle / book reaching a lit desk lamp",
    ground: "plate",
    art: (
      <svg viewBox="0 0 120 96">
        <path d="M22 78 V 30 a2 2 0 0 1 2-2 h 28 v 50 z" />
        <path d="M82 78 V 30 a2 2 0 0 0-2-2 h-28 v 50" />
        <path d="M28 38h18M28 46h18M60 38h16M60 46h16" />
        <path d="M92 24 l6-10 6 10" />
        <circle cx="98" cy="30" r="4" />
        <path d="M98 34 v 44" />
      </svg>
    ),
  },
  time: {
    caption: "Illustration · Back to the page",
    subject: "closed tracker, open notebook and pen",
    ground: "blush",
    art: (
      <svg viewBox="0 0 120 96">
        <path d="M14 74 V 26 a3 3 0 0 1 3-3 h 38 v 54 z" />
        <path d="M102 74 V 26 a3 3 0 0 0-3-3 h-38 v 54" />
        <path d="M22 36h22M22 44h22M22 52h14" />
        <path d="M84 12 l 10 10 -34 34 -13 3 3-13 z" />
      </svg>
    ),
  },
};

export const MarketingIllustration: React.FC<{
  slot: MarketingIlloKey;
  /**
   * The finished asset. Supplying it replaces the monoline stand-in; pair it with `finished` so
   * the placeholder chrome comes off too.
   */
  children?: React.ReactNode;
  /** Drops the dashed rim and the caption, and stops the label saying "placeholder". */
  finished?: boolean;
}> = ({ slot, children, finished }) => {
  const illo = MARKETING_ILLOS[slot];
  return (
    <div
      className={
        `mk-illo mk-illo--${illo.ground}`
        + (illo.tall ? " mk-illo--tall" : "")
        + (finished ? " mk-illo--done" : "")
      }
      role="img"
      aria-label={finished ? illo.subject : `Illustration placeholder: ${illo.subject}`}
      data-illo={slot}
    >
      {children ?? illo.art}
      {!finished && <span className="mk-illotag">{illo.caption}</span>}
    </div>
  );
};

/** The small tinted plates beside each "way in" on the contact page. From the ref. */
export const ContactWayPlate: React.FC<{ way: "questions" | "broken" | "privacy" }> = ({ way }) => (
  <span className="mk-wayplate" aria-hidden="true">
    {way === "questions" ? (
      <svg viewBox="0 0 24 24">
        <path d="M21 11.5a8.5 8.5 0 1 1-4-7.2" />
        <path d="M8.5 12h7M8.5 8.8h4.5" />
      </svg>
    ) : way === "broken" ? (
      <svg viewBox="0 0 24 24">
        <path d="M12 9v4M12 16.5v.5" />
        <path d="M10.3 4.2 3.3 17a2 2 0 0 0 1.7 3h14a2 2 0 0 0 1.7-3l-7-12.8a2 2 0 0 0-3.4 0z" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24">
        <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" />
        <path d="M9.2 12.2l2 2 3.6-4" />
      </svg>
    )}
  </span>
);

/**
 * The party popper beside the hero's congratulation.
 *
 * ⚠️ A PLACEHOLDER AWAITING THE ILLUSTRATOR, matched to the hero artwork's stroke weight so the
 * two read as one hand until the commissioned mark arrives. Stroke-only and coloured by CSS, like
 * every other mark in this file — see the header note.
 */
export const PartyPopper: React.FC = () => (
  <svg className="mk-popper" viewBox="0 0 44 40" aria-hidden="true">
    <path d="M4 36 L17 15 L25 21 Z" strokeLinejoin="round" />
    <path d="M17 15 Q20.5 19 25 21" />
    <path d="M24 12 Q29 9 34 11" strokeLinecap="round" />
    <path d="M27 17 Q33 16 38 19" strokeLinecap="round" />
    <path d="M21 9 Q22 5 20 2" strokeLinecap="round" />
    <circle cx="35" cy="5" r="1.5" />
    <circle cx="40" cy="14" r="1.5" />
    <rect x="30" y="25" width="3" height="3" transform="rotate(20 31.5 26.5)" />
  </svg>
);

/** The tick inside a commitment card. */
export const CommitmentTick: React.FC = () => (
  <span className="mk-ctick" aria-hidden="true">
    <svg viewBox="0 0 12 12"><path d="M2 6.5 L4.8 9 L10 3" /></svg>
  </span>
);

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
