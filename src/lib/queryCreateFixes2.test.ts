/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub · create-mode CORRECTIONS ROUND 2
 * (refs design-refs/qdb-create-fixes2.html · design-refs/qdb-draft-row.html).
 *
 * Three fixes, each of which failed in a way the previous round's locks could not see:
 *   P1 the pane names its job in Playfair, and "Sent by" is an inset track (the ringed segment
 *      overflowed its own frame);
 *   P2 the sample quantity is one bordered stepper + the app's menu — never a native <select>;
 *   P3 the draft row is the SAME BOX as every other row.
 *
 * A note on method, because it is the reason P3 was still broken after being "fixed": a
 * string-presence assertion cannot see the cascade. `.f12-drafttag { position: static; ... }` was
 * in the file AND overridden four lines later by a second rule of equal specificity. So the lock
 * below asserts the rule appears exactly ONCE rather than merely appearing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { SAMPLE_UNITS, UNIT_CFG, snapToUnit, stepAmount } from "./agentMaterials";
import { draftMaterialsToQuery } from "./queryDraft";
import { materialLabel, sampleMaterialText } from "./materials";
import type { QueryMaterial } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pane = read("../components/queries/QueryCreatePane.tsx");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");

/**
 * The pane with comments removed. Assertions about what the CODE does must not be able to match
 * prose ABOUT the code — the comment explaining why the native <select> went would otherwise fail
 * the test asserting it went.
 */
const paneCode = pane.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** One CSS rule body, anchored at a line start so a compound selector can't match instead. */
const block = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  if (at < 0) return "";
  return css.slice(at, css.indexOf("}", at) + 1);
};

/** How many rules in the sheet open with exactly this selector. */
const ruleCount = (selector: string): number =>
  css.split("\n" + selector + " {").length - 1;

describe("P1 · the pane names its job", () => {
  /* AMENDED (polish round): the question is no longer forbidden — format B brings it back as an
     italic SUBTITLE. What must never come back is the question standing in for a heading, i.e.
     wearing the mono LABEL style. Asserting the phrase's absence was too blunt a lock. */
  it("a Playfair heading replaces the mono question", () => {
    expect(pane, "the question is back as a mono eyebrow").not.toContain("<div style={LABEL}>Who are you querying?</div>");
    expect(pane).toContain('<h2 className="qc-head">New query</h2>');
    const head = block(".qc-head");
    expect(head, "the .qc-head rule is missing").not.toBe("");
    expect(head, "the heading must be the serif, not the body face").toContain("var(--f12-serif)");
  });

  /* AMENDED (polish round, ref qdb-create-polish §2 format B): the standalone "Agent" label is
     gone — the question came back as an italic subtitle, and the search placeholder labels the
     field. A label saying "Agent" above a box saying "Search by name or agency…" was one of the
     two saying the same thing. */
  it("the question returns as a subtitle, not as a duplicate field label", () => {
    expect(pane).toContain('<p className="qc-sub">Who are you querying?</p>');
    expect(pane, "the duplicate label came back").not.toContain("<div style={LABEL}>Agent</div>");
    expect(pane, "the picker itself must not be rebuilt").toContain("AgentSearchField");
    expect(pane).toContain("onCreateAgent");
  });
});

describe("P2 · the sample quantity is ONE control over the SHARED physics", () => {
  it("no native <select> survives anywhere on the pane", () => {
    expect(paneCode, "a native select renders the macOS system popup — off-brand everywhere").not.toContain("<select");
    expect(pane, "the unit uses the app's own menu").toContain("ariaLabel=\"Sample unit\"");
    expect(pane).toContain("useFixedMenu");
  });

  it("the physics is IMPORTED, never re-implemented", () => {
    expect(pane).toContain('from "../../lib/agentMaterials"');
    expect(pane).toContain("stepAmount");
    expect(pane).toContain("snapToUnit");
    // The numbers themselves appear in exactly one place. A literal step/default here would be a
    // second implementation that could silently drift from the agent form's.
    for (const n of ["500", "5000", "step:", "def:"]) {
      expect(paneCode, `the unit physics leaked into the pane (${n})`).not.toContain(n);
    }
  });

  it("the value is typeable, because 5,000 words is not a number you step to", () => {
    const qty = block(".qc-stp input");
    expect(qty, "the .qc-stp input rule is missing — is the value a read-out again?").not.toBe("");
    expect(pane).toContain("inputMode=\"numeric\"");
    expect(pane).toContain("onChange={(e) => setRow(\"sample\", { amount: e.target.value })}");
  });

  it("the stepper is one bordered 32px control, not three loose buttons", () => {
    const stp = block(".qc-stp");
    expect(stp, "the .qc-stp rule is missing").not.toBe("");
    expect(stp).toContain("height: 32px");
    expect(stp).toContain("border: 1px solid var(--line)");
    expect(block(".qc-unit"), "the unit trigger must match the stepper's height").toContain("height: 32px");
    expect(css, "the bare +/− button rule should be gone").not.toContain(".qc-step {");
  });

  it("changing unit SNAPS to that unit's sensible default — 3 chapters is not 3 words", () => {
    expect(snapToUnit("Words")).toBe("5000");
    expect(snapToUnit("Chapters")).toBe("3");
    expect(snapToUnit("Pages")).toBe("10");
    // and the step is unit-aware, so stepping words moves in 500s
    expect(stepAmount("5000", "Words", 1)).toBe("5500");
    expect(stepAmount("3", "Chapters", 1)).toBe("4");
    expect(stepAmount("10", "Pages", 1)).toBe("15");
    // the floor holds
    expect(stepAmount("500", "Words", -1)).toBe(String(UNIT_CFG.Words.min));
  });
});

describe("P3 · the draft row is the same box as every other row", () => {
  /** The row height both must share. Read from the sheet so the test can't drift from it. */
  const rowHeight = (block(".f12-row").match(/height: (\d+)px/) ?? [])[1];

  it("the list row still declares a fixed height (the number both rows are pinned to)", () => {
    expect(rowHeight, "the .f12-row height is gone — the whole comparison rests on it").toBeTruthy();
    expect(rowHeight).toBe("56");
  });

  it("the open draft row is EXACTLY that height — no growth to fit a tag", () => {
    const open = block(".f12-row.f12-draft.f12-draft-in");
    expect(open, "the open-state rule is missing or not compound").not.toBe("");
    expect(open).toContain(`height: ${rowHeight}px`);
    // the breathing room is BELOW the row, not inside it
    expect(open, "the gap must be margin-bottom only — top margin would offset the row").toContain("margin: 0 0 8px");
  });

  it("the 1.5px border is absorbed by the padding, not added to the box", () => {
    const base = block(".f12-row.f12-draft");
    expect(base, "the draft base rule is missing").not.toBe("");
    const rowPad = (block(".f12-row").match(/padding: 0 (\d+)px/) ?? [])[1];
    expect(rowPad, "the .f12-row padding is gone").toBe("14");
    // 14 − 1.5 = 12.5, so the monogram column lines up with the rows beneath
    expect(base).toContain("padding: 0 12.5px");
    expect(base).toContain("border: 0 dashed");
  });

  it("the chip sits in the right-hand column, where a normal row shows its status dot", () => {
    const row = queries.slice(queries.indexOf("New query draft"), queries.indexOf("renderList.map"));
    expect(row, "the draft row markup moved — this slice is anchored on its aria-label").not.toBe("");
    expect(row).toContain('<span className="f12-end">');
    // chip first, date beneath — the same two slots, the same order as a real row
    expect(row).toMatch(/f12-drafttag">Draft<\/span>\s*<span className="f12-d2">Today<\/span>/);
    expect(row, "the parts must be the row's own, not a nested block").toContain('<span className="f12-mid">');
  });

  it("name and agency truncate rather than wrap — they are the row's own elements", () => {
    for (const sel of [".f12-row .f12-nm", ".f12-row .f12-ag"]) {
      expect(block(sel), `${sel} lost its ellipsis`).toContain("text-overflow: ellipsis");
    }
    expect(block(".f12-row .f12-mid"), "min-width:0 is what lets the middle actually shrink").toContain("min-width: 0");
  });

  /**
   * THE METHOD FIX. Round 1 asserted `.f12-drafttag { position: static; ...}` was present. It was
   * — and a second rule four lines later set it back to absolute. Presence is not effect; a
   * duplicated rule is decided by file order, which no string search can see. So: exactly one.
   */
  it("every draft selector is declared EXACTLY ONCE", () => {
    for (const sel of [".f12-drafttag", ".f12-row.f12-draft", ".f12-row.f12-draft.f12-draft-in"]) {
      expect(ruleCount(sel), `${sel} is declared more than once — the later one silently wins`).toBe(1);
    }
  });

  /**
   * ...and the other half of the same lesson: `.f12-row` is declared ~270 lines BELOW the draft
   * block, so a bare `.f12-draft` loses every property they share regardless of what it says.
   * Every draft rule must therefore be a compound modifier of the row.
   */
  /* Scope: TOP-LEVEL rules. The reduced-motion block still names `.f12-row.f12-draft` for
     consistency, but it wins on `!important` regardless of specificity, so ordering can't bite
     there — this regex is anchored at column 0 and deliberately doesn't reach inside @media. */
  it("no top-level draft rule is a bare .f12-draft, which the row would outrank by order", () => {
    const bare = css.match(/\n\.f12-draft[ .{]/g) ?? [];
    expect(bare, `bare .f12-draft rules found: ${bare.join(", ")}`).toHaveLength(0);
    expect(css.indexOf("\n.f12-row {"), "the ordering this guards against is still real")
      .toBeGreaterThan(css.indexOf("\n.f12-row.f12-draft {"));
  });
});

/**
 * The cheap round-trip check: create mode speaks SampleUnit ("Chapters"), the stored query speaks
 * QueryMaterial.type ("chapters"). Casing between two vocabularies is a recurring regression here,
 * so it is asserted rather than assumed.
 */
describe("unit round-trip · create mode → stored query → post-save editor", () => {
  const POST_SAVE_UNITS = ["pages", "chapters", "words"] as const; // the editor's own state type

  it("every SampleUnit lands on a type the post-save editor can read back", () => {
    for (const unit of SAMPLE_UNITS) {
      const out = draftMaterialsToQuery([
        { key: "sample", kind: "qty", name: "Opening sample", on: true, unit, amount: snapToUnit(unit) },
      ]);
      const item = out[0] as QueryMaterial;
      expect(typeof item, `${unit} degraded to a bare string`).toBe("object");
      expect(item.type, `${unit} did not lower-case cleanly`).toBe(unit.toLowerCase());
      expect(POST_SAVE_UNITS, `${unit} is not a unit the post-save editor can show`).toContain(item.type);
      expect(item.quantity, `${unit} lost its amount`).toBe(Number(snapToUnit(unit)));
    }
  });

  it("3 chapters survives the trip intact, amount and unit", () => {
    const [item] = draftMaterialsToQuery([
      { key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "3" },
    ]) as QueryMaterial[];
    expect(item).toEqual({ material: "Sample Pages", type: "chapters", quantity: 3 });
    expect(sampleMaterialText(item)).toBe("3 chapters");
  });

  /**
   * ⚠️ FLAGGED, NOT FIXED (out of scope — the post-save editor is its own task).
   * That editor finds the sample with "anything that isn't the query letter or the synopsis"
   * (`isSampleMat` in Queries.tsx). An "Other" material answers to that description too. The READ
   * is safe — draftMaterialsToQuery emits sample before other, so `.find` still lands on the
   * sample — but the editor's save/remove FILTER drops every matching item, so editing the sample
   * would take the Other line with it. This test documents the trap so the fix has a starting point.
   */
  it("documents the isSampleMat breadth trap in the post-save editor", () => {
    const out = draftMaterialsToQuery([
      { key: "queryLetter", kind: "binary", name: "Query letter", on: true },
      { key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "3" },
      { key: "other", kind: "text", name: "Other", on: true, text: "Author bio" },
    ]);
    const isSampleMat = (it: string | QueryMaterial) => {
      const l = materialLabel(it).toLowerCase();
      return !l.includes("query") && !l.includes("synopsis");
    };
    // the read is fine — order saves it
    expect((out.find(isSampleMat) as QueryMaterial).type).toBe("chapters");
    // ...but the predicate matches the Other item too, which is the bug
    expect(out.filter(isSampleMat)).toHaveLength(2);
  });
});
