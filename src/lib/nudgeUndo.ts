/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNDO A NUDGE BY THE ROW IT WROTE, NEVER THROUGH THE FEED (undo and bulk close v1, Phase 3).
 *
 * `logNudge` returns `activityId` — the id of the per-query activity row, which is the
 * authoritative record of the nudge — and `prior`, the query's nudge fields before it wrote. The
 * To-do page's Undo used to look the nudge up in the global feed (the newest "Nudge sent" row for
 * the query) and delete that. Since the timeline writer fix a feed row is narration that may fail
 * to write, and then the lookup found nothing — or, worse, found the PREVIOUS nudge and removed
 * that one instead.
 *
 * ⚠️ ONE BATCH: the row, its feed twin when there is one (same id — `logNudge` writes both under
 * one id), and the query's `nudgeDate` / `lastNudgeSentDate` put back from `prior` (a field that
 * was absent before is deleted). Either the nudge is wholly gone and the old date back, or nothing
 * changed.
 *
 * After the batch, and unable to fail the undo: when there was no nudge before this one, the
 * nudge task's flag is released — what `deleteActivity` did for a deleted nudge.
 */
import { deleteField, doc, getDoc, writeBatch, type Firestore } from "firebase/firestore";

export interface NudgePrior { nudgeDate?: string; lastNudgeSentDate?: string }

export async function undoNudge(
  fs: Firestore, uid: string, queryId: string, activityId: string, prior: NudgePrior,
  after?: { releaseFlag?: () => Promise<unknown> },
): Promise<void> {
  const rowRef = doc(fs, "users", uid, "queries", queryId, "activity", activityId);
  const feedRef = doc(fs, "users", uid, "activities", activityId);
  const twin = await getDoc(feedRef);
  const batch = writeBatch(fs);
  batch.delete(rowRef);
  if (twin.exists()) batch.delete(feedRef);
  batch.update(doc(fs, "users", uid, "queries", queryId), {
    nudgeDate: prior.nudgeDate ?? deleteField(),
    lastNudgeSentDate: prior.lastNudgeSentDate ?? deleteField(),
  });
  await batch.commit();
  if (!prior.lastNudgeSentDate && after?.releaseFlag) {
    try { await after.releaseFlag(); } catch (e) {
      console.error(`[undo nudge] the nudge was undone but its task flag could not be released for query ${queryId}`, e);
    }
  }
}
