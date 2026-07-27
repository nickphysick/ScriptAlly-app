/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Where this stands" — real unit tests: templates per kind, and the omission law (a missing
 * field drops its clause; nothing is ever guessed).
 */
import { describe, it, expect } from "vitest";
import { whereThisStands, STATUS_OWED, nameList, distinctNames } from "./sessionContext";

describe("whereThisStands — the template per kind", () => {
  it("offer: date · outstanding (surnames) · the convention line", () => {
    const s = whereThisStands({
      kind: "offer",
      agentName: "Tom Ellery",
      offerDate: "2026-07-19T12:00:00.000Z",
      outstanding: ["Jonathan Marsh", "Daniel O’Rourke"],
    });
    expect(s).toBe("Offer received 19 Jul. 2 still out (Marsh, O’Rourke). Convention says you nudge them with the news and set Ellery a reply-by date.");
  });
  it("awaiting-send: sent + requested dates and what's owed", () => {
    const s = whereThisStands({
      kind: "awaiting-send",
      agentName: "Jonathan Marsh",
      sentDate: "2026-05-02T12:00:00.000Z",
      requestedDate: "2026-07-10T12:00:00.000Z",
      owed: STATUS_OWED["Full Requested"],
    });
    expect(s).toBe("Queried 2 May. Marsh asked for the full manuscript on 10 Jul — that's what you owe.");
  });
  it("nudge: the sent date against the window", () => {
    expect(whereThisStands({ kind: "nudge", sentDate: "2026-04-01T12:00:00.000Z", windowWeeks: 8 }))
      .toBe("Queried 1 Apr. No reply past the 8-week window — a nudge is due.");
  });
  it("stale: silence length vs the agent's response window", () => {
    expect(whereThisStands({ kind: "stale", agentName: "Eleanor Whitfield", silentDays: 860, windowWeeks: 12 }))
      .toBe("Silent for 860 days. Whitfield's window is 12 weeks — long past.");
  });
  it("dq: the batch's own line, verbatim", () => {
    expect(whereThisStands({ kind: "dq", batchLine: "Add what they ask to receive so your package check can run." }))
      .toBe("Add what they ask to receive so your package check can run.");
  });
});

describe("the omission law", () => {
  it("a missing field drops its clause — never a guess", () => {
    // no outstanding, no agent → the date clause alone
    expect(whereThisStands({ kind: "offer", offerDate: "2026-07-19T12:00:00.000Z" })).toBe("Offer received 19 Jul.");
    // no dates at all → the owed fallback clause alone
    expect(whereThisStands({ kind: "awaiting-send", owed: "partial" })).toBe("The partial is what's owed.");
    // stale with no window → the silence clause alone
    expect(whereThisStands({ kind: "stale", silentDays: 90 })).toBe("Silent for 90 days.");
    // an unparseable date drops its clause too
    expect(whereThisStands({ kind: "nudge", sentDate: "not-a-date", windowWeeks: 8 })).toBe("No reply past the 8-week window — a nudge is due.");
  });
  it("notes have no derived facts: the empty string hides the card", () => {
    expect(whereThisStands({ kind: "note" })).toBe("");
    expect(whereThisStands({ kind: "dq" })).toBe(""); // a dq input without its line says nothing
  });
  it("the owed vocabulary is keyed on the exact enum strings", () => {
    expect(STATUS_OWED["Partial Requested"]).toBe("partial");
    expect(STATUS_OWED["Full Requested"]).toBe("full manuscript");
    expect(STATUS_OWED["Revise & Resubmit"]).toBe("revised manuscript");
  });
});

describe("v9 — the outstanding names: dedupe, cap, and a count that matches", () => {
  it("the same agent twice reads ONCE (the 'Reed, Reed' fault, killed at the template)", () => {
    expect(nameList(["Alice Reed", "Alice Reed"])).toBe("Reed");
    expect(nameList(["Priya Raman", "priya RAMAN"])).toBe("Raman"); // case-insensitive
    expect(distinctNames(["Alice Reed", "Alice Reed", "Jonathan Marsh"])).toBe(2);
  });
  it("more than three names becomes '+n more'", () => {
    expect(nameList(["A One", "B Two", "C Three", "D Four", "E Five"])).toBe("One, Two, Three +2 more");
    expect(nameList(["A One", "B Two", "C Three"])).toBe("One, Two, Three");
  });
  it("the offer sentence's number is the DISTINCT count, so number and names agree", () => {
    const out = whereThisStands({ kind: "offer", outstanding: ["Alice Reed", "Alice Reed", "Jonathan Marsh"] });
    expect(out).toContain("2 still out (Reed, Marsh).");
    expect(out).not.toContain("Reed, Reed");
  });
  it("no names, no clause (the omission law holds)", () => {
    expect(whereThisStands({ kind: "offer", outstanding: [] })).not.toContain("still out");
    expect(nameList([])).toBe("");
  });
});
