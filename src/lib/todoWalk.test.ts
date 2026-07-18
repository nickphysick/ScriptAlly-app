import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { choosePicks, rolledOverCards, todayProgress, walkStepKind, isStageable, applyStaged, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, assumedSendItem, quickSendPayload, quickNudgePayload, receiptLine, journeyEventISO, DEFAULT_CHECKBACK_DAYS, StagedPayload, StagedHandlers, pillState, pillAria } from "./todoWalk";
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
  close: async () => {},
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
  it("nudgeWriteArgs carries the picked day AS the event date (P1 — it was display-only); method stays display-only", () => {
    const NOW = "2026-07-16T09:00:00.000Z";
    const p: Extract<StagedPayload, { kind: "nudge" }> = { kind: "nudge", cardKey: "n", queryId: "q1", checkBackDate: "2026-08-01T00:00:00.000Z", note: "hi", nudgeDate: "2026-07-10", method: "Email" };
    const [id, args] = nudgeWriteArgs(p, NOW);
    expect(id).toBe("q1");
    expect(args.checkBackDate).toBe("2026-08-01T00:00:00.000Z");
    expect(args.note).toBe("hi");
    expect(args.eventDate).toBe(journeyEventISO("2026-07-10", NOW)); // the shared noon rule, one source
    expect("method" in args).toBe(false);
    // no day picked → the event is the write moment
    expect(nudgeWriteArgs({ kind: "nudge", cardKey: "n", queryId: "q1", checkBackDate: "2026-08-01" }, NOW)[1].eventDate).toBe(NOW);
  });
});

describe("journeyEventISO — THE journey timestamp rule (P1)", () => {
  const NOW = "2026-07-16T09:30:00.000Z";
  it("no day picked → now, verbatim", () => {
    expect(journeyEventISO(undefined, NOW)).toBe(NOW);
    expect(journeyEventISO("", NOW)).toBe(NOW);
    expect(journeyEventISO("garbage", NOW)).toBe(NOW);
  });
  it("picking TODAY (the local day of now) → now, never noon", () => {
    const now = new Date(NOW);
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(journeyEventISO(todayYmd, NOW)).toBe(NOW);
  });
  it("a back-dated day → that date at 12:00 NOON LOCAL — the local display day never shifts", () => {
    const out = new Date(journeyEventISO("2026-07-10", NOW));
    expect(out.getHours()).toBe(12);
    expect(out.getMinutes()).toBe(0);
    expect(out.getDate()).toBe(10);
    expect(out.getMonth()).toBe(6);
    expect(out.getFullYear()).toBe(2026);
  });
  it("timezone-boundary honesty: noon-local can never render as the previous/next local day (midnight-UTC can)", () => {
    // the artefact: a date-only parse is midnight UTC — in any non-zero offset the local clock
    // shows a different time (01:00 BST) and, west of Greenwich, the previous DAY entirely.
    const noon = new Date(journeyEventISO("2026-01-05", NOW)); // winter date — GMT/BST both covered
    expect(noon.getDate()).toBe(5);
    expect(noon.getHours()).toBe(12);
    expect(noon.getHours()).not.toBe(0);
  });
});

describe("materialOptsForTask — the request's tick-list", () => {
  it("maps each request type", () => {
    expect(materialOptsForTask("partial_requested")).toEqual(["First pages", "Synopsis", "Covering email"]);
    expect(materialOptsForTask("revise_resubmit")).toEqual(["Revised manuscript", "Revision letter"]);
    expect(materialOptsForTask("full_requested")).toEqual(["Full manuscript", "Synopsis", "Covering email"]);
  });
});

describe("quick-✓ — one write path, stated defaults", () => {
  const NOW = "2026-07-16T09:00:00.000Z";

  it("quick send = today · the query's method (else Email) · everything they asked for", () => {
    const p = quickSendPayload({ cardKey: "k", taskType: "full_requested", queryId: "q1", targetStatus: QueryStatus.FULL_SENT, isResubmit: false, method: null, nowIso: NOW });
    expect(p.sentDate).toBe(NOW);
    expect(p.method).toBe("Email");
    expect(p.materials).toEqual(materialOptsForTask("full_requested"));
    expect(quickSendPayload({ cardKey: "k", taskType: "full_requested", queryId: "q1", targetStatus: QueryStatus.FULL_SENT, isResubmit: false, method: "QueryManager", nowIso: NOW }).method).toBe("QueryManager");
  });

  it("quick-✓ writes BYTE-IDENTICAL args to the journey with the same inputs", () => {
    const quick = quickSendPayload({ cardKey: "k", taskType: "full_requested", queryId: "q1", targetStatus: QueryStatus.FULL_SENT, isResubmit: false, method: "Email", nowIso: NOW });
    const journey: StagedPayload = { kind: "mark-sent", cardKey: "k", queryId: "q1", targetStatus: QueryStatus.FULL_SENT, sentDate: NOW, isResubmit: false, method: "Email", materials: ["Full manuscript", "Synopsis", "Covering email"] };
    expect(markSentWriteArgs(quick)).toEqual(markSentWriteArgs(journey as Extract<StagedPayload, { kind: "mark-sent" }>));
  });

  it("quick nudge defaults: check-back +14 days, today's date, Email", () => {
    const p = quickNudgePayload({ cardKey: "k", queryId: "q1", nowIso: NOW });
    expect(new Date(p.checkBackDate).getTime() - new Date(NOW).getTime()).toBe(DEFAULT_CHECKBACK_DAYS * 86400000);
    expect(p.nudgeDate).toBe("2026-07-16");
    expect(p.method).toBe("Email");
    // the quick nudge's day IS today → the event date is the write moment (the helper's now-path)
    expect(nudgeWriteArgs(p, NOW)).toEqual(["q1", { checkBackDate: p.checkBackDate, eventDate: NOW }]);
  });
});

describe("receiptLine — the receipt derives from the actual payload", () => {
  const TODAY = "2026-07-16";
  const send = quickSendPayload({ cardKey: "k", taskType: "full_requested", queryId: "q1", targetStatus: QueryStatus.FULL_SENT, isResubmit: false, method: "Email", nowIso: "2026-07-16T09:00:00.000Z" });

  it("full set → 'everything they asked for'; today reads as today", () => {
    expect(receiptLine(send, TODAY, materialOptsForTask("full_requested"))).toBe("Logged: today (16 Jul) · via email · everything they asked for.");
  });
  it("a subset lists what was actually logged", () => {
    const partial = { ...send, materials: ["Synopsis"] };
    expect(receiptLine(partial, TODAY, materialOptsForTask("full_requested"))).toBe("Logged: today (16 Jul) · via email · Synopsis.");
  });
  it("a changed method changes the line (never a hardcoded claim)", () => {
    const qm = { ...send, method: "QueryManager" };
    expect(receiptLine(qm, TODAY, materialOptsForTask("full_requested"))).toContain("via querymanager");
  });
  it("nudge line carries the check-back", () => {
    const n = quickNudgePayload({ cardKey: "k", queryId: "q1", nowIso: "2026-07-16T09:00:00.000Z" });
    expect(receiptLine(n, TODAY)).toBe("Logged: today (16 Jul) · via email · check back 30 Jul.");
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

describe("assumedSendItem — the one-tap confirm's pre-confirmed item (P2)", () => {
  it("full: the full manuscript, what they requested; extras = the rest + Something else", () => {
    const a = assumedSendItem("full_requested", undefined, "Daniel");
    expect(a.label).toBe("Full manuscript");
    expect(a.sub).toBe("what Daniel requested");
    expect(a.extras).toEqual(["Synopsis", "Covering email", "Something else"]);
  });
  it("partial seeds the sample from the agent's OWN materials list where held", () => {
    const a = assumedSendItem("partial_requested", ["Query Letter", "Sample Pages"], "Priya");
    expect(a.label).toBe("Sample Pages");
    expect(a.sub).toBe("what Priya requested");
    expect(a.extras).toEqual(["Synopsis", "Covering email", "Something else"]);
  });
  it("partial with no held list never invents specifics", () => {
    const a = assumedSendItem("partial_requested", undefined, "Priya");
    expect(a.label).toBe("Partial");
    expect(a.sub).toBe("the sample Priya asked for");
    expect(a.extras).toEqual(["Synopsis", "Covering email", "Something else"]);
  });
  it("R&R assumes the revised manuscript", () => {
    const a = assumedSendItem("revise_resubmit", undefined, "Tom");
    expect(a.label).toBe("Revised manuscript");
    expect(a.extras).toEqual(["Revision letter", "Something else"]);
  });
});

describe("one-tap default — the write is byte-identical (P2)", () => {
  const NOW = "2026-07-17T10:00:00.000Z";
  it("the default path's write args equal the old fully-ticked equivalent (materials are audit-only)", () => {
    const oneTap: Extract<StagedPayload, { kind: "mark-sent" }> = {
      kind: "mark-sent", cardKey: "k", queryId: "q1", targetStatus: QueryStatus.FULL_SENT,
      sentDate: journeyEventISO(undefined, NOW), isResubmit: false, method: "Email",
      materials: ["Full manuscript"], // the assumed item only — no untrue extras
    };
    const oldFullyTicked: Extract<StagedPayload, { kind: "mark-sent" }> = {
      kind: "mark-sent", cardKey: "k", queryId: "q1", targetStatus: QueryStatus.FULL_SENT,
      sentDate: NOW, isResubmit: false, method: "Email",
      materials: ["Full manuscript", "Synopsis", "Covering email"],
    };
    expect(markSentWriteArgs(oneTap)).toEqual(markSentWriteArgs(oldFullyTicked));
  });
  it("the extras path carries assumed + ticked extras in the audit payload", () => {
    const a = assumedSendItem("full_requested", undefined, "D");
    const ticked = { Synopsis: true };
    const materials = [a.label, ...a.extras.filter((m) => (ticked as Record<string, boolean>)[m])];
    expect(materials).toEqual(["Full manuscript", "Synopsis"]);
  });
});

describe("staged close — the Sunday review's deferred stale-close (finishing P3)", () => {
  it("routes to the close handler at apply time only; per-item isolation holds", async () => {
    const seen: string[] = [];
    const res = await applyStaged(
      [
        { kind: "close", cardKey: "rv-close-q1", queryId: "q1", prevStatus: QueryStatus.QUERIED },
        { kind: "close", cardKey: "rv-close-q2", queryId: "q2", prevStatus: QueryStatus.FULL_SENT },
      ],
      HANDLERS({ close: async (p) => { if (p.queryId === "q2") throw new Error("boom"); seen.push(p.queryId); } }),
    );
    expect(seen).toEqual(["q1"]);
    expect(res.ok).toEqual(["rv-close-q1"]);
    expect(res.failed).toEqual(["rv-close-q2"]);
  });
});

describe("pillState — the corner pill's three truthful states (corner pack P2)", () => {
  it("committed > 0 → LIST, even with cleared = 0 (0/{n}, 0%, {n} to go)", () => {
    expect(pillState(6, 0)).toEqual({ kind: "list", done: 0, committed: 6, pct: 0, toGo: 6 });
    expect(pillState(6, 2)).toEqual({ kind: "list", done: 2, committed: 6, pct: 33, toGo: 4 });
  });
  it("single-source: done is the cleared union — quick-✓s outnumbering list items still count (cap 100%, toGo floors at 0)", () => {
    expect(pillState(3, 5)).toEqual({ kind: "list", done: 5, committed: 3, pct: 100, toGo: 0 }); // 5 cleared, 3 committed
  });
  it("committed = 0, cleared > 0 → DONE ({n} done today)", () => {
    expect(pillState(0, 3)).toEqual({ kind: "done", done: 3 });
  });
  it("nothing committed, nothing cleared → FRESH", () => {
    expect(pillState(0, 0)).toEqual({ kind: "fresh" });
  });
  it("strict priority: committed always wins over cleared", () => {
    expect(pillState(2, 9).kind).toBe("list");
    expect(pillState(0, 9).kind).toBe("done");
  });
  it("no state ever yields a `-` or an undefined fraction — every state is a defined shape", () => {
    for (const [c, d] of [[0, 0], [0, 4], [5, 0], [5, 3], [2, 8]] as const) {
      const st = pillState(c, d);
      expect(["list", "done", "fresh"]).toContain(st.kind);
      if (st.kind === "list") { expect(Number.isFinite(st.pct)).toBe(true); expect(Number.isFinite(st.done)).toBe(true); }
    }
  });
  it("pillAria summarises each state", () => {
    expect(pillAria(pillState(6, 2))).toContain("2 of 6 done, 4 to go");
    expect(pillAria(pillState(0, 3))).toBe("3 done today");
    expect(pillAria(pillState(0, 0))).toContain("nothing committed");
  });
});
