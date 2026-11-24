/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — THE MODEL'S LOCKS (lib/queryActions/respondStages). Each was proved red against a mutation of
 * the model before it was trusted (reports/record-a-response-v2/REPORT.md, "Locks").
 *
 *   M1  the likely replies first, by status (the brief's table), the rest behind "Another kind of reply"
 *   M2  the track: five steps until the reply is known, then the reply's own steps
 *   M3  the plan: the reply's step and status through the existing writer (recompute sets the status, never a write)
 *   M4  "it's gone": a second step (the send), the reply time and the nudge on the query's existing fields
 *   M5  revise and resubmit, "No, close the query": the reply then a close, the query closed
 *   M6  an offer told later: the flag rides on the offer step as it is made (no update of a step made in the same batch),
 *       every other open query marked `offerTold: false`
 *   M7  the extras asked for are the step's own materials (`kind: "other"`)
 *   M8  the two numbers are the app's own counts, and a query already counted changes nothing
 *   M9  the headline follows the reply
 *   M10 the colour: the query's own status, then the status it moves to, from the stage colour table
 *   M11 v2.1 — the recorded screen's head, big line and sentence agree with the status the card beneath shows
 *       (`newStatus`), for every kind and branch; no sentence narrates the status change
 */
import { describe, expect, it, vi } from "vitest";
/* the writers import the app's Firebase handle; the plans never touch it */
vi.mock("../firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Query } from "../../types";
import { STAGE_COLOURS } from "../stageColours";
import {
  GENERIC, askedMaterials, headline, likelyKinds, recordedCopy, newStatus, otherKinds, planOfResponse, queryAfter, respCounts, stagesOf, toneOf, toneStatus, type RespAnswers,
} from "./respondStages";

const NOW = new Date(2026, 10, 23, 12).getTime();
const DAYMS = 86_400_000;
const q0 = (over: Partial<Query> = {}): Query => ({
  id: "q1", userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-10-03", ...over,
} as unknown as Query);
const queried = { id: "s0", data: { type: QueryStatus.QUERIED, resultingStatus: QueryStatus.QUERIED, createdAt: new Date(2026, 9, 3, 12).toISOString(), note: "Queried", queryId: "q1" } };
const ctx = (q: Query) => ({ uid: "u", q, agent: null, ms: null, existing: [queried], feed: [], nowMs: NOW, quietWeeks: 6 });
const base = (over: Partial<RespAnswers> = {}): RespAnswers => ({
  kind: "pr", when: new Date(2026, 10, 23).getTime(), ask: { sample: true, full: true, syn: false, other: false }, extras: [], otherTx: "",
  samp: { unit: "pages", amt: 50, from: 1, sect: false, fu: null }, sentQ: "no", sentMs: new Date(2026, 10, 23).getTime(), went: null, wsamp: null,
  synName: null, verId: null, sendBy: new Date(2026, 10, 26).getTime(), expectBy: null, nudgeOn: null, words: "", rrNext: null, rrBy: null, ofBy: null, others: null, ...over,
});
const stepsOf = (plans: ReturnType<typeof planOfResponse>) => plans.flatMap((p) => p.set.filter((s) => s.path.includes("/activity/")).map((s) => s.data));

describe("M1 · the likely replies first", () => {
  it("by the query's status, as the brief lists them", () => {
    expect(likelyKinds(QueryStatus.QUERIED)).toEqual(["pr", "fr", "no"]);
    expect(likelyKinds(QueryStatus.PARTIAL_SENT)).toEqual(["fr", "no", "rr"]);
    expect(likelyKinds(QueryStatus.FULL_SENT)).toEqual(["of", "rr", "no"]);
    expect(likelyKinds(QueryStatus.PARTIAL_REQUESTED)).toEqual(["no"]);
    expect(otherKinds(QueryStatus.QUERIED)).toEqual(["rr", "of"]);
  });
});

describe("M2 · the track", () => {
  it("five steps until the reply is known, then the reply's own", () => {
    expect(GENERIC).toEqual(["who", "reply", "when", "details", "check"]);
    expect(stagesOf("pr")).toEqual(["who", "reply", "when", "asked", "sent", "check"]);
    expect(stagesOf("fr")).toEqual(["who", "reply", "when", "asked", "sent", "check"]);
    expect(stagesOf("rr")).toEqual(["who", "reply", "when", "words", "next", "check"]);
    expect(stagesOf("of")).toEqual(["who", "reply", "when", "by", "others", "check"]);
    expect(stagesOf("no")).toEqual(["who", "reply", "when", "words", "check"]);
  });
});

describe("M3–M7 · the plan is the existing writers", () => {
  it("M3 a partial asked for: one step, the status from the derivation, the send-by date", () => {
    const plans = planOfResponse(ctx(q0()), base(), []);
    expect(plans).toHaveLength(1);
    const st = stepsOf(plans);
    expect(st).toHaveLength(1);
    expect(st[0].resultingStatus).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(queryAfter(q0(), plans).status).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(newStatus(base())).toBe(QueryStatus.PARTIAL_REQUESTED);
  });
  it("M4 it's gone: the send's step after the reply, the reply time and the nudge on the query", () => {
    const expectBy = NOW + 56 * DAYMS;
    const a = base({ sentQ: "yes", went: { main: true, syn: true, x: [] }, wsamp: { unit: "pages", amt: 50, from: 1, sect: false, fu: null }, synName: "One-page synopsis", expectBy, nudgeOn: expectBy, sendBy: null });
    const plans = planOfResponse(ctx(q0()), a, []);
    const st = stepsOf(plans);
    expect(st.map((x) => x.resultingStatus)).toEqual([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT]);
    const after = queryAfter(q0(), plans) as unknown as Record<string, unknown>;
    expect(after.status).toBe(QueryStatus.PARTIAL_SENT);
    expect(typeof after.writerExpectedDate).toBe("string");
    expect(after.nudgeDate).toBe(after.writerExpectedDate);
    expect((st[1].materials as { kind: string; name?: string }[]).find((m) => m.kind === "synopsis")?.name).toBe("One-page synopsis");
  });
  it("M4 it's gone with no reply time: the old reply date and nudge are cleared, not left", () => {
    const a = base({ sentQ: "yes", went: { main: true, syn: false, x: [] }, wsamp: base().samp, expectBy: null, nudgeOn: null });
    const plans = planOfResponse(ctx(q0({ writerExpectedDate: "2026-12-01", nudgeDate: "2026-12-08" } as never)), a, []);
    const last = plans[plans.length - 1].query;
    expect("writerExpectedDate" in last && last.writerExpectedDate === undefined).toBe(true);
    expect("nudgeDate" in last && last.nudgeDate === undefined).toBe(true);
  });
  it("M5 revise and resubmit, close it: the reply, then a close", () => {
    const plans = planOfResponse(ctx(q0({ status: QueryStatus.FULL_SENT })), base({ kind: "rr", rrNext: "close" }), []);
    expect(stepsOf(plans).map((x) => x.resultingStatus)).toEqual([QueryStatus.REVISE_RESUBMIT, QueryStatus.WITHDRAWN]);
    expect(queryAfter(q0(), plans).status).toBe(QueryStatus.WITHDRAWN);
  });
  it("M6 an offer told later: the flag on the offer step as it is made; the others marked; no update of the new step", () => {
    const others = [{ id: "o1", told: false, holdsPages: false }, { id: "o2", told: false, holdsPages: true }];
    const plans = planOfResponse(ctx(q0({ status: QueryStatus.FULL_SENT })), base({ kind: "of", ofBy: NOW + 14 * DAYMS, others: "task" }), others);
    const step = stepsOf(plans)[0];
    expect(step.resultingStatus).toBe(QueryStatus.OFFER);
    expect(step.tellLater).toBe(true);
    const ups = plans.flatMap((p) => p.update ?? []);
    expect(ups.map((u) => u.path).sort()).toEqual(["queries/o1", "queries/o2"]);
    expect(ups.every((u) => u.data.offerTold === false && u.data.offerRefQueryId === "q1")).toBe(true);
    const made = new Set(plans.flatMap((p) => p.set.map((s) => s.path)));
    expect(ups.filter((u) => made.has(u.path))).toEqual([]);
  });
  it("M7 the extras asked for are the step's materials", () => {
    const a = base({ ask: { sample: true, full: true, syn: true, other: true }, extras: ["Author bio"], otherTx: "A one-line pitch" });
    expect(askedMaterials(a)).toEqual([{ kind: "sample", unit: "pages", n: 50 }, { kind: "synopsis" }, { kind: "other", text: "Author bio" }, { kind: "other", text: "A one-line pitch" }]);
  });
});

describe("M8 · the two numbers are the app's own counts", () => {
  const book = [q0(), q0({ id: "q2", status: QueryStatus.PARTIAL_REQUESTED }), q0({ id: "q3" })];
  it("a first request: requests +1, replies +1", () => {
    const c = respCounts(book, book[0], { ...book[0], status: QueryStatus.PARTIAL_REQUESTED }, "pr");
    expect([c.lead.k, c.lead.d, c.replies.d]).toEqual(["requests", 1, 1]);
  });
  it("a second request on a query already counted: no change, so no badge", () => {
    const c = respCounts(book, book[1], { ...book[1], status: QueryStatus.FULL_REQUESTED }, "fr");
    expect([c.lead.d, c.replies.d]).toEqual([0, 0]);
  });
});

describe("M9 · the headline follows the reply", () => {
  const h = (kind: Parameters<typeof headline>[0]["kind"]) => headline({ kind, first: "Rosalind", recorded: false, sitting: 0, picked: true, requests: null, activeLeft: null, offers: null, rrNext: null })[0];
  it("as the reference words it", () => {
    expect(h(null)).toBe("You’ve heard back.");
    expect(h("pr")).toBe("A partial request. Great work!");
    expect(h("fr")).toBe("A full request. Great work!");
    expect(h("of")).toBe("An offer. Congratulations!");
    expect(h("rr")).toBe("A revise and resubmit.");
    expect(h("no")).toBe("A pass this time.");
  });
});

describe("M10 · the colour", () => {
  it("the query's own status, then where the reply moves it, from the stage colour table", () => {
    expect(toneStatus(QueryStatus.FULL_SENT, null, null)).toBe(QueryStatus.FULL_SENT);
    expect(toneStatus(QueryStatus.FULL_SENT, "of", null)).toBe(QueryStatus.OFFER);
    expect(toneStatus(QueryStatus.QUERIED, "no", null)).toBe(QueryStatus.REJECTED);
    expect(toneOf(QueryStatus.OFFER)).toEqual({ disc: STAGE_COLOURS.offer.band, wash: STAGE_COLOURS.offer.tint, mark: STAGE_COLOURS.offer.rim });
    expect(toneOf(QueryStatus.PARTIAL_SENT)?.disc).toBe(STAGE_COLOURS.partial.bandRequested);
    /* the mark is the stage's rim (its strongest), not its paler mark: they differ on Queried and Closed */
    expect(toneOf(QueryStatus.QUERIED)?.mark).toBe(STAGE_COLOURS.queried.rim);
    expect(toneOf(QueryStatus.REJECTED)?.mark).toBe(STAGE_COLOURS.closed.rim);
  });
});

describe("M11 · the recorded screen agrees with the card beneath (v2.1)", () => {
  const D = (d: number) => new Date(2026, 10, 23 + d).getTime();
  const head = (a: RespAnswers) => headline({ kind: a.kind, first: "Rosalind", recorded: true, sitting: 0, picked: true, requests: 3, activeLeft: 12, offers: 1, rrNext: a.rrNext, sentQ: a.sentQ })[0];
  const copy = (a: RespAnswers) => { const c = recordedCopy(a, "Rosalind", { othersN: 4, activeLeft: 12 }); return { ...c, text: c.line.filter((x) => x != null).join("") }; };
  /* every kind and branch: [answers, the card's status, head, big line, sentence, slot] */
  const cases: [string, RespAnswers, QueryStatus, string, string, string, string][] = [
    ["partial, gone, reminder", base({ sentQ: "yes", expectBy: D(56), nudgeOn: D(56) }), QueryStatus.PARTIAL_SENT, "Recorded. Partial sent!", "Your partial is with Rosalind.", "We’ll remind you to nudge on Mon 18 Jan.", "celebration · partial sent"],
    ["partial, gone, reply date only", base({ sentQ: "yes", expectBy: D(56), nudgeOn: null }), QueryStatus.PARTIAL_SENT, "Recorded. Partial sent!", "Your partial is with Rosalind.", "A reply is expected by Mon 18 Jan.", "celebration · partial sent"],
    ["partial, gone, no reply date", base({ sentQ: "yes", expectBy: null, nudgeOn: null }), QueryStatus.PARTIAL_SENT, "Recorded. Partial sent!", "Your partial is with Rosalind.", "There’s no reply date yet.", "celebration · partial sent"],
    ["full, gone, reminder", base({ kind: "fr", sentQ: "yes", expectBy: D(56), nudgeOn: D(56) }), QueryStatus.FULL_SENT, "Recorded. Full sent!", "Your full is with Rosalind.", "We’ll remind you to nudge on Mon 18 Jan.", "celebration · full sent"],
    ["full, gone, no reply date", base({ kind: "fr", sentQ: "yes", expectBy: null, nudgeOn: null }), QueryStatus.FULL_SENT, "Recorded. Full sent!", "Your full is with Rosalind.", "There’s no reply date yet.", "celebration · full sent"],
    ["partial, not yet", base({ sentQ: "no", sendBy: D(3) }), QueryStatus.PARTIAL_REQUESTED, "Recorded. A partial request!", "Rosalind wants to read more.", "Sending your partial is on your to-do list for Thu 26 Nov.", "celebration · partial request"],
    ["partial, not yet, no date", base({ sentQ: "no", sendBy: null }), QueryStatus.PARTIAL_REQUESTED, "Recorded. A partial request!", "Rosalind wants to read more.", "Sending your partial is on your to-do list.", "celebration · partial request"],
    ["full, not yet", base({ kind: "fr", sentQ: "no", sendBy: D(3) }), QueryStatus.FULL_REQUESTED, "Recorded. A full request!", "Rosalind wants the whole book.", "Sending your full is on your to-do list for Thu 26 Nov.", "celebration · full request"],
    ["offer, tell the others", base({ kind: "of", sentQ: null, ofBy: D(7), others: "task" }), QueryStatus.OFFER, "Recorded. An offer!", "Rosalind has made an offer.", "Answering it is on your to-do list for Mon 30 Nov. So is telling the other 4 agents.", "celebration · offer"],
    ["offer, no date, not now", base({ kind: "of", sentQ: null, ofBy: null, others: "no" }), QueryStatus.OFFER, "Recorded. An offer!", "Rosalind has made an offer.", "Answering it is on your to-do list.", "celebration · offer"],
    ["revise, will revise", base({ kind: "rr", sentQ: null, rrNext: "yes", rrBy: D(28) }), QueryStatus.REVISE_RESUBMIT, "Recorded.", "Rosalind asked for changes.", "Resubmitting is on your to-do list for Mon 21 Dec.", "the mentor · revise and resubmit"],
    ["revise, not sure", base({ kind: "rr", sentQ: null, rrNext: "unsure" }), QueryStatus.REVISE_RESUBMIT, "Recorded.", "Rosalind asked for changes.", "The query stays open, with you.", "the mentor · revise and resubmit"],
    ["revise, close", base({ kind: "rr", sentQ: null, rrNext: "close" }), QueryStatus.WITHDRAWN, "Recorded.", "Rosalind asked for changes.", "The query is closed. 12 are still out.", "the mentor · revise and resubmit"],
    ["pass", base({ kind: "no", sentQ: null }), QueryStatus.REJECTED, "Recorded.", "Rosalind passed.", "The query is closed and in your Rejection collection. 12 queries are still with agents.", "the mentor · a pass"],
  ];
  it.each(cases)("%s", (_n, a, status, h, big, line, slot) => {
    expect(newStatus(a)).toBe(status);
    const c = copy(a);
    expect([head(a), c.big, c.text, c.slot]).toEqual([h, big, line, slot]);
    expect(`${head(a)} ${c.big} ${c.text}`).not.toMatch(/so the query is now|the query is now|is now (partial|full)/i);
  });
  it("a request that has gone never talks about the request or the to-do", () => {
    for (const k of ["pr", "fr"] as const) for (const [e, n] of [[D(56), D(56)], [D(56), null], [null, null]] as const) {
      const a = base({ kind: k, sentQ: "yes", expectBy: e, nudgeOn: n });
      expect(newStatus(a)).toBe(k === "pr" ? QueryStatus.PARTIAL_SENT : QueryStatus.FULL_SENT);
      expect(`${head(a)} ${copy(a).big} ${copy(a).text}`).not.toMatch(/request!|wants to read more|whole book|to-do list/);
    }
  });
});
