/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The review's gate: its counts and its words (onboarding v9).
 */
import { describe, it, expect } from "vitest";
import { duplicatesDoneLine, duplicatesNextHint, answeredLine, allAnsweredHead, writeHint, comingUpQueries, comingUpAgents, reviewSubline, gatePrimary, gateHint, questionFamily, type AgentQuestion, type QueryQuestion } from "./reviewGate";
import { REVIEW_REASON_CODES } from "../types/smartImport";

describe("the tiers say what is in them", () => {
  const a = (ask: AgentQuestion["ask"], n: number): AgentQuestion[] => Array.from({ length: n }, (_, i) => ({ id: `${ask}${i}`, ask }));
  const q = (code: QueryQuestion["code"], n: number): QueryQuestion[] => Array.from({ length: n }, (_, i) => ({ id: `${code}${i}`, code }));
  it("every reason code belongs to a family", () => {
    /* RE-POINTED (smart-import-photos-v1): a crossed-out line and a mark are families of their own. */
    for (const c of REVIEW_REASON_CODES) expect(["confirm", "missing", "status", "crossed", "mark", "other"]).toContain(questionFamily(c));
    expect([questionFamily("crossed-out"), questionFamily("mark-unclear")]).toEqual(["crossed", "mark"]);
  });
  it("coming up", () => {
    expect(comingUpQueries([...q("ambiguous-date", 1), ...q("no-date", 2), ...q("status-wording", 3)])).toEqual(["1 more date to confirm", "2 more dates needed", "3 more statuses to clarify"]);
    expect(comingUpAgents(a("no-agency", 1), () => "Tom Rafferty")).toEqual(["Tom Rafferty · no agency name"]);
  });
});

describe("the duplicates step, all sorted", () => {
  it("accounts for what was decided", () => {
    expect(duplicatesDoneLine({ merged: 2, kept: 0, forward: 15 })).toBe("2 sets merged. Their queries moved across, nothing lost. 15 agents go forward.");
    expect(duplicatesDoneLine({ merged: 1, kept: 1, forward: 6 })).toBe("1 set merged. Their queries moved across, nothing lost. 1 set kept as separate agents. 6 agents go forward.");
    expect(duplicatesDoneLine({ merged: 0, kept: 2, forward: 4 })).toBe("2 sets kept as separate agents. 4 agents go forward.");
  });
  it("the hint", () => {
    expect(duplicatesNextHint(2)).toBe("Next, 2 agents need an answer.");
    expect(duplicatesNextHint(1)).toBe("Next, 1 agent needs an answer.");
    expect(duplicatesNextHint(0)).toBe("Next, your agents.");
  });
});

describe("the gate's words", () => {
  it("the review subline", () => {
    expect(reviewSubline(2, 13, "agents")).toBe("2 need an answer before you go on. The other 13 are ready.");
    expect(reviewSubline(9, 8, "queries")).toBe("9 need an answer before anything is saved. The other 8 are ready.");
    expect(reviewSubline(1, 1, "agents")).toBe("1 needs an answer before you go on. The other 1 is ready.");
  });
  it("the primary carries the count until it is zero", () => {
    expect(gatePrimary("agents", 2)).toBe("Continue to queries · 2 to answer first");
    expect(gatePrimary("agents", 0)).toBe("Continue to queries");
    /* RE-POINTED (two-door import v1): the mock's primaries, waiting and ready */
    expect(gatePrimary("queries", 9)).toBe("Answer 9 questions to import");
    expect(gatePrimary("queries", 1)).toBe("Answer 1 question to import");
    expect(gatePrimary("queries", 0, { agents: 18, queries: 14 })).toBe("Import 18 agents and 14 queries");
    expect(gatePrimary("queries", 0, { agents: 1, queries: 1 })).toBe("Import 1 agent and 1 query");
  });
  it("the hints", () => {
    expect(gateHint("agents", 2)).toBe('Answer the 2 above first. "Carry on without an agency" counts as an answer.');
    expect(gateHint("queries", 9)).toBe("Answer the 9 above first. If you don't have a date, say so on its card and the query is kept undated.");
  });
  it("all answered", () => {
    expect(allAnsweredHead(9)).toBe("All 9 answered.");
    expect(answeredLine(["confirmed", "confirmed", "added", "added", "blank", "status", "status", "status", "status"])).toBe("2 dates confirmed, 2 dates added, 1 left blank on purpose, 4 statuses set.");
    expect(writeHint(17, 17)).toBe("17 agents and 17 queries will be written. The dashboard opens when it's done.");
  });
});
