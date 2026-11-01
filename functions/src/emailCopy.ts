/**
 * emailCopy — the words in the three emails, and nothing else.
 *
 * ⚠️ EDIT THE WORDS HERE AND NOWHERE ELSE, the same discipline `landingCopy.ts` and
 * `foundersCopy.ts` carry. A template that inlines its own sentences is a template whose wording
 * drifts every time somebody touches the markup — and these are the only writing a founding
 * writer receives from us before they have an account.
 *
 * ⚠️ VERBATIM FROM THE FOUNDING EMAILS v1 BRIEF (1 Nov; ref design-refs/founding-emails-v1.html,
 * "Proposed"). "founding writer" is lower case throughout, as it is on the site.
 *
 * ⚠️ AND THESE CARRY THE SAME COMMITMENTS THE PUBLIC PAGES DO. Pro free for the querying campaign,
 * a direct line to a person. If one stops being true the fix is the product, not the sentence —
 * and unlike a web page, an email cannot be corrected after it is sent.
 *
 * ⚠️ NO DATES. "When your wave opens" is honest; "in October" is a promise made by somebody who
 * does not know. "Weeks, not months" is Nick's own, hedged with "all being well".
 *
 * ⚠️ THE WAITING-LIST PROMISE FOLLOWS WHAT THE SYSTEM DOES (brief decision 2(b)). An unsubscribe
 * puts the founding number back on the freed list for the next writer to CONFIRM; nobody on the
 * waiting list is moved, numbered or emailed. So email 3 says "in the order people confirmed" and
 * "you'll hear from me" — never that a place goes to them, or that they will be emailed straight
 * away. Building that promotion is a cap/ledger decision for Nick (see the founding emails report).
 */

/* ══════════════ Shared ══════════════ */

export const BRAND_NAME = "QueryHawk";

/** Printed on the pass in capitals. Stored in sentence case so the text version reads naturally. */
export const PASS_LABEL = "Founding writer pass";
export const passNumber = (n: number): string => `No. ${n}`;
export const passOf = (cap: number): string => `of ${cap}`;

/** ⚠️ A VISIBLE ADDRESS, NOT JUST A `Reply-To` HEADER: the "direct line to the founder" promise. */
export const contactLine = (supportEmail: string): [string, string, string] => [
  "Questions, or something you'd like QueryHawk to do? Just reply, or write to ",
  supportEmail,
  ". I read every one.",
];
export const contactText = (supportEmail: string): string => contactLine(supportEmail).join("");

export const UNSUBSCRIBE_LABEL = "Unsubscribe";

/** ⚠️ SAY WHAT UNSUBSCRIBING COSTS. A place given up goes back to the list; that is worth knowing. */
export const UNSUBSCRIBE_NOTE = "This takes you off the list and frees your place for another writer.";
export const UNSUBSCRIBE_NOTE_WAITING = "This takes you off the waiting list.";

export const FOOT_LINE = "QueryHawk · Made in the UK, for writers";

export const SIGNATURE_NAME = "Nick";
export const SIGNATURE_ROLE = "Founder, QueryHawk";

/* ══════════════ 1 · Confirm your place ══════════════ */

export const CONFIRM_SUBJECT = "Confirm your founding place";
export const CONFIRM_PREHEADER = "One click and your place is yours. The link works for 48 hours.";
export const CONFIRM_HEADING = "One click and you're on the list.";
export const CONFIRM_LEAD =
  "Thanks for putting your name down as a QueryHawk founding writer. There's just one thing left to do.";
export const CONFIRM_CTA = "Confirm my place";
export const CONFIRM_EXPIRY = "This link works for 48 hours.";

/**
 * ⚠️ THE HARDEST SENTENCE IN ANY OF THEM, AND IT HAS TO BE HERE. With a hard cap of fifty, somebody
 * can confirm after the last place goes. The race is unavoidable with double opt-in, and the honest
 * fix is to warn about it now rather than apologise afterwards. Bold lead, then the rest.
 */
export const CONFIRM_NOT_HELD: [string, string] = [
  "Your place isn't held until you click.",
  " There are fifty founding places and they go in the order people confirm. If the last one goes " +
  "while this sits in your inbox, you'll go on the waiting list instead, and I'll tell you straight.",
];
export const CONFIRM_NEXT =
  "Once you've confirmed, you'll get your founding writer pass, and your invite follows when your wave opens.";

/** ⚠️ NO ACTION REQUIRED TO OPT OUT. Someone who did not ask for this must not have to do anything. */
export const CONFIRM_NOT_YOU =
  "Didn't ask for this? Just ignore it. Nothing happens without that click, and we won't write again.";

/* ══════════════ 2 · You're in ══════════════ */

/** The writer's stored founding number — never rounded and never estimated. Unpadded. */
export const welcomeSubject = (foundingNumber: number): string =>
  `You're in: founding writer No. ${foundingNumber}`;
export const WELCOME_PREHEADER = "Your pass is inside. Welcome to the first fifty.";
export const WELCOME_HEADING = "That's your place confirmed.";
export const WELCOME_LEAD =
  "Welcome aboard. You're one of the first fifty writers to use QueryHawk, and this is your pass.";

export const WELCOME_NOTE: readonly string[] = [
  "Hi, I'm Nick, a keen writer with a background in simplifying data to drive smart decision making. " +
  "I spent a year designing and building QueryHawk alongside my day job, driven by the belief that good " +
  "stories shouldn't be lost to a messy querying campaign.",
  "I truly believe these tools give your manuscript the very best chance of landing with the right agent. " +
  "Please use everything it has to offer, and let me know how you find it.",
  "Very best of luck with your campaign, and thank you for being part of the journey.",
];

export const WELCOME_GET_HEADING = "What you get";
/** Each perk as [bold lead, rest]. */
export const WELCOME_PERKS: readonly (readonly [string, string])[] = [
  ["QueryHawk Pro, free", " for your entire querying campaign"],
  ["A direct line", " to the founder"],
  ["Smart Import", " to bring your list across"],
  ["An exclusive Early Bird discount", " for the writers you invite when we launch"],
];

export const WELCOME_NEXT_HEADING = "What happens next";
export const WELCOME_NEXT: readonly string[] = [
  "We're opening QueryHawk to founding writers in waves rather than all at once, so we can fix what the " +
  "first group finds before the next arrives. When your wave opens, you'll get an invite with a link to " +
  "set up your account.",
  "All being well, we're talking weeks, not months, and I'll keep you up to date as often as I can.",
];

/* ══════════════ 3 · Waiting list ══════════════ */

export const WAITING_SUBJECT = "You're first in line if a place opens";
export const WAITING_PREHEADER = "The fifty places went, but you're on the waiting list.";
export const WAITING_PASS = "Waiting list";
export const WAITING_HEADING = "The fifty places went, but you're next in line.";
export const WAITING_LEAD =
  "Thanks for confirming. All fifty founding places were taken before your click came through, so " +
  "you're on the waiting list, in the order people confirmed.";
/** Decision 2(b): bold lead, then the rest. Promises only what the system does. */
export const WAITING_NOTE: [string, string] = [
  "You're on the list in the order people confirmed.",
  " If anything changes, you'll hear from me.",
];
export const WAITING_NOTHING_TO_DO =
  "You don't need to do anything else. Your address stays on the list, and you can take it off any " +
  "time with the link below.";
export const WAITING_SORRY = "I'm sorry it wasn't this time, and thank you for wanting in.";
