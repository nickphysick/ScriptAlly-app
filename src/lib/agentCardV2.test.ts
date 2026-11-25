/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 — the pure half: the footer is the pack's table (words, button, and the journey the next-step box opened),
 * the fact boxes, what the agent asks for, the Finish block, the snackbar's words. The rendered card is AC2-1 … AC2-6.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, SubmissionMethod, type Agent } from "../types";
import type { AgentFacts } from "./contactList";
import { acFoot, acPill, acTone, askList, factBoxes, factBoxesShown, finishItems, queryBoxLine, savedWords } from "./agentCardV2";
import { nextStep } from "./contactCard262";

const NOW = new Date("2026-11-19T12:00:00Z").getTime();
const DAY = 86_400_000;
const agent = (o: Partial<Agent> = {}) => ({ id: "a1", name: "Clara Beaumont", agency: "Beaumont & Pryce", ...o }) as Agent;
const row = (status: QueryStatus, o: Record<string, unknown> = {}) => ({
  id: "q1", status, manuscriptId: "m1", sentMs: NOW - 30 * DAY, lastMs: NOW - 3 * DAY, stageStartMs: NOW - 3 * DAY, expectedMs: NOW + 14 * DAY, ...o,
}) as unknown as NonNullable<AgentFacts["q"]>;
const facts = (stand: AgentFacts["stand"], q: AgentFacts["q"], o: Partial<AgentFacts> = {}) =>
  ({ agent: agent(), stand, q, door: "open", loc: null, ...o }) as unknown as AgentFacts;

describe("the footer is the pack's table", () => {
  it("not queried: Log a query, and whether the agent is open", () => {
    const f = acFoot(facts("none", null), "Clara", null, NOW);
    expect([f.row, f.lead, f.sub, f.button?.label, f.button?.tone, f.button?.act.kind]).toEqual(["none", "Not queried yet", "Clara is open to queries", "Log a query", "navy", "log"]);
    expect(acFoot(facts("none", null, { door: "unknown" as never }), "Clara", null, NOW).sub).toBe("Not known if Clara is open to queries");
  });
  it("with the agent: Waiting on {first}, Record a response (outlined), the next-step box's journey", () => {
    const x = facts("agent", row(QueryStatus.FULL_SENT));
    const f = acFoot(x, "Clara", null, NOW);
    expect([f.row, f.lead, f.sub, f.button?.label, f.button?.tone]).toEqual(["agent", "Waiting on Clara", "Reply expected by 3 Dec", "Record a response", "outline"]);
    expect(f.button?.act).toEqual(nextStep(x, "Clara", null, NOW).button?.act);
  });
  it("a request to send: Mark partial / full sent (navy)", () => {
    const call = { kind: "you", bold: "", sub: "", button: "Send", door: { mode: "sent" }, queryId: "q1" } as never;
    const full = acFoot(facts("you", row(QueryStatus.FULL_REQUESTED, { expectedMs: null })), "Clara", call, NOW);
    /* Controls: entry v1 (Phase 4) — with a Send by, the footer says it as the query card does, with its weekday */
    const dated = acFoot(facts("you", row(QueryStatus.FULL_REQUESTED, { expectedMs: new Date(2026, 11, 4, 12).getTime() })), "Clara", call, NOW);
    expect(dated.sub).toBe("Send by Fri 4 Dec");
    expect([full.row, full.lead, full.sub, full.button?.label, full.button?.tone]).toEqual(["send", "Clara asked for your full", "Send it, then log it here", "Mark full sent", "navy"]);
    expect(full.button?.act).toEqual({ kind: "journey", mode: "sent", queryId: "q1" });
    expect(acFoot(facts("you", row(QueryStatus.PARTIAL_REQUESTED)), "Clara", call, NOW).button?.label).toBe("Mark partial sent");
  });
  it("an offer: Record your answer, and Make it a task as the second row's link", () => {
    const call = { kind: "you", bold: "", sub: "", button: "Answer", door: { mode: "offer" }, queryId: "q1" } as never;
    const f = acFoot(facts("you", row(QueryStatus.OFFER, { expectedMs: NOW + 7 * DAY })), "Clara", call, NOW);
    expect([f.lead, f.sub, f.button?.label, f.link?.label]).toEqual(["Clara made an offer", "Answer by 26 Nov", "Record your answer", "Make it a task"]);
  });
  it("closed: the query card's closed words, and Query again (outlined)", () => {
    const f = acFoot(facts("closed", row(QueryStatus.REJECTED)), "Clara", null, NOW);
    expect([f.lead, f.sub, f.button?.label, f.button?.tone, f.button?.act.kind]).toEqual(["Closed", "Clara passed · 16 Nov", "Query again", "outline", "log"]);
  });
  it("names the agent, never a pronoun", () => {
    for (const st of [QueryStatus.FULL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.REJECTED]) {
      const stand = st === QueryStatus.FULL_SENT ? "agent" : st === QueryStatus.REJECTED ? "closed" : "you";
      const f = acFoot(facts(stand, row(st)), "Clara", null, NOW);
      expect(`${f.lead} ${f.sub}`).not.toMatch(/\b(he|she|his|her|him)\b/i);
    }
  });
});

describe("the head and the query box", () => {
  it("the tone is the live query's stage; not queried is its own", () => {
    expect(acTone(facts("none", null))).toBe("nq");
    expect(acTone(facts("closed", row(QueryStatus.REJECTED)))).toBe("closed");
    expect(acTone(facts("you", row(QueryStatus.FULL_REQUESTED)))).toBe("full");
    expect(acPill(facts("none", null))).toEqual({ status: null, word: "Not queried" });
  });
  it("the query box's line", () => {
    expect(queryBoxLine(row(QueryStatus.FULL_REQUESTED), NOW)).toBe("Full requested 16 Nov");
    expect(queryBoxLine(row(QueryStatus.OFFER, { expectedMs: NOW + 7 * DAY }), NOW)).toBe("Offer made 16 Nov · answer by 26 Nov");
    expect(queryBoxLine(row(QueryStatus.REJECTED), NOW)).toBe("Passed 16 Nov");
  });
});

describe("Profile", () => {
  it("three fact boxes; all unknown and the row is not drawn", () => {
    const b = factBoxes(agent({ responseTimeWeeks: 4, noResponseMeansNo: false, submissionMethod: SubmissionMethod.EMAIL }), "open");
    expect(b.map((x) => [x.label, x.value, x.sub])).toEqual([["Replies in", "About 4 weeks", "always replies"], ["Takes queries", "By email", null], ["Open to queries", "Open", null]]);
    expect(factBoxesShown(factBoxes(agent(), "unknown" as never))).toBe(false);
  });
  it("what the agent asks for, the quantity at the right", () => {
    expect(askList(agent({ materialsWanted: ["Query letter", "Synopsis (2 pages)"] } as never)).map((x) => [x.label, x.qty])).toEqual([["Covering letter", null], ["Synopsis", "2 pages"]]);
  });
  it("the Finish block is Housekeeping's items, in its order", () => {
    expect(finishItems(["reply", "genres"]).map((x) => x.label)).toEqual(["+ Reply time", "+ Genres"]);
  });
  it("the snackbar", () => {
    expect(savedWords(2, "Clara", null)).toBe("Saved 2 changes to Clara");
    expect(savedWords(1, "Clara", { moved: 1, kept: 0, close: [] })).toBe("Saved 1 change to Clara, and moved the query’s dates");
  });
});
