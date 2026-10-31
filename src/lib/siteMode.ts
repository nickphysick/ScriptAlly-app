/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Site mode — whether this build is the whole app or the public landing only.
 *
 * ONE FLAG, READ ONCE, HERE. `VITE_LANDING_ONLY=true` is set in `.env.production` and nowhere else,
 * so a production build (queryhawk.net) is landing-only, while a dev build (dev.queryhawk.net)
 * is the whole app as before.
 *
 * Landing-only means the public pages and the founding waitlist are open, and sign-in, account
 * creation, onboarding and every workspace page are never rendered.
 *
 * ⚠️ THIS IS NOT THE LOCK, ONLY THE DOOR'S PAINT. Hiding the sign-in screen does not stop anyone
 * calling Firebase Auth's sign-up API directly with the public web key. The real closure is the live
 * project's Authentication → Settings → User actions → "Enable create (sign-up)" switched off
 * (runbook). Firestore rules protect data either way.
 */
export const LANDING_ONLY: boolean = import.meta.env.VITE_LANDING_ONLY === "true";

/** The hashes that open the sign-in screen when the whole app is live. */
export const AUTH_HASH = /^#\/(login|signin|signup)$/;
