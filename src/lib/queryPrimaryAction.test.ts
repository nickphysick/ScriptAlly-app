/**
 * Locks for the shared status→primary-action map. It now feeds both the Queries command bar and
 * the To-do focus/ledger flows, and QueryStatus strings are a recurring regression source — so the
 * exact mapping (kind · markKind · target · ballHolder) is pinned here, once, for every status.
 */

import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";

describe("getPrimaryAction — writer's-turn states open Mark-Sent", () => {
  it("Partial Requested → mark-sent partial → Partial Sent", () => {
    expect(getPrimaryAction(QueryStatus.PARTIAL_REQUESTED)).toEqual({
      kind: "mark-sent", markKind: "partial", target: QueryStatus.PARTIAL_SENT, label: "Mark partial as sent", ballHolder: "writer",
    });
  });
  it("Full Requested → mark-sent full → Full Sent", () => {
    expect(getPrimaryAction(QueryStatus.FULL_REQUESTED)).toEqual({
      kind: "mark-sent", markKind: "full", target: QueryStatus.FULL_SENT, label: "Mark full as sent", ballHolder: "writer",
    });
  });
  it("Revise & Resubmit → mark-sent resubmit → Full Sent", () => {
    expect(getPrimaryAction(QueryStatus.REVISE_RESUBMIT)).toEqual({
      kind: "mark-sent", markKind: "resubmit", target: QueryStatus.FULL_SENT, label: "Record your resubmission", ballHolder: "writer",
    });
  });
});

describe("getPrimaryAction — agent's-turn + terminal states record a response", () => {
  it("Queried / Partial Sent / Full Sent → record, ballHolder agent", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(getPrimaryAction(s)).toEqual({ kind: "record", label: "Record response", ballHolder: "agent" });
    }
  });
  it("Offer / Rejected / Withdrawn / No Response → record, no ball-holder", () => {
    for (const s of [QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(getPrimaryAction(s)).toEqual({ kind: "record", label: "Record response", ballHolder: null });
    }
  });
});
