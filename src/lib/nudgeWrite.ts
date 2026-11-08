/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WRITES BEHIND logNudge (timeline writer fix v1, 8 Nov 2026).
 *
 * ⚠️ THE NUDGE'S ROW AND ITS DATE ARE ONE BATCH. The per-query activity row is the authoritative
 * record of the nudge (the Tracking timeline reads it), and the query's nudge fields
 * (`nudgeDate`, `lastNudgeSentDate`) are what the board and the next reminder read. They used to be
 * separate writes with the feed twin between them, and the twin's failure threw, so a nudge could
 * land in the timeline with no date on the query. Now both land or neither does.
 *
 * The batch reproduces exactly what `updateQuery(queryId, writes.queryUpdates)` did on this path:
 * one `updateDoc` of `users/{uid}/queries/{queryId}` with those fields. (`updateQuery` batches a
 * package's first-sent stamp only when given `opts.stampPackage`, which logNudge never passes.)
 *
 * ⚠️ AFTER THE BATCH, NOTHING CAN FAIL THE NUDGE. The feed twin is narration (lib/narrate.ts). The
 * task flag only hides the nudge task until the check-back date; if it cannot be written the task
 * simply shows again, so it is logged and the nudge still reports success.
 */
import { doc, writeBatch, type Firestore } from "firebase/firestore";
import { logFirestoreFailure } from "./firestoreErrorLog";
import { narrate } from "./narrate";

export type NudgeWriteSet = { nested: Record<string, unknown>; queryUpdates: Record<string, unknown> };
export const NUDGE_FAILED = "Failed to log nudge.";

export async function commitNudge(
  firestore: Firestore, uid: string, queryId: string, actId: string, writes: NudgeWriteSet,
  after: { writeTwin: () => Promise<unknown>; writeFlag: () => Promise<unknown> },
): Promise<{ success: boolean; error?: string }> {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, "users", uid, "queries", queryId, "activity", actId), writes.nested);
  batch.update(doc(firestore, "users", uid, "queries", queryId), writes.queryUpdates);
  try {
    await batch.commit();
  } catch (e) {
    logFirestoreFailure(e, "write", `users/${uid}/queries/${queryId} [logNudge batch]`);
    return { success: false, error: NUDGE_FAILED };
  }

  await narrate(after.writeTwin, `nudge ${actId} on query ${queryId}`);
  try {
    await after.writeFlag();
  } catch (e) {
    console.error(`[logNudge] the nudge task's flag could not be written for query ${queryId}; the nudge stands and the task will show again. ${e instanceof Error ? e.message : String(e)}`);
  }
  return { success: true };
}
