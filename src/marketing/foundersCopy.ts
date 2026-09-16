/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Founding Writers page copy — verbatim from design-refs/scriptally-founders-v4.html.
 *
 * ⚠️ EDIT THE WORDS HERE AND NOWHERE ELSE, and keep them verbatim against the ref — the same
 * discipline `landingCopy.ts` and `aboutCopy.ts` carry, for the same reason.
 *
 * ⚠️ AND THIS PAGE MAKES PROMISES THE PRODUCT HAS TO KEEP. Three of them are commitments rather
 * than adjectives, in the same class as the About page's:
 *   · six months of Pro, free
 *   · a founding rate "for as long as you're querying your manuscript" — a PERMANENT pricing
 *     commitment, stated here and again in the landing panel's "then half price for life"
 *   · "your data is never the experiment … exportable from day one"
 * If one stops being true the fix is the product, not the sentence.
 *
 * ⚠️ THERE IS A TIMING GAP IN THE OFFER AND IT IS DELIBERATELY NOT PAPERED OVER HERE. The hero
 * says the first hundred writers come in "totally free of charge"; the sweetener says half price.
 * Nothing on the page says when one becomes the other. The likely home for that clause is the
 * sweetener card — flagged for Nick, not written, because inventing the terms of a pricing
 * commitment is not a copy edit.
 */

import { CopyRun } from "./CopyRuns";

export const FOUNDERS_DOCUMENT_TITLE = "Founding Writers — QueryHawk";

/* ══════════════ Hero ══════════════ */
export const FOUNDERS_EYEBROW = "For founding writers";
export const FOUNDERS_H1 = "Help get things off the ground.";
/**
 * ⚠️ IT NO LONGER SAYS "totally free of charge", AND THE LOCK ON THOSE COMMAS WENT WITH THE PHRASE.
 * They were load-bearing while the clause sat mid-sentence — without them it read as attached to
 * "the full version of QueryHawk", i.e. as describing the PRODUCT rather than the OFFER. The lede
 * states the ask now and the terms are on the perk cards beneath it, where "Six months free" is
 * unambiguous because it is a heading rather than a clause. A lock asserting punctuation that no
 * longer exists is a lock on a sentence the page has left behind.
 *
 * ⚠️ "use it properly" IS THE ASK AND IT IS DELIBERATELY BLUNT. The earlier lede said "let us know
 * how it does", which asks for a report; this asks for the use that makes a report worth anything.
 *
 * ⚠️ AND "We're almost done. The app works." STAYS DELETED. The subheading states the ask;
 * reporting on the state of the build spent two sentences on the wrong subject and asked a reader
 * to take reassurance from a claim they cannot check.
 */
export const FOUNDERS_LEDE: CopyRun[] = [
  "We're looking for ",
  { b: "one hundred writers" },
  " to bring their querying campaign into QueryHawk, use it properly, and tell us what they find. " +
  "Sign up below and we'll be in touch.",
];

/**
 * ⚠️ `FOUNDERS_CTA` IS DELETED AND THE FORM TAKES ITS DEFAULT — `FOUNDING_CTA`, "Claim your place".
 * It read "Become a Founding Writer", which is the NAV's wording for the link that brings a reader
 * HERE; on the page itself, above the form, it asks someone already reading about the offer to
 * become the thing they came to become. The band and this hero now say the same three words,
 * because they are the same act.
 *
 * ⚠️ THE ARTWORK'S ALT TEXT IS REAL DESCRIPTION, NOT `alt=""`. The founders hero's old earth was
 * decorative — a globe beside a headline about building a world. This picture is the page's
 * metaphor stated in full, and a reader who cannot see it should get the metaphor rather than a
 * gap where the argument is.
 */
export const FOUNDERS_ART_ALT =
  "An older hawk and two others helping a young hawk into the air for its first flight.";

/* ══════════════ The deal ══════════════ */
export interface DealCard {
  key: string;
  kicker: string;
  heading: string;
  body: string;
}
/* ⚠️ NO `highlight` FLAG. The first card wore a blush fill on the reasoning that it is the offer
   and the other two qualify it; on the page the three read as one set of three things you get,
   and tinting one of them said they were different KINDS rather than different clauses. The flag,
   its conditional class and `.mk-fwcard--hl` all went together — a flag with no true value is a
   knob nobody turns, and the next reader would have gone looking for what sets it. */

/* ⚠️ ALL THREE BODIES ARE SHORTER THAN THEY WERE, AND THE CARDS ARE WHY. They were paragraphs in
   a three-up grid of bordered cards with room for them; the cards are flat now, sitting under a
   hero rather than filling the page, and a card whose body runs to four lines stops being a card.
   Every clause that survived is a term of the offer — what you get, what it costs, what you do.
   The adjectives went: "the full force of QueryHawk", "an arsenal of time-saving Pro features",
   "a tailored suite of querying analytics" were the product selling itself inside the one section
   that is supposed to be stating terms plainly. */
export const FOUNDERS_DEAL: DealCard[] = [
  {
    key: "deal",
    kicker: "The deal",
    heading: "Six months free",
    body:
      "The full version of QueryHawk, with nothing held back. Every feature, every tool, no card " +
      "needed.",
  },
  {
    key: "sweetener",
    kicker: "The sweetener",
    heading: "Half price after that",
    body:
      "If you stay, you'll never pay full price. A founding writer's rate for as long as you're " +
      "querying.",
  },
  {
    key: "line",
    kicker: "A direct line",
    heading: "You shape what's built",
    body:
      "Straight to the founder. Tell us what's missing, what's wrong, and what you'd build " +
      "instead.",
  },
];

/* ══════════════ Full disclosure ══════════════
   ⚠️ IT IS A PULL-QUOTE ON THE PAGE GROUND NOW, NOT A CARD — and `FOUNDERS_HONEST_KICKER`
   ("Full disclosure") is deleted with the card that framed it. A mono label above a lifted
   statement announces that a statement is coming; the statement announces itself. Do not
   reinstate it: the label and the lifted line say the same thing twice, and the label says it
   in the smaller voice.

   ⚠️ AND THE PROMISE MOVED UP RATHER THAN BEING REPEATED. "Your data is never the experiment"
   was a bolded phrase inside the first paragraph; it is the lifted line, so there is no
   `<strong>` anywhere in the prose beneath it. Emphasising it in both places is the version of
   this that says it twice and means it less. */

/** The lifted statement. Playfair, near-black, its own line — this is what the section is for. */
export const FOUNDERS_HONEST_LEAD = "Your data is never the experiment.";

/**
 * ⚠️ `quite` IS ITALIC AND IN THE SAME INK. A burgundy word here would pull the eye off the
 * statement above it, which is the one thing on this section that should hold it.
 *
 * ⚠️ EM DASHES, NOT HYPHENS — "ensured — your queries", "Writers — and their writing —". They are
 * part of the copy, and a hyphen where an em dash belongs reads as a typo in prose this careful.
 */
export const FOUNDERS_HONEST: CopyRun[][] = [
  [
    "QueryHawk isn't ",
    { em: "quite" },
    " finished. Things will shift. Features will be tweaked. The look and feel might change. But " +
    "the security of your data will be ensured — your queries, your agents, your materials. They " +
    "won't be lost, they won't be shared. Writers — and their writing — are our absolute priority.",
  ],
  [
    "All we ask is that you stick at it. Let us know what you like, what could be better, and do " +
    "shout loudly if something gets in your way.",
  ],
];

export const FOUNDERS_SIGNOFF = "Nick — QueryHawk's founder";
