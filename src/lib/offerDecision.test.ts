/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { buildOfferDecisionWrites, hasOfferDecision, OFFER_ACCEPTED_NESTED_TYPE, OFFER_DECLINED_NESTED_TYPE } from "./offerDecision";
import { ActivityType, Agent, Query, QueryStatus } from "../types";

const NOW = new Date("2026-07-17T14:00:00.000Z");
const q = { id: "q1", manuscriptId: "m1", agentId: "a1", status: QueryStatus.OFFER } as unknown as Query;
const ag = { id: "a1", name: "Tom Ellery", agency: "Curtis Vane" } as unknown as Agent;

describe("buildOfferDecisionWrites — the decision, never a re-log of the offer", () => {
  it("ACCEPTED is non-status: no resultingStatus on EITHER twin; status stays historically OFFER", () => {
    const w = buildOfferDecisionWrites(q, ag, "accepted", NOW);
    expect(w.activity.activityType).toBe(ActivityType.OFFER_ACCEPTED);
    expect("resultingStatus" in w.activity && w.activity.resultingStatus).toBeFalsy();
    expect(w.nested.type).toBe(OFFER_ACCEPTED_NESTED_TYPE);
    expect(w.nested.resultingStatus).toBeUndefined();
    expect(w.activity.date).toBe(NOW.toISOString()); // logged at the moment of recording — never back-dated
    expect(w.nested.createdAt).toBe(NOW.toISOString());
    expect(w.activity.description).toContain("Offer accepted");
    expect(w.activity.description).toContain("Tom Ellery at Curtis Vane");
  });

  it("DECLINED carries resultingStatus WITHDRAWN on BOTH twins — recompute (the single deriver) closes the query from this one node", () => {
    const w = buildOfferDecisionWrites(q, ag, "declined", NOW);
    expect(w.activity.activityType).toBe(ActivityType.OFFER_DECLINED);
    expect(w.activity.resultingStatus).toBe(QueryStatus.WITHDRAWN);
    expect(w.nested.type).toBe(OFFER_DECLINED_NESTED_TYPE);
    expect(w.nested.resultingStatus).toBe(QueryStatus.WITHDRAWN);
    expect(w.activity.description).toContain("the querying continues");
  });

  it("NEITHER decision ever emits an OFFER status or a STATUS_CHANGED re-log — the invariant", () => {
    for (const d of ["accepted", "declined"] as const) {
      const w = buildOfferDecisionWrites(q, ag, d, NOW);
      expect(w.activity.resultingStatus).not.toBe(QueryStatus.OFFER);
      expect(w.nested.resultingStatus).not.toBe(QueryStatus.OFFER);
      expect(w.activity.activityType).not.toBe(ActivityType.STATUS_CHANGED);
    }
  });

  it("agent-less queries degrade gracefully", () => {
    const w = buildOfferDecisionWrites(q, undefined, "accepted", NOW);
    expect(w.activity.description).toContain("the agent");
  });
});

describe("hasOfferDecision — the offer task's death condition (the approved engine clause)", () => {
  const act = (queryId: string, activityType: ActivityType) => ({ queryId, activityType });
  it("false with no decision (an OFFER status-change alone never kills the task)", () => {
    expect(hasOfferDecision("q1", [act("q1", ActivityType.STATUS_CHANGED), act("q2", ActivityType.OFFER_ACCEPTED)])).toBe(false);
  });
  it("true once either decision exists for THAT query", () => {
    expect(hasOfferDecision("q1", [act("q1", ActivityType.OFFER_ACCEPTED)])).toBe(true);
    expect(hasOfferDecision("q1", [act("q1", ActivityType.OFFER_DECLINED)])).toBe(true);
  });
});

describe("the journey's write surface — source locks", () => {
  const flow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/todo/FocusFlow.tsx"), "utf8");
  it("the offer re-log path is GONE (RecordResponseFocusForm no longer mounted by the flow)", () => {
    expect(flow).not.toContain("RecordResponseFocusForm");
  });
  it("need-time writes only the existing snooze flag; the notify step's outputs are user tasks only (popup-notify-scrim P2)", () => {
    expect(flow).toContain('flagKeyForTask("offer_received"');
    expect(flow).toContain("reminderFields(selRows, q.id, replyBy)");
    expect(flow).toContain("await addUserTask(f)");
    expect(flow).not.toContain("offer-notify-"); // the staged-nudge notify path is retired
  });
});
