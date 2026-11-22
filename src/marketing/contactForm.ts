/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The contact form's state, as one pure reducer — so what each step keeps, clears and focuses is
 * testable without a DOM (this repo's tests render to a string in node).
 *
 * The behaviour is design-refs/contact-terms-unsubscribe-v1.html's:
 *   topic    every field is kept, the extra fields included, and focus stays on the chosen topic;
 *   invalid  each field says what it needs, and focus goes to the first one that needs it;
 *   sent     the form gives way to the sent panel, and focus goes to "Send another message";
 *   again    the name and email stay, the rest is cleared, and focus goes to the message.
 *
 * ⚠️ A FAILED SEND KEEPS EVERYTHING THE WRITER TYPED. Clearing the form on an error would lose the
 * one thing they cannot get back. `contactForm.test.ts` holds this, and the failed state takes focus
 * to its own notice so it is read out. A failed SEND also offers the mail app, its link built from the
 * same draft (13 Nov); typing afterwards clears nothing.
 */

import { ContactDraft, ContactField } from "../lib/contactTransport";
import { CONTACT_TOPICS, ContactTopic } from "./contactCopy";

export type ContactStatus = "idle" | "sending" | "sent" | "failed";

export interface ContactFormState {
  draft: ContactDraft;
  errors: Partial<Record<ContactField, string>>;
  status: ContactStatus;
  /** The failed state's sentence. */
  notice: string;
  /** A failed send offers the writer's mail app beside the notice. The link is built from the draft
   *  as it stands at render, so a word changed after the failure travels too. */
  offerMail: boolean;
  /** The address the sent panel names. */
  sentTo: string;
  /** The id the page moves focus to after this step, or null to leave it where it is. */
  focus: string | null;
}

export type ContactAction =
  | { type: "edit"; field: keyof ContactDraft; value: string }
  | { type: "topic"; topic: ContactTopic }
  | { type: "invalid"; errors: Partial<Record<ContactField, string>> }
  | { type: "sending" }
  | { type: "failed"; notice: string; offerMail?: boolean }
  | { type: "sent" }
  | { type: "again" };

export const CONTACT_EMPTY: ContactDraft = {
  name: "", email: "", topic: CONTACT_TOPICS[0], message: "", page: "", want: "", trap: "",
};

export const contactInitial = (): ContactFormState => ({
  draft: { ...CONTACT_EMPTY }, errors: {}, status: "idle", notice: "", offerMail: false, sentTo: "", focus: null,
});

/** The ids the reducer hands focus to. The page renders each exactly once. */
export const CONTACT_IDS = {
  name: "cf-name", email: "cf-email", message: "cf-msg", page: "cf-page", want: "cf-want",
  notice: "cf-notice", mail: "cf-mail", again: "cf-again",
  topic: (t: ContactTopic) => `cf-topic-${CONTACT_TOPICS.indexOf(t)}`,
} as const;

const FIELD_ORDER: ContactField[] = ["name", "email", "message"];

export function contactReducer(s: ContactFormState, a: ContactAction): ContactFormState {
  switch (a.type) {
    case "edit": {
      /* Typing in a field that was marked clears its mark (the ref's input handler). */
      const errors = { ...s.errors };
      if (a.field in errors) delete errors[a.field as ContactField];
      return { ...s, draft: { ...s.draft, [a.field]: a.value }, errors, focus: null };
    }
    case "topic":
      return { ...s, draft: { ...s.draft, topic: a.topic }, errors: {}, focus: CONTACT_IDS.topic(a.topic) };
    case "invalid": {
      const first = FIELD_ORDER.find((f) => a.errors[f]);
      return { ...s, errors: a.errors, status: "idle", focus: first ? CONTACT_IDS[first] : null };
    }
    case "sending":
      return { ...s, errors: {}, status: "sending", notice: "", offerMail: false, focus: null };
    case "failed":
      return { ...s, status: "failed", notice: a.notice, offerMail: !!a.offerMail, focus: CONTACT_IDS.notice };
    case "sent":
      return { ...s, errors: {}, status: "sent", notice: "", offerMail: false, sentTo: s.draft.email.trim(), focus: CONTACT_IDS.again };
    case "again":
      return {
        ...contactInitial(),
        draft: { ...CONTACT_EMPTY, name: s.draft.name, email: s.draft.email, topic: s.draft.topic },
        focus: CONTACT_IDS.message,
      };
    default: {
      const unhandled: never = a;
      return unhandled;
    }
  }
}
