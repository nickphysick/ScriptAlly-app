/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149.1 Part A — the query card's story, strip and facts, derived from the record (lib/qcCardStory).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Query } from "../types";
import { agentView, bookChips, partialAsked, span, storySteps, type StoryRow } from "./qcCardStory";

const q = (o: Partial<Query> = {}): Query => ({ id: "q1", userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.FULL_SENT, dateSent: "2026-01-10", sendMethod: "Email", ...o } as Query);
const row = (status: QueryStatus, day: number, o: Partial<StoryRow> = {}): StoryRow => ({ key: `${status}-${day}`, activityId: `act-${day}`, status, timeMs: Date.UTC(2026, 0, day), title: status, ...o });

describe("v149.1 A2 — each step tells its part of the story", () => {
  it("a request is rust; the send that answers it is green with the same words; the query's own pieces are oat", () => {
    const s = storySteps({ rows: [row(QueryStatus.QUERIED, 1), row(QueryStatus.PARTIAL_REQUESTED, 5), row(QueryStatus.PARTIAL_SENT, 8)], query: q({ materialsRequestedType: "pages", materialsRequestedQuantity: "50" } as Partial<Query>), manuscript: null, sentWithQuery: ["Query letter"] });
    expect(s[0].qualifier).toBe("by email");
    expect(s[0].chips).toEqual([{ label: "Query letter", tone: "plain", icon: "letter" }]);
    expect(s[1].chips).toEqual([{ label: "First 50 pages", tone: "ask", icon: "pages" }]);
    expect(s[2].chips).toEqual([{ label: "First 50 pages", tone: "ok", icon: "pages" }]);
  });
  it("a send with no earlier request is plain, never claimed as an answer", () => {
    const s = storySteps({ rows: [row(QueryStatus.QUERIED, 1), row(QueryStatus.FULL_SENT, 8)], query: q(), manuscript: null, sentWithQuery: [] });
    expect(s[1].chips.map((c) => c.tone)).toEqual(["plain"]);
  });
  it("a revision send says 'the revision' and names the version from the record; the R&R quotes the agent's words", () => {
    const s = storySteps({ rows: [row(QueryStatus.REVISE_RESUBMIT, 3), row(QueryStatus.FULL_SENT, 9)], query: q({ revisionRound: 2, rrNotes: "The middle drags.", bookVersionId: "bv2" } as Partial<Query>), manuscript: { bookVersions: [{ id: "bv2", name: "Second draft" }] } as never, sentWithQuery: [] });
    expect(s[0].note).toBe("The middle drags.");
    expect(s[1].qualifier).toBe("the revision");
    expect(s[1].chips[0]).toMatchObject({ label: "Revised manuscript · Second draft", tone: "ok" });
  });
  it("the system's own step text is never a note", () => {
    const s = storySteps({ rows: [row(QueryStatus.PARTIAL_REQUESTED, 5)], query: q(), manuscript: null, sentWithQuery: [] });
    expect(s[0].note).toBeNull();
    expect(partialAsked(q())).toBe("Partial");
  });
});

describe("v149.1 A1 — the book block's chips are the present fields only", () => {
  it("age, genre and word count; a missing one is left out, never blank", () => {
    expect(bookChips({ ageCategory: "Adult", genre: "Book club", wordCount: 88000 } as never)).toEqual(["Adult", "Book club", "88,000 words"]);
    expect(bookChips({ ageCategory: "Adult", genre: "", wordCount: 0 } as never)).toEqual(["Adult"]);
    expect(bookChips(null)).toEqual([]);
  });
});

describe("v149.1 A5 — the facts keep four cells whatever is missing", () => {
  it("an agent with nothing recorded still has four cells, each '—' and 'not known'", () => {
    const v = agentView(null, [], () => "", "q1", Date.UTC(2026, 9, 25));
    expect(v.facts.map((f) => f.key)).toEqual(["reply", "door", "heard", "touch"]);
    expect(v.facts.every((f) => f.value === "—" && f.sub === "not known")).toBe(true);
  });
  it("heard back counts the queries the agent has answered, of all of them; the history is newest first", () => {
    const now = Date.UTC(2026, 9, 25);
    const v = agentView({ responseTimeWeeks: 8 } as never, [q({ id: "a", dateSent: "2025-03-01", status: QueryStatus.REJECTED }), q({ id: "b", dateSent: "2026-01-10", status: QueryStatus.QUERIED })], () => "Book", "b", now);
    expect(v.facts.find((f) => f.key === "heard")?.value).toBe("1 of 2");
    expect(v.facts.find((f) => f.key === "reply")?.value).toBe("~8 wks");
    expect(v.history.map((h) => [h.id, h.current])).toEqual([["b", true], ["a", false]]);
  });
});

describe("span", () => {
  it("days, weeks, months, then years from a year on", () => {
    const d = (n: number) => span(0, n * 86_400_000);
    expect([d(5), d(21), d(90), d(435)]).toEqual(["5 days", "3 weeks", "3 months", "1.2 years"]);
  });
});
