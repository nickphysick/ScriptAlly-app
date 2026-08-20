/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountSecurity — what the settings page may honestly say about how you sign in.
 *
 * ⚠️ THE FIRESTORE `User` DOC KNOWS NOTHING ABOUT AUTHENTICATION. Providers and verification live
 * on `auth.currentUser`, which `db.tsx` consumes internally and never exposes — so settings reads
 * the auth SDK (in `accountAuthFacts.ts`) rather than adding fields to the user document that
 * would immediately be a second, staler copy of something Firebase already owns.
 *
 * ⚠️ THIS MODULE IS PURE AND IMPORTS NO SDK — the live read lives in `accountAuthFacts.ts`.
 * `lib/firebase` initialises an app at module load, so a single import of it here would take the
 * whole file out of the node test environment: the derivations below would become untestable
 * because of a function none of them call. Same split as `smartImportEntitlement` (pure) beside
 * `useSmartImportEntitlement` (React), and `saveSignal` beside `useSaveState`.
 */
/** What the page needs to know about the signed-in account's credentials. */
export interface AuthFacts {
  /** Provider ids as Firebase reports them ("password", "google.com", …). */
  providerIds: string[];
  emailVerified: boolean;
  email: string | null;
  /** When the account was created, as Firebase reports it. The header's "Joined" row reads this;
   *  there is no stored equivalent on the user document and inventing one would mean backfilling
   *  every existing writer with a guess. */
  createdAt: string | null;
}

/** How the password block should render. */
export type PasswordMode =
  /** A password exists — offer to change it. */
  | "password"
  /** No password on the account: a change-password form could not apply to anything. */
  | "federated-only"
  /** Both — the password block stands, and the linked provider is worth naming. */
  | "both";

/** Human names for the providers this app actually offers. */
const PROVIDER_LABEL: Record<string, string> = {
  "google.com": "Google",
  "password": "email and password",
};

/**
 * ⚠️ NO PASSWORD PROVIDER MEANS NO PASSWORD FORM AT ALL — not a disabled one, not an explanatory
 * one with a greyed button. A change-password form on a Google-only account is a control that
 * cannot apply to anything the account has; the section says how you DO sign in instead.
 */
export function passwordMode(providerIds: string[]): PasswordMode {
  const hasPassword = providerIds.includes("password");
  const federated = providerIds.filter((p) => p !== "password");
  if (hasPassword) return federated.length ? "both" : "password";
  return "federated-only";
}

/** The federated providers, in words — "Google", or "Google and Apple" if that day comes. */
export function federatedNames(providerIds: string[]): string[] {
  return providerIds
    .filter((p) => p !== "password")
    .map((p) => PROVIDER_LABEL[p] ?? p);
}

/**
 * The sentence a federated-only account reads in place of a password field.
 *
 * ⚠️ IT NAMES THE PROVIDER RATHER THAN SAYING "an external provider". The whole point of the
 * branch is that the reader should recognise their own sign-in at a glance.
 */
export function federatedLine(providerIds: string[], email: string | null): string {
  const names = federatedNames(providerIds);
  const who = names.length ? names.join(" and ") : "an external provider";
  return email ? `You sign in with ${who}, as ${email}.` : `You sign in with ${who}.`;
}

/**
 * ⚠️ THERE IS NO "LAST CHANGED" DATE, AND THIS FUNCTION EXISTS TO SAY SO IN CODE.
 *
 * Firebase's user metadata carries `creationTime` and `lastSignInTime` and nothing else; no
 * password-updated timestamp is exposed to a client, and nothing in this app records one. The
 * design brief asks for "Last changed {date}", and the only ways to produce that line are to
 * print a date that means something else — `lastSignInTime` is the tempting one — or to invent a
 * field and backfill it with a lie for every existing account.
 *
 * This repo has already paid for that shape once: an "Added {date}" on the manuscripts plate was
 * derived from earliest activity, which on an imported manuscript is a FIRST-QUERY date wearing
 * the wrong label — a plausible number stating something untrue. The line is therefore omitted
 * rather than approximated. If it is wanted, it needs a real stored `passwordUpdatedAt`, written
 * at the point the password actually changes.
 */
export const PASSWORD_LAST_CHANGED_AVAILABLE = false;

/**
 * ⚠️ SIGN-OUT-EVERYWHERE IS NOT BUILT, AND THIS IS THE NAMED STUB.
 *
 * Revoking other sessions means `revokeRefreshTokens` on the Admin SDK — a Cloud Function this
 * project does not have (its eight callables are Smart Import, email import, comps, agent assist,
 * waitlist, contact, feedback and invite codes). The client SDK cannot do it at all.
 *
 * It returns a REASON rather than throwing, and the UI states that reason. What it must never do
 * is resolve quietly: a button that appears to end every other session, and does not, leaves
 * someone believing they have locked out a device they have not.
 */
export type SessionRevokeResult = { ok: false; reason: "not-implemented" };

export async function signOutOtherSessions(): Promise<SessionRevokeResult> {
  return { ok: false, reason: "not-implemented" };
}

/**
 * What the UI says when the stub answers. Kept beside it so the two cannot drift.
 *
 * ⚠️ IT CLAIMS NOTHING ABOUT WHAT ELSE ENDS A SESSION. The obvious second sentence — that
 * changing your password signs other devices out — is probably true of Firebase and is NOT
 * verified anywhere in this repo, and a security page is the last place to state a probably.
 */
export const SESSION_REVOKE_UNAVAILABLE =
  "Signing out other sessions isn't available yet — it needs a server action this app doesn't have.";
