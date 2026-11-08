/**
 * aiRateLimit — the one per-user, per-UTC-day limit every paid AI callable claims before it builds
 * an Anthropic client.
 *
 * Extracted from the Scout's own `claimRun` (suggestComps.ts) with the same semantics, so the four
 * AI features cannot drift into four different ideas of what "a day" or "a run" is:
 *
 *   - the day is the UTC calendar day (`YYYY-MM-DD`), the same clock for every writer;
 *   - the slot is claimed in a TRANSACTION, never read-then-write — two runs fired together would
 *     otherwise both read the same count and both pass;
 *   - it is claimed BEFORE the model call, so a run that fails still costs its slot. A failed call
 *     is still a paid call, and a limit that refunded failures could be spent indefinitely by a
 *     caller who knew how to make the model fail;
 *   - Pro accounts are limited too. No account gets unlimited AI.
 *
 * ⚠️ THE LIMIT DOCUMENTS ARE ADMIN-ONLY. The Admin SDK bypasses security rules, and the rules deny
 * the client both reading and writing them (`scoutRateLimits`, `aiRateLimits`). A limit the browser
 * could read would tell a caller exactly how many runs they had left; one it could write would not
 * be a limit. The count is never returned to the client either — the refusal names the feature and
 * the reason, nothing else.
 *
 * Smart Import is NOT on this helper. Its allowance is spent only on a usable result, which is the
 * opposite rule; it has its own claim in smartImport.ts.
 */
import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/** The AI features this helper limits. Smart Import is deliberately absent — see the docblock. */
export type AiFeature = "scout" | "assistAgentData" | "extractFromEmail";

/** The plain message a writer sees, through each feature's existing error path. */
export const DAILY_LIMIT_MESSAGE = "You've used today's allowance for this. It resets tomorrow.";

/** The UTC calendar day of `d`, as `YYYY-MM-DD`. */
export const utcDay = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

/**
 * Where a feature's count lives.
 *
 * ⚠️ THE SCOUT KEEPS ITS ORIGINAL PATH, `scoutRateLimits/{uid}`. Moving it would reset every
 * writer's count on the day of the deploy and change nothing else, so the move buys nothing. The
 * other features share one admin-only tree, one document per feature under the writer's uid.
 */
export const limitDocPath = (uid: string, feature: AiFeature): string =>
  feature === "scout" ? `scoutRateLimits/${uid}` : `aiRateLimits/${uid}/features/${feature}`;

/**
 * Claim one of today's runs for `uid` on `feature`, or throw `resource-exhausted` with
 * `{ reason: "daily_limit", feature }`.
 *
 * `opts.message` lets a feature keep the wording it already had (the Scout's). `opts.now` is for
 * tests only; every callable passes nothing and the server clock decides the day.
 */
export async function claimDailySlot(
  db: Firestore,
  uid: string,
  feature: AiFeature,
  limitPerDay: number,
  opts: { message?: string; now?: Date } = {},
): Promise<void> {
  const today = utcDay(opts.now ?? new Date());
  const ref = db.doc(limitDocPath(uid, feature));
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const sameDay = snap.exists && snap.get("day") === today;
    const used = sameDay ? Number(snap.get("count") ?? 0) : 0;
    if (used >= limitPerDay) return false;
    tx.set(ref, { day: today, count: used + 1 }, { merge: true });
    return true;
  });
  if (!claimed) {
    throw new HttpsError("resource-exhausted", opts.message ?? DAILY_LIMIT_MESSAGE, {
      reason: "daily_limit",
      feature,
    });
  }
}
