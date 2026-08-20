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
