/**
 * The server-side entitlement resolver (plan rules v1): reads the three facts and hands them to `entitlementCore`.
 *
 * ⚠️ THE FOUNDING FLAG LIVES ON `users/{uid}/private/entitlement` — the owner may read it, nobody may write it from the
 *    app (`firestore.rules`: `allow write: if false`); only the admin SDK sets it (foundingStats' backstop, the admin
 *    script, the dev backfill). Absent reads as not founding.
 * ⚠️ THE CREATION TIME IS THE SIGN-IN ACCOUNT'S, from the Admin SDK — it exists for every account and cannot be edited
 *    from the app. A lookup that fails grants no trial (createdMs null), never a guessed one.
 */
import { getAuth } from "firebase-admin/auth";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { entitlementBasis, PRO_PLAN, type EntitlementBasis } from "./entitlementCore";

export { entitlementBasis, hasPro, type EntitlementBasis } from "./entitlementCore";

/** The sign-in account's creation time in ms, or null if it cannot be read. */
export async function accountCreatedMs(uid: string): Promise<number | null> {
  try {
    const t = Date.parse((await getAuth().getUser(uid)).metadata.creationTime);
    return Number.isNaN(t) ? null : t;
  } catch (e) {
    console.error("entitlement: could not read the account's creation time:", e);
    return null;
  }
}

/** Resolve an account from its user doc and its private entitlement doc (either may be absent). */
export async function resolveBasis(
  uid: string,
  userSnap: DocumentSnapshot | null,
  entSnap: DocumentSnapshot | null,
  nowMs: number = Date.now(),
): Promise<EntitlementBasis> {
  const founding = entSnap?.exists ? entSnap.get("founding") === true : false;
  const plan = userSnap?.exists ? (userSnap.get("plan") as string | undefined) : undefined;
  /* The Admin lookup is skipped when the answer cannot depend on it (founding or Pro). */
  const createdMs = founding || plan === PRO_PLAN ? null : await accountCreatedMs(uid);
  return entitlementBasis({ founding, plan, createdMs, nowMs });
}
