/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * requestAccountEmail — ask the server for a branded account email (non-workspace v1, 9c), and if the server cannot
 * be reached or cannot send, fall back to Firebase's own sender so nobody is locked out.
 *
 *   signin       { email }     → the server's sign-in link, else sendSignInLinkToEmail
 *   reset        { email }     → the server's new-password link, else sendPasswordResetEmail
 *   newEmail     { newEmail }  → the server's confirm-your-new-address link, else verifyBeforeUpdateEmail (signed in)
 *   emailChanged {}            → the notice to the old address; Firebase has no equivalent, so no fallback
 *
 * ⚠️ THE SERVER ANSWERS `{ ok: true }` FOR EVERY ADDRESS on the two signed-out kinds, so this never learns — and
 *    never says — whether an account exists. It falls back only when the call itself failed in a way that is the
 *    same for every address (the function unreachable, not configured, or unable to send); a refusal that means
 *    "stop" (a bad address, the hourly limit, an address already in use) is passed on, not routed round.
 * ⚠️ IT DOES NOT KEEP THE SIGN-IN ADDRESS ON THIS DEVICE. The caller (`sendSignInLink` in authActions.ts) does
 *    that, as it does today, so both paths finish the same way at `/signin-link`.
 */
/* Firebase is loaded when a fallback actually runs, so importing this module (and its test) starts no app. */
const firebaseAuth = async () => {
  const [m, { auth }] = await Promise.all([import("firebase/auth"), import("./firebase")]);
  return { ...m, auth };
};

export type AccountEmailKind = "signin" | "reset" | "newEmail" | "emailChanged";
export type AccountEmailPayload =
  | { email: string }
  | { newEmail: string }
  | Record<string, never>;

/** The callable's name (functions/src/accountEmails.ts). */
export const ACCOUNT_EMAIL_CALLABLE = "sendAccountEmail";
/** Where a sign-in link lands — the same as authActions.ts SIGNIN_LINK_PATH. */
const SIGNIN_LINK_PATH = "/signin-link";
const PROFILE_PATH = "/account/profile";

/** Which failures of the call mean "use Firebase's sender instead". Everything else is a real answer. */
export const FALLBACK_CODES: readonly string[] = [
  "functions/unavailable", "functions/internal", "functions/not-found", "functions/failed-precondition",
  "functions/deadline-exceeded", "functions/unknown", "functions/cancelled",
];

export type AccountEmailRoute = "server" | "firebase" | "none";

export interface AccountEmailDeps {
  call: (data: Record<string, unknown>) => Promise<unknown>;
  origin: () => string;
  firebase: {
    signin: (email: string, url: string) => Promise<void>;
    reset: (email: string) => Promise<void>;
    newEmail: (newEmail: string, url: string) => Promise<void>;
  };
}

const realDeps = (): AccountEmailDeps => ({
  call: async (data) => {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    return (await httpsCallable(getFunctions(undefined, "europe-west2"), ACCOUNT_EMAIL_CALLABLE)(data)).data;
  },
  origin: () => window.location.origin,
  firebase: {
    signin: async (email, url) => {
      const { sendSignInLinkToEmail, auth } = await firebaseAuth();
      await sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
    },
    reset: async (email) => {
      const { sendPasswordResetEmail, auth } = await firebaseAuth();
      try { await sendPasswordResetEmail(auth, email); }
      catch (err: any) { if (err?.code !== "auth/user-not-found") throw err; } // never say whether it exists
    },
    newEmail: async (newEmail, url) => {
      const { verifyBeforeUpdateEmail, auth } = await firebaseAuth();
      if (!auth.currentUser) throw Object.assign(new Error("Sign in first."), { code: "auth/requires-recent-login" });
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail, { url });
    },
  },
});

const codeOf = (e: unknown): string => String((e as { code?: unknown })?.code ?? "");

/**
 * Send one account email. Resolves with the route it went by; throws the original error when the refusal is a real
 * answer (or when the fallback itself fails), so the caller's existing error copy (mapAuthError) applies.
 */
export async function requestAccountEmail(
  kind: AccountEmailKind,
  payload: AccountEmailPayload = {},
  deps: AccountEmailDeps = realDeps(),
): Promise<AccountEmailRoute> {
  const origin = deps.origin();
  const p = payload as { email?: string; newEmail?: string };
  try {
    await deps.call({ kind, ...payload, origin });
    return "server";
  } catch (e) {
    if (!FALLBACK_CODES.includes(codeOf(e)) && codeOf(e).startsWith("functions/")) throw e;
    switch (kind) {
      case "signin": await deps.firebase.signin(String(p.email ?? "").trim(), `${origin}${SIGNIN_LINK_PATH}`); return "firebase";
      case "reset": await deps.firebase.reset(String(p.email ?? "").trim()); return "firebase";
      case "newEmail": await deps.firebase.newEmail(String(p.newEmail ?? "").trim(), `${origin}${PROFILE_PATH}`); return "firebase";
      case "emailChanged": return "none";
      default: { const unhandled: never = kind; throw new Error(`unknown kind ${String(unhandled)}`); }
    }
  }
}
