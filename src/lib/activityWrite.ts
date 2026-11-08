/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FEED WRITE BEHIND `addActivity` (timeline writer fix v1, 8 Nov 2026).
 *
 * ⚠️ IT NEVER THROWS. `addActivity`'s signature has always promised `{ success, error? }`, but its
 * catch called `handleFirestoreError`, which always throws, so the `{ success: false }` after it was
 * unreachable and every caller received a rejection instead. Because most callers write the feed
 * entry AFTER the action it narrates has already landed, that rejection turned landed saves into
 * reported failures (a retry then made a second manuscript) and stopped `logNudge` before it set the
 * nudge's date.
 *
 * So a failure is logged (the same PII-free record `handleFirestoreError` writes) and returned. A
 * caller for whom the entry IS the record checks `success` and stops itself; every other caller
 * carries on, because a missing narration is the only thing that went wrong.
 */
import { doc, setDoc, type Firestore } from "firebase/firestore";
import type { Activity } from "../types";
import { logFirestoreFailure } from "./firestoreErrorLog";

export type ActivityInput = Omit<Activity, "id" | "userId"> & { id?: string };
/** Not a discriminated union: with strictNullChecks off, `success` would not narrow it. */
export type ActivityWriteResult = { success: boolean; id: string; error?: string };

/** The message a caller may show. The logged one carries the path, which carries the uid. */
export const ACTIVITY_WRITE_FAILED = "Failed to persist activity.";

export async function writeActivity(firestore: Firestore, uid: string, act: ActivityInput): Promise<ActivityWriteResult> {
  const id = act.id || "act-" + Math.random().toString(36).substr(2, 9);
  const newAct: Activity = { ...act, id, userId: uid };
  try {
    await setDoc(doc(firestore, "users", uid, "activities", id), newAct);
    return { success: true, id };
  } catch (e) {
    logFirestoreFailure(e, "write", `users/${uid}/activities/${id}`);
    return { success: false, id, error: ACTIVITY_WRITE_FAILED };
  }
}
