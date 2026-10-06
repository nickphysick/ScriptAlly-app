/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactPrefs — Housekeeping v2's own preferences, `todoPrefs.contacts` (Contact list v13, Phase 5;
 * HK v2 §1.9). A page-scoped sub-map on the shared `todoPrefs` map, following the `noteboard` and
 * `manuscripts` precedent: `todoPrefs` is `is map` and unconstrained in the rules, so it ships with
 * no rules change (proved by `tests/e2e/rulesProbe.mjs` against the deployed ruleset).
 *
 * ⚠️ EVERY WRITE IS A DOTTED LEAF PATH, NEVER THE MAP. `todoPrefs` has four other owners; a whole-map
 * write deletes theirs (the settings wipe Phase 0 fixed). The path builders here are the only way
 * this page writes the sub-map, and each touches one leaf.
 *
 *   later          "{agentId}:{gap}" → "YYYY-MM-DD"   hidden until that day (30 days from "Later")
 *   settled        ["{agentId}:reply", …]             "Say it's not stated" — stops asking
 *   wishlistEvery  3 | 6 | 12                          months; absent = 6
 *   wishlistNextOn "YYYY-MM-DD"                        the next check-in; absent = due as soon as any is
 */
import type { User } from "../types";
import type { UserPaths } from "./userPaths";

export type WishlistEvery = 3 | 6 | 12;

export interface ContactPrefs {
  later: Record<string, string>;
  settled: string[];
  wishlistEvery: WishlistEvery;
  wishlistNextOn: string | null;
}

/** what the map may hold, as stored (every member optional) */
export interface StoredContactPrefs {
  later?: Record<string, string>;
  settled?: string[];
  wishlistEvery?: number;
  wishlistNextOn?: string;
}

const ROOT = "todoPrefs.contacts";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" in the writer's local calendar — the day a person means, never a UTC instant. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** months added on the calendar, clamped to the target month's last day (31 Jan + 1 → 28/29 Feb) */
export function addMonths(d: Date, n: number): Date {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
}

/**
 * The TOTAL reader. Expired `later` entries — a day at or before today — are pruned ON READ (HK v2
 * §5): an item comes back on its own on its day, and nothing has to be written for that to happen.
 */
export function contactPrefsOf(user: Pick<User, "todoPrefs"> | null | undefined, today: Date): ContactPrefs {
  const raw = ((user?.todoPrefs as { contacts?: StoredContactPrefs } | undefined)?.contacts) ?? {};
  const now = dayKey(today);
  const later: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.later ?? {})) {
    if (typeof v === "string" && DAY_RE.test(v) && v > now) later[k] = v;
  }
  const every = raw.wishlistEvery === 3 || raw.wishlistEvery === 12 ? raw.wishlistEvery : 6;
  return {
    later,
    settled: Array.isArray(raw.settled) ? raw.settled.filter((s): s is string => typeof s === "string") : [],
    wishlistEvery: every,
    wishlistNextOn: typeof raw.wishlistNextOn === "string" && DAY_RE.test(raw.wishlistNextOn) ? raw.wishlistNextOn : null,
  };
}

export const itemKey = (agentId: string, gap: string): string => `${agentId}:${gap}`;
export const LATER_DAYS = 30;

/** "Later": hide this item for 30 days — one leaf. */
export function laterPath(agentId: string, gap: string, today: Date): UserPaths {
  return { [`${ROOT}.later.${itemKey(agentId, gap)}`]: dayKey(addDays(today, LATER_DAYS)) };
}

/** "Show them now": every put-off item back — one leaf, the `later` map emptied. */
export const showAllPath = (): UserPaths => ({ [`${ROOT}.later`]: {} });

/** "Say it's not stated": the reply gap stops asking — the settled list with this key added. */
export function settledPath(prefs: ContactPrefs, agentId: string): UserPaths {
  const key = itemKey(agentId, "reply");
  return { [`${ROOT}.settled`]: prefs.settled.includes(key) ? prefs.settled : [...prefs.settled, key] };
}

/** Undo of "Say it's not stated": the list as it was before. */
export const settledRestorePath = (before: string[]): UserPaths => ({ [`${ROOT}.settled`]: before });

export const wishlistEveryPath = (every: WishlistEvery): UserPaths => ({ [`${ROOT}.wishlistEvery`]: every });

/** "Next time" (or the end of a check-in): the next one is today + the interval. */
export function wishlistNextPath(prefs: ContactPrefs, today: Date): UserPaths {
  return { [`${ROOT}.wishlistNextOn`]: dayKey(addMonths(today, prefs.wishlistEvery)) };
}

/** The earliest day among the put-off items — the foot's "until 3 Nov" — or null when none. */
export function earliestLater(prefs: ContactPrefs): string | null {
  const days = Object.values(prefs.later).sort();
  return days[0] ?? null;
}

/* ── the view toggle's memory (HK v2 §1.3) ──────────────────────────────────────────────────── */

export type HkView = "detail" | "agent";
export const HK_VIEW_KEY = "sa.hkGrouping";

/**
 * Read the toggle: localStorage, taking an OLD sessionStorage value on first read and deleting it
 * (the key moved from session to local storage). The old values were "unlocks" (= by missing
 * detail) and "agent".
 */
export function readHkView(): HkView {
  try {
    const stored = localStorage.getItem(HK_VIEW_KEY);
    const old = sessionStorage.getItem(HK_VIEW_KEY);
    if (old !== null) {
      sessionStorage.removeItem(HK_VIEW_KEY);
      if (stored === null) {
        const v: HkView = old === "agent" ? "agent" : "detail";
        localStorage.setItem(HK_VIEW_KEY, v);
        return v;
      }
    }
    return stored === "agent" ? "agent" : "detail";
  } catch {
    return "detail";
  }
}

export function writeHkView(v: HkView): void {
  try { localStorage.setItem(HK_VIEW_KEY, v); } catch { /* a blocked store keeps the default */ }
}
