/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What /founders says when a confirmation link brings someone back.
 *
 * The verify link (`GET /api/waitlist/verify`) redirects to `/founders?verified=<kind>`, and these
 * are the five kinds it can send. The copy is Nick's, exact, and UK English.
 *
 * ⚠️ STATE NOTHING THE REDIRECT DOES NOT CARRY. It carries the KIND and nothing else: no position,
 * no count, no date. A sentence like "you hold place 37" would be a number made up on the page.
 *
 * ⚠️ `already` WILL BE MOST PEOPLE'S FIRST SIGHT, NOT A RARE CASE. Mail scanners (Outlook Safe Links
 * and the like) open every link in an email before the person does, and the scanner's visit is the
 * one that confirms. So `already` must read as good news, never as an error.
 */

export const VERIFY_KINDS = ["verified", "already", "waiting", "expired", "unknown"] as const;
export type VerifyKind = (typeof VERIFY_KINDS)[number];

export interface VerifyState {
  chip: string;
  headline: string;
  body: string;
  /** Shows the founding sign-up form inline, so a dead link can be replaced on the spot. */
  form: boolean;
}

export const VERIFY_STATES: Record<VerifyKind, VerifyState> = {
  verified: {
    chip: "✓ Place confirmed",
    headline: "You're in.",
    body: "That's your founding place confirmed. When founding writers are let in, you'll get one email with one button — no codes to type. Keep the welcome email we've just sent: it's a direct line to Nick.",
    form: false,
  },
  already: {
    chip: "✓ Already confirmed",
    headline: "You're already in.",
    body: "This link has done its job once already — usually that's your email's security scanner opening it before you did. Nothing's wrong and nothing's changed: your founding place stands.",
    form: false,
  },
  waiting: {
    chip: "Waiting list",
    headline: "The last founding place went while this sat in your inbox.",
    body: "You're confirmed and on the waiting list, in the order people confirmed. If a founding place frees up, it goes to the next person in line, and we'll tell you by email.",
    form: false,
  },
  expired: {
    chip: "Link expired",
    headline: "That link's 48 hours are up.",
    body: "Your place wasn't held, but nothing's lost. Put your email in again and a fresh confirmation will be with you in a minute.",
    form: true,
  },
  unknown: {
    chip: "Link not recognised",
    headline: "We don't recognise that link.",
    body: "It may have been cut short by your email app. Put your email in again — you'll get a fresh confirmation.",
    form: true,
  },
};

/** No parameter → null (today's page). A value outside the five → `unknown`. */
export const parseVerified = (raw: string | null): VerifyKind | null =>
  raw === null ? null : (VERIFY_KINDS as readonly string[]).includes(raw) ? (raw as VerifyKind) : "unknown";
