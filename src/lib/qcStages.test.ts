/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcStages — a query's journey as dated stages. The claims: spans are contiguous and ordered; there
 * is exactly one current span when the current stage is dated and NONE when it is not; and an
 * undated stage is reported as undated rather than given a date.
 */
import { describe, it, expect } from "vitest";
import { Query, QueryStatus } from "../types";
import type { DerivableActivity } from "./queryDerivation";
import { anyToMs, dayN, stageHistory } from "./qcStages";

const D = (m: number, d: number) => new Date(Date.UTC(2026, m - 1, d, 12)).toISOString();
const ms = (iso: string) => new Date(iso).getTime();
const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, ...over,
});
const rung = (status: QueryStatus, date: string, extra: Partial<DerivableActivity> = {}): DerivableActivity => ({ id: `${status}-${date}`, resultingStatus: status, date, ...extra });

describe("stageHistory — one span per stage, from the log", () => {
  it("a plain query is one current span from the day it was sent", () => {
    const h = stageHistory(q({ dateSent: D(8, 14) }), []);
    expect(h).toEqual({ dated: true, currentStartMs: ms(D(8, 14)), spans: [{ status: QueryStatus.QUERIED, startMs: ms(D(8, 14)), endMs: null, current: true }] });
  });

  it("queried → partial requested → partial sent: three spans, each ending where the next begins", () => {
    const h = stageHistory(q({ dateSent: D(4, 8), status: QueryStatus.PARTIAL_SENT }), [
      rung(QueryStatus.QUERIED, D(4, 8)), rung(QueryStatus.PARTIAL_REQUESTED, D(4, 20)), rung(QueryStatus.PARTIAL_SENT, D(5, 1)),
    ]);
    expect(h.spans.map((s) => [s.status, s.startMs, s.endMs, s.current])).toEqual([
      [QueryStatus.QUERIED, ms(D(4, 8)), ms(D(4, 20)), false],
      [QueryStatus.PARTIAL_REQUESTED, ms(D(4, 20)), ms(D(5, 1)), false],
      [QueryStatus.PARTIAL_SENT, ms(D(5, 1)), null, true],
    ]);
    expect(h.currentStartMs).toBe(ms(D(5, 1)));
  });

  it("the order of the log does not matter, and a repeated rung opens no new span", () => {
    const h = stageHistory(q({ dateSent: D(4, 8), status: QueryStatus.PARTIAL_REQUESTED }), [
      rung(QueryStatus.PARTIAL_REQUESTED, D(4, 22), { id: "b" }), rung(QueryStatus.PARTIAL_REQUESTED, D(4, 20), { id: "a" }),
    ]);
    expect(h.spans).toHaveLength(2);
    expect(h.currentStartMs).toBe(ms(D(4, 20)));
  });

  it("⚠️ the feed stops short of where the query stands: the pipeline date is the fallback", () => {
    /* an import's provisional rungs are not in the global feed, so the feed can end a stage early */
    const h = stageHistory(q({ dateSent: D(4, 8), status: QueryStatus.PARTIAL_SENT, partialSentDate: D(5, 1) }), [rung(QueryStatus.PARTIAL_REQUESTED, D(4, 20))]);
    expect(h.dated).toBe(true);
    expect(h.spans.map((s) => s.status)).toEqual([QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT]);
    expect(h.spans[1].endMs).toBe(ms(D(5, 1)));
  });

  it("⚠️ …and with no witness at all it is UNDATED — no current span, and the last known span is not run forward", () => {
    const h = stageHistory(q({ dateSent: D(4, 8), status: QueryStatus.FULL_SENT }), [rung(QueryStatus.PARTIAL_REQUESTED, D(4, 20))]);
    expect(h.dated).toBe(false);
    expect(h.currentStartMs).toBeNull();
    expect(h.spans.filter((s) => s.current)).toHaveLength(0);
    /* no lane at all: a past drawn up to a present nobody can place would end at a guess */
    expect(h.spans).toEqual([]);
  });

  describe("⚠️ THE DOCUMENT IS THE AUTHORITY — cases taken from the harness account's real data", () => {
    it("a feed that runs PAST the document's status is residue: Partial sent rungs on a Partial requested query are not drawn", () => {
      /* seed-pkgq-4: two sends recorded and undone; the projection kept them */
      const h = stageHistory(q({ dateSent: D(6, 30), status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: D(8, 2) }), [
        rung(QueryStatus.QUERIED, D(6, 30)), rung(QueryStatus.PARTIAL_REQUESTED, D(7, 14)), rung(QueryStatus.PARTIAL_SENT, D(8, 21)), rung(QueryStatus.PARTIAL_SENT, D(8, 23), { id: "again" }),
      ]);
      expect(h.spans.map((s) => [s.status, s.startMs, s.endMs, s.current])).toEqual([
        [QueryStatus.QUERIED, ms(D(6, 30)), ms(D(8, 2)), false],
        [QueryStatus.PARTIAL_REQUESTED, ms(D(8, 2)), null, true],   /* the DOCUMENT's date, not the feed's 14 Jul */
      ]);
    });
    it("where the document dates nothing, the feed's latest rung OF THAT STATUS answers — not its last rung", () => {
      /* cor-move-a: no partialRequestedDate on the doc; the feed ends on residue */
      const h = stageHistory(q({ dateSent: D(7, 4), status: QueryStatus.PARTIAL_REQUESTED }), [
        rung(QueryStatus.QUERIED, D(7, 4)), rung(QueryStatus.PARTIAL_REQUESTED, D(8, 13)), rung(QueryStatus.PARTIAL_SENT, D(8, 21)),
      ]);
      expect(h.currentStartMs).toBe(ms(D(8, 13)));
      expect(h.spans.map((s) => s.status)).toEqual([QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED]);
    });
    it("a Queried query waits from the day it was SENT, whatever a later Queried rung says", () => {
      /* the row that read "0 days waiting · 22 weeks past expected" */
      const h = stageHistory(q({ dateSent: D(3, 19) }), [rung(QueryStatus.PARTIAL_REQUESTED, D(5, 1)), rung(QueryStatus.QUERIED, D(9, 19))]);
      expect(h.currentStartMs).toBe(ms(D(3, 19)));
      expect(h.spans).toHaveLength(1);
    });
    it("closes left in the feed by undone closes are never drawn as a past stage", () => {
      /* seed-query-20: a rejection and ten no-responses, all undone; the query is live */
      const h = stageHistory(q({ dateSent: D(8, 4), status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: D(8, 20) }), [
        rung(QueryStatus.REJECTED, D(8, 12)), rung(QueryStatus.NO_RESPONSE, D(8, 13)),
      ]);
      expect(h.spans.map((s) => s.status)).toEqual([QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED]);
    });
    it("a resubmission RE-ENTERS Full sent: the pipeline date is the first time, `lastStatusChange` the latest", () => {
      const h = stageHistory(q({ dateSent: D(2, 1), status: QueryStatus.FULL_SENT, fullRequestedDate: D(3, 1), fullSentDate: D(3, 10), lastStatusChange: D(7, 1) }), [rung(QueryStatus.REVISE_RESUBMIT, D(6, 1))]);
      expect(h.spans.map((s) => [s.status, s.current])).toEqual([
        [QueryStatus.QUERIED, false], [QueryStatus.FULL_REQUESTED, false], [QueryStatus.FULL_SENT, false], [QueryStatus.REVISE_RESUBMIT, false], [QueryStatus.FULL_SENT, true],
      ]);
      expect(h.currentStartMs).toBe(ms(D(7, 1)));
    });
  });

  it("a provisional rung dates nothing", () => {
    const h = stageHistory(q({ dateSent: D(4, 8), status: QueryStatus.OFFER }), [rung(QueryStatus.OFFER, D(6, 1), { dateProvisional: true })]);
    expect(h.dated).toBe(false);
  });

  it("an undated query (no dateSent, no rungs) is undated, not 'sent today'", () => {
    const h = stageHistory(q({ dateSent: undefined }), []);
    expect(h).toEqual({ spans: [], currentStartMs: null, dated: false });
  });

  it("a close is a moment: the closing span starts and ends on the day it closed", () => {
    const h = stageHistory(q({ dateSent: D(3, 14), status: QueryStatus.REJECTED }), [rung(QueryStatus.REJECTED, D(7, 3))]);
    const last = h.spans[h.spans.length - 1];
    expect([last.status, last.startMs, last.endMs, last.current]).toEqual([QueryStatus.REJECTED, ms(D(7, 3)), ms(D(7, 3)), true]);
  });

  it("a rung dated before the span it closes cannot end it before it began", () => {
    const h = stageHistory(q({ dateSent: D(4, 8), status: QueryStatus.FULL_REQUESTED }), [rung(QueryStatus.FULL_REQUESTED, D(4, 1))]);
    expect(h.spans[0].endMs).toBe(h.spans[0].startMs);
    expect(h.spans[1].startMs).toBe(ms(D(4, 8)));
  });

  it("PROPERTY — over many logs: spans are contiguous and ordered; one current span when dated, none when not", () => {
    const LIVE = [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED];
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const tally = { dated: 0, undated: 0, multi: 0 };
    for (let n = 0; n < 300; n++) {
      const len = Math.floor(rnd() * 5);
      const log = Array.from({ length: len }, (_, i) => rung(LIVE[Math.floor(rnd() * LIVE.length)], D(3, 1 + Math.floor(rnd() * 27)), { id: `r${i}` }));
      const status = rnd() < 0.7 && log.length ? ([...log].sort((a, b) => ms(a.date as string) - ms(b.date as string) || (a.id ?? "").localeCompare(b.id ?? ""))[log.length - 1].resultingStatus as QueryStatus) : LIVE[Math.floor(rnd() * LIVE.length)];
      const h = stageHistory(q({ dateSent: rnd() < 0.9 ? D(2, 10) : undefined, status }), log);
      for (let i = 0; i < h.spans.length; i++) {
        const s = h.spans[i];
        if (s.endMs != null) expect(s.endMs).toBeGreaterThanOrEqual(s.startMs);
        if (i > 0) expect(s.startMs, "a span begins where the one before it ended").toBe(h.spans[i - 1].endMs);
      }
      const cur = h.spans.filter((s) => s.current);
      if (h.dated) { tally.dated++; expect(cur).toHaveLength(1); expect(cur[0].status).toBe(status); expect(h.currentStartMs).toBe(cur[0].startMs); }
      else { tally.undated++; expect(cur).toHaveLength(0); expect(h.currentStartMs).toBeNull(); }
      if (h.spans.length > 2) tally.multi++;
    }
    /* every branch was entered, or the property was only ever asked of one shape */
    expect(tally.dated).toBeGreaterThan(20); expect(tally.undated).toBeGreaterThan(20); expect(tally.multi).toBeGreaterThan(20);
  });
});

describe("dayN and anyToMs", () => {
  const now = ms(D(9, 19));
  it("live: days since it was sent", () => {
    const query = q({ dateSent: D(5, 6) });
    expect(dayN(query, stageHistory(query, []), now)).toBe(136);
  });
  it("closed: days until it closed", () => {
    const query = q({ dateSent: D(3, 14), status: QueryStatus.REJECTED });
    expect(dayN(query, stageHistory(query, [rung(QueryStatus.REJECTED, D(7, 3))]), now)).toBe(111);
  });
  it("⚠️ closed with no close date: OMITTED, never Day 0", () => {
    const query = q({ dateSent: D(3, 14), status: QueryStatus.NO_RESPONSE });
    expect(dayN(query, stageHistory(query, []), now)).toBeNull();
  });
  it("never sent: omitted", () => {
    const query = q({ dateSent: undefined });
    expect(dayN(query, stageHistory(query, []), now)).toBeNull();
  });
  it("anyToMs reads strings, Dates, numbers, Timestamps and seconds-objects, and nothing else", () => {
    const t = ms(D(5, 6));
    expect(anyToMs(D(5, 6))).toBe(t);
    expect(anyToMs(new Date(t))).toBe(t);
    expect(anyToMs(t)).toBe(t);
    expect(anyToMs({ toDate: () => new Date(t) })).toBe(t);
    expect(anyToMs({ seconds: t / 1000 })).toBe(t);
    for (const bad of [null, undefined, "", "not a date", {}, NaN]) expect(anyToMs(bad)).toBeNull();
  });
});
