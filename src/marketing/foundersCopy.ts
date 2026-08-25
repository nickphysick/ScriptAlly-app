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

export const FOUNDERS_DOCUMENT_TITLE = "Founding Writers — ScriptAlly";

/* ══════════════ Hero ══════════════ */
export const FOUNDERS_EYEBROW = "For founding writers";
export const FOUNDERS_H1 = "Help build our world.";
/**
 * ⚠️ THE COMMAS AROUND "totally free of charge" ARE LOAD-BEARING. Without them the phrase can be
 * read as attached to "the full version of ScriptAlly" — i.e. as describing the product rather
 * than the offer, which is a claim this app does not make. A comma is exactly what a well-meaning
 * edit removes, so a lock asserts the punctuation as well as the sentence.
 *
 * ⚠️ AND "We're almost done. The app works." IS DELETED, NOT RELOCATED. The subheading states the
 * ask; reporting on the state of the build first spent two sentences on the wrong subject and
 * asked a reader to take reassurance from a claim they cannot check.
 */
export const FOUNDERS_LEDE: CopyRun[] = [
  "We're looking for ",
  { b: "one hundred writers" },
  " to bring their querying journey into the full version of ScriptAlly, totally free of charge, " +
  "and let us know how it does. Interested? Sign up below and we'll be in touch.",
];
export const FOUNDERS_CTA = "Become a Founding Writer";

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

export const FOUNDERS_DEAL: DealCard[] = [
  {
    key: "deal",
    kicker: "The deal",
    heading: "Six months of Pro, free",
    body:
      "The full force of ScriptAlly is yours. Be amongst the first to supercharge your campaign " +
      "for agent representation, backed by an arsenal of time-saving Pro features and a tailored " +
      "suite of querying analytics.",
  },
  {
    key: "sweetener",
    kicker: "The sweetener",
    heading: "Half price, for as long as you need it.",
    body:
      "If you choose to stick with ScriptAlly, you'll never pay full price. You'll pay a founding " +
      "writers' rate for as long as you're querying your manuscript.",
  },
  {
    key: "line",
    kicker: "A direct line",
    heading: "You shape what's built",
    body:
      "You'll be in direct contact with ScriptAlly's founder, giving feedback, shaping new " +
      "features, helping to design and refine a tool that works for you and for the whole " +
      "writing community.",
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
    "ScriptAlly isn't ",
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

export const FOUNDERS_SIGNOFF = "Nick — ScriptAlly's founder";
