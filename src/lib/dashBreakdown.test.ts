/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Where your queries stand" (dashboard stage 2, 17 Sep) — the live partition and its facts.
 *
 * ⚠️ THE RECONCILIATION IS ASSERTED AS A PROPERTY, OVER MIXES THAT DECIDE EVERY STATUS. "Header =
 * columns + footer" is the claim Nick asked to be able to check by eye; a literal on both sides would go
 * green the day both derivations moved the same wrong way, so the columns are summed and compared with
 * the header's own count, never with a number typed here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryStatus, type Activity, type Agent, type Query } from "../types";
import {
  BREAKDOWN_COLUMNS, extrasLine, isLive, LIVE_STATUSES, liveCount, queriedFact, queryBreakdown, queryingDay,
  replyDueFact, shortDate, stageSentAt, statedReplyDates,
} from "./dashBreakdown";
import { dailyLedger } from "./oneScreen";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
const ahead = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString();

let seq = 0;
const q = (status: QueryStatus, over: Record<string, unknown> = {}): Query =>
  ({ id: `q${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent: ago(30), ...over } as unknown as Query);
const act = (queryId: string, resultingStatus: QueryStatus, date: string): Activity =>
  ({ id: `x${++seq}`, queryId, resultingStatus, date, type: "Status Change", description: "" } as unknown as Activity);
const agent = (id: string, weeks?: number): Agent =>
  ({ id, userId: "u", name: id, agencyName: "Lit", ...(weeks === undefined ? {} : { responseTimeWeeks: weeks }) } as unknown as Agent);

const EVERY: QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
];

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => { warn = vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { warn.mockRestore(); });

describe("the live set", () => {
  it("is exactly seven statuses — an offer and an R&R included, a pass, a withdrawal and silence not", () => {
    expect([...LIVE_STATUSES].sort()).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
    ].sort());
    for (const s of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(isLive(q(s)), s).toBe(false);
    }
  });

  it("⚠️ an undated query is not on the board — here, as on the chart's line", () => {
    const draft = q(QueryStatus.QUERIED, { dateSent: undefined });
    expect(isLive(draft)).toBe(false);
    expect(liveCount([draft, q(QueryStatus.QUERIED)])).toBe(1);
  });

  /* two derivations against each other: the ledger's closing stock IS the live count */
  it("⚠️ the header's count is the chart line's closing figure, for a mix that decides every status", () => {
    const mix = EVERY.map((s, i) => q(s, { dateSent: ago(40 - i), lastStatusChange: ago(3) }));
    const led = dailyLedger(mix, NOW);
    expect(liveCount(mix)).toBe(led[led.length - 1].active);
  });
});

describe("⚠️ header = columns + footer, by construction", () => {
  const mixes: Query[][] = [
    EVERY.map((s) => q(s)),
    [q(QueryStatus.QUERIED), q(QueryStatus.QUERIED), q(QueryStatus.OFFER), q(QueryStatus.OFFER)],
    [q(QueryStatus.REVISE_RESUBMIT), q(QueryStatus.FULL_SENT), q(QueryStatus.NO_RESPONSE)],
    [q(QueryStatus.REJECTED), q(QueryStatus.WITHDRAWN)],
    [],
    [q(QueryStatus.PARTIAL_SENT, { dateSent: undefined }), q(QueryStatus.PARTIAL_SENT)],
  ];
  it.each(mixes.map((m, i) => [i, m] as const))("mix %i reconciles, and the data layer does not warn", (_i, mix) => {
    const bd = queryBreakdown({ queries: mix, activities: [], agents: [], now: NOW });
    const cols = bd.columns.reduce((a, c) => a + c.count, 0);
    expect(bd.total).toBe(liveCount(mix));
    expect(cols + bd.rr + bd.offer).toBe(bd.total);
    expect(warn).not.toHaveBeenCalled();
  });

  it("the tally is real — every column, the R&R and the offer were entered by the mixes above", () => {
    const bd = queryBreakdown({ queries: mixes[0], activities: [], agents: [], now: NOW });
    expect(bd.columns.every((c) => c.count === 1)).toBe(true);
    expect([bd.rr, bd.offer]).toEqual([1, 1]);
  });
});

describe("the five columns", () => {
  it("are the pipeline's stages in order, the two requests marked, the words saying how far a query got", () => {
    expect(BREAKDOWN_COLUMNS.map((c) => [c.status, c.label, c.tone, c.court])).toEqual([
      [QueryStatus.QUERIED, "Queried", "queried", false],
      [QueryStatus.PARTIAL_REQUESTED, "Partial req", "you", true],
      [QueryStatus.PARTIAL_SENT, "Partial sent", "agent", false],
      [QueryStatus.FULL_REQUESTED, "Full req", "you", true],
      [QueryStatus.FULL_SENT, "Full sent", "agent", false],
    ]);
    /* R&R and an offer are live and are deliberately not columns (Nick) */
    expect(BREAKDOWN_COLUMNS.map((c) => c.status)).not.toContain(QueryStatus.REVISE_RESUBMIT);
    expect(BREAKDOWN_COLUMNS.map((c) => c.status)).not.toContain(QueryStatus.OFFER);
    for (const c of BREAKDOWN_COLUMNS) expect(c.label.toLowerCase()).not.toMatch(/reject|ghost/);
  });

  it("'in your court' only where there is something in the court — an empty column says nothing", () => {
    const bd = queryBreakdown({ queries: [q(QueryStatus.PARTIAL_REQUESTED)], activities: [], agents: [], now: NOW });
    const partial = bd.columns.find((c) => c.status === QueryStatus.PARTIAL_REQUESTED)!;
    const full = bd.columns.find((c) => c.status === QueryStatus.FULL_REQUESTED)!;
    expect(partial.fact).toBe("in your court");
    expect([full.count, full.fact]).toEqual([0, ""]);
  });
});

describe("the queried fact", () => {
  it("names the longest wait, in days, singular-safe, and says so when it is today", () => {
    expect(queriedFact([q(QueryStatus.QUERIED, { dateSent: ago(116) }), q(QueryStatus.QUERIED, { dateSent: ago(3) })], NOW))
      .toBe("oldest 116 days");
    expect(queriedFact([q(QueryStatus.QUERIED, { dateSent: ago(1) })], NOW)).toBe("oldest 1 day");
    expect(queriedFact([q(QueryStatus.QUERIED, { dateSent: NOW.toISOString() })], NOW)).toBe("oldest sent today");
    expect(queriedFact([], NOW)).toBe("");
  });
});

describe("when the pages went out — the log first", () => {
  it("⚠️ reads the LATEST logged send, and ignores other queries' and other stages' events", () => {
    const x = q(QueryStatus.PARTIAL_SENT, { partialSentDate: ago(60) });
    const log = [
      act(x.id, QueryStatus.PARTIAL_SENT, ago(40)),
      act(x.id, QueryStatus.PARTIAL_SENT, ago(20)),   // a re-sent partial restarts the wait
      act(x.id, QueryStatus.FULL_SENT, ago(5)),
      act("someone-else", QueryStatus.PARTIAL_SENT, ago(1)),
    ];
    const r = stageSentAt(x, QueryStatus.PARTIAL_SENT, log);
    expect(r.fromLog).toBe(true);
    expect(r.ms).toBe(new Date(ago(20)).getTime());
  });

  it("falls back to the derived field only when the log has nothing, and says which it used", () => {
    const x = q(QueryStatus.FULL_SENT, { fullSentDate: ago(12) });
    expect(stageSentAt(x, QueryStatus.FULL_SENT, [])).toEqual({ ms: new Date(ago(12)).getTime(), fromLog: false });
    expect(stageSentAt(q(QueryStatus.FULL_SENT), QueryStatus.FULL_SENT, [])).toEqual({ ms: null, fromLog: false });
  });
});

describe("the reply-due fact — only a date somebody stated", () => {
  it("⚠️ never the house default: an agency with no window and no writer's date gives nothing", () => {
    const x = q(QueryStatus.PARTIAL_SENT, { agentId: "silent" });
    const log = [act(x.id, QueryStatus.PARTIAL_SENT, ago(10))];
    expect(statedReplyDates([x], QueryStatus.PARTIAL_SENT, { activities: log, agents: [agent("silent")] })).toEqual([]);
    const bd = queryBreakdown({ queries: [x], activities: log, agents: [agent("silent")], now: NOW });
    expect(bd.columns.find((c) => c.status === QueryStatus.PARTIAL_SENT)!.fact).toBe("");
  });

  it("the agency's window runs from the LOGGED send, not from the query letter", () => {
    const x = q(QueryStatus.PARTIAL_SENT, { agentId: "w8", dateSent: ago(100) });
    const log = [act(x.id, QueryStatus.PARTIAL_SENT, ago(14))];
    const [due] = statedReplyDates([x], QueryStatus.PARTIAL_SENT, { activities: log, agents: [agent("w8", 8)] });
    expect(due).toBe(new Date(ago(14)).getTime() + 56 * DAY);
  });

  it("a writer's own date is a stated date too", () => {
    const x = q(QueryStatus.FULL_SENT, { agentId: "silent", writerExpectedDate: ahead(9) });
    expect(statedReplyDates([x], QueryStatus.FULL_SENT, { activities: [], agents: [agent("silent")] }))
      .toEqual([new Date(ahead(9)).getTime()]);
  });

  it("the soonest date still ahead; when all have passed, the most recent — and never 'overdue'", () => {
    expect(replyDueFact([new Date(ahead(30)).getTime(), new Date(ahead(5)).getTime(), new Date(ago(9)).getTime()], NOW))
      .toBe(`reply due ${shortDate(new Date(ahead(5)).getTime(), NOW)}`);
    expect(replyDueFact([new Date(ago(40)).getTime(), new Date(ago(4)).getTime()], NOW))
      .toBe(`reply was due ${shortDate(new Date(ago(4)).getTime(), NOW)}`);
    expect(replyDueFact([], NOW)).toBe("");
    /* today still counts as ahead — it is not late until tomorrow */
    expect(replyDueFact([NOW.getTime()], NOW)).toBe("reply due 17 Sep");
    const all = [replyDueFact([new Date(ago(2)).getTime()], NOW), replyDueFact([new Date(ahead(2)).getTime()], NOW)].join(" ");
    expect(all).not.toMatch(/overdue|late/i);
  });

  it("dates read like the page's other dates, with the year only when it is not this one", () => {
    expect(shortDate(new Date(2026, 8, 2).getTime(), NOW)).toBe("2 Sep");
    expect(shortDate(new Date(2025, 11, 30).getTime(), NOW)).toBe("30 Dec 2025");
  });
});

describe("the footer line", () => {
  it("names each non-zero half, and nothing when both are zero", () => {
    expect(extrasLine(1, 1)).toBe("Plus 1 R&R · 1 offer");
    expect(extrasLine(2, 0)).toBe("Plus 2 R&R");
    expect(extrasLine(0, 3)).toBe("Plus 3 offers");
    expect(extrasLine(0, 0)).toBeNull();
  });

  it("is the breakdown's own, from the same live set", () => {
    const bd = queryBreakdown({
      queries: [q(QueryStatus.REVISE_RESUBMIT), q(QueryStatus.OFFER), q(QueryStatus.QUERIED)],
      activities: [], agents: [], now: NOW,
    });
    expect(bd.extras).toBe("Plus 1 R&R · 1 offer");
    expect(queryBreakdown({ queries: [q(QueryStatus.QUERIED)], activities: [], agents: [], now: NOW }).extras).toBeNull();
  });
});

describe("the querying day", () => {
  it("counts the first send's day as day 1, and is absent before any send", () => {
    expect(queryingDay([q(QueryStatus.QUERIED, { dateSent: NOW.toISOString() })], NOW)).toBe(1);
    expect(queryingDay([q(QueryStatus.REJECTED, { dateSent: ago(9) }), q(QueryStatus.QUERIED, { dateSent: ago(2) })], NOW)).toBe(10);
    expect(queryingDay([q(QueryStatus.QUERIED, { dateSent: undefined })], NOW)).toBeNull();
    expect(queryingDay([], NOW)).toBeNull();
  });
});
