/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 E4 — the heading sorts on the one shared sort (`sortFacts`): fit, reply, urgency and rating, each
 * reversible; ties always A to Z by surname; unknown replies and unrated agents last in both directions.
 */
import { describe, expect, it } from "vitest";
import { HEADING_SORTS, sortFacts, urgencyOf, type AgentFacts } from "./contactList";
import { CL_SORT_FIELDS } from "./cardsSort";

const NOW = Date.UTC(2026, 9, 26);
const DAY = 86_400_000;
const fx = (id: string, name: string, o: Partial<{ rating: number | null; weeks: number | null; genres: string[]; stand: AgentFacts["stand"]; q: unknown }> = {}): AgentFacts =>
  ({ agent: { id, name, agency: "", genres: o.genres ?? [], responseTimeWeeks: o.weeks ?? undefined }, rating: o.rating ?? null, stand: o.stand ?? "none", q: o.q ?? null, genres: o.genres ?? [] } as unknown as AgentFacts);
const ids = (xs: AgentFacts[]) => xs.map((x) => x.agent.id).join();

describe("the heading sorts (v25.1 E4)", () => {
  it("rating: highest first, then lowest first; unrated last both ways; ties A to Z", () => {
    const xs = [fx("a", "Ann Zed", { rating: 3 }), fx("b", "Bob Able", { rating: 5 }), fx("c", "Cat Bee", {}), fx("d", "Dee Cole", { rating: 3 })];
    expect(ids(sortFacts(xs, "rating"))).toBe("b,d,a,c");
    expect(ids(sortFacts(xs, "rating", true))).toBe("d,a,b,c");
  });
  it("reply: quickest first, slowest first; unknown last both ways", () => {
    const xs = [fx("a", "Ann Zed", { weeks: 8 }), fx("b", "Bob Able", { weeks: 4 }), fx("c", "Cat Bee", {}), fx("d", "Dee Cole", { weeks: 0 })];
    expect(ids(sortFacts(xs, "reply"))).toBe("b,a,c,d");
    expect(ids(sortFacts(xs, "reply", true))).toBe("a,b,c,d");
  });
  it("fit: most matches first, then weakest; ties A to Z", () => {
    const xs = [fx("a", "Ann Zed", { genres: ["x"] }), fx("b", "Bob Able", { genres: ["x", "y"] }), fx("c", "Cat Bee")];
    const ctx = { nowMs: NOW, fitOf: (x: AgentFacts) => x.agent.genres!.filter((g) => g === "x" || g === "y").length };
    expect(ids(sortFacts(xs, "fit", false, ctx))).toBe("b,a,c");
    expect(ids(sortFacts(xs, "fit", true, ctx))).toBe("c,a,b");
  });
  it("urgency: a dated next step soonest first, then Full sent, Partial sent, Queried, Passed, then not queried", () => {
    const xs = [
      fx("nq", "Al Nq"),
      fx("pass", "Bo Pass", { stand: "closed", q: { status: "Rejected", court: null } }),
      fx("qd", "Cy Queried", { stand: "agent", q: { status: "Queried", court: "agent" } }),
      fx("fs", "Di Full", { stand: "agent", q: { status: "Full Sent", court: "agent" } }),
      fx("ps", "Ed Part", { stand: "agent", q: { status: "Partial Sent", court: "agent" } }),
      fx("late", "Fi Late", { stand: "you", q: { status: "Full Requested", court: "you", expectedMs: NOW + 9 * DAY } }),
      fx("soon", "Gi Soon", { stand: "you", q: { status: "Partial Requested", court: "you", expectedMs: NOW + 2 * DAY } }),
    ];
    expect(ids(sortFacts(xs, "urgency", false, { nowMs: NOW, fitOf: () => 0 }))).toBe("soon,late,fs,ps,qd,pass,nq");
    expect(ids(sortFacts(xs, "urgency", true, { nowMs: NOW, fitOf: () => 0 }))).toBe("nq,pass,qd,ps,fs,late,soon");
    expect(urgencyOf(xs[0], NOW)[0]).toBe(2);
  });
  it("the pill's fields are the five headings, in order, with their words", () => {
    expect(CL_SORT_FIELDS.map((f) => f.key)).toEqual([...HEADING_SORTS]);
    expect(CL_SORT_FIELDS.map((f) => f.chip!(false))).toEqual(["Name A–Z", "Best genre fit", "Quickest reply", "Most urgent", "Highest rated"]);
    expect(CL_SORT_FIELDS.map((f) => f.chip!(true))).toEqual(["Name Z–A", "Weakest genre fit", "Slowest reply", "Least urgent", "Lowest rated"]);
  });
});
