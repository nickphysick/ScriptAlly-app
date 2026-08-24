/**
 * Landing copy — word-authoritative from the design refs. The HERO block comes from
 * design-refs/scriptally-landing-hero-v3.html; everything below it (the showreel, the CTA band,
 * pricing) still comes from design-refs/landing-v13.html.
 *
 * ⚠️ MARKETING HEADLINE COPY IS NORMATIVE FROM THE REF AND IS NOT PARAPHRASED. Punctuation is part
 * of it — the semicolon in "traditional publication; an endless", the lowercase `a` opening the
 * lede, the real ellipsis character. A sentence here that reads slightly better than the ref is a
 * sentence that no longer matches the artefact it was signed off from.
 *
 * Kept as pure constants so the copy tests can lock the strapline and sub-copy exactly
 * (repo test convention: node environment, no DOM rendering). UK spelling throughout.
 */

export const HERO_EYEBROW = "For querying writers";

export const HERO_H1 = "You've written a book.";

/**
 * ⚠️ THE LEDE RESUMES THE HEADLINE'S SENTENCE, SO IT OPENS LOWERCASE. That `a` is the signature of
 * the page, not a typo: the h1 ends in a full stop, a hanging ellipsis sits in the left margin,
 * and the sentence picks up mid-flow. Anyone "fixing" the capital is removing the device.
 *
 * ⚠️ THE ELLIPSIS IS NOT IN THIS STRING. It is a separately positioned, `aria-hidden` element —
 * a screen reader meeting "… and now your querying journey begins" would read punctuation that
 * is really a piece of layout, and the glyph has to sit outside the text block to hang.
 */
export const HERO_LEDE: Array<{ text: string; b?: boolean }> = [
  { text: "and now your quest for " },
  { text: "agent representation", b: true },
  { text: " begins; an endless, gruelling campaign of self-promotion in a fiercely competitive, " +
          "ever-changing market." },
];

/**
 * The postscript, rendered outside the lede's paper slip.
 *
 * ⚠️ `robots` IS UNDERLINED, NOT SET IN MONO. It was mono when the postscript was body copy; the
 * postscript is Caveat now, and a monospace word inside a handwritten line reads as a rendering
 * fault rather than as emphasis. The flag names the treatment so the two cannot drift apart.
 *
 * ⚠️ AND THERE IS NO `P.S.` LABEL. An earlier draft had one; it is cut. The tilt and the hand do
 * the work a label would have done.
 */
export const HERO_GRIND: Array<{ text: string; underline?: boolean }> = [
  { text: "Oh, and now you're up against " },
  { text: "robots", underline: true },
  { text: ", too." },
];

/**
 * ⚠️ THE TURN IS ONE LINE. "You are not alone." preceded it and is deleted — the promise carries
 * itself, and a flat reassurance in front of it softened the thing it was introducing.
 */
export const HERO_TURN_B = "ScriptAlly tips the odds back in your favour.";

/**
 * ⚠️ THE HERO ENDS ON ONE CTA. `See pricing` and the `Free to start` microline are both gone —
 * a single button is the whole ask, and two more things under it were competing for the click
 * they were meant to support. Do not reinstate either without the same decision being re-made.
 */
export const CTA_START = "Start tracking — it's free";

/* ══════════════ The parchment band's header ══════════════ */

/**
 * ⚠️ ONE PLAIN STRING — the word "pulse" is no longer a segment. It used to be marked so a blush
 * halo could animate behind it; the halo is replaced by the ECG trace running behind the WHOLE
 * heading, so there is nothing left to mark and a segment would only invite the halo back.
 *
 * ⚠️ AND `and so much more…` IS DELETED. It was this heading's Caveat subtitle in the cream
 * section; the heading is the band's header now, and a subtitle under it competed with the first
 * feature row for the same job.
 */
export const PULSE_HEADING = "A finger on the pulse of your querying journey";

/** The break's mono eyebrow. One element, one string — delete both together if it ever goes. */
export const SECTION_EYEBROW = "What ScriptAlly does";

/* ⚠️ THE FEATURES HEADER IS DELETED AND SHOULD NOT COME BACK. `FEATURES_H2` ("The querying
   trenches, organised") and `FEATURES_SUB` ("Ditch the spreadsheet. It's time to get serious.")
   sat immediately below this heading — two centred head-and-sub pairs back to back, which reads
   as a mistake rather than as a rhythm. The heading above is the band's header now. */

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
    /* Retitled with the pulse section: the row now leads with what the reader gets rather than
       with the feature's name, which the body still carries in bold. */
    heading: "Your journey so far comes with you",
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
    /* ⚠️ RETITLED BECAUSE THE PHRASE WAS PROMOTED. "A finger on the pulse" is the centred section
       heading above the showreel now, and a row repeating it three screens later would read as a
       stutter. The row's key stays `pulse` — it names the visual and the copy, not the heading. */
    heading: "From beginning to end",
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

/* ══════════════ Pricing (public, marketing tier) ══════════════
   ⚠️ THE PRO CARD DESCRIBES WHAT PRO WILL INCLUDE AND SELLS NOTHING. There is no payment path, so
   the page states the position and offers no control — the honest shape, and the opposite of the
   sandbox page it replaces (which wrote `plan: 'Pro'` from the browser for free).
   Every Pro line below is a feature that EXISTS in the product and is gated today; nothing here is
   a roadmap promise. If a line stops being true, delete it rather than softening it. */

export const PRICING_DOCUMENT_TITLE = "ScriptAlly — Plans";
export const PRICING_H1 = "Start free. Stay free if it suits you.";
export const PRICING_SUB =
  "Tracking your querying is the whole job, and it costs nothing. Pro adds the parts that read " +
  "your post for you.";

export interface PricingTier {
  key: "free" | "pro";
  name: string;
  price: string;
  priceNote?: string;
  summary: string;
  includes: string[];
  action: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    price: "£0",
    summary: "Everything you need to run a querying campaign.",
    includes: [
      "One manuscript",
      "Unlimited agents and queries",
      "The full query pipeline, with dates and response windows",
      "Submission packages and comparable titles",
      "Notes to self, and your to-do list",
      "One Smart Import to bring your history across",
    ],
    action: "Start tracking — it's free",
  },
  {
    key: "pro",
    name: "Pro",
    price: "Price to be confirmed",
    priceNote: "no payment path yet",
    summary: "For writers running more than one book, or more than one campaign.",
    includes: [
      "Unlimited manuscripts",
      "A Smart Import every month",
      "Smart email drop — forward a reply and it becomes a tracked update",
      "Comparable-title suggestions from your manuscript",
      "Everything in Free",
    ],
    action: "Coming soon",
  },
];

export const PRICING_FOOTNOTE =
  "Pro is not on sale yet. When it is, you will be able to upgrade from inside the app — nothing " +
  "here charges you, and nothing changes on your account.";
