/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one live read of the auth SDK that settings needs.
 *
 * ⚠️ IT IS ITS OWN FILE SO `accountSecurity` CAN STAY PURE. `lib/firebase` initialises a Firebase
 * app at module load; importing it beside the derivations would take them all out of the node
 * test environment because of a single function none of them call. The derivations take a plain
 * `AuthFacts` descriptor precisely so they never need this.
 *
 * ⚠️ AND `db.tsx` DOES NOT EXPOSE THIS. It consumes `onAuthStateChanged` internally and publishes
 * only the Firestore `User` document, which knows nothing about providers or verification. Adding
 * them to that document would be a second, staler copy of something Firebase already owns.
 */
import { auth } from "./firebase";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import type { AuthFacts } from "./accountSecurity";

/** A snapshot of how the signed-in account authenticates. Null when nothing is signed in. */
export function readAuthFacts(): AuthFacts | null {
  const u = auth.currentUser;
  if (!u) return null;
  return {
    providerIds: u.providerData.map((p) => p.providerId),
    emailVerified: u.emailVerified,
    email: u.email,
    createdAt: u.metadata.creationTime ?? null,
  };
}

/**
 * Add a password to an account that signs in through a provider only.
 *
 * ⚠️ IT LIVES HERE, BESIDE `readAuthFacts`, FOR THE REASON THAT FILE EXISTS: `accountSecurity` is
 * PURE and importing `lib/firebase` beside its derivations would initialise a Firebase app at
 * module load and take every one of them out of the node test environment. This is the second
 * thing settings needs from the auth SDK, so it goes where the first one is rather than starting a
 * third file.
 *
 * ⚠️ IT LINKS, IT DOES NOT CREATE. `linkWithCredential` attaches a password to the SAME account —
 * same uid, same Firestore document, same everything. Creating an email/password user with the
 * same address would make a SECOND account holding none of the writer's work, which is the failure
 * mode worth being explicit about: the two calls are one word apart and only one of them is safe.
 *
 * ⚠️ THE EMAIL IS TAKEN FROM THE SIGNED-IN USER, NEVER FROM A FIELD. A password credential is
 * (address, password), and letting the address be typed would let someone link a password to an
 * address that is not theirs — or, more likely, mistype their own and set a password for an account
 * that cannot be signed into.
 */
/**
 * ⚠️ ONE STRING FIELD, NOT `{ ok: boolean }` PLUS A REASON. This project's tsconfig has
 * `strictNullChecks` OFF, and without it the literal types `true` and `false` WIDEN to `boolean` —
 * so `{ ok: true } | { ok: false; reason: … }` is not a discriminated union here and
 * `if (res.ok) return;` narrows nothing. The caller then cannot read `res.reason` at all, which is
 * how this shape was caught: a compile error on correct-looking code.
 *
 * String literals discriminate regardless of that flag, and the reason IS the outcome — "ok" is
 * one of the five things that can happen, not a separate axis. Fewer states, and they narrow.
 */
export type AddPasswordResult =
  /** Linked. The account keeps its uid, its document and its work. */
  | { outcome: "ok" }
  /** Firebase wants a fresh sign-in before it will change credentials. */
  | { outcome: "recent-login" }
  /** The account already has one — the UI should not have offered this. */
  | { outcome: "already-set" }
  /** Firebase refused the password itself. */
  | { outcome: "weak" }
  | { outcome: "no-user" }
  | { outcome: "failed" };

export async function addPassword(password: string): Promise<AddPasswordResult> {
  const u = auth.currentUser;
  if (!u || !u.email) return { outcome: "no-user" };
  try {
    await linkWithCredential(u, EmailAuthProvider.credential(u.email, password));
    return { outcome: "ok" };
  } catch (e) {
    /* ⚠️ THE CODES ARE DISTINGUISHED BECAUSE THEIR ANSWERS ARE DIFFERENT, and collapsing them into
       "something went wrong" is what makes a security page useless at the moment it matters.
       `requires-recent-login` is fixed by signing in again — a thing the reader can DO;
       `provider-already-linked` means the page offered a control it should not have. */
    const code = (e as { code?: string })?.code ?? "";
    if (code === "auth/requires-recent-login") return { outcome: "recent-login" };
    if (code === "auth/provider-already-linked" || code === "auth/credential-already-in-use") {
      return { outcome: "already-set" };
    }
    if (code === "auth/weak-password") return { outcome: "weak" };
    return { outcome: "failed" };
  }
}
