/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founding welcome (/welcome) — every word on the page, by state.
 *
 * The copy is the mock's (design-refs/founding-welcome/founding-welcome-v1.html, Direction A),
 * except where a rule overrides it:
 *   - nothing names the writer or their email (we hold no name, and the page never learns the
 *     address): "Confirmed with lucy@example.com" became "We've sent your welcome email";
 *   - nothing claims what the data can't support: the reserve place is the writer's own stored
 *     number or nothing ("first reserve" only when it is 1), "You're near the top of the list" is
 *     gone, and the Smart Import preview states no invented counts.
 * The only number on the page is the writer's own stored founding or reserve number.
 */

export const WELCOME_KINDS = ["verified", "already", "waiting", "expired", "unknown"] as const;
export type WelcomeKind = (typeof WELCOME_KINDS)[number];

/** No `v` → null (the page treats it as unknown). A value outside the five → `unknown`. */
export const parseWelcomeKind = (raw: string | null): WelcomeKind =>
  raw !== null && (WELCOME_KINDS as readonly string[]).includes(raw) ? (raw as WelcomeKind) : "unknown";

export interface WelcomeData {
  foundingNumber?: number;
  reserveNumber?: number;
  /** YYYY-MM-DD, the UK date they confirmed. */
  confirmedOn?: string;
}

const ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export const ordinal = (n: number): string => {
  const t = n % 100, u = n % 10;
  const s = t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th";
  return `${n}${s}`;
};
/** 1 → "first" … 10 → "tenth", then "11th". */
export const ordinalWord = (n: number): string => ORDINAL_WORDS[n - 1] ?? ordinal(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "023" — the card pads to three digits; prose never pads. */
export const padNumber = (n: number): string => String(n).padStart(3, "0");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-10-18" → { day: "18", mon: "Oct", month: "October", year: "2026" }, or null. */
export const splitDate = (iso?: string) => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? { day: String(Number(m[3])), mon: month.slice(0, 3), month, year: m[1] } : null;
};

export interface StateCopy {
  chip: string;
  chipTone: "go" | "blush" | "stone";
  headline: string;
  lede: string;
  /** The small mono line under the lede (verified/already only). */
  sub?: string;
  cardCaption: string;
}

/** Copy for one state, given whatever data the page has (possibly none). */
export const stateCopy = (kind: WelcomeKind, data: WelcomeData): StateCopy => {
  const r = data.reserveNumber;
  switch (kind) {
    case "verified":
      return {
        chip: "✓ Place confirmed", chipTone: "go",
        headline: "Welcome, Founding Writer.",
        lede: "You're one of the hundred writers shaping QueryHawk before anyone else sees it. Your place is held, your perks are locked in, and the next thing you'll get from us is your invitation.",
        sub: "We've sent your welcome email",
        cardCaption: "Your founding card",
      };
    case "already":
      return {
        chip: "✓ Already confirmed", chipTone: "go",
        headline: "You're already in.",
        lede: "That link had already done its job, usually because your email's security scanner opened it before you did. Nothing's wrong and nothing's changed: your founding place stands.",
        sub: "We've sent your welcome email",
        cardCaption: "Your founding card",
      };
    case "waiting":
      return {
        chip: r ? `${cap(ordinalWord(r))} reserve` : "Reserve list", chipTone: "blush",
        headline: r ? `So close. You're ${ordinalWord(r)} reserve.` : "So close. You're on the reserve list.",
        lede: "The last founding place went while your email sat in your inbox. You're confirmed and on the waiting list in the order people confirmed. If a founding place frees up, it's offered to the next writer in line, and we'll tell you by email.",
        cardCaption: r === 1
          ? "Reserve card · first offered any place that frees up"
          : "Reserve card · places that free up are offered in line order",
      };
    case "expired":
      return {
        chip: "Link expired", chipTone: "stone",
        headline: "That link's 48 hours are up.",
        lede: "Your place wasn't held, but nothing's lost. Put your email in again and a fresh confirmation will be with you in a minute.",
        cardCaption: "No place held yet: one click away",
      };
    case "unknown":
      return {
        chip: "Link not recognised", chipTone: "stone",
        headline: "We don't recognise that link.",
        lede: "It may have been cut short by your email app. Put your email in again and you'll get a fresh confirmation.",
        cardCaption: "No place held yet: one click away",
      };
  }
};

export const FRESH_LINK_CTA = "Send a fresh link";

/* ── Nick's note ── (FOUNDER_PHOTO null → the initial disc) */
export const FOUNDER_PHOTO: string | null = null;
export const FOUNDER_INITIAL = "N";
export const NOTE_THANKS =
  "Thank you. Really. QueryHawk started because I was tracking my own queries in a spreadsheet that got harder to trust with every agent I added. You've just said you'll help me make it something every querying writer would want.";
export const NOTE_WAITING = "I'm sorry we couldn't hold a place this time. I'd still love to hear from you while you wait.";
export const NOTE_REPLY =
  "If you've got a question, an idea, or a story about the querying trenches, reply to your welcome email. It comes straight to me, and I read every one.";
export const NOTE_SIGN = "Nick";
export const NOTE_ROLE = "Founder, QueryHawk";

/* ── What happens next ── */
export const NEXT_EYEBROW = "What happens next";
export const NEXT_HEADING = "Three steps, and you've done the first.";
export const stepOne = (kind: WelcomeKind, data: WelcomeData): { title: string; body: string } =>
  kind === "waiting"
    ? {
        title: "You're on the list",
        body: data.reserveNumber
          ? `${cap(ordinalWord(data.reserveNumber))} reserve, in the order writers confirmed.`
          : "On the reserve list, in the order writers confirmed.",
      }
    : {
        title: "Your place is confirmed",
        body: data.foundingNumber
          ? `Founding Writer No. ${data.foundingNumber} is yours, and so are the perks below.`
          : "Your founding place is yours, and so are the perks below.",
      };
export const STEP_ONE_WHEN = "Done · today";
export const STEP_TWO = {
  title: "Your invitation arrives",
  body: "We're letting founding writers in a few at a time, so every one gets a proper welcome. Yours comes by email: one button, no codes.",
  when: "By email · in waves",
};
export const STEP_THREE = {
  title: "Set up in five minutes",
  body: "Your name, your manuscript and the agents you've queried. Bring your tracking spreadsheet and Smart Import will read it for you.",
  when: "On the day",
};
export const PERKS = [
  "Six months of Pro, free",
  "The founding rate for as long as you're querying",
  "A direct line to the founder",
];

/* ── A first look ── */
export const PEEK_EYEBROW = "A first look";
export const PEEK_HEADING = "Here's what's waiting for you.";
export const PEEKS = [
  { title: "Query Centre", body: "Every query, where it stands, and what's due next, on one page." },
  { title: "Contact list", body: "The agents you're after, who's open, and who has your pages." },
  { title: "Smart Import", body: "Bring your spreadsheet. We'll do the typing." },
];
export const PEEK_FILE = "my-queries.xlsx";
export const PEEK_DONE = "Every query and agent, read";

/* ── Three quick taps ── (labels → the values the server accepts) */
export const TAPS_EYEBROW = "Help shape QueryHawk · optional";
export const TAPS_HEADING = "Three quick taps.";
export const QUESTIONS = [
  { key: "stage", label: "Where are you with querying?", options: [
    ["getting-ready", "Getting ready"], ["just-started", "Just started"],
    ["in-the-thick", "In the thick of it"], ["revising", "Revising and going again"],
  ] },
  { key: "queried", label: "How many agents have you queried so far?", options: [
    ["none", "None yet"], ["1-10", "1–10"], ["11-50", "11–50"], ["50-plus", "50+"],
  ] },
  { key: "tracker", label: "What do you track them in now?", options: [
    ["spreadsheet", "Spreadsheet"], ["querytracker", "QueryTracker"], ["notebook", "Notebook"],
    ["inbox", "My inbox"], ["other", "Something else"],
  ] },
] as const;
export type AnswerKey = (typeof QUESTIONS)[number]["key"];
export const TAPS_SEND = "Send to Nick";
export const TAPS_NOTE = "Takes ten seconds. It helps us decide who to invite first.";
export const TAPS_THANKS = "Thank you, that's really useful.";
export const TAPS_THANKS_SUB = "You can close this page whenever you like.";
export const TAPS_FAILED = "That didn't send — try again";
/** Send enables only when all three are answered. */
export const canSend = (a: Partial<Record<AnswerKey, string>>): boolean =>
  QUESTIONS.every((q) => typeof a[q.key] === "string" && (q.options as readonly (readonly [string, string])[]).some((o) => o[0] === a[q.key]));

/* ── Have these to hand ── */
export const READY_EYEBROW = "Get ready for day one";
export const READY_HEADING = "Have these to hand.";
export const READY_BODY = "Set-up is quickest when you've got your querying history nearby.";
export const READY_LIST = [
  "Your tracking spreadsheet, if you keep one",
  "The agents you've queried, and when",
  "Any requests or replies you're waiting on",
];

/* ── Closing ── */
export const CLOSE_LINE = "That's everything for now. Keep an eye on your inbox. We'll be in touch.";
export const CLOSE_WAITING = "We'll email you the moment anything changes.";
export const CLOSE_HAND = "See you soon";

export const WELCOME_DOCUMENT_TITLE = "Welcome — QueryHawk";
