/**
 * emailCopy — the words in every email, and nothing else (three founding emails from 1 Nov; nine more from
 * non-workspace v1, 12 Nov — ref design-refs/emails-v1.html, which also moved email 1's "waiting list" to "reserve list").
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
 * ⚠️ THE WAITING-LIST PROMISE FOLLOWS WHAT THE SYSTEM DOES. Since launch readiness (2 Nov) a freed
 * founding place goes to the next confirmed writer on the waiting list automatically, in the same
 * transaction that releases it, and they are sent email 2 (waitlistStore `writeReleaseInTx`, PROMO-1).
 * So email 3 can now say so. (Until then it was decision 2(b): no promise, because nothing did it.)
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
export const UNSUBSCRIBE_NOTE_WAITING = "This takes you off the reserve list.";

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
/** Under the sign-off (privacy page v1, confirm-email-v2): the link as text, for when the button won't work. */
export const CONFIRM_LINK_HELP = "Button not working? Copy this link into your browser:";
export const CONFIRM_EXPIRY = "This link works for 48 hours.";

/**
 * ⚠️ THE HARDEST SENTENCE IN ANY OF THEM, AND IT HAS TO BE HERE. With a hard cap of fifty, somebody
 * can confirm after the last place goes. The race is unavoidable with double opt-in, and the honest
 * fix is to warn about it now rather than apologise afterwards. Bold lead, then the rest.
 */
export const CONFIRM_NOT_HELD: [string, string] = [
  "Your place isn't held until you click.",
  " There are fifty founding places and they go in the order people confirm. If the last one goes " +
  "while this sits in your inbox, you'll go on the reserve list instead, and I'll let you know.",
];
export const CONFIRM_NEXT =
  "Once you've confirmed, you'll get your founding writer pass, and your invite follows when your wave opens.";

/** ⚠️ NO ACTION REQUIRED TO OPT OUT. Someone who did not ask for this must not have to do anything. */
export const CONFIRM_NOT_YOU =
  "Didn't ask for this? Just ignore it. Nothing happens without that click, and we won't write again.";

/* ══════════════ 2 · You're in ══════════════ */

/** The writer's stored founding number — never rounded and never estimated. Unpadded. */
export const welcomeSubject = (foundingNumber: number): string =>
  `You're on the list: founding writer No. ${foundingNumber}`;
export const WELCOME_PREHEADER = "Your founding writer pass is inside.";
export const WELCOME_HEADING = "That's your place confirmed.";
export const WELCOME_LEAD =
  "Welcome aboard. You'll be one of the first fifty writers to use QueryHawk.";

/** Welcome page v1, phase 2: founding-emails-v2's wording. */
export const WELCOME_NOTE: readonly string[] = [
  "Hi, I'm Nick. I spent a year designing and building QueryHawk alongside my day job, driven by the belief " +
  "that good stories shouldn't be lost to a messy querying campaign.",
  "I truly believe these tools give your manuscript the very best chance of landing with the right agent. " +
  "Please use everything QueryHawk has to offer and let me know how you find it.",
  "Very best of luck with your campaign, and thank you for being part of the journey. We'll speak soon.",
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
  /* "All being well, we're talking weeks, not months…" is RETIRED (waitlist clarity v1, 2 Nov): no timing
     promises in the emails or on the welcome page. */
];

/* ══════════════ 3 · Reserve list ══════════════
   ⚠️ "RESERVE LIST" IN EVERY WORD A READER SEES (waitlist clarity v1, 2 Nov): "waitlist" now means everyone who
   signs up, so the overflow state cannot also be the "waiting list". The constant names stay WAITING_*. */

export const WAITING_SUBJECT = "You're on the founding writers' reserve list";
export const WAITING_PREHEADER = "The fifty places went, but you're on the reserve list.";
export const WAITING_PASS = "Reserve list";
export const WAITING_HEADING = "All fifty places have gone, but you're on the reserve list.";
export const WAITING_LEAD =
  "Thanks for confirming. All fifty founding places were taken before your click came through, so " +
  "you're on the reserve list, in the order people confirmed.";
/** Bold lead, then the rest. True since a freed place promotes the next writer (2 Nov, PROMO-1). */
export const WAITING_NOTE: [string, string] = [
  "If a founding writer gives up their place, it goes to the next person in line,",
  " and I'll email you straight away if that's you.",
];
export const WAITING_NOTHING_TO_DO =
  "You don't need to do anything else. Your address stays on the reserve list, and you can take it off any " +
  "time with the link below.";
export const WAITING_SORRY = "Sorry we couldn't fit you in this time, and thank you for signing up.";

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════
   NON-WORKSPACE v1 (12 Nov) — nine more, verbatim from design-refs/emails-v1.html.
   ⚠️ "founder's code", never "invite code". ⚠️ No "overdue", and no drafted nudge: the reminders state dates
   and stop there (QueryHawk never writes for the writer). ⚠️ No gendered pronoun for an agent anywhere.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/* ══════════════ Shared by the product's emails (sender: QueryHawk) ══════════════ */

/** The account emails' contact line: [before, address, after]. Shorter than the founding one; no "I read every one". */
export const accountContactLine = (supportEmail: string): [string, string, string] => [
  "Something not right? Just reply, or write to ", supportEmail, ".",
];
export const accountContactText = (supportEmail: string): string => accountContactLine(supportEmail).join("");
export const ACCOUNT_REASON = "You're getting this because it's about your account.";
export const EMAIL_SETTINGS_LABEL = "Email settings";

/* ══════════════ 4 · The invite (founding; sender: Nick) ══════════════ */

export const INVITE_SUBJECT = "Your QueryHawk invite: your wave is open";
export const INVITE_PREHEADER = "Set up your account. The link works for 48 hours.";
export const INVITE_HEADING = "Your wave is open.";
export const INVITE_LEAD =
  "QueryHawk is ready for you. Set up your account, bring your querying across, and tell me what you find.";
export const INVITE_CTA = "Set up my account";
export const INVITE_EXPIRY =
  "This link works for 48 hours. If it runs out, your place is still yours: ask for a fresh link on the sign-in page.";
/** Bold lead, then the rest. The code rides in the button; it is printed once, here, as the fallback. */
export const inviteCodeNote = (code: string): [string, string] => [
  `Your founder's code is ${code}.`,
  " The button fills it in for you. Keep this email in case you're ever asked to type it.",
];
export const INVITE_FIRST_HEADING = "A good first ten minutes";
export const INVITE_FIRST: readonly (readonly [string, string])[] = [
  ["Bring your list across", " with Smart Import, or start from the template"],
  ["Add your manuscript", ", so every query has something to belong to"],
  ["Log the queries you've already sent", ", and QueryHawk works out what's due and when"],
];
export const INVITE_THEN_HEADING = "Then tell me what you find";
export const INVITE_THEN =
  "There's a Feedback button on every page. Use it for anything that's wrong, missing or slow. That's the whole point of being a founding writer.";
export const UNSUBSCRIBE_NOTE_INVITE = "This gives up your founding place.";

/* ══════════════ 5 · Sign-in link ══════════════ */

export const SIGNIN_SUBJECT = "Your QueryHawk sign-in link";
export const SIGNIN_PREHEADER = "It works once, for the next hour.";
export const SIGNIN_HEADING = "Here's your sign-in link.";
export const SIGNIN_LEAD = "Use it on this device and you're straight in. No password needed.";
export const SIGNIN_CTA = "Sign in to QueryHawk";
export const SIGNIN_EXPIRY = "It works once, for the next hour.";
export const SIGNIN_NOT_YOU = "Didn't ask for this? Ignore it. Nobody can sign in without this email.";

/* ══════════════ 6 · New password ══════════════ */

export const RESET_SUBJECT = "Choose a new QueryHawk password";
export const RESET_PREHEADER = "The link works for the next hour.";
export const RESET_HEADING = "Choose a new password.";
export const RESET_LEAD =
  "Someone asked to reset the password for this QueryHawk account. If that was you, choose a new one here.";
export const RESET_CTA = "Choose a new password";
export const RESET_EXPIRY = "This link works for the next hour.";
export const RESET_NOT_YOU = "Wasn't you? Ignore this and your password stays as it is.";

/* ══════════════ 7 · Confirm a new address (to the new address) ══════════════ */

export const NEW_EMAIL_SUBJECT = "Confirm your new email address";
export const NEW_EMAIL_PREHEADER = "One click and QueryHawk uses this address from now on.";
export const NEW_EMAIL_HEADING = "Confirm this is your address.";
export const NEW_EMAIL_LEAD =
  "You asked to change your QueryHawk email address to this one. Confirm it and it becomes the address you sign in with, and where our emails go.";
export const NEW_EMAIL_CTA = "Confirm this address";
export const NEW_EMAIL_EXPIRY = "This link works for 24 hours. Until you click, nothing changes.";
export const NEW_EMAIL_NOT_YOU = "Didn't ask for this? Ignore it and nothing happens.";

/* ══════════════ 8 · The address was changed (to the old address) ══════════════ */

export const EMAIL_CHANGED_SUBJECT = "Your QueryHawk email address was changed";
export const EMAIL_CHANGED_PREHEADER = "If this was you, there is nothing to do.";
export const EMAIL_CHANGED_HEADING = "Your email address was changed.";
export const EMAIL_CHANGED_LEAD = "Your QueryHawk account now uses a different email address.";
export const EMAIL_CHANGED_FROM = "Changed from";
export const EMAIL_CHANGED_TO = "Changed to";
export const EMAIL_CHANGED_WHEN = "When";
export const EMAIL_CHANGED_FINE = "If that was you, there's nothing to do.";
export const EMAIL_CHANGED_NOT_YOU: [string, string] = [
  "Wasn't you?",
  " Reply to this email straight away and I'll put it back and lock the account while we sort it out.",
];

/* ══════════════ 9 · A nudge is due ══════════════
   ⚠️ One email however many fall due that morning. The ref draws one; the several-at-once words are ours. */

export const nudgeSubject = (agentNames: readonly string[]): string =>
  agentNames.length === 1 ? `A nudge is due: ${agentNames[0]}` : `Nudges are due: ${namesList(agentNames)}`;
export const nudgePreheader = (replyExpectedBy: readonly string[]): string =>
  replyExpectedBy.length === 1
    ? `A reply was expected by ${replyExpectedBy[0]}.`
    : `${capitalise(numberWord(replyExpectedBy.length))} replies were expected by now. The dates are inside.`;
export const nudgeHeading = (agentNames: readonly string[]): string =>
  agentNames.length === 1 ? `A nudge to ${agentNames[0]} is due.` : `Nudges to ${namesList(agentNames)} are due.`;
export const NUDGE_AGENT = "Agent";
export const NUDGE_MANUSCRIPT = "Manuscript";
export const NUDGE_SENT = "Query sent";
export const NUDGE_EXPECTED = "Reply expected by";
export const NUDGE_SINCE = "Since then";
export const NUDGE_NO_REPLY = "No reply logged";
/** `after` is the writer's own setting, as a phrase ("one week"). */
export const nudgeSetting = (after: string): string =>
  `You've set QueryHawk to suggest a nudge ${after} after the reply date. That's today.`;
export const NUDGE_CTA = "Open this query";
export const NUDGE_HEARD = "Already heard back? Log the reply and this reminder goes away.";
export const NUDGE_TURN_OFF = "Turn off nudge reminders";
export const NUDGE_CHANGE_WHEN = "Change when a nudge is suggested";

/* ══════════════ 10 · The weekly summary ══════════════
   ⚠️ Plain counts with no judgement attached. The ref draws one week (two replies, one a request); the other
   shapes of a week (no replies, every reply a request, one thing coming up) are ours, in the same grammar. */

export const weeklySubject = (replies: number, requests: number): string =>
  `Your week in querying: ${repliesPhrase(replies, requests, false)}`;
export const weeklyHeading = (replies: number, requests: number): string =>
  `Last week: ${repliesPhrase(replies, requests, true)}.`;
export const weeklyPreheader = (upcoming: number): string =>
  upcoming === 0 ? "And nothing due this week." :
    `And ${numberWord(upcoming)} ${upcoming === 1 ? "thing" : "things"} coming up this week.`;
export const WEEKLY_HAPPENED = "What happened";
export const WEEKLY_COMING = "Coming up this week";
export const WEEKLY_OUT = "Queries out";
export const WEEKLY_REQUESTS = "Requests so far";
export const weeklyRequestsValue = (requests: number, sent: number): string =>
  `${requests}, from ${sent} ${sent === 1 ? "query" : "queries"} sent`;
export const WEEKLY_QUIET = "Gone quiet";
export const WEEKLY_CTA = "Open your dashboard";
export const WEEKLY_TURN_OFF = "Turn off the weekly summary";

/** A line in "What happened": [bold lead, rest]. */
export const happenedRequest = (stage: "partial" | "full", agent: string): [string, string] =>
  [stage === "full" ? "Full requested" : "Partial requested", ` by ${agent}`];
export const happenedNo = (agent: string): [string, string] => ["A no", ` from ${agent}`];
export const happenedOffer = (agent: string): [string, string] => ["An offer", ` from ${agent}`];
export const happenedSent = (agents: readonly string[]): [string, string] =>
  [`${capitalise(numberWord(agents.length))} ${agents.length === 1 ? "query" : "queries"} sent`, `, to ${namesList(agents)}`];
/** A line in "Coming up this week": [bold lead, rest]. Dates arrive as phrases ("Friday 13 November"). */
export const comingSend = (stage: "partial" | "full", agent: string, by: string): [string, string] =>
  [stage === "full" ? "Send the full" : "Send the partial", ` to ${agent} by ${by}`];
export const comingNudge = (agent: string, on: string): [string, string] => ["A nudge is due", ` to ${agent} on ${on}`];
export const comingReplies = (agents: readonly string[]): [string, string] =>
  [`${capitalise(numberWord(agents.length))} ${agents.length === 1 ? "reply" : "replies"} expected`, `, from ${namesList(agents)}`];

/* ══════════════ 11 · The trial is ending (for launch) ══════════════ */

export const TRIAL_DAYS = 14;
export const trialSubject = (endsWeekday: string): string => `Your ${TRIAL_DAYS} days of Pro end on ${endsWeekday}`;
export const TRIAL_PREHEADER = "Nothing is deleted. Here is what changes.";
export const trialHeading = (endsWeekday: string): string => `Your ${TRIAL_DAYS} days of Pro end on ${endsWeekday}.`;
export const trialLead = (freeFrom: string): string => `From ${freeFrom} you're on Free. Nothing you've made is deleted.`;
export const TRIAL_KEEPS_HEADING = "What carries on";
export const TRIAL_KEEPS: readonly string[] = [
  "One manuscript, with unlimited agents and queries",
  "Response tracking, your to-do list and reminders",
  "Everything you've already imported",
];
export const TRIAL_READ_ONLY_HEADING = "What you can read but not change";
export const TRIAL_READ_ONLY: readonly string[] = [
  "Your query letters, manuscript versions and submission packages",
  "Your comparable titles",
];
export const trialPro = (fromPrice: string): string => `Pro keeps all of that working, from ${fromPrice} a month.`;
export const TRIAL_CTA = "See the plans";
export const TRIAL_HAPPY = "Happy on Free? Do nothing. We won't charge you, because we don't have your card.";

/* ══════════════ 12 · The plan is ending (for launch) ══════════════ */

/** `plan` is the plan's length as an adjective ("6-month"); `ends` the short date ("19 May"). */
export const planEndingSubject = (plan: string, ends: string): string => `Your ${plan} plan ends on ${ends}`;
export const planEndingPreheader = (monthly: string): string => `It carries on monthly at ${monthly} unless you cancel.`;
export const planEndingHeading = (plan: string, ends: string): string => `Your ${plan} plan ends on ${ends}.`;
export const planEndingLead = (monthly: string): string =>
  `After that, Pro carries on month by month at ${monthly} until you cancel.`;
export const PLAN_LABEL = "Plan";
export const planValue = (duration: string): string => `Pro, ${duration}`;
export const PLAN_ENDS = "Ends";
export const PLAN_THEN = "Then";
export const planThenValue = (monthly: string, chargeDay: string): string => `${monthly} a month, taken on the ${chargeDay}`;
export const PLAN_STOP = "To stop it";
export const planStopValue = (ends: string): string => `Cancel any time before ${ends}`;
export const PLAN_CTA = "Manage my plan";
export const PLAN_FINISHED = "Finished querying? Cancel and you keep everything on Free.";

/* ══════════════ Small grammar ══════════════ */

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** "two" up to ten, then digits — the ref's "two replies", "Three queries sent". */
export const numberWord = (n: number): string => (Number.isInteger(n) && n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n));
const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** "A", "A and B", "A, B and C". */
export const namesList = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** "two replies, one a request" (subject) / "two replies, one of them a request" (heading). */
const repliesPhrase = (replies: number, requests: number, ofThem: boolean): string => {
  if (replies <= 0) return "no replies";
  const head = `${numberWord(replies)} ${replies === 1 ? "reply" : "replies"}`;
  if (requests <= 0) return head;
  if (replies === 1) return `${head}, a request`;
  if (requests >= replies) return `${head}, ${replies === 2 ? "both" : "all"} requests`;
  const k = numberWord(requests);
  const what = requests === 1 ? "a request" : "requests";
  return ofThem ? `${head}, ${k} of them ${what}` : `${head}, ${k} ${what}`;
};
