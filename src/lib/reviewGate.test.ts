/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The review's gate: its counts and its words (onboarding v9).
 */
import { describe, it, expect } from "vitest";
import {
  summaryLead, readLine, duplicatesDoneLine, duplicatesNextHint, answeredLine, allAnsweredHead, writeHint,
  agentsAnswerLine, queriesAnswerLine, comingUpQueries, comingUpAgents, reviewSubline, gatePrimary, gateHint,
  questionFamily, type AgentQuestion, type QueryQuestion,
} from "./reviewGate";
import { REVIEW_REASON_CODES } from "../types/smartImport";

describe("the summary's paragraph", () => {
  it("is the Words table's, with every clause", () => {
    const l = summaryLead({ decisions: 4, agentAnswers: 2, queryAnswers: 9 });
    expect("clean" in l).toBe(false);
    if ("clean" in l) return;
    expect(l.before + l.clauses.join("|") + l.after).toBe(
      "Most of it's ready to go. 4 agents need a decision|2 agents need an answer|9 queries need an answer. Each one is a quick pick, and then everything lands at once.");
  });
  it("drops a clause whose count is 0", () => {
    const l = summaryLead({ decisions: 0, agentAnswers: 0, queryAnswers: 3 });
    expect("clean" in l ? [] : l.clauses).toEqual(["3 queries need an answer"]);
  });
  it("agrees a singular", () => {
    const l = summaryLead({ decisions: 1, agentAnswers: 1, queryAnswers: 1 });
    expect("clean" in l ? [] : l.clauses).toEqual(["1 agent needs a decision", "1 agent needs an answer", "1 query needs an answer"]);
  });
  it("says the file read cleanly when nothing is asked", () => {
    expect(summaryLead({ decisions: 0, agentAnswers: 0, queryAnswers: 0 })).toEqual({ clean: "It all read cleanly. Your history's ready to come straight in." });
  });
});

describe("the mark's line states a row count only where the path knows one", () => {
  it("the template path", () => { expect(readLine(34)).toBe("34 rows, read and sorted. Nothing is saved yet."); expect(readLine(1)).toBe("1 row, read and sorted. Nothing is saved yet."); });
  it("Smart Import", () => { expect(readLine(null)).toBe("Read and sorted. Nothing is saved yet."); expect(readLine(undefined)).toBe("Read and sorted. Nothing is saved yet."); });
});

describe("the tiers say what is in them", () => {
  const a = (ask: AgentQuestion["ask"], n: number): AgentQuestion[] => Array.from({ length: n }, (_, i) => ({ id: `${ask}${i}`, ask }));
  const q = (code: QueryQuestion["code"], n: number): QueryQuestion[] => Array.from({ length: n }, (_, i) => ({ id: `${code}${i}`, code }));
  it("agents with no agency", () => {
    expect(agentsAnswerLine(a("no-agency", 2))).toBe("2 have no agency. Add it, or say you're carrying on without one.");
    expect(agentsAnswerLine(a("no-agency", 1))).toBe("1 has no agency. Add it, or say you're carrying on without one.");
  });
  it("the other two agent questions, when there are any", () => {
    expect(agentsAnswerLine([...a("nameless", 1), ...a("mapping", 2)])).toBe("1 row has no agent or agency. Name it, or remove it. 2 have a detail to check.");
    expect(agentsAnswerLine([])).toBe("");
  });
  it("queries, zero parts dropped", () => {
    expect(queriesAnswerLine([...q("ambiguous-date", 2), ...q("no-date", 2), ...q("unreadable-date", 1), ...q("status-wording", 4)]))
      .toBe("2 dates to confirm, 3 dates missing, 4 statuses to clarify. One pick each.");
    expect(queriesAnswerLine(q("status-direction", 1))).toBe("1 status to clarify. One pick each.");
    expect(queriesAnswerLine([])).toBe("");
  });
  it("every reason code belongs to a family", () => {
    for (const c of REVIEW_REASON_CODES) expect(["confirm", "missing", "status", "other"]).toContain(questionFamily(c));
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
    expect(gatePrimary("queries", 9)).toBe("Import and get started · 9 to answer first");
    expect(gatePrimary("queries", 0)).toBe("Import and get started");
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
  it("no verdict, no congratulation, no dash", () => {
    const all = [reviewSubline(2, 13, "agents"), gatePrimary("queries", 3), gateHint("agents", 2), allAnsweredHead(3), writeHint(1, 1), duplicatesNextHint(1), readLine(3)];
    for (const s of all) { expect(s).not.toMatch(/[—–]/); expect(s).not.toMatch(/\b(great|well done|perfect|only|just|sadly|unfortunately)\b/i); }
  });
});
