/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The next-step section's one ready rule, three states and order (Contact list v15 §4; v14 §2, §9).
 */
import { describe, it, expect } from "vitest";
import type { Agent, Query, UserTask } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { daysUntil, isReady, knownMismatch, nextStep, readyOrder, reopenReminderTask } from "./contactNextStep";

const ag = (id: string, p: Partial<Agent> = {}): Agent => ({
  id, name: `Agent ${id}`, agency: `${id} Agency`, genres: ["thriller"], submissionStatus: SubmissionStatus.OPEN, ...p,
}) as unknown as Agent;
const q = (agentId: string, status: QueryStatus, p: Partial<Query> = {}): Query => ({
  id: `q-${agentId}-${status}`, agentId, manuscriptId: "ms1", status, dateSent: "2026-09-01", ...p,
}) as unknown as Query;
const TODAY = "2026-10-07";
const base = { msId: "ms1", book: ["Thriller"], todayIso: TODAY };

describe("the one ready rule (v15 §4, lock 4)", () => {
  it("one fit, one unknown-genre and one known mismatch, all open and unqueried: ready = 2, the fit first", () => {
    const agents = [ag("mis", { genres: ["romance"] }), ag("unk", { genres: [] }), ag("fit")];
    const s = nextStep({ ...base, agents, queries: [] });
    expect(s.state).toBe("ready");
    expect(s.ready.map((a) => a.id)).toEqual(["fit", "unk"]);
    expect(s.unknown).toBe(1);
  });
  it("a known mismatch is never ready, however open and unqueried", () => {
    expect(isReady(ag("m", { genres: ["romance"] }), () => false, ["Thriller"])).toBe(false);
    expect(knownMismatch(ag("m", { genres: ["romance"] }), ["Thriller"])).toBe(true);
    expect(knownMismatch(ag("u", { genres: [] }), ["Thriller"])).toBe(false);
    /* a book with no genres mismatches nobody */
    expect(knownMismatch(ag("m", { genres: ["romance"] }), [])).toBe(false);
  });
  it("ready: open, no query for this manuscript — a Closed agent is not ready", () => {
    const s = nextStep({ ...base, agents: [ag("a"), ag("b", { submissionStatus: SubmissionStatus.CLOSED })], queries: [] });
    expect(s.ready.map((a) => a.id)).toEqual(["a"]);
  });
  it("a queried agent is not ready; a query for ANOTHER manuscript does not count against this one", () => {
    expect(nextStep({ ...base, agents: [ag("a")], queries: [q("a", QueryStatus.QUERIED)] }).ready).toEqual([]);
    expect(nextStep({ ...base, agents: [ag("a")], queries: [q("a", QueryStatus.QUERIED, { manuscriptId: "ms2" })] }).state).toBe("ready");
  });
  it("takes the book on a subGenre too (ruling Q5)", () => {
    const s = nextStep({ ...base, book: ["Thriller", "Crime"], agents: [ag("c", { genres: ["crime"] })], queries: [] });
    expect(s.ready.map((a) => a.id)).toEqual(["c"]);
  });
});

describe("the three states, in order", () => {
  it("there is no fourth state: unknown-genre agents are ready, not 'a few more might fit'", () => {
    const s = nextStep({ ...base, agents: [ag("sent"), ag("bare", { genres: [] })], queries: [q("sent", QueryStatus.QUERIED)] });
    expect(s.state).toBe("ready");
    expect(s.ready.map((a) => a.id)).toEqual(["bare"]);
  });
  it("reopening: none ready; agents who are not a known mismatch, Closed, reopensOn ahead — soonest first", () => {
    const agents = [
      ag("late", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01" }),
      ag("soon", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-01" }),
      ag("unk", { genres: [], submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-15" }),
      ag("mis", { genres: ["romance"], submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-10-20" }),
      ag("past", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-09-01" }),
      ag("sent"),
    ];
    const s = nextStep({ ...base, agents, queries: [q("sent", QueryStatus.QUERIED)] });
    expect(s.state).toBe("reopening");
    /* ruling Q2: the known mismatch is never offered, however soon it reopens */
    expect(s.reopening.map((a) => a.id)).toEqual(["soon", "unk", "late"]);
  });
  it("done: every agent accounted for — queried + mismatches + closed to submissions = N (ruling Q3)", () => {
    const agents = [
      ag("r"), ag("m"), ag("p"), ag("w"),
      ag("x1", { genres: ["romance"] }), ag("x2", { genres: ["horror"] }), ag("x3", { genres: ["romance"] }),
      ag("c1", { submissionStatus: SubmissionStatus.CLOSED }),
      /* a reopening date already past is closed to submissions too */
      ag("c2", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-09-01" }),
    ];
    const queries = [
      q("r", QueryStatus.QUERIED),
      q("m", QueryStatus.REJECTED, { dateSent: "2026-06-01" }), q("m", QueryStatus.FULL_REQUESTED, { id: "q-m2", dateSent: "2026-09-10" }),
      q("p", QueryStatus.NO_RESPONSE),
      q("w", QueryStatus.WITHDRAWN),
    ];
    const s = nextStep({ ...base, agents, queries });
    expect(s.state).toBe("done");
    expect(s.total).toBe(9);
    expect([s.queried, s.mismatches, s.closed]).toEqual([4, 3, 2]);
    expect(s.queried + s.mismatches + s.closed).toBe(s.total);
    /* each queried agent's LATEST query; withdrawn is its own part (ruling Q1); the parts sum to queried */
    expect(s.outcomes).toEqual({ reading: 1, asked: 1, passed: 1, withdrawn: 1 });
    const o = s.outcomes;
    expect(o.reading + o.asked + o.passed + o.withdrawn).toBe(s.queried);
  });
  it("a queried known mismatch counts as queried, once", () => {
    const s = nextStep({ ...base, agents: [ag("x", { genres: ["romance"] })], queries: [q("x", QueryStatus.QUERIED)] });
    expect([s.state, s.queried, s.mismatches, s.closed]).toEqual(["done", 1, 0, 0]);
  });
});

describe("the ready order (§9)", () => {
  it("rating first (unrated last), then reply time (unknown and the stub 0 last), then surname", () => {
    const xs = [
      ag("z", { name: "Ann Zed", starRating: 4, responseTimeWeeks: 8 }),
      ag("y", { name: "Bea Young", starRating: 4, responseTimeWeeks: 6 }),
      ag("u", { name: "Cal Unrated" }),
      ag("s", { name: "Dee Stub", starRating: 4, responseTimeWeeks: 0 }),
      ag("f", { name: "Eve Five", starRating: 5 }),
      ag("a", { name: "Fay Abbot", starRating: 4, responseTimeWeeks: 6 }),
    ].sort(readyOrder(["Thriller"]));
    expect(xs.map((a) => a.id)).toEqual(["f", "a", "y", "z", "s", "u"]);
  });
  it("takers before unknown genres, whatever the rating (v15 §4)", () => {
    const xs = [ag("unk", { genres: [], starRating: 5 }), ag("fit", { starRating: 1 })].sort(readyOrder(["Thriller"]));
    expect(xs.map((a) => a.id)).toEqual(["fit", "unk"]);
  });
  it("where the book has subGenres, main-genre takers come before the rating", () => {
    const xs = [ag("sub", { genres: ["crime"], starRating: 5 }), ag("main", { genres: ["thriller"], starRating: 2 })]
      .sort(readyOrder(["Thriller", "Crime"]));
    expect(xs.map((a) => a.id)).toEqual(["main", "sub"]);
  });
});

describe("the reopen reminder", () => {
  const t = (p: Partial<UserTask>): UserTask => ({ id: "t", text: "", done: false, ...p }) as unknown as UserTask;
  it("is an undone task on that agent dated the day they reopen", () => {
    const a = { id: "a", reopensOn: "2026-11-01" };
    expect(reopenReminderTask(a, [t({ agentId: "a", dueDate: "2026-11-01" })])?.id).toBe("t");
    expect(reopenReminderTask(a, [t({ agentId: "a", dueDate: "2026-11-02" })])).toBeNull();
    expect(reopenReminderTask(a, [t({ agentId: "a", dueDate: "2026-11-01", done: true })])).toBeNull();
    expect(reopenReminderTask({ id: "a" }, [t({ agentId: "a", dueDate: "2026-11-01" })])).toBeNull();
  });
  it("counts the days to it", () => {
    expect(daysUntil("2026-11-01", TODAY)).toBe(25);
    expect(daysUntil("2026-10-01", TODAY)).toBe(0);
  });
});
