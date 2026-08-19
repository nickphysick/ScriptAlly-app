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
import { materialToken, sampleMaterialText } from "./materials";
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

/* ⚠️ P1 SUPERSEDED BY STAGE 1 (create mode v3). It settled a real argument twice over: the
   question must not wear the mono LABEL style (a question is not an eyebrow), and it must not be
   duplicated by an "Agent" field label above a box that already says "Search by name or
   agency…". Both were fixes to a COMPACT hero that put a title, a subtitle and the picker on one
   line beside each other.

   Stage 1 removes the argument's subject: the pane now asks ONE question, centred, as its whole
   content — Playfair, no eyebrow, no field label, nothing beside it. The two rules survive in
   createStageOne.test.ts as the order of the centred stack and the absence of a second label. */
describe("P1 · the question is the page, not a label on it", () => {
  it("it is a Playfair heading and there is nothing else competing with it", () => {
    expect(pane, "the question is back as a mono eyebrow").not.toContain("<div style={LABEL}>Who are you querying?</div>");
    expect(pane, "the duplicate field label came back").not.toContain("<div style={LABEL}>Agent</div>");
    expect(pane).toContain('<h2 className="qc-askq">Who are you querying?</h2>');
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
    /* ⚠️ AMENDED: the raw string is normalised to digits on the way in and formatted with
       separators on the way out, so 12,500 READS as a number while the field is not being typed
       into. The rule this suite protects is unchanged, and the second assertion is what pins it:
       nothing snaps a TYPED value — the ladder is what the arrows offer. */
    expect(pane).toContain("onChange={(e) => setRow(\"sample\", { amount: String(parseQty(e.target.value)) })}");
    expect(pane, "a typed figure must never be snapped to the ladder")
      .not.toMatch(/onChange=[^\n]*snapToUnit/);
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

/* ⚠️ P3 RETIRED WITH THE DRAFT ROW (create mode v3) — four assertions, and two of the lessons
   in them outlive the row and are worth carrying:

   · EVERY SELECTOR DECLARED EXACTLY ONCE. This suite was written after `.f12-drafttag` was
     declared twice, four lines apart, the second silently winning — so a "fix" landed that did
     nothing. Assert a rule appears once, not merely that it appears. Still true of every rule
     in f12.css.
   · A BORDER IS ABSORBED BY THE PADDING, not added to the box, when a bordered variant must
     match an unbordered neighbour's height. The draft row needed it against `.f12-row`; the
     next bordered-variant-of-a-plain-thing will need it too.

   The two that died with the row — the row's exact height, and the chip sitting where a normal
   row shows its StatusDot — described a thing that no longer renders. */

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
      const l = materialToken(it).toLowerCase();
      return !l.includes("query") && !l.includes("synopsis");
    };
    // the read is fine — order saves it
    expect((out.find(isSampleMat) as QueryMaterial).type).toBe("chapters");
    // ...but the predicate matches the Other item too, which is the bug
    expect(out.filter(isSampleMat)).toHaveLength(2);
  });
});
