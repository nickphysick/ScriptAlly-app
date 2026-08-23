/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ "Sent previously" IS THE QUERY'S OWN RECORD, WHOLE (chase round, Phase 3).
 *
 * A card on dev read `Sent previously: Synopsis` — a query with a synopsis and no covering letter
 * or sample. Possible, and unusual enough to verify rather than assume: the question was whether
 * the tile was showing the record or a piece of it.
 *
 * IT IS THE RECORD. `formatQueryMaterials` maps EVERY item through the one formatter and joins
 * them; there is no cap, no first-item selection and no local join at the call site. Measured on
 * dev against a seeded query storing two materials: the tile read "Covering letter · Synopsis",
 * both present, "Query letter" rendered through the formatter's own vocabulary. So a card reading
 * "Synopsis" alone is a query whose recorded materials are exactly that — nothing changed here.
 *
 * These assertions exist because "the data is right" is a claim that decays: the tile could grow a
 * truncation next month and the same sentence would still be in the report.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatQueryMaterials } from "./materials";
import { sliceBetween } from "../test/sliceBetween";

describe("⚠️ the tile shows the whole recorded list", () => {
  it("every item survives, however many there are", () => {
    const four = ["Query letter", "Synopsis", "First 3 chapters", "Author bio"];
    const out = formatQueryMaterials(four) ?? "";
    /* the count is the claim — a truncation would keep the early ones and read plausibly */
    expect(out.split(" · ")).toHaveLength(4);
    for (const item of ["Synopsis", "Author bio"]) {
      expect(out, `${item} was dropped from the tile`).toContain(item);
    }
  });

  it("one item is one item, and none is null rather than an empty string", () => {
    expect(formatQueryMaterials(["Synopsis"])).toBe("Synopsis");
    /* ⚠️ `null`, NOT "" — the tile renders "None sent" for absence, and an empty string would put a
       blank value under a label, which states nothing while looking like an answer. */
    expect(formatQueryMaterials([])).toBeNull();
    expect(formatQueryMaterials(undefined)).toBeNull();
  });

  /**
   * ⚠️ AND THE CALL SITE HANDS OVER THE FIELD, UNTOUCHED. A `.slice(0, 2)` or a local `.join` there
   * is how a tile comes to state a subset under a label that promises the record — and it would be
   * invisible to the unit assertions above, which never see the call site.
   */
  it("the pane reads the query's own field through the one formatter, and joins nothing itself", () => {
    /* ⚠️ THE LAW IS UNCHANGED: the call site hands the field over untouched. Only its home moved —
       the pane's journey argument left `ToDoPage` for `useTaskPaneSession` (Pack B Phase 2) so the
       calendar can mount the same pane. The block is read whole, exactly as before. */
    const src = readFileSync(join(__dirname, "../components/todo/useTaskPaneSession.tsx"), "utf8");
    const block = sliceBetween(src, "sentPreviously: (() => {", "})(),", "the sentPreviously block");
    expect(block).toContain("formatQueryMaterials(q?.materialsWanted)");
    for (const local of [".slice(", ".join(", ".map(", "[0]"]) {
      expect(block, `the tile does its own ${local} — it is showing a subset`).not.toContain(local);
    }
  });
});
