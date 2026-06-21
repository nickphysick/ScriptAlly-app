/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Self-contained auth helpers for the sign-in / sign-up screen: Google popup sign-in, a
// privacy-preserving password reset, client-side validation and a Firebase-error -> friendly-copy
// map. Kept deliberately OUT of db.tsx — its login/signup/logout (and their offline fallbacks) are
// owned by a separate work-stream, so nothing here touches those.
import { GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";

/** A pragmatic email shape check (matches the mockup) — the real gate is Firebase itself. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => EMAIL_RE.test(email.trim());

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
