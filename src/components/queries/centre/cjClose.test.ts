/**
 * Card journeys v1, Phase 3 — Close's save (cjClose `CLOSE_SPEC.write.plans`), through the real planner:
 *   K1  "No reply" closes as No Response, dated today, and has no When step
 *   K2  "I withdrew it" asks when, and closes as Withdrawn on that day with the token "withdrew"
 *   K3  the nudge reminder and the close plan come off with it
 *   K4  the journey is live
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Query } from "../../../types";
import { CLOSE_SPEC } from "./cjClose";
import { CJ_SPECS } from "./cardJourneySpecs";
import { CARD_JOURNEY_LIVE } from "../../../lib/queryActions/cardJourneys";
import type { CJCtx } from "./QcCardJourney";

const NOW = new Date(2026, 10, 24, 12).getTime();
const q = (over: Partial<Query> = {}): Query => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-10-12", ...over } as Query);
const ctx = (qq: Query): CJCtx => ({ q: qq, first: "Priya", nowMs: NOW, book: {} as never, synopses: [], versions: [], weeks: null, othersN: 0, log: [], book_queries: [qq] });
const pc = (qq: Query) => ({ uid: "u1", q: qq, agent: { id: "a1", name: "Priya Shah" } as never, ms: null, existing: [], feed: [], nowMs: NOW, quietWeeks: 6 });
const stepOf = (p: ReturnType<typeof CLOSE_SPEC.write.plans>) => p[0].set.find((s) => s.path.includes("/activity/"))!.data;

describe("card journeys v1 · Close saves through the card's own close", () => {
  it("K1 no reply: No Response, today, no When step", () => {
    const c = ctx(q());
    expect(CLOSE_SPEC.stages({ why: "noreply", whenMs: NOW }, c)).toEqual(["agent", "why", "log"]);
    const p = CLOSE_SPEC.write.plans(pc(c.q), { why: "noreply", whenMs: new Date(2026, 10, 24).getTime() }, c);
    expect(stepOf(p).resultingStatus).toBe(QueryStatus.NO_RESPONSE);
    expect(stepOf(p).eventKey).toBe("closed_no_reply");
    expect(p[0].query.status).toBe(QueryStatus.NO_RESPONSE);
  });
  it("K2 withdrawn: asks when, Withdrawn on that day", () => {
    const c = ctx(q());
    expect(CLOSE_SPEC.stages({ why: "withdraw", whenMs: null }, c)).toEqual(["agent", "why", "when", "log"]);
    const day = new Date(2026, 10, 20).getTime();
    const p = CLOSE_SPEC.write.plans(pc(c.q), { why: "withdraw", whenMs: day }, c);
    expect(stepOf(p).resultingStatus).toBe(QueryStatus.WITHDRAWN);
    expect(stepOf(p).eventKey).toBe("withdrawn");
    expect(new Date((stepOf(p).createdAt as { toMillis: () => number }).toMillis()).getDate()).toBe(20);
  });
  it("K3 the reminder and the close plan come off", () => {
    const c = ctx(q({ nudgeDate: "2026-12-01", closePlan: "2026-12-20" } as Partial<Query>));
    const p = CLOSE_SPEC.write.plans(pc(c.q), { why: "noreply", whenMs: NOW }, c);
    expect("nudgeDate" in p[0].query && p[0].query.nudgeDate === undefined).toBe(true);
    expect("closePlan" in p[0].query && p[0].query.closePlan === undefined).toBe(true);
  });
  it("K4 the journey is live", () => {
    expect(CJ_SPECS.close).toBe(CLOSE_SPEC);
    expect(CARD_JOURNEY_LIVE.close).toBe(true);
  });
});
