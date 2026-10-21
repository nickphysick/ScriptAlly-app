/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public pricing-page copy — verbatim from design-refs/pricing-page-v1.html (21 Oct).
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
 * ⚠️ NOTHING ON THE PAGE CAN BE BOUGHT. Every price below is a planned launch price; there is no
 * payment path, and the page's last question says so in as many words.
 */

import { CopyRun } from "./CopyRuns";

export const PRICING_V3_DOCUMENT_TITLE = "Pricing — QueryHawk";

/* ══════════════ The founding banner ══════════════ */
export const PV3_KICKER = "Founding writers";
export const PV3_H1 = "A free QueryHawk campaign for our first 100 writers.";
export const PV3_SUB = "We're looking for founding writers to put QueryHawk through its paces.";

/* ══════════════ The passes — planned launch prices ══════════════
   ⚠️ ONE TABLE, AND EVERY OTHER FIGURE ON THE PAGE IS READ FROM IT. The per-month figure is DERIVED
   (price ÷ months, to the penny); the saving is STATED, because the ref's three savings are not one
   rounding of the arithmetic — 20 / 40 / 53 against a computed 20.7 / 39.5 / 53.1 — and the page
   prints the ref's words. `pricingCopy.test.ts` holds each stated saving within one point of the
   arithmetic, so a price that moves without its saving fails there rather than on the page. */
export interface Pass {
  months: 1 | 3 | 6 | 12;
  /** Pounds, as the page prints it: "7.99", "19". */
  price: string;
  /** Percentage off twelve single months at the one-month price. Null for the one-month pass. */
  saving: number | null;
}
export const PASSES: Pass[] = [
  { months: 1, price: "7.99", saving: null },
  { months: 3, price: "19", saving: 20 },
  { months: 6, price: "29", saving: 40 },
  { months: 12, price: "45", saving: 53 },
];
/** Adding one month to a pass. */
export const ADD_MONTH_PRICE = "5.99";

/** £ a month for a pass, to the penny: 19 / 3 → "6.33". */
export const perMonth = (p: Pass): string => (Number(p.price) / p.months).toFixed(2);
export const passFor = (months: Pass["months"]): Pass => PASSES.find((p) => p.months === months)!;
/** "£6.33 a month · save 20%", or the one-month pass's own line. */
export const passPerMonthLine = (p: Pass): string =>
  p.saving === null ? "One month of Pro" : `£${perMonth(p)} a month · save ${p.saving}%`;
/** The cheapest month on any pass — Pro's "from" figure. */
export const PRO_FROM = PASSES.map(perMonth).sort((a, b) => Number(a) - Number(b))[0];

/* ══════════════ Then, once we launch ══════════════ */
export const PV3_LAUNCH_LINE = "Then, once we launch:";

export const PV3_FREE = {
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

export const PV3_PRO = {
  name: "Pro",
  from: "from",
  per: "a month",
  sub: "A pass sized to your campaign. No subscription.",
  plus: "Everything in Free, plus:",
  list: [
    "Unlimited agents",
    "Manuscript versions, one for each draft",
    "Submission packages and materials tracking",
    "Smart email drop",
    "The Scout",
  ],
  flex:
    "Pick 1, 3, 6 or 12 months. Add a month whenever you need one, pause while you revise, and keep " +
    "unused months if you sign.",
  link: "How long will I need?",
} as const;

/* ══════════════ Questions ══════════════ */
export interface Pv3Question { q: string; a: string }
export const PV3_FAQ_H2 = "Questions";
export const PV3_FAQ: Pv3Question[] = [
  {
    q: "Will a pass renew without asking?",
    a: "No. A pass ends on its date. We'll remind you a week before, and you choose whether to extend.",
  },
  {
    q: "Which pass should I buy?",
    a: "Most first campaigns run around six months, with a few rounds of sending and waiting. If you're " +
       "not sure, start there and extend if you need to.",
  },
  {
    q: "What happens to my months if I sign?",
    a: "Record your signing and any whole months left are kept as credit. They start again when you " +
       "begin querying your next book.",
  },
  {
    q: "Why can I only add one manuscript right now?",
    a: "Adding a second manuscript is coming soon, on every pass.",
  },
  {
    q: "What happens when the hundred founding places are gone?",
    a: "Founding places close, and QueryHawk opens to everyone on the plans above. Founding writers " +
       "stay free for their whole campaign.",
  },
  {
    q: "Will anything here charge me today?",
    a: "No. Passes aren't on sale yet, and nothing changes on your account until you choose to buy one.",
  },
];

/* ══════════════ The source note under the journey ══════════════ */
export const PV3_SOURCE_NOTE: CopyRun[] = [
  "A rough guide, not a promise, based on typical reply times reported by querying writers (",
  { link: "QueryTracker figures", href: "https://rejectomancy.com/2023/09/28/query-quest-what-are-my-chances-part-ii/" },
  ") and the reply windows agencies state.",
];
