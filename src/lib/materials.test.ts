import { describe, it, expect } from "vitest";
import { sampleMaterialText, formatQueryMaterial, statedQuantity } from "./materials";

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

/* ── Item 5 · no zero quantities ─────────────────────────────────────────────────────────────── */

describe("statedQuantity — a placeholder never renders as a fact", () => {
  /**
   * ⚠️ THE STRING `"0"` IS THE WHOLE BUG, and it is why truthiness was the wrong test.
   * `recordResponse` writes the quantity as `String(data.materialsQuantity ?? "").trim()`, so what
   * reaches every consumer is a STRING — the number 0 was correctly filtered and `"0"` sailed
   * through, producing `Partial manuscript requested — 0 pages`.
   */
  it("zero is not a quantity, in either the shape the system writes or the one it reads back", () => {
    expect(statedQuantity("0")).toBe(false);   // the shape recordResponse actually stores
    expect(statedQuantity(0)).toBe(false);
    expect(statedQuantity(" 0 ")).toBe(false);
    expect(statedQuantity("00")).toBe(false);
  });

  it("absence is not a quantity", () => {
    for (const v of [undefined, null, "", "   "]) expect(statedQuantity(v), String(v)).toBe(false);
  });

  it("a real count is", () => {
    expect(statedQuantity(50)).toBe(true);
    expect(statedQuantity("50")).toBe(true);
    expect(statedQuantity("3")).toBe(true);
  });

  it("⚠️ FREE TEXT IS A STATED QUANTITY, whatever it says — an `other` item carries the writer's own words", () => {
    /* `Number("the first three chapters")` is NaN, which must not be read as "nothing stated". Only
       a value that parses as a number is judged as one. */
    expect(statedQuantity("the first three chapters")).toBe(true);
    expect(statedQuantity("as much as you like")).toBe(true);
  });

  it("the two display formatters drop the clause rather than printing a zero", () => {
    /* ⚠️ ASSERTED THROUGH THE FORMATTERS, not just the predicate — the predicate being right is
       worth nothing if a consumer still asks the question its own way, which is exactly how three
       copies of this test came to disagree. */
    /* ⚠️ THE ASSERTION IS THAT ZERO IS NOT STATED AS A COUNT — not that the string holds no "0".
       `formatQueryMaterial` drops the quantity correctly and then renders the bare label through
       `formatLegacyMaterial`, which substitutes its own default and returns "First 50 pages". That
       is a worse fault than the one being fixed and it is NOT fixed here: the default is legacy
       display shared by every screen in the app (query detail, timeline, CSV export, the editor),
       so changing it is a sweep of its own. Recorded in reports/found.md rather than done at the
       tail of another item. */
    /* ⚠️ TOKENS, NOT A SUBSTRING — and this bit on the way in. `not.toContain("0 pages")` FAILED
       against "First 50 pages", because the "0" of "50" satisfies it. A count is a whole word, so
       the test compares whole words and cannot be defeated by a digit inside another number. */
    const words = formatQueryMaterial({ material: "Sample Pages", type: "pages", quantity: "0" }).split(/\s+/);
    expect(words).not.toContain("0");
    expect(sampleMaterialText({ material: "Sample Pages", type: "pages", quantity: "0" }))
      .toBe("Included");
    /* and a real count still renders */
    expect(sampleMaterialText({ material: "Sample Pages", type: "pages", quantity: "50" }))
      .toBe("50 pages");
  });
});
