/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact-page copy — verbatim from design-refs/scriptally-contact.html.
 *
 * ⚠️ THE TOPIC LIST IS THE FORM'S CONTRACT, NOT A LABEL SET. "Privacy request" is the route a data
 * subject takes to exercise a UK GDPR right, and the privacy policy points at it by name — so the
 * four values here and section 8 of the policy have to keep agreeing. Renaming one of these
 * silently breaks a promise made in a legal document.
 */

import { CopyRun } from "./CopyRuns";

export const CONTACT_DOCUMENT_TITLE = "Contact — ScriptAlly";

export const CONTACT_EYEBROW = "Company · Contact";
export const CONTACT_H1 = "Get in touch";
export const CONTACT_LEDE =
  "Email, or use the form — either way it lands on the same desk. ScriptAlly is run by one " +
  "person, so expect a reply within two working days.";

export interface ContactWay {
  key: "questions" | "broken" | "privacy";
  heading: string;
  body: string;
}

export const CONTACT_WAYS: ContactWay[] = [
  {
    key: "questions",
    heading: "Questions & feedback",
    body:
      "Anything about the app, your account, pricing, or an idea you'd like to see built. Ideas " +
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
    heading: "Data & privacy requests",
    body:
      "To exercise any of your data rights — access, correction, deletion, or export — choose " +
      "\"Privacy request\" in the form, or email with \"Privacy\" in the subject line.",
  },
];

/**
 * ⚠️ FOUR TOPICS, AND THE ORDER IS THE REF'S. The first is the default because it is the commonest
 * and the least alarming; a form that opens on "Something's broken" invites a fault report from
 * someone who only had a question.
 */
export const CONTACT_TOPICS = [
  "Question or feedback",
  "Something's broken",
  "Privacy request",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_FORM_EYEBROW = "The form";
export const CONTACT_FORM_H2 = "Send a message";
export const CONTACT_FORM_SUB = "You can reach us any time.";
export const CONTACT_FORM_SEND = "Send message";

export const CONTACT_FINE_PRINT: CopyRun[] = [
  "By sending a message you agree to our ",
  { link: "privacy policy", to: "privacy" },
  ". We'll only use your details to reply.",
];

export const CONTACT_FIELD_LABELS = {
  name: "Name",
  email: "Email",
  topic: "Topic",
  message: "Message",
} as const;

export const CONTACT_PLACEHOLDERS = {
  name: "Your name",
  email: "you@example.com",
  message: "How can we help?",
} as const;
