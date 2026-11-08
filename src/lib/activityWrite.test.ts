/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * addActivity keeps its promise (timeline writer fix v1, Phase 1): a failed feed write resolves
 * `{ success: false }`; it never rejects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeStore, fakeFirestoreModule } from "../test/fakeFirestore";
vi.mock("firebase/firestore", () => fakeFirestoreModule);
import { writeActivity } from "./activityWrite";
import { ActivityType } from "../types";

const act = { activityType: ActivityType.MANUSCRIPT_ADDED, description: "d", manuscriptId: "m", queryId: "", date: "2026-11-08T00:00:00.000Z", details: "" };

describe("writeActivity — the feed write behind addActivity", () => {
  beforeEach(() => { fakeStore.reset(); vi.spyOn(console, "error").mockImplementation(() => {}); });

  it("writes the entry and resolves success", async () => {
    const r = await writeActivity({} as never, "u1", { ...act, id: "act-1" });
    expect(r).toEqual({ success: true, id: "act-1" });
    expect(fakeStore.docs.has("users/u1/activities/act-1")).toBe(true);
  });

  it("a failed write resolves { success: false } and does not reject", async () => {
    fakeStore.failWhen((p) => p.includes("/activities/"));
    const r = await writeActivity({} as never, "u1", { ...act, id: "act-2" });
    expect(r).toEqual({ success: false, id: "act-2", error: "Failed to persist activity." });
    expect(fakeStore.docs.size).toBe(0);
    // logged in handleFirestoreError's shape, without the throw
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^Firestore error \[write\] users\/u1\/activities\/act-2: PERMISSION_DENIED/));
  });
});
