/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact-page copy. Every sentence the page shows is read from here, and `contactCopy.test.ts`
 * reads each one back word for word.
 *
 * Rebuilt to design-refs/contact-terms-unsubscribe-v1.html (non-workspace v1, Phase 6): the topics are
 * a row of choices, each with its own prompt and, for some, a note or one extra field.
 *
 * ⚠️ THE TOPIC LIST IS A CONTRACT WITH THE SERVER, NOT A LABEL SET. `sendContactMessage` keeps its
 * own copy and rejects anything outside it, so the two must match exactly; a test reads both.
 *
 * ⚠️ THE FORM SENDS THROUGH `sendContactMessage`, AND OFFERS THE MAIL APP ONLY WHEN THAT FAILS
 * (13 Nov). "Sent." is said only after the callable returned; a failure says plainly the message did
 * not send, keeps every word, and offers the writer's own mail app with the message written out.
 */

import { CopyRun } from "./CopyRuns";

export const CONTACT_DOCUMENT_TITLE = "Contact — QueryHawk";

export const CONTACT_H1 = "Get in touch.";
export const CONTACT_LEDE = "Questions, problems, ideas. A person reads every message.";

/** The left column: the address, then the founding writers' quicker route. */
export const CONTACT_MAIL_H2 = "Or email us direct";
export const CONTACT_FOUNDING_H2 = "Already a founding writer?";
export const CONTACT_FOUNDING_BODY =
  "The Feedback button inside QueryHawk is quicker: it tells us which page you're on, and your note " +
  "counts towards your rank.";

/**
 * ⚠️ FIVE TOPICS, AND THE FIRST IS THE DEFAULT BECAUSE IT IS THE COMMONEST AND THE LEAST ALARMING.
 * "Billing or account" is gone (nothing is billed); "Privacy request" is "Your data" now.
 */
export const CONTACT_TOPICS = [
  "A question or an idea",
  "Something's broken",
  "Founding writer access",
  "Your data",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** The topic that asks which page the writer was on, and the one that asks what they would like. */
export const CONTACT_PAGE_TOPIC: ContactTopic = "Something's broken";
export const CONTACT_DATA_TOPIC: ContactTopic = "Your data";

/** Each topic's prompt in the message box, and the note under the choices ("" = none). */
export const CONTACT_TOPIC_DETAIL: Record<ContactTopic, { placeholder: string; tip: string }> = {
  "A question or an idea": { placeholder: "What would you like to know, or see built?", tip: "" },
  "Something's broken": {
    placeholder: "What were you doing, what did you expect, and what happened instead?",
    /* ⚠️ "and you can add a screenshot", not the ref's "sends us the page and a screenshot for you":
       FeedbackDock records the route itself, but the screenshot is one the writer attaches. */
    tip:
      "Bug reports jump the queue. If you're signed in, the Feedback button in the app sends us the " +
      "page you're on, and you can add a screenshot.",
  },
  "Founding writer access": {
    placeholder: "Anything we should know?",
    tip:
      "We're letting founding writers in a few at a time. Tell us the email you joined the waiting " +
      "list with and we'll check where you are.",
  },
  "Your data": {
    placeholder: "Tell us what you need.",
    tip:
      "If you have an account, Settings › Your data lets you take a copy or delete your account " +
      "straight away, without waiting for us.",
  },
  "Something else": { placeholder: "How can we help?", tip: "" },
};

/** "Your data"'s one extra question, and its four answers. The first is what the select opens on. */
export const CONTACT_DATA_WANTS = [
  "See what you hold about me",
  "Correct something",
  "Send me a copy of my data",
  "Delete my account and data",
] as const;

export const CONTACT_FORM_H2 = "Send a message";
export const CONTACT_FORM_SUB = "We reply within two working days.";
export const CONTACT_FORM_SEND = "Send message";
export const CONTACT_FORM_SENDING = "Sending…";

export const CONTACT_FINE_PRINT: CopyRun[] = [
  "Your details are only used to reply. ",
  { link: "Privacy", to: "privacy" },
];

export const CONTACT_FIELD_LABELS = {
  topic: "What's it about?",
  name: "Your name",
  email: "Email",
  page: "Which page were you on?",
  want: "What would you like?",
  message: "Message",
} as const;
/** Beside the page field's label: it is the one field nobody has to fill. */
export const CONTACT_OPTIONAL = "Optional";

export const CONTACT_PLACEHOLDERS = {
  email: "you@example.com",
  page: "For example, Queries or the sign-up page",
} as const;

/**
 * What the form says once `sendContactMessage` has accepted the message — the only state that may
 * say "Sent.". The ref's "A copy is on its way to you now" is not said: no copy is sent.
 */
export const CONTACT_SENT = {
  heading: "Sent.",
  body: (email: string) => `We'll reply to ${email} within two working days.`,
} as const;
export const CONTACT_AGAIN = "Send another message";

/**
 * The failed state's words. A failure keeps everything the writer typed (`contactForm.ts`), and the
 * offer opens the writer's own mail app with the same message written out (`contactMailto`).
 */
export const CONTACT_FAILED_GENERIC = "Your message didn't send. Everything you typed is still here.";
export const CONTACT_FAILED_MAIL_LINK = "Open it in your mail app";
export const CONTACT_FAILED_MAIL_TAIL = " to send it from there, or press Send message to try again.";
export const CONTACT_FAILED_TOO_SOON =
  "That's already on its way — give it a moment before sending another.";

export const CONTACT_ART_ALT = "An older hawk at a desk, writing a letter.";
