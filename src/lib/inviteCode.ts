/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The beta invite gate — client side (ref: design-refs/scriptally-beta-pack.html, exhibit 01).
 *
 * ⚠️ THE CHECK THAT MATTERS RUNS ON THE SERVER. Everything in this file is presentation and
 * normalisation: a client-side gate is decoration, because the code that creates the account is the
 * Firebase Auth SDK and anyone can call it from a console. `redeemInviteCode` (functions/) is the
 * gate; this only decides whether the door is drawn, and refuses to submit until the server has
 * said yes.
 *
 * ⚠️ ONE FAILURE MESSAGE FOR TWO FAILURES, DELIBERATELY. "Not one of ours" and "already used" are
 * the same sentence, because telling them apart turns the form into an oracle: feed it codes and it
 * tells you which ones are real. The wording is the ref's own, and it points at a human rather than
 * leaving the reader stuck.
 */

export const INVITE_LABEL = "Your invite code";
export const INVITE_PLACEHOLDER = "SA-XXXX-XXXX";
export const INVITE_CONTINUE = "Continue to sign up";

export const INVITE_NO_CODE_PREFIX = "No code yet? ";
export const INVITE_NO_CODE_LINK = "Join the waiting list";
export const INVITE_NO_CODE_SUFFIX = " — we're letting people in a handful at a time.";

/**
 * ⚠️ ONE MESSAGE, WHATEVER WENT WRONG. Wrong code and spent code read identically; the server
 * returns the same thing for both, and this is the client half of that decision.
 */
export const INVITE_REJECTED =
  "That code isn't one of ours, or it's already been used. Check the email we sent, or ask us to " +
  "look it up.";

export const INVITE_MISSING = "Enter the invite code from your email to carry on.";

/**
 * Normalise a typed code: upper case, spaces stripped, and every kind of dash a mail client might
 * have substituted folded back to a plain hyphen.
 *
 * ⚠️ THE EM DASH IS NOT PEDANTRY. Copying `SA-7F2K-QM19` out of a formatted email hands you an
 * en or em dash often enough to matter, and a code rejected for a character the writer cannot see
 * is the worst possible first impression of a product they were invited to.
 */
export function normaliseInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[‐-―−]/g, "-");
}

/** Is there enough here to be worth asking the server about? Bounds only — never a format guess. */
export function looksLikeInviteCode(raw: string): boolean {
  const code = normaliseInviteCode(raw);
  return code.length >= 4 && code.length <= 64;
}
