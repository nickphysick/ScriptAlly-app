/**
 * Cloudflare Web Analytics, counted on the live site only (2 Nov).
 *
 * The beacon used to be written into the built index.html (a Vite plugin reading
 * `VITE_CF_BEACON_TOKEN` from .env.production), so it reported from wherever a production build
 * ran: every `vite preview` on 127.0.0.1, every measurement run, every Firebase preview channel.
 * Now no HTML carries it. `startAnalytics()` adds it at app start, and only when:
 *
 *  - the hostname is EXACTLY one of `ANALYTICS_HOSTS`. An allowlist, never a suffix check:
 *    `endsWith("queryhawk.net")` would count dev.queryhawk.net and queryhawk.net.evil.com;
 *  - this browser has not opted out. `?notrack` on any page sets `localStorage.qh_notrack = "1"`
 *    for good; `?track` removes it. Either parameter is stripped from the address bar
 *    (`history.replaceState`) so it is never shared or bookmarked. No UI: a founder's tool.
 *
 * ⚠️ STORAGE CAN THROW (private modes, blocked site data). Every access is wrapped, and a throw
 * reads as NOT opted out: the opt-out is a convenience, and a broken page is not.
 *
 * ⚠️ NEVER TWICE. The guard is the beacon's own `<script>` already being in the document, which
 * holds under StrictMode's double effects and a hot module reload alike.
 *
 * Same token and config as the snippet it replaces; Cloudflare's beacon sets no cookie and the
 * privacy page already names it.
 */

/** The only hostnames whose visits count. A domain change is this one line. */
export const ANALYTICS_HOSTS: readonly string[] = ["queryhawk.net", "www.queryhawk.net"];

export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
/** Cloudflare's own `data-cf-beacon` value, exactly as the build used to emit it. A public token. */
export const BEACON_CONFIG = '{"token": "ee52cb1f15964230836ca4f32696fbfb"}';

export const NOTRACK_KEY = "qh_notrack";

/** The few pieces of the window this touches, so the tests can hand in their own. */
export interface AnalyticsEnv {
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  /** Replaces the address bar's URL without a navigation. */
  replaceUrl: (url: string) => void;
  /** May throw (the `localStorage` getter itself does in some private modes). */
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">;
  doc: {
    head: { appendChild: (el: unknown) => unknown };
    createElement: (tag: "script") => { setAttribute: (k: string, v: string) => void; defer: boolean; src: string };
    querySelector: (sel: string) => unknown;
  };
}

const browserEnv = (): AnalyticsEnv => ({
  hostname: window.location.hostname,
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
  replaceUrl: (url) => window.history.replaceState(window.history.state, "", url),
  storage: () => window.localStorage,
  doc: document as unknown as AnalyticsEnv["doc"],
});

/** Reads `?notrack` / `?track`, records the choice, and takes the parameter out of the URL. */
const applyOptOutParam = (env: AnalyticsEnv): void => {
  const params = new URLSearchParams(env.search);
  const off = params.has("notrack");
  const on = params.has("track");
  if (!off && !on) return;
  try {
    const s = env.storage();
    if (on) s.removeItem(NOTRACK_KEY);
    if (off) s.setItem(NOTRACK_KEY, "1");
  } catch {
    /* Storage refused: the choice cannot be kept, and the page carries on. */
  }
  params.delete("notrack");
  params.delete("track");
  const qs = params.toString();
  env.replaceUrl(env.pathname + (qs ? `?${qs}` : "") + env.hash);
};

const optedOut = (env: AnalyticsEnv): boolean => {
  try {
    return env.storage().getItem(NOTRACK_KEY) === "1";
  } catch {
    return false;
  }
};

/** Adds Cloudflare's beacon once, on the live hosts only, unless this browser has opted out. */
export function startAnalytics(env: AnalyticsEnv = browserEnv()): void {
  applyOptOutParam(env);
  if (!ANALYTICS_HOSTS.includes(env.hostname)) return;
  if (optedOut(env)) return;
  if (env.doc.querySelector(`script[src="${BEACON_SRC}"]`)) return;
  const s = env.doc.createElement("script");
  s.defer = true;
  s.src = BEACON_SRC;
  s.setAttribute("data-cf-beacon", BEACON_CONFIG);
  env.doc.head.appendChild(s);
}
