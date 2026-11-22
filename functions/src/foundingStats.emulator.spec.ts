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
import { emailHash, normaliseEmail } from "./waitlistModel";

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
/* ⚠️ ONLY THIS SPEC'S OWN WAITLIST DOCS: waitlist.emulator.spec.ts runs beside this file against the same emulator,
   and wiping the whole collection broke its cap race (measured). */
const OWN_PLACES = ["erin@example.com", "fay@example.com", "gus@example.com"];
beforeEach(async () => { await Promise.all(OWN_PLACES.map((e) => db.collection("waitlist").doc(emailHash(normaliseEmail(e))).delete())); });

const note = (uid: string, extra: Record<string, unknown> = {}) => ({
  uid, kind: "An idea", message: "A bulk nudge for everyone quiet", createdAt: Timestamp.fromDate(new Date("2026-10-20T10:00:00Z")), ...extra,
});
/* the emulator run starts no Auth; the founding-number cases below hand in their own accounts */
const NO_ACCOUNTS = { listUsers: async () => [] };
const stats = async (uid: string) => (await db.collection(STATS_COLLECTION).doc(uid).get()).data();

describe("foundingStats — the recompute", () => {
  it("a note with no status is waiting; setting a status makes it a contribution", async () => {
    const ref = await db.collection("betaFeedback").add(note("alice"));
    await recomputeFoundingStats(db, NO_ACCOUNTS);
    expect(await stats("alice")).toMatchObject({ contributions: 0, waiting: 1, tier: null, nextTier: "fledgling", toNext: 1, topPct: null });
    await ref.update({ status: "read" });
    await recomputeFoundingStats(db, NO_ACCOUNTS);
    const s = await stats("alice");
    expect(s).toMatchObject({ contributions: 1, waiting: 0, tier: "fledgling", peakTier: "fledgling", nextTier: "archivist", toNext: 2 });
    expect(s?.updatedAt).toBeInstanceOf(Timestamp);
  });

  it("built is worth four, and the level never falls when a status is taken back", async () => {
    const ref = await db.collection("betaFeedback").add(note("bob", { status: "built" }));
    await recomputeFoundingStats(db, NO_ACCOUNTS);
    expect(await stats("bob")).toMatchObject({ contributions: 4, tier: "archivist" });
    await ref.update({ status: FieldValue.delete() });
    await recomputeFoundingStats(db, NO_ACCOUNTS);
    expect(await stats("bob")).toMatchObject({ contributions: 0, waiting: 1, tier: "archivist", peakTier: "archivist" });
  });

  it("counted:false excludes a note, and the writers are each written", async () => {
    await db.collection("betaFeedback").add(note("carol", { status: "read", counted: false }));
    await db.collection("betaFeedback").add(note("dan", { status: "fixed" }));
    expect(await recomputeFoundingStats(db, NO_ACCOUNTS)).toBe(2);
    expect(await stats("carol")).toMatchObject({ contributions: 0, tier: null });
    expect(await stats("dan")).toMatchObject({ contributions: 1, tier: "fledgling" });
  });
});

/* DB105 A1 — the founding number comes from the waitlist, joined by email; nothing else invents one. */
describe("foundingStats — the founding number (DB105)", () => {
  const users = async () => [
    { uid: "erin", email: "Erin@Example.com " },
    { uid: "fay", email: "fay@example.com" },
    { uid: "gus", email: "gus@example.com" },
  ];
  const place = (email: string, extra: Record<string, unknown>) => db.collection("waitlist").doc(emailHash(normaliseEmail(email))).set({ status: "verified", position: 7, verifiedAt: Timestamp.fromDate(new Date("2026-09-01T09:00:00Z")), ...extra });

  it("a writer whose email holds a verified place gets that number, even with no feedback yet", async () => {
    await place("erin@example.com", { position: 23 });
    await place("fay@example.com", { status: "unsubscribed" });
    await db.collection("betaFeedback").add(note("gus"));
    await recomputeFoundingStats(db, { listUsers: users });
    const erin = await stats("erin");
    expect(erin).toMatchObject({ contributions: 0, tier: null, foundingNo: 23 });
    expect((erin?.joinedAt as Timestamp).toMillis()).toBe(Date.parse("2026-09-01T09:00:00Z"));
    /* an unsubscribed entry proves no place, and no feedback: no doc at all */
    expect(await stats("fay")).toBeUndefined();
    /* feedback but no place: a doc with no number */
    expect(await stats("gus")).toMatchObject({ foundingNo: null, joinedAt: null });
  });

  it("lastSentAt is the newest note's createdAt", async () => {
    await db.collection("betaFeedback").add(note("gus"));
    await db.collection("betaFeedback").add(note("gus", { createdAt: Timestamp.fromDate(new Date("2026-10-25T10:00:00Z")) }));
    await recomputeFoundingStats(db, { listUsers: users });
    expect(((await stats("gus"))?.lastSentAt as Timestamp).toMillis()).toBe(Date.parse("2026-10-25T10:00:00Z"));
  });
});
