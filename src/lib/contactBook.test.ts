/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v23 — the address book's pure model: the pills, the sections each sort draws, a "Your move" row's
 * deadline, the header's count, the card's steps and the selection rules.
 */
import { describe, expect, it } from "vitest";
import type { Agent } from "../types";
import { QueryStatus } from "../types";
import { type AgentFacts, agentFacts, sortFacts } from "./contactList";
import type { QcRow } from "./qcSummary";
import {
  BOOK_PILLS, bookCount, bookSections, bookSteps, dueTag, inPill, lastInTouch, monthLabel, replyBand, selectionIn, stepFrom, thumbShown,
} from "./contactBook";
import { agentsCsv } from "./agentCsv";

const NOW = Date.parse("2026-10-22T12:00:00Z");
const agent = (id: string, name: string, extra: Partial<Agent> = {}): Agent => ({
  id, userId: "u", name, agency: `${name.split(" ").pop()} Literary`, email: "", website: "", genres: [], mswlNotes: "",
  submissionStatus: "Open", submissionMethod: "Email", materialsWanted: [], dateAdded: "2026-08-03T00:00:00Z",
  lastCheckedDate: "2026-08-03T00:00:00Z", notes: "", ...extra,
}) as Agent;
const facts = (a: Agent, stand: AgentFacts["stand"], q: Partial<QcRow> | null = null, more: Partial<AgentFacts> = {}): AgentFacts =>
  ({ ...agentFacts(a, [], null), stand, q: q as QcRow | null, ...more });

describe("the pills", () => {
  it("are All · Not queried · Querying · Your move · Closed, in that order", () => {
    expect(BOOK_PILLS.map((p) => p.label)).toEqual(["All", "Not queried", "Querying", "Your move", "Closed"]);
  });
  it("narrow by the list's own status predicate (`stand`), and All keeps everyone", () => {
    const xs = [facts(agent("a", "Ann Abel"), "none"), facts(agent("b", "Ben Bell"), "you"), facts(agent("c", "Cal Cole"), "agent")];
    expect(xs.filter((x) => inPill(x, "")).length).toBe(3);
    expect(xs.filter((x) => inPill(x, "you")).map((x) => x.agent.id)).toEqual(["b"]);
    expect(xs.filter((x) => inPill(x, "agent")).map((x) => x.agent.id)).toEqual(["c"]);
  });
});

describe("the header's count", () => {
  it('reads "41 agents", and "4 of 41 agents" while anything narrows the list', () => {
    expect(bookCount(41, 41, false)).toBe("41 agents");
    expect(bookCount(4, 41, true)).toBe("4 of 41 agents");
    expect(bookCount(1, 1, false)).toBe("1 agent");
  });
});

describe("the sections follow the sort", () => {
  const xs = [
    agent("1", "Ann Abel", { dateAdded: "2026-08-03T00:00:00Z", responseTimeWeeks: 3 }),
    agent("2", "Bea Abbot", { dateAdded: "2026-06-01T00:00:00Z", responseTimeWeeks: 6 }),
    agent("3", "Cal Cole", { dateAdded: "2026-08-20T00:00:00Z" }),
    agent("4", "Dee Dunn", { dateAdded: "2026-06-11T00:00:00Z", responseTimeWeeks: 12 }),
  ].map((a) => agentFacts(a, [], null));
  it("surname: letters, the thumb index shown", () => {
    const s = bookSections(sortFacts(xs, "surname"), "surname");
    expect(s.map((x) => x.label)).toEqual(["A", "C", "D"]);
    expect(s[0].n).toBe(2);
    expect(thumbShown("surname")).toBe(true);
  });
  it("date added: months, newest first, no thumb index", () => {
    const s = bookSections(sortFacts(xs, "added"), "added");
    expect(s.map((x) => x.label)).toEqual(["Aug 2026", "Jun 2026"]);
    expect(s.map((x) => x.n)).toEqual([2, 2]);
    expect(thumbShown("added")).toBe(false);
  });
  it("reply time: the four bands, a stub 0 is not stated", () => {
    expect(replyBand({ responseTimeWeeks: 4 })).toBe("Within 4 weeks");
    expect(replyBand({ responseTimeWeeks: 8 })).toBe("4 to 8 weeks");
    expect(replyBand({ responseTimeWeeks: 9 })).toBe("Over 8 weeks");
    expect(replyBand({ responseTimeWeeks: 0 })).toBe("Not stated");
    expect(replyBand({})).toBe("Not stated");
    expect(bookSections(sortFacts(xs, "reply"), "reply").map((s) => s.label)).toEqual(["Within 4 weeks", "4 to 8 weeks", "Over 8 weeks", "Not stated"]);
  });
  it("query status: one section per status, in the sort's order", () => {
    expect(bookSections(sortFacts(xs, "status"), "status").map((s) => s.label)).toEqual(["Not queried"]);
  });
  it("a section is a run: every agent is in exactly one, in list order", () => {
    for (const k of ["surname", "added", "reply", "status"] as const) {
      const sorted = sortFacts(xs, k);
      expect(bookSections(sorted, k).flatMap((s) => s.ids)).toEqual(sorted.map((x) => x.agent.id));
    }
  });
  it("an unreadable date is 'Not dated'", () => { expect(monthLabel({ dateAdded: "" })).toBe("Not dated"); });
});

describe("a Your move row's deadline", () => {
  const a = agent("y", "Yan Yew");
  it('"BY 30 SEP" with a date to come; "OVERDUE" once it has gone', () => {
    expect(dueTag(facts(a, "you", { court: "you", expectedMs: Date.parse("2026-10-30T12:00:00Z") }), NOW)?.text).toBe("BY 30 OCT");
    expect(dueTag(facts(a, "you", { court: "you", expectedMs: Date.parse("2026-10-01T12:00:00Z") }), NOW)?.text).toBe("OVERDUE");
  });
  it("an agent's-court query past its date reads OVERDUE; any other row reads nothing", () => {
    expect(dueTag(facts(a, "you", { court: "agent", expectedMs: null }, { pastExpected: true }), NOW)?.text).toBe("OVERDUE");
    expect(dueTag(facts(a, "agent", { court: "agent", expectedMs: Date.parse("2026-10-30T12:00:00Z") }), NOW)).toBeNull();
    expect(dueTag(facts(a, "you", { court: "you", expectedMs: null }), NOW)).toBeNull();
  });
});

describe("the card's steps", () => {
  const span = (status: QueryStatus, d: string, current = false) => ({ status, startMs: Date.parse(d), endMs: null, current });
  it("Query sent, each stage reached, the current one last and the only current", () => {
    const q = { status: QueryStatus.PARTIAL_REQUESTED, sentMs: Date.parse("2026-09-01"), stageStartMs: Date.parse("2026-09-12"),
      history: { spans: [span(QueryStatus.QUERIED, "2026-09-01"), span(QueryStatus.PARTIAL_REQUESTED, "2026-09-12", true)], currentStartMs: 0, dated: true } } as unknown as QcRow;
    const s = bookSteps(q);
    expect(s.map((x) => x.label)).toEqual(["Query sent", "Partial requested"]);
    expect(s.filter((x) => x.current).map((x) => x.label)).toEqual(["Partial requested"]);
  });
  it("an undated history still draws Query sent and the stage it stands at", () => {
    const q = { status: QueryStatus.REJECTED, sentMs: null, stageStartMs: null, history: { spans: [], currentStartMs: null, dated: false } } as unknown as QcRow;
    expect(bookSteps(q).map((x) => x.label)).toEqual(["Query sent", "Passed"]);
  });
  it('"Last in touch 8 Sep"; "Not in touch yet" with nothing', () => {
    expect(lastInTouch({ lastMs: Date.parse("2026-09-08T12:00:00Z") }, NOW)).toBe("Last in touch 8 Sep");
    expect(lastInTouch({ lastMs: null }, NOW)).toBe("Not in touch yet");
  });
});

describe("the selection", () => {
  it("keeps the remembered agent if in view, else the first in view", () => {
    expect(selectionIn(["a", "b", "c"], "b")).toBe("b");
    expect(selectionIn(["a", "c"], "b")).toBe("a");
    expect(selectionIn([], "b")).toBeNull();
  });
  it("‹ and › step the visible order and stop at either end", () => {
    expect(stepFrom(["a", "b", "c"], "b", 1)).toBe("c");
    expect(stepFrom(["a", "b", "c"], "c", 1)).toBeNull();
    expect(stepFrom(["a", "b", "c"], "a", -1)).toBeNull();
  });
});

describe("the export", () => {
  it("one row per agent given, in that order, formula leads neutralised", () => {
    const xs = [agentFacts(agent("1", "=Ann Abel"), [], null), agentFacts(agent("2", "Bea Abbot"), [], null)];
    const lines = agentsCsv(xs).trim().split("\n");
    expect(lines.length).toBe(3);
    expect(lines[1].startsWith(`"'=Ann Abel"`)).toBe(true);
    expect(lines[2].startsWith("Bea Abbot,")).toBe(true);
  });
});
