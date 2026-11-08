/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App Check for the public forms — MONITOR MODE, and nothing depends on it.
 *
 * ⚠️ IT IS INITIALISED LAZILY, ON THE FIRST TOKEN REQUEST, AND THAT IS THE WHOLE SAFETY ARGUMENT.
 * Initialising at module load would arm reCAPTCHA Enterprise for every visitor to every page,
 * including the signed-in app, on the strength of a key that has never been exercised in
 * production. Lazily, the blast radius is one form: someone who never types an address never
 * touches it.
 *
 * ⚠️ AND EVERY FAILURE PATH RETURNS `null`. No key, a key bound to the wrong domain, a blocked
 * reCAPTCHA script, an offline reader — all of them mean "no token", the request goes without the
 * header, and the server logs it as unverified. NOTHING is rejected on this basis. A misconfigured
 * App Check that refused real users would look exactly like an outage, which is why enforcement is
 * a separate decision taken after several days of clean monitoring.
 *
 * ⚠️ THE SITE KEY IS PUBLIC BY DESIGN and ships in the bundle — that is what a reCAPTCHA site key
 * is. It is nonetheless an ENV value rather than a literal, because the dev key is bound to
 * `scriptally-dev.web.app` and `localhost` and will not work on `queryhawk.net`; prod needs its
 * own, created at promotion. A hardcoded key would be silently wrong on the day that matters.
 */

import type { AppCheck } from "firebase/app-check";

/**
 * Set once, and MEMOISED AS A PROMISE: two callers arriving together (the waitlist form and an AI
 * callable, or two AI calls) share one init. A second `initializeAppCheck` on the same app throws,
 * and would otherwise have set the shared instance to `null` for everyone.
 * Resolves to `null` for "tried and could not", which is different from "not tried yet".
 */
let instance: Promise<AppCheck | null> | undefined;

/**
 * ⚠️ THE DEBUG PROVIDER IS FOR A LOCALHOST DEV SERVER ONLY, AND A PRODUCTION BUILD CANNOT CONTAIN IT.
 * `import.meta.env.MODE` is replaced at build time, so in `vite build` (production) the whole
 * condition is the constant `false` and the assignment is removed. On localhost the SDK then prints a
 * debug token to the console, which must be registered in the dev project's App Check console.
 */
const debugAllowed = (): boolean =>
  import.meta.env.MODE !== "production" &&
  typeof location !== "undefined" &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1");

const siteKey = (): string => {
  const k = import.meta.env.VITE_APP_CHECK_SITE_KEY;
  return typeof k === "string" ? k.trim() : "";
};

/**
 * ⚠️ DYNAMICALLY IMPORTED so the App Check SDK and the reCAPTCHA script are not in the initial
 * bundle of a page nobody has interacted with. The marketing tier is the shop window; it should
 * not pay for a defence against bots before a bot has done anything.
 */
const init = async (): Promise<AppCheck | null> => {
  const key = siteKey();
  if (!key) return null;
  try {
    const [{ initializeAppCheck, ReCaptchaEnterpriseProvider }, { app }] = await Promise.all([
      import("firebase/app-check"),
      import("../lib/firebase"),
    ]);
    if (debugAllowed()) {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    return initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(key),
      /* The SDK refreshes the token behind the scenes; nothing here has to schedule it. */
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    /* A key bound to another domain throws here. Monitor mode means that is a log line, not an
       error a reader ever sees. */
    return null;
  }
};

/**
 * A token for the next request, or `null`.
 *
 * ⚠️ NEVER THROWS AND NEVER BLOCKS THE FORM. The caller attaches the header if there is one and
 * sends regardless — a signup must not depend on a bot defence that is being trialled.
 */
export const appCheckToken = async (): Promise<string | null> => {
  const ac = await ensureAppCheck();
  if (!ac) return null;
  try {
    const { getToken } = await import("firebase/app-check");
    const result = await getToken(ac, /* forceRefresh */ false);
    return result.token || null;
  } catch {
    return null;
  }
};

/**
 * Initialise App Check (once, shared) and return it, or `null`.
 *
 * ⚠️ THE SIGNED-IN APP'S AI CALLABLES CALL THIS BEFORE THEIR FIRST REQUEST (src/lib/aiCallable.ts),
 * because those functions ENFORCE App Check (`enforceAppCheck: true`). Once App Check is initialised
 * on the default app, the Functions SDK attaches the `X-Firebase-AppCheck` header by itself. It is
 * still lazy — someone who never uses an AI feature never loads reCAPTCHA — and it is the same
 * provider and the same site key as the waitlist form, never a second set-up. Never throws.
 */
export const ensureAppCheck = (): Promise<AppCheck | null> => {
  if (instance === undefined) instance = init();
  return instance;
};

/** For the locks: whether a key is configured at all in this build. */
export const appCheckConfigured = (): boolean => siteKey().length > 0;
