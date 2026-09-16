/**
 * Landing copy — word-authoritative from its source. The HERO block comes from the brief of 16 Sep,
 * which replaced the statement hero and the ref it had been drawn from; everything below it (the
 * showreel, the CTA band, pricing) still comes from design-refs/landing-v13.html.
 *
 * ⚠️ MARKETING HEADLINE COPY IS NORMATIVE FROM ITS SOURCE AND IS NOT PARAPHRASED. Punctuation is
 * part of it — the semicolon in "traditional publication; an endless", the real ellipsis character.
 * A sentence that reads slightly better than the artefact it was signed off from no longer matches
 * it. (The third example here used to be the lowercase `a` opening the lede, which resumed the
 * statement's sentence rather than starting its own; it went with the statement.)
 *
 * Kept as pure constants so the copy tests can lock the strapline and sub-copy exactly
 * (repo test convention: node environment, no DOM rendering). UK spelling throughout.
 */

import { CopyRun } from "./CopyRuns";
import { supportMailto } from "../lib/companyInfo";

/* ⚠️ THE HERO IS ONE HEADLINE, ONE SUB, TWO ACTIONS (brief, 16 Sep). The statement hero's copy —
   `HERO_LEDE` on its paper slip, `HERO_GRIND`'s postscript, `HERO_TURN_LEAD` / `HERO_TURN_BODY`
   behind the burgundy rule — went with the layout that carried it, and so did the founding panel's
   own wording. The sign-up itself is unchanged and still mounted twice: the sealed band at the foot
   of this page and `/founders`.
   ⚠️ THE HEADLINE IS THREE WORDS NOW, AND THE HELD PAIR WENT WITH THE LONG ONE. "A bird's-eye view
   of your querying campaign" needed its last two words held on one line at an 11ch measure, or it
   broke four deep and stranded "campaign"; that phrase is the BAND's heading below, and this is a
   short headline that wraps where it likes. `Hero.tsx` renders the string plainly — see its note. */
export const HERO_H1 = "The hunt begins.";

export const HERO_SUB =
  "No more winging it. QueryHawk is your expert querying companion, ready to take you on a " +
  "data-driven journey to land your manuscript in the right agent's hands.";

/** The solid pill. It goes to `/founders`, which is where the sign-up it asks for lives. */
export const HERO_CTA = "Become a founding writer";

/** The plain link beside it: an in-page jump to the section break above the feature rows. */
export const HERO_LINK = "See how it works";

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

/* ══════════════ The status band, between the hero and the rows ══════════════ */

/**
 * ⚠️ THIS PHRASE MOVED DOWN THE PAGE RATHER THAN BEING WRITTEN (16 Sep). It was the hero's headline
 * until the hero took "The hunt begins."; putting it here is what stops the two stating the same
 * sentence twice, six hundred pixels apart.
 *
 * ⚠️ AND IT REPLACED `PULSE_HEADING` AND `SECTION_EYEBROW`. "A finger on the pulse of your querying
 * journey" and its mono eyebrow went with the ECG band they titled — the six status marks below
 * this heading say what the trace was gesturing at, in the product's own vocabulary. The band has
 * no eyebrow, no sub-copy and no CTA: one heading and the marks.
 */
/**
 * ⚠️ "No more winging it." ALSO OPENS `HERO_SUB`, SO THE LANDING PAGE SAYS IT TWICE. The brief
 * specifies it here verbatim and does not change the hero, so it is built as asked and flagged
 * rather than silently deduplicated — which of the two gives the phrase up is an editorial call,
 * not a copy fix. A lock below asserts the repetition is INTENTIONAL by naming both owners, so it
 * cannot drift to three.
 */
export const BAND_EYEBROW = "No more winging it.";
export const BAND_HEADING =
  "QueryHawk gives a bird's-eye view of your entire querying campaign.";

/**
 * The six pipeline states, as the carousel tells them.
 *
 * ⚠️ THE ORDER IS THE PIPELINE'S AND IS NOT A PRESENTATION CHOICE. It is the same progression
 * `StatusDot` draws in the app and the same one the glyph row drew before it — queried, partial
 * requested, partial sent, full requested, full sent, offer. A reordering here would teach a
 * sequence the product does not have.
 *
 * ⚠️ AND EVERY DESCRIPTION STATES WHAT QUERYHAWK RECORDS, never how the writer should feel about
 * it. "The best email in querying" is the one line that comes close, and it is about the EMAIL
 * rather than about the reader's chances — the house rule is that the app reports and never
 * appraises, and these are the only six sentences on the landing page describing the pipeline.
 */
export interface StatusStep {
  key: string;
  title: string;
  body: string;
}

export const STATUS_STEPS: StatusStep[] = [
  {
    key: "queried",
    title: "Queried",
    body: "Your letter is out. The clock starts, and the reply window is worked out from that agent's usual turnaround.",
  },
  {
    key: "partial-requested",
    title: "Partial requested",
    body: "They've asked to read part of it. Whatever they asked for is logged, and the ball is back in your court.",
  },
  {
    key: "partial-sent",
    title: "Partial sent",
    body: "Chapters are away. The version you sent is recorded, so you know exactly what they're reading.",
  },
  {
    key: "full-requested",
    title: "Full requested",
    body: "They want the whole manuscript. The best email in querying, and one you'll want dated.",
  },
  {
    key: "full-sent",
    title: "Full sent",
    body: "The manuscript is with them. Now it's waiting — and QueryHawk counts the days so you don't have to.",
  },
  {
    key: "offer",
    title: "Offer",
    body: "An offer of representation. Everything that led here is already written down, in order, with dates.",
  },
];

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

/* ══════════════ The founding-writers band ══════════════
   ⚠️ NO LONGER FROM `design-refs/scriptally-landing-v13.html` — the band was rebuilt to a written
   brief (16 Sep) and that brief is the source of truth for these strings. The ref's `.beta` copy
   ("Be one of the first hundred.", the blurb about opening in stages) is superseded, not merely
   restyled: a locked ref quote here would now be a lock on an artefact the page has left behind.
   The discipline is unchanged — the words are edited here or nowhere.

   ⚠️ IT IS "writers", NOT "members", AND THE TWO ARE NOT INTERCHANGEABLE. `/founders` has always
   called them founding WRITERS; the landing band called them founding MEMBERS; one offer, two
   nouns, on two pages a reader moves between in one click. The page they land on is the one that
   was right.

   ⚠️ AND THE FOUR LINES BELOW ARE PROMISES THE PRODUCT HAS TO KEEP, in the same class as the
   About page's: early access, a direct line, six months free, and half price afterwards for as
   long as they need it. The last is a PERMANENT pricing commitment and it is stated on two pages
   — `FOUNDERS_DEAL`'s sweetener is the same promise in different words. If the terms change, both
   change together. If one stops being true the fix is the product, not the sentence. */
export const FOUNDING_EYEBROW = "Founding writers";
export const FOUNDING_HEADING = "Join as a founding writer";

/** The line that introduces the list. A colon, because a list follows it. */
export const FOUNDING_GET_LEAD = "You get:";

/**
 * ⚠️ THESE ARE NOT `FOUNDING_PERKS` AND MUST NOT BE COLLAPSED INTO THEM. `FOUNDING_PERKS` is three
 * terse bullets inside /pricing's founding TIER CARD, where they sit beside other tiers' feature
 * lists and have to scan at the same length. These are four full sentences in a band whose whole
 * job is the offer. Same offer, two registers, two surfaces — merging them would make one of the
 * two read wrong, and the shorter one is the one that would win.
 */
export const FOUNDING_GETS = [
  "Early access to QueryHawk",
  "A direct line to the founder",
  "The full experience free of charge for 6 months",
  "Half price for as long as you need it after that",
] as const;

/**
 * What is asked in return. It is the only thing asked, and the sentence says so.
 *
 * ⚠️ IT IS NOT CALLED `FOUNDING_ASK`, AND THAT NAME IS NOT FREE. `FOUNDING_ASK` belonged to the
 * retired hero panel and `landingCopy.test.ts` holds it in a list of exports asserted ABSENT, so
 * that the old panel cannot be reinstated from a diff. Taking the name back for a different
 * sentence would have made that lock permanently unable to fire — it would have been green about
 * a constant that exists, for a reason that had stopped being true. A retired name stays retired.
 */
export const FOUNDING_IN_RETURN =
  "All we ask is that you give us occasional feedback to help shape and refine QueryHawk for " +
  "when it opens to the wider writing community.";

/* ══════════════ The founding offer's perks ══════════════
   ⚠️ READ BY `PRICING_TIERS` BELOW, which spreads them into the founding tier's `includes`. They were
   the hero panel's three lines as well until the hero was rebuilt (16 Sep); /pricing renders them now,
   and `marketingPageSmoke` locks the wording there. */
/* ⚠️ "for life" IS RETIRED EVERYWHERE, AND THIS IS ONE OF FOUR SURFACES IT WAS ON. The offer was
   worded four different ways — this list, the pricing tier's after-line, the landing banner and
   /founders — and two of them promised "for life", which is a stronger commitment than the product
   needs to make. Standardised on "for as long as you need it": warmer, and it does not promise
   anything we might regret. If the terms change, all four change together. */
export const FOUNDING_PERKS = [
  "Six months' free Pro access",
  "Half price for as long as you need it",
  "A direct line to the founder",
] as const;


export const FOUNDING_FIELD_LABEL = "Email address";
export const FOUNDING_PLACEHOLDER = "you@example.com";
export const FOUNDING_CTA = "Claim your place";


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
  { link: "email us", mailto: supportMailto("QueryHawk founding members") },
  " and we'll add you by hand.",
];
export const FOUNDING_DOWN: CopyRun[] = [
  "Sign-ups are briefly unavailable. Try again shortly, or ",
  { link: "email us", mailto: supportMailto("QueryHawk founding members") },
  " and we'll add you by hand.",
];

/**
 * ⚠️ THE COUNTER'S LABEL IS BUILT FROM REAL NUMBERS OR IT IS NOT RENDERED AT ALL — see
 * `FoundingBand`. The ref hardcodes "37 of 100 places claimed"; a fabricated scarcity number is
 * worse than no number, and this one would sit on a public page making a factual claim about how
 * many people had signed up.
 */
/**
 * ⚠️ SPLIT IN TWO BECAUSE THE BANNER SETS THE FIGURE AND THE WORDS AT DIFFERENT SIZES — the count
 * at 26px, the rest at 16px and muted — and a component cannot typeset half a string it is handed
 * whole. The words live HERE, once: `foundingCounterLabel` is built from this rather than
 * restating it, so the band's `26` and `/pricing`'s `26 of 100 places claimed` cannot come to
 * disagree about the wording. Composing ` of ${cap} places claimed` at the render site instead
 * would put copy in a component, where no copy lock can see it.
 */
export const foundingCounterRest = (cap: number) => ` of ${cap} places claimed`;
export const foundingCounterLabel = (claimed: number, cap: number) =>
  `${claimed}${foundingCounterRest(cap)}`;

/**
 * How many are left. A BUILDER RATHER THAN ARITHMETIC AT THE RENDER SITE, for the same reason as
 * the others: both figures a reader sees derive from the two the endpoint answered with, and
 * neither the sum nor the word is composed anywhere but here. `cap - claimed` written into a
 * component is a number the copy lock cannot see — and it is the number that would go negative
 * and print "-3 left" the day the cap is lowered under a count, which is why it clamps.
 */
export const foundingRemainingLabel = (claimed: number, cap: number) =>
  `${Math.max(0, cap - claimed)} left`;

export const FOUNDING_NOTE: CopyRun[] = [
  "We'll only use your address to send your invite. ",
  { link: "Privacy", to: "privacy" },
  ".",
];

export const DOCUMENT_TITLE = "QueryHawk — Take control of your querying journey";

/**
 * Feature-row copy — six rows, top to bottom, each an illustration, a heading and ONE paragraph.
 * Rebuilt 14 Sep from a written brief, which is the source of truth for these strings in place of
 * landing-v13.html: headings, paragraphs and alt text are verbatim from it.
 *
 * ⚠️ `body` IS A PLAIN STRING ON PURPOSE. It used to be segments so a phrase could be set bold, and
 * the brief rules out bold inside these paragraphs — a type that can still express a retired choice
 * is how the choice comes back. Likewise the retired CTA, link, Pro-badge and flip fields: a row has
 * none, and a lock asserts the key set.
 *
 * ⚠️ `alt` IS COPY — the only thing a screen reader says about the picture — so it lives here beside
 * the heading it describes. `image` is a path under public/images/: unhashed, so the file name is the
 * URL.
 */
export interface FeatureRow {
  key: string;
  heading: string;
  body: string;
  image: string;
  alt: string;
}

/* ⚠️ THE ORDER IS THE ARGUMENT, AND IT CHANGED (16 Sep). It used to open on importing a
   spreadsheet — an onboarding chore — and close on comps. It opens on TRACKING now, which is what
   the product is, and the import sits third as the bridge from whatever you are doing today. The
   array's order IS the page's order; there is no separate sort.
   ⚠️ AND THE SIDES FOLLOW THE INDEX, NOT THE KEY. `.mk-frow:nth-child(even)` flips the row, so
   reordering this array reassigns which illustrations sit left — rows 1, 3 and 5 are image-left by
   construction. Nothing in the markup changes. */
export const FEATURE_ROWS: FeatureRow[] = [
  {
    key: "track",
    heading: "Every query tracked, from start to finish",
    body: "A full history for everything you've sent, plus timely nudge reminders so that nothing slips through the cracks.",
    image: "/images/track-agent-queries.png",
    alt: "A hawk pointing to a query record showing a submission's full history from first letter to reply.",
  },
  {
    key: "agents",
    heading: "Your agents on file",
    body: "Not just a name and an email. Their wish list, their response time, the specific sample they ask for — and a timeline of every interaction you've had with them.",
    image: "/images/home-for-your-agents.png",
    alt: "An agent record showing a wish list, a response time and the sample that agent asks for.",
  },
  {
    key: "import",
    heading: "Your list so far comes with you",
    body: "Spreadsheet? Notes? All in your head? We have two handy methods for bringing your querying history with you — or, of course, the option to start from scratch.",
    image: "/images/journey-so-far.png",
    alt: "A messy submissions spreadsheet beside the same queries brought across as a clean, dated list.",
  },
  {
    key: "packages",
    heading: "Curate and compare with Submission Packages",
    body: "Bundle your query letters, synopses and manuscript samples into packages. Attach them to queries and see which combinations or materials are generating most interest.",
    image: "/images/curate-and-compare.png",
    alt: "Two submission packages side by side, each showing which materials it holds and how many replies it drew.",
  },
  {
    key: "email",
    heading: "Updates log themselves with Smart Email Drop",
    body: "Sent another query? Had a reply? Copy and paste a sent or received email and QueryHawk will suggest the updates needed. Don't worry — you'll always have final say.",
    image: "/images/smart-email-drop.png",
    alt: "A pasted agent email beside the update QueryHawk suggests from it, waiting to be approved.",
  },
  {
    key: "comps",
    heading: "Compile your Comparable Titles",
    body: "Build a library of comparable titles and add them to your query letters to position yourself in the market. Track which ones resonate, and have the Scout suggest new ones for your reading list.",
    image: "/images/comparable-titles.png",
    alt: "A library of comparable titles beside new ones the Scout suggests for a reading list.",
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

export const PRICING_DOCUMENT_TITLE = "QueryHawk — Plans";
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
/**
 * ⚠️ SET, AS OF 16 Sep — AND THE INVARIANT IT RETIRES WAS REAL WHILE IT LASTED. This was `null` so
 * that no price could appear before one had been decided, and `marketingPageSmoke` swept the
 * rendered page for ANY currency amount and required the set to be exactly `["£0"]`. The figure is
 * decided, so the guard changes to match rather than being deleted: the sweep now allows this one
 * value and still fails on a fourth. `planComparison.test.ts` moves with it — the SIGNED-IN /plans
 * page reads the same constant, so the price reaches both surfaces from one line.
 * ⚠️ `PRO_PRICE_YEARLY` STAYS NULL, which is what keeps Pro's sentence "Not on sale yet". A monthly
 * figure is what something will cost; a payment path is whether it can be bought, and only the
 * first of those exists.
 */
export const PRO_PRICE_MONTHLY: string | null = "£4.99";
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
  /** The tier's bird. The file, its pixel size and its hash live in `PricingPage`; the words here. */
  illoAlt: string;
  includes: string[];
  /**
   * Features this tier does NOT have, rendered muted rather than omitted — what a tier lacks is
   * the reason to read the next card along, and leaving it out makes three lists that look the
   * same length.
   * ⚠️ EACH CARRIES ITS OWN SUB-LINE NOW. A greyed-out "Smart Email Drop" says only that something
   * is missing; the note says what the reader would be missing, which is the entire reason to show
   * an absence rather than omit it.
   */
  excludes?: { label: string; note: string }[];
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
    illoAlt: "A young hawk perched on a post, holding a single query letter.",
    price: "£0",
    priceUnit: "forever",
    summary: "Everything you need to run one manuscript's campaign.",
    after: ["No card, no trial clock. It stays free."],
    /* ⚠️ TWENTY AGENTS, NOT UNLIMITED — and the comparison table's row moves with it. The two are
       one fact stated twice, so a change here that stops there makes the page argue with itself. */
    includes: [
      "One manuscript",
      "Up to twenty agents",
      "Every query tracked end to end",
      "The full query pipeline",
      "Agent records",
      /* ⚠️ "Submission packages" IS RESTORED TO FREE AGAINST THE BRIEF'S LITERAL LIST, BECAUSE THE
         CODE IS THE FACT AND THE COPY HAS TO AGREE. Packages are deliberately NOT Pro-gated —
         `planComparison.ts` says so at length, CLAUDE.md records it as a decision, and nothing in
         `SubmissionPackages.tsx` checks `isProUser`. Dropping it here while Pro's list names it
         advertises a gate that does not exist, which is exactly what `planComparison.test.ts`
         exists to catch. The brief's line was previously "Submission packages and comparable
         titles" and kept only the comps half, so this reads as an oversight rather than a decision
         to gate them — flagged, and a one-line reversal if the gate is really wanted. */
      "Submission packages",
      "Comparable titles",
      "Notes and your to-do list",
      "One Smart Import",
    ],
    excludes: [
      { label: "Smart Email Drop", note: "Paste an email, get the update written for you" },
      { label: "The Comp Scout", note: "Comparable titles suggested from your own manuscript" },
    ],
    action: "Available at launch",
    cta: "later",
  },
  {
    /* ⚠️ THE ONLY TIER THAT CAN BE ACTED ON TODAY, WHICH IS WHY IT IS THE CENTRE AND THE LIVE ONE.
       The order is by what a reader can DO, not by price. */
    key: "founding",
    name: "Founding Writer",
    illoAlt: "A hawk wearing a scarf, holding a rolled manuscript under one wing.",
    tag: "Available now · 100 places",
    price: "Free",
    priceUnit: "for six months",
    summary: "For the hundred writers who put QueryHawk through its paces.",
    /* ⚠️ NO FIGURE AND NO STRUCK-THROUGH PRICE. The ref draws "£0 for six months" against a
       struck "£7/mo" and then "half price for life"; both halves of that are arithmetic on a
       number nobody has set. `FOUNDING_RATE_AFTER` is where a real one goes. */
    /* ⚠️ "for life" IS RETIRED HERE TOO — see `FOUNDING_PERKS`. Both branches carried it, so both
       change; leaving the filled branch promising "for life" would mean the wording reverted the
       day a real figure was set, which is the worst possible moment for it to change. */
    after: FOUNDING_RATE_AFTER
      ? ["Then ", { b: FOUNDING_RATE_AFTER }, " for as long as you need it — set before launch, and kept."]
      : ["Then ", { b: "a founding writer's rate for as long as you need it" }, " — set before launch, and kept."],
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
    illoAlt: "A hawk in spectacles at a desk stacked with manuscript boxes.",
    /* ⚠️ BOTH OF THESE ARE ASSERTED BY `planComparison.test.ts`, which renders them in the app —
       so setting `PRO_PRICE_MONTHLY` reaches the signed-in /plans page from this one line. */
    price: PRO_PRICE_MONTHLY ?? "Price to be confirmed",
    priceUnit: PRO_PRICE_MONTHLY ? "per month" : undefined,
    priceNote: PRO_PRICE_MONTHLY ? undefined : "no payment path yet",
    summary: "For writers running several manuscripts, or querying hard.",
    /* ⚠️ A PRICE IS NOT A PAYMENT PATH, AND THIS SENTENCE IS THE DIFFERENCE. `PRO_PRICE_YEARLY` is
       still null, so the page states what Pro will cost and that it cannot yet be bought — two
       facts, both true, and the second is the one that stops the first reading as a sales page. */
    after: PRO_PRICE_YEARLY
      ? [`Or ${PRO_PRICE_YEARLY} a year. Cancel whenever you like.`]
      : ["Not on sale yet. Nothing here charges you, and nothing changes on your account."],
    includes: [
      "Everything in Free",
      "Unlimited manuscripts",
      "Unlimited agents",
      "Submission packages",
      "Hand over the housekeeping",
      "Smart email drop",
      "Comparable title scout",
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
  /* ⚠️ FREE'S AGENT LIMIT IS TWENTY NOW, NOT UNLIMITED, and this row is the one place the table
     could have gone on contradicting the card above it. The tier list and this table are two
     statements of the same fact, so they move together or the page argues with itself. */
  { label: "Manuscripts", free: "1", founding: "Unlimited", pro: "Unlimited" },
  { label: "Agents", free: "Up to 20", founding: "Unlimited", pro: "Unlimited" },
  { label: "Queries", free: "Unlimited", founding: "Unlimited", pro: "Unlimited" },
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
