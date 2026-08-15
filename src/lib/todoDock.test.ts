/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the dock's pure model (board+dock pack, Phase 4).
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { dockFlowKind, sendSpecFor, nextInQueue, stepQueue, nextLabel, dockQueue, resolveDocked, timelineRing } from "./todoDock";
import { QueryStatus } from "../types";

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

/**
 * ⚠️ THE SNAPSHOT IS RETIRED, AND THIS IS THE BUG IT WOULD HAVE CAUGHT (rail + workspace, P5).
 *
 * The pane used to hold its own copy of the queue, taken when it opened. Harmless while the dock
 * REPLACED the list; a live divergence the moment the rail stood beside it — snooze the docked
 * card from the rail and it left the rail while the pane kept showing it and kept counting it in
 * "30 to work through". One list, one selection into it, and the selection resolves at read time.
 */
describe("⚠️ THE DOCKED CARD IS RESOLVED FROM THE LIVE LIST, never from a stored copy", () => {
  const q = [card({ key: "a" }), card({ key: "b" }), card({ key: "c" })];

  it("while the key is present it IS the answer, and its position is remembered in passing", () => {
    expect(resolveDocked(q, "b", 0)).toEqual({ card: q[1], pos: 1 });
    expect(resolveDocked(q, "a", 2)).toEqual({ card: q[0], pos: 0 });
  });

  /**
   * ⚠️ THE CASE THE SNAPSHOT HID. You are working on `b` and you snooze it from the rail. It
   * leaves the list; the pane must advance to whatever now occupies its position — `c`, which has
   * shuffled up — rather than showing a card that is no longer outstanding.
   */
  it("⚠️ THE DOCKED CARD SNOOZED FROM THE RAIL: the pane takes what now occupies its position", () => {
    const after = [card({ key: "a" }), card({ key: "c" })];   // `b` is gone
    const { card: shown } = resolveDocked(after, "b", 1);
    expect(shown?.key).toBe("c");
  });

  it("⚠️ PAST THE END CLAMPS TO THE LAST CARD — never back to the first", () => {
    /* You were on the LAST card and it left. The one before it is what remains; jumping to the
       top of the list because a row vanished under you is the worse failure, and it is exactly
       what a naive `?? queue[0]` produces. */
    const after = [card({ key: "a" }), card({ key: "b" })];   // `c` was last and is gone
    expect(resolveDocked(after, "c", 2).card?.key).toBe("b");
    /* and the same when the list has shrunk by more than one */
    expect(resolveDocked([card({ key: "a" })], "c", 2).card?.key).toBe("a");
  });

  it("⚠️ AN EMPTY LIST YIELDS NOTHING — the pane closes, which is not the pane being cleared", () => {
    expect(resolveDocked([], "b", 1).card).toBeNull();
    expect(resolveDocked(q, null, 0).card).toBeNull();
  });

  it("a nonsense position cannot escape the list", () => {
    expect(resolveDocked(q, "gone", -5).card?.key).toBe("a");
    expect(resolveDocked(q, "gone", 99).card?.key).toBe("c");
  });

  it("⚠️ IT NEVER INVENTS A POSITION when it has no card to report one for", () => {
    /* The hint must survive an empty read unchanged, or a list that briefly empties would reset
       the reader to the top when it refilled. */
    expect(resolveDocked([], "b", 7).pos).toBe(7);
  });
});

/* ── §3.5 — THE RING ──────────────────────────────────────────────────────────────────────────
   ⚠️ THE STATUSES ARE THE `QueryStatus` ENUM'S OWN MEMBERS, never hand-typed strings. `recordResponse`
   writes `resultingStatus` from that enum, so an argument spelled by hand here would be testing a
   value the system cannot produce — and would go green the day a member was renamed. */
describe("timelineRing — the direction the record pointed, from StatusDot's own classifier", () => {
  it("outgoing is something of yours leaving", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.OFFER]) {
      expect(timelineRing(s, false), String(s)).toBe("out");
    }
  });

  it("incoming is the agency asking for something", () => {
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) {
      expect(timelineRing(s, false), String(s)).toBe("in");
    }
  });

  it("⚠️ THE LAST RUNG IS `now` WHATEVER DIRECTION IT POINTED — it is where the record stands", () => {
    expect(timelineRing(QueryStatus.FULL_SENT, true)).toBe("now");
    expect(timelineRing(QueryStatus.FULL_REQUESTED, true)).toBe("now");
    expect(timelineRing(QueryStatus.REJECTED, true)).toBe("now");
    /* and an entry with no status at all still marks the rung it is */
    expect(timelineRing(undefined, true)).toBe("now");
  });

  it("⚠️ A CLOSED DIRECTION MID-HISTORY TAKES THE NEUTRAL RING, not one of the other two", () => {
    /* §3.5 names three treatments. A rejection is neither outgoing nor incoming, and borrowing
       either colour would state a direction the event did not have. */
    for (const s of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(timelineRing(s, false), String(s)).toBeUndefined();
    }
  });

  it("a row the record left silent carries no ring rather than a guessed one", () => {
    expect(timelineRing(undefined, false)).toBeUndefined();
    expect(timelineRing("", false)).toBeUndefined();
    expect(timelineRing(null, false)).toBeUndefined();
  });
});
