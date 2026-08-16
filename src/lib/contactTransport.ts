/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * How a contact message leaves the browser — pure, so both shapes are testable without a network
 * or a mail client.
 *
 * ⚠️ TWO TRANSPORTS, ONE CONSTANT, AND `mailto` IS THE DEFAULT ON PURPOSE. The function transport
 * needs a deploy Nick has not run, and a form whose Send button silently fails is worse than one
 * that opens the mail client: the writer at least still has their words. Flipping
 * `CONTACT_TRANSPORT` to "function" after `sendContactMessage` is deployed is the whole switch.
 *
 * ⚠️ THE HONEYPOT IS NEVER READ BY A HUMAN AND NEVER SHOWN TO ONE. A field a person cannot see
 * cannot be filled by a person, so a filled one is a bot — and the honest response to a bot is to
 * report success and write nothing, because telling it that it was caught teaches it to try again
 * without the field.
 */

/** The transport this build uses. See the docblock before changing it. */
export const CONTACT_TRANSPORT: "mailto" | "function" = "mailto";

/** The hidden field's name. Shared by the form and the function so the two cannot drift. */
export const CONTACT_HONEYPOT_FIELD = "website";

/** Nothing may be sent more often than this from one browser. */
export const CONTACT_MIN_INTERVAL_MS = 30_000;

/** Where the last successful send is remembered, so a reload does not reset the limit. */
export const CONTACT_LAST_SENT_KEY = "sa.contactLastSent";

export const CONTACT_MAX = { name: 120, email: 254, message: 4000 } as const;

/** Pragmatic single-line check — a gate, not a deliverability guarantee. Mirrors `waitlist`. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactDraft {
  name: string;
  email: string;
  topic: string;
  message: string;
  /** The honeypot's value. Absent or empty from a real person. */
  trap?: string;
}

export type ContactField = "name" | "email" | "message";

/**
 * What is wrong with a draft, as a map of field → sentence. Empty means it can be sent.
 *
 * ⚠️ THE MESSAGE IS THE ONLY TRULY REQUIRED FIELD BESIDES A REPLY ADDRESS. Requiring a name would
 * turn a privacy request — the one message a person may have every reason to keep minimal — into
 * a negotiation.
 */
export function validateContact(draft: ContactDraft): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  const email = draft.email.trim();
  const message = draft.message.trim();

  if (!email) errors.email = "We need an address to reply to.";
  else if (email.length > CONTACT_MAX.email || !EMAIL_RE.test(email)) {
    errors.email = "That doesn't look like an email address.";
  }

  if (!message) errors.message = "Tell us what you'd like to say.";
  else if (message.length > CONTACT_MAX.message) {
    errors.message = `That's longer than we can send — ${CONTACT_MAX.message} characters is the limit.`;
  }

  if (draft.name.trim().length > CONTACT_MAX.name) {
    errors.name = "That name is longer than we can store.";
  }

  return errors;
}

/** True when this browser sent something too recently. `now` and `last` are injected, never read. */
export function isRateLimited(last: number | null, now: number): boolean {
  return last !== null && Number.isFinite(last) && now - last < CONTACT_MIN_INTERVAL_MS;
}

/** A bot filled the hidden field. */
export function looksAutomated(draft: ContactDraft): boolean {
  return !!draft.trap && draft.trap.trim().length > 0;
}

/**
 * The `mailto:` a draft composes.
 *
 * ⚠️ THE BODY IS ENCODED WHOLE. An unencoded `&` truncates a `mailto:` at that character in every
 * mail client, so the recipient gets a message ending mid-word — the exact fault `todoHandoff`
 * already carries a regression test for.
 */
export function contactMailto(to: string, draft: ContactDraft): string {
  const subject = `ScriptAlly — ${draft.topic}`;
  const name = draft.name.trim();
  const body = [
    draft.message.trim(),
    "",
    "—",
    name ? `From: ${name} <${draft.email.trim()}>` : `From: ${draft.email.trim()}`,
    `Topic: ${draft.topic}`,
  ].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
