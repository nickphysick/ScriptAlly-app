/**
 * Landing copy — verbatim from design-refs/landing-v13.html (pixel- and word-authoritative).
 * Kept as pure constants so the copy tests can lock the strapline and sub-copy exactly
 * (repo test convention: node environment, no DOM rendering). UK spelling throughout.
 */

export const HERO_EYEBROW = "For querying writers";

export const HERO_H1 = "Take control of your querying journey.";

export const HERO_SUB =
  "Every agent, every query, every response — tracked. And that's just the start of it. " +
  "ScriptAlly is a finger on the pulse of your querying journey, packed with tools designed " +
  "to aid you on your quest to find a champion for your words.";

export const HERO_NOTE = "Free to start · Built for UK querying";

export const CTA_START = "Start tracking — it's free";
export const CTA_PRICING = "See pricing";

export const FEATURES_H2 = "The querying trenches, organised";
export const FEATURES_SUB = "Ditch the spreadsheet. It's time to get serious.";

export const CTA_BAND_H2 = "Your story deserves better than a spreadsheet.";
export const CTA_BAND_SUB = "Free to start. Take control of your querying journey today.";

export const DOCUMENT_TITLE = "ScriptAlly — Take control of your querying journey";

/** Feature-row copy: heading + body segments (bold parts marked) + action labels. */
export interface FeatureRow {
  key: string;
  heading: string;
  /** Body as segments — { b: true } renders 500-weight ink (the ref's <b>). */
  body: Array<{ text: string; b?: boolean }>;
  primary: string;
  /** Text-link action; Notes to self has none. */
  link?: string;
  /** Visual sits left of the copy (the ref's .flip rows). */
  flip?: boolean;
  /** Inline PRO badge after the heading (Smart email drop). */
  pro?: boolean;
}

export const FEATURE_ROWS: FeatureRow[] = [
  {
    key: "import",
    heading: "Smart Import",
    body: [
      { text: "Already deep in the trenches? Bring your history with you. Upload the spreadsheet you've been fighting with and " },
      { text: "Smart Import", b: true },
      { text: " turns it into a living database — every agent, query and response, ready to track from today." },
    ],
    primary: "Import your history",
    link: "Download the import template",
  },
  {
    key: "track",
    heading: "Track every query",
    body: [
      { text: "Log a submission once and follow its whole journey. The " },
      { text: "live pipeline", b: true },
      { text: " always knows what's queried, what's requested and what's out — and every reply you record writes itself into a " },
      { text: "timeline", b: true },
      { text: " of the whole campaign." },
    ],
    primary: "Start tracking",
    link: "See how tracking works",
    flip: true,
  },
  {
    key: "agents",
    heading: "A home for your agents",
    body: [
      { text: "Wish lists, submission routes, response times and your own starred notes — every agent you're courting, kept properly. Then let " },
      { text: "Discover", b: true },
      { text: " find the UK agents who want your manuscript, matched on " },
      { text: "genre, age category and wish list", b: true },
      { text: ", with open-to-submissions status front and centre." },
    ],
    primary: "Find your agents",
    link: "About the agent list",
  },
  {
    key: "pulse",
    heading: "A finger on the pulse",
    body: [
      { text: "Open any query and its whole story is there — " },
      { text: "every event date-stamped", b: true },
      { text: ", " },
      { text: "every material accounted for", b: true },
      { text: ", response windows measured, and a " },
      { text: "nudge reminder", b: true },
      { text: " when it's polite to follow up. Nothing forgotten, nothing left blank." },
    ],
    primary: "Start tracking",
    link: "See a query's story",
    flip: true,
  },
  {
    key: "packages",
    heading: "Curate and compare",
    body: [
      { text: "Build " },
      { text: "submission packages", b: true },
      { text: " from your letters, synopses and sample pages — version them, reuse them, and see at a glance " },
      { text: "which version went where", b: true },
      { text: ". When an agent asks what you sent, you'll know in one look." },
    ],
    primary: "Build a package",
    link: "More on materials",
  },
  {
    key: "email",
    heading: "Smart email drop",
    pro: true,
    body: [
      { text: "The best moments in querying arrive by email. Forward one to ScriptAlly and it becomes a tracked update — " },
      { text: "who it's from, what they've asked for, when they need it", b: true },
      { text: " — without you transcribing a word of your good news." },
    ],
    primary: "See what Pro adds",
    link: "How email drop works",
    flip: true,
  },
  {
    key: "notes",
    heading: "Notes to self",
    body: [
      { text: "Querying is a head full of loose threads. Jot them down as they come — " },
      { text: "pin the ones that matter", b: true },
      { text: " and they'll wait for you, right beside the work, until you need them." },
    ],
    primary: "Start tracking",
  },
];
