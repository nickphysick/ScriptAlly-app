/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The chart's three bands — the properties, not the pixels.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Query } from "../types";
import { bandsAt, bandSeries, undatedNow, BAND_KEYS, BAND_LABEL } from "./chartBands";
import { dailyLedger } from "./oneScreen";

const D = (s: string) => new Date(`${s}T12:00:00.000Z`);
const ms = (s: string) => D(s).getTime();
const q = (over: Partial<Query>): Query => ({
  id: String(Math.random()), userId: "u", manuscriptId: "m", agentId: "a", packageId: "",
  status: QueryStatus.QUERIED, personalisationNotes: "", sendMethod: "Email" as any, ...over,
}) as Query;

describe("the three bands place a query by its dated rungs", () => {
  it("a query with only a send date is sand, from the day it went out", () => {
    const one = [q({ dateSent: "2026-03-01" })];
    expect(bandsAt(one, ms("2026-02-28"))).toEqual({ queried: 0, agent: 0, you: 0, undated: 0 });
    expect(bandsAt(one, ms("2026-03-02"))).toEqual({ queried: 1, agent: 0, you: 0, undated: 0 });
  });

  it("a full request moves it to pink, and sending the full moves it to sage", () => {
    const one = [q({
      status: QueryStatus.FULL_SENT,
      dateSent: "2026-03-01", fullRequestedDate: "2026-04-01", fullSentDate: "2026-05-01",
    })];
    expect(bandsAt(one, ms("2026-03-15")).queried).toBe(1);
    expect(bandsAt(one, ms("2026-04-15")).you).toBe(1);
    expect(bandsAt(one, ms("2026-05-15")).agent).toBe(1);
  });

  it("a closed query leaves the bands entirely — it is not folded anywhere", () => {
    const one = [q({
      status: QueryStatus.REJECTED, dateSent: "2026-03-01",
      lastStatusChange: "2026-06-01", rejectedDate: "2026-06-01",
    })];
    expect(bandsAt(one, ms("2026-05-01")).queried).toBe(1);
    const after = bandsAt(one, ms("2026-07-01"));
    expect(after).toEqual({ queried: 0, agent: 0, you: 0, undated: 0 });
  });
});

describe("what the record cannot place, it says so about", () => {
  /**
   * ⚠️ THE SLATE BAND WAS CUT FOR A MISSING `offerDate`, AND THAT IS NOT WHY IT HAD NOTHING TO DRAW.
   * `oneScreen`'s `TERMINAL` set — which `dailyLedger`'s `closedAt` reads — CONTAINS `OFFER`, so an
   * open offer has never been part of the active line this chart draws. It leaves the bands the same
   * way a rejection does: by being closed, not by being unplaceable. Asserted so nobody re-derives
   * the "offers are undated" story the first draft of this module told.
   */
  it("an open offer is CLOSED to this chart — it leaves the bands, it is not undated", () => {
    const one = [q({
      status: QueryStatus.OFFER, dateSent: "2026-03-01",
      fullSentDate: "2026-05-01", lastStatusChange: "2026-05-20",
    })];
    expect(bandsAt(one, ms("2026-04-01")).queried).toBe(1);   // before the offer, on the board
    expect(bandsAt(one, ms("2026-06-01"))).toEqual({ queried: 0, agent: 0, you: 0, undated: 0 });
    expect(undatedNow([...one], D("2026-06-01"))).toBe(0);
  });

  /**
   * ⚠️ THE INSIGHT THAT MAKES THREE BANDS USABLE, AND THE CASE THAT PROVES IT IS NOT LUCK.
   * A transition whose two sides are the SAME band needs no date. Full Requested and R&R are both
   * "your move", so the interval reads pink whenever the flip happened.
   */
  it("an R&R after a request is pink throughout — the undated transition does not cross a band", () => {
    const one = [q({
      status: QueryStatus.REVISE_RESUBMIT, dateSent: "2026-03-01", fullRequestedDate: "2026-04-01",
    })];
    expect(bandsAt(one, ms("2026-06-01"))).toEqual({ queried: 0, agent: 0, you: 1, undated: 0 });
  });

  it("…but an R&R after a SEND does cross one, and is undated from the send", () => {
    const one = [q({
      status: QueryStatus.REVISE_RESUBMIT, dateSent: "2026-03-01",
      fullRequestedDate: "2026-04-01", fullSentDate: "2026-05-01",
    })];
    expect(bandsAt(one, ms("2026-04-15")).you).toBe(1);
    expect(bandsAt(one, ms("2026-05-15"))).toEqual({ queried: 0, agent: 0, you: 0, undated: 1 });
  });
});

describe("the bands and the total line are one reading", () => {
  /* ⚠️ THE PROPERTY THAT MATTERS, and it is asserted against the LEDGER rather than against a
     hand-written expectation on both sides — the reconciliation idiom this repo already uses for
     the urgent count and the agent-list axes. If the two ever disagreed, the card would state two
     different numbers of active queries in one frame. */
  it("bands + undated === the ledger's active, at every point and every mixture", () => {
    const now = D("2026-07-01");
    const queries = [
      q({ dateSent: "2026-03-01" }),
      q({ status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-03-05", partialRequestedDate: "2026-04-02" }),
      q({ status: QueryStatus.PARTIAL_SENT, dateSent: "2026-03-09", partialRequestedDate: "2026-04-03", partialSentDate: "2026-04-20" }),
      q({ status: QueryStatus.FULL_SENT, dateSent: "2026-03-11", fullRequestedDate: "2026-05-01", fullSentDate: "2026-05-20" }),
      q({ status: QueryStatus.OFFER, dateSent: "2026-03-14", fullSentDate: "2026-05-25" }),
      q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: "2026-03-18", fullRequestedDate: "2026-05-02" }),
      /* ⚠️ THE BAND-CROSSING R&R — the ONLY thing in this app that produces an `undated` point, and
         the fixture had none until the monoculture guard below said so. Its last dated rung is a
         SEND (sage) and it now stands over-to-you (pink), so the flip crossed a band and the record
         does not say when. Without this row every `undated` assertion in this file passed over a
         sample that never produced one. */
      q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: "2026-03-25",
          fullRequestedDate: "2026-04-10", fullSentDate: "2026-05-06" }),
      q({ status: QueryStatus.REJECTED, dateSent: "2026-03-20", lastStatusChange: "2026-06-10", rejectedDate: "2026-06-10" }),
      q({ status: QueryStatus.NO_RESPONSE, dateSent: "2026-03-22", lastStatusChange: "2026-06-15" }),
    ];
    const daily = dailyLedger(queries, now);
    expect(daily.length).toBeGreaterThan(100);
    const bands = bandSeries(daily, queries, now);
    for (let i = 0; i < daily.length; i++) {
      const b = bands[i];
      expect(b.queried + b.agent + b.you + b.undated, `point ${i} (${daily[i].label})`).toBe(daily[i].active);
    }
    /* ⚠️ AND THE SAMPLE MUST NOT BE A MONOCULTURE — a sweep where every point is the same point
       proves nothing about the branches. Every band must be non-zero somewhere, and `undated` too,
       or this passes over a fixture that never exercises what it claims to check. */
    for (const k of [...BAND_KEYS, "undated"] as const) {
      expect(bands.some((b) => b[k] > 0), `no point ever had a non-zero ${k}`).toBe(true);
    }
  });

  it("an account with nothing in it yields nothing, rather than a zeroed reading", () => {
    expect(bandSeries([], [], D("2026-07-01"))).toEqual([]);
    expect(undatedNow([], D("2026-07-01"))).toBe(0);
  });
});

describe("the vocabulary", () => {
  it("is three bands, in stack order, each with a name the legend can print", () => {
    expect(BAND_KEYS).toEqual(["queried", "agent", "you"]);
    expect(Object.keys(BAND_LABEL).sort()).toEqual([...BAND_KEYS].sort());
    /* ⚠️ NO SLATE. The fourth band is cut from this round, and a key for it here would be the first
       half of drawing it. */
    expect(BAND_KEYS).not.toContain("offer");
  });
});
