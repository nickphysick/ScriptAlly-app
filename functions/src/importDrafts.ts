/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part F — THE DAILY CLEAN-UP OF KEPT IMPORT REVIEWS.
 *
 * A Smart Import review left halfway is kept at `importDrafts/{uid}` (with its payload in `parts/{n}`) for 7 days from
 * its last change, so the writer can pick up where they left off. This deletes every draft whose `updatedAt` — the
 * SERVER's time, which the rules hold the client to — is more than 7 days old, with all of its parts.
 *
 * ⚠️ IT NEVER READS A DRAFT'S CONTENTS: only `updatedAt`, to decide, and the part documents' refs, to delete them.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { db } from "./firestore";

export const DRAFTS = "importDrafts";
export const DRAFT_KEEP_MS = 7 * 86_400_000;

/** Delete every draft last changed more than 7 days before `nowMs`, parts first. Returns how many went. */
export async function clearOldDrafts(store: Firestore, nowMs: number): Promise<number> {
  const cutoff = Timestamp.fromMillis(nowMs - DRAFT_KEEP_MS);
  const old = await store.collection(DRAFTS).where("updatedAt", "<", cutoff).get();
  for (const d of old.docs) {
    const parts = await d.ref.collection("parts").listDocuments();
    const batch = store.batch();
    for (const p of parts) batch.delete(p);
    batch.delete(d.ref);
    await batch.commit();
  }
  console.info(JSON.stringify({ event: "importDrafts.cleared", count: old.size }));
  return old.size;
}

export const importDraftsCleanup = onSchedule(
  { schedule: "41 3 * * *", timeZone: "Europe/London", region: "europe-west2", timeoutSeconds: 300, memory: "256MiB" },
  async () => { await clearOldDrafts(db, Date.now()); },
);
