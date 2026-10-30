/**
 * FV2-F — Dashboard first visit v2, Part F: what a kept import review counts, where it reopens, how it is split, and the
 * resume card's words. The round trip through Firestore and the review (leave at agent 23 of 31, reload, carry on at
 * row 24) is FV2 F1, on the running page; the rules and the clean-up are tests/rules/importDrafts.rules.test.ts and
 * functions/src/importDrafts.emulator.spec.ts.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { SmartImportResult } from "../types/smartImport";
import { parseModel } from "./smartImportReviewModel";
import { openAgentQuestions } from "./reviewGate";
import { PART_SIZE, RESUME, draftCounts, joinParts, keptUntil, resumeRow, splitParts, startedWhen, type DraftPayload } from "./importDraftModel";

/** A file of `n` agents with no agency (each asks a question on the agents step) and one query each. */
const file = (n: number): SmartImportResult => ({
  agents: Array.from({ length: n }, (_, i) => ({ ref: `a${i + 1}`, name: `Agent Number ${i + 1}`, genres: ["Literary Fiction", "Book Club"], mswlNotes: "Character-led fiction with a strong sense of place; voice above all; quiet stakes welcome." })),
  queries: Array.from({ length: n }, (_, i) => ({ agentRef: `a${i + 1}`, status: QueryStatus.QUERIED, sentDate: "2026-03-14T00:00:00.000Z", sentDateRaw: "14/03/2026", timeline: [], reasons: [], notes: "Personalised: mentioned their recent sale; sent first three chapters." })),
});

describe("FV2-F · counts and where it reopens", () => {
  const m = parseModel(file(31));
  it("every agent in this file asks something, so none is checked yet", () => {
    expect(openAgentQuestions(m.agents).length).toBe(31);
    expect(draftCounts({ ...m, screen: "agents" })).toMatchObject({ agentsChecked: 0, agentsTotal: 31, queriesStarted: false });
  });
  it("answering 23 is '23 of 31 checked', and it reopens on the 24th", () => {
    /* "Carry on without an agency" is the review's answer to "no agency": `agencyWaived` (reviewGate.agentAsk) */
    const answered = m.agents.map((a, i) => (i < 23 ? { ...a, agencyWaived: true } : a));
    const c = draftCounts({ agents: answered, queries: m.queries, screen: "agents" });
    expect(c.agentsChecked).toBe(23);
    expect(c.agentsTotal).toBe(31);
    expect(resumeRow({ agents: answered, queries: m.queries, screen: "agents" })).toBe(m.agents[23].id);
  });
  it("a deleted agent is not counted", () => {
    const c = draftCounts({ agents: m.agents.map((a, i) => (i === 0 ? { ...a, deleted: true } : a)), queries: m.queries, screen: "agents" });
    expect(c.agentsTotal).toBe(30);
  });
});

describe("FV2-F · split into parts", () => {
  it("a 300-row draft, measured, and it comes back whole", () => {
    const result = file(300);
    const payload: DraftPayload = { result, review: { ...parseModel(result), reconciled: {}, touched: [], screen: "agents" }, already: [] };
    const json = JSON.stringify(payload);
    const parts = splitParts(json);
    // eslint-disable-next-line no-console
    console.log(`FV2-F size: a 300-row draft is ${json.length.toLocaleString("en-GB")} characters, ${parts.length} part(s) of at most ${PART_SIZE.toLocaleString("en-GB")}`);
    expect(joinParts(parts.map((data, i) => ({ i, data })).reverse())).toBe(json);
    expect(parts.every((p) => p.length <= PART_SIZE)).toBe(true);
  });
  it("splits a long payload in order", () => {
    const s = "x".repeat(PART_SIZE * 2 + 5);
    expect(splitParts(s).map((p) => p.length)).toEqual([PART_SIZE, PART_SIZE, 5]);
  });
});

describe("FV2-F · the resume card's words", () => {
  const now = new Date(2026, 9, 30, 10, 0);
  it("when it was started", () => {
    expect(startedWhen(new Date(2026, 9, 29, 21, 14).toISOString(), now)).toBe("yesterday at 21:14");
    expect(startedWhen(new Date(2026, 9, 30, 9, 30).toISOString(), now)).toBe("today at 09:30");
    expect(startedWhen(new Date(2026, 9, 26, 9, 30).toISOString(), now)).toBe("Monday at 09:30");
  });
  it("how long it is kept: 7 days from the last change", () => {
    expect(keptUntil(new Date(2026, 9, 30, 10, 0).getTime())).toBe("6 November");
  });
  it("in the reference's words", () => {
    expect(RESUME.title).toBe("Pick up where you left off");
    expect(RESUME.source("yesterday at 21:14")).toBe("Smart Import · started yesterday at 21:14");
    expect(RESUME.checked(23, 31)).toBe("23 of 31 checked");
    expect(RESUME.text("6 November")).toBe("Nothing from this file is saved until you finish, so carry on and bring it in. We'll keep your progress until 6 November.");
    expect(RESUME.confirm("query-tracker-2026.xlsx")).toBe("Start again? Your progress with query-tracker-2026.xlsx will be lost.");
    expect([RESUME.carryOn, RESUME.startAgain, RESUME.confirmYes, RESUME.confirmNo, RESUME.notStarted]).toEqual(["Carry on checking", "Start again with a different file", "Start again", "Keep it", "not started"]);
  });
});
