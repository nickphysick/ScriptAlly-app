/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The weekly pulse's two calls: the `sendWeeklyPulse` callable, and the read of the writer's five
 * `betaPulse` documents by id. Pure logic is in `weeklyPulse.ts`.
 *
 * ⚠️ FIREBASE IS IMPORTED LAZILY, INSIDE THE CALLS. The Dashboard imports this module, and suites
 * that render the Dashboard (the onboarding loaders behind `DashGhost`) are Firebase-free: a static
 * import here stopped them LOADING (`auth/invalid-api-key`).
 *
 * ⚠️ THE READ NEVER THROWS. A refused or failed read is "unanswered" for that week — the panel draws
 * its dots as unanswered and never holds its shape back for the read.
 */
import { isMood, pulseDocId, type Mood } from "./weeklyPulse";

export async function sendWeeklyPulse(mood: Mood, week: string): Promise<void> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const call = httpsCallable(getFunctions(undefined, "europe-west2"), "sendWeeklyPulse");
  await call({ mood, week });
}

export async function readWeeklyPulse(uid: string, weeks: readonly string[]): Promise<(Mood | null)[]> {
  let fs: typeof import("firebase/firestore"), db: typeof import("./firebase")["db"];
  try {
    fs = await import("firebase/firestore");
    db = (await import("./firebase")).db;
  } catch {
    return weeks.map(() => null);
  }
  const { doc, getDoc } = fs;
  return Promise.all(weeks.map(async (w) => {
    try {
      const snap = await getDoc(doc(db, "betaPulse", pulseDocId(uid, w)));
      const m = snap.exists() ? snap.data().mood : null;
      return isMood(m) ? m : null;
    } catch {
      return null;
    }
  }));
}
