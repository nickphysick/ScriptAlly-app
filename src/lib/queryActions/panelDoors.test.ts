/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query panel v1 §C — the next move decides the panel's primary button and the step's title.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../../types";
import { LONG_SILENCE_DAYS, cardDoors, panelDoors, panelStepWords } from "./entry";

const primary = (s: QueryStatus, days: number | null = 20) => panelDoors(s, days).find((d) => d.primary);
const others = (s: QueryStatus, days: number | null = 20) => panelDoors(s, days).filter((d) => !d.primary).map((d) => d.label);

describe("panelDoors", () => {
  it("with the agent: Record a response, then Nudge and Close query", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(primary(s)).toMatchObject({ mode: "resp", label: "Record a response" });
      expect(others(s)).toEqual(["Nudge", "Close query"]);
    }
  });
  it("with the agent for over a year: Close query leads, at the day after the 365th and not on it", () => {
    expect(primary(QueryStatus.QUERIED, LONG_SILENCE_DAYS)).toMatchObject({ mode: "resp" });
    expect(primary(QueryStatus.QUERIED, LONG_SILENCE_DAYS + 1)).toMatchObject({ mode: "close", label: "Close query" });
    expect(others(QueryStatus.QUERIED, LONG_SILENCE_DAYS + 1)).toEqual(["Record a response", "Nudge"]);
    expect(primary(QueryStatus.QUERIED, null), "an undated query is not a silent one").toMatchObject({ mode: "resp" });
  });
  it("with you: Mark partial sent or Mark full sent, never a response first — however long it has been", () => {
    expect(primary(QueryStatus.PARTIAL_REQUESTED, 900)).toMatchObject({ mode: "sent", label: "Mark partial sent" });
    expect(primary(QueryStatus.FULL_REQUESTED)).toMatchObject({ mode: "sent", label: "Mark full sent" });
    expect(primary(QueryStatus.REVISE_RESUBMIT)).toMatchObject({ mode: "sent", label: "Mark revision sent" });
    expect(others(QueryStatus.FULL_REQUESTED)).toEqual(["Record a response", "Close query"]);
  });
  it("an offer: Record your answer, and Close query", () => {
    expect(primary(QueryStatus.OFFER)).toMatchObject({ mode: "offer", label: "Record your answer" });
    expect(others(QueryStatus.OFFER)).toEqual(["Close query"]);
  });
  it("closed: one door, the late reply (there is no reopen journey); signed: none", () => {
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) expect(panelDoors(s, 400)).toEqual([{ mode: "resp", label: "Record a late reply", primary: true }]);
    expect(panelDoors(QueryStatus.SIGNED, null)).toEqual([]);
  });
  it("⚠️ every door the panel offers is a journey the card already offered, or Close on an offer", () => {
    for (const s of Object.values(QueryStatus)) {
      const built = new Set(cardDoors(s).map((d) => d.mode));
      for (const d of panelDoors(s, 500)) expect(built.has(d.mode) || (s === QueryStatus.OFFER && d.mode === "close"), `${s}: ${d.mode}`).toBe(true);
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
