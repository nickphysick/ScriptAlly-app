/**
 * aiRefusal — the two server refusals the AI features share, read off a callable's error, and the
 * plain words each feature shows for them through its own existing error message.
 *
 * The server (functions/src/aiRateLimit.ts, smartImport.ts) sends a `details.reason`; nothing else
 * about the limit reaches the browser — never a count, never how many runs are left.
 */

/** A paid AI feature has been used as many times as it may be today (UTC). */
export const DAILY_LIMIT_MESSAGE = "You've used today's allowance for this. It resets tomorrow.";

/** A Smart Import for this writer is already being read. */
export const IMPORT_IN_PROGRESS_MESSAGE = "Your import is already being read. Give it a moment.";

export type AiRefusalReason = "daily_limit" | "in_progress";

/** The refusal a callable error carries, or null for any other failure. */
export function aiRefusalReason(e: unknown): AiRefusalReason | null {
  const reason = (e as { details?: { reason?: unknown } } | null)?.details?.reason;
  return reason === "daily_limit" || reason === "in_progress" ? reason : null;
}
