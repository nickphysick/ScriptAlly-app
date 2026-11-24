/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query · Unknown reply time v1 — THE WRITER'S UNKNOWN BEATS THE AGENT'S WEEKS (Nick's ruling, 24 Nov: match Record a
 * response v2.1.1). Unknown on the Nudge step saved nothing, so the card fell back to the agent's weeks. Now the save
 * stamps the writer's statement with no date (lib/expectedDate `writerExpectedUnknownWrite`), and the card shows none.
 *
 *   K1  Unknown, agent with weeks (Marcus, 8): the plan says Unknown; the record stamps `writerExpectedSetAt`, no date
 *   K2  the review's card (the save's own record, `previewOf`): no expected date
 *   K3  the agent's weeks kept (8): no stamp, the agent's window, as before
 *   K4  a moved date (10 weeks): the writer's date and its stamp, as before
 *   K5  Unknown for an agent with no weeks (Joanna): no date before and after — now also stamped
 */
import { describe, expect, it } from "vitest";
import { SubmissionMethod, SubmissionStatus, type Agent } from "../../types";
import { logPayload } from "./logSave";
import { planOf, previewOf, replyDefaults, toggleUnknown, withWeeks, type LogAnswers, type PlanContext, type ReplyAnswers } from "./logStages";

const NOW = new Date(2026, 10, 9, 12).getTime();
const SENT = new Date(2026, 10, 9).getTime();
const DAY = 86_400_000;
const ag = (id: string, name: string, x: Partial<Agent> = {}): Agent => ({
  id, name, agency: "Hartley & Co", email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [], responseTimeWeeks: 8, noResponseMeansNo: false, ...x,
} as unknown as Agent);
const MARCUS = ag("mr", "Marcus Reed");
const JOANNA = ag("jl", "Joanna Lindqvist", { responseTimeWeeks: undefined });
const CTX: PlanContext = { manuscriptId: "m", agents: [MARCUS, JOANNA], packages: [], letters: [{ id: "la", name: "Letter A" }], synopses: [], bookVersions: [] };
const answers = (agentId: string, reply: ReplyAnswers): LogAnswers => ({
  agentId, sent: SENT, via: SubmissionMethod.EMAIL, packageId: null, letterId: "la", synopsisId: null, sample: null, notes: [], reply,
});
const run = (agent: Agent, reply: ReplyAnswers) => {
  const plan = planOf(answers(agent.id, reply), CTX, "q1", false, NOW)!;
  return { plan, rec: logPayload(plan).payload as Record<string, unknown>, pv: previewOf(plan, NOW, 6) };
};

describe("Log a query · the writer's Unknown beats the agent's weeks", () => {
  it("K1 Unknown for an agent with weeks: the record stamps the statement, no date", () => {
    const { plan, rec } = run(MARCUS, toggleUnknown(replyDefaults(MARCUS), 8));
    expect(plan.expect).toBe(null);
    expect(plan.replyUnknown).toBe(true);
    expect(typeof rec.writerExpectedSetAt).toBe("string");
    expect(rec.writerExpectedDate).toBe(undefined);
  });
  it("K2 the review's card has no expected date", () => {
    expect(run(MARCUS, toggleUnknown(replyDefaults(MARCUS), 8)).pv.row.expectedMs).toBe(null);
  });
  it("K3 the agent's weeks kept: no stamp, the agent's window", () => {
    const { rec, pv } = run(MARCUS, replyDefaults(MARCUS));
    expect(rec.writerExpectedSetAt).toBe(undefined);
    expect(rec.writerExpectedDate).toBe(undefined);
    expect(Math.floor(((pv.row.expectedMs ?? 0) - SENT) / DAY)).toBe(56);
  });
  it("K4 a moved date: the writer's date and its stamp", () => {
    const { rec, pv } = run(MARCUS, withWeeks(replyDefaults(MARCUS), 10, 8));
    expect(typeof rec.writerExpectedDate).toBe("string");
    expect(typeof rec.writerExpectedSetAt).toBe("string");
    expect(Math.floor(((pv.row.expectedMs ?? 0) - SENT) / DAY)).toBe(70);
  });
  it("K5 Unknown for an agent with no weeks: no date, stamped", () => {
    const { rec, pv } = run(JOANNA, replyDefaults(JOANNA));
    expect(pv.row.expectedMs).toBe(null);
    expect(typeof rec.writerExpectedSetAt).toBe("string");
  });
});
