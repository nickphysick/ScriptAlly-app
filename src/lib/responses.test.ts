/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RS2 D1 — the Responses data layer: placement by the latest answer, the reply rate, the carousel's order, and a
 * personal note. Each assertion was run red first against its named mutation (reports/responses-v2/REPORT.md).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { whereCounts } from "./qcSummary";
import {
  busiestBracket, firstAnswer, goneQuiet, hasNote, isEarlyDays, medianDays, nextExpected, noteItems, noteSplit, pageCounts, passDepth, pctOf, speedByKind, typicalWait, waitBrackets,
  carouselOrder, listNos, monthGroups, nextPinned, replyPct, replyRate, respCounts, respItem, respItems, saidLine, stillOut, tallyPlan, tallySince,
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

describe("RS5 B1 · the carousel's order", () => {
  /* run red against v2's soonest-due order, which put "send-soon" (asked earliest) first */
  it("your move first, then the newest answer first; undated last; the id breaks a tie", () => {
    const A = (s: QueryStatus, id: string, ask: number, extra: Partial<RespRowInput> = {}) => row(s, { id, spans: [[QueryStatus.QUERIED, D(2026, 6, 1)], [s === QueryStatus.PARTIAL_SENT ? QueryStatus.PARTIAL_REQUESTED : s === QueryStatus.FULL_SENT ? QueryStatus.FULL_REQUESTED : s, ask], ...(s === QueryStatus.PARTIAL_SENT || s === QueryStatus.FULL_SENT ? [[s, ask + 1] as [QueryStatus, number]] : [])], ...extra });
    const items = respItems([
      A(QueryStatus.PARTIAL_SENT, "sent-new", D(2026, 10, 20)),
      A(QueryStatus.FULL_REQUESTED, "send-old", D(2026, 9, 1), { expectedMs: D(2026, 10, 14) }),
      A(QueryStatus.PARTIAL_REQUESTED, "send-new", D(2026, 10, 2), { expectedMs: D(2026, 11, 30) }),
      A(QueryStatus.FULL_SENT, "sent-old", D(2026, 8, 3)),
      row(QueryStatus.OFFER, { id: "offer-undated" }),
      A(QueryStatus.FULL_SENT, "tie-b", D(2026, 9, 9)),
      A(QueryStatus.FULL_SENT, "tie-a", D(2026, 9, 9)),
      row(QueryStatus.REJECTED),
    ]);
    expect(carouselOrder(items).map((i) => i.id)).toEqual(["send-new", "send-old", "offer-undated", "sent-new", "tie-a", "tie-b", "sent-old"]);
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

/* ══ Responses v5 · Phase 1 — each assertion was run red first against the mutation named beside it ══ */
const DAY5 = 86_400_000;
const Q = QueryStatus;
const at = (status: QueryStatus, sent: number, steps: [QueryStatus, number][], o: Partial<RespRowInput> = {}) =>
  row(status, { sentMs: sent, spans: [[Q.QUERIED, sent], ...steps.map(([s, d]) => [s, sent + d * DAY5] as [QueryStatus, number])], ...o });
const S0 = D(2026, 6, 1);

describe("RS5 · the four wait brackets", () => {
  /* mutation: count only `passed`/`more` in a bar (drop the no-reply push) → the sum falls short of answered */
  it("bracket segments sum to each bar's total, and the bars plus the undated sum to the answered count", () => {
    const rows = [
      at(Q.REJECTED, S0, [[Q.REJECTED, 3]]),
      at(Q.PARTIAL_SENT, S0, [[Q.PARTIAL_REQUESTED, 14], [Q.PARTIAL_SENT, 16]]),
      at(Q.NO_RESPONSE, S0, [[Q.NO_RESPONSE, 60]]),
      at(Q.FULL_REQUESTED, S0, [[Q.FULL_REQUESTED, 15]]),
      at(Q.REJECTED, S0, [[Q.PARTIAL_REQUESTED, 30], [Q.REJECTED, 90]], { furthest: "partial" }),
      row(Q.REJECTED, { sentMs: null }),
      at(Q.QUERIED, S0, []),
    ];
    const items = respItems(rows);
    const { bars, undated } = waitBrackets(items);
    for (const b of bars) expect(b.more.length + b.passed.length + b.noReply.length).toBe(b.total);
    expect(bars.reduce((n, b) => n + b.total, 0) + undated).toBe(respCounts(items).answered);
    expect(bars.map((b) => b.total)).toEqual([2, 1, 1, 1]);
    expect(undated).toBe(1);
    /* the bar is placed by the FIRST answer: the pass after a partial request sits in 4 to 8 weeks as a request */
    expect(bars[2].more.map((i) => i.answer)).toEqual(["passed"]);
    expect(busiestBracket(bars)?.label).toBe("Within 2 weeks");
  });
});

describe("RS5 · the typical wait", () => {
  /* mutation: drop the `kind !== "noReply"` filter → the 200-day close lifts the median from 10 to 20 */
  it("excludes no-reply closes", () => {
    const items = respItems([
      at(Q.REJECTED, S0, [[Q.REJECTED, 10]]),
      at(Q.PARTIAL_REQUESTED, S0, [[Q.PARTIAL_REQUESTED, 4]]),
      at(Q.REJECTED, S0, [[Q.REJECTED, 20]]),
      at(Q.NO_RESPONSE, S0, [[Q.NO_RESPONSE, 200]]),
    ]);
    expect(typicalWait(items)).toBe(10);
    expect(medianDays([])).toBeNull();
    const sp = speedByKind(items);
    expect([sp.more, sp.passed, sp.noReply]).toEqual([4, 20, 200]);
    expect(sp.quickest?.first.days).toBe(4);
  });
  it("counts a first answer from the query, and falls back to the item's own answer when the history dates none", () => {
    const i = respItem(row(Q.REJECTED, { sentMs: S0, spans: [], query: { rejectedDate: new Date(S0 + 9 * DAY5).toISOString() } }))!;
    expect(firstAnswer(i)?.days).toBe(9);
    expect(firstAnswer(respItem(row(Q.REJECTED, { sentMs: null }))!)).toBeNull();
  });
});

describe("RS5 · how far the passes read, and the notes", () => {
  /* mutation: count every pass as "query" → partial and full fall to 0 */
  it("pass depth is the Query Centre's `furthest`", () => {
    const items = respItems([
      at(Q.REJECTED, S0, [[Q.REJECTED, 3]], { furthest: "query" }),
      at(Q.REJECTED, S0, [[Q.REJECTED, 3]], { furthest: "partial" }),
      at(Q.REJECTED, S0, [[Q.REJECTED, 3]], { furthest: "full" }),
      at(Q.REJECTED, S0, [[Q.REJECTED, 3]], { furthest: "full" }),
      at(Q.FULL_SENT, S0, [[Q.FULL_REQUESTED, 3]], { furthest: "full" }),
    ]);
    expect(passDepth(items)).toEqual({ query: 1, partial: 1, full: 2, total: 4 });
  });
  /* mutation: `hasNote` = any non-empty note → the standard rejection's text counts */
  it("a note is a detailed rejection with text, or an R&R's notes (D5)", () => {
    const items = respItems([
      at(Q.REJECTED, S0, [[Q.REJECTED, 3]], { query: { rejectionFeedbackType: "detailed", rejectionFeedbackText: "Lovely voice." } }),
      at(Q.REJECTED, S0, [[Q.REJECTED, 4]], { query: { rejectionFeedbackType: "detailed", rejectionFeedbackText: "  " } }),
      at(Q.REJECTED, S0, [[Q.REJECTED, 5]], { query: { rejectionFeedbackType: "standard", rejectionFeedbackText: "Not for me." } }),
      at(Q.REVISE_RESUBMIT, S0, [[Q.REVISE_RESUBMIT, 6]], { query: { rrNotes: "Tighten the middle." } }),
      at(Q.PARTIAL_REQUESTED, S0, [[Q.PARTIAL_REQUESTED, 7]]),
    ]);
    expect(noteSplit(items)).toEqual({ withNote: 1, form: 2, total: 3 });
    expect(items.filter(hasNote).map((i) => i.answer)).toEqual(["passed", "rr"]);
    expect(noteItems(items).map((i) => i.answer)).toEqual(["rr", "passed"]);
  });
});

describe("RS5 · gone quiet and the next expected reply are the Query Centre's", () => {
  const nowMs = D(2026, 10, 28);
  const w = (expectedMs: number | null, stageStartMs: number | null, status = Q.QUERIED) => ({ ...row(status, { expectedMs, expectedKind: expectedMs == null ? null : "reply" }), stageStartMs });
  const rows = [
    w(nowMs - 5 * DAY5, nowMs - 60 * DAY5),   /* past the reply date, inside the nudge window: NOT gone quiet */
    w(nowMs - 40 * DAY5, nowMs - 100 * DAY5), /* past the nudge window: gone quiet */
    w(null, nowMs - 120 * DAY5),              /* undated, long in the stage: gone quiet */
    w(nowMs + 3 * DAY5, nowMs - 20 * DAY5),   /* still to come */
    w(nowMs + 9 * DAY5, nowMs - 10 * DAY5),
    w(nowMs - 40 * DAY5, nowMs - 100 * DAY5, Q.PARTIAL_SENT), /* not still waiting: Partial sent */
  ];
  /* mutation: re-derive as "expected date passed" → the first row counts and the figure reads 3 */
  it("gone quiet equals the Query Centre's quiet set over the still-waiting rows", () => {
    expect(goneQuiet(rows, nowMs)).toHaveLength(whereCounts(rows.filter((r) => r.status === Q.QUERIED), nowMs).quiet);
    /* membership, not just the count: the naive rule also counts 2 here, but the wrong two */
    expect(goneQuiet(rows, nowMs).map((r) => r.id)).toEqual([rows[1].id, rows[2].id]);
  });
  /* mutation: take the earliest expected date without the "still ahead" test → a past date is "next" */
  it("the next reply is the earliest expected reply still ahead", () => {
    expect(nextExpected(rows, nowMs)?.expectedMs).toBe(nowMs + 3 * DAY5);
    expect(nextExpected(rows.slice(0, 3), nowMs)).toBeNull();
  });
});

describe("RS5 · the page's counts", () => {
  it("sent is answered plus still waiting; early days is 1 to 4 answers", () => {
    const rows = [at(Q.REJECTED, S0, [[Q.REJECTED, 3]]), at(Q.PARTIAL_REQUESTED, S0, [[Q.PARTIAL_REQUESTED, 3]]), at(Q.QUERIED, S0, []), at(Q.QUERIED, S0, []), row(Q.WITHDRAWN)];
    const c = pageCounts(respItems(rows), rows);
    expect(c).toMatchObject({ more: 1, passed: 1, noReply: 0, waiting: 2, answered: 2, replies: 2, sent: 4 });
    expect(pctOf(1, 4)).toBe(25);
    expect(pctOf(1, 0)).toBeNull();
    expect([0, 1, 4, 5].map(isEarlyDays)).toEqual([false, true, true, false]);
  });
});
