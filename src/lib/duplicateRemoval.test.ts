/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * REGRESSION GUARD — "remove one removes one" on the duplicates stage (Fix 4, commit 63917e0).
 *
 * The duplicates bug has bitten twice: clicking one "Remove this one" in a 3-way cluster collapses
 * more than the clicked record, and the unresolved remainder then leaks into the Agents stage as a
 * duplicate warning. Root cause (the second time): removing the cluster LEADER left its `mergeWith`
 * populated, so `buildClusters` read the still-open remainder as a completed "merge".
 *
 * These tests pin the contract so a future refactor of the duplicates flow can't silently break it
 * a third time: removing one member of a 3-way sets aside EXACTLY one, leaves the other two flagged
 * and open, never auto-collapses on the first removal, and the removed record is recoverable. If you
 * are reading this because a test here failed: you have reintroduced the "remove one removes two"
 * regression — do not loosen the assertion, fix the handler (src/lib/smartImportReviewModel.ts).
 */
import { describe, it, expect } from "vitest";
import {
  removeDuplicateRecord,
  buildClusters,
  type ReviewAgent,
  type ReviewQuery,
} from "./smartImportReviewModel";

// ── Builders ────────────────────────────────────────────────────────────────────────────────────
const agent = (id: string, over: Partial<ReviewAgent> = {}): ReviewAgent => ({
  id, name: `Name ${id}`, agency: "Carter & Vale", agencyOnly: false, genres: [], website: "",
  submissionsOpen: false, weeks: 1, rating: 0, reasons: [], mergeWith: [], mergeResolved: false,
  deleted: false, ...over,
});
const query = (id: string, agentRef: string): ReviewQuery => ({
  id, agentRef, status: undefined as never, sentDate: null, sentDateRaw: null, reasons: [], timeline: [],
  removed: false, notes: "",
} as unknown as ReviewQuery);

/** A 3-way cluster the way parseModel builds it: only the LEADER carries mergeWith + the dup reason. */
const threeWay = () => {
  const agents: ReviewAgent[] = [
    agent("L", { mergeWith: ["m1", "m2"], reasons: [{ kind: "duplicate", note: "x", resolved: false, undoable: true }] }),
    agent("m1"),
    agent("m2"),
  ];
  const queries: ReviewQuery[] = [query("qL", "L"), query("q1", "m1"), query("q2", "m2")];
  return { agents, queries };
};

const openClusters = (agents: ReviewAgent[]) => buildClusters(agents).filter((c) => c.type === "open");
const mergedClusters = (agents: ReviewAgent[]) => buildClusters(agents).filter((c) => c.type === "merge");

describe("duplicates · remove-one-only (Fix 4 regression guard)", () => {
  it("removing a NON-leader sets aside exactly one and leaves the cluster open with two", () => {
    const { agents, queries } = threeWay();
    const next = removeDuplicateRecord(agents, queries, "m1");

    expect(next.agents.filter((a) => a.deleted).map((a) => a.id)).toEqual(["m1"]); // exactly one
    expect(next.agents.find((a) => a.id === "m1")!.setAsideStage).toBe("duplicates"); // recoverable shelf
    const clusters = openClusters(next.agents);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].openMembers.map((m) => m.id).sort()).toEqual(["L", "m2"]); // two still open
    expect(mergedClusters(next.agents)).toHaveLength(0); // NOT collapsed/merged
    expect(next.agents.some((a) => a.mergeResolved)).toBe(false); // nothing auto-resolved
    expect(next.queries.find((q) => q.id === "q1")!.agentRef).toBe("L"); // queries consolidate onto keeper
  });

  it("removing the LEADER does NOT collapse the cluster — two stay open, one set aside", () => {
    // This is the exact case the regression broke: the removed leader used to keep its mergeWith.
    const { agents, queries } = threeWay();
    const next = removeDuplicateRecord(agents, queries, "L");

    expect(next.agents.filter((a) => a.deleted).map((a) => a.id)).toEqual(["L"]); // exactly one set aside
    expect(mergedClusters(next.agents)).toHaveLength(0); // <-- the collapse must not happen
    const clusters = openClusters(next.agents);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].openMembers.map((m) => m.id).sort()).toEqual(["m1", "m2"]); // the other two remain
    // a LIVE member re-anchors the open cluster (never the deleted record)
    expect(clusters[0].openMembers.every((m) => !m.deleted)).toBe(true);
    expect(next.agents.find((a) => a.id === "L")!.mergeWith).toEqual([]); // set-aside record can't anchor
    expect(next.agents.filter((a) => !a.deleted).some((a) => a.mergeResolved)).toBe(false); // not resolved yet
  });

  it("takes TWO deliberate removals to reach one keeper", () => {
    const { agents, queries } = threeWay();
    const after1 = removeDuplicateRecord(agents, queries, "m1");
    expect(after1.agents.filter((a) => !a.deleted && a.mergeWith.length > 0)).toHaveLength(1); // still a live cluster

    const after2 = removeDuplicateRecord(after1.agents, after1.queries, "m2");
    expect(after2.agents.filter((a) => a.deleted).map((a) => a.id).sort()).toEqual(["m1", "m2"]);
    const keeper = after2.agents.find((a) => !a.deleted)!;
    expect(keeper.id).toBe("L");
    expect(keeper.mergeResolved).toBe(true); // now resolved, down to one
    expect(openClusters(after2.agents)).toHaveLength(0); // no open cluster leaks onward to Agents
  });

  it("a removed record lands in the set-aside shelf and stays recoverable (deleted + stage)", () => {
    const { agents, queries } = threeWay();
    const next = removeDuplicateRecord(agents, queries, "L");
    const removed = next.agents.find((a) => a.id === "L")!;
    expect(removed.deleted).toBe(true);
    expect(removed.setAsideStage).toBe("duplicates");
  });
});
