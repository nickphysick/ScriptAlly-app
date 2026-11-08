/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A bulk close reports what really happened to each query (undo and bulk close v1, Phase 2).
 * `closeOne` is the tray's per-query step: the save, and — when the save throws — a read-back that
 * decides whether the query is closed, needs putting back, or cannot be told.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeStore } from "../../test/fakeFirestore";
import { fakeFirestoreFull, fakeReads } from "../../test/fakeFirestoreFull";
vi.mock("firebase/firestore", () => fakeFirestoreFull);
vi.mock("../firebase", () => ({ db: {} }));
import { readCurrent, restoreSnapshot, takeSnapshot, type Snapshot } from "./snapshot";
import { bulkCloseMessage, closeOne } from "./bulkClose";

const UID = "u1", QID = "q1";
const Q = `users/${UID}/queries/${QID}`;
const dump = () => Object.fromEntries([...fakeStore.docs.entries()].sort(([a], [b]) => a.localeCompare(b)));

beforeEach(() => {
  fakeStore.reset(); fakeReads.reset();
  fakeStore.docs.set(Q, { id: QID, status: "Queried", nudgeDate: "2026-11-01" });
  fakeStore.docs.set(`${Q}/activity/r1`, { type: "Queried", resultingStatus: "Queried" });
  fakeStore.docs.set(`users/${UID}/activities/r1`, { queryId: QID, resultingStatus: "Queried" });
});

/** the close's writes as `saveClose` makes them, stopping with a throw after step `stopAfter` */
const saveThatStops = (stopAfter: 0 | 1 | 2 | 3 | 4) => async () => {
  const steps = [
    () => fakeStore.docs.set(Q, { ...fakeStore.docs.get(Q), closingReason: "No response after expected window" }),
    () => fakeStore.docs.set(`${Q}/activity/c1`, { type: "No Response", resultingStatus: "No Response" }),
    () => fakeStore.docs.set(Q, { ...fakeStore.docs.get(Q), status: "No Response" }), // the recompute
    () => fakeStore.docs.set(`users/${UID}/activities/c1`, { queryId: QID, resultingStatus: "No Response" }),
  ];
  steps.slice(0, stopAfter).forEach((s) => s());
  if (stopAfter < 4) throw new Error("PERMISSION_DENIED (write refused)");
  throw new Error("PERMISSION_DENIED (the nudge follow-up was refused)");
};

const run = (snap: Snapshot, save: () => Promise<void>) =>
  closeOne({ save, snap, queryPath: Q, readNow: () => readCurrent(snap), restore: restoreSnapshot, log: () => {} });

describe("closeOne — one query of a bulk close", () => {
  it("throws AFTER the close lands → counted closed, and its Undo reopens it", async () => {
    const before = dump();
    const snap = await takeSnapshot(UID, [QID]);
    const out = await run(snap, saveThatStops(4));
    expect(out).toEqual({ kind: "closed", followUpFailed: true });
    expect(fakeStore.docs.get(Q)?.status).toBe("No Response");
    await restoreSnapshot(snap); // the Undo the tray pushes for a closed query
    expect(dump()).toEqual(before);
  });

  it("throws BEFORE anything lands → counted failed, nothing changes", async () => {
    const before = dump();
    const snap = await takeSnapshot(UID, [QID]);
    expect(await run(snap, saveThatStops(0))).toEqual({ kind: "failed" });
    expect(dump()).toEqual(before);
  });

  for (const n of [1, 2] as const) {
    it(`throws MIDWAY (after ${n} write${n > 1 ? "s" : ""}) → rolled back and counted failed`, async () => {
      const before = dump();
      const snap = await takeSnapshot(UID, [QID]);
      expect(await run(snap, saveThatStops(n))).toEqual({ kind: "failed" });
      expect(dump()).toEqual(before);
    });
  }

  it("closed but the recompute threw (log closed, status not) → put back and counted failed", async () => {
    const before = dump();
    const snap = await takeSnapshot(UID, [QID]);
    const save = async () => {
      fakeStore.docs.set(`${Q}/activity/c1`, { type: "No Response", resultingStatus: "No Response" });
      throw new Error("recompute failed");
    };
    expect(await run(snap, save)).toEqual({ kind: "failed" });
    expect(dump()).toEqual(before);
  });

  it("the read-back fails → unknown, never failed or closed, and nothing is touched", async () => {
    const snap = await takeSnapshot(UID, [QID]);
    const save = saveThatStops(2);
    fakeReads.failWhen(() => true);
    const out = await run(snap, save);
    expect(out).toEqual({ kind: "unknown" });
  });

  it("the put-back fails → unknown (it may be half closed), and the snapshot can still put it back later", async () => {
    const before = dump();
    const snap = await takeSnapshot(UID, [QID]);
    const save = async () => { await saveThatStops(1)().catch(() => {}); fakeStore.failWhen(() => true); throw new Error("refused"); };
    expect(await run(snap, save)).toEqual({ kind: "unknown" });
    fakeStore.failWhen(() => false);
    await restoreSnapshot(snap);
    expect(dump()).toEqual(before);
  });

  it("a save that succeeds is closed", async () => {
    const snap = await takeSnapshot(UID, [QID]);
    expect(await run(snap, async () => {})).toEqual({ kind: "closed", followUpFailed: false });
  });
});

describe("bulkCloseMessage — counts only what really happened", () => {
  it("closed and failed", () => expect(bulkCloseMessage(4, 1, 0)).toBe("Closed 4 queries · Moved to Closed · 1 couldn't be closed"));
  it("one closed", () => expect(bulkCloseMessage(1, 0, 0)).toBe("Closed 1 query · Moved to Closed"));
  it("unknowns are named as unknown", () => expect(bulkCloseMessage(2, 0, 1)).toBe("Closed 2 queries · Moved to Closed · 1 couldn't be checked — look at it in the Query Centre"));
  it("none closed, none unknown → nothing changed", () => expect(bulkCloseMessage(0, 3, 0)).toBe("Couldn't close those queries. Nothing was changed."));
  it("none closed but some unknown never says nothing changed", () => {
    const m = bulkCloseMessage(0, 1, 2);
    expect(m).not.toMatch(/Nothing was changed/);
    expect(m).toMatch(/2 couldn't be checked/);
  });
});
