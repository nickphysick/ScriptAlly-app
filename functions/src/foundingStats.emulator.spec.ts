/**
 * foundingStats — the recompute, against a real Firestore (npm run test:functions).
 *
 * ⚠️ `.emulator.spec.ts`, NOT `.test.ts`: only `vitest.config.emulator.ts` picks it up, inside `firebase emulators:exec`.
 * What is tested here is the part pure functions cannot reach: that a status set on a `betaFeedback` doc moves the
 * writer's `foundingStats` doc, that the peak is read back so a level never falls, and that the store writes every
 * writer it should. The trigger itself is the same call (`foundingStatsOnFeedback` runs `recomputeFoundingStats`).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
/* ⚠️ THE SHARED HANDLE, not a second one (firestoreHandle.test.ts allows exactly one exempt spec). Under
   `emulators:exec` it initialises against GCLOUD_PROJECT and resolves the demo project's (default) database. */
import { db } from "./firestore";
import { recomputeFoundingStats, STATS_COLLECTION } from "./foundingStats";

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `firebase emulators:exec` — npm run test:functions").toBeTruthy();
});
afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

const wipe = async () => {
  for (const path of ["betaFeedback", STATS_COLLECTION]) {
    const snap = await db.collection(path).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
};
beforeEach(wipe);

const note = (uid: string, extra: Record<string, unknown> = {}) => ({
  uid, kind: "An idea", message: "A bulk nudge for everyone quiet", createdAt: Timestamp.fromDate(new Date("2026-10-20T10:00:00Z")), ...extra,
});
const stats = async (uid: string) => (await db.collection(STATS_COLLECTION).doc(uid).get()).data();

describe("foundingStats — the recompute", () => {
  it("a note with no status is waiting; setting a status makes it a contribution", async () => {
    const ref = await db.collection("betaFeedback").add(note("alice"));
    await recomputeFoundingStats(db);
    expect(await stats("alice")).toMatchObject({ contributions: 0, waiting: 1, tier: null, nextTier: "fledgling", toNext: 1, topPct: null });
    await ref.update({ status: "read" });
    await recomputeFoundingStats(db);
    const s = await stats("alice");
    expect(s).toMatchObject({ contributions: 1, waiting: 0, tier: "fledgling", peakTier: "fledgling", nextTier: "archivist", toNext: 2 });
    expect(s?.updatedAt).toBeInstanceOf(Timestamp);
  });

  it("built is worth four, and the level never falls when a status is taken back", async () => {
    const ref = await db.collection("betaFeedback").add(note("bob", { status: "built" }));
    await recomputeFoundingStats(db);
    expect(await stats("bob")).toMatchObject({ contributions: 4, tier: "archivist" });
    await ref.update({ status: FieldValue.delete() });
    await recomputeFoundingStats(db);
    expect(await stats("bob")).toMatchObject({ contributions: 0, waiting: 1, tier: "archivist", peakTier: "archivist" });
  });

  it("counted:false excludes a note, and the writers are each written", async () => {
    await db.collection("betaFeedback").add(note("carol", { status: "read", counted: false }));
    await db.collection("betaFeedback").add(note("dan", { status: "fixed" }));
    expect(await recomputeFoundingStats(db)).toBe(2);
    expect(await stats("carol")).toMatchObject({ contributions: 0, tier: null });
    expect(await stats("dan")).toMatchObject({ contributions: 1, tier: "fledgling" });
  });
});
