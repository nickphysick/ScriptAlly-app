/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Undo puts a query back ALL OR NOTHING (undo and bulk close v1, Phase 1). `restoreSnapshot` reads
 * what is there now, plans the difference from the snapshot, and commits the whole plan in one
 * batch: a refused write anywhere in it leaves the query exactly as it was before Undo was pressed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeStore } from "../../test/fakeFirestore";
import { fakeFirestoreFull, fakeReads } from "../../test/fakeFirestoreFull";
vi.mock("firebase/firestore", () => fakeFirestoreFull);
vi.mock("../firebase", () => ({ db: {} }));
import { restoreSnapshot, takeSnapshot, RESTORE_BATCH_LIMIT, UndoFailedError } from "./snapshot";

const UID = "u1", QID = "q1";
const Q = `users/${UID}/queries/${QID}`;
const row = (id: string) => `${Q}/activity/${id}`;
const feed = (id: string) => `users/${UID}/activities/${id}`;
const FLAG = `users/${UID}/taskFlags/no_response_close:${QID}`;

/** the store as a plain object, for whole-store comparisons */
const dump = () => Object.fromEntries([...fakeStore.docs.entries()].sort(([a], [b]) => a.localeCompare(b)));

function seedBefore() {
  fakeStore.docs.set(Q, { id: QID, status: "Queried", nudgeDate: "2026-11-01", agentId: "a1" });
  fakeStore.docs.set(row("r1"), { type: "Queried", resultingStatus: "Queried" });
  fakeStore.docs.set(row("n1"), { type: "nudge" });
  fakeStore.docs.set(feed("r1"), { queryId: QID, resultingStatus: "Queried" });
  fakeStore.docs.set(feed("n1"), { queryId: QID, activityType: "Nudge sent" });
  fakeStore.docs.set(FLAG, { queryId: QID, snoozedUntil: "2026-12-01" });
  fakeStore.docs.set(`users/${UID}/queries/other`, { id: "other", status: "Queried" });
}

/** what a close does to it: a new rung and feed row, the status and fields changed, a flag rewritten */
function applyClose() {
  fakeStore.docs.set(Q, { id: QID, status: "No Response", agentId: "a1", closingReason: "No response" });
  fakeStore.docs.set(row("c1"), { type: "No Response", resultingStatus: "No Response" });
  fakeStore.docs.set(feed("c1"), { queryId: QID, resultingStatus: "No Response" });
  fakeStore.docs.set(FLAG, { queryId: QID, resolvedAt: "2026-11-08" });
  fakeStore.docs.delete(feed("n1"));
}

/** reject the nth write the store sees, whatever its path */
const failNth = (n: number) => { let i = 0; fakeStore.failWhen(() => ++i === n); };

describe("restoreSnapshot — all or nothing", () => {
  beforeEach(() => { fakeStore.reset(); fakeReads.reset(); seedBefore(); });

  it("on success the query and everything with it match the snapshot exactly", async () => {
    const before = dump();
    const snap = await takeSnapshot(UID, [QID]);
    applyClose();
    await restoreSnapshot(snap);
    expect(dump()).toEqual(before);
  });

  it("the plan really has several writes (so the failure cases below can fail partway)", async () => {
    const snap = await takeSnapshot(UID, [QID]);
    applyClose();
    fakeStore.writes = [];
    await restoreSnapshot(snap);
    expect(fakeStore.writes.length).toBeGreaterThanOrEqual(5);
  });

  for (const n of [1, 2, 3, 4, 5]) {
    it(`a refused write at position ${n} leaves the query exactly as it was before Undo was pressed`, async () => {
      const snap = await takeSnapshot(UID, [QID]);
      applyClose();
      const afterSave = dump();
      failNth(n);
      await expect(restoreSnapshot(snap)).rejects.toBeInstanceOf(UndoFailedError);
      expect(dump()).toEqual(afterSave);
    });
  }

  it("a failed undo can be tried again from the same snapshot, and then it lands whole", async () => {
    const before = dump();
    const snap = await takeSnapshot(UID, [QID]);
    applyClose();
    failNth(3);
    await expect(restoreSnapshot(snap)).rejects.toThrow(/nothing was changed/i);
    fakeStore.failWhen(() => false);
    await restoreSnapshot(snap);
    expect(dump()).toEqual(before);
  });

  it("a failed read of the current state changes nothing", async () => {
    const snap = await takeSnapshot(UID, [QID]);
    applyClose();
    const afterSave = dump();
    fakeReads.failWhen((p) => p.endsWith("/activity"));
    await expect(restoreSnapshot(snap)).rejects.toBeInstanceOf(UndoFailedError);
    expect(dump()).toEqual(afterSave);
  });

  it("a plan bigger than one batch is refused before anything is written — never chunked", async () => {
    const snap = await takeSnapshot(UID, [QID]);
    for (let i = 0; i < RESTORE_BATCH_LIMIT + 1; i++) fakeStore.docs.set(row(`x${i}`), { type: "note" });
    const afterSave = dump();
    fakeStore.writes = [];
    await expect(restoreSnapshot(snap)).rejects.toThrow(/more than one batch/);
    expect(fakeStore.writes).toEqual([]);
    expect(dump()).toEqual(afterSave);
  });

  it("nothing to put back writes nothing", async () => {
    const snap = await takeSnapshot(UID, [QID]);
    fakeStore.writes = [];
    await restoreSnapshot(snap);
    expect(fakeStore.writes).toEqual([]);
  });
});
