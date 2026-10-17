/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD52 G3 (unit) — the close journey's save as one function: the record each reason writes, the noreply answers the
 * journey opens with, and the journey's commit calling it (so the bulk close and a single close share one save).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { closeRecord, noreplyAnswers } from "./closeRecord";

const today = new Date(2026, 9, 17, 12);

describe("TD52 G3 — the close's save", () => {
  it("a No reply close: dated today, closed_no_reply, no notes", () => {
    const r = closeRecord(noreplyAnswers(today));
    expect(r.dateReceived.slice(0, 10)).toBe(new Date(2026, 9, 17, 12).toISOString().slice(0, 10));
    expect(r).toMatchObject({ responseType: "close", closingReason: "No response after expected window", closingNotes: "", eventKey: "closed_no_reply" });
    expect(r).not.toHaveProperty("closeAs");
  });
  it("withdraw and gone keep their own records", () => {
    expect(closeRecord({ ...noreplyAnswers(today), why: "withdraw", wd: "revise", note: " later " })).toMatchObject({ eventKey: "withdrawn", closingNotes: "Revising the book · later" });
    expect(closeRecord({ ...noreplyAnswers(today), why: "gone" })).toMatchObject({ eventKey: "closed_agent_gone", closeAs: "withdrawn", closingToken: "agent_closed" });
  });
  it("the journey's commit is that save (no second copy of the write)", () => {
    const src = readFileSync("src/components/queryActions/journeys/CloseJourney.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toContain("await saveClose(db, q, agent, { why, on, wd, told, remindTell, recheck, note }, today)");
    expect(src).not.toContain("recordQueryResponse");
  });
});
