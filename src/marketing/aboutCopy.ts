/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About-page copy — verbatim from design-refs/about-page-v1.html (21 Oct).
 *
 * ⚠️ EDIT THE WORDS HERE AND NOWHERE ELSE, and keep them verbatim against the ref. The same
 * discipline `landingCopy.ts` carries, for the same reason: copy that lives inside a component
 * drifts every time the component is touched.
 *
 * ⚠️ VISION 03 IS A PROMISE THE PRODUCT HAS TO KEEP: nothing sold, no adverts, nothing used to
 * train AI, and nothing in QueryHawk drafts, rewrites or grades a writer's pages. If one of these
 * ever stops being true, the fix is the product, not the sentence.
 */

import { CopyRun } from "./CopyRuns";
import { FOUNDING_CAP_WORD } from "./foundingCap";

export const ABOUT_DOCUMENT_TITLE = "About — QueryHawk";

/* ══════════════ The hero — the aim, then the gap ══════════════
   ⚠️ THE LINES ARE SET EXPLICITLY so "told." can never sit alone on a line at desktop widths. */
export const ABOUT_STATEMENT_LINES = ["We want to", "get good", "stories told."] as const;
export const ABOUT_STATEMENT = ABOUT_STATEMENT_LINES.join(" ");

/**
 * The navy band. A measured statement, a flat sentence, then the turn — the hit line only lands
 * because something named the gap immediately before it.
 */
export const ABOUT_GAP_BODY =
  "There's a gap between the skills it takes to write a captivating story and the skills it takes " +
  "to run an effective querying campaign.";

export const ABOUT_GAP_HIT = "That gap is where good stories go to die.";

export const ABOUT_TURN = "So let's bridge it.";

/** The hero drawing is the page's argument in a picture, so it carries a real description. */
export const ABOUT_STORY_ALT =
  "An older hawk reading aloud from a book by the fire while a young hawk listens, astonished.";

/** The centred header that owns the break above the vision rows. */
/* ⚠️ RENAMED 21 OCT (Nick): the hero states the aim and the navy band the problem, so this
   header turns to the method. */
export const ABOUT_SECTION_H2 = "How will we do it?";

/**
 * One illustration slot, briefed for the illustrator. `brief` is what to draw; `alt` is what a
 * reader who cannot see it is told once it is drawn. The placeholder renders `caption` only.
 */
export interface AboutPlate {
  slot: "simplify" | "waste" | "time" | "founder";
  caption: string;
  brief: string;
  alt: string;
}

export interface VisionBand {
  key: "simplify" | "waste" | "time";
  eyebrow: string;
  heading: string;
  body: CopyRun[];
}

/* ⚠️ REWRITTEN 21 OCT, ALL THREE. The old bodies read as copywriting: a dash in every paragraph,
   three-beat lists, "spreadsheet archaeology dig". These say the same three things the way a
   person would say them across a table. The `key`s are unchanged — they name the plates. */
export const ABOUT_VISIONS: VisionBand[] = [
  {
    key: "simplify",
    eyebrow: "01",
    heading: "Take the admin off your plate.",
    body: [
      "Querying throws off a surprising amount of detail. Who you sent to, which pages they " +
      "asked for, when they said they'd reply. Most of us keep it in a spreadsheet that gets " +
      "harder to read with every row. QueryHawk keeps it for you, and shows you where every " +
      "query stands at a glance.",
    ],
  },
  {
    key: "waste",
    eyebrow: "02",
    heading: "Show you what's working.",
    body: [
      "Thirty queries in, it's hard to tell whether your letter is the problem or you've just " +
      "been unlucky. QueryHawk keeps count as you go: which version of your letter drew " +
      "requests, which opening pages got read on. It won't pretend a handful of replies is a " +
      "pattern. It will show you what they say so far.",
    ],
  },
  {
    key: "time",
    eyebrow: "03",
    /* ⚠️ NICK'S HEADING (21 Oct). Two promises in one: we won't touch your data, and we won't try
       to write for you. Both are true of the product today — nothing in QueryHawk drafts, rewrites
       or grades a writer's pages — and if either stops being true, the fix is the product. */
    heading: "Mind our own business.",
    body: [
      "Your manuscript, your agent list and your rejections belong to you. We won't sell them, " +
      "show you adverts, or use anything you write to train AI. And we won't try to write for " +
      "you: no generated query letters, no rewrites of your pages. QueryHawk does the admin, " +
      "because that's what it's good at. The writing is yours.",
    ],
  },
];

export const ABOUT_PLATES: Record<AboutPlate["slot"], AboutPlate> = {
  simplify: {
    slot: "simplify",
    caption: "Illustration · The paper avalanche",
    brief:
      "A hawk at a writing desk, half buried in loose query letters, sticky notes and a long " +
      "spreadsheet printout spilling to the floor. Beside it, a second, calmer hawk slides one " +
      "neat index-card box across the desk. Funny, not frantic.",
    alt: "A hawk buried in loose query letters while another offers it one tidy index box.",
  },
  waste: {
    slot: "waste",
    caption: "Illustration · Reading the signs",
    brief:
      "A young hawk in spectacles at a corkboard pinned with query letters, a few marked with " +
      "red pins and string between them. It holds a magnifying glass up to one letter. Curious, " +
      "a little detective.",
    alt: "A young hawk studying a corkboard of query letters through a magnifying glass.",
  },
  time: {
    slot: "time",
    caption: "Illustration · Minding the shop",
    brief:
      "A hawk behind a small shop counter stacked with neat index-card drawers, whistling and " +
      "politely looking the other way. Behind it, through a doorway, a writer hawk is hunched " +
      "over a typewriter, lost in the work. The shopkeeper is clearly not peeking. Gentle, funny.",
    alt: "A shopkeeper hawk tends its index drawers while, behind it, a writer hawk types undisturbed.",
  },
  founder: {
    slot: "founder",
    caption: "Illustration · The founder's desk",
    brief:
      "The founder as a hawk, late evening at a kitchen-table desk: a laptop open on a " +
      "QueryHawk screen, a printed manuscript with a pencil on it, a mug, a lamp. Warm light, " +
      "same fireside palette as the hero. Square.",
    alt: "A hawk working late at a kitchen-table desk beside a laptop and a printed manuscript.",
  },
};

/* ══════════════ The founder's note ══════════════
   ⚠️ FIRST PERSON, AND EVERY FACT IN IT IS NICK'S TO CONFIRM. It replaces the one-line sign-off,
   which said the right thing in the third person about the person signing it. */
export const ABOUT_NOTE_EYEBROW = "A note from the founder";
export const ABOUT_NOTE_HEADING = "Hello, I'm Nick.";
export const ABOUT_NOTE_BODY: CopyRun[][] = [
  [
    "I started querying with a spreadsheet, like most people do. I work with spreadsheets for " +
    "a living, and it still got away from me. Which version of the letter went to whom, which " +
    "agent had said no reply means no, which nudge was already a week late.",
  ],
  [
    "So I built the tool I wanted. QueryHawk is designed, built and run by me, here in the UK, " +
    "while I query a manuscript of my own. I use it every day, so I find the rough edges fast.",
  ],
  [
    "And if you write in, it's me who answers. ",
    { link: "Say hello", to: "contact" },
    ".",
  ],
];
export const ABOUT_NOTE_SIGNATURE = "Nick";
export const ABOUT_FOUNDER_NAME = "Nick Physick";
export const ABOUT_FOUNDER_ROLE = "Founder";

/* ══════════════ The way out ══════════════ */
export const ABOUT_CLOSE_HEADING = "Querying soon, or querying now?";
export const ABOUT_CLOSE_BODY =
  `We're opening QueryHawk to its first ${FOUNDING_CAP_WORD} writers. Six months free, half price after ` +
  "that for as long as you need it, and a say in what gets built next.";
export const ABOUT_CLOSE_CTA = "Become a founding writer";
export const ABOUT_CLOSE_LINK = "See the plans";
