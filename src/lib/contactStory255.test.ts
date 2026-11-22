import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { heardWords, replyScale, storyRows, waitBar, waitWords } from "./contactStory255";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 27, 12);
const row = (status: QueryStatus, court: QcRow["court"], spans: { status: QueryStatus; startMs: number }[], extra: Partial<QcRow> = {}): QcRow =>
  ({ id: "q1", status, court, sentMs: spans[0]?.startMs ?? null, stageStartMs: spans[spans.length - 1]?.startMs ?? null, expectedMs: null, dayN: 10,
    history: { spans: spans.map((s, i) => ({ ...s, endMs: null, current: i === spans.length - 1 })), dated: true }, query: {}, ...extra } as unknown as QcRow);

describe("Contact list v25.5 — the reply scale", () => {
  it("fills {reply weeks} of twelve, all twelve over 12, and says the policy", () => {
    expect(replyScale({ responseTimeWeeks: 4, noResponseMeansNo: true })).toEqual({ filled: 4, bold: "Replies in about 4 weeks", policy: "no reply means no" });
    expect(replyScale({ responseTimeWeeks: 16 })?.filled).toBe(12);
    expect(replyScale({ responseTimeWeeks: 16 })?.bold).toBe("Replies in about 16 weeks");
    expect(replyScale({ responseTimeWeeks: 1, noResponseMeansNo: false })).toEqual({ filled: 1, bold: "Replies in about 1 week", policy: "always replies" });
    expect(replyScale({})).toBeNull();
  });
});

describe("Contact list v25.5 — the waiting bar", () => {
  const q = (weeks: number, status = QueryStatus.QUERIED) => row(status, "agent", [{ status, startMs: NOW - weeks * 7 * DAY - DAY }]);
  it("within the usual time: navy for each week waited, the rest empty", () => {
    const w = waitBar(q(3), 6, NOW)!;
    expect(w.blocks).toEqual(["navy", "navy", "navy", "empty", "empty", "empty"]);
    expect(w.past).toBe(0);
    expect(waitWords(w, "Rufus")).toEqual({ bold: "3 weeks", rest: "usually 6", late: false });
  });
  it("past it: rust for each week past, capped at twice the reply time", () => {
    const w = waitBar(q(8), 6, NOW)!;
    expect(w.blocks.length).toBe(8);
    expect(w.past).toBe(2);
    expect(waitWords(w, "Rufus")).toEqual({ bold: "8 weeks", rest: "past Rufus’s usual 6", late: true });
    const cap = waitBar(q(30), 6, NOW)!;
    expect(cap.blocks.length).toBe(12);
    expect(cap.past).toBe(6);
  });
  it("only while waiting; with no reply time, the caption alone", () => {
    expect(waitBar(q(3, QueryStatus.OFFER), 6, NOW)).toBeNull();
    expect(waitBar(q(3, QueryStatus.PARTIAL_REQUESTED), 6, NOW)).toBeNull();
    expect(waitBar(q(3, QueryStatus.FULL_SENT), 6, NOW)?.blocks.length).toBe(6);
    const none = waitBar(q(3), null, NOW)!;
    expect(none.blocks).toEqual([]);
    expect(waitWords(none, "Rufus")).toEqual({ bold: "3 weeks", rest: null, late: false });
  });
});

describe("Contact list v25.5 — the story", () => {
  it("the stored steps in order, the current one marked, the writer's next step last", () => {
    const r = row(QueryStatus.OFFER, "offer", [
      { status: QueryStatus.QUERIED, startMs: Date.UTC(2026, 3, 1) }, { status: QueryStatus.FULL_REQUESTED, startMs: Date.UTC(2026, 3, 19) },
      { status: QueryStatus.FULL_SENT, startMs: Date.UTC(2026, 4, 14) }, { status: QueryStatus.OFFER, startMs: Date.UTC(2026, 5, 15) },
    ], { expectedMs: Date.UTC(2026, 9, 30) });
    const s = storyRows(r, [], null, NOW);
    expect(s.map((x) => (x.kind === "step" || x.kind === "next" ? `${x.label}|${x.date}` : x.kind))).toEqual([
      "Query sent|1 Apr", "Full requested|19 Apr", "Full sent|14 May", "Offer|15 Jun", "Decide on offer|30 Oct",
    ]);
    expect(s.filter((x) => x.kind === "step" && x.current).length).toBe(1);
  });
  it("a nudge sits among the steps by date; a closed query ends on its close with the agent's words", () => {
    const r = row(QueryStatus.REJECTED, "closed", [
      { status: QueryStatus.QUERIED, startMs: Date.UTC(2026, 3, 1) }, { status: QueryStatus.REJECTED, startMs: Date.UTC(2026, 5, 1) },
    ]);
    const s = storyRows(r, [Date.UTC(2026, 4, 10)], "Not for me, sorry.", NOW);
    expect(s.map((x) => x.kind)).toEqual(["step", "nudge", "step", "quote"]);
    expect(s.some((x) => x.kind === "next")).toBe(false);
  });
  it("heard back, or waiting", () => {
    expect(heardWords([{ status: QueryStatus.QUERIED, court: "agent" }])).toBe("waiting to hear back");
    expect(heardWords([{ status: QueryStatus.PARTIAL_REQUESTED, court: "you" }])).toBe("heard back");
    expect(heardWords([{ status: QueryStatus.NO_RESPONSE, court: "closed" }])).toBe("closed with no reply");
    expect(heardWords([])).toBeNull();
  });
});
