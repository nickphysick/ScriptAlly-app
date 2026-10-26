/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Which plan suits me best?" — the arithmetic, pure. Ported from the script in
 * design-refs/pricing-page-v2.html (the IIFE that opens `const WPM = 4.345`), numbers unchanged.
 * Pricing v4 added the ref's two "I'm not sure" answers: "I don't know" for the agents count (about
 * 40, and the sentence says it was a guess) and "Not sure yet" for the pace (estimated as steady).
 *
 * ⚠️ TODAY IS AN ARGUMENT, NEVER `new Date()` IN HERE. The slow seasons are counted over the months
 * the campaign spans FROM TODAY, so the same answers give a different estimate in June and in
 * October. A function that read the clock itself could only be tested on the day it was written.
 *
 * ⚠️ THE EXPECTED VALUES IN THE TEST COME FROM THE REF RUNNING, not from reading this file:
 * `scripts/pricing-v4-refoutputs.mjs` drives the ref's own script in a browser with the clock
 * pinned, across every answer combination, into `campaignEstimate.ref.json`.
 *
 * ⚠️ IT IS A ROUGH GUIDE AND THE PAGE SAYS SO. Nothing here is a reply-time model; it is the ref's
 * rule of thumb, and the source note under the journey states where its figures come from.
 */

import { planFor, planPerMonthLine, type ProPlan } from "./pricingCopy";

export type Stage = "prep" | "ready" | "already";
export type Kind = "novel" | "nonfic" | "pb";
export type Length = "s" | "m" | "l";
export type Pace = "steady" | "brisk" | "unsure";

export interface CampaignAnswers {
  stage: Stage;
  kind: Kind;
  /** Required when `kind` is a novel; ignored otherwise. */
  len: Length | null;
  agents: number;
  /** "I don't know": the count is taken as 40 and the sentence says so. */
  agentsUnknown: boolean;
  pace: Pace;
}

export interface CampaignEstimate {
  /** Unrounded months: weeks ÷ 4.345. */
  months: number;
  /** "About twelve months", or "About a year or more". */
  label: string;
  /** The why sentence under the estimate. */
  why: string;
  /** True when the getting-ready note shows. */
  prep: boolean;
  /** The plan that fits: 1, 3, 6 or 12 months. */
  fit: ProPlan["months"];
  /** The plan card's closing sentence. */
  tail: string;
}

/** Weeks in a month. */
export const WPM = 4.345;
/** "Not sure yet" is estimated at the steady pace — the ref's "We'll assume rounds of about ten". */
export const PACE: Record<Exclude<Pace, "unsure">, { n: number; every: number; say: string }> = {
  steady: { n: 10, every: 6, say: "about six weeks apart" },
  brisk: { n: 15, every: 4.345, say: "about a month apart" },
};
/** Weeks an agent takes to read a full manuscript, by length. */
export const READ: Record<Length, number> = { s: 10, m: 12, l: 14 };
/** Non-fiction (a proposal) and a picture book (read with the query). */
export const READ_NONFIC = 6;
export const READ_PB = 3;
/** The stepper: steps of 5, from 5 to 150, opening at 40. */
export const AGENTS_MIN = 5;
export const AGENTS_MAX = 150;
export const AGENTS_STEP = 5;
export const AGENTS_DEFAULT = 40;
/** What "I don't know" sets the count to. */
export const AGENTS_UNKNOWN = 40;

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"];
const w = (n: number): string => WORD[n] || String(n);

export const clampAgents = (n: number): number => Math.max(AGENTS_MIN, Math.min(AGENTS_MAX, n));

/**
 * Slow seasons the campaign spans from `today`: August costs three weeks and Christmas two, each
 * counted once, in the order they are met. The ref's own loop, month by month from this month.
 */
export const slowWeeks = (weeks: number, today: Date): { lost: number; seen: string[] } => {
  let lost = 0;
  const seen: string[] = [];
  for (let i = 0; i <= Math.ceil(weeks / WPM); i++) {
    const m = new Date(today.getFullYear(), today.getMonth() + i, 1).getMonth();
    if (m === 7 && !seen.includes("August")) { lost += 3; seen.push("August"); }
    if (m === 11 && !seen.includes("Christmas")) { lost += 2; seen.push("Christmas"); }
  }
  return { lost, seen };
};

/** The plan that fits a campaign of `months`. */
export const fitFor = (months: number): ProPlan["months"] =>
  months <= 1.25 ? 1 : months <= 3.5 ? 3 : months <= 7 ? 6 : 12;

export const estimateCampaign = (a: CampaignAnswers, today: Date): CampaignEstimate => {
  const pace = PACE[a.pace === "unsure" ? "steady" : a.pace];
  /* "I don't know" counts as 40 whatever the stepper last read — the ref sets it to 40 too. */
  const agents = a.agentsUnknown ? AGENTS_UNKNOWN : a.agents;
  const rounds = Math.ceil(agents / pace.n);
  const lastSend = (rounds - 1) * pace.every;
  const read = a.kind === "novel" ? READ[a.len ?? "m"] : a.kind === "nonfic" ? READ_NONFIC : READ_PB;
  let weeks = lastSend + Math.max(12, 5 + read + 2) + (a.stage === "prep" ? 8 : 0);
  const slow = slowWeeks(weeks, today);
  weeks += slow.lost;
  const months = weeks / WPM;
  const r = Math.max(1, Math.round(months));
  const label = months > 13 ? "About a year or more" : `About ${w(r)} month${r > 1 ? "s" : ""}`;

  /* A guessed count or a guessed pace is said to be one: "Going by a typical campaign, you'd…". */
  const howMany = a.agentsUnknown ? `about ${AGENTS_UNKNOWN} queries` : `${agents} queries`;
  const you = a.agentsUnknown || a.pace === "unsure" ? "Going by a typical campaign, you" : "You";
  const sends = rounds === 1
    ? `${you}'d send all ${howMany} at once`
    : `${you}'d send ${howMany} in ${w(rounds)} rounds, ${pace.say}`;
  const reads = a.kind === "novel"
    ? "agents who like your opening usually take two to three months to read the manuscript"
    : a.kind === "nonfic"
      ? "agents read a proposal faster than a full manuscript"
      : "agents read a picture book with the query, so decisions come sooner";
  const prepS = a.stage === "prep" ? " We've added about two months to get ready." : "";
  const slowS = slow.seen.length ? ` We've allowed for ${slow.seen.join(" and ")}, when agents slow down.` : "";
  const why = `${sends}. Replies take up to three months, and ${reads}.${prepS}${slowS}`;

  const fit = fitFor(months);
  const over = months - fit;
  /* ⚠️ A PLAN CARRIES ON MONTH BY MONTH ONCE IT ENDS (Nick, 26 Oct; ref pricing-plans-ladder-v1.html's
     wording panel). The two tails that run past the plan say so, and nothing more: the roll-on's price
     and the reminder live in the small print and the FAQ, so the result card does not restate them.
     (Before: 24 Oct "we'll be in touch with options to extend"; before that, a month at £5.99.) */
  const tail = months > 13 ? "If you're still querying after that, your plan simply carries on month by month."
    : over > 0.25 ? "If your last replies run late, your plan simply carries on month by month until you're done."
    : fit - months > 2 ? "It leaves room for slow replies, or for revising if an agent asks."
    : "There's a little room in it for slow replies.";

  return { months, label, why, prep: a.stage === "prep", fit, tail };
};

/** The plan card's lines for a fitting plan: "Pro, 6 months", "29", "£4.83 a month · save 40%". */
export const planCard = (fit: ProPlan["months"]) => {
  const p = planFor(fit);
  return { name: `Pro, ${fit} month${fit > 1 ? "s" : ""}`, price: p.price, perMonth: planPerMonthLine(p) };
};
