/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A nudge and its date land together (timeline writer fix v1, Phase 3). The authoritative
 * per-query row and the query's nudge fields are ONE batch; the feed twin and the task flag come
 * after it and cannot fail the nudge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeStore, fakeFirestoreModule } from "../test/fakeFirestore";
vi.mock("firebase/firestore", () => fakeFirestoreModule);
import { commitNudge } from "./nudgeWrite";
import { writeActivity } from "./activityWrite";
import { buildNudgeWrites } from "./logNudge";
import { ActivityType, QueryStatus, type Query } from "../types";

const fs = {} as never;
const UID = "u1", QID = "q1", ACT = "act-n1";
const ROW = `users/${UID}/queries/${QID}/activity/${ACT}`;
const QDOC = `users/${UID}/queries/${QID}`;
const FEED = `users/${UID}/activities/${ACT}`;
const FLAG = `users/${UID}/taskFlags/nudge`;
const q = { id: QID, agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-09-01T12:00:00.000Z" } as unknown as Query;
const writes = buildNudgeWrites(q, null, { checkBackDate: "2026-12-01T12:00:00.000Z" }, new Date("2026-11-08T12:00:00.000Z"));
const twin = () => writeActivity(fs, UID, { ...writes.activity, id: ACT });
const flag = async () => { fakeStore.writes.push(FLAG); if (fakeStore.failing(FLAG)) throw new Error("flag denied"); fakeStore.docs.set(FLAG, { snoozedUntil: "x" }); };
/** The feed twin as it behaved before Phase 1: a failed write threw. */
const throwingTwin = async () => { throw new Error(`Firestore write failed at ${FEED}`); };
const run = (writeTwin = twin) => commitNudge(fs, UID, QID, ACT, writes, { writeTwin, writeFlag: flag });
const nudgeDate = () => fakeStore.docs.get(QDOC)?.nudgeDate;

describe("commitNudge — the writes behind logNudge", () => {
  beforeEach(() => {
    fakeStore.reset();
    fakeStore.docs.set(QDOC, { id: QID, status: QueryStatus.QUERIED });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("the fixture's nudge does set a date (so the checks below can see it)", () => {
    expect(writes.queryUpdates.nudgeDate).toBe("2026-12-01T12:00:00.000Z");
    expect(writes.activity.activityType).toBe(ActivityType.NUDGE_SENT);
  });

  it("all writes land → the row, the date, the twin and the flag are present", async () => {
    await expect(run()).resolves.toMatchObject({ success: true });
    expect(fakeStore.docs.has(ROW)).toBe(true);
    expect(nudgeDate()).toBe("2026-12-01T12:00:00.000Z");
    expect(fakeStore.docs.has(FEED)).toBe(true);
    expect(fakeStore.docs.has(FLAG)).toBe(true);
  });

  it("the feed write fails → the nudge row AND its date are present, and it is a success", async () => {
    await expect(run(throwingTwin)).resolves.toMatchObject({ success: true });
    expect(fakeStore.docs.has(ROW)).toBe(true);
    expect(nudgeDate()).toBe("2026-12-01T12:00:00.000Z");
  });

  it("the feed write fails through the real writer → the same", async () => {
    fakeStore.failWhen((p) => p === FEED);
    await expect(run()).resolves.toMatchObject({ success: true });
    expect(fakeStore.docs.has(ROW)).toBe(true);
    expect(nudgeDate()).toBe("2026-12-01T12:00:00.000Z");
  });

  it("the batch fails on the query's date → NEITHER the row nor the date, and it is a failure", async () => {
    fakeStore.failWhen((p) => p === QDOC);
    await expect(run()).resolves.toMatchObject({ success: false });
    expect(fakeStore.docs.has(ROW)).toBe(false);
    expect(nudgeDate()).toBeUndefined();
    expect(fakeStore.docs.has(FEED)).toBe(false);
  });

  it("the batch fails on the row → neither, and it is a failure", async () => {
    fakeStore.failWhen((p) => p === ROW);
    await expect(run()).resolves.toMatchObject({ success: false });
    expect(fakeStore.docs.has(ROW)).toBe(false);
    expect(nudgeDate()).toBeUndefined();
  });

  it("the task flag fails → the nudge and its date are present, it is a success, and it is logged", async () => {
    fakeStore.failWhen((p) => p === FLAG);
    await expect(run()).resolves.toMatchObject({ success: true });
    expect(fakeStore.docs.has(ROW)).toBe(true);
    expect(nudgeDate()).toBe("2026-12-01T12:00:00.000Z");
    expect(console.error).toHaveBeenCalled();
  });
});
