/**
 * Card journeys v1, Phase 5 — Reopen's save (cjReopen `REOPEN_SPEC.write.plans`), through the real planner:
 *   P1  "I closed it too soon": the closing step comes off the query's own log (and its feed twin), nothing new is
 *       added, and the status the log is left with is the one before the close; the reply clock restarts today
 *   P2  any close: a pass, no reply, a withdrawal (the composer's "recorded by mistake" handled only a pass)
 *   P3  the reminder: "Give it another" sets nudgeDate; "No reminder" clears it
 *   P4  the journey is live
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Query } from "../../../types";
import { REOPEN_SPEC } from "./cjReopen";
import { CJ_SPECS } from "./cardJourneySpecs";
import { CARD_JOURNEY_LIVE } from "../../../lib/queryActions/cardJourneys";
import type { CJCtx } from "./QcCardJourney";

const NOW = new Date(2026, 10, 24, 12).getTime();
const q = (status: QueryStatus): Query => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status, dateSent: "2026-09-01" } as Query);
const ctx = (qq: Query): CJCtx => ({ q: qq, first: "Theo", nowMs: NOW, book: {} as never, synopses: [], versions: [], weeks: null, othersN: 0, log: [], book_queries: [qq] });
const step = (id: string, st: QueryStatus, iso: string) => ({ id, data: { type: st, resultingStatus: st, createdAt: iso, note: "" } });
const pc = (qq: Query, closeSt: QueryStatus) => ({
  uid: "u1", q: qq, agent: { id: "a1", name: "Theo Marsh" } as never, ms: null, nowMs: NOW, quietWeeks: 6,
  existing: [step("s0", QueryStatus.QUERIED, "2026-09-01T12:00:00.000Z"), step("s1", QueryStatus.PARTIAL_REQUESTED, "2026-09-20T12:00:00.000Z"), step("s2", QueryStatus.PARTIAL_SENT, "2026-09-25T12:00:00.000Z"), step("s3", closeSt, "2026-11-03T12:00:00.000Z")],
  feed: [{ id: "f3", data: { logEntryId: "s3", queryId: "q1", resultingStatus: closeSt } }],
});

describe("card journeys v1 · Reopen takes the close off", () => {
  for (const st of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) {
    it(`P1/P2 ${st}: the close comes off, back to Partial Sent`, () => {
      const qq = q(st);
      const p = REOPEN_SPEC.write.plans(pc(qq, st), { why: "soon", wk: 4, none: false, nudgeOk: true }, ctx(qq));
      expect(p[0].del).toContain("queries/q1/activity/s3");
      expect(p[0].set.filter((s) => s.path.includes("/activity/")).length).toBe(0);
      expect(p[0].query.status).toBe(QueryStatus.PARTIAL_SENT);
      expect(typeof p[0].query.replyRestartedOn).toBe("string");
    });
  }
  it("P3 the reminder", () => {
    const qq = q(QueryStatus.NO_RESPONSE);
    const on = REOPEN_SPEC.write.plans(pc(qq, QueryStatus.NO_RESPONSE), { why: "soon", wk: 4, none: false, nudgeOk: true }, ctx(qq));
    expect(String(on[0].query.nudgeDate)).toMatch(/^2026-12-22/);
    const off = REOPEN_SPEC.write.plans(pc(qq, QueryStatus.NO_RESPONSE), { why: "soon", wk: 4, none: true, nudgeOk: true }, ctx(qq));
    expect("nudgeDate" in off[0].query && off[0].query.nudgeDate === undefined).toBe(true);
  });
  it("P4 the journey is live", () => {
    expect(CJ_SPECS.reopen).toBe(REOPEN_SPEC);
    expect(CARD_JOURNEY_LIVE.reopen).toBe(true);
  });
});
