/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the dock's pure model (board+dock pack, Phase 4).
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { dockFlowKind, sendSpecFor, nextInQueue, stepQueue, nextLabel, dockQueue } from "./todoDock";

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

describe("the flow the work surface mounts is DERIVED from the card", () => {
  it("routes every kind to its own flow", () => {
    expect(dockFlowKind(card({ taskType: "full_requested" }))).toBe("agent-waiting");
    expect(dockFlowKind(card({ taskType: "partial_requested" }))).toBe("agent-waiting");
    expect(dockFlowKind(card({ taskType: "revise_resubmit" }))).toBe("agent-waiting");
    expect(dockFlowKind(card({ taskType: "nudge_overdue" }))).toBe("agent-waiting");
    expect(dockFlowKind(card({ taskType: "offer_received" }))).toBe("offer");
    expect(dockFlowKind(card({ taskType: "no_response_close" }))).toBe("stale");
    expect(dockFlowKind(card({ taskType: "data_quality_poor", hk: true }))).toBe("housekeeping");
  });

  it("a user task is its own flow, whatever else it looks like", () => {
    expect(dockFlowKind(card({ userTaskId: "u1", taskType: "user_task" }))).toBe("user-task");
  });
});

describe("⚠️ the send spec — what goes, and the status that follows, from ONE derivation", () => {
  it("answers a partial request with a partial, a full with a full", () => {
    expect(sendSpecFor(card({ taskType: "partial_requested" }))).toMatchObject({
      material: "partial", targetStatus: "Partial Sent", isResubmit: false,
    });
    expect(sendSpecFor(card({ taskType: "full_requested" }))).toMatchObject({
      material: "full", targetStatus: "Full Sent", isResubmit: false,
    });
  });

  it("an R&R resubmits the full, flagged — the primitive's revision bump depends on it", () => {
    expect(sendSpecFor(card({ taskType: "revise_resubmit" }))).toMatchObject({
      material: "full", targetStatus: "Full Sent", isResubmit: true,
    });
  });

  it("⚠️ material and targetStatus travel TOGETHER, so they cannot drift apart", () => {
    for (const t of ["partial_requested", "full_requested", "revise_resubmit"]) {
      const spec = sendSpecFor(card({ taskType: t }))!;
      expect(spec.targetStatus).toBe(spec.material === "partial" ? "Partial Sent" : "Full Sent");
    }
  });

  it("the ink act names what it records — never a bare 'Done'", () => {
    expect(sendSpecFor(card({ taskType: "full_requested" }))!.actLabel).toBe("Record the full as sent");
    expect(sendSpecFor(card({ taskType: "revise_resubmit" }))!.actLabel).toContain("resubmission");
  });

  it("returns null where there is nothing to send — a nudge is not a send", () => {
    expect(sendSpecFor(card({ taskType: "nudge_overdue" }))).toBeNull();
    expect(sendSpecFor(card({ userTaskId: "u1" }))).toBeNull();
  });
});

describe("the queue", () => {
  const q = [card({ key: "a" }), card({ key: "b" }), card({ key: "c" })];

  it("advances forward, and reports the end honestly", () => {
    expect(nextInQueue(q, "a")?.key).toBe("b");
    expect(nextInQueue(q, "c")).toBeNull();
  });

  it("↑↓ step and CLAMP rather than wrap — wrapping hides that you reached the end", () => {
    expect(stepQueue(q, "b", 1)?.key).toBe("c");
    expect(stepQueue(q, "b", -1)?.key).toBe("a");
    expect(stepQueue(q, "c", 1)).toBeNull();
    expect(stepQueue(q, "a", -1)).toBeNull();
  });

  it("a card no longer in the queue falls back to its head, never to nothing", () => {
    // the docked item can leave the queue under you — it was just completed
    expect(nextInQueue(q, "gone")?.key).toBe("a");
    expect(stepQueue(q, "gone", 1)?.key).toBe("a");
  });

  it("the NEXT line is absent at the end — no 'NEXT: undefined'", () => {
    expect(nextLabel(q[1])).toBe("NEXT: t");
    expect(nextLabel(null)).toBeNull();
  });

  it("⚠️ notes and finished work never enter the queue", () => {
    const mixed = [card({ key: "n", nature: "note" }), card({ key: "d", done: true }), card({ key: "w" })];
    expect(dockQueue(mixed).map((c) => c.key)).toEqual(["w"]);
  });
});
