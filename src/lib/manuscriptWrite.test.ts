/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Saves report what actually happened (timeline writer fix v1, Phase 2): a manuscript save is
 * decided by the manuscript write alone. A missing feed entry after a landed save is missing
 * narration and nothing else, so it reports success and a retry never makes a second manuscript.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeStore, fakeFirestoreModule } from "../test/fakeFirestore";
vi.mock("firebase/firestore", () => fakeFirestoreModule);
import { createManuscript, updateManuscriptFields } from "./manuscriptWrite";
import { narrate } from "./narrate";
import { writeActivity } from "./activityWrite";
import { ActivityType, type Manuscript } from "../types";

const fs = {} as never;
const UID = "u1";
const MS_PREFIX = `users/${UID}/manuscripts/`;
const thrower = (e: unknown, op: string, path: string): never => { throw new Error(`Firestore ${op} failed at ${path}: ${String(e)}`); };
const payload = { title: "The Taloned Mr Ripley", genre: "Thriller", wordCount: 90000, status: "Querying" } as never;
/** The narration addManuscript writes — through the real feed writer. */
const narrateAdded = (ms: Manuscript) => writeActivity(fs, UID, {
  activityType: ActivityType.MANUSCRIPT_ADDED, description: `You added a new title ${ms.title} to your manuscripts`,
  manuscriptId: ms.id, queryId: "", date: new Date().toISOString(), details: "",
});
/** The narrator as it behaved before Phase 1: a failed feed write threw. */
const throwingNarrator = async () => { throw new Error("Firestore write failed at users/u1/activities/x"); };

/** What a form does: submit, and submit again if the first try did not report success. */
async function submitLikeTheForm(narrate: (ms: Manuscript) => Promise<unknown>) {
  const once = async () => { try { return await createManuscript(fs, UID, payload, narrate, thrower); } catch { return { success: false }; } };
  const first = await once();
  return first.success ? first : once();
}

describe("createManuscript — the write behind addManuscript", () => {
  beforeEach(() => { fakeStore.reset(); vi.spyOn(console, "error").mockImplementation(() => {}); });

  it("the feed write fails after the manuscript landed → success, exactly one manuscript", async () => {
    fakeStore.failWhen((p) => p.includes("/activities/"));
    const r = await createManuscript(fs, UID, payload, narrateAdded, thrower);
    expect(r.success).toBe(true);
    expect(fakeStore.count(MS_PREFIX)).toBe(1);
  });

  it("even a narrator that throws cannot turn a landed save into a failure", async () => {
    const r = await createManuscript(fs, UID, payload, throwingNarrator, thrower);
    expect(r.success).toBe(true);
    expect(fakeStore.count(MS_PREFIX)).toBe(1);
  });

  it("a form that retries on a reported failure still ends with exactly one manuscript", async () => {
    await submitLikeTheForm(throwingNarrator);
    expect(fakeStore.count(MS_PREFIX)).toBe(1);
  });

  it("a retry with the same id rewrites the same document", async () => {
    fakeStore.failWhen((p) => p.includes("/activities/"));
    await createManuscript(fs, UID, { ...(payload as object), id: "ms-fixed" } as never, narrateAdded, thrower).catch(() => {});
    await createManuscript(fs, UID, { ...(payload as object), id: "ms-fixed" } as never, narrateAdded, thrower).catch(() => {});
    expect(fakeStore.count(MS_PREFIX)).toBe(1);
  });

  it("the manuscript write itself failing is still a failure, and nothing lands", async () => {
    fakeStore.failWhen((p) => p.startsWith(MS_PREFIX));
    await expect(createManuscript(fs, UID, payload, narrateAdded, thrower)).rejects.toThrow(/manuscripts/);
    expect(fakeStore.count(MS_PREFIX)).toBe(0);
  });
});

describe("updateManuscriptFields — the write behind updateManuscript", () => {
  beforeEach(() => { fakeStore.reset(); vi.spyOn(console, "error").mockImplementation(() => {}); fakeStore.docs.set(`${MS_PREFIX}m1`, { id: "m1", title: "Old" }); });

  it("a failed update narrates nothing", async () => {
    fakeStore.failWhen((p) => p.startsWith(MS_PREFIX));
    let narrated = 0;
    await expect(updateManuscriptFields(fs, UID, "m1", { title: "New" }, async () => { narrated++; }, thrower)).rejects.toThrow();
    expect(narrated).toBe(0);
  });

  it("the feed write fails after the update landed → resolves, and the update stands", async () => {
    await expect(updateManuscriptFields(fs, UID, "m1", { title: "New" }, throwingNarrator, thrower)).resolves.toBe(true);
    expect(fakeStore.docs.get(`${MS_PREFIX}m1`)?.title).toBe("New");
  });
});

describe("narrate — the guard addAgent and updateAgent share", () => {
  beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
  it("a narrator that throws resolves, and says so", async () => {
    await expect(narrate(throwingNarrator, "agent a1 added")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("agent a1 added"));
  });
  it("a narrator that resolves { success: false } resolves, and says so", async () => {
    await expect(narrate(async () => ({ success: false, error: "Failed to persist activity." }), "agent a1 updated")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to persist activity."));
  });
});
