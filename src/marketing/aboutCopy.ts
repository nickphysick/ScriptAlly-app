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

export const ABOUT_HERO_H1 = "Querying shouldn't be the hard part";

export const ABOUT_HERO_BODY: CopyRun[] = [
  { b: "Hello, we're ScriptAlly." },
  " Finding an agent had turned into a second job of spreadsheets, guesswork and lost threads — so " +
  "we built the tool the search deserves. One place for your agents, your manuscripts, and every " +
  "exchange between you and representation.",
];

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
