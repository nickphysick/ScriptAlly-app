/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sentry, errors only (crash reporting v1, Phase 2). Initialised once, from main.tsx, before the
 * app renders — and only when this build carries a DSN and is not running locally.
 *
 * ⚠️ BAKED, NOT TUNED: no Session Replay, no tracing, no profiling, no feedback widget, no session
 * pings. The integrations are LISTED rather than taken from Sentry's defaults, so a default added
 * in a later Sentry release does not switch on here by itself. `dataCollection` (Sentry 11's
 * replacement for `sendDefaultPii: false`) turns every collected category off.
 *
 * ⚠️ WHAT LEAVES THE BROWSER IS DECIDED IN lib/sentryScrub.ts, which is pure and unit-tested:
 * no query strings or hashes, no headers or cookies, no `extra`, no event that mentions an email
 * address, navigation breadcrumbs only, and the user as `{ id }` — the Firebase uid — and nothing
 * else (`identifyForErrors`).
 */
import * as Sentry from "@sentry/react";
import { scrubBreadcrumb, scrubEvent, IGNORE_MESSAGES, type ScrubBreadcrumb, type ScrubEvent } from "./sentryScrub";

declare const __QH_RELEASE__: string | undefined;

export interface SentryEnv {
  dsn?: string;
  environment?: string;
  mode?: string;
  hostname?: string;
}

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|::1|0\.0\.0\.0)$|\.localhost$|\.test$/i;

/** Whether this build, on this host, reports at all. Off without a DSN, on a local host, in the emulator and in tests. */
export function sentryEnabled(env: SentryEnv): boolean {
  if (!env.dsn || !env.dsn.trim()) return false;
  if (env.mode === "test" || env.mode === "emulator") return false;
  if (!env.hostname || LOCAL_HOSTS.test(env.hostname)) return false;
  return true;
}

let started = false;

/** Start Sentry if this build and host report. Safe to call more than once; only the first counts. */
export function initSentry(env: SentryEnv = {
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  mode: import.meta.env.MODE,
  hostname: typeof window !== "undefined" ? window.location.hostname : undefined,
}): boolean {
  if (started || !sentryEnabled(env)) return false;
  started = true;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  Sentry.init({
    dsn: env.dsn,
    environment: env.environment || "unknown",
    release: typeof __QH_RELEASE__ === "string" ? __QH_RELEASE__ : undefined,
    /* ⚠️ SENTRY 11 HAS NO `sendDefaultPii`; this block is its replacement, everything off. Our own
       scrub (beforeSend) applies the same rules again, so neither has to be trusted alone. */
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    defaultIntegrations: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.browserApiErrorsIntegration(),
      /* no console integration is listed at all, so no console breadcrumbs */
      Sentry.breadcrumbsIntegration({ dom: false, fetch: false, xhr: false, sentry: false, history: true }),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.httpContextIntegration(),
    ],
    ignoreErrors: IGNORE_MESSAGES,
    denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari(-web)?-extension:\/\//i],
    beforeBreadcrumb: (b) => scrubBreadcrumb(b as ScrubBreadcrumb) as Sentry.Breadcrumb | null,
    beforeSend: (event, hint) => {
      if (isAlreadyReported(hint?.originalException)) return null;
      return scrubEvent(event as unknown as ScrubEvent, ua) as unknown as Sentry.ErrorEvent | null;
    },
  });
  return true;
}

/** The signed-in user, for Sentry: the Firebase uid and nothing else; null clears it on sign-out. */
export function identifyForErrors(uid: string | null): void {
  Sentry.setUser(uid ? { id: uid } : null);
}

/* ── reporting ───────────────────────────────────────────────────────────── */

/**
 * ⚠️ A FIRESTORE ERROR IS REPORTED ONCE. `handleFirestoreError` reports the original and then throws
 * a new Error, which usually ends as an unhandled rejection that the global handler would report a
 * second time. The thrown one is marked here and dropped in `beforeSend`.
 */
const reported = new WeakSet<object>();
export function markReported(err: unknown): void {
  if (err && typeof err === "object") reported.add(err);
}
function isAlreadyReported(err: unknown): boolean {
  return !!err && typeof err === "object" && reported.has(err);
}

export function captureBoundaryError(error: unknown, boundary: string, componentStack?: string): void {
  Sentry.captureException(error, {
    tags: { boundary },
    ...(componentStack ? { contexts: { react: { componentStack } } } : {}),
  });
}

export function captureFirestoreError(error: unknown, operation: string, path: string | null): void {
  Sentry.captureException(error, { tags: { area: "firestore", operation, ...(path ? { path } : {}) } });
}
