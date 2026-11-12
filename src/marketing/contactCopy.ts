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
 * ⚠️ THE FORM DOES NOT SEND BY ITSELF. `CONTACT_TRANSPORT` is "mailto": Send opens the writer's own
 * mail app with the message written out. Nothing here may say a message has been sent or delivered
 * on that path — the sent state's words are chosen by transport below.
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
 * What the form says once Send has done its job, by transport.
 *
 * ⚠️ ON "mailto" NOTHING HAS BEEN SENT YET: the writer's mail app has the message and the writer
 * presses send there. So that state says so, and never "Sent." — and the ref's "A copy is on its way
 * to you now" is said on neither path, because neither sends one.
 */
export const CONTACT_SENT = {
  mailto: {
    heading: "Over to your mail app.",
    body: (email: string) =>
      "Your message should be open there, ready to send. Once it's sent, we'll reply to " + email +
      " within two working days.",
    fallback: "If nothing opened, email us at ",
  },
  function: {
    heading: "Sent.",
    body: (email: string) => `We'll reply to ${email} within two working days.`,
    fallback: "",
  },
} as const;
export const CONTACT_AGAIN = "Send another message";

/** The failed state's words. A failure keeps everything the writer typed (`lib/contactForm.ts`). */
export const CONTACT_FAILED_GENERIC = "That didn't send. Please try again, or email us directly.";
export const CONTACT_FAILED_TOO_SOON =
  "That's already on its way — give it a moment before sending another.";

export const CONTACT_ART_ALT = "An older hawk at a desk, writing a letter.";
