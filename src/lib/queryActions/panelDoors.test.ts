/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query panel v1 §C — the next move decides the panel's primary button and the step's title.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../../types";
import { agentLead, cardDoors, panelDoors, panelStepWords, type AgentLead } from "./entry";
import { CLOSE_OVER_DAYS } from "../nudgeWindow";

/* v141.1 — RE-POINTED: panelDoors takes the lead ("close" / "nudge" / none) rather than days waiting; the nudge window
   (lib/nudgeWindow) decides it, and `agentLead` is held against that window below */
const primary = (s: QueryStatus, lead: AgentLead = null) => panelDoors(s, lead).find((d) => d.primary);
const others = (s: QueryStatus, lead: AgentLead = null) => panelDoors(s, lead).filter((d) => !d.primary).map((d) => d.label);

describe("panelDoors", () => {
  it("with the agent: Record a response, then Nudge and Close query", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(primary(s)).toMatchObject({ mode: "resp", label: "Record a response" });
      expect(others(s)).toEqual(["Nudge", "Close query"]);
    }
  });
  it("with the agent: Close query leads past the nudge window, Nudge inside it (v141.1)", () => {
    expect(primary(QueryStatus.QUERIED, "close")).toMatchObject({ mode: "close", label: "Close query" });
    expect(others(QueryStatus.QUERIED, "close")).toEqual(["Record a response", "Nudge"]);
    expect(primary(QueryStatus.QUERIED, "nudge")).toMatchObject({ mode: "nudge", label: "Nudge" });
  });
  it("agentLead reads the nudge window: wait, nudge, close at its edges; undated is not silent; Keep tracking stops Close", () => {
    const now = Date.UTC(2026, 9, 20, 12), D = 86_400_000;
    const r = (daysPast: number | null, extra: object = {}) => ({ status: QueryStatus.QUERIED, court: "agent", dayN: 10, expectedMs: daysPast == null ? null : now - daysPast * D, stageStartMs: now - 10 * D, ...extra });
    expect(agentLead(r(-1), now)).toBeNull();
    expect(agentLead(r(1), now)).toBe("nudge");
    expect(agentLead(r(CLOSE_OVER_DAYS), now)).toBe("nudge");
    expect(agentLead(r(CLOSE_OVER_DAYS + 1), now)).toBe("close");
    expect(agentLead(r(null), now), "an undated query ten days in is not a silent one").toBeNull();
    expect(agentLead(r(CLOSE_OVER_DAYS + 1, { query: { closureOfferDismissed: true } }), now)).toBeNull();
    expect(agentLead({ ...r(40), court: "you" }, now)).toBeNull();
  });
  it("with you: Mark partial sent or Mark full sent, never a response first — however long it has been", () => {
    expect(primary(QueryStatus.PARTIAL_REQUESTED, "close")).toMatchObject({ mode: "sent", label: "Mark partial sent" });
    expect(primary(QueryStatus.FULL_REQUESTED)).toMatchObject({ mode: "sent", label: "Mark full sent" });
    expect(primary(QueryStatus.REVISE_RESUBMIT)).toMatchObject({ mode: "sent", label: "Mark revision sent" });
    expect(others(QueryStatus.FULL_REQUESTED)).toEqual(["Record a response", "Close query"]);
  });
  it("an offer: Record your answer, and Close query", () => {
    expect(primary(QueryStatus.OFFER)).toMatchObject({ mode: "offer", label: "Record your answer" });
    expect(others(QueryStatus.OFFER)).toEqual(["Close query"]);
  });
  it("closed: one door, the late reply (there is no reopen journey); signed: none", () => {
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) expect(panelDoors(s, "close")).toEqual([{ mode: "resp", label: "Record a late reply", primary: true }]);
    expect(panelDoors(QueryStatus.SIGNED, null)).toEqual([]);
  });
  it("⚠️ every door the panel offers is a journey the card already offered, or Close on an offer", () => {
    for (const s of Object.values(QueryStatus)) {
      const built = new Set(cardDoors(s).map((d) => d.mode));
      for (const d of panelDoors(s, "close")) expect(built.has(d.mode) || (s === QueryStatus.OFFER && d.mode === "close"), `${s}: ${d.mode}`).toBe(true);
    }
  });
});

describe("panelStepWords", () => {
  /* RE-POINTED (Query panel v2 §D): the status band that said what was being done is gone with the drawer's own
     head; what is left is the step's title, said for this query */
  it("the step's title, said for this query", () => {
    expect(panelStepWords("resp", QueryStatus.QUERIED, "Fenella")).toEqual({ title: "What did Fenella say?" });
    expect(panelStepWords("close", QueryStatus.QUERIED, "Fenella").title).toBe("Close Fenella\u2019s query?");
    expect(panelStepWords("sent", QueryStatus.PARTIAL_REQUESTED, "Fenella")).toEqual({ title: "What went to Fenella?" });
    expect(panelStepWords("resp", QueryStatus.QUERIED, "").title).toBe("What did the agent say?");
  });
});
