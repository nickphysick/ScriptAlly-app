/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountPrefs — the notification and workspace preferences, as GROUPED MAPS.
 *
 * ⚠️ MAPS, NOT FLAT KEYS — the `todoPrefs` precedent, and for its stated reason: one map is one
 * `firestore.rules` allowlist entry, one write path and one place to look, where five flat fields
 * are five chances to forget one. This repo has lost writes to exactly that omission before.
 *
 * ⚠️ EVERY READER GOES THROUGH A TOTAL RESOLVER. An absent map, an absent field and a nonsense
 * value all resolve to the same stated default, so no consumer needs a `?? false` of its own —
 * that is how two surfaces come to disagree about what "unset" means.
 *
 * ⚠️ MARKETING CONSENT IS NOT A PREFERENCE AND IS NOT IN `notifyPrefs`. It is a RECORD of a
 * decision, with the time it was made, and UK PECR is why: consent must be affirmative, evidenced
 * and withdrawable. Folding it in beside "weekly digest" would make it a setting someone could
 * reasonably default ON in a later pass. It has its own field so that cannot happen quietly.
 */

/* ── Notifications ─────────────────────────────────────────────────────────── */

export interface NotifyPrefs {
  /** Email when a query is due a nudge. */
  nudges: boolean;
  /** The Monday summary. */
  weeklyDigest: boolean;
}

/**
 * ⚠️ BOTH DEFAULT ON, AND NEITHER SENDS ANYTHING TODAY. There is no email-sending infrastructure
 * in this app and no scheduler to run one — `functions/` has eight callables and zero scheduled
 * jobs, and the "contact" function writes a Firestore document rather than posting mail. These
 * record what the writer wants FOR WHEN THERE IS, which is why the section says so out loud
 * rather than implying a live behaviour. Defaulting them on matches the app's own habit of
 * shipping a new setting at the behaviour it already had — and the behaviour it has is that a
 * writer who never opens this page would expect their reminders to work.
 */
export const NOTIFY_DEFAULT: NotifyPrefs = { nudges: true, weeklyDigest: true };

export function notifyPrefs(stored: Partial<NotifyPrefs> | undefined | null): NotifyPrefs {
  const s = stored ?? {};
  return {
    nudges: typeof s.nudges === "boolean" ? s.nudges : NOTIFY_DEFAULT.nudges,
    weeklyDigest: typeof s.weeklyDigest === "boolean" ? s.weeklyDigest : NOTIFY_DEFAULT.weeklyDigest,
  };
}

/* ── Marketing consent ─────────────────────────────────────────────────────── */

export interface MarketingConsent {
  granted: boolean;
  /** ISO timestamp of when this state was chosen — the evidence, not a display date. */
  at: string;
}

/**
 * ⚠️ ABSENT MEANS NOT GRANTED, AND ABSENT IS THE STATE EVERY ACCOUNT STARTS IN. There is no
 * pre-ticked box and there is no migration writing `granted: true` to anyone. A consent record
 * that could be created by anything other than a person clicking is not consent.
 */
export function marketingGranted(stored: MarketingConsent | undefined | null): boolean {
  return stored?.granted === true;
}

/** Build the record to write. `now` is injected so the stamp is testable. */
export function marketingConsentRecord(granted: boolean, now: Date = new Date()): MarketingConsent {
  return { granted, at: now.toISOString() };
}

/**
 * The account-mail carve-out, stated once.
 *
 * ⚠️ IT IS NOT A TOGGLE AND MUST NEVER BECOME ONE. Sign-in, billing and data-request mail is
 * service correspondence, not marketing; offering to switch it off would offer something the app
 * cannot honour and should not.
 */
export const ALWAYS_SENT_LINE =
  "Emails about your account itself — sign-in, billing, data requests — are always sent.";

/* ── Workspace ─────────────────────────────────────────────────────────────── */

export interface WorkspacePrefs {
  /** IANA zone, e.g. "Europe/London". */
  timezone: string;
}

/** The last-resort zone, used only when the browser will not say. */
export const FALLBACK_TZ = "Europe/London";

/**
 * ⚠️ RESOLVED AT READ TIME, NOT BACKFILLED — the `getHomeCountry` pattern. An existing account
 * with no stored zone reads as the zone its BROWSER reports, never as Europe/London: silently
 * pinning a writer in Chicago to London would give them wrong day boundaries with nothing on
 * screen to explain it. The stored value is written only when someone chooses one.
 */
export function resolveTimeZone(stored: string | undefined | null): string {
  if (stored && typeof stored === "string") return stored;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ;
  } catch {
    return FALLBACK_TZ;
  }
}

/** The zones offered, plus whatever the writer is already on. */
export const TZ_CHOICES = [
  "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Perth",
  "Pacific/Auckland", "Asia/Singapore", "Asia/Tokyo", "Asia/Kolkata",
  "Africa/Johannesburg", "UTC",
] as const;

/** The list to render — the choices, with the current zone inserted if it is not among them. */
export function tzOptions(current: string): string[] {
  const all = [...TZ_CHOICES] as string[];
  return all.includes(current) ? all : [current, ...all];
}

/**
 * ⚠️ THE ZONE IS STORED AND NOTHING READS IT YET — and the helper text says so rather than
 * implying it changes what is on screen.
 *
 * Dates already render in the DEVICE's zone, which for almost every writer is the same zone; the
 * stored value exists for the scheduled work that does not exist yet (a nudge email at 9am local
 * needs a server to know which 9am). Wiring it to DISPLAY would mean threading it through 93
 * `toLocaleDateString` call sites, several of them in files this build must not touch — and a
 * setting that changed nothing visible while claiming to would be worse than one that is honest
 * about its scope.
 *
 * ⚠️ DATE FORMAT AND WEEK-START ARE DELIBERATELY NOT HERE. Both are pure display claims against
 * those same 93 sites, all of which render `en-GB` day-month today. A stored "MM/DD/YYYY" beside
 * a page full of "20 August 2026" is not a deferred preference, it is a visible untruth — the
 * same reason Pen name, the author-photo control and the sessions button were removed.
 */
export const TZ_HELPER =
  "Dates and times already follow this device. Your zone is stored for reminders and scheduled " +
  "summaries, which aren't switched on yet.";
