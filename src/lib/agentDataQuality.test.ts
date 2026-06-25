/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for the shared data-quality predicate (Prompt 7). The same list drives the to-do task and
 * the drawer's needs-highlight, so it must yield the exact per-field set.
 */
import { describe, it, expect } from "vitest";
import { agentDataQualityNeeds } from "./agentDataQuality";

describe("agentDataQualityNeeds", () => {
  it("flags mswl when the wishlist is empty", () => {
    expect(agentDataQualityNeeds({ mswlNotes: "   ", materialsWanted: ["Query letter"] })).toEqual(["mswl"]);
  });

  it("flags materials when none are wanted", () => {
    expect(agentDataQualityNeeds({ mswlNotes: "Loves voice", materialsWanted: [] })).toEqual(["materials"]);
    expect(agentDataQualityNeeds({ mswlNotes: "Loves voice", materialsWanted: undefined })).toEqual(["materials"]);
  });

  it("flags both when both are empty", () => {
    expect(agentDataQualityNeeds({ mswlNotes: "", materialsWanted: [] }).sort()).toEqual(["materials", "mswl"]);
  });

  it("returns [] when the agent is clean", () => {
    expect(agentDataQualityNeeds({ mswlNotes: "Upmarket book club", materialsWanted: ["Query letter"] })).toEqual([]);
  });

  it("handles the legacy map materials shape", () => {
    expect(agentDataQualityNeeds({ mswlNotes: "x", materialsWanted: { query: { selected: true } } })).toEqual([]);
    expect(agentDataQualityNeeds({ mswlNotes: "x", materialsWanted: { query: { selected: false } } })).toEqual(["materials"]);
  });

  it("flags response-time only for the 0 stub placeholder", () => {
    const clean = { mswlNotes: "x", materialsWanted: ["Query letter"] };
    expect(agentDataQualityNeeds({ ...clean, responseTimeWeeks: 0 })).toEqual(["responseTime"]);
    expect(agentDataQualityNeeds({ ...clean, responseTimeWeeks: 8 })).toEqual([]);
    // Explicit Unknown (absent / null) clears it — a valid answer.
    expect(agentDataQualityNeeds({ ...clean, responseTimeWeeks: null })).toEqual([]);
    expect(agentDataQualityNeeds({ ...clean, responseTimeWeeks: undefined })).toEqual([]);
  });

  it("returns the full set in journey order (responseTime → materials → mswl)", () => {
    expect(agentDataQualityNeeds({ mswlNotes: "", materialsWanted: [], responseTimeWeeks: 0 }))
      .toEqual(["responseTime", "materials", "mswl"]);
  });
});
