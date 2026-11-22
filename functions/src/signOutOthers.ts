/**
 * signOutOtherDevices — callable (europe-west2), non-workspace v1 Phase 5 (Settings › You › Other devices).
 *
 * ⚠️ FIREBASE CANNOT REVOKE ONE SESSION AND SPARE ANOTHER: `revokeRefreshTokens` ends them all. So this revokes every
 *    refresh token, then mints a custom token for the caller, and the client signs back in with it at once — a fresh
 *    session issued AFTER the revocation, which `verifyIdToken(…, true)` accepts while every older one is refused.
 * ⚠️ AN ID TOKEN ALREADY HELD ELSEWHERE STAYS VALID UNTIL IT EXPIRES (at most an hour) for clients that do not check
 *    revocation; the client SDK's refresh fails at once, which signs that device out. Firestore rules do not check
 *    revocation. Stated in the run report.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

export interface RevokeDeps {
  revokeRefreshTokens: (uid: string) => Promise<void>;
  createCustomToken: (uid: string) => Promise<string>;
}

export async function signOutOthersCore(uid: string | undefined, deps: RevokeDeps): Promise<{ token: string }> {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");
  await deps.revokeRefreshTokens(uid);
  return { token: await deps.createCustomToken(uid) };
}

export const signOutOtherDevices = onCall({ region: "europe-west2", timeoutSeconds: 30, memory: "256MiB" }, async (request) => {
  try {
    const auth = getAuth();
    return await signOutOthersCore(request.auth?.uid, {
      revokeRefreshTokens: (uid) => auth.revokeRefreshTokens(uid),
      createCustomToken: (uid) => auth.createCustomToken(uid),
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error("signOutOtherDevices failed:", e);
    throw new HttpsError("internal", "Something went wrong. Please try again.");
  }
});
