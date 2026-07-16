import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { choosePicks, rolledOverCards, todayProgress, walkStepKind, isStageable, applyStaged, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, StagedPayload, StagedHandlers } from "./todoWalk";
import { QueryStatus } from "../types";

const card = (key: string, over: Partial<BoardCard> = {}): BoardCard =>
  ({ key, stream: "do", title: "", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false, ...over } as BoardCard);

describe("choosePicks — the Help-me-pick rule", () => {
  const doCards = [card("d1"), card("d2"), card("d3"), card("d4"), card("d5")];
  const hkCards = [card("h1", { stream: "hk" }), card("h2", { stream: "hk" }), card("h3", { stream: "hk" })];

  it("takes ≤4 Do-next then tops up with ≤2 Housekeeping, capped at 5", () => {
    expect(choosePicks({ doCards, hkCards, committedCount: 0 })).toEqual(["d1", "d2", "d3", "d4", "h1"]);
  });
  it("respects remaining room (cap 5)", () => {
    expect(choosePicks({ doCards, hkCards, committedCount: 3 })).toEqual(["d1", "d2"]);
    expect(choosePicks({ doCards, hkCards, committedCount: 5 })).toEqual([]);
  });
  it("uses ≤3 Housekeeping when nothing urgent", () => {
    expect(choosePicks({ doCards: [], hkCards, committedCount: 0 })).toEqual(["h1", "h2", "h3"]);
  });
  it("never picks already-committed cards", () => {
    const someCommitted = [card("d1", { committed: true }), card("d2"), card("d3")];
    expect(choosePicks({ doCards: someCommitted, hkCards: [], committedCount: 1 })).toEqual(["d2", "d3"]);
  });
});

describe("todayProgress — empty list never claims done", () => {
  it("empty list → 0/0, no done, not filled", () => {
    expect(todayProgress(0, 0)).toEqual({ total: 0, done: 0, pct: 0, empty: true });
  });
  it("a globally-cleared item that wasn't committed to Today does not enter the ratio", () => {
    // 0 committed on the list, 0 completed FROM the list → still empty even though something cleared globally.
    expect(todayProgress(0, 0).empty).toBe(true);
  });
  it("N committed, M done → M/N", () => {
    expect(todayProgress(2, 1)).toEqual({ total: 3, done: 1, pct: 33, empty: false });
    expect(todayProgress(0, 2)).toEqual({ total: 2, done: 2, pct: 100, empty: false });
  });
});

describe("walkStepKind — staged (deferrable) vs open (immediate write)", () => {
  const c = (taskType?: string, userTaskId?: string): BoardCard =>
    ({ key: "k", stream: "do", title: "", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false, taskType, userTaskId } as BoardCard);
  it("mark-sent types (partial/full/R&R) stage", () => {
    expect(walkStepKind(c("partial_requested"))).toBe("mark-sent");
    expect(walkStepKind(c("full_requested"))).toBe("mark-sent");
    expect(walkStepKind(c("revise_resubmit"))).toBe("mark-sent");
  });
  it("nudge stages", () => expect(walkStepKind(c("nudge_overdue"))).toBe("nudge"));
  it("offer, housekeeping and user tasks OPEN (never staged)", () => {
    expect(walkStepKind(c("offer_received"))).toBe("open");
    expect(walkStepKind(c("data_quality_poor"))).toBe("open");
    expect(walkStepKind(c("no_response_close"))).toBe("open");
    expect(walkStepKind(c(undefined, "u1"))).toBe("open");
    expect(isStageable(c("offer_received"))).toBe(false);
    expect(isStageable(c("partial_requested"))).toBe(true);
  });
});

const HANDLERS = (over: Partial<StagedHandlers> = {}): StagedHandlers => ({
  markSent: async () => {},
  nudge: async () => {},
  snooze: async () => {},
  muteItem: async () => {},
  muteRule: async () => {},
  ...over,
});

describe("applyStaged — per-item failure isolation", () => {
  const mk = (cardKey: string): StagedPayload => ({ kind: "mark-sent", cardKey, queryId: "q", targetStatus: QueryStatus.FULL_SENT, sentDate: "2026-07-16", isResubmit: false });
  it("one failure doesn't abort the rest; reports ok + failed", async () => {
    const res = await applyStaged([mk("a"), mk("b"), mk("c")], HANDLERS({
      markSent: async (p) => { if (p.cardKey === "b") throw new Error("boom"); },
    }));
    expect(res.ok).toEqual(["a", "c"]);
    expect(res.failed).toEqual(["b"]);
  });
  it("routes every kind to its handler — captures AND stances", async () => {
    const seen: string[] = [];
    await applyStaged(
      [
        mk("a"),
        { kind: "nudge", cardKey: "n", queryId: "q", checkBackDate: "2026-08-01" },
        { kind: "snooze", cardKey: "s", taskType: "full_requested", relatedRecordId: "q", days: 7 },
        { kind: "mute-item", cardKey: "mi", taskType: "no_response_close", relatedRecordId: "q9" },
        { kind: "mute-rule", cardKey: "mr", rule: "dq_mswl" },
      ],
      HANDLERS({
        markSent: async () => { seen.push("mark"); },
        nudge: async () => { seen.push("nudge"); },
        snooze: async (p) => { seen.push(`snooze${p.days}`); },
        muteItem: async () => { seen.push("mute-item"); },
        muteRule: async (p) => { seen.push(`mute-rule:${p.rule}`); },
      }),
    );
    expect(seen).toEqual(["mark", "nudge", "snooze7", "mute-item", "mute-rule:dq_mswl"]);
  });
  it("hands the FULL payload to the handler — method + materials survive staging (review display)", async () => {
    const got: StagedPayload[] = [];
    const staged: StagedPayload = { kind: "mark-sent", cardKey: "a", queryId: "q", targetStatus: QueryStatus.PARTIAL_SENT, sentDate: "2026-07-16", isResubmit: false, method: "QueryManager", materials: ["First pages", "Synopsis"] };
    await applyStaged([staged], HANDLERS({ markSent: async (p) => { got.push(p); } }));
    expect(got[0]).toEqual(staged); // verbatim — nothing stripped between stage and apply
    expect((got[0] as Extract<StagedPayload, { kind: "mark-sent" }>).materials).toEqual(["First pages", "Synopsis"]);
  });
});

describe("one write path — the write-args builders strip audit fields identically for every caller", () => {
  it("markSentWriteArgs yields EXACTLY the recordMaterialsSent args (audit fields dropped)", () => {
    const p: Extract<StagedPayload, { kind: "mark-sent" }> = { kind: "mark-sent", cardKey: "a", label: "x", queryId: "q1", targetStatus: QueryStatus.FULL_SENT, sentDate: "2026-07-16T00:00:00.000Z", isResubmit: true, method: "Email", materials: ["Full manuscript"] };
    expect(markSentWriteArgs(p)).toEqual({ queryId: "q1", targetStatus: QueryStatus.FULL_SENT, sentDate: "2026-07-16T00:00:00.000Z", isResubmit: true });
  });
  it("nudgeWriteArgs yields EXACTLY the logNudge args (nudgeDate/method are display-only)", () => {
    const p: Extract<StagedPayload, { kind: "nudge" }> = { kind: "nudge", cardKey: "n", queryId: "q1", checkBackDate: "2026-08-01T00:00:00.000Z", note: "hi", nudgeDate: "2026-07-16", method: "Email" };
    expect(nudgeWriteArgs(p)).toEqual(["q1", { checkBackDate: "2026-08-01T00:00:00.000Z", note: "hi" }]);
    expect(nudgeWriteArgs({ kind: "nudge", cardKey: "n", queryId: "q1", checkBackDate: "2026-08-01" })).toEqual(["q1", { checkBackDate: "2026-08-01" }]);
  });
});

describe("materialOptsForTask — the request's tick-list", () => {
  it("maps each request type", () => {
    expect(materialOptsForTask("partial_requested")).toEqual(["First pages", "Synopsis", "Covering email"]);
    expect(materialOptsForTask("revise_resubmit")).toEqual(["Revised manuscript", "Revision letter"]);
    expect(materialOptsForTask("full_requested")).toEqual(["Full manuscript", "Synopsis", "Covering email"]);
  });
});

describe("rolledOverCards", () => {
  it("finds committed items from a previous day only", () => {
    const cards = [
      card("today", { committedDate: "2026-07-09" }),
      card("yesterday", { committedDate: "2026-07-08" }),
      card("uncommitted", {}),
    ];
    expect(rolledOverCards(cards, "2026-07-09").map((c) => c.key)).toEqual(["yesterday"]);
  });
});
