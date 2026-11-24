/**
 * Card journeys v1, Phase 4 — Answer an offer's save (cjOffer `OFFER_SPEC.write.plans`), through the real planners:
 *   O1  "I accepted" → the Signed step (lib/qc1522Write `planSigned`), dated the day you told them; Others is asked only
 *       when other queries are open
 *   O2  with "Put it on my to-do list", every other open query gets the existing tell mark (`offerTold: false`, the
 *       offer as its reference) and they are in the save's snapshot; with "Not now", none is touched
 *   O3  "I turned it down" → Withdrawn with the token `offer_declined` (the card's own words: "You declined")
 *   O4  the journey is live
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Query } from "../../../types";
import { OFFER_SPEC } from "./cjOffer";
import { CJ_SPECS } from "./cardJourneySpecs";
import { CARD_JOURNEY_LIVE } from "../../../lib/queryActions/cardJourneys";
import type { CJCtx } from "./QcCardJourney";

const NOW = new Date(2026, 10, 24, 12).getTime();
const q = (): Query => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.OFFER, dateSent: "2026-08-11" } as Query);
const ctx = (others: string[]): CJCtx => ({ q: q(), first: "Eleanor", nowMs: NOW, book: {} as never, synopses: [], versions: [], weeks: null, othersN: others.length, otherIds: others, log: [], book_queries: [q()] });
const pc = () => ({ uid: "u1", q: q(), agent: { id: "a1", name: "Eleanor Voss" } as never, ms: null, existing: [], feed: [], nowMs: NOW, quietWeeks: 6 });
const stepOf = (p: ReturnType<typeof OFFER_SPEC.write.plans>) => p[0].set.find((s) => s.path.includes("/activity/"))!.data;
const day = new Date(2026, 10, 23).getTime();

describe("card journeys v1 · Answer an offer saves through the card's own answer", () => {
  it("O1 accepted: Signed, on the day; Others only with other queries open", () => {
    const c = ctx(["q2", "q3"]);
    expect(OFFER_SPEC.stages({ ans: "yes", whenMs: null, others: null }, c)).toEqual(["agent", "answer", "when", "others", "log"]);
    expect(OFFER_SPEC.stages({ ans: "yes", whenMs: null, others: null }, ctx([]))).toEqual(["agent", "answer", "when", "log"]);
    expect(OFFER_SPEC.stages({ ans: "no", whenMs: null, others: null }, c)).toEqual(["agent", "answer", "when", "log"]);
    const p = OFFER_SPEC.write.plans(pc(), { ans: "yes", whenMs: day, others: "no" }, c);
    expect(stepOf(p).resultingStatus).toBe(QueryStatus.SIGNED);
    expect(new Date((stepOf(p).createdAt as { toMillis: () => number }).toMillis()).getDate()).toBe(23);
    expect(p[0].query.status).toBe(QueryStatus.SIGNED);
  });
  it("O2 the tell marks, only with the task", () => {
    const c = ctx(["q2", "q3"]);
    const withTask = OFFER_SPEC.write.plans(pc(), { ans: "yes", whenMs: day, others: "task" }, c);
    const marks = (withTask[0].update ?? []).filter((u) => /queries\/q[23]$/.test(u.path));
    expect(marks.map((m) => [m.path, m.data.offerTold, m.data.offerRefQueryId])).toEqual([["queries/q2", false, "q1"], ["queries/q3", false, "q1"]]);
    expect(OFFER_SPEC.write.extraIds!({ ans: "yes", whenMs: day, others: "task" }, c)).toEqual(["q2", "q3"]);
    const none = OFFER_SPEC.write.plans(pc(), { ans: "yes", whenMs: day, others: "no" }, c);
    expect((none[0].update ?? []).length).toBe(0);
    expect(OFFER_SPEC.write.extraIds!({ ans: "yes", whenMs: day, others: "no" }, c)).toEqual([]);
  });
  it("O3 turned down: Withdrawn, offer declined", () => {
    const p = OFFER_SPEC.write.plans(pc(), { ans: "no", whenMs: day, others: null }, ctx(["q2"]));
    expect(stepOf(p).resultingStatus).toBe(QueryStatus.WITHDRAWN);
    expect(stepOf(p).eventKey).toBe("offer_declined");
    expect(p[0].query.status).toBe(QueryStatus.WITHDRAWN);
  });
  it("O4 the journey is live", () => {
    expect(CJ_SPECS.offer).toBe(OFFER_SPEC);
    expect(CARD_JOURNEY_LIVE.offer).toBe(true);
  });
});
