/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact-page copy. Every sentence the page shows is read from here, and `contactCopy.test.ts`
 * reads each one back word for word.
 *
 * ⚠️ THE TOPIC LIST IS A CONTRACT WITH THE SERVER, NOT A LABEL SET. `sendContactMessage` keeps its
 * own copy and rejects anything outside it, so the two must match exactly; a test reads both.
 * "Privacy request" is also the route this page offers for exercising a UK GDPR right.
 */

import { CopyRun } from "./CopyRuns";

export const CONTACT_DOCUMENT_TITLE = "Contact — QueryHawk";

export const CONTACT_EYEBROW = "Contact";
export const CONTACT_H1 = "Get in touch.";
/* ⚠️ THE LEDE NO LONGER SAYS WHO ANSWERS. It used to say QueryHawk "is run by one person"; nothing
   on this page describes it that way now, and the page lock asserts the absence. */
export const CONTACT_LEDE =
  "Questions, problems, ideas — send them across and we'll come back to you within two working " +
  "days.";

/** The small label above the address on the email card. */
export const CONTACT_MAIL_LABEL = "Email direct";

export interface ContactWay {
  key: "questions" | "broken" | "privacy";
  heading: string;
  body: string;
}

export const CONTACT_WAYS: ContactWay[] = [
  {
    key: "questions",
    heading: "Questions and ideas",
    body:
      "Anything about the app, your account, pricing, or something you'd like to see built. Ideas " +
      "genuinely shape what gets made next.",
  },
  {
    key: "broken",
    heading: "Something's broken",
    body:
      "Tell us what you were doing, what you expected, and what happened instead. A screenshot " +
      "helps enormously. Bug reports jump the queue.",
  },
  {
    key: "privacy",
    heading: "Your data",
    body:
      "To access, correct, delete or export anything we hold, choose 'Privacy request' in the " +
      "form, or email with 'Privacy' in the subject line.",
  },
];

/**
 * ⚠️ SIX TOPICS, AND THE FIRST IS THE DEFAULT BECAUSE IT IS THE COMMONEST AND THE LEAST ALARMING. A
 * form that opens on "Something's broken" invites a fault report from someone who only had a
 * question. Two were added on 17 Sep — "Founding writer access" and "Billing or account" — and the
 * server's list gained the same two in the same change.
 */
export const CONTACT_TOPICS = [
  "Question or feedback",
  "Something's broken",
  "Founding writer access",
  "Billing or account",
  "Privacy request",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_FORM_H2 = "Send a message";
export const CONTACT_FORM_SUB = "Every field helps us reply properly first time.";
export const CONTACT_FORM_SEND = "Send message";

export const CONTACT_FINE_PRINT: CopyRun[] = [
  "By sending a message you agree to our ",
  { link: "privacy policy", to: "privacy" },
  ". Your details are only ever used to reply.",
];

export const CONTACT_FIELD_LABELS = {
  name: "Your name",
  email: "Email",
  topic: "What's it about",
  message: "Message",
} as const;

/* The name field carries no placeholder: "Your name" is its label now, and a placeholder repeating
   the label says the same thing twice in one box. */
export const CONTACT_PLACEHOLDERS = {
  email: "you@example.com",
  message: "How can we help?",
} as const;

/** The Archivist at a writing desk — the page's one illustration, described rather than hidden. */
export const CONTACT_ART_ALT = "An older hawk at a desk, writing a letter.";
