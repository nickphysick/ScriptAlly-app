/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MANUSCRIPT WRITES BEHIND addManuscript AND updateManuscript (timeline writer fix v1).
 *
 * ⚠️ SUCCESS IS DECIDED BY THE MANUSCRIPT WRITE ALONE. The feed entry after it is narration
 * (lib/narrate.ts): if it fails, the narration is missing and nothing else. Before this, a failed
 * feed entry rejected addManuscript after the manuscript had landed, the form reported a failure,
 * and the writer's retry made a SECOND manuscript under a new random id. Reporting the landed save
 * as the success it is removes that retry. (A stable id per form submission would close it from the
 * other side; that belongs to the manuscript dialog, which this pack does not touch — deferred.)
 *
 * `updateManuscriptFields` resolves whether the update landed, for anything else a caller does only
 * after a landed write.
 *
 * A failure of the manuscript write itself is unchanged: it goes to `onWriteError`, which db.tsx
 * gives `handleFirestoreError`, and throws as it always has.
 */
import { doc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import type { Manuscript } from "../types";
import { narrate } from "./narrate";

export type NewManuscriptInput = Omit<Manuscript, "id" | "userId" | "statusChangedDate"> & { id?: string };
type OnWriteError = (e: unknown, op: "write" | "update", path: string) => void;

export async function createManuscript(
  firestore: Firestore, uid: string, m: NewManuscriptInput,
  narrateAdded: (ms: Manuscript) => Promise<unknown>,
  onWriteError: OnWriteError,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const id = m.id || "ms-" + Math.random().toString(36).substr(2, 9);
  const newMs = { ...m, id, userId: uid, statusChangedDate: new Date().toISOString() } as Manuscript;
  try {
    await setDoc(doc(firestore, "users", uid, "manuscripts", id), newMs);
  } catch (e) {
    onWriteError(e, "write", `users/${uid}/manuscripts/${id}`);
    return { success: false, error: "Database exception occurred." };
  }
  await narrate(() => narrateAdded(newMs), `manuscript ${id} added`);
  return { success: true, id };
}

export async function updateManuscriptFields(
  firestore: Firestore, uid: string, id: string, updates: Partial<Manuscript>,
  narrateUpdated: (() => Promise<unknown>) | null,
  onWriteError: OnWriteError,
): Promise<boolean> {
  try {
    await updateDoc(doc(firestore, "users", uid, "manuscripts", id), updates);
  } catch (e) {
    onWriteError(e, "update", `users/${uid}/manuscripts/${id}`);
    return false;
  }
  if (narrateUpdated) await narrate(narrateUpdated, `manuscript ${id} updated`);
  return true;
}
