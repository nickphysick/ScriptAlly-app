/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do write-error classifier + typed error. The composer's save STATE MACHINE needs to show
 * the right failure copy — a permission denial reads differently from a dropped connection — and it
 * must decide from the error CODE, never from a raw Firebase message string (which can leak detail
 * and drifts between SDK versions). So write paths throw a `TodoWriteError` carrying a normalised
 * code, and the UI renders `saveErrorCopy(code)`. Pure — no Firestore imports, so tests stay light.
 */

export type WriteErrorCode = "permission" | "network" | "unknown";

/** A write failure normalised to one of three UI classes; the raw error never reaches the view. */
export class TodoWriteError extends Error {
  code: WriteErrorCode;
  constructor(code: WriteErrorCode, message: string) {
    super(message);
    this.name = "TodoWriteError";
    this.code = code;
  }
}

/** Map a caught write error to its UI class from the Firestore error CODE — never the message. */
export function classifyWriteError(e: unknown): WriteErrorCode {
  if (e instanceof TodoWriteError) return e.code;
  const code = String((e as { code?: unknown } | null | undefined)?.code ?? "");
  if (code === "permission-denied" || code === "unauthenticated") return "permission";
  if (code === "unavailable" || code === "deadline-exceeded" || code === "cancelled" || code === "resource-exhausted" || code === "aborted") return "network";
  return "unknown";
}

/** The inline copy for a failed save, by class. No raw Firebase message ever reaches the UI. */
export function saveErrorCopy(code: WriteErrorCode): string {
  if (code === "permission") return "Couldn’t save that — your account doesn’t have permission yet.";
  if (code === "network") return "Couldn’t save that — you seem to be offline. Try again?";
  return "Couldn’t save that. Try again?";
}
