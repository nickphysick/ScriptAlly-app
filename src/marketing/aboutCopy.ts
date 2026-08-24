/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About-page copy — verbatim from design-refs/scriptally-about.html.
 *
 * ⚠️ EDIT THE WORDS HERE AND NOWHERE ELSE, and keep them verbatim against the ref. The same
 * discipline `landingCopy.ts` carries, for the same reason: copy that lives inside a component
 * drifts every time the component is touched.
 *
 * ⚠️ THE COMMITMENTS ARE PRODUCT LAW, NOT MARKETING. "It reports; it never appraises" is asserted
 * in code across the app (the manuscripts plate's duration copy is locked against adverbs of
 * judgement, for one). Softening a commitment here would put the shop window at odds with the
 * product — so if one of these ever stops being true, the fix is the product, not the sentence.
 */

import { CopyRun } from "./CopyRuns";

export const ABOUT_DOCUMENT_TITLE = "About — ScriptAlly";

/* ══════════════ The mission hero ══════════════
   ⚠️ "Hello, we're ScriptAlly." IS GONE AND WAS NOT RELOCATED. The page used to open by
   introducing the company; it opens with the reason the company exists instead. There is nowhere
   else on the page that sentence belongs, and moving it somewhere would be the compromise the
   change was made to avoid. */

/**
 * ⚠️ TWO SPANS, ONE HEADING. The lead-in is a quiet serif line above the statement, not a second
 * heading and not a mono kicker — the ref offers all three and this is the one that was chosen.
 * Keeping them inside one `h1` is what stops the document outline gaining a level for a phrase
 * that is half a sentence.
 */
export const ABOUT_MISSION_PRE = "Our mission is simple:";
export const ABOUT_MISSION_MAIN = "Get good stories told.";

/**
 * The three registers, and the escalation between them is the point — a measured paragraph, a
 * flat sentence, then the turn. Flattening any one of them into the others loses the argument.
 */
export const ABOUT_GAP_BODY =
  "To write a truly captivating story is rare. To also be adept in mounting a solid querying " +
  "campaign? A great deal rarer. This gives rise to a barrier. A dangerous drop-off point. A gap " +
  "between the skills writers have and the skills they need to pursue traditional publication in " +
  "today's landscape.";

export const ABOUT_GAP_HIT = "That gap is where good stories go to die.";

export const ABOUT_TURN = "So, why don't we bridge it?";

/** The centred header that owns the break above the vision rows. */
export const ABOUT_SECTION_H2 = "Why ScriptAlly exists";

export interface VisionBand {
  key: string;
  eyebrow: string;
  heading: string;
  body: CopyRun[];
}

/** The three vision bands, in ref order. Odd-indexed bands flip the illustration to the left. */
export const ABOUT_VISIONS: VisionBand[] = [
  {
    key: "simplify",
    eyebrow: "The vision · 01",
    heading: "Simplify the querying process.",
    body: [
      "Who you've queried, what you sent, when a nudge is due, which version went where — the " +
      "search generates a hundred small facts, and losing one costs you. ScriptAlly keeps every " +
      "fact in its place, so the state of your search is one glance away instead of one " +
      "spreadsheet archaeology dig.",
    ],
  },
  {
    key: "waste",
    eyebrow: "The vision · 02",
    heading: "Reduce story waste.",
    body: [
      "Good stories go unrepresented every year — not because they weren't good, but because the " +
      "process defeated the writer. Queries fizzle out half-sent, nudges never happen, promising " +
      "fulls sit forgotten. We think of that as ",
      { b: "story waste" },
      ", and it's the thing ScriptAlly exists to reduce: a search that stays organised is a search " +
      "that gets finished.",
    ],
  },
  {
    key: "time",
    eyebrow: "The vision · 03",
    heading: "Give writers more time to write.",
    body: [
      "Every hour spent maintaining a tracking spreadsheet is an hour not spent on the next book. " +
      "ScriptAlly takes the admin — the dates, the counts, the who-has-what — so the only thing " +
      "left on your desk is the writing.",
    ],
  },
];

export const ABOUT_COMMITMENTS_EYEBROW = "How ScriptAlly behaves";

export interface Commitment {
  heading: string;
  body: string;
}

export const ABOUT_COMMITMENTS: Commitment[] = [
  {
    heading: "It reports; it never appraises.",
    body:
      "ScriptAlly states facts about your search — dates, counts, waits. It never grades your " +
      "manuscript or scores your chances. That's between you and your work.",
  },
  {
    heading: "Your work stays yours.",
    body:
      "Manuscripts, pitches, and querying records belong to you. No data sales, no advertising, " +
      "and nothing you write trains anything.",
  },
  {
    heading: "Free means useful.",
    body:
      "The free tier is a complete tracker, not a teaser. Pro adds more on top; it never takes the " +
      "basics away.",
  },
];

export const ABOUT_FOUNDER_BODY: CopyRun[] = [
  "ScriptAlly is designed, built, and run by one person, from the UK, around a manuscript of his " +
  "own. If you write in, it's him who answers — ",
  { link: "say hello", to: "contact" },
  ".",
];

export const ABOUT_FOUNDER_NAME = "Nick Physick";
export const ABOUT_FOUNDER_ROLE = "Founder";
