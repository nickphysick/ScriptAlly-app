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
 * The About page's illustration slots — a dashed-rim plate holding a monoline stand-in and a mono
 * caption naming what belongs there.
 *
 * ⚠️ THE PLACEHOLDER SHIPS SO NOTHING SHIFTS LATER. Each slot reserves the space the finished
 * artwork will occupy, and each carries the illustrator's subject in its caption and its aria
 * label — so the brief travels with the slot instead of living in a document nobody opens. Same
 * reasoning as `ArtSlot` in the workspace; a separate implementation because that component's
 * names are a closed union and it declines to appear in page headers.
 */
export type AboutIlloKey = "hero" | "simplify" | "waste" | "time";

interface AboutIllo {
  /** Rendered as the slot's caption and, with a prefix, as its accessible label. */
  caption: string;
  /** The illustrator's subject, from the ref's own HTML comment. */
  subject: string;
  /** Which tinted ground the plate sits on — the three alternate down the page. */
  ground: "blush" | "sage" | "plate";
  art: React.ReactNode;
}

const ABOUT_ILLOS: Record<AboutIlloKey, AboutIllo> = {
  hero: {
    caption: "Illustration · Hero",
    subject: "desk scene, paper plane over stacked query letters",
    ground: "blush",
    art: (
      <svg viewBox="0 0 120 96">
        <path d="M8 38 L74 16 L48 62 L40 44 Z" />
        <path d="M40 44 L74 16" />
        <rect x="52" y="66" width="52" height="12" rx="2" />
        <rect x="58" y="80" width="46" height="12" rx="2" />
        <path d="M60 72h30M66 86h26" />
      </svg>
    ),
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

export const AboutIllustration: React.FC<{ slot: AboutIlloKey }> = ({ slot }) => {
  const illo = ABOUT_ILLOS[slot];
  return (
    <div
      className={`mk-illo mk-illo--${illo.ground}`}
      role="img"
      aria-label={`Illustration placeholder: ${illo.subject}`}
      data-illo={slot}
    >
      {illo.art}
      <span className="mk-illotag">{illo.caption}</span>
    </div>
  );
};

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
