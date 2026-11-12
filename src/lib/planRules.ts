/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — what each plan includes and costs, in ONE module. The app's plan table, the entitlement resolver and
 * the public pricing copy all read from here; none of them keeps its own list of what is Pro.
 *
 * ⚠️ THE SERVER MIRRORS THE TRIAL LENGTH in `functions/src/entitlementCore.ts` (functions/ cannot import from src/);
 *    `entitlementsAgree.test.ts` fails if the two differ.
 */

/** A new non-founding account's first days are full Pro, counted from the sign-in account's creation. */
export const TRIAL_DAYS = 14;

/** Everything Pro adds. Each one is a row in the plan table that differs between Free and Pro. */
export const PRO_FEATURES = [
  "letters",        // Query letters
  "versions",       // Manuscript versions
  "packages",       // Submission packages
  "packageResults", // Which package wins requests
  "comps",          // Comparable titles
  "scout",          // The Scout (Discover, and comp suggestions)
  "emailDrop",      // Smart email drop
] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];
