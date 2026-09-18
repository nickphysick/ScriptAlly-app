/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashSeen — when this device last had the dashboard open (v16, 18 Sep).
 *
 * The activity feed marks entries logged since then with a rust rule in the card's left margin. That
 * is the whole of what this stores.
 *
 * ⚠️ PER DEVICE, NOT PER ACCOUNT (Nick, 18 Sep). A user field would need a rules line and a deploy to
 * write, and would make "new" mean "new since you last looked ANYWHERE" — which is the wrong claim on
 * the machine you have not opened in a week. `localStorage`, with the house `sa.` prefix.
 *
 * ⚠️ WRITTEN ON UNMOUNT, NEVER ON MOUNT (Nick, 18 Sep). Stamping on arrival clears the marks in the
 * same frame that draws them: a refresh would then show a feed with nothing new in it, having shown
 * the writer nothing. Leaving the page is the moment they have had their chance to read it.
 *
 * ⚠️ EVERY ACCESS IS WRAPPED. Private windows, cleared site data and blocked storage all throw on
 * access rather than returning null, and a feed that cannot render because a marker could not be read
 * would be a page lost to a decoration.
 */
const KEY = "sa.dashSeenAt";

/** When this device last left the dashboard, or null — never seen, or storage is unavailable. */
export const readSeenAt = (): number | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

/** Stamp the visit. Called as the page unmounts; failure is silent by design. */
export const writeSeenAt = (at: number = Date.now()): void => {
  try {
    window.localStorage.setItem(KEY, String(at));
  } catch {
    /* no storage — the feed simply marks nothing on this device */
  }
};

/** The key, for tests and for anyone clearing it by hand. */
export const DASH_SEEN_KEY = KEY;
