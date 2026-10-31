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
import { FOUNDING_CAP, FOUNDING_CAP_WORD } from "./foundingCap";

/* ⚠️ THE HERO IS ONE HEADLINE, ONE SUB, TWO ACTIONS — LANDING HERO v3 (20 Oct, ref
   design-refs/landing-hero-v3.html). "The hunt begins." and the "expert querying companion" sub are
   retired with the shadow-column hero that carried them; the right of the hero is the living query
   card now (`HeroCard.tsx`). The text never animates: all four are on the page at first paint.
   ⚠️ "No more winging it." MOVED UP FROM THE BAND'S EYEBROW, AND IT IS STILL SAID EXACTLY ONCE.
   `BAND_EYEBROW` is retired in the same edit; a lock asserts one owner across every string the page
   renders, so restoring the eyebrow beside this headline fails. */
/* ⚠️ WAITLIST v1 (31 Oct): `HERO_H1` is the hero's HANDWRITTEN line on both layouts now (`WAIT_HERO_STRAP`
   is this constant), under the question "Hunting for a / literary agent?". The two-line headline split
   (`HERO_H1_LINES`), the two-line sub (`HERO_SUB_LINES`, `HERO_SUB_BRAND`, `HERO_SUB`) and "See how it
   works" (`HERO_LINK`) are RETIRED with the hero that drew them. */
export const HERO_H1 = "No more winging it.";

/** The sign-up's button in the hero, on both layouts, and the join bar's words. */
export const HERO_CTA = "Become a founding writer";

/* ── The hero on phones (≤760px; ref design-refs/landing-hero-mobile-v1.html) ──
   ⚠️ THE STRAPLINE IS `HERO_H1` ITSELF, NOT A SECOND STRING. On phones the desktop headline is not
   rendered and "No more winging it." is the drawer's handwritten strapline — so the phrase keeps
   exactly one owner here, and the "exactly once" lock stays true by construction. */
/** The drawer's question, in two blocks: the second carries the rust highlighter. */
export const HERO_PHONE_Q = ["Hunting for a", "literary agent?"] as const;
export const HERO_PHONE_JOIN = "Join";
/** The phone cards' manuscript (v3): the same invented title on every phone card, front and back. */
export const HERO_PHONE_MS = "Lord of the Wings";
/** v3.1 (C3): the FRONT card's manuscript; the back cards keep `HERO_PHONE_MS`. */
export const HERO_PHONE_MS_FRONT = "The Taloned Mr Ripley";
export const HERO_PHONE_TAGS = ["Adult", "Literary fiction", "94,000 words"] as const;

/* ── The phone card's story, v3 (ref design-refs/landing-hero-mobile-v3.html): one short loop ──
   The footer's two halves at each turn of the story, and the two tags that float up beside a line.
   Every string the phone story writes comes from here; the card's own markup (the five lines, the
   reminder, the final panel) is shared with the desktop card and stays in it. */
/**
 * ⚠️ AN AGENT IS NAMED, NEVER "SHE" OR "HE" (25 Oct, both layouts). The app does not know an agent's
 * pronouns and never asks, so a note that refers to the agent uses their FIRST name, or "the agent"
 * ("The agent" at the start of a sentence) when none is saved. Never she, her, he or him.
 */
export const agentRef = (first: string | null | undefined, opts: { start?: boolean } = {}): string => {
  const f = (first ?? "").trim();
  return f || (opts.start ? "The agent" : "the agent");
};
/** The demo card's agent (Eleanor Whitfield), by first name: what the hero's notes call the agent by. */
export const HERO_AGENT_FIRST = "Eleanor";
/** The popover's label — what the agent asked for. */
export const askedLabel = (first: string | null | undefined) => `${agentRef(first, { start: true })} asked for`;
/** The two congratulations faces' titles (phones, v3.2). */
export const flipTitles = (first: string | null | undefined) => ({
  partial: `${agentRef(first, { start: true })} wants to read more!`,
  full: `${agentRef(first, { start: true })} wants the full!`,
});

export const PHONE_STORY = {
  foot: {
    sent: ["Reply expected by 9 May", "Record a response"],
    partial: ["Send the partial by 25 April", "Mark partial sent"],
    partialSent: ["Response expected by 3 June", "Record a response"],
    nudged: ["Reminder on 28 June", "Record a response"],
    full: ["Send the full by 5 July", "Mark full sent"],
  },
  /** v3.1 (C1) — [title, icon, kind]: a chip that stamps into its own line's chip row, holds and fades. */
  chips: {
    partial: ["Task created", "todo", ""],
    partialSent: ["Task complete", "todo", "done"],
    nudge: ["Reminder set", "bell", ""],
  },
  /** v3.1 (C2) — what Eleanor asked for: the popover under the status pill, flicked Words then Chapters. */
  asked: {
    label: askedLabel(HERO_AGENT_FIRST),
    first: "First",
    units: [["pages", "Pages"], ["chapters", "Chapters"], ["words", "Words"]],
    pages: "50", words: "5,000", chapters: "3",
    /** The desk's sequence (v4 S2): Pages 10 → Chapters 1, then + pressed twice: 2, 3. */
    desk: { start: "10", chapters: "1", steps: ["2", "3"], minus: "−", plus: "+" },
  },
  /** v3.2 (F3) — the face the card flips to when a request lands (phones): the band, the title, and one
      line as [before, in bold, after]. */
  flip: {
    partial: { tag: "Partial requested", day: "Day 36", title: flipTitles(HERO_AGENT_FIRST).partial, line: ["A partial request: ", "the first 3 chapters", "."] },
    full: { tag: "Full requested", day: "Day 99", title: flipTitles(HERO_AGENT_FIRST).full, line: ["A full request: ", "the whole manuscript", "."] },
  },
} as const;

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

/* ══════════════ The status band — RETIRED (waitlist v1, 31 Oct) ══════════════
   Its heading is feature row 1's now (`BE_HEADING`, beside the Birds-eye window, without the full stop,
   as the ref sets it). `BAND_HEADING` and `BAND_EYEBROW` are both gone. */

/* ⚠️ `STATUS_STEPS` AND `StatusStep` ARE RETIRED WITH THE CAROUSEL THEY WERE WRITTEN FOR (18 Sep).
   Six titles and six descriptions of the pipeline states, rotated one at a time under the band's
   heading; the ref of 18 Sep takes the heading straight into the feature rows, so nothing rendered
   them any more. Dead copy is worse than no copy — it reads as live product wording to whoever
   opens the file next, and the house rule is to trace a symbol to a rendered root before keeping it.
   ⚠️ THE GLYPHS ARE NOT RETIRED AND MUST NOT BE. `StatusGlyph` and `STATUS_GLYPH_COUNT`
   (`marketingMarks.tsx`) still draw the footer's signature row — six marks, `aria-hidden`. The
   footer's own lock used to reconcile that count against `STATUS_STEPS.length`; with the copy gone
   it reconciles against the glyph table itself, which is the derivation that actually owns the six.
   Recoverable from the commit that removed them if the states ever want describing again. */


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
   About page's: Pro free for a whole querying campaign, a direct line, Smart Import, and an Early
   Bird discount for the writers a founder invites (26 Oct — the offer that replaced "six months free,
   then half price"). `FOUNDERS_DEAL` states the same terms in its own words, so if the terms change,
   both change together. If one stops being true the fix is the product, not the sentence. */
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
  "QueryHawk Pro, free for your entire querying campaign",
  "A direct line to the founder",
  "Smart Import to bring your list across",
  "An exclusive Early Bird discount for the writers you invite when we launch",
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
/* ⚠️ REWRITTEN 31 Oct: the offer is no longer "six months free, then half price". These are
   `FOUNDING_GETS`' four terms in the tier card's shorter register. */
export const FOUNDING_PERKS = [
  "Pro free for your whole querying campaign",
  "Smart Import to bring your list across",
  "A direct line to the founder",
  "An Early Bird discount for writers you invite",
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
/* ⚠️ REWRITTEN 31 Oct: sign-up is double opt-in, so a writer is NOT on the list until they click
   the emailed link. The old line ("You're on the list … no other mail, ever") told them the
   opposite, and a writer who believes it never confirms. Each line says what actually happened
   and what to do next. */
export const FOUNDING_SENT =
  "Nearly there. We've emailed you a link: click it to confirm your place. " +
  "If it isn't in your inbox in a few minutes, check your spam folder.";
export const FOUNDING_DUPE =
  "That address is already signed up. If you haven't confirmed yet, look for our email " +
  "and click the link in it (check spam too).";
/* The server has already put them on the waiting list when it answers `full`. */
export const FOUNDING_FULL =
  `All ${FOUNDING_CAP_WORD} founding places have gone, so you're on the waiting list. ` +
  "We'll email you if a place opens up.";
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

/** The phone nav's founding pill, beneath its ten segments: a BUILDER, never a number in a string. */
export const navPlacesLeft = (left: number) => `${left} places left`;
/** The places line under each sign-up (waitlist v1): what it says, and what it is read as. */
export const heroPlacesLabel = (left: number, cap: number) => `${left} of ${cap} founding places left`;

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

/* ══════════════ "Our vision is simple." — the white band under the feature rows ══════════════
   (ref design-refs/landing-v6.html)

   ⚠️ THREE POINTS, AND EACH IS AN ILLUSTRATION, A HEADING AND ONE PARAGRAPH. No eyebrow, no intro
   paragraph under the h2, no per-point action. The band's whole job is to say why the product
   exists; "Read our story" below the three is the only way out of it, and it goes to /about.

   ⚠️ THE HEADINGS ARE HELD ON ONE LINE AT DESKTOP, so each is short enough to be. A longer one is
   not a copy edit — it is a wrap, and the measured width at which `nowrap` releases moves with it.
   `visionCopy` in marketingTokens.test.ts asserts the rendered ink against the column.

   ⚠️ `let-writers-write.png` IS A PLACEHOLDER AND IS NAMED FOR THE FINAL ART, NOT FOR THE STAND-IN.
   The drawing on file is a quill and inkpot supplied as "quick actions"; the commissioned piece
   replaces that one file and nothing else changes. Naming it after the stand-in is how a filename
   comes to describe something the page has not shown for a year. */
export interface VisionPoint {
  key: string;
  image: string;
  heading: string;
  body: string;
}

export const VISION_HEADING = "Our vision is simple.";

export const VISION_POINTS: VisionPoint[] = [
  {
    key: "stories",
    image: "/images/get-good-stories-told.png",
    heading: "Get good stories told.",
    body: "A captivating story should never be lost to a sub-par querying campaign. There's a " +
      "dangerous skills gap between writing and querying. QueryHawk bridges that gap.",
  },
  {
    key: "simple",
    image: "/images/make-querying-simple.png",
    heading: "Make querying straightforward.",
    body: "Stop shooting from the hip. We'll crunch the data and give you everything you need to " +
      "make targeted decisions at the right time.",
  },
  {
    key: "write",
    image: "/images/let-writers-write.png",
    heading: "Let writers write.",
    body: "Less time trawling through spreadsheets, more time doing what you love.",
  },
];

/* `VISION_LINK` ("Read our story") is RETIRED (waitlist v1): the landing page links nowhere but Privacy. */

/* ══════════════ The landing page on phones (≤760px; landing on phones v3, 26 Oct) ══════════════
   ref design-refs/landing-mobile-v3.html (the story and its closing beat; v2's ref for the rest).
   Every string is the ref's, verbatim.

   ⚠️ ONE FEATURE PER FLICK: each caption is a "N of 6" label, the heading, one short line and three
   ticked points, in the ref's order — "Updates log themselves" third, "Your list so far comes with
   you" last. Each names its row by `key`, so the picture, its size and its version still come from
   `FEATURE_ROWS` and the desktop rows' table. */
export interface FeatureCard { key: FeatureRow["key"]; heading: string; line: string; points: [string, string, string] }


export const FEATURE_STORY: FeatureCard[] = [
  { key: "track", heading: "Every query tracked, from start to finish", line: "A full history for everything you've sent, so nothing slips through the cracks.",
    points: ["Queries, partials and fulls on one card", "Reply-by dates worked out for you", "Nudge reminders when an agent goes quiet"] },
  { key: "agents", heading: "Your agents on file", line: "Not just a name and an email.",
    points: ["Wish lists and what they ask for", "Typical response times", "Every interaction in one timeline"] },
  { key: "email", heading: "Updates log themselves", line: "Paste a sent or received email and QueryHawk suggests the updates.",
    points: ["Works with any email you paste in", "Suggestions, never automatic changes", "You always have the final say"] },
  { key: "packages", heading: "Curate and compare packages", line: "Bundle your materials and see what gets requests.",
    points: ["Letters, synopses and samples together", "Attach a package to any query", "See which combinations get interest"] },
  { key: "comps", heading: "Compile your comparable titles", line: "Build the comps that position your book.",
    points: ["A library of comparable titles", "Add them to your query letters", "Track which ones resonate"] },
  { key: "import", heading: "Your list so far comes with you", line: "Already querying? Bring it all across.",
    points: ["From a spreadsheet, notes or memory", "Smart Import sets it up for you", "Or start fresh in minutes"] },
];

/* The vision on navy (landing on phones v4, ref landing-mobile-v4.html `.nv`): v3's closing beat folded
   into its top — the heading and the lead — then one frame and the three lines you swipe, each a
   point's short line keyed to `VISION_POINTS` (whose headings are shared — "Make querying
   straightforward." included), and the way out to /about. */
/* ⚠️ WAITLIST v1 (31 Oct): the carousel's heading, lead, aria label and "Read our story →" are RETIRED
   with `VisionNavy`. These short lines live on as the phone mission's two lines (`LandingPhone`). */
export const VISION_NAVY: Record<string, string> = {
  stories: "A captivating story should never be lost to a sub-par querying campaign.",
  simple: "Everything you need to make the right call at the right time.",
  write: "Less time in spreadsheets, more time doing what you love.",
};

/* The join bar that follows a reader down the landing page on phones. Its count's words are
   `navPlacesLeft`, the same phrase the other places-left lines use. */
export const JOIN_BAR_CTA = "Join";

/* The closing founding card (phones; it replaces the founding band there). The pill is the band's own
   eyebrow and the list is `FOUNDING_GETS`, so the offer is stated in one place. */
export const CLOSE_HEADING = "Help get things off the ground.";
export const CLOSE_LEAD = `We're looking for ${FOUNDING_CAP} writers to put QueryHawk through its paces. You get:`;
export const CLOSE_NOTE = "All we ask is occasional feedback to help shape QueryHawk.";
/* `CLOSE_LINK` ("How being a founding writer works →") is RETIRED (waitlist v1): the page links nowhere but Privacy. */

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

/* ⚠️ THE PUBLIC /pricing PAGE NO LONGER READS THIS SECTION (pricing v3, 21 Oct). Its copy is in
   `pricingCopy.ts`. What stays here is what the SIGNED-IN /plans page and its tests read:
   `PRO_PRICE_*`, `FOUNDING_RATE_AFTER`, `PricingTier` and `PRICING_TIERS`. The old page's header,
   places note, footnote, comparison table and questions are deleted — nothing else read them. */

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
  /** The tier's bird's description. ⚠️ No surface renders the birds since pricing v3 (21 Oct); the
   *  field stays because `PRICING_TIERS` is /plans' data and is not this pass's to reshape. */
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
    tag: `Available now · ${FOUNDING_CAP} places`,
    price: "Free",
    priceUnit: "for your whole querying campaign",
    summary: `For the ${FOUNDING_CAP_WORD} writers who put QueryHawk through its paces.`,
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

/* ══════════════ The waiting-list landing page (waitlist v1, 31 Oct) ══════════════
   refs design-refs/landing-mobile-v7.html (phones), design-refs/landing-desktop-v5.html (desktop) and
   design-refs/birdseye-focus-v1.html option 2 (the desktop Birds-eye window). Every string is the
   refs', verbatim.

   ⚠️ THE PAGE ASKS FOR ONE THING AND LINKS NOWHERE BUT PRIVACY. Every CTA scrolls to an on-page
   sign-up; the routes behind the old links are untouched.

   ⚠️ THE BIRDS-EYE DATA IS ILLUSTRATION. Names, agencies, dates and chip words are static, typed
   here; nothing reads the store or today's date. October/November are a drawn window, not a clock. */

/** The hero's question, both layouts: "Hunting for a" / "literary agent?" (highlighter on the second). */
export const WAIT_HERO_Q = HERO_PHONE_Q;
/** The handwritten line under it. It is `HERO_H1` — the phrase keeps one owner. */
export const WAIT_HERO_STRAP = HERO_H1;
export const WAIT_HERO_SUB = "Smarten your hunt for literary agent representation with QueryHawk.";

/* ── Feature 1: the Birds-eye view ── */
export const BE_HEADING = "A bird’s-eye view of your entire querying campaign";
/** Phones say it shorter. */
export const BE_LINE_PHONE = "Every query on one timeline, so you can see at a glance what needs you and when.";
export const BE_LINE_DESK = "Every query on one timeline, so you can see at a glance what needs you, what’s coming up and what can wait.";
export const BE_TICKS = [
  "What's overdue, what's coming up and what can wait",
  "Every reply date worked out for you",
  "Your next move flagged as it falls due",
] as const;
/** The phone window's ink header. */
export const BE_TITLE = "Birds-eye view";

/** The drawn date row both windows share: month bands, Monday ticks, and where TODAY sits (% across). */
export const BE_DATES = {
  months: [{ name: "October", from: 0, to: 66.3 }, { name: "November", from: 66.3, to: 100 }],
  ticks: [{ at: 4.6, label: "5" }, { at: 20.6, label: "12" }, { at: 36.6, label: "19" }, { at: 52.6, label: "26" }, { at: 84.6, label: "9" }],
  today: 64,
  todayLabel: "TODAY",
} as const;

/** Stages the windows colour by, and the name a bar falls back to when its sentence will not fit. */
export type BeStage = "q" | "pr" | "ps" | "fr" | "fs" | "o";
export const BE_STAGE_NAME: Record<BeStage, string> = {
  q: "Queried", pr: "Partial requested", ps: "Partial sent", fr: "Full requested", fs: "Full sent", o: "Offer",
};
export const BE_STAGE_RGB: Record<BeStage, readonly [number, number, number]> = {
  q: [236, 226, 209], pr: [226, 160, 139], fr: [226, 160, 139], ps: [178, 194, 172], fs: [178, 194, 172], o: [156, 180, 204],
};

/** Phones: eight bars at rest — [left %, width %, stage, sentence, overdue]. */
export const BE_PHONE_START: ReadonlyArray<readonly [number, number, BeStage, string, boolean]> = [
  [30, 34, "fr", "Full requested · send by 12 Nov", false],
  [0, 64, "q", "Reply 5 weeks overdue", true],
  [12, 66, "ps", "Partial sent · reply by 30 Nov", false],
  [42, 34, "o", "Offer · reply by 6 Nov", false],
  [4, 78, "q", "Queried · reply by 23 Nov", false],
  [48, 40, "fs", "Full sent · reply by 2 Dec", false],
  [10, 54, "q", "Reply 2 weeks overdue", true],
  [36, 56, "q", "Queried · reply by 26 Nov", false],
];
/** Phones: the story, one change at a time — [bar, left, width, stage, sentence, chip, blush chip, overdue]. */
export const BE_PHONE_EVENTS: ReadonlyArray<readonly [number, number, number, BeStage, string, string | null, boolean?, boolean?]> = [
  [1, 0, 64, "q", "Reply 5 weeks overdue", "Worth a nudge", true, true],
  [0, 30, 34, "fr", "Full requested · send by 12 Nov", "Send the full", true, false],
  [4, 60, 6, "pr", "Partial requested · send by 6 Nov", "Partial requested!", false, false],
  [4, 60, 22, "pr", "Partial requested · send by 6 Nov", null],
  [2, 12, 54, "ps", "Partial sent · reply by 3 Nov", "Reply due in 3 days", false, false],
  [6, 10, 54, "q", "Reply 2 weeks overdue", "Worth a nudge", true, true],
  [3, 42, 22, "o", "Offer · reply by 6 Nov", "Offer! Reply by Friday", true, false],
  [5, 48, 16, "fs", "Reply 3 days overdue", "Worth a nudge", true, true],
  [7, 58, 8, "fr", "Full requested · send by 30 Nov", "Full requested!", false, false],
  [7, 58, 34, "fr", "Full requested · send by 30 Nov", null],
  [0, 30, 34, "fr", "Full requested · send by 12 Nov", null],
  [4, 4, 78, "q", "Queried · reply by 23 Nov", null],
  [2, 12, 66, "ps", "Partial sent · reply by 30 Nov", null],
  [3, 42, 34, "o", "Offer · reply by 6 Nov", null],
  [5, 48, 40, "fs", "Full sent · reply by 2 Dec", null, false, false],
  [7, 36, 56, "q", "Queried · reply by 26 Nov", null],
];

/** Desktop: the eight rows — [left %, width %, stage, sentence, ghost line widths %] — and the one in focus. */
export const BE_DESK_ROWS: ReadonlyArray<readonly [number, number, BeStage, string, readonly [number, number] | null]> = [
  [0, 64, "q", "Reply 5 weeks overdue", [78, 52]],
  [8, 56, "ps", "Reply 12 days overdue", [64, 46]],
  [30, 42, "fr", "Send the full by 6 Nov", null],
  [42, 34, "o", "Reply to the offer by 9 Nov", [58, 40]],
  [48, 32, "pr", "Send the partial by 12 Nov", [72, 50]],
  [4, 88, "q", "Reply due 23 Nov", [66, 58]],
  [20, 80, "fs", "Reply due 2 Dec", [80, 44]],
  [36, 62, "q", "Reply due 28 Nov", [60, 48]],
];
export const BE_FOCUS = {
  name: "Eleanor Whitfield",
  agency: "Greenfield Literary",
  /** The detail card's sentence: [before, in bold, after]. */
  line: ["Full requested on 21 October. ", "Send it by 6 November", ", in 6 days."],
  action: "Mark full sent",
} as const;

/* ── Feature 2 onwards (phones): each a picture, a heading, a line and three ticks ──
   The desktop rows keep `FEATURE_ROWS`' own words ("Your agents on file" stays there). */
export const WAIT_AGENTS: FeatureCard = {
  key: "agents", heading: "A home for your agents",
  line: "Know your quarry. QueryHawk tracks the health of your agent list, making sure everything you need to query them smartly is up to date.",
  points: ["Agent wish list and desired genres", "Reply policies and response times", "Contact details & correspondence notes"],
};
/** The card's "play again" pill, both layouts. */
export const REPLAY_LABEL = "↻ Play again";

/* ── The mission (phones, navy) ── */
export const MISSION_EYEBROW = "Our mission? Simple.";

/* ── Questions (phones) ── */
export const FAQ_HEADING = "Questions";
export const FAQ: ReadonlyArray<readonly [string, string]> = [
  ["What does it cost?", "Nothing for founding writers: you get QueryHawk Pro free for your entire querying campaign."],
  ["Do I need a finished manuscript?", "No. If you're still writing or revising, there's a set-up for that too, ready for when you start querying."],
  ["I already track my queries in a spreadsheet.", "Bring it with you. Smart Import reads your spreadsheet and sets everything up, or you can start fresh in minutes."],
  ["What do you ask of founding writers?", "Occasional feedback to help shape QueryHawk. That's it."],
];
