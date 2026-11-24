/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RS6 · the Responses v6 data layer (D1, D3, D4, D6): the response rate, the two stat cards' rows, the no-requests
 * state and the "When replies are due" timeline. Each case was run red first against a named mutation
 * (reports/responses-v6/REPORT.md, §4).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { whereItStands } from "./qcSummary";
import {
  NO_REQUESTS_ADVICE_AT, noRequestsState, pageCounts, passBreakdown, requestBreakdown, respItems, responseRate, stackLanes,
  tallyMarks, waitTimeline, type RespRowInput,
} from "./responses";

const DAY = 86_400_000;
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const NOW = D(2026, 10, 28);

let n = 0;
function row(status: QueryStatus, o: Partial<RespRowInput> & { spans?: [QueryStatus, number][] } = {}): RespRowInput {
  const spans = (o.spans ?? []).map(([s, t], i, a) => ({ status: s, startMs: t, endMs: a[i + 1]?.[1] ?? null, current: i === a.length - 1 }));
  return {
    id: o.id ?? `q${++n}`, status, agentName: o.agentName ?? "Ann Bee", agency: o.agency ?? "Bee Agency", initials: "AB",
    sentMs: o.sentMs ?? spans[0]?.startMs ?? null, query: o.query ?? {},
    history: { spans, currentStartMs: spans[spans.length - 1]?.startMs ?? null, dated: true },
    expectedMs: o.expectedMs ?? null, expectedKind: o.expectedKind ?? null, dayN: o.dayN ?? null, furthest: o.furthest ?? "query",
    stageStartMs: o.stageStartMs ?? spans[spans.length - 1]?.startMs ?? o.sentMs ?? null,
  };
}

describe("RS6 · the response rate (D3)", () => {
  const rows = [
    row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.FULL_SENT), row(QueryStatus.REJECTED), row(QueryStatus.REJECTED),
    row(QueryStatus.NO_RESPONSE), row(QueryStatus.NO_RESPONSE), row(QueryStatus.QUERIED), row(QueryStatus.QUERIED),
    row(QueryStatus.WITHDRAWN),
  ];
  const c = pageCounts(respItems(rows), rows);
  it("is replies over queried: no-reply closes and the still waiting count below the line only", () => {
    expect([c.replies, c.sent]).toEqual([4, 8]);
    expect(responseRate(c)).toBe(50);
  });
  it("a no-reply close never raises it, and a reply always does", () => {
    expect(responseRate({ replies: 4, sent: 9 })).toBeLessThan(responseRate(c)!);
    expect(responseRate({ replies: 5, sent: 9 })).toBeGreaterThan(responseRate({ replies: 4, sent: 9 })!);
  });
  it("is null with nothing queried", () => { expect(responseRate({ replies: 0, sent: 0 })).toBeNull(); });
  it("the tally line has one mark per query queried, in order", () => {
    const m = tallyMarks(c);
    expect(m).toHaveLength(c.sent);
    expect(m.join(",")).toBe("more,more,passed,passed,faint,faint,faint,faint");
  });
});

describe("RS6 · the stat cards' rows (S1)", () => {
  const rows = [
    row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT), row(QueryStatus.FULL_REQUESTED), row(QueryStatus.OFFER),
    row(QueryStatus.REJECTED, { furthest: "query" }), row(QueryStatus.REJECTED, { furthest: "query" }), row(QueryStatus.REJECTED, { furthest: "full" }),
    row(QueryStatus.NO_RESPONSE), row(QueryStatus.QUERIED),
  ];
  const items = respItems(rows), c = pageCounts(items, rows);
  it("Asked for more's rows sum to its number, and a row at zero is absent", () => {
    const r = requestBreakdown(items);
    expect(r.reduce((a, b) => a + b.n, 0)).toBe(c.more);
    expect(r.map((x) => `${x.label} ${x.n}`)).toEqual(["Partial 2", "Full 1", "Offer 1"]);
  });
  it("Passed's rows sum to its number, by how far the query got", () => {
    const r = passBreakdown(items);
    expect(r.reduce((a, b) => a + b.n, 0)).toBe(c.passed);
    expect(r.map((x) => `${x.label} ${x.n}`)).toEqual(["At the query 2", "After the full 1"]);
  });
});

describe("RS6 · no requests yet (D4)", () => {
  it("flips from early days to advice at ten replies", () => {
    expect(NO_REQUESTS_ADVICE_AT).toBe(10);
    expect(noRequestsState({ more: 0, replies: 9 })).toBe("early");
    expect(noRequestsState({ more: 0, replies: 10 })).toBe("advice");
  });
  it("is null with a request, or with no reply at all", () => {
    expect(noRequestsState({ more: 1, replies: 30 })).toBeNull();
    expect(noRequestsState({ more: 0, replies: 0 })).toBeNull();
  });
});

describe("RS6 · When replies are due (D6)", () => {
  const sent = (d: number) => NOW - d * DAY;
  const weeks: Record<string, number | null> = { a: 6, b: 8, c: 12, d: null, e: 4, f: 6 };
  const rows = [
    row(QueryStatus.QUERIED, { id: "a", sentMs: sent(20), expectedMs: sent(20) + 42 * DAY, expectedKind: "reply" }),
    row(QueryStatus.QUERIED, { id: "b", sentMs: sent(50), expectedMs: sent(50) + 56 * DAY, expectedKind: "reply" }),
    row(QueryStatus.QUERIED, { id: "c", sentMs: sent(160), expectedMs: sent(160) + 84 * DAY, expectedKind: "reply" }),
    row(QueryStatus.QUERIED, { id: "d", sentMs: sent(30) }),
    row(QueryStatus.QUERIED, { id: "e", sentMs: sent(25), expectedMs: sent(25) + 28 * DAY, expectedKind: "reply" }),
    /* past its date by two days: in the nudge window, so NOT gone quiet (the case a "past = quiet" shortcut gets wrong) */
    row(QueryStatus.QUERIED, { id: "f", sentMs: sent(44), expectedMs: sent(44) + 42 * DAY, expectedKind: "reply" }),
    row(QueryStatus.REJECTED, { id: "x", sentMs: sent(90) }),
  ];
  const tl = waitTimeline(rows, NOW, (r) => weeks[r.id] ?? null);
  it("every disc sits at the row's own expectedMs", () => {
    for (const d of tl.discs) expect(d.ms).toBe(d.row.expectedMs);
    expect(tl.discs.map((d) => d.row.id)).toEqual(["c", "f", "e", "b", "a"]);
  });
  it("its gone-quiet set is the Query Centre's own, for the same rows", () => {
    const qc = rows.filter((r) => r.status === QueryStatus.QUERIED && whereItStands({ status: r.status, expectedMs: r.expectedMs, stageStartMs: r.stageStartMs ?? null }, NOW) === "quiet").map((r) => r.id).sort();
    expect(tl.discs.filter((d) => d.quiet).map((d) => d.row.id).sort()).toEqual(qc);
    expect(qc.length).toBeGreaterThan(0);
    /* both branches entered: a disc past its date that is quiet, and one past its date that is not */
    expect(tl.discs.some((d) => d.ms < NOW && !d.quiet)).toBe(true);
  });
  it("a query with no stated reply time is a chip, not a disc; the next due is the earliest still ahead", () => {
    expect(tl.noTime.map((r) => r.id)).toEqual(["d"]);
    expect(tl.next?.row.id).toBe("e");
    expect(tl.weekCount).toBe(2);
  });
  it("lanes never put two discs closer than the gap", () => {
    const ats = [0.1, 0.11, 0.12, 0.3, 0.31];
    const lanes = stackLanes(ats, 0.05);
    for (let i = 0; i < ats.length; i++) for (let j = i + 1; j < ats.length; j++)
      if (lanes[i] === lanes[j]) expect(Math.abs(ats[i] - ats[j])).toBeGreaterThanOrEqual(0.05);
    expect(lanes).toEqual([0, 1, 2, 0, 1]);
  });
});
