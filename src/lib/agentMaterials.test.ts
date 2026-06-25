/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Round-trip tests for the agent materials encoder/decoder (Prompt 5A). Proves the structured editor
 * reads stored strings back exactly and writes the identical canonical shape, and that unrecognised
 * legacy/Smart-Import strings fold into Other rather than being dropped (★1).
 */
import { describe, it, expect } from "vitest";
import {
  buildAgentMaterials,
  parseAgentMaterials,
  materialsCountErrors,
  AgentMaterialsState,
} from "./agentMaterials";

describe("buildAgentMaterials", () => {
  it("emits the canonical formatted strings (matches the Add-Agent form output)", () => {
    const s: AgentMaterialsState = {
      selected: ["Query letter", "Synopsis", "Pages", "Chapters", "Word count"],
      counts: { Pages: "10", Chapters: "3", "Word count": "5000" },
      otherText: "",
    };
    expect(buildAgentMaterials(s)).toEqual([
      "Query letter", "Synopsis", "First 10 pages", "First 3 chapters", "5,000 words",
    ]);
  });

  it("emits no-count variants when a quantified pill has a blank count", () => {
    const s: AgentMaterialsState = { selected: ["Pages", "Chapters", "Word count"], counts: {}, otherText: "" };
    expect(buildAgentMaterials(s)).toEqual(["Sample pages", "Chapters", "Word count"]);
  });

  it("includes Other only when it has text", () => {
    expect(buildAgentMaterials({ selected: ["Other"], counts: {}, otherText: "" })).toEqual([]);
    expect(buildAgentMaterials({ selected: ["Other"], counts: {}, otherText: "Comp titles" })).toEqual(["Comp titles"]);
  });
});

describe("parseAgentMaterials", () => {
  it("reads the canonical strings back into structured state", () => {
    const s = parseAgentMaterials(["Query letter", "Synopsis", "First 10 pages", "First 3 chapters", "5,000 words"]);
    expect(s.selected.sort()).toEqual(["Chapters", "Pages", "Query letter", "Synopsis", "Word count"].sort());
    expect(s.counts).toEqual({ Pages: "10", Chapters: "3", "Word count": "5000" });
    expect(s.otherText).toBe("");
  });

  it("reads no-count variants as selected-without-count", () => {
    const s = parseAgentMaterials(["Sample pages", "Chapters", "Word count"]);
    expect(s.selected.sort()).toEqual(["Chapters", "Pages", "Word count"].sort());
    expect(s.counts).toEqual({});
  });

  it("★1 folds unrecognised strings into Other (joined), never dropping them", () => {
    const s = parseAgentMaterials(["Query letter", "Pitch deck", "Author bio"]);
    expect(s.selected).toContain("Query letter");
    expect(s.selected).toContain("Other");
    expect(s.otherText).toBe("Pitch deck · Author bio");
  });

  it("is case-insensitive on the known labels", () => {
    const s = parseAgentMaterials(["QUERY LETTER", "first 12 PAGES"]);
    expect(s.selected.sort()).toEqual(["Pages", "Query letter"].sort());
    expect(s.counts.Pages).toBe("12");
  });

  it("handles empty / undefined", () => {
    expect(parseAgentMaterials(undefined)).toEqual({ selected: [], counts: {}, otherText: "" });
    expect(parseAgentMaterials([])).toEqual({ selected: [], counts: {}, otherText: "" });
  });
});

describe("round-trip", () => {
  it("parse(build(state)) preserves a structured selection", () => {
    const s: AgentMaterialsState = {
      selected: ["Query letter", "Pages", "Word count"],
      counts: { Pages: "25", "Word count": "80000" },
      otherText: "",
    };
    const back = parseAgentMaterials(buildAgentMaterials(s));
    expect(back.selected.sort()).toEqual(s.selected.sort());
    expect(back.counts.Pages).toBe("25");
    expect(back.counts["Word count"]).toBe("80000");
  });

  it("build(parse(strings)) preserves recognised strings verbatim", () => {
    const stored = ["Query letter", "Synopsis", "First 10 pages", "5,000 words"];
    expect(buildAgentMaterials(parseAgentMaterials(stored))).toEqual(stored);
  });

  it("an unrecognised string survives the round-trip via Other", () => {
    const stored = ["Query letter", "One-page pitch"];
    const back = buildAgentMaterials(parseAgentMaterials(stored));
    expect(back).toContain("Query letter");
    expect(back).toContain("One-page pitch");
  });
});

describe("materialsCountErrors", () => {
  it("flags out-of-range counts, allows blank", () => {
    expect(materialsCountErrors({ selected: ["Pages"], counts: { Pages: "10000" }, otherText: "" }).has("Pages")).toBe(true);
    expect(materialsCountErrors({ selected: ["Pages"], counts: { Pages: "0" }, otherText: "" }).has("Pages")).toBe(true);
    expect(materialsCountErrors({ selected: ["Pages"], counts: { Pages: "10" }, otherText: "" }).size).toBe(0);
    expect(materialsCountErrors({ selected: ["Pages"], counts: {}, otherText: "" }).size).toBe(0);
  });

  it("ignores counts for unselected pills", () => {
    expect(materialsCountErrors({ selected: [], counts: { Pages: "99999" }, otherText: "" }).size).toBe(0);
  });
});
