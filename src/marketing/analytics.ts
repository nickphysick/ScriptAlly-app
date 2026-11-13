/**
 * Google Analytics on the public site — only after the visitor says yes.
 *
 * ⚠️ NOTHING LOADS AND NOTHING IS SET UNTIL "ACCEPT". GA4 sets cookies, and in the UK analytics
 * cookies from a third party that may use the data for its own purposes need prior consent (PECR;
 * the 2026 statistical-purposes exception is not read as covering GA). So `gtag.js` is never
 * requested, and `window.gtag` never exists, until `grantAnalytics()` runs — and that only runs
 * from a stored "granted". ⚠️ THE CONSENT BAR THAT ASKED WAS DELETED (13 Nov; it could never show,
 * as no build sets an id), so nothing on any page calls `grantAnalytics` or `denyAnalytics` today:
 * turning GA on needs a way to ask before it needs an id.
 *
 * ⚠️ THE MEASUREMENT ID IS SET IN `.env.production` ONLY (`VITE_GA_MEASUREMENT_ID`). Dev and local
 * builds carry none, so the script never appears there, and test traffic never reaches the live
 * property.
 *
 * ⚠️ PUBLIC PAGES ONLY. `MarketingShell` initialises it; nothing in the app calls this.
 *
 * The visitor's choice is kept in localStorage (`qh.analyticsConsent`). Withdrawing consent stops
 * further measurement (GA's own consent API) and deletes the `_ga` cookies this site set.
 */

export const GA_ID: string = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? "").trim();

export type Consent = "granted" | "denied";
const KEY = "qh.analyticsConsent";
export const CONSENT_EVENT = "qh:analytics-consent";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const analyticsAvailable = (): boolean => GA_ID.length > 0 && typeof window !== "undefined";

export const readConsent = (): Consent | null => {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
};

const writeConsent = (v: Consent | null): void => {
  try {
    if (v) window.localStorage.setItem(KEY, v);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* Storage can throw (private modes); the choice then lasts the page view, which is honest. */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
};

let loaded = false;

/** Injects gtag.js once. Only ever called with consent granted. */
const load = (): void => {
  if (loaded || !analyticsAvailable()) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  /* Page views are sent by `trackPageView` on every public route, the first included, so the
     automatic one is off — otherwise the landing page would count twice. */
  window.gtag("config", GA_ID, { send_page_view: false, allow_google_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
};

/** On first paint of a public page: load only if the visitor already said yes on an earlier visit. */
export const initAnalytics = (): void => {
  if (analyticsAvailable() && readConsent() === "granted") load();
};

export const grantAnalytics = (): void => {
  /* Load BEFORE announcing: listeners send this page's view on the announcement. */
  try { window.localStorage.setItem(KEY, "granted"); } catch { /* see writeConsent */ }
  load();
  if (window.gtag) window.gtag("consent", "update", { analytics_storage: "granted" });
  window.dispatchEvent(new Event(CONSENT_EVENT));
};

export const denyAnalytics = (): void => {
  writeConsent("denied");
  if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
  clearGaCookies();
};

/** Forget the answer, so the next way of asking asks again. (The footer's "Cookie choices" and the bar are gone.) */
export const reopenConsent = (): void => {
  writeConsent(null);
};

const clearGaCookies = (): void => {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (!/^_ga/.test(name)) continue;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
};

const send = (name: string, params: Record<string, unknown>): void => {
  if (!loaded || !window.gtag || readConsent() !== "granted") return;
  window.gtag("event", name, params);
};

/**
 * One page view per public route. GA reads `utm_source` etc. from `page_location` itself, so the
 * Instagram tag on the link-in-bio is attributed without anything extra here.
 */
export const trackPageView = (path: string): void => {
  send("page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
};

/**
 * A founding sign-up that reached the server. `form` is which surface it came from (the waitlist
 * `source`); GA attributes the campaign from the session. No email or other personal data is sent.
 */
export const trackSignUp = (outcome: "sent" | "dupe" | "full", form: string): void => {
  send("sign_up", { method: "founding_waitlist", form, outcome });
};
