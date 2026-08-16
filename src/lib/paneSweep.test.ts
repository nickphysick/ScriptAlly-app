/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE GROUP SWEEP — the pure model (ref design-refs/todo-group-sweep.html).
 *
 * ⚠️ THE ROUND TRIP IS THE ONE THAT MATTERS. A chip writes strings into `materialsWanted`, and the
 * app reads that field back through `parseAgentMaterials`. If the two disagree the sweep looks
 * like it worked and the agent's record says something else — so every chip is asserted THROUGH the
 * parser rather than against the literal it was written with.
 */
import { describe, it, expect } from "vitest";
import {
  SWEEP_ANSWERS, SWEEP_LEAD, SWEEP_PRELINE, SWEEP_SHORTFALL, SweepRule, SweepRow,
  canCommitSweep, emptySweepRow, isSweepRule, skipTheRest, sweepActLabel, sweepAnswered,
  sweepFields, sweepHint, sweepOutcome,
} from "./paneSweep";
import { parseAgentMaterials } from "./agentMaterials";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { HK_RULES } from "./todoHousekeeping";

const RULES: SweepRule[] = ["dq_materials", "dq_mswl", "dq_responseTime"];

describe("⚠️ THE ANSWERS ARE DECLARED PER RULE, and every rule the board can group has a set", () => {
  it("the census is exactly the data-quality rules — no rule can be grouped without answers", () => {
    /* ⚠️ DERIVED FROM `HK_RULES`, NOT TYPED. The board groups whatever `HK_RULES` says is
       groupable; a hand-written list here would go green the day a fourth rule was added and the
       sweep opened on it with no way to answer. */
    const groupable = Object.values(HK_RULES).filter((r) => r.taskType === "data_quality_poor").map((r) => r.rule);
    expect(groupable.sort()).toEqual([...RULES].sort());
    for (const r of groupable) {
      expect(isSweepRule(r), `${r} can be grouped but has no declared answers`).toBe(true);
      expect(SWEEP_LEAD[r as SweepRule].length, r).toBeGreaterThan(40);
      expect(SWEEP_PRELINE[r as SweepRule].length, r).toBeGreaterThan(10);
      expect(SWEEP_SHORTFALL[r as SweepRule].length, r).toBeGreaterThan(4);
    }
  });

  it("⚠️ A WISH LIST TAKES TEXT, NOT CHIPS — a difference in kind, not a gap in the table", () => {
    /* There is no common answer to "what are they looking for"; canned options would invite a
       writer to file an invention. */
    expect(SWEEP_ANSWERS.dq_mswl.mode).toBe("text");
    expect(SWEEP_ANSWERS.dq_materials.mode).toBe("chips");
    expect(SWEEP_ANSWERS.dq_responseTime.mode).toBe("weeks");
  });

  it("⚠️ THE LEAD SAYS WHAT THE GAP COSTS, and never merely that there is one", () => {
    for (const r of RULES) {
      expect(SWEEP_LEAD[r], r).toMatch(/can’t|can't|nothing here can/i);
    }
  });
});

describe("⚠️ EVERY MATERIALS CHIP ROUND-TRIPS THROUGH THE PARSER THE APP READS WITH", () => {
  const spec = SWEEP_ANSWERS.dq_materials;

  it("what the chip writes is what the record reads back", () => {
    if (spec.mode !== "chips") throw new Error("materials is no longer a chip rule");
    for (const opt of spec.options) {
      const parsed = parseAgentMaterials(opt.stored);
      /* nothing fell through to free-text Other, which is what a label written as a value does */
      expect(parsed.otherText, `"${opt.label}" was filed as Other`).toBe("");
      expect(parsed.selected.length, `"${opt.label}" parsed to nothing`).toBeGreaterThan(0);
      expect(parsed.selected, `"${opt.label}" lost its query letter`).toContain("Query letter");
    }
  });

  it("the quantified samples keep their numbers", () => {
    if (spec.mode !== "chips") throw new Error("materials is no longer a chip rule");
    const chapters = parseAgentMaterials(spec.options[0].stored);
    expect(chapters.selected).toContain("Sample chapters");
    expect(chapters.counts["Sample chapters"]).toBe("3");
    const pages = parseAgentMaterials(spec.options[1].stored);
    expect(pages.selected).toContain("Sample pages");
    expect(pages.counts["Sample pages"]).toBe("50");
  });

  it("⚠️ NEITHER EXCLUDED MATERIAL IS OFFERED — a Materials commit would strip it anyway", () => {
    if (spec.mode !== "chips") throw new Error("materials is no longer a chip rule");
    for (const opt of spec.options) {
      expect(opt.stored.join(" "), opt.label).not.toMatch(/full manuscript|author bio/i);
    }
  });

  it("⚠️ AND THE WRITE ACTUALLY CLOSES THE GAP THAT RAISED THE CARD", () => {
    /* the reconciliation that matters: apply the fields, then ask the derivation that raised the
       card whether it is still raised. Asserting the fields alone would pass on a write that
       looked right and satisfied nothing. */
    if (spec.mode !== "chips") throw new Error("materials is no longer a chip rule");
    const before = agentDataQualityNeeds({ responseTimeWeeks: 6, mswlNotes: "x" });
    expect(before).toContain("materials");
    const fields = sweepFields("dq_materials", { pick: 0, text: "", skipped: false })!;
    const after = agentDataQualityNeeds({ responseTimeWeeks: 6, mswlNotes: "x", ...fields });
    expect(after).not.toContain("materials");
  });

  it("the other two rules close their own gaps too", () => {
    const weeks = sweepFields("dq_responseTime", { pick: 1, text: "", skipped: false })!;
    expect(agentDataQualityNeeds({ materialsWanted: ["Query letter"], mswlNotes: "x", ...weeks }))
      .not.toContain("responseTime");
    const wish = sweepFields("dq_mswl", { pick: null, text: "Upmarket crime", skipped: false })!;
    expect(agentDataQualityNeeds({ materialsWanted: ["Query letter"], responseTimeWeeks: 6, ...wish }))
      .not.toContain("mswl");
  });
});

describe("⚠️ NOTHING IS PRE-SELECTED, AND AN UNANSWERED ROW WRITES NOTHING", () => {
  it("a fresh row is empty and yields no fields at all", () => {
    const row = emptySweepRow();
    expect(row.pick).toBeNull();
    expect(row.text).toBe("");
    expect(row.skipped).toBe(false);
    for (const r of RULES) expect(sweepFields(r, row), r).toBeNull();
  });

  it("⚠️ AND NOT AN EMPTY VALUE — which would restate the gap as a fact", () => {
    /* `agentDataQualityNeeds` reads `0` and an empty list as THE GAP. A write of either would leave
       the card up over a record that now claims to have been answered. */
    for (const r of RULES) {
      const f = sweepFields(r, emptySweepRow());
      expect(f, r).toBeNull();
    }
    const blankText = sweepFields("dq_mswl", { pick: null, text: "   ", skipped: false });
    expect(blankText, "whitespace was written as a wish list").toBeNull();
  });

  it("⚠️ A SKIPPED ROW WRITES NOTHING EVEN WHEN IT HOLDS AN ANSWER — skipping is not answering", () => {
    const answered: SweepRow = { pick: 0, text: "", skipped: false };
    expect(sweepFields("dq_materials", answered)).not.toBeNull();
    expect(sweepFields("dq_materials", { ...answered, skipped: true })).toBeNull();
  });
});

describe("⚠️ THE FOOTER STATES THE REAL OUTCOME, including the part that did not happen", () => {
  it("a partial sweep names both numbers", () => {
    expect(sweepOutcome(3, 16, "dq_materials")).toBe("Recorded 3 · 13 still without a materials list");
  });

  it("nothing recorded is a stated outcome, not a blank", () => {
    expect(sweepOutcome(0, 16, "dq_mswl")).toBe("Nothing recorded · 16 still without a wish list");
  });

  it("a complete sweep says so without claiming a number that is now zero", () => {
    expect(sweepOutcome(16, 16, "dq_responseTime")).toBe("Recorded 16 · none left without a reply window");
    expect(sweepOutcome(16, 16, "dq_responseTime")).not.toContain("0 still");
  });

  it("⚠️ IT NEVER APPRAISES — a partial pass is a legitimate result, not a failure", () => {
    for (const [a, t] of [[0, 16], [3, 16], [16, 16]] as const) {
      for (const r of RULES) {
        expect(sweepOutcome(a, t, r), `${a}/${t} ${r}`).not.toMatch(/only|just|still need|should|good|well done|failed/i);
      }
    }
  });

  it("the hint and the act label agree with the count, and the primary names it", () => {
    expect(sweepHint(0)).toBe("Nothing recorded yet.");
    expect(sweepHint(3)).toBe("3 answered · the rest stay on your list");
    expect(sweepActLabel(0)).toBe("Record");
    expect(sweepActLabel(1)).toBe("Record 1 answer");
    expect(sweepActLabel(4)).toBe("Record 4 answers");
  });

  it("the commit is closed at zero — the only way to an answer is to press one", () => {
    expect(canCommitSweep(0)).toBe(false);
    expect(canCommitSweep(1)).toBe(true);
  });
});

describe("⚠️ `Skip the rest` LEAVES ANSWERS ALONE and never becomes an apply-to-all", () => {
  it("it skips only what is unanswered", () => {
    const rows: SweepRow[] = [
      { pick: 1, text: "", skipped: false },   // answered
      emptySweepRow(),                          // untouched
      { pick: null, text: "", skipped: true },  // already skipped
    ];
    const after = skipTheRest(rows, "dq_materials");
    expect(after[0]).toEqual(rows[0]);
    expect(after[1].skipped).toBe(true);
    expect(after[2].skipped).toBe(true);
    /* the count is unchanged — skipping cannot manufacture an answer */
    expect(sweepAnswered(after, "dq_materials")).toBe(1);
  });

  it("⚠️ THERE IS NO APPLY-TO-ALL, and the model gives no way to build one", () => {
    /* Sixteen wrong records written by one press is worse than the gap those sixteen have today.
       `skipTheRest` is the only bulk operation and it writes nothing at all. */
    const rows = [emptySweepRow(), emptySweepRow(), emptySweepRow()];
    const after = skipTheRest(rows, "dq_materials");
    expect(after.every((r) => sweepFields("dq_materials", r) === null)).toBe(true);
    expect(sweepAnswered(after, "dq_materials")).toBe(0);
  });
});
