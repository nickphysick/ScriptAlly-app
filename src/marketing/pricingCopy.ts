/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public pricing-page copy — verbatim from design-refs/pricing-page-v2.html (24 Oct), which
 * supersedes pricing-page-v1.html for this route.
 *
 * ⚠️ THIS IS THE PUBLIC /pricing PAGE'S OWN MODULE, AND THE SIGNED-IN /plans PAGE NEVER READS IT.
 * `/plans` reads `PRICING_TIERS`, `PRO_PRICE_MONTHLY` and `PRO_PRICE_YEARLY` from `landingCopy.ts`,
 * which describe what the app does TODAY. This page describes the plans planned for launch, under
 * the line "Then, once we launch:" — two different questions, so two modules, and neither can
 * quietly change the other's answer.
 *
 * ⚠️ EDIT THE WORDS HERE AND NOWHERE ELSE, and keep them verbatim against the ref. The same
 * discipline `landingCopy.ts` and `aboutCopy.ts` carry.
 *
 * ⚠️ NOTHING ON THE PAGE CAN BE BOUGHT. Every price below is a planned launch price, stated under
 * "Then, once we launch:"; there is no payment path and no buy button.
 */

import { CopyRun } from "./CopyRuns";

export const PRICING_DOCUMENT_TITLE = "Pricing — QueryHawk";

/* ══════════════ The founding box ══════════════ */
export const PV4_KICKER = "Founding writers";
export const PV4_H1 = "A free QueryHawk campaign for our first 100 writers.";
export const PV4_SUB = "We're looking for founding writers to put QueryHawk through its paces.";

/** The toggle at the box's foot: its label closed, and open. */
export const PV4_MORE = "What founding writers get";
export const PV4_LESS = "Show less";

/**
 * The four cards behind the toggle. `icon` names one of the ref's four line drawings, which
 * `PricingPage.tsx` holds — the words are here, the pictures are markup.
 */
export interface Pv4Perk { icon: "gift" | "chat" | "import" | "people"; title: string; body: string }
export const PV4_PERKS: Pv4Perk[] = [
  {
    icon: "gift",
    title: "The full power of QueryHawk, completely free of charge",
    body: "Full access to QueryHawk Pro for an entire querying campaign.",
  },
  {
    icon: "chat",
    title: "A direct line to the founder",
    body: "You'll shape QueryHawk for future users, and help countless other writers get their story told.",
  },
  {
    icon: "import",
    title: "Bring your list across",
    body: "If you're already querying, Smart Import will read your list and turn your agents and queries " +
      "into a smart QueryHawk database.",
  },
  {
    icon: "people",
    title: "Discounts for your network on launch",
    body: "When QueryHawk launches properly, you'll be able to invite friends and fellow writers on board " +
      "with an exclusive Early Bird discount.",
  },
];
export const PV4_STEPS_H = "How it works";
export const PV4_STEPS = ["Sign up", "Receive and confirm your invite", "Log in with your unique founder's code"];

/* ══════════════ The Pro plans — planned launch prices ══════════════
   ⚠️ ONE TABLE, AND EVERY OTHER FIGURE ON THE PAGE IS READ FROM IT. The per-month figure is DERIVED
   (price ÷ months, to the penny); the saving is STATED, because the ref's three savings are not one
   rounding of the arithmetic — 20 / 40 / 53 against a computed 20.7 / 39.5 / 53.1 — and the page
   prints the ref's words. `pricingCopy.test.ts` holds each stated saving within one point of the
   arithmetic, so a price that moves without its saving fails there rather than on the page.
   ⚠️ THEY ARE PLANS, NEVER PASSES (pricing v4): the copy says "plans" and so do the identifiers. */
export interface ProPlan {
  months: 1 | 3 | 6 | 12;
  /** Pounds, as the page prints it: "7.99", "19". */
  price: string;
  /** Percentage off twelve single months at the one-month price. Null for the one-month plan. */
  saving: number | null;
}
export const PRO_PLANS: ProPlan[] = [
  { months: 1, price: "7.99", saving: null },
  { months: 3, price: "19", saving: 20 },
  { months: 6, price: "29", saving: 40 },
  { months: 12, price: "45", saving: 53 },
];

/** £ a month for a plan, to the penny: 19 / 3 → "6.33". */
export const perMonth = (p: ProPlan): string => (Number(p.price) / p.months).toFixed(2);
export const planFor = (months: ProPlan["months"]): ProPlan => PRO_PLANS.find((p) => p.months === months)!;
/** "£6.33 a month · save 20%", or the one-month plan's own line — the result card's wording. */
export const planPerMonthLine = (p: ProPlan): string =>
  p.saving === null ? "One month of Pro" : `£${perMonth(p)} a month · save ${p.saving}%`;
/** The cheapest month on any plan — Pro's "from" figure. */
export const PRO_FROM = PRO_PLANS.map(perMonth).sort((a, b) => Number(a) - Number(b))[0];
/** "£19", as a tile and the result card print it. */
export const planPrice = (p: ProPlan): string => `£${p.price}`;
/**
 * A plan tile's foot line, in two runs so the saving can carry its own colour: the one-month plan
 * reads "Add to any plan"; the rest "£6.33 a month · " then "save 20%".
 */
export const planTileLine = (p: ProPlan): { lead: string; save: string | null } =>
  p.saving === null ? { lead: "Add to any plan", save: null } : { lead: `£${perMonth(p)} a month · `, save: `save ${p.saving}%` };
/** "1 month", "3 months". */
export const planMonths = (m: number): string => `${m} month${m > 1 ? "s" : ""}`;

/* ══════════════ Then, once we launch ══════════════ */
export const PV4_LAUNCH_LINE = "Then, once we launch:";

export const PV4_FREE = {
  name: "Free",
  price: "0",
  sub: "For as long as you like",
  list: [
    "One manuscript",
    "Up to 20 agents",
    "Unlimited queries and response tracking",
    "To-do list",
    "Bring your list across with Smart Import",
  ],
} as const;

export const PV4_PRO = {
  name: "Pro",
  from: "from",
  per: "a month",
  sub: "A plan sized to your campaign. No subscription.",
  plus: "Everything in Free, plus:",
  list: [
    "Unlimited agents",
    "Manuscript versions, one for each draft",
    "Submission packages and materials tracking",
    "Smart email drop",
    "The Scout",
  ],
  flex: "Pick 1, 3, 6 or 12 months. It never renews automatically, and we'll be in touch with options before it ends.",
} as const;

/* ══════════════ Pro plans, and the questions behind a link ══════════════ */
export const PLANS_TITLE = "Pro plans";
export const PLANS_SUB = "Every Pro feature, for as long as your campaign runs.";
/** The link that opens the questions, and what it reads once they are open. */
export const SUIT_LINK = "Which plan suits me best?";
export const SUIT_HIDE = "Hide the questions";

/* ══════════════ Questions ══════════════
   ⚠️ AN ANSWER IS RUNS, NOT A STRING, because one of them carries a link: "Which plan suits me
   best?" inside an answer is the control that opens the questions, rendered by the page. */
export type FaqRun = string | { suit: string };
export interface Pv4Question { q: string; a: FaqRun[] }
export const PV4_FAQ_H2 = "Questions";
export const PV4_FAQ: Pv4Question[] = [
  {
    q: "Is it really free for founding writers?",
    a: ["Yes, completely. Founding writers get the full power of QueryHawk Pro for an entire querying campaign, " +
        "free of charge. No card, and no catch."],
  },
  {
    q: "What happens when my founding campaign ends?",
    a: ["Just drop us a note to let us know you're done. We'd love to hear how it went."],
  },
  {
    q: "What's the difference between Free and Pro?",
    a: ["Free covers the essentials: one manuscript, up to 20 agents, and every query and response tracked. " +
        "Pro adds the tools that make querying smarter, from manuscript versions and submission packages to " +
        "Smart email drop and The Scout."],
  },
  {
    q: "Is Pro a subscription?",
    a: ["No. You choose a plan that matches how long you expect to be querying, from one month to twelve, and " +
        "it simply ends on its date. We'll remind you a week before, so you're never charged for something " +
        "you didn't ask for."],
  },
  {
    q: "Which plan should I choose?",
    a: [
      "Querying usually takes longer than writers expect, often six months or more once agents start reading " +
      "full manuscripts. Answer four quick questions under ",
      { suit: SUIT_LINK },
      " and we'll suggest one for you.",
    ],
  },
  {
    q: "What if my campaign runs longer than planned?",
    a: ["Before your current plan ends, we'll get in touch with options to extend it. Whatever you decide, " +
        "you'll never lose your data."],
  },
  {
    q: "What if I sign with an agent before my plan runs out?",
    a: ["Congratulations! There's nothing you need to do. Your plan will simply run to the end of its months, " +
        "and it won't renew automatically."],
  },
  {
    q: "Can I bring across the spreadsheet I already use?",
    a: ["Yes. Smart Import will read your list and turn your agents and queries into a smart QueryHawk " +
        "database, so you don't have to start again."],
  },
];
/** An answer's text, the link's words included — for locks and for anything that needs it flat. */
export const faqText = (a: FaqRun[]): string => a.map((r) => (typeof r === "string" ? r : r.suit)).join("");

/* ══════════════ Which plan suits me best? — one question at a time ══════════════
   ⚠️ VERBATIM FROM THE REF'S MARKUP AND SCRIPT (its `INS` object and `agentsIns`). The arithmetic is
   `campaignEstimate.ts`; these are the words around it. The notes under the answers carry no label
   — the ref's v18 retired "Good to know". */
export const JY_TITLE = SUIT_LINK;
export const JY_STEPS = 4;
export const jyStepLabel = (n: number): string => (n < JY_STEPS ? `Question ${n + 1} of ${JY_STEPS}` : "Your plan");
export const JY_NEXT = "Next";
export const JY_SEE_PLAN = "See my plan";
export const JY_BACK = "Back";
export const JY_AGAIN = "Change my answers";

export interface JyOption<V extends string> { v: V; title: string; small?: string }

export const JY_Q_STAGE = "Where are you with your querying?";
export const JY_STAGES: JyOption<"prep" | "ready" | "already">[] = [
  { v: "prep", title: "Getting ready", small: "Building my list, polishing my letter" },
  { v: "ready", title: "Ready to start", small: "About to send my first queries" },
  { v: "already", title: "Already querying", small: "I've sent some queries" },
];
export const JY_Q_KIND = "What are you querying?";
export const JY_KINDS: JyOption<"novel" | "nonfic" | "pb">[] = [
  { v: "novel", title: "A novel" },
  { v: "nonfic", title: "Non-fiction" },
  { v: "pb", title: "A picture book" },
];
export const JY_Q_LEN = "Roughly how long is it?";
export const JY_LENGTHS: JyOption<"s" | "m" | "l">[] = [
  { v: "s", title: "Under 80,000 words" },
  { v: "m", title: "80,000 to 110,000" },
  { v: "l", title: "Over 110,000" },
];
export const JY_Q_AGENTS = "How many agents do you plan to query?";
export const JY_FEWER = "Fewer agents";
export const JY_MORE = "More agents";
export const JY_OR = "or";
export const JY_IDK = "I don't know";
export const JY_Q_PACE = "How will you send them?";
export const JY_PACES: JyOption<"steady" | "brisk" | "unsure">[] = [
  { v: "steady", title: "A few at a time", small: "Rounds of about ten" },
  { v: "brisk", title: "Bigger batches", small: "Rounds of fifteen or more" },
  { v: "unsure", title: "Not sure yet", small: "We'll assume a typical pace" },
];

/** The note under each answer. */
export const JY_INSIGHT = {
  stage: {
    prep: "That part takes longer than people expect. Most writers spend a month or two on their list and their letter, so we'll count it in.",
    ready: "Then you're nearly there. A small first round is a good idea: the replies tell you whether your letter is working.",
    already: "We'll count from today. Agents can take up to three months to reply, so queries you've already sent may still come back.",
  },
  kind: {
    nonfic: "Non-fiction usually sells on a proposal rather than a finished book, and agents get through those faster.",
    pb: "Agents read a picture book with your query, so you tend to hear back sooner.",
  },
  len: {
    s: "If an agent likes your opening, they'll ask for the full manuscript. A shorter book gets read a little quicker.",
    m: "If an agent likes your opening, they'll ask for the full manuscript. At this length they usually take two to three months to read it.",
    l: "If an agent likes your opening, they'll ask for the full manuscript. A longer book takes them longer to read, so we've allowed a few extra weeks.",
  },
  pace: {
    steady: "Small rounds give you the chance to change your letter if the first replies are quiet.",
    brisk: "Bigger batches get you through your list sooner, but leave less room to change your letter between rounds.",
    unsure: "That's fine. We'll assume rounds of about ten, which is what most writers do.",
  },
} as const;
export const jyAgentsInsight = (n: number, unknown: boolean): string =>
  unknown ? "No problem. We'll go with about 40, which is roughly what most writers end up sending."
  : n < 20 ? "That's a fairly short list. Most writers end up querying more agents than they first planned."
  : n <= 60 ? "That's about typical. Most writers send somewhere between 40 and 50 queries."
  : "That's a long list, so it'll take more rounds to get through. We've allowed for that.";

/* The result screen. */
export const JY_YOUR_CAMPAIGN = "Your campaign";
export const JY_PREP_NOTE =
  "That getting-ready time counts too. Build your agent list with what each agent wants, find comparable " +
  "titles and new agents with The Scout, and put your letter, synopsis and sample into submission " +
  "packages, so you start querying organised.";
export const JY_FITS = "Fits your campaign";
export const JY_INCLUDES = "Every Pro feature: manuscript versions, submission packages, Smart email drop and The Scout.";

/* ══════════════ The source note under the questions ══════════════ */
export const PV4_SOURCE_NOTE: CopyRun[] = [
  "A rough guide, not a promise, based on typical reply times reported by querying writers (",
  { link: "QueryTracker figures", href: "https://rejectomancy.com/2023/09/28/query-quest-what-are-my-chances-part-ii/" },
  ") and the reply windows agencies state.",
];

/* ══════════════ On phones (design-refs/pricing-page-mobile-v1.html, 25 Oct) ══════════════
   ⚠️ ONLY WHAT THE PHONE SAYS DIFFERENTLY IS NEW HERE. Every other word on the phone page — the box,
   the perks, the steps, the tiers, the plans, the eight questions, the four journey questions and
   their notes — is read from the constants above, so the two widths cannot come to disagree. */
/** The Pro side of the Free / Pro switch carries its "from" figure, read from the plan table. */
export const SEG_PRO_FROM = `${PV4_PRO.from} £${PRO_FROM}`;
/** Under the "Which plan suits me best?" button. */
export const SUIT_NOTE = "Four quick questions, about a minute.";
/** A plan tile's mono line on a phone: the per-month figure, then the saving on a line of its own. */
export const planTileLines = (p: ProPlan): { lead: string; save: string | null } =>
  p.saving === null ? { lead: "Add to any plan", save: null } : { lead: `£${perMonth(p)} a month`, save: `save ${p.saving}%` };
/** The three novel lengths as the phone's row of short cards. Same values as `JY_LENGTHS`. */
export const JY_LENGTHS_SHORT: JyOption<"s" | "m" | "l">[] = [
  { v: "s", title: "Under 80k" },
  { v: "m", title: "80k to 110k" },
  { v: "l", title: "Over 110k" },
];
/** The sheet's footer button on the result, and its close control's name. */
export const JY_SEE_IN_PLANS = "See it in the plans";
export const JY_CLOSE = "Close";
