/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The next-step section's states and order (Contact list v14 §2, §9).
 */
import { describe, it, expect } from "vitest";
import type { Agent, Query, UserTask } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { daysUntil, nextStep, readyOrder, reopenReminderTask } from "./contactNextStep";

const ag = (id: string, p: Partial<Agent> = {}): Agent => ({
  id, name: `Agent ${id}`, agency: `${id} Agency`, genres: ["thriller"], submissionStatus: SubmissionStatus.OPEN, ...p,
}) as unknown as Agent;
const q = (agentId: string, status: QueryStatus, p: Partial<Query> = {}): Query => ({
  id: `q-${agentId}-${status}`, agentId, manuscriptId: "ms1", status, dateSent: "2026-09-01", ...p,
}) as unknown as Query;
const TODAY = "2026-10-07";
const base = { msId: "ms1", book: ["Thriller"], todayIso: TODAY };

describe("the four states, in order", () => {
  it("ready: takes the book, open, no query for this manuscript", () => {
    const s = nextStep({ ...base, agents: [ag("a"), ag("b", { submissionStatus: SubmissionStatus.CLOSED })], queries: [] });
    expect(s.state).toBe("ready");
    expect(s.ready.map((a) => a.id)).toEqual(["a"]);
  });
  it("Ready never shows when no agent is ready — a queried agent is not ready", () => {
    const s = nextStep({ ...base, agents: [ag("a")], queries: [q("a", QueryStatus.QUERIED)] });
    expect(s.ready).toEqual([]);
    expect(s.state).not.toBe("ready");
  });
  it("a query for ANOTHER manuscript does not count against this one", () => {
    const s = nextStep({ ...base, agents: [ag("a")], queries: [q("a", QueryStatus.QUERIED, { manuscriptId: "ms2" })] });
    expect(s.state).toBe("ready");
  });
  it("reopening: none ready, some takers Closed with reopensOn ahead — soonest first", () => {
    const agents = [
      ag("late", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01" }),
      ag("soon", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-01" }),
      ag("past", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-09-01" }),
      ag("sent"),
    ];
    const s = nextStep({ ...base, agents, queries: [q("sent", QueryStatus.QUERIED)] });
    expect(s.state).toBe("reopening");
    expect(s.reopening.map((a) => a.id)).toEqual(["soon", "late"]);
  });
  it("gaps: none ready or reopening, some not-queried agents have no genres", () => {
    const s = nextStep({ ...base, agents: [ag("sent"), ag("bare", { genres: [] })], queries: [q("sent", QueryStatus.QUERIED)] });
    expect(s.state).toBe("gaps");
    expect(s.gaps.map((a) => a.id)).toEqual(["bare"]);
  });
  it("done: everyone who takes the book has it — and the line counts each agent's latest query", () => {
    const agents = [ag("r"), ag("m"), ag("p"), ag("x", { genres: ["romance"] })];
    const queries = [
      q("r", QueryStatus.QUERIED),
      q("m", QueryStatus.REJECTED, { dateSent: "2026-06-01" }), q("m", QueryStatus.FULL_REQUESTED, { id: "q-m2", dateSent: "2026-09-10" }),
      q("p", QueryStatus.NO_RESPONSE),
      q("x", QueryStatus.QUERIED),
    ];
    const s = nextStep({ ...base, agents, queries });
    expect(s.state).toBe("done");
    expect(s.takers).toBe(3);
    expect(s.sent).toBe(3);
    expect(s.outcomes).toEqual({ reading: 1, more: 1, passed: 1 });
  });
  it("takes the book on a subGenre too (ruling Q5)", () => {
    const s = nextStep({ ...base, book: ["Thriller", "Crime"], agents: [ag("c", { genres: ["crime"] })], queries: [] });
    expect(s.ready.map((a) => a.id)).toEqual(["c"]);
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
