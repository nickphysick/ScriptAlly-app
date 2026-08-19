/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MATERIALS JOURNEY — its declared shape, and the two things it must never do.
 *
 * ⚠️ THE INPUTS ARE DERIVED, NOT TYPED. `openSend` is what really builds a draft, so the rows come
 * from it rather than from a literal — the trap `journeyMaterials` fell into, where a test passed
 * for the life of a feature over an argument no caller could produce.
 */
import { describe, it, expect } from "vitest";
import {
  JOURNEY_STEPS, JOURNEY_ACT, JOURNEY_HINT, JOURNEY_PRELINE, openSend, journeySummary,
} from "./paneJourney";
import { materialRowsFromAgent, materialsWantedFromRows, willRecordText } from "./agentMaterials";

const NOW = new Date("2026-08-19T09:00:00Z");
const draft = () => openSend([], undefined, NOW);

describe("the declared shape", () => {
  it("⚠️ ONE STEP — padding it would be inventing work the query already answers", () => {
    expect(JOURNEY_STEPS.materials).toEqual(["gap-sent-materials"]);
  });

  it("names its own deed, hint and pre-line rather than inheriting another journey's", () => {
    expect(JOURNEY_ACT.materials).toBe("Record what you sent");
    expect(JOURNEY_HINT.materials).toMatch(/does not move/i);
    expect(JOURNEY_PRELINE.materials).toBe("Filling in what you sent");
    // …and none of them is the send's, which is what a fall-through would have produced
    expect(JOURNEY_PRELINE.materials).not.toBe(JOURNEY_PRELINE.send);
    expect(JOURNEY_HINT.materials).not.toBe(JOURNEY_HINT.send);
  });
});

describe("⚠️ nothing is ticked until the writer says so", () => {
  it("a fresh draft has all four rows and none of them on", () => {
    const rows = draft().recordRows;
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.on)).toHaveLength(0);
  });

  it("and it therefore records NOTHING — the commit's own guard", () => {
    expect(materialsWantedFromRows(draft().recordRows)).toEqual([]);
    expect(willRecordText(draft().recordRows, "and")).toBeNull();
  });

  it("⚠️ the draft is NOT seeded from the agent — that is a button, not a default", () => {
    // an agent who asks for two things still opens an empty form
    const asks = materialRowsFromAgent(["Query letter", "Synopsis"]);
    expect(asks.filter((r) => r.on)).toHaveLength(2);
    expect(draft().recordRows.filter((r) => r.on)).toHaveLength(0);
  });
});

describe("⚠️ the summary is its own, and the close journey's is no longer the fall-through", () => {
  it("states what will be recorded once something is ticked", () => {
    const v = draft();
    const seeded = { ...v, recordRows: materialRowsFromAgent(["Query letter", "Synopsis"]) };
    expect(journeySummary("materials", seeded, NOW)).toBe("Recording covering letter · synopsis on this send.");
  });

  it("asks rather than guessing when nothing is ticked", () => {
    expect(journeySummary("materials", draft(), NOW)).toBe("Tick what went with this query.");
  });

  it("⚠️ AND IT IS NOT THE CLOSE JOURNEY'S SENTENCE — the fault measured on the page", () => {
    const closeSays = journeySummary("close", draft(), NOW);
    expect(closeSays).toBe("Choose how this one ended.");
    expect(journeySummary("materials", draft(), NOW)).not.toBe(closeSays);
  });

  it("every kind states something of its own — no kind falls through to another's words", () => {
    const v = draft();
    const said = (["send", "chase", "close", "offer", "note", "fix", "materials"] as const)
      .map((k) => journeySummary(k, v, NOW));
    expect(new Set(said).size).toBe(said.length);
  });
});
