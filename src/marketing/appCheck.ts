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
 * `scriptally-dev.web.app` and `localhost` and will not work on `scriptally.ink`; prod needs its
 * own, created at promotion. A hardcoded key would be silently wrong on the day that matters.
 */

import type { AppCheck } from "firebase/app-check";

/** Set once. `null` means "tried and could not", which is different from "not tried yet". */
let instance: AppCheck | null | undefined;

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
  if (instance === undefined) instance = await init();
  if (!instance) return null;
  try {
    const { getToken } = await import("firebase/app-check");
    const result = await getToken(instance, /* forceRefresh */ false);
    return result.token || null;
  } catch {
    return null;
  }
};

/** For the locks: whether a key is configured at all in this build. */
export const appCheckConfigured = (): boolean => siteKey().length > 0;
