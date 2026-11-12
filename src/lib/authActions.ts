/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Self-contained auth helpers for the sign-in / sign-up screen: Google popup sign-in, a
// privacy-preserving password reset, client-side validation and a Firebase-error -> friendly-copy
// map. Kept deliberately OUT of db.tsx — its login/signup/logout (and their offline fallbacks) are
// owned by a separate work-stream, so nothing here touches those.
import {
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebase";

/** The email shape check lives in emailShape.ts so the public site can use it without Firebase Auth. */
export { EMAIL_RE, isValidEmail } from "./emailShape";

/** Firebase error code -> friendly, UK-spelling copy (the spec's mapping). */
export const mapAuthError = (code?: string): string => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don’t match. Try again or reset your password.";
    case "auth/invalid-email":
      return "That doesn’t look like a valid email address.";
    case "auth/email-already-in-use":
      return "There’s already an account with that email. Sign in instead?";
    case "auth/weak-password":
      return "Use at least 8 characters for your password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network problem — check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in pop-up. Allow pop-ups and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
};

/**
 * Google sign-in via popup. Resolves `{ ok: true }` on success — the onAuthStateChanged listener in
 * db.tsx then creates the Firestore user doc for first-timers from the Google displayName, so no doc
 * write happens here. A user-dismissed popup resolves `{ ok: false }` silently (no error surfaced);
 * any other failure throws a friendly Error.
 */
export const signInWithGoogle = async (): Promise<{ ok: boolean }> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
    return { ok: true };
  } catch (err: any) {
    const code = err?.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return { ok: false }; // user dismissed the popup — stay silent
    }
    throw new Error(mapAuthError(code));
  }
};

/**
 * Send a password-reset email. Privacy-preserving: a missing account (`auth/user-not-found`) is
 * swallowed so the caller can always show the neutral "if an account exists…" confirmation — we
 * never reveal whether an email is registered. Genuine failures (network, rate-limit) still throw.
 */
export const sendReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    if (err?.code === "auth/user-not-found") return; // privacy: silently succeed
    throw new Error(mapAuthError(err?.code));
  }
};

/* ══ Non-workspace v1, Phase 1 — "Email me a sign-in link instead" (getting-in-v1.html, screen 3) ══
   ⚠️ FIREBASE'S OWN EMAIL-LINK SIGN-IN FOR NOW; Phase 9 moves who sends the email to our own branded path.
   ⚠️ SAME DEVICE AND OTHER DEVICE BOTH END WELL: the address is kept on this device when the link is sent, so opening
   it here signs straight in; opening it elsewhere asks for the address once (EmailLinkScreen in Auth.tsx). */
export const SIGNIN_LINK_PATH = "/signin-link";
export const SIGNIN_EMAIL_KEY = "qh.signInEmail";

export const keptSignInEmail = (): string | null => { try { return localStorage.getItem(SIGNIN_EMAIL_KEY); } catch { return null; } };
const keepSignInEmail = (email: string | null) => {
  try { if (email) localStorage.setItem(SIGNIN_EMAIL_KEY, email); else localStorage.removeItem(SIGNIN_EMAIL_KEY); } catch { /* private window */ }
};

export const sendSignInLink = async (email: string): Promise<void> => {
  const to = email.trim();
  try {
    await sendSignInLinkToEmail(auth, to, { url: `${window.location.origin}${SIGNIN_LINK_PATH}`, handleCodeInApp: true });
    keepSignInEmail(to);
  } catch (err: any) {
    throw new Error(mapAuthError(err?.code));
  }
};

/** Is this page load the arrival from a sign-in link? */
export const arrivedFromSignInLink = (href: string = typeof window !== "undefined" ? window.location.href : ""): boolean => {
  try { return !!href && isSignInWithEmailLink(auth, href); } catch { return false; }
};

/** Finish a sign-in link. Resolves on success (the auth listener takes over); throws friendly copy otherwise. */
export const finishSignInLink = async (email: string): Promise<void> => {
  try {
    await signInWithEmailLink(auth, email.trim(), window.location.href);
    keepSignInEmail(null);
    window.history.replaceState(null, "", "/dashboard");
  } catch (err: any) {
    const code = err?.code;
    if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") throw new Error(SIGNIN_LINK_SPENT);
    if (code === "auth/invalid-email") throw new Error(SIGNIN_LINK_WRONG_EMAIL);
    throw new Error(mapAuthError(code));
  }
};
/** One confirmation email to the signed-in account's address (a founding writer who chose another address). */
export const sendConfirmation = async (): Promise<void> => {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
};

/* Words I had to write (the ref has no screen for these two). */
export const SIGNIN_LINK_SPENT = "That sign-in link has been used or has run out. Ask for a new one below.";
export const SIGNIN_LINK_WRONG_EMAIL = "That isn't the address the link was sent to. Try the one you asked us to send it to.";
