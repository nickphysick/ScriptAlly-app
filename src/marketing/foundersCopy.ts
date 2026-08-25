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
export const FOUNDERS_LEDE: CopyRun[] = [
  "We're almost done. The app works. And we're looking for ",
  { b: "one hundred writers" },
  " to bring their querying journey into the full version of ScriptAlly totally free of charge " +
  "and let us know how it does. Interested?",
];
export const FOUNDERS_CTA = "Become a Founding Writer";

/* ══════════════ The deal ══════════════ */
export interface DealCard {
  key: string;
  kicker: string;
  heading: string;
  body: string;
  /** The first card carries the blush treatment — it is the offer, the others qualify it. */
  highlight?: boolean;
}

export const FOUNDERS_DEAL: DealCard[] = [
  {
    key: "deal",
    kicker: "The deal",
    heading: "Six months of Pro, free",
    body:
      "The full force of ScriptAlly is yours. Be amongst the first to supercharge your campaign " +
      "for agent representation, backed by an arsenal of time-saving Pro features and a tailored " +
      "suite of querying analytics.",
    highlight: true,
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
      "Founding writers will work alongside ScriptAlly's founder to shape the tool and design " +
      "features that work for them.",
  },
];

/* ══════════════ Full disclosure ══════════════ */
export const FOUNDERS_HONEST_KICKER = "Full disclosure";
export const FOUNDERS_HONEST: CopyRun[][] = [
  [
    "It's a beta. Things will occasionally move under you — a page redesigned, a feature renamed, " +
    "the odd rough edge. ",
    { b: "Your data is never the experiment" },
    ": every query, response and note you record is yours, safe, and exportable from day one.",
  ],
  [
    "What we ask in return is small: use it on your real querying, and tell us when something " +
    "gets in your way.",
  ],
];

/**
 * ⚠️ IT IS A SIGN-OFF, NOT A HEADING. Caveat, burgundy, tilted — the same hand as the landing's
 * postscript. The page is one person asking; the signature is what says so.
 */
export const FOUNDERS_SIGNOFF = "Nick — ScriptAlly's founder";
