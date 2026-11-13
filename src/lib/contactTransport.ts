/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * How a contact message leaves the browser — pure, so both paths are testable without a network
 * or a mail client.
 *
 * ⚠️ THE CALLABLE FIRST, THE MAIL APP ONLY ON A FAILURE (non-workspace v1.1, 13 Nov). `sendContact`
 * calls `sendContactMessage` and nothing else; only when that call fails, for ANY reason (not
 * deployed, offline, refused, throttled), does it hand back the `mailto:` with everything typed,
 * which the form OFFERS — it never opens the mail app by itself. "Sent." is said only for a call that
 * returned. `contactTransport.test.ts` holds both halves.
 *
 * ⚠️ THE HONEYPOT IS NEVER READ BY A HUMAN AND NEVER SHOWN TO ONE. A field a person cannot see
 * cannot be filled by a person, so a filled one is a bot — and the honest response to a bot is to
 * report success and write nothing, because telling it that it was caught teaches it to try again
 * without the field.
 */

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
  /** "Something's broken" only: the page the writer was on. Optional. */
  page?: string;
  /** "Your data" only: what the writer would like done. Empty = the first answer, which the select opens on. */
  want?: string;
  /** The honeypot's value. Absent or empty from a real person. */
  trap?: string;
}

export type ContactField = "name" | "email" | "message";

/** Shorter than this, a message is asked for "a little more" (the ref's floor). */
export const CONTACT_MIN_MESSAGE = 10;

/**
 * What is wrong with a draft, as a map of field → sentence. Empty means it can be sent.
 *
 * ⚠️ A NAME IS REQUIRED NOW (contact redesign v1, the ref's rule): the reply is addressed to a
 * person. The words are the ref's, field by field, in the order the form asks.
 */
export function validateContact(draft: ContactDraft): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  const message = draft.message.trim();

  if (!name) errors.name = "Add your name so we know who to reply to.";
  else if (name.length > CONTACT_MAX.name) errors.name = "That name is longer than we can store.";

  if (!email) errors.email = "Add your email so we can reply.";
  else if (email.length > CONTACT_MAX.email || !EMAIL_RE.test(email)) {
    errors.email = "That doesn't look like an email address.";
  }

  if (!message) errors.message = "Write your message here.";
  else if (message.length < CONTACT_MIN_MESSAGE) {
    errors.message = "Tell us a little more so we can help first time.";
  } else if (message.length > CONTACT_MAX.message) {
    errors.message = `That's longer than we can send — ${CONTACT_MAX.message} characters is the limit.`;
  }

  return errors;
}

/**
 * The topic-specific answers that travel with the message: the page for a fault, the request for
 * a data question. Only the CURRENT topic's answer is sent — a page typed under "Something's broken"
 * is kept in the draft if the writer changes topic, but it is not sent under "Your data".
 */
export function contactExtras(
  draft: ContactDraft,
  topics: { page: string; data: string; firstWant: string },
): string[] {
  if (draft.topic === topics.page && draft.page?.trim()) return [`Page: ${draft.page.trim()}`];
  if (draft.topic === topics.data) return [`Request: ${draft.want?.trim() || topics.firstWant}`];
  return [];
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
export function contactMailto(to: string, draft: ContactDraft, extras: string[] = []): string {
  const subject = `QueryHawk — ${draft.topic}`;
  const name = draft.name.trim();
  const body = [
    draft.message.trim(),
    "",
    "—",
    name ? `From: ${name} <${draft.email.trim()}>` : `From: ${draft.email.trim()}`,
    `Topic: ${draft.topic}`,
    ...extras,
  ].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * What `sendContactMessage` takes — its contract, field for field (functions/src/contactMessage.ts).
 * The topic's extra answer travels at the foot of the message, as it does in the `mailto:` body.
 */
export interface ContactPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
  /** The honeypot, under the server's own field name. */
  [CONTACT_HONEYPOT_FIELD]: string;
}

export function contactPayload(draft: ContactDraft, extras: string[] = []): ContactPayload {
  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    topic: draft.topic,
    message: [draft.message.trim(), ...extras].join("\n\n"),
    [CONTACT_HONEYPOT_FIELD]: draft.trap ?? "",
  };
}

/** The callable, injected: the page passes `httpsCallable(…, "sendContactMessage")`, a test a stub. */
export type ContactCall = (payload: ContactPayload) => Promise<unknown>;

export type ContactSendOutcome =
  | { kind: "sent" }
  /** The call failed. `mailto` carries everything typed, for the form to offer — not to open. */
  | { kind: "failed"; mailto: string };

/**
 * Send one draft: the callable first, and the `mailto:` only if it fails.
 *
 * ⚠️ ANY FAILURE IS A FAILURE. A thrown error of any kind — a missing function, a network drop, the
 * server's own refusal — comes back as `failed` with the mail app's link; nothing is retried behind
 * the writer's back and nothing is reported as sent that the server did not accept.
 */
export async function sendContact(
  to: string, draft: ContactDraft, extras: string[], call: ContactCall,
): Promise<ContactSendOutcome> {
  try {
    await call(contactPayload(draft, extras));
    return { kind: "sent" };
  } catch {
    return { kind: "failed", mailto: contactMailto(to, draft, extras) };
  }
}
