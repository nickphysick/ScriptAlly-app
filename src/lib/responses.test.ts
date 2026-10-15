/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RS2 D1 — the Responses data layer: placement by the latest answer, the reply rate, the carousel's order, and a
 * personal note. Each assertion was run red first against its named mutation (reports/responses-v2/REPORT.md).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import {
  answerFoot, answerIndex, answerStand, carouselOrder, listNos, monthGroups, nextPinned, replyPct, replyRate, respCounts, respItem, respItems, saidLine, stillOut, tallyPlan, tallySince,
  type RespRowInput,
} from "./responses";

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();
const NOW = D(2026, 10, 12);

let n = 0;
function row(status: QueryStatus, o: Partial<RespRowInput> & { spans?: [QueryStatus, number][] } = {}): RespRowInput {
  const spans = (o.spans ?? []).map(([s, t], i, a) => ({ status: s, startMs: t, endMs: a[i + 1]?.[1] ?? null, current: i === a.length - 1 }));
  return {
    id: o.id ?? `q${++n}`, status, agentName: o.agentName ?? "Ann Bee", agency: o.agency ?? "Bee Agency", initials: "AB",
    sentMs: o.sentMs ?? spans[0]?.startMs ?? null, query: o.query ?? {},
    history: { spans, currentStartMs: spans[spans.length - 1]?.startMs ?? null, dated: true },
    expectedMs: o.expectedMs ?? null, expectedKind: o.expectedKind ?? null, dayN: o.dayN ?? null, furthest: o.furthest ?? "query",
  };
}

describe("RS2 D1 · placement by the latest answer", () => {
  it("a query asked for a partial and later passed is Passed, and only that", () => {
    const r = row(QueryStatus.REJECTED, { spans: [[QueryStatus.QUERIED, D(2026, 7, 1)], [QueryStatus.PARTIAL_REQUESTED, D(2026, 7, 20)], [QueryStatus.PARTIAL_SENT, D(2026, 7, 22)], [QueryStatus.REJECTED, D(2026, 8, 30)]], furthest: "partial" });
    const items = respItems([r]);
    expect(items).toHaveLength(1);
    expect(items[0].group).toBe("passed");
    expect(items[0].answerMs).toBe(D(2026, 8, 30));
    expect(items[0].waitDays).toBe(60);
    expect(saidLine(items[0]).text).toBe("Form reply, after a partial");
  });
  it("an offer and a revise-and-resubmit sit with Asked for more, and are the writer's move", () => {
    const offer = respItem(row(QueryStatus.OFFER, { spans: [[QueryStatus.QUERIED, D(2026, 6, 1)], [QueryStatus.OFFER, D(2026, 9, 1)]] }))!;
    const rr = respItem(row(QueryStatus.REVISE_RESUBMIT, { spans: [[QueryStatus.QUERIED, D(2026, 6, 1)], [QueryStatus.REVISE_RESUBMIT, D(2026, 9, 2)]] }))!;
    expect([offer.group, offer.state, offer.yourMove]).toEqual(["more", "offer", true]);
    expect([rr.group, rr.state, rr.yourMove]).toEqual(["more", "rr", true]);
  });
  it("a sent request is still Asked for more, with the agent; Queried, Withdrawn and Signed are not answers", () => {
    const sent = respItem(row(QueryStatus.FULL_SENT, { spans: [[QueryStatus.QUERIED, D(2026, 6, 1)], [QueryStatus.FULL_REQUESTED, D(2026, 8, 1)], [QueryStatus.FULL_SENT, D(2026, 8, 5)]] }))!;
    expect([sent.group, sent.answer, sent.state, sent.yourMove, sent.pagesSentMs, sent.answerMs]).toEqual(["more", "full", "sent", false, D(2026, 8, 5), D(2026, 8, 1)]);
    for (const s of [QueryStatus.QUERIED, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]) expect(respItem(row(s))).toBeNull();
  });
  it("a no reply is placed apart from a pass", () => {
    expect(respItem(row(QueryStatus.NO_RESPONSE))!.group).toBe("noReply");
  });
});

describe("RS2 D1 · the counts and the reply rate", () => {
  const items = respItems([
    row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.OFFER), row(QueryStatus.REJECTED), row(QueryStatus.REJECTED),
    row(QueryStatus.REJECTED), row(QueryStatus.NO_RESPONSE), row(QueryStatus.QUERIED),
  ]);
  it("answered is the sum of the three groups", () => {
    expect(respCounts(items)).toEqual({ more: 2, passed: 3, noReply: 1, answered: 6 });
  });
  it("reply rate = (more + passed) ÷ answered, and null with nothing answered", () => {
    expect(replyRate(respCounts(items))).toBeCloseTo(5 / 6);
    expect(replyPct(respCounts(items))).toBe(83);
    expect(replyRate(respCounts([]))).toBeNull();
  });
  it("still out counts only queries with no answer at all", () => {
    expect(stillOut([{ status: QueryStatus.QUERIED }, { status: QueryStatus.PARTIAL_SENT }, { status: QueryStatus.QUERIED }])).toBe(2);
  });
});

describe("RS2 D1 · the carousel's order", () => {
  it("your move first by soonest due, then the rest by soonest reply expected, ties newest answer first", () => {
    const a = row(QueryStatus.PARTIAL_SENT, { id: "sent-late", expectedMs: D(2026, 11, 1) });
    const b = row(QueryStatus.FULL_REQUESTED, { id: "send-soon", expectedMs: D(2026, 10, 20) });
    const c = row(QueryStatus.PARTIAL_REQUESTED, { id: "send-later", expectedMs: D(2026, 10, 30) });
    const d = row(QueryStatus.FULL_SENT, { id: "sent-soon", expectedMs: D(2026, 10, 25) });
    const e = row(QueryStatus.OFFER, { id: "offer-undated" });
    const f = row(QueryStatus.FULL_SENT, { id: "tie-new", expectedMs: D(2026, 11, 1), spans: [[QueryStatus.FULL_REQUESTED, D(2026, 9, 9)]] });
    const g = row(QueryStatus.FULL_SENT, { id: "tie-old", expectedMs: D(2026, 11, 1), spans: [[QueryStatus.FULL_REQUESTED, D(2026, 9, 1)]] });
    const order = carouselOrder(respItems([a, b, c, d, e, f, g, row(QueryStatus.REJECTED)])).map((i) => i.id);
    expect(order).toEqual(["send-soon", "send-later", "offer-undated", "sent-soon", "tie-new", "tie-old", "sent-late"]);
  });
});

describe("RS2 D1 · a personal note", () => {
  it("is a rejection stored as feedbackType Yes (\"detailed\"), and only that carries the quote", () => {
    const yes = respItem(row(QueryStatus.REJECTED, { query: { rejectionFeedbackType: "detailed", rejectionFeedbackText: "  Strong voice.  " } }))!;
    const form = respItem(row(QueryStatus.REJECTED, { query: { rejectionFeedbackType: "form" } }))!;
    const no = respItem(row(QueryStatus.REJECTED, { query: { rejectionFeedbackType: "standard", rejectionFeedbackText: "ignored" } }))!;
    expect([yes.personal, yes.note]).toEqual([true, "Strong voice."]);
    expect([form.personal, form.note, no.personal, no.note]).toEqual([false, null, false, null]);
    expect(saidLine(yes).quote).toBe("Strong voice.");
  });
});

describe("RS2 · the list, the months and the tally", () => {
  const items = respItems([
    row(QueryStatus.REJECTED, { id: "a", agentName: "Zed Young", spans: [[QueryStatus.QUERIED, D(2026, 6, 1)], [QueryStatus.REJECTED, D(2026, 9, 3)]] }),
    row(QueryStatus.NO_RESPONSE, { id: "b", agentName: "Al Abbot", spans: [[QueryStatus.QUERIED, D(2026, 4, 1)], [QueryStatus.NO_RESPONSE, D(2026, 9, 20)]] }),
    row(QueryStatus.REJECTED, { id: "c", agentName: "Mo Mint", spans: [[QueryStatus.QUERIED, D(2026, 8, 1)], [QueryStatus.REJECTED, D(2026, 8, 3)]] }),
    row(QueryStatus.PARTIAL_REQUESTED),
  ]);
  it("defaults newest answer first, grouped by month; Wait sorts longest first; Agent by surname", () => {
    const byDate = listNos(items, { kind: null, find: "", sort: "date", desc: true });
    expect(byDate.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(monthGroups(byDate).map((g) => [g.label, g.items.length])).toEqual([["September 2026", 2], ["August 2026", 1]]);
    expect(listNos(items, { kind: null, find: "", sort: "wait", desc: true }).map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(listNos(items, { kind: null, find: "", sort: "agent", desc: false }).map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(listNos(items, { kind: "passed", find: "", sort: "date", desc: true }).map((i) => i.id)).toEqual(["a", "c"]);
    expect(listNos(items, { kind: null, find: "mint", sort: "date", desc: true }).map((i) => i.id)).toEqual(["c"]);
  });
  it("one gate per five nos, ghosts fill the row, and the tally starts at the earliest query date", () => {
    expect(tallyPlan(2, 13)).toEqual({ gates: [2], ghosts: 12 });
    expect(tallyPlan(34, 13)).toEqual({ gates: [5, 5, 5, 5, 5, 5, 4], ghosts: 6 });
    expect(tallyPlan(70, 13).ghosts).toBe(0);
    expect(tallySince(items)).toBe(D(2026, 4, 1));
  });
  it("pins at 12 or less, unpins above 36, and releases past the list", () => {
    expect(nextPinned(false, 12, 500)).toBe(true);
    expect(nextPinned(true, 30, 500)).toBe(true);
    expect(nextPinned(false, 30, 500)).toBe(false);
    expect(nextPinned(true, 37, 500)).toBe(false);
    expect(nextPinned(true, -900, 10)).toBe(false);
  });
});

describe("RS2 D · the panel's words, built only from recorded facts", () => {
  const T = "Murphy's Day Out";
  const text = (p: { text: string }[]) => p.map((x) => x.text).join("");
  it("each state's stand heading and primary", () => {
    const send = respItem(row(QueryStatus.FULL_REQUESTED, { agentName: "Jonathan Marsh", expectedMs: D(2026, 10, 22), spans: [[QueryStatus.QUERIED, D(2026, 8, 21)], [QueryStatus.FULL_REQUESTED, D(2026, 10, 1)]] }))!;
    expect(answerStand(send, T, NOW)).toMatchObject({ heading: "Send Jonathan the full", figure: "10 days left", hot: true });
    expect(text(answerStand(send, T, NOW).paragraph)).toBe("Jonathan asked for the full of Murphy's Day Out on 1 Oct. They're expecting it by 22 Oct.");
    expect(answerFoot(send, NOW)).toMatchObject({ label: "Mark full sent", act: "sent" });
    const sent = respItem(row(QueryStatus.PARTIAL_SENT, { agentName: "Priya Raman", expectedMs: D(2026, 11, 10), spans: [[QueryStatus.PARTIAL_REQUESTED, D(2026, 9, 12)], [QueryStatus.PARTIAL_SENT, D(2026, 9, 15)]] }))!;
    expect(answerStand(sent, T, NOW).heading).toBe("Waiting on Priya");
    expect(answerFoot(sent, NOW)).toMatchObject({ label: "Record a response", act: "resp" });
    const offer = respItem(row(QueryStatus.OFFER, { agentName: "Ann Bee", expectedMs: D(2026, 10, 20) }))!;
    expect(answerStand(offer, T, NOW).heading).toBe("Answer Ann's offer");
    expect(answerFoot(offer, NOW)).toMatchObject({ label: "Record your answer", act: "offer" });
    const rr = respItem(row(QueryStatus.REVISE_RESUBMIT, { agentName: "Ann Bee" }))!;
    expect(answerStand(rr, T, NOW)).toMatchObject({ heading: "Revise for Ann", figure: null });
    const pass = respItem(row(QueryStatus.REJECTED, { agentName: "Daniel Okoro", query: { rejectionFeedbackType: "detailed", rejectionFeedbackText: "Strong voice." }, spans: [[QueryStatus.QUERIED, D(2026, 8, 7)], [QueryStatus.REJECTED, D(2026, 9, 2)]] }))!;
    expect(answerStand(pass, T, NOW)).toMatchObject({ heading: "Daniel passed", figure: "2 Sep" });
    expect(text(answerStand(pass, T, NOW).paragraph)).toBe("Daniel answered your query for Murphy's Day Out after 26 days, with a personal note. You can query Daniel again with your next book.");
    expect(answerFoot(pass, NOW)).toMatchObject({ label: "Edit the response", act: "edit", status: "Rejected" });
    expect(answerStand(respItem(row(QueryStatus.NO_RESPONSE))!, T, NOW).heading).toBe("Closed, no reply");
  });
  it("a missing fact drops its clause and its index row, and is never invented", () => {
    const bare = respItem(row(QueryStatus.FULL_REQUESTED, { agentName: "Ann Bee", sentMs: null }))!;
    expect(answerStand(bare, T, NOW)).toMatchObject({ figure: null, hot: false });
    expect(text(answerStand(bare, T, NOW).paragraph)).toBe("");
    expect(answerIndex(bare, NOW, null).map((r) => r.key)).toEqual(["reply"]);
    const noReply = respItem(row(QueryStatus.NO_RESPONSE, { spans: [[QueryStatus.QUERIED, D(2026, 6, 1)], [QueryStatus.NO_RESPONSE, D(2026, 9, 1)]] }))!;
    expect(answerIndex(noReply, NOW, "Query letter").map((r) => `${r.label}: ${r.answer}`)).toEqual([
      "Queried: 1 Jun", "Closed: 1 Sep, after 92 days", "They saw: Query letter", "Reply: None. You closed it after the wait.",
    ]);
  });
});

