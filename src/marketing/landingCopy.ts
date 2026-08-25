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

import { CopyRun } from "./CopyRuns";
import { supportMailto } from "../lib/companyInfo";

/* ⚠️ `HERO_EYEBROW` ("For querying writers") IS DELETED, NOT RELOCATED. The headline says who
   the page is for; a mono label above it was the page introducing its own first sentence.
   `landingCopy.test.ts` asserts the export is absent rather than pinning the string — the
   same shape as the four constants the actions row took with it. */

export const HERO_H1 = "You've written a book.";

/* ⚠️ THE CONGRATULATION IS DELETED AND IS NOT COMING BACK AS WORDS. `HERO_CONGRATS`
   ("Congratulations.") and `HERO_CONGRATS_SUB` ("You've got further than most.") were a two-line
   beat between the statement and the lede, and the note here argued they were load-bearing —
   that the slip's "but here your quest… begins" had nothing to turn against without them.
   It turns against the STATEMENT, which is the stronger reading: "You've written a book." is
   itself the thing the lede undercuts. Three lines of praise before the argument starts was the
   page clearing its throat.
   ⚠️ AND THE TICK THAT REPLACED THE WORDS HAS ITSELF GONE. The acknowledgement was briefly
   carried by a ticked box beside the headline; that mark is retired too, so the statement now
   carries the beat alone. `hero-tick-placeholder.png` is RETAINED in the assets folder but is
   imported by nothing — see CLAUDE.md, and do not read its presence as evidence it is in use. */

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
  { text: "but here your quest for " },
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
  { text: "…and these days, you're up against " },
  { text: "robots", underline: true },
  { text: ", too." },
];

/**
 * ⚠️ THE TURN IS ONE LINE. "You are not alone." preceded it and is deleted — the promise carries
 * itself, and a flat reassurance in front of it softened the thing it was introducing.
 */
/**
 * The turn, in two spans rather than one wrapping string.
 *
 * ⚠️ TWO SPANS, NOT A WRAP, BECAUSE THE BREAK IS STRUCTURAL. The lead is a sentence of its own and
 * must never share a line with the body, however wide the page gets — a wrap cannot guarantee
 * that and two elements can. The body may wrap within itself; the lead may not join it.
 *
 * ⚠️ AND THE LEAD CARRIES A SAGE WASH, WHICH IS WHY IT IS `display: inline-block` WITH NEGATIVE
 * SIDE MARGINS. The gradient has to bleed a little past the glyphs to read as a highlighter stroke
 * rather than a label with a background; an inline box would break the wash across lines and a
 * block would run it to the full measure.
 */
/* ⚠️ NO FULL STOP, AND THAT IS THE POINT RATHER THAN AN OMISSION. A blinking caret follows this
   line, and a caret after a full stop reads as a sentence that has ended and is being typed into
   anyway. The caret is CHROME, not copy — it is an `aria-hidden` element in `Hero.tsx`, never a
   character in this string, because a screen reader announcing a decorative bar is noise and a
   character could not blink. */
export const HERO_TURN_LEAD = "Introducing ScriptAlly";
/**
 * ⚠️ `CopyRun[]`, NOT A STRING, AND THE REASON IS ONE WORD. `fly` is the sentence's whole payload
 * and carries the emphasis; `CopyRuns`' existing `{ b }` member renders it, rather than markup in
 * the component or a second constant holding the tail. The tier has ONE copy-rendering path and
 * this stays on it.
 * ⚠️ AND THE FULL STOP BELONGS TO THE PLAIN RUN, NOT TO THE BOLD ONE. Bolding the stop makes the
 * emphasis look like a typographic accident at the size this renders.
 */
export const HERO_TURN_BODY: CopyRun[] = [
  "An end-to-end querying companion built to help your manuscript ",
  { b: "fly" },
  ".",
];

/**
 * ⚠️ THE HERO ENDS ON ONE CTA. `See pricing` and the `Free to start` microline are both gone —
 * a single button is the whole ask, and two more things under it were competing for the click
 * they were meant to support. Do not reinstate either without the same decision being re-made.
 */
/* ⚠️ `CTA_START` AND `CTA_LEARN` ARE DELETED WITH THE ACTIONS ROW THAT RENDERED THEM. The hero's
   action is the founding panel; `Start tracking — it's free` offered a self-serve product that
   does not exist yet, and `Learn more` was an in-page anchor competing with a real offer three
   inches below it.
   ⚠️ THE STRING "Start tracking — it's free" IS STILL LIVE, on `/pricing`, as the free tier's
   action label — so a lock asserting the WORDING has left the site would be wrong. The claim is
   about the constants and the hero. */

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

/* ⚠️ THE CLOSING CTA BAND IS GONE, AND WITH IT `CTA_BAND_H2`, `CTA_BAND_SUB` AND
   `CTA_BAND_HEADING` ("Free to start. Take control of your querying journey today."). The page
   closes on the founding-members letter below instead — an actual offer with an actual thing to
   do, rather than a restatement of the hero's CTA three screens later. Do not reinstate any of
   the three: a band that repeats "start tracking" beneath a band that asks you to claim a place
   gives the foot of the page two competing primaries. */

/* ══════════════ The founding-members band ══════════════
   ⚠️ VERBATIM FROM `design-refs/scriptally-landing-v13.html` .beta, under the same discipline as
   the rest of this file: the words are edited here or nowhere.

   ⚠️ AND THE OFFER IS A PROMISE THE PRODUCT HAS TO KEEP. "keep every feature free through the
   beta" and "help decide what gets built next" are commitments, not adjectives — the same class
   as the About page's three, and the same rule applies: if one stops being true the fix is the
   product, not the sentence. The number in the heading is the cap the backend carries; if that
   number ever changes, this heading changes with it. */
export const FOUNDING_EYEBROW = "Founding members";
export const FOUNDING_HEADING = "Be one of the first hundred.";
export const FOUNDING_BLURB =
  "ScriptAlly opens in stages. Founding members get in first, keep every feature free through " +
  "the beta, and help decide what gets built next.";

/* ══════════════ The hero's founding panel ══════════════
   ⚠️ VERBATIM FROM `design-refs/scriptally-landing-v16.html` .found-panel. This is the landing
   hero's PRIMARY ACTION now — `Start tracking — it's free` has left the hero, because pre-launch
   there is no self-serve product behind it.

   ⚠️ AND THE OFFER IS A PRICING COMMITMENT, STATED ON TWO PAGES. "then half price for life" here
   and "for as long as you're querying your manuscript" on `/founders` are the same promise in two
   wordings; if the terms change, both change together, and the `/founders` sweetener card is the
   one that carries the detail. */
export const FOUNDING_PANEL_KICKER = "Get involved";

/**
 * The ask. `100 Founding Writers` is the marked run — semibold near-black under a burgundy
 * hairline, which is a `border-bottom` rather than `text-decoration` so it clears the descenders
 * in `g`.
 *
 * ⚠️ `FOUNDING_OFFER_LEAD` / `FOUNDING_OFFER_REST` ARE DELETED. The panel used to open with
 * "Become a Founding Writer." as a statement and then explain the offer in prose; it asks a
 * question of the reader now and answers it in the perks beneath, which is a shorter route to the
 * same three facts.
 */
export const FOUNDING_ASK: CopyRun[] = [
  "We're looking for ",
  { b: "100 Founding Writers" },
  " to put ScriptAlly through its paces.",
];

/**
 * ⚠️ THESE THREE MUST FIT ON ONE ROW AND THE WORDING IS LENGTH-CONSTRAINED BECAUSE OF IT. Each
 * item is `white-space: nowrap`, so the row wraps as whole items rather than mid-phrase — which
 * means a longer phrase does not shrink, it drops the row to two lines. "6 months free Pro" is
 * already the shortened form of "Six months' free Pro access", cut for exactly this reason.
 * ⚠️ ANYONE LENGTHENING ONE OF THESE RE-MEASURES THE ROW against the panel's inner width at 1280,
 * which is the narrowest width where one row is required. Do not lengthen them on the assumption
 * that a few characters are free; the first perk lost eleven to buy the row.
 */
export const FOUNDING_PERKS = [
  "Six months' free Pro access",
  "Half price for life",
  "A direct line to the founder",
] as const;

/* ══════════════ The panel's outcomes ══════════════
   ⚠️ ITS OWN WORDING, THE SAME STATE MACHINE. `foundingStore` decides WHICH state; these decide
   what the panel says in it, and the sealed band keeps its own — two surfaces asking in two
   registers off one list. The rendering is `FoundingSignup`'s `messages` prop, not a second
   component: forking the render is how two surfaces come to disagree about what happened.

   ⚠️ AND THE SUCCESS COPY NEVER REVEALS MORE THAN THE READER ASKED. "You're already on the list"
   confirms without disclosing when, or from where, or anything else about the address — a sign-up
   form that tells you what it knows about you is a disclosure, not a courtesy. */
export const FOUNDING_PANEL_SENT_H = "You're on board.";
export const FOUNDING_PANEL_SENT_B = "We'll email your invite when your place opens.";
export const FOUNDING_PANEL_DUPE_H = "You're already on the list.";
export const FOUNDING_PANEL_DUPE_B = "No need to sign up twice — your invite is still coming.";

/** ⚠️ EM DASH, and `email us` resolves through `SUPPORT_EMAIL` — never a spelled address. */
export const FOUNDING_PANEL_ERROR: CopyRun[] = [
  "That didn't send. Check the address and try again, or ",
  { link: "email us", mailto: supportMailto("ScriptAlly founding members") },
  ".",
];
export const FOUNDING_PANEL_DOWN: CopyRun[] = [
  "Sign-ups are briefly unavailable — try again shortly, or ",
  { link: "email us", mailto: supportMailto("ScriptAlly founding members") },
  ".",
];

export const FOUNDING_LEARN = "How it works";

export const FOUNDING_FIELD_LABEL = "Email address";
export const FOUNDING_PLACEHOLDER = "you@example.com";
export const FOUNDING_CTA = "Claim your place";

/** The panel's button. The sealed band keeps `FOUNDING_CTA`; two surfaces, two asks. */
export const FOUNDING_PANEL_CTA = "Claim your spot";

/**
 * ⚠️ THE INVALID-ADDRESS MESSAGE IS NOT ONE OF THE OUTCOME STATES. It is what the field says
 * before anything has been sent, so it never displaces the form the way an outcome does.
 */
export const FOUNDING_INVALID = "That doesn't look like an email address.";

/**
 * The outcomes, one per state the band can end in.
 *
 * ⚠️ `FOUNDING_FULL` IS REACHABLE NOW — the function enforces the cap. Past a hundred verified
 * places a sign-up is written `status: "waiting"` and answered `full: true`, and this is what
 * the reader is shown. It sat here unreachable for a year so the wording would be settled before
 * anything could produce it; that is why turning the cap on needed no copy decision.
 * ⚠️ AND IT IS STILL NEVER DECIDED ON THE CLIENT. `count >= cap` is not the test — the server's
 * flag is. Two browsers racing past 100 both read 99, and only the transaction knows which of
 * them got the last place.
 *
 * ⚠️ AND THE TWO FAILURES ARE DIFFERENT FACTS, NOT ONE FACT WORDED TWICE. `FOUNDING_DOWN` is "the
 * route is not wired" — an HTML response, a parse failure, a network error — and it hides the
 * form, because trying again cannot help. `FOUNDING_ERROR` is a real answer that says no, and it
 * keeps the form, because trying again can. Collapsing them tells one of the two readers to do
 * something useless.
 */
export const FOUNDING_SENT =
  "You're on the list. We'll email your invite code when your place opens — no other mail, ever.";
export const FOUNDING_DUPE =
  "You're already on the list — no need to sign up twice. Your invite is still coming.";
export const FOUNDING_FULL =
  "All hundred founding places are claimed. Join the waiting list and we'll be in touch as the " +
  "next stage opens.";
export const FOUNDING_ERROR: CopyRun[] = [
  "That didn't send. Check the address and try again, or ",
  { link: "email us", mailto: supportMailto("ScriptAlly founding members") },
  " and we'll add you by hand.",
];
export const FOUNDING_DOWN: CopyRun[] = [
  "Sign-ups are briefly unavailable. Try again shortly, or ",
  { link: "email us", mailto: supportMailto("ScriptAlly founding members") },
  " and we'll add you by hand.",
];

/**
 * ⚠️ THE COUNTER'S LABEL IS BUILT FROM REAL NUMBERS OR IT IS NOT RENDERED AT ALL — see
 * `FoundingBand`. The ref hardcodes "37 of 100 places claimed"; a fabricated scarcity number is
 * worse than no number, and this one would sit on a public page making a factual claim about how
 * many people had signed up.
 */
export const foundingCounterLabel = (claimed: number, cap: number) =>
  `${claimed} of ${cap} places claimed`;

export const FOUNDING_NOTE: CopyRun[] = [
  "We'll only use your address to send your invite. ",
  { link: "Privacy", to: "privacy" },
  ".",
];

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
   ⚠️ THREE FIGURES ARE UNSET AND NOTHING HERE MAY INVENT THEM. The design this page was rebuilt
   from carries £7/mo, £70/yr and £3.50/mo, plus a sentence about what happens when six free
   months end. All four were written so a mockup could be judged; none has been set. Shipping them
   would make a correct page incorrect — the repo's own law is that copy asserts what the code does
   today, and today there is no payment path at all.
   So the page makes the founding offer plainly and states no rate. `PRO_PRICE_MONTHLY`,
   `PRO_PRICE_YEARLY` and `FOUNDING_RATE_AFTER` below are the three lines to fill; every surface
   reads them, so filling one changes every place it is stated.
   ⚠️ AND `PRICING_TIERS` IS READ BY THE SIGNED-IN `/plans` PAGE, which finds `free` and `pro` by
   key. The `founding` entry is additive and that page never sees it; `pro.price` and
   `pro.priceNote` are asserted there and must keep saying there is no payment path. */

export const PRICING_DOCUMENT_TITLE = "ScriptAlly — Plans";
export const PRICING_EYEBROW = "Pricing";
export const PRICING_H1 = "Pick the plan that fits the search you're on.";
export const PRICING_SUB =
  "Free for as long as you want it. Pro when you're querying in earnest. And for the next hundred " +
  "writers, something better than both.";

/**
 * ⚠️ THE THREE UNSET FIGURES. `null` means "nobody has decided", and every consumer falls back to
 * wording that states no number rather than to a guess. Set one to a string — `"£7"` — and it
 * appears wherever it belongs; that is the whole change.
 */
export const PRO_PRICE_MONTHLY: string | null = null;
export const PRO_PRICE_YEARLY: string | null = null;
export const FOUNDING_RATE_AFTER: string | null = null;

export interface PricingTier {
  key: "free" | "founding" | "pro";
  name: string;
  /** A black tab breaking the card's top edge. Only the live tier has one. */
  tag?: string;
  price: string;
  /** Mono unit beside the amount — "forever", "for six months". */
  priceUnit?: string;
  /** ⚠️ Asserted by `planComparison.test.ts` for Pro; it must keep saying there is no path. */
  priceNote?: string;
  summary: string;
  /** The sentence under the price. `b` is the one emphasised run. */
  after: CopyRun[];
  includes: string[];
  /** Features this tier does NOT have, rendered muted rather than omitted. */
  excludes?: string[];
  action: string;
  /**
   * ⚠️ `later` IS NOT A DISABLED BUTTON. A tier that cannot be bought renders a label, not a
   * control — no `role`, no `tabindex`, nothing in the tab order. A greyed-out button still
   * announces itself as a button and still invites a click.
   */
  cta: "live" | "later";
}

export const PRICING_TIERS: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    price: "£0",
    priceUnit: "forever",
    summary: "Everything you need to run one manuscript's campaign.",
    after: ["No card, no trial clock. Stays free."],
    includes: [
      "One manuscript",
      "Unlimited agents and queries",
      "The full query pipeline, with dates and response windows",
      "Submission packages and comparable titles",
      "Notes to self, and your to-do list",
      "One Smart Import to bring your history across",
    ],
    excludes: ["Smart Email Drop", "The Comp Scout"],
    action: "Available at launch",
    cta: "later",
  },
  {
    /* ⚠️ THE ONLY TIER THAT CAN BE ACTED ON TODAY, WHICH IS WHY IT IS THE CENTRE AND THE LIVE ONE.
       The order is by what a reader can DO, not by price. */
    key: "founding",
    name: "Founding Writer",
    tag: "Available now · 100 places",
    price: "Free",
    priceUnit: "for six months",
    summary: "For the hundred writers who put ScriptAlly through its paces.",
    /* ⚠️ NO FIGURE AND NO STRUCK-THROUGH PRICE. The ref draws "£0 for six months" against a
       struck "£7/mo" and then "half price for life"; both halves of that are arithmetic on a
       number nobody has set. `FOUNDING_RATE_AFTER` is where a real one goes. */
    after: FOUNDING_RATE_AFTER
      ? ["Then ", { b: FOUNDING_RATE_AFTER }, " for life — a founding rate that never expires."]
      : ["Then ", { b: "a founding writers' rate for life" }, " — set before launch, and kept."],
    includes: [
      "Everything in Pro",
      ...FOUNDING_PERKS,
      "A hand in what gets built next",
    ],
    action: "Claim your spot",
    cta: "live",
  },
  {
    key: "pro",
    name: "Pro",
    /* ⚠️ BOTH OF THESE ARE ASSERTED BY `planComparison.test.ts`, which renders them in the app. */
    price: PRO_PRICE_MONTHLY ?? "Price to be confirmed",
    priceUnit: PRO_PRICE_MONTHLY ? "per month" : undefined,
    priceNote: PRO_PRICE_MONTHLY ? undefined : "no payment path yet",
    summary: "For writers running several manuscripts, or querying hard.",
    after: PRO_PRICE_YEARLY
      ? [`Or ${PRO_PRICE_YEARLY} a year. Cancel whenever you like.`]
      : ["Not on sale yet. Nothing here charges you, and nothing changes on your account."],
    includes: [
      "Unlimited manuscripts",
      "A Smart Import every month",
      "Smart email drop — forward a reply and it becomes a tracked update",
      "Comparable-title suggestions from your manuscript",
      "Everything in Free",
    ],
    action: "Available at launch",
    cta: "later",
  },
];

/**
 * ⚠️ THE CLOSING LINE STATES THE SCARCITY AND NOT THE PRICE. The ref ends it "…Pro is £7 a month";
 * that figure does not exist yet.
 */
export const PRICING_PLACES_NOTE =
  "Founding places are limited to a hundred. When they're gone, the founding rate goes with them.";
export const PRICING_PLACES_LINK = "How founding access works";

export const PRICING_FOOTNOTE =
  "Pro is not on sale yet. When it is, you will be able to upgrade from inside the app — nothing " +
  "here charges you, and nothing changes on your account.";

/* ── The comparison table ──
   ⚠️ EVERY ROW IS A CLAIM THE CARDS ABOVE ALREADY MAKE. The ref carries a "Querying analytics" row
   and a "Price after six months" row; the first is a feature no tier's list mentions, and the
   second is arithmetic on the unset rate. Both are absent rather than softened. */
export const PRICING_COMPARISON_H2 = "What's in each plan";
export interface ComparisonRow { label: string; free: string; founding: string; pro: string }
/** `—` is an absence; `✓` is presence. Both are rendered as text, not as glyphs to be announced. */
export const PRICING_COMPARISON: ComparisonRow[] = [
  { label: "Manuscripts", free: "1", founding: "Unlimited", pro: "Unlimited" },
  { label: "Agents & queries", free: "Unlimited", founding: "Unlimited", pro: "Unlimited" },
  { label: "Smart Import", free: "Once", founding: "Monthly", pro: "Monthly" },
  { label: "Smart Email Drop", free: "—", founding: "✓", pro: "✓" },
  { label: "The Comp Scout", free: "—", founding: "✓", pro: "✓" },
  { label: "A direct line to the founder", free: "—", founding: "✓", pro: "—" },
];

/* ── Questions ──
   ⚠️ THE REF'S FIRST QUESTION IS CUT, NOT LEFT UNANSWERED. "What happens when my six free months
   end?" has exactly one useful answer and that answer is a billing commitment nobody has made. A
   question printed with no answer on a pricing page reads worse than no question at all. */
export interface PricingQuestion { q: string; a: string }
export const PRICING_FAQ_H2 = "Questions";
export const PRICING_FAQ: PricingQuestion[] = [
  {
    q: "What if I don't want to pay anything?",
    a: "Stay on Free. One manuscript, unlimited agents and queries, the full timeline — it isn't " +
       "a trial and it doesn't expire.",
  },
  {
    q: "What happens when the hundred places are gone?",
    a: "Founding access closes. Everyone who joined as a Founding Writer keeps their founding " +
       "rate.",
  },
];
