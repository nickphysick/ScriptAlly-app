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

export const ABOUT_DOCUMENT_TITLE = "About — QueryHawk";

/* ══════════════ The mission hero ══════════════
   ⚠️ "Hello, we're QueryHawk." IS GONE AND WAS NOT RELOCATED. The page used to open by
   introducing the company; it opens with the reason the company exists instead. There is nowhere
   else on the page that sentence belongs, and moving it somewhere would be the compromise the
   change was made to avoid. */

/* ⚠️ SUPERSEDED: the lead-in WAS a quiet serif line inside the `h1`, chosen over a mono kicker.
   It is the mono kicker now, and it is its own element outside the heading — because it is a
   label rather than half a sentence, the h1 is "Get good stories told." alone. */
/**
 * ⚠️ NO COLON. This is a mono uppercase KICKER now, not the first half of a sentence — a label
 * has nothing to join to the line beneath it, and a colon in tracked-out caps reads as a stray
 * mark. The name stays `_PRE` because it still sits above the headline.
 */
export const ABOUT_MISSION_PRE = "Our mission is simple";
export const ABOUT_MISSION_MAIN = "Get good stories told.";

/**
 * The three registers, and the escalation between them is the point — a measured statement, a
 * flat sentence, then the turn. Flattening any one of them into the others loses the argument.
 *
 * ⚠️ THE LEDE IS ONE SENTENCE NOW. It was three sentences and two fragments ("This gives rise to a
 * barrier. A dangerous drop-off point.") which built to the hit line by accumulation; it states
 * the gap once and lets the hit line do the work instead. The two below it are UNCHANGED and must
 * stay — the hit line only lands because something named the gap immediately before it.
 */
/* ⚠️ PLAINER THAN IT WAS, DELIBERATELY. "There exists a gap between the skills required for
   writing…" is the register of a report; this is the register of a person. The sentence makes the
   same claim in the same order and the hit line beneath it still lands because something named the
   gap immediately before it — which is the only property of this paragraph that is load-bearing. */
export const ABOUT_GAP_BODY =
  "There's a gap between the skills it takes to write a captivating story and the skills it takes " +
  "to run an effective querying campaign.";

export const ABOUT_GAP_HIT = "That gap is where good stories go to die.";

/* ⚠️ A STATEMENT NOW, NOT A QUESTION. "So, why don't we bridge it?" invites an answer the reader
   cannot give; "So let's bridge it." is the turn the two lines above it have been building to.
   The lightbulb that used to sit beside it is deleted — a mark saying "here is an idea" beside a
   sentence that IS the idea says it twice. */
export const ABOUT_TURN = "So let's bridge it.";

/**
 * ⚠️ REAL DESCRIPTION, NOT `alt=""`. The watercolour handshake this replaces was decorative and
 * carried an empty alt; this drawing is the page's argument in a picture — a story being told, and
 * heard — so a reader who cannot see it should get the argument rather than a gap where it was.
 */
export const ABOUT_STORY_ALT =
  "An older hawk reading aloud from a book by the fire while a young hawk listens, astonished.";

/** The centred header that owns the break above the vision rows. */
export const ABOUT_SECTION_H2 = "Why QueryHawk exists";

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
      "search generates a hundred small facts, and losing one costs you. QueryHawk keeps every " +
      "fact in its place, so the state of your search is one glance away instead of one " +
      "spreadsheet archaeology dig.",
    ],
  },
  /* ⚠️ 02 AND 03 ARE REWRITTEN; 01 IS UNTOUCHED. The two that changed were both about the writer's
     experience of the process; these two are about what the product will and will not do, which is
     a harder thing to say and the reason the page exists. The `key`s are kept — they name the
     illustration slots in `marketingMarks`, so renaming them would break three plates to rename
     two ideas. */
  {
    key: "waste",
    eyebrow: "The vision · 02",
    heading: "Show you what's actually working.",
    body: [
      "Which letter draws requests. Which opening gets read. Which comps the agents on your list " +
      "already talk about. Querying is usually run on instinct and a vague sense of how it's " +
      "going — we'd rather show you the numbers, and be honest about how small they are.",
    ],
  },
  {
    key: "time",
    eyebrow: "The vision · 03",
    heading: "Never make the writer the product.",
    body: [
      "Your manuscript, your agent list and your rejections are yours. We don't train on them, " +
      "sell them, or show them to anyone. QueryHawk earns its money from writers paying for a " +
      "tool that works — which is the only business model that keeps our interests and yours " +
      "pointing the same way.",
    ],
  },
];

export const ABOUT_COMMITMENTS_EYEBROW = "How QueryHawk behaves";

export interface Commitment {
  heading: string;
  body: string;
}

export const ABOUT_COMMITMENTS: Commitment[] = [
  {
    heading: "It reports; it never appraises.",
    body:
      "QueryHawk states facts about your search — dates, counts, waits. It never grades your " +
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
  "QueryHawk is designed, built, and run by one person, from the UK, around a manuscript of his " +
  "own. If you write in, it's him who answers — ",
  { link: "say hello", to: "contact" },
  ".",
];

export const ABOUT_FOUNDER_NAME = "Nick Physick";
export const ABOUT_FOUNDER_ROLE = "Founder";
