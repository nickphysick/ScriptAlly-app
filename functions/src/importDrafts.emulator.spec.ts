/**
 * importDrafts — the daily clean-up, against a real Firestore (npm run test:functions). FV2 F1's last clause: a draft
 * 8 days old is deleted by the scheduled function's own body; a draft 6 days old is kept.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firestore";
import { clearOldDrafts, DRAFTS } from "./importDrafts";

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `firebase emulators:exec` — npm run test:functions").toBeTruthy();
});
afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

const DAY = 86_400_000;
const seed = async (uid: string, ageDays: number, now: number) => {
  const ref = db.collection(DRAFTS).doc(uid);
  await ref.set({ uid, fileName: "tracker.xlsx", updatedAt: Timestamp.fromMillis(now - ageDays * DAY), parts: 2 });
  await ref.collection("parts").doc("0").set({ i: 0, data: "{" });
  await ref.collection("parts").doc("1").set({ i: 1, data: "}" });
};

describe("importDraftsCleanup", () => {
  it("deletes a draft 8 days old with its parts, and keeps one 6 days old", async () => {
    const now = Date.parse("2026-10-30T03:41:00Z");
    await seed("fv2-old", 8, now);
    await seed("fv2-young", 6, now);
    const n = await clearOldDrafts(db, now);
    expect(n).toBe(1);
    expect((await db.collection(DRAFTS).doc("fv2-old").get()).exists).toBe(false);
    expect((await db.collection(DRAFTS).doc("fv2-old").collection("parts").get()).size).toBe(0);
    expect((await db.collection(DRAFTS).doc("fv2-young").get()).exists).toBe(true);
    expect((await db.collection(DRAFTS).doc("fv2-young").collection("parts").get()).size).toBe(2);
    await db.recursiveDelete(db.collection(DRAFTS).doc("fv2-young"));
  });
});
