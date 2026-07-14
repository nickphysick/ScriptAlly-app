/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Round-trip tests for the agent materials encoder/decoder — 6d vocabulary (Author bio + Full
 * manuscript binary; Synopsis optionally page-quantified; Sample pages/chapters/words). Proves the
 * structured editor reads stored strings back exactly, writes the canonical shape, tolerates LEGACY
 * strings ("Chapters"/"Word count"/old binary "Synopsis") read-time, folds the unknown into Other
 * (★1), and that the componentType reference map reuses the Package Builder enum with the KNOWN GAPS.
 */
import { describe, it, expect } from "vitest";
import {
  MAT_OPTS,
  buildAgentMaterials,
  parseAgentMaterials,
  materialsCountErrors,
  materialComponentType,
  AgentMaterialsState,
} from "./agentMaterials";
import { ComponentType } from "../types";

describe("buildAgentMaterials", () => {
  it("emits the canonical formatted strings, in MAT_OPTS order", () => {
    const s: AgentMaterialsState = {
      selected: ["Full manuscript", "Query letter", "Author bio", "Synopsis", "Sample pages", "Sample chapters", "Sample words"],
      counts: { "Synopsis": "2", "Sample pages": "10", "Sample chapters": "3", "Sample words": "5000" },
      otherText: "",
    };
    expect(buildAgentMaterials(s)).toEqual([
      "Query letter", "Author bio", "Synopsis (2 pages)", "First 10 pages", "First 3 chapters", "5,000 words", "Full manuscript",
    ]);
  });

  it("emits no-count variants when a quantified pill has a blank count", () => {
    const s: AgentMaterialsState = { selected: ["Synopsis", "Sample pages", "Sample chapters", "Sample words"], counts: {}, otherText: "" };
    expect(buildAgentMaterials(s)).toEqual(["Synopsis", "Sample pages", "Sample chapters", "Sample words"]);
  });

  it("treats Author bio and Full manuscript as binary", () => {
    expect(buildAgentMaterials({ selected: ["Author bio", "Full manuscript"], counts: {}, otherText: "" }))
      .toEqual(["Author bio", "Full manuscript"]);
  });

  it("includes Other only when it has text", () => {
    expect(buildAgentMaterials({ selected: ["Other"], counts: {}, otherText: "" })).toEqual([]);
    expect(buildAgentMaterials({ selected: ["Other"], counts: {}, otherText: "Comp titles" })).toEqual(["Comp titles"]);
  });
});

describe("parseAgentMaterials", () => {
  it("reads the canonical strings back into structured state", () => {
    const s = parseAgentMaterials(["Query letter", "Author bio", "Synopsis (2 pages)", "First 10 pages", "First 3 chapters", "5,000 words", "Full manuscript"]);
    expect(s.selected.sort()).toEqual(["Author bio", "Full manuscript", "Query letter", "Sample chapters", "Sample pages", "Sample words", "Synopsis"].sort());
    expect(s.counts).toEqual({ "Synopsis": "2", "Sample pages": "10", "Sample chapters": "3", "Sample words": "5000" });
    expect(s.otherText).toBe("");
  });

  it("reads no-count variants as selected-without-count", () => {
    const s = parseAgentMaterials(["Synopsis", "Sample pages", "Sample chapters", "Sample words"]);
    expect(s.selected.sort()).toEqual(["Sample chapters", "Sample pages", "Sample words", "Synopsis"].sort());
    expect(s.counts).toEqual({});
  });

  it("tolerates LEGACY spellings read-time (Chapters / Word count / old binary Synopsis / Pages)", () => {
    const s = parseAgentMaterials(["Synopsis", "Chapters", "Word count", "Sample pages"]);
    expect(s.selected.sort()).toEqual(["Sample chapters", "Sample pages", "Sample words", "Synopsis"].sort());
    expect(s.counts).toEqual({});
  });

  it("★1 folds genuinely unrecognised strings into Other (joined), never dropping them", () => {
    const s = parseAgentMaterials(["Query letter", "Pitch deck", "One-page pitch"]);
    expect(s.selected).toContain("Query letter");
    expect(s.selected).toContain("Other");
    expect(s.otherText).toBe("Pitch deck · One-page pitch");
  });

  it("is case-insensitive on the known labels", () => {
    const s = parseAgentMaterials(["QUERY LETTER", "first 12 PAGES", "AUTHOR BIO", "full manuscript"]);
    expect(s.selected.sort()).toEqual(["Author bio", "Full manuscript", "Query letter", "Sample pages"].sort());
    expect(s.counts["Sample pages"]).toBe("12");
  });

  it("handles empty / undefined", () => {
    expect(parseAgentMaterials(undefined)).toEqual({ selected: [], counts: {}, otherText: "" });
    expect(parseAgentMaterials([])).toEqual({ selected: [], counts: {}, otherText: "" });
  });
});

describe("round-trip", () => {
  it("parse(build(state)) preserves a structured selection", () => {
    const s: AgentMaterialsState = {
      selected: ["Query letter", "Sample pages", "Sample words", "Synopsis"],
      counts: { "Sample pages": "25", "Sample words": "80000", "Synopsis": "3" },
      otherText: "",
    };
    const back = parseAgentMaterials(buildAgentMaterials(s));
    expect(back.selected.sort()).toEqual(s.selected.sort());
    expect(back.counts["Sample pages"]).toBe("25");
    expect(back.counts["Sample words"]).toBe("80000");
    expect(back.counts["Synopsis"]).toBe("3");
  });

  it("build(parse(strings)) preserves recognised strings verbatim", () => {
    const stored = ["Query letter", "Author bio", "Synopsis (2 pages)", "First 10 pages", "5,000 words", "Full manuscript"];
    expect(buildAgentMaterials(parseAgentMaterials(stored))).toEqual(stored);
  });

  it("normalises a legacy string on re-save (Chapters → Sample chapters)", () => {
    expect(buildAgentMaterials(parseAgentMaterials(["Chapters"]))).toEqual(["Sample chapters"]);
  });

  it("an unrecognised string survives the round-trip via Other", () => {
    const stored = ["Query letter", "One-page pitch"];
    const back = buildAgentMaterials(parseAgentMaterials(stored));
    expect(back).toContain("Query letter");
    expect(back).toContain("One-page pitch");
  });
});

describe("materialComponentType (reference map — reuses the Package Builder enum, with gaps)", () => {
  it("maps the members that exist", () => {
    expect(materialComponentType["Query letter"]).toBe(ComponentType.QUERY_LETTER);
    expect(materialComponentType["Synopsis"]).toBe(ComponentType.SYNOPSIS);
    expect(materialComponentType["Full manuscript"]).toBe(ComponentType.FULL_MANUSCRIPT);
  });

  it("GAP: Author bio and Other have no ComponentType member", () => {
    expect(materialComponentType["Author bio"]).toBeUndefined();
    expect(materialComponentType["Other"]).toBeUndefined();
  });

  it("GAP: sample pages/chapters/words all collapse to SAMPLE_PAGES (unit is the only difference)", () => {
    expect(materialComponentType["Sample pages"]).toBe(ComponentType.SAMPLE_PAGES);
    expect(materialComponentType["Sample chapters"]).toBe(ComponentType.SAMPLE_PAGES);
    expect(materialComponentType["Sample words"]).toBe(ComponentType.SAMPLE_PAGES);
  });

  it("every quantified/binary pill except Author bio + Other is in the map", () => {
    for (const opt of MAT_OPTS) {
      const mapped = opt in materialComponentType;
      expect(mapped).toBe(opt !== "Author bio" && opt !== "Other");
    }
  });
});

describe("materialsCountErrors", () => {
  it("flags out-of-range counts, allows blank", () => {
    expect(materialsCountErrors({ selected: ["Sample pages"], counts: { "Sample pages": "10000" }, otherText: "" }).has("Sample pages")).toBe(true);
    expect(materialsCountErrors({ selected: ["Sample pages"], counts: { "Sample pages": "0" }, otherText: "" }).has("Sample pages")).toBe(true);
    expect(materialsCountErrors({ selected: ["Sample pages"], counts: { "Sample pages": "10" }, otherText: "" }).size).toBe(0);
    expect(materialsCountErrors({ selected: ["Sample pages"], counts: {}, otherText: "" }).size).toBe(0);
  });

  it("enforces the tighter Synopsis page range (1–20)", () => {
    expect(materialsCountErrors({ selected: ["Synopsis"], counts: { "Synopsis": "21" }, otherText: "" }).has("Synopsis")).toBe(true);
    expect(materialsCountErrors({ selected: ["Synopsis"], counts: { "Synopsis": "2" }, otherText: "" }).size).toBe(0);
  });

  it("ignores counts for unselected pills", () => {
    expect(materialsCountErrors({ selected: [], counts: { "Sample pages": "99999" }, otherText: "" }).size).toBe(0);
  });
});
