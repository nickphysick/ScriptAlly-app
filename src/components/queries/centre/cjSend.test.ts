/**
 * Card journeys v1, Phase 2 — Mark sent's save (cjSend `SEND_SPEC.write.plans`), through the real planner:
 *   M1  a partial request → one Partial Sent step with what went (the sample and its version, the named synopsis)
 *   M2  a full request and an offer's "send the full" → Full Sent; a revise and resubmit → Resubmitted
 *   M3  the reply time: a date + the stamp; Unknown → the stamp with no date (the card's "No date yet"); the nudge
 *       date only when the tick is on, cleared otherwise
 *   M4  every step is asked (Agent · What went · Sent · Reply time · Log) and the journey is live
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Query } from "../../../types";
import { SEND_SPEC, type SendState } from "./cjSend";
import { matLabel } from "../../../lib/qc152Write";
import { CJ_SPECS } from "./cardJourneySpecs";
import { CARD_JOURNEY_LIVE } from "../../../lib/queryActions/cardJourneys";
import type { CJCtx } from "./QcCardJourney";

const NOW = new Date(2026, 10, 24, 12).getTime();
const q = (over: Partial<Query>): Query => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-10-01", ...over } as Query);
const ctx = (qq: Query): CJCtx => ({
  q: qq, first: "Rosalind", nowMs: NOW, book: { words: 90000, chapters: 30, pages: 300 } as never,
  synopses: [{ id: "syn1", name: "One-page synopsis" }], versions: [{ id: "v2", name: "Version 2", current: true }, { id: "v1", name: "Version 1", current: false }],
  weeks: null, othersN: 0, log: [{ id: "r1", queryId: "q1", date: "2026-11-14T12:00:00.000Z", resultingStatus: QueryStatus.PARTIAL_REQUESTED, materials: [{ kind: "sample", unit: "pages", n: 50 }] } as never],
  book_queries: [qq],
});
const pc = (qq: Query) => ({ uid: "u1", q: qq, agent: { id: "a1", name: "Rosalind Ashby", agency: "Ashby & Lowe" } as never, ms: null, existing: [], feed: [], nowMs: NOW, quietWeeks: 6 });
const answered = (c: CJCtx, over: Partial<SendState> = {}): SendState => ({ ...SEND_SPEC.init(c), wentOk: true, sentMs: NOW, replyOk: true, ...over });
const stepOf = (plans: ReturnType<typeof SEND_SPEC.write.plans>) => plans[0].set.find((s) => s.path.includes("/activity/"))!.data;

describe("card journeys v1 · Mark sent saves through the card's own send", () => {
  it("M1 a partial: Partial Sent, with what went", () => {
    const c = ctx(q({}));
    const s = answered(c, { went: { main: true, syn: true, x: [] } });
    const plans = SEND_SPEC.write.plans(pc(c.q), s, c);
    expect(plans).toHaveLength(1);
    expect(stepOf(plans).resultingStatus).toBe(QueryStatus.PARTIAL_SENT);
    expect(stepOf(plans).materials).toEqual([
      expect.objectContaining({ kind: "sample", unit: "pages", n: 50, versionId: "v2" }), expect.objectContaining({ kind: "synopsis", name: "One-page synopsis" }),
    ]);
    expect(plans[0].query.status).toBe(QueryStatus.PARTIAL_SENT);
  });
  it("M2 the full, an offer's full, and a resubmission", () => {
    for (const [over, want] of [
      [{ status: QueryStatus.FULL_REQUESTED }, QueryStatus.FULL_SENT],
      [{ status: QueryStatus.QUERIED, offerReply: "full", offerRefQueryId: "q9" }, QueryStatus.FULL_SENT],
      [{ status: QueryStatus.REVISE_RESUBMIT }, QueryStatus.RESUBMITTED],
    ] as [Partial<Query>, QueryStatus][]) {
      const c = ctx(q(over));
      expect(stepOf(SEND_SPEC.write.plans(pc(c.q), answered(c), c)).resultingStatus).toBe(want);
    }
  });
  it("M3 the reply time and the nudge", () => {
    const c = ctx(q({}));
    const dated = SEND_SPEC.write.plans(pc(c.q), answered(c, { wk: 8, nudge: true }), c)[0].query;
    expect(String(dated.writerExpectedDate)).toMatch(/^2027-01-19/);
    expect(typeof dated.writerExpectedSetAt).toBe("string");
    expect(String(dated.nudgeDate)).toMatch(/^2027-01-19/);
    const noNudge = SEND_SPEC.write.plans(pc(c.q), answered(c, { nudge: false }), c)[0].query;
    expect("nudgeDate" in noNudge && noNudge.nudgeDate === undefined).toBe(true);
    const unknown = SEND_SPEC.write.plans(pc(c.q), answered(c, { wkNone: true }), c)[0].query;
    expect("writerExpectedDate" in unknown && unknown.writerExpectedDate === undefined).toBe(true);
    expect(typeof unknown.writerExpectedSetAt).toBe("string");
    expect(unknown.nudgeDate).toBeUndefined();
  });
  it("M5 a sample asked with no size starts at the size the asked-for card names", () => {
    for (const asked of [{ kind: "sample", unit: "pages" }, { kind: "sample" }, { kind: "sample", unit: "words", n: 3000 }]) {
      const c = { ...ctx(q({})), log: [{ id: "r1", queryId: "q1", date: "2026-11-14T12:00:00.000Z", resultingStatus: QueryStatus.PARTIAL_REQUESTED, materials: [asked] } as never] };
      const s = SEND_SPEC.init(c);
      const went = SEND_SPEC.write.plans(pc(c.q), { ...s, wentOk: true, sentMs: NOW, replyOk: true }, c)[0].set.find((x) => x.path.includes("/activity/"))!.data.materials[0];
      expect(matLabel(went as never)).toBe(matLabel(asked as never));
    }
  });
  it("M4 every step is asked, and the journey is live", () => {
    const c = ctx(q({}));
    expect(SEND_SPEC.stages(SEND_SPEC.init(c), c)).toEqual(["agent", "went", "sent", "reply", "log"]);
    expect(CJ_SPECS.send).toBe(SEND_SPEC);
    expect(CARD_JOURNEY_LIVE.send).toBe(true);
  });
});
