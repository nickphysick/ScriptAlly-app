/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A nudge's Undo does not depend on the feed (undo and bulk close v1, Phase 3). It finds the nudge
 * by the row id `logNudge` returned and puts the query's nudge fields back from `prior`, in one batch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeStore } from "../test/fakeFirestore";
import { fakeFirestoreFull } from "../test/fakeFirestoreFull";
vi.mock("firebase/firestore", () => fakeFirestoreFull);
import { undoNudge } from "./nudgeUndo";

const fs = {} as never;
const UID = "u1", QID = "q1";
const Q = `users/${UID}/queries/${QID}`;
const row = (id: string) => `${Q}/activity/${id}`;
const feed = (id: string) => `users/${UID}/activities/${id}`;
const PRIOR = { nudgeDate: "2026-10-20T12:00:00.000Z", lastNudgeSentDate: "2026-10-01T12:00:00.000Z" };
const dump = () => Object.fromEntries([...fakeStore.docs.entries()].sort(([a], [b]) => a.localeCompare(b)));

/** an earlier nudge, then the one being undone (logNudge's batch, with or without its feed twin) */
function seed(withTwin: boolean) {
  fakeStore.docs.set(Q, { id: QID, status: "Queried", ...PRIOR });
  fakeStore.docs.set(row("act-old"), { type: "nudge" });
  fakeStore.docs.set(feed("act-old"), { queryId: QID, activityType: "Nudge sent", date: "2026-10-01T12:00:00.000Z" });
  const before = dump();
  fakeStore.docs.set(row("act-new"), { type: "nudge" });
  fakeStore.docs.set(Q, { ...fakeStore.docs.get(Q), nudgeDate: "2026-12-01T12:00:00.000Z", lastNudgeSentDate: "2026-11-08T12:00:00.000Z" });
  if (withTwin) fakeStore.docs.set(feed("act-new"), { queryId: QID, activityType: "Nudge sent", date: "2026-11-08T12:00:00.000Z" });
  return before;
}

describe("undoNudge", () => {
  beforeEach(() => { fakeStore.reset(); vi.spyOn(console, "error").mockImplementation(() => {}); });

  it("feed entry missing → the nudge is still removed and the previous nudge date is back", async () => {
    const before = seed(false);
    await undoNudge(fs, UID, QID, "act-new", PRIOR);
    expect(dump()).toEqual(before);
    expect(fakeStore.docs.has(row("act-old"))).toBe(true); // the earlier nudge is not touched
  });

  it("feed entry present → both the row and its twin are removed", async () => {
    const before = seed(true);
    await undoNudge(fs, UID, QID, "act-new", PRIOR);
    expect(fakeStore.docs.has(row("act-new"))).toBe(false);
    expect(fakeStore.docs.has(feed("act-new"))).toBe(false);
    expect(dump()).toEqual(before);
  });

  it("a first nudge: the fields go, and the task flag is released after the batch", async () => {
    fakeStore.docs.set(Q, { id: QID, status: "Queried", nudgeDate: "2026-12-01", lastNudgeSentDate: "2026-11-08" });
    fakeStore.docs.set(row("act-new"), { type: "nudge" });
    const releaseFlag = vi.fn(async () => {});
    await undoNudge(fs, UID, QID, "act-new", {}, { releaseFlag });
    expect(fakeStore.docs.get(Q)).toEqual({ id: QID, status: "Queried" });
    expect(releaseFlag).toHaveBeenCalledOnce();
  });

  it("a refused write changes nothing — the batch is all or nothing", async () => {
    seed(true);
    const afterNudge = dump();
    fakeStore.failWhen((p) => p === Q);
    await expect(undoNudge(fs, UID, QID, "act-new", PRIOR)).rejects.toThrow();
    expect(dump()).toEqual(afterNudge);
  });
});
