/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card offers v1 — Phase 1 locks CO1–CO7 on the pure engine (`cardOffers`). The fixture is the mock's: Sarah Jones,
 * eight weeks, one query sent 21 Oct, today 11 Nov 2026. The nudge each query carries is the one the log flow writes
 * (`defaultNudgeMs`), never a typed date, so a change to that rule moves the fixture with it.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, SubmissionStatus, type Agent, type Query } from "../types";
import { draftFromAgentRecord, alsoChanges } from "./contactEdit";
import { expectedFor } from "./qcSummary";
import { writerExpectedWrite } from "./expectedDate";
import { cardOffers, defaultNudgeMs, offerPlan, saveExtras, offerToast } from "./cardOffers";
import { dayIso } from "./queryActions/dates";

const NOW = new Date(2026, 10, 11, 12).getTime();
const DAY = 86_400_000;
const SARAH: Agent = {
  id: "a-sarah", userId: "u", name: "Sarah Jones", agency: "Harbour Lane Literary", responseTimeWeeks: 8,
  submissionStatus: SubmissionStatus.OPEN, genres: ["Thriller"],
} as unknown as Agent;
const sentOn = (y: number, m: number, d: number) => new Date(y, m, d, 12).toISOString();
function query(over: Partial<Query> = {}): Query {
  const q = { id: "q1", userId: "u", agentId: SARAH.id, manuscriptId: "ms1", status: QueryStatus.QUERIED, dateSent: sentOn(2026, 9, 21), ...over } as Query;
  /* the nudge the log flow wrote: a week after the expected date, off the weekend */
  if (!("nudgeDate" in over)) {
    const e = expectedFor(q, SARAH).ms;
    if (e != null) (q as { nudgeDate?: string }).nudgeDate = dayIso(new Date(defaultNudgeMs(e)));
  }
  return q;
}
const draft = (over: Partial<ReturnType<typeof draftFromAgentRecord>> = {}, a: Agent = SARAH) => ({ ...draftFromAgentRecord(a), ...over });
const titleOf = () => "The Lighthouse Keeper";

describe("CO1 · the response-time offer appears only for a Queried query whose date comes from the window", () => {
  it("8 → 6 weeks with an agent-dated Queried query: one row, old and new expected from expectedFor", () => {
    const q = query();
    const o = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [q], NOW, { titleOf });
    expect(o.rt?.queries).toHaveLength(1);
    const r = o.rt!.queries[0];
    expect(r.oldExpMs).toBe(expectedFor(q, SARAH).ms);
    expect(r.newExpMs).toBe(expectedFor(q, { ...SARAH, responseTimeWeeks: 6 }).ms);
    expect(r.title).toBe("The Lighthouse Keeper");
    expect(r.nudge?.moves, "the nudge the log flow wrote moves with the window").toBe(true);
    expect(r.nudge?.newMs).toBe(defaultNudgeMs(r.newExpMs));
  });
  it("no change of weeks, no offer", () => {
    expect(cardOffers(SARAH, draft(), [query()], NOW).rt).toBeUndefined();
  });
  it("a partial or full request gets no offer, and a quiet line instead", () => {
    for (const [status, stage] of [[QueryStatus.PARTIAL_REQUESTED, "partial"], [QueryStatus.FULL_REQUESTED, "full"]] as const) {
      const o = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [query({ status })], NOW);
      expect(o.rt, status).toBeUndefined();
      expect(o.quiet).toContain(`Your ${stage} request with Sarah has its own dates, so nothing else moves.`);
    }
  });
  it("number → Unknown, and Unknown → number: no offer, one quiet line each (the mock's)", () => {
    const cleared = cardOffers(SARAH, draft({ responseTimeWeeks: null }), [query()], NOW);
    expect(cleared.rt).toBeUndefined();
    expect(cleared.quiet).toEqual(["Your query from 21 Oct won’t have a reply date until you know Sarah’s response time."]);
    const none = { ...SARAH, responseTimeWeeks: undefined } as Agent;
    const set = cardOffers(none, draft({ responseTimeWeeks: 6 }, none), [query({ nudgeDate: undefined })], NOW);
    expect(set.rt).toBeUndefined();
    expect(set.quiet).toEqual(["Your query from 21 Oct gets a reply date of 2 Dec when you save."]);
  });
  it("another agent's query, or a closed one, is not in the offer", () => {
    const o = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [query({ agentId: "other" }), query({ id: "q2", status: QueryStatus.REJECTED })], NOW);
    expect(o.rt).toBeUndefined();
  });
});

describe("CO2 · a new date already passed: the row says so, and the nudge reads Today", () => {
  it("8 → 2 weeks on a query sent 21 Oct (new reply date 4 Nov < 11 Nov)", () => {
    const o = cardOffers(SARAH, draft({ responseTimeWeeks: 2 }), [query()], NOW);
    const r = o.rt!.queries[0];
    expect(r.past).toBe(true);
    expect(r.nudge?.today).toBe(true);
    expect(new Date(r.nudge!.newMs).toDateString()).toBe(new Date(NOW).toDateString());
  });
  it("a date still ahead is not past and its nudge is not today", () => {
    const r = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [query()], NOW).rt!.queries[0];
    expect(r.past).toBe(false);
    expect(r.nudge?.today).toBe(false);
  });
});

describe("CO3 · a writer's or reply-sourced date does not move, so it is not in the offer", () => {
  it("a writer's own expected date (stamped): no row, a quiet line naming the date it keeps", () => {
    const q = query({ ...(writerExpectedWrite(sentOn(2026, 11, 20), new Date(NOW - DAY)) as Partial<Query>) });
    const o = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [q], NOW);
    expect(o.rt).toBeUndefined();
    expect(o.quiet).toEqual(["Your query from 21 Oct keeps its own reply date of 20 Dec."]);
  });
  it("a reply restart (the wait restarted from a date) is not the window's either", () => {
    const o = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [query({ replyRestartedOn: sentOn(2026, 10, 1) } as Partial<Query>)], NOW);
    expect(o.rt).toBeUndefined();
  });
  it("a nudge the writer moved themselves stays where they put it", () => {
    const r = cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [query({ nudgeDate: sentOn(2026, 11, 2) })], NOW).rt!.queries[0];
    expect(r.nudge?.moves).toBe(false);
    expect(r.nudge?.newMs).toBe(r.nudge?.oldMs);
    expect(offerPlan(cardOffers(SARAH, draft({ responseTimeWeeks: 6 }), [query({ nudgeDate: sentOn(2026, 11, 2) })], NOW), "update", null).moveNudge).toEqual([]);
  });
});

describe("CO4 · Suggested is Close it as no reply only when past its date AND no response means no", () => {
  const closed = (over = {}) => draft({ submissionStatus: SubmissionStatus.CLOSED, ...over });
  const old = () => query({ dateSent: sentOn(2026, 8, 3) }); // 3 Sep: past 29 Oct
  it("past + no response means no → close", () => {
    expect(cardOffers(SARAH, closed({ noResponseMeansNo: true }), [old()], NOW).close?.suggest).toBe("close");
  });
  it("past, but they always reply → keep", () => {
    expect(cardOffers(SARAH, closed({ noResponseMeansNo: false }), [old()], NOW).close?.suggest).toBe("keep");
  });
  it("within the window, no response means no → keep", () => {
    expect(cardOffers(SARAH, closed({ noResponseMeansNo: true }), [query()], NOW).close?.suggest).toBe("keep");
  });
  it("within the window, policy not stated → keep (the mock's first case)", () => {
    const o = cardOffers(SARAH, closed(), [query()], NOW);
    expect(o.close?.suggest).toBe("keep");
    expect(o.close?.queries[0].past).toBe(false);
  });
  it("only a change TO closed offers it", () => {
    const already = { ...SARAH, submissionStatus: SubmissionStatus.CLOSED } as Agent;
    expect(cardOffers(already, draft({}, already), [old()], NOW).close).toBeUndefined();
  });
});

describe("CO5 · a partial or full in progress: the safe note, never a close option", () => {
  it("full requested", () => {
    const o = cardOffers(SARAH, draft({ submissionStatus: SubmissionStatus.CLOSED }), [query({ status: QueryStatus.FULL_REQUESTED })], NOW);
    expect(o.close).toBeUndefined();
    expect(o.safe).toEqual({ stage: "full" });
  });
  it("partial requested", () => {
    const o = cardOffers(SARAH, draft({ submissionStatus: SubmissionStatus.CLOSED }), [query({ status: QueryStatus.PARTIAL_REQUESTED })], NOW);
    expect(o.close).toBeUndefined();
    expect(o.safe).toEqual({ stage: "partial" });
  });
});

describe("CO6 · closing the query as no reply stands the response-time offer down", () => {
  it("closed + 8 → 6, choice close: no rt offer, the mock's quiet line", () => {
    const d = draft({ submissionStatus: SubmissionStatus.CLOSED, responseTimeWeeks: 6, reopensOn: "2027-01-01" });
    const o = cardOffers(SARAH, d, [query()], NOW, { close: "close" });
    expect(o.rt).toBeUndefined();
    expect(o.quiet).toContain("Your query is closing as no reply, so its dates don’t need to move.");
    expect(saveExtras(offerPlan(o, "update", "close"))).toEqual(["closes 1 query as no reply"]);
    expect(offerToast(offerPlan(o, "update", "close"))).toBe("Saved · query closed as no reply");
  });
  it("…and with Leave it open the rt offer stands", () => {
    const d = draft({ submissionStatus: SubmissionStatus.CLOSED, responseTimeWeeks: 6, reopensOn: "2027-01-01" });
    const o = cardOffers(SARAH, d, [query()], NOW, { close: "keep" });
    expect(o.rt?.queries).toHaveLength(1);
    expect(saveExtras(offerPlan(o, "keep", "keep"))).toEqual(["1 query stays open", "1 query keeps its dates"]);
  });
});

describe("CO7 · no line that needs no decision survives on the card", () => {
  /* the "Also changes" lines the card used to draw for these edits: counts, genres, NRN, Analytics, the surfaces */
  const RETIRED = [/counts move/i, /Open to queries becomes/i, /^Want /i, /marked as/i, /Analytics/i, /To-do list and Dashboard/i, /when a quiet query suggests/i, /log-a-query sheet/i, /Query Centre and Birds-eye/i, /Dashboard feed/i];
  const edits = [
    draft({ submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2027-01-01" }),
    draft({ genres: [] }),
    draft({ noResponseMeansNo: true }),
    draft({ responseTimeWeeks: 6 }),
    draft({ name: "Sarah Jones-Pike" }),
  ];
  const ctx = { queries: [query()], agents: [SARAH], msGenre: "Thriller", msTitle: "The Lighthouse Keeper", nowMs: NOW };
  it("the denylist is real: today's alsoChanges produces those lines for these edits", () => {
    const lines = edits.flatMap((d) => alsoChanges(SARAH, d, ctx).flatMap((n) => n.lines));
    expect(lines.filter((l) => RETIRED.some((re) => re.test(l))).length).toBeGreaterThan(3);
  });
  it("cardOffers produces none of them", () => {
    const lines = edits.flatMap((d) => cardOffers(SARAH, d, [query()], NOW).quiet);
    expect(lines.filter((l) => RETIRED.some((re) => re.test(l)))).toEqual([]);
  });
  it("the one footnote kept: closing without a reopening date", () => {
    expect(cardOffers(SARAH, draft({ submissionStatus: SubmissionStatus.CLOSED }), [], NOW).quiet)
      .toEqual(["Without a reopening date there’s no reminder. Housekeeping will ask for one."]);
  });
});
