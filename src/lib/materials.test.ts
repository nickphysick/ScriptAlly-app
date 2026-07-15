import { describe, it, expect } from "vitest";
import { sampleMaterialText } from "./materials";

describe("sampleMaterialText — bare sample-materials readback (What you sent, Phase 6)", () => {
  it("structured pages/chapters/words → 'N unit' (words comma-grouped, no 'First' prefix)", () => {
    expect(sampleMaterialText({ material: "Sample Pages", type: "pages", quantity: 50 })).toBe("50 pages");
    expect(sampleMaterialText({ material: "Sample Pages", type: "chapters", quantity: 3 })).toBe("3 chapters");
    expect(sampleMaterialText({ material: "Sample Pages", type: "words", quantity: 10000 })).toBe("10,000 words");
  });

  it("a string quantity is parsed for grouping too", () => {
    expect(sampleMaterialText({ material: "Sample Pages", type: "words", quantity: "10000" })).toBe("10,000 words");
  });

  it("'other' renders its free text verbatim", () => {
    expect(sampleMaterialText({ material: "Sample Pages", type: "other", quantity: "first act" })).toBe("first act");
  });

  it("back-compat: an item with no type/quantity reads 'Included' (unit/quantity unspecified)", () => {
    expect(sampleMaterialText({ material: "Sample Pages" })).toBe("Included");
    expect(sampleMaterialText({ material: "Sample Pages", type: "pages" })).toBe("Included"); // unit, no qty
  });

  it("a legacy string keeps its existing display — historic data is never lost", () => {
    expect(sampleMaterialText("First 50 pages")).toBe("First 50 pages");
  });
});
