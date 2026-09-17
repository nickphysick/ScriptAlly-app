/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * marketingMarks — the monoline glyphs the public pages draw, traced from the refs.
 *
 * ⚠️ THEY ARE STROKE-ONLY AND TAKE THEIR COLOUR FROM CSS. Every path here is `fill: none` with the
 * stroke set by the plate rule (`.mk-docplate svg`), so a mark cannot carry a hex of its own and a
 * future retint is one stylesheet change. (One exception, noted at `STATUS_GLYPHS`: its discs fill
 * with `currentColor`, which is still CSS's colour and never a hex.) This is the opposite of
 * `manuscriptMarks.tsx`, whose fills are baked on purpose — those are illustrations that must read
 * identically in three themes; these are chrome inside a single-palette tier.
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
/* ⚠️ `mission` IS GONE, AND SO IS EVERY PART THAT ONLY IT USED. About's mission hero renders a
   finished drawing directly now, so the slot, its `PLANE_OVER_LETTERS` art and the `tall` flag that
   existed solely to give the statement heroes a bigger plate all left with it. A key that no page
   passes is a branch nobody can reach; a flag no entry sets is a knob nobody turns. */
export type MarketingIlloKey = "simplify" | "waste" | "time";

/** Which tinted ground the plate sits on. `plate` is the parchment. */
export type IlloGround = "blush" | "sage" | "plate";

interface MarketingIlloSpec {
  /** Rendered as the slot's caption and, with a prefix, as its accessible label. */
  caption: string;
  /** The illustrator's subject, from the refs' own markup. */
  subject: string;
  ground: IlloGround;
  art: React.ReactNode;
}

const MARKETING_ILLOS: Record<MarketingIlloKey, MarketingIlloSpec> = {
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
        /* `tall` went with the `mission` slot — it was the only entry that set it, so the class it
           produced had no subject and its three rules had no renderer. */
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

/** Which mark a contact-page tile carries — the address, or one of the three reasons to write. */
export type ContactTileKind = "mail" | "questions" | "broken" | "privacy";

/* ⚠️ WHOLE CLASS STRINGS, NOT AN INTERPOLATED TONE. A class built as `mk-ctile--${tone}` is
   invisible to every search for it, and a dead-class sweep then reports three live rules as dead.
   The tone belongs to the kind: rose for writing to us, grey for a fault, slate for your data. */
const TILE_CLASS: Record<ContactTileKind, string> = {
  mail: "mk-ctile mk-ctile--rose mk-ctile--mail",
  questions: "mk-ctile mk-ctile--rose",
  broken: "mk-ctile mk-ctile--grey",
  privacy: "mk-ctile mk-ctile--slate",
};

/**
 * The rounded tiles on the contact page (17 Sep). They replace the ref's plates, and the
 * speech bubble gains the tail the old open circle never had.
 */
export const ContactTile: React.FC<{ kind: ContactTileKind }> = ({ kind }) => (
  <span className={TILE_CLASS[kind]} aria-hidden="true">
    <svg viewBox="0 0 24 24">
      {kind === "mail" ? (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3.8 7l8.2 6.2L20.2 7" />
        </>
      ) : kind === "questions" ? (
        <>
          <path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7.5L7 21v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
          <path d="M7.5 10h9M7.5 13.2h6" />
        </>
      ) : kind === "broken" ? (
        <>
          <path d="M10.3 4.2 3.3 17a2 2 0 0 0 1.7 3h14a2 2 0 0 0 1.7-3l-7-12.8a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 16.5v.5" />
        </>
      ) : (
        <>
          <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" />
          <path d="M9.2 12.2l2 2 3.6-4" />
        </>
      )}
    </svg>
  </span>
);

/**
 * The six states a query passes through, in pipeline order: outline → half-disc → full disc, with
 * the solid ring for what came back and the page for an offer. Drawn for the status band's
 * carousel and repeated, dimmed, under the footer's strapline.
 *
 * ⚠️ THE ONE PLACE IN THIS FILE THAT FILLS ANYTHING — and still no hex: every fill and stroke is
 * `currentColor`, so the colour is set once on the row in CSS and the active carousel mark can
 * take a different one without eleven values following it.
 *
 * ⚠️ NOT `StatusDot`'s VOCABULARY. The app's dot is a tinted disc with a plane, chevron or star
 * inside; nothing was reused because there was nothing to reuse, and `StatusDot` is untouched.
 */
const STATUS_GLYPHS: React.ReactNode[] = [
  <circle cx={12} cy={12} r={10} key="g" />,
  <>
    <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
    <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} />
    <path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} strokeDasharray="6 4" />
    <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
  </>,
  <>
    <circle cx={12} cy={12} r={10} />
    <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
  </>,
  <>
    <path d="M5.5 2.5h9l4.5 4.5v14.5h-13.5z" strokeLinejoin="round" />
    <path d="M14 2.5V7.5h5" strokeLinejoin="round" />
    <path d="M8.5 12h7M8.5 15.5h7" strokeLinecap="round" />
    <path d="M8.5 18.8c1.5-1.6 2.6 1.4 4-.2 1-1.1 2 .6 3 .2" strokeWidth={1.7} strokeLinecap="round" />
  </>,
];

/** How many states there are — the carousel and the footer both walk exactly this many. */
export const STATUS_GLYPH_COUNT = STATUS_GLYPHS.length;

/** One state's mark. Decorative everywhere it appears: a label, where one is needed, is the caller's. */
export const StatusGlyph: React.FC<{ index: number }> = ({ index }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    {STATUS_GLYPHS[index]}
  </svg>
);

/** The small paper plane in the footer's base line. Stroke-only; the rule colours it. */
export const PaperPlane: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.5 2.5 15 21.5l-3.8-8.7L2.5 9z" />
    <path d="M21.5 2.5 11.2 12.8" />
  </svg>
);

/**
 * The lightbulb beside About's turn.
 *
 * ⚠️ IT REPLACES THE BURGUNDY LEFT RULE, it does not join it. The rule said "this is a pull
 * quote"; the bulb says "here is the idea", which is what the line actually is. Same drawn hand
 * as the planes and the handshake — stroke-only, coloured by CSS.
 */
/* ⚠️ `IdeaBulb` IS DELETED, NOT LEFT UNIMPORTED. Its only consumer was About's turn line, where a
   mark saying "here is an idea" sat beside a sentence that IS the idea — said twice, and the
   smaller voice won. An exported component nothing renders is a thing the next reader has to trace
   before they can be sure it is safe to touch. `.mk-bulb`'s rule goes with it. */

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
