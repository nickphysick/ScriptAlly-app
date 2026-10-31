/**
 * Which link brought the visitor — captured on arrival, sent with a founding sign-up.
 *
 * The Instagram link-in-bio is `queryhawk.net/?utm_source=instagram`. The tags are read from the
 * URL the first time a public page renders in this tab, kept in sessionStorage, and sent with the
 * waitlist POST as `attribution`, so a visitor who lands on / and signs up from /founders three
 * pages later is still counted against Instagram. The server narrows them again
 * (`functions/src/waitlistModel.readAttribution`) and stores them only when the entry is created.
 *
 * `?ref=instagram` is accepted as a shorter form of `utm_source`.
 *
 * ⚠️ FIRST TOUCH PER TAB: once tags are stored, a later URL in the same tab does not replace them.
 * ⚠️ NO COOKIE, NO THIRD PARTY: sessionStorage only, cleared when the tab closes; it is sent only
 * to our own waitlist function, with the sign-up the visitor chose to make.
 */
export interface Attribution { source?: string; medium?: string; campaign?: string }

const KEY = "qh.attribution";

const clean = (v: string | null): string | undefined => {
  if (!v) return undefined;
  const t = v.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 60);
  return t || undefined;
};

/** Pure: the tags in a query string, or null if it carries none. */
export const tagsFrom = (search: string): Attribution | null => {
  const q = new URLSearchParams(search);
  const out: Attribution = {};
  const source = clean(q.get("utm_source")) ?? clean(q.get("ref"));
  const medium = clean(q.get("utm_medium"));
  const campaign = clean(q.get("utm_campaign"));
  if (source) out.source = source;
  if (medium) out.medium = medium;
  if (campaign) out.campaign = campaign;
  return Object.keys(out).length ? out : null;
};

export const captureAttribution = (): void => {
  try {
    if (window.sessionStorage.getItem(KEY)) return;
    const tags = tagsFrom(window.location.search);
    if (tags) window.sessionStorage.setItem(KEY, JSON.stringify(tags));
  } catch {
    /* Storage unavailable: the sign-up simply goes without tags. */
  }
};

export const storedAttribution = (): Attribution | null => {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
};
