/**
 * emailCopy — the words in both emails, and nothing else.
 *
 * ⚠️ EDIT THE WORDS HERE AND NOWHERE ELSE, the same discipline `landingCopy.ts` and
 * `foundersCopy.ts` carry. A template that inlines its own sentences is a template whose wording
 * drifts every time somebody touches the markup — and these two are the only writing a founding
 * writer receives from us before they have an account.
 *
 * ⚠️ AND THESE CARRY THE SAME COMMITMENTS THE PUBLIC PAGES DO. Six months of Pro free, a founding
 * rate afterwards, a direct line to a person. If one stops being true the fix is the product, not
 * the sentence — and unlike a web page, an email cannot be corrected after it is sent.
 *
 * ⚠️ NO DATES ANYWHERE. "When your wave opens" is honest; "in October" is a promise made by
 * somebody who does not know. The one thing worse than an unclear timeline is a missed specific
 * one, because the second is a broken promise rather than an unanswered question.
 */

/* ══════════════ A · Confirm your place ══════════════ */

export const CONFIRM_SUBJECT = "Confirm your founding place";

export const CONFIRM_HEADING = "One click and you're on the list.";

export const CONFIRM_LEAD =
  "Thanks for putting your name down as a ScriptAlly Founding Writer. There's one thing left.";

export const CONFIRM_CTA = "Confirm my place";

export const CONFIRM_EXPIRY = "This link works for 48 hours.";

/**
 * ⚠️ THE HARDEST SENTENCE IN EITHER EMAIL, AND IT HAS TO BE HERE. With a hard cap of a hundred,
 * somebody can confirm after the last place goes — their mail sat in an inbox while the list
 * filled. That race is unavoidable with double opt-in, and the honest fix is to warn about it now
 * rather than apologise afterwards. It is deliberately not softened: a reader who is told this
 * plainly and still gets a place has lost nothing, and one who is not told has been misled.
 */
export const CONFIRM_NOT_HELD =
  "Your place isn't held until you click. There are a hundred founding places and they go in the " +
  "order people confirm — so if the last one is taken while this is sitting in your inbox, you'll " +
  "go on the waiting list instead, and we'll say so plainly.";

export const CONFIRM_NEXT =
  "Once you've confirmed, we'll email your invite when your wave opens. Six months of Pro, free, " +
  "and a founding rate afterwards.";

/** ⚠️ NO ACTION REQUIRED TO OPT OUT. Someone who did not ask for this must not have to do anything. */
export const CONFIRM_NOT_YOU =
  "If you didn't ask for this, ignore it — nothing happens without that click, and we won't write " +
  "again.";

/* ══════════════ B · You're in ══════════════ */

export const WELCOME_SUBJECT = "You're in — you're a Founding Writer";

export const WELCOME_HEADING = "That's your place confirmed.";

/** `position` and `cap` are the real, stored figures — never rounded and never estimated. */
export const welcomeLead = (position: number, cap: number): string =>
  `You're founding writer number ${position} of ${cap}.`;

/**
 * ⚠️ WAVES, AND NO DATE. Saying "in waves" is a true description of how this will work; naming a
 * month would be a commitment nobody has made. "When it's ready, you'll hear" is the whole of what
 * can honestly be said about timing today.
 */
export const WELCOME_NEXT =
  "We're opening ScriptAlly to founding writers in waves rather than all at once — it lets us fix " +
  "what the first group finds before the next arrives. When your wave opens you'll get an invite " +
  "with a link to set up your account.";

export const WELCOME_NO_DATE =
  "We can't give you a date, and we'd rather say that than guess. When it's ready, you'll hear.";

export const WELCOME_PERKS: readonly string[] = [
  "Six months' free Pro access",
  "Half price for life",
  "A direct line to the founder",
];

/* ══════════════ Shared ══════════════ */

/**
 * ⚠️ A VISIBLE ADDRESS, NOT JUST A `Reply-To` HEADER. A reader cannot see a header — and replies
 * to the from-address are currently diverted, so trusting reply alone would break the "direct line
 * to the founder" promise silently. Someone who wants a person needs something they can read.
 */
export const contactLine = (supportEmail: string): string =>
  `Questions, or something to tell us? Write to ${supportEmail} — a person reads it.`;

export const UNSUBSCRIBE_LABEL = "Unsubscribe";

/** ⚠️ SAY WHAT UNSUBSCRIBING COSTS. A place given up goes back to the list; that is worth knowing. */
export const UNSUBSCRIBE_NOTE =
  "Unsubscribing takes you off the list and frees your place for someone else.";

export const SIGN_OFF = "Nick — ScriptAlly";
