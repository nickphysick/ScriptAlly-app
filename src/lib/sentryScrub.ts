/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What an error report may carry, decided before it leaves the browser (crash reporting v1, Phase 2).
 * Pure: it imports nothing from Sentry, so every rule is unit-tested on crafted events
 * (src/lib/sentryScrub.test.ts). `lib/sentry.ts` hands it Sentry's `beforeSend`/`beforeBreadcrumb`.
 *
 * The rules, and why:
 *  - **No query string or hash leaves the browser**, from any URL anywhere in the event. Welcome
 *    references (`?r=`) and emailed links (`?token=`) ride in query strings, and so do search terms.
 *  - **No request headers or cookies.** Headers carry the referrer (a full URL) and the user agent;
 *    the browser's name and major version go in `contexts.browser` instead, which is all we want.
 *  - **No `extra`**, except the few plain keys this app sets itself (`EXTRA_KEYS`).
 *  - **An event that mentions an email address is dropped whole.** Scrubbing an address out of a
 *    message could leave the rest of a sentence that names the person; dropping is the safe answer.
 *  - **The user is an id and nothing else.**
 *  - **Only navigation breadcrumbs, by path.** Clicks, typing, console lines and network calls can
 *    all carry what a writer has written.
 *  - **Noise is dropped**: browser-extension frames, ResizeObserver warnings, being offline.
 */

/* The minimal shapes this file reads and writes. Sentry's own types are wider; these are what we touch. */
export interface ScrubFrame { filename?: string; abs_path?: string; [k: string]: unknown }
export interface ScrubException { type?: string; value?: string; stacktrace?: { frames?: ScrubFrame[] }; [k: string]: unknown }
export interface ScrubBreadcrumb { category?: string; type?: string; message?: string; data?: Record<string, unknown>; [k: string]: unknown }
export interface ScrubEvent {
  message?: string;
  request?: { url?: string; headers?: unknown; cookies?: unknown; query_string?: unknown; data?: unknown; env?: unknown; [k: string]: unknown };
  exception?: { values?: ScrubException[] };
  breadcrumbs?: ScrubBreadcrumb[];
  extra?: Record<string, unknown>;
  user?: { id?: string; [k: string]: unknown };
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  [k: string]: unknown;
}

/** The only `extra` keys kept: plain metadata this app sets itself. */
export const EXTRA_KEYS = ["boundary", "operation", "path"] as const;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EXTENSION = /^(chrome|moz|safari(-web)?|ms-browser)-extension:\/\//i;

/** Messages that are noise rather than faults: the browser, the network, or an extension. */
export const IGNORE_MESSAGES: (string | RegExp)[] = [
  /ResizeObserver loop/i,
  /^(TypeError: )?Failed to fetch$/i,
  /NetworkError when attempting to fetch resource/i,
  /^(TypeError: )?Load failed$/i,
  /Network request failed/i,
  /The Internet connection appears to be offline/i,
  /auth\/network-request-failed/i,
  /Could not reach Cloud Firestore backend/i,
  /client is offline/i,
];

/** A URL with its query string and hash removed. Anything that is not a URL is returned as it was. */
export function stripUrl(url: string): string {
  return url.replace(/[?#].*$/, "");
}

/** Every URL inside free text, with its query string and hash removed. */
export function stripUrlsIn(text: string): string {
  return text.replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s?#"'<>)]*)[?#][^\s"'<>)]*/gi, "$1");
}

/** "Chrome 130", "Safari 18", "Firefox 132", "Edge 130"; or undefined. The whole user agent is never kept. */
export function browserFromUa(ua: string | undefined): { name: string; version?: string } | undefined {
  if (!ua) return undefined;
  const pick = (name: string, re: RegExp) => { const m = re.exec(ua); return m ? { name, version: m[1] } : undefined; };
  return pick("Edge", /Edg\/(\d+)/) ?? pick("Firefox", /Firefox\/(\d+)/) ?? pick("Chrome", /Chrome\/(\d+)/)
    ?? pick("Safari", /Version\/(\d+)[\d.]* .*Safari/) ?? undefined;
}

function mentionsEmail(e: ScrubEvent): boolean {
  if (e.message && EMAIL.test(e.message)) return true;
  for (const x of e.exception?.values ?? []) if (x.value && EMAIL.test(x.value)) return true;
  for (const b of e.breadcrumbs ?? []) if (b.message && EMAIL.test(b.message)) return true;
  return false;
}

function isNoise(e: ScrubEvent): boolean {
  const texts = [e.message ?? "", ...(e.exception?.values ?? []).map((x) => `${x.type ? `${x.type}: ` : ""}${x.value ?? ""}`), ...(e.exception?.values ?? []).map((x) => x.value ?? "")];
  if (texts.some((t) => t && IGNORE_MESSAGES.some((m) => (typeof m === "string" ? t.includes(m) : m.test(t))))) return true;
  const frames = (e.exception?.values ?? []).flatMap((x) => x.stacktrace?.frames ?? []);
  return frames.some((f) => EXTENSION.test(f.filename ?? "") || EXTENSION.test(f.abs_path ?? ""));
}

/** One breadcrumb as it may leave the browser, or null to drop it. Navigation only, paths only. */
export function scrubBreadcrumb(b: ScrubBreadcrumb): ScrubBreadcrumb | null {
  if (b.category !== "navigation") return null;
  const data: Record<string, unknown> = {};
  for (const k of ["from", "to"] as const) {
    const v = b.data?.[k];
    if (typeof v === "string") data[k] = stripUrl(v);
  }
  const out: ScrubBreadcrumb = { category: "navigation", data };
  for (const k of ["type", "level", "timestamp"] as const) if (b[k] !== undefined) (out as Record<string, unknown>)[k] = b[k];
  return out;
}

/**
 * The event as it may leave the browser, or null to drop it. `ua` is the browser's user agent,
 * read only to name the browser.
 */
export function scrubEvent<E extends ScrubEvent>(event: E, ua?: string): E | null {
  if (mentionsEmail(event) || isNoise(event)) return null;
  const e: E = { ...event };

  if (e.message) e.message = stripUrlsIn(e.message);

  if (e.request) {
    e.request = e.request.url ? { url: stripUrl(e.request.url) } : {};
  }

  if (e.exception?.values) {
    e.exception = {
      ...e.exception,
      values: e.exception.values.map((x) => ({
        ...x,
        ...(x.value ? { value: stripUrlsIn(x.value) } : {}),
        ...(x.stacktrace?.frames
          ? { stacktrace: { ...x.stacktrace, frames: x.stacktrace.frames.map((f) => ({
              ...f,
              ...(f.filename ? { filename: stripUrl(f.filename) } : {}),
              ...(f.abs_path ? { abs_path: stripUrl(f.abs_path) } : {}),
            })) } }
          : {}),
      })),
    };
  }

  if (e.breadcrumbs) e.breadcrumbs = e.breadcrumbs.map(scrubBreadcrumb).filter((b): b is ScrubBreadcrumb => b !== null);

  if (e.extra) {
    const kept: Record<string, unknown> = {};
    for (const k of EXTRA_KEYS) {
      const v = e.extra[k];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") kept[k] = v;
    }
    if (Object.keys(kept).length) e.extra = kept; else delete e.extra;
  }

  if (e.user) {
    if (typeof e.user.id === "string" && e.user.id) e.user = { id: e.user.id }; else delete e.user;
  }

  const browser = browserFromUa(ua);
  if (browser) e.contexts = { ...(e.contexts ?? {}), browser };

  return e;
}

/** A Firestore path with its document ids replaced: `users/abc/queries/xyz` → `users/{id}/queries/{id}`. */
export function normaliseFirestorePath(path: string | null): string | null {
  if (!path) return path;
  return path.split("/").map((seg, i) => (i % 2 === 1 ? "{id}" : seg)).join("/");
}
