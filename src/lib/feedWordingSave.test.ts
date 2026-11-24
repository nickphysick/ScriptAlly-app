/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1 — Part B, the writes: the agent card's save (`commitCardSave`) and the housekeeping sweep
 * (`saveHkRows`), run with the Firestore writes stubbed so the activities they write can be counted.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionStatus, type Agent } from "../types";

const written: Record<string, unknown>[] = [];
const deleted: string[] = [];
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async (ref: { path: string }) => { deleted.push(ref.path); }),
}));
vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./saveAgentEdits", () => ({ commitAgentEdits: vi.fn(async () => ({ ok: true })) }));
vi.mock("./agentCardSnapshot", () => ({ takeAgentSnapshot: vi.fn(async () => ({})), restoreAgentSnapshot: vi.fn(async () => {}) }));
vi.mock("./queryActions/snapshot", () => ({ takeSnapshot: vi.fn(async () => ({})), restoreSnapshot: vi.fn(async () => {}) }));
vi.mock("./activityWrite", () => ({
  writeActivity: vi.fn(async (_db: unknown, _uid: string, act: Record<string, unknown>) => { written.push(act); return { success: true, id: `act-${written.length}` }; }),
}));

import { commitCardSave } from "./agentCardSave";
import { saveHkRows } from "./hkSave";
import { HK_RULES, type HkGroup } from "./todoHousekeeping";

const AG = { id: "ag1", userId: "u", name: "Nadia Hussain", agency: "Hussain Literary", email: "", website: "", genres: [], mswlNotes: "Dark",
  starRating: 3, submissionStatus: SubmissionStatus.OPEN, submissionMethod: "Email", materialsWanted: [], dateAdded: "", lastCheckedDate: "", notes: "" } as unknown as Agent;
const save = (patch: Record<string, unknown>) => commitCardSave({ uid: "u", agent: AG, queries: [], patch, resolveTaskFlag: async () => {} });

beforeEach(() => { written.length = 0; deleted.length = 0; });

describe("the agent card's save path", () => {
  it("a save changing fit, wishlist and open status writes ONE activity", async () => {
    await save({ starRating: 5, mswlNotes: "Darker", submissionStatus: SubmissionStatus.CLOSED });
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({ activityType: "Agent Updated", changed: ["open", "fit", "wishlist"], subjectName: "Nadia Hussain" });
  });
  it("a notes-only save writes none", async () => {
    await save({ notes: "rang her" });
    expect(written).toHaveLength(0);
  });
  it("a save that changes nothing writes none", async () => {
    await save({ starRating: 3, mswlNotes: "Dark" });
    expect(written).toHaveLength(0);
  });
  it("its Undo takes the row back", async () => {
    const out = await save({ starRating: 5 });
    expect(await out.undo!()).toBe(true);
    expect(deleted).toEqual(["users/u/activities/act-1"]);
  });
});

describe("the housekeeping sweep", () => {
  const group = (n: number): HkGroup => ({ rule: "dq_mswl", meta: HK_RULES.dq_mswl, members: Array.from({ length: n }, (_, i) => ({ agentId: `ag${i}` })) } as unknown as HkGroup);
  const rows = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`ag${i}`, `wish ${i}`]));
  const run = async (n: number) => {
    const acts: Record<string, unknown>[] = [];
    const calls: { id: string; quiet: boolean }[] = [];
    const res = await saveHkRows(group(n), rows(n), {}, {}, "2026-11-24T10:00:00Z", {
      agents: [],
      updateAgent: async (id, _f, opts) => { calls.push({ id, quiet: !!opts?.quiet }); },
      resolveTaskFlag: () => {},
      addActivity: async (a) => { acts.push(a as unknown as Record<string, unknown>); },
      deleteActivity: async () => {},
    });
    return { acts, calls, res };
  };
  it("a sweep of 6 agents writes ONE activity, and each agent's own write is quiet", async () => {
    const { acts, calls } = await run(6);
    expect(acts).toHaveLength(1);
    expect(acts[0]).toMatchObject({ activityType: "Agent Updated", batchCount: 6, description: "You updated 6 agents' details" });
    expect(calls.every((c) => c.quiet)).toBe(true);
  });
  it("a sweep of 1 is an ordinary update (the agent's own row, no sweep row)", async () => {
    const { acts, calls } = await run(1);
    expect(acts).toHaveLength(0);
    expect(calls).toEqual([{ id: "ag0", quiet: false }]);
  });
});
