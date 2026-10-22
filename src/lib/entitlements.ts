/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan entitlements — what a plan unlocks, in one place.
 *
 * ⚠️ FOUNDING-MEMBER ACCESS (Nick, 27 Sep; packages v2 D7): every account gets full Submission
 * packages access for now. The Free block in `addPackage`, the Manuscripts page's Pro lock and Pro
 * tag on packages, and the query form's "Attach a package · Pro" lock all read `packagesUnlocked`,
 * so turning gating back on is this one constant. `UserPlan` and `isProUser` stay: gates return.
 *
 * ⚠️ THE SERVER NEVER GATED PACKAGES — firestore.rules checks only the letter on create and the
 * sent lock; functions/ has no package check. This is a client entitlement only.
 */
import { User, UserPlan } from "../types";

export const PACKAGES_OPEN_TO_ALL = true;

/** True when this user may create and attach submission packages. */
export function packagesUnlocked(user: Pick<User, "plan"> | null | undefined): boolean {
  return PACKAGES_OPEN_TO_ALL || user?.plan === UserPlan.PRO;
}

/**
 * ⚠️ VERSIONS IS PRO, AND FOUNDING MEMBERS HAVE IT IN FULL (Nick, 22 Oct; Versions v1). There is no founding
 * flag on the account: during the beta every account is a founding member (the sidebar's feedback card says so
 * to everyone), so founding access is this one constant, exactly as packages' is. When founding access ends,
 * turn it off and the gate is Pro alone.
 */
export const VERSIONS_FOUNDING_ACCESS = true;

/** True when this user may use the Versions page: Pro, or a founding member while founding access is on. */
export function versionsUnlocked(user: Pick<User, "plan"> | null | undefined, foundingAccess: boolean = VERSIONS_FOUNDING_ACCESS): boolean {
  return foundingAccess || user?.plan === UserPlan.PRO;
}
