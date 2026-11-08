/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A Firestore failure, logged and NOT thrown (timeline writer fix v1, 8 Nov 2026).
 *
 * The same PII-free record `handleFirestoreError` (firebase.ts) writes — the operation, the path
 * and the underlying message, never the auth context — for the writes whose caller must carry on.
 * `handleFirestoreError` still throws and is unchanged: most callers depend on that for control
 * flow. This lives in its own module because firebase.ts initialises Firebase on import, which a
 * unit test cannot do.
 */
export function logFirestoreFailure(error: unknown, operationType: string, path: string | null): string {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Firestore error [${operationType}]${path ? ` ${path}` : ""}: ${message}`);
  return message;
}
