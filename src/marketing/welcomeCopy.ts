/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founding welcome (/welcome) — every word on the page, by state (welcome page v1, 2 Nov;
 * ref design-refs/welcome-page-v1.html). Verbatim from the brief.
 *
 *   - Nothing names the writer or their email: the page never learns the address.
 *   - The only number on the page is the writer's own stored founding or reserve number. With none
 *     (no reference, or the lookup failed) every line that would carry it has a version without it.
 *   - No small capitals and no mono labels anywhere on the page.
 *
 * ⚠️ THE WAITING LIST PROMISES ONLY WHAT THE SYSTEM DOES. Since launch readiness (2 Nov) a freed place
 * goes to the next confirmed writer on the waiting list automatically, and they are emailed (PROMO-1),
 * so `PLACES_OFFERED_ON` is true and the 2(a) sentences are drawn: "If a founding place frees up, it's
 * offered to the next writer in line", "so if a place frees up, it's yours to take", and the "If a
 * place frees up" step. WEL-6 holds them.
 */
import { FOUNDING_CAP } from "./foundingCap";

export const WELCOME_KINDS = ["verified", "already", "waiting", "expired", "unknown"] as const;
export type WelcomeKind = (typeof WELCOME_KINDS)[number];

/** No `v` → unknown. A value outside the five → `unknown`. */
export const parseWelcomeKind = (raw: string | null): WelcomeKind =>
  raw !== null && (WELCOME_KINDS as readonly string[]).includes(raw) ? (raw as WelcomeKind) : "unknown";

export interface WelcomeData {
  foundingNumber?: number;
  reserveNumber?: number;
  /** YYYY-MM-DD, the UK date they confirmed. */
  confirmedOn?: string;
}

/** Launch readiness (2 Nov): freed places ARE offered on to the waiting list (PROMO-1). */
export const PLACES_OFFERED_ON = true;

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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-11-02" → "2 November 2026", or null. */
export const longDate = (iso?: string): string | null => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${Number(m[3])} ${month} ${m[1]}` : null;
};

/* ══════════════ The drawer ══════════════ */

export interface HeroCopy {
  heading: string;
  lede: string;
  /** The small blush line with the envelope (verified, already, waiting). */
  line?: string;
}

export const heroCopy = (kind: WelcomeKind, data: WelcomeData): HeroCopy => {
  const r = data.reserveNumber;
  switch (kind) {
    case "verified":
      return {
        heading: "Welcome, founding writer.",
        lede: "Everything's locked in. You'll be getting a QueryHawk campaign totally free of charge. Watch out for your invite – it'll be arriving soon.",
        line: "Your welcome email is on its way.",
      };
    case "already":
      return {
        heading: "You're already on the list.",
        lede: "That link had already done its job, usually because your email's security scanner opened it before you did. Nothing's wrong and nothing's changed: your founding place stands.",
        line: "Your welcome email is already with you.",
      };
    case "waiting":
      return {
        heading: r ? `So close. You're ${ordinalWord(r)} in line.` : "So close. You're on the reserve list.",
        lede: "The last founding place went while your email sat in your inbox. You're confirmed and on the reserve list, in the order people confirmed." +
          (PLACES_OFFERED_ON ? " If a founding place frees up, it's offered to the next writer in line." : ""),
        line: "We've emailed you to say so.",
      };
    case "expired":
      return {
        heading: "That link's 48 hours are up.",
        lede: "Your place wasn't held, but nothing's lost. Put your email in again and a fresh confirmation will be with you in a minute.",
      };
    case "unknown":
      return {
        heading: "We don't recognise that link.",
        lede: "It may have been cut short by your email app. Put your email in again and you'll get a fresh confirmation.",
      };
  }
};

export const FRESH_LINK_CTA = "Send a fresh link";

/* ══════════════ The pass ══════════════ */

export const PASS_LABEL = "Founding writer pass";
/* "Reserve list" (waitlist clarity v1, 2 Nov): "waitlist" means everyone who signs up now. Names stay WAITING. */
export const PASS_LABEL_WAITING = "Reserve list";
export const passBig = (n: number) => `No. ${n}`;
export const PASS_OF = `of ${FOUNDING_CAP}`;
export const PASS_IN_LINE = "in line";
export const STAMP_CONFIRMED = "Confirmed";
export const STAMP_RESERVE = "Reserve";
/** The ghost pass on a link that held nothing: two lines, then the strip's line. */
export const GHOST_BIG: [string, string] = ["Not yet", "held"];
export const GHOST_STRIP = "One click away";

/* ══════════════ Nick's note ══════════════ */

/** Founding emails v2's note, word for word. */
export const NOTE: readonly string[] = [
  "Hi, I'm Nick. I spent a year designing and building QueryHawk alongside my day job, driven by the belief that good stories shouldn't be lost to a messy querying campaign.",
  "I truly believe these tools give your manuscript the very best chance of landing with the right agent. Please use everything QueryHawk has to offer and let me know how you find it.",
  "Very best of luck with your campaign, and thank you for being part of the journey. We'll speak soon.",
];
export const NOTE_WAITING: readonly string[] = [
  "Sorry we couldn't fit you in this time, and thank you for signing up. You're confirmed and in the queue" +
    (PLACES_OFFERED_ON ? ", so if a place frees up, it's yours to take." : "."),
  "In the meantime I'd still love to hear from you: reply to my email any time. It comes straight to me.",
];
export const NOTE_SIGN = "Nick";
export const NOTE_ROLE = "Founder, QueryHawk";

/* ══════════════ What happens next ══════════════ */

export const NEXT_HEADING = "What happens next";
export interface Step { title: string; body: string }

export const nextSteps = (kind: WelcomeKind, data: WelcomeData): Step[] => {
  const setUp: Step = {
    title: "Get set up",
    body: "Spin through our speedy onboarding process and we'll tailor everything to exactly where your campaign stands. If you're partway through, we'll make it easy to bring your list on board.",
  };
  if (kind === "waiting") {
    const r = data.reserveNumber;
    return [
      { title: "You're on the reserve list",
        body: r ? `${cap(ordinalWord(r))} in line, in the order writers confirmed.` : "On the reserve list, in the order writers confirmed." },
      /* 2(a) only: under 2(b) a freed place is not offered on, so the step is dropped. */
      ...(PLACES_OFFERED_ON ? [{ title: "If a place frees up", body: "It's offered to the next writer in line, and you'll hear by email straight away." }] : []),
      setUp,
    ];
  }
  const n = data.foundingNumber;
  return [
    { title: "Your place is confirmed",
      body: n ? `Hello, founding writer number ${n}. We're honoured to have you on board.` : "Hello, founding writer. We're honoured to have you on board." },
    { title: "Your invitation arrives",
      body: "We're letting people in a few at a time so that everyone gets a proper welcome and the best experience possible. We'll email you as soon as your wave opens." },
    setUp,
  ];
};

/* ══════════════ What you get ══════════════ (the landing page's own words, read from landingCopy) */

export const GET_HEADING = "What you get";

/* ══════════════ Help shape QueryHawk ══════════════ (labels → the values the server accepts) */

export const TAPS_HEADING = "Help shape QueryHawk";
export const TAPS_LEAD = "Three quick taps. It takes ten seconds, and it helps me decide who to invite first.";
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
export const TAPS_NOTE = "Optional. You can close this page whenever you like.";
export const TAPS_THANKS = "Thank you, that's really useful.";
export const TAPS_THANKS_SUB = "You can close this page whenever you like.";
export const TAPS_FAILED = "That didn't send — try again";
/** Send enables only when all three are answered. */
export const canSend = (a: Partial<Record<AnswerKey, string>>): boolean =>
  QUESTIONS.every((q) => typeof a[q.key] === "string" && (q.options as readonly (readonly [string, string])[]).some((o) => o[0] === a[q.key]));

/* ══════════════ Get ready for day one ══════════════ */

export const READY_HEADING = "Get ready for day one";
export const READY_LEAD = "Set-up is quickest with your querying history nearby. Have these to hand:";
export const READY_LIST = [
  "Your tracking spreadsheet, if you keep one",
  "The agents you've queried, and when",
  "Any requests or replies you're waiting on",
];

/* ══════════════ The close and the chrome ══════════════ */

export const CLOSE_LINE = "That's everything for now. Keep an eye on your inbox.";
export const CLOSE_SIGN = "See you soon";
/** The footer on /welcome: the logo, then this line with Privacy as its one link. */
export const WELCOME_FOOT = "© 2026 QueryHawk · Made in the UK, for writers";

export const WELCOME_DOCUMENT_TITLE = "Welcome — QueryHawk";
