/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CREATE-MODE SAMPLE BOUNDS — the fork, and the one rule that makes it safe.
 */
import { describe, it, expect } from "vitest";
import { CREATE_QTY, canStep, effectiveMax, formatQty, parseQty, stepLabel, stepQty } from "./createQty";
import { MAT_QTY } from "./agentMaterials";
import { readFileSync } from "fs";

const pane = readFileSync(new URL("../components/queries/QueryCreatePane.tsx", import.meta.url), "utf8");

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE FORK IS THE POINT. `MAT_QTY` is storage-level validation shared with the agent editor:
   it governs what an agent may legitimately STATE. Tightening it to suit a create-mode stepper
   would silently narrow what a writer may record about somebody else's guidelines.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("CREATE_QTY is forked, and MAT_QTY is untouched", () => {
  it("the storage bounds keep their own, wider numbers", () => {
    expect(MAT_QTY["Sample pages"].max, "the agent editor's ceiling moved").toBe(9999);
    expect(MAT_QTY["Sample words"].max).toBe(999999);
    expect(MAT_QTY["Sample chapters"].max).toBe(999);
  });

  it("and the create bounds are the narrower, likelier range", () => {
    expect(CREATE_QTY.Pages).toEqual({ step: 5, min: 5, max: 400 });
    expect(CREATE_QTY.Words).toEqual({ step: 500, min: 500, max: 120_000 });
    expect(CREATE_QTY.Chapters).toEqual({ step: 1, min: 1, max: 40 });
  });

  it("the arrows say what they will do", () => {
    expect(stepLabel("Pages")).toBe("± 5");
    expect(stepLabel("Words")).toBe("± 500");
    expect(stepLabel("Chapters")).toBe("± 1");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ CREATE BOUNDS NEVER CLIP A STATED REQUIREMENT. If an agent asks for 500 pages and this
   clamped at 400, pre-ticking her row would write 400 — quietly altering what she asked for, in
   the one record that is supposed to say what you sent her.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the bound yields to the agent's own figure", () => {
  it("an agent asking for more than the bound keeps her figure", () => {
    expect(effectiveMax("Pages", 500)).toBe(500);
    expect(effectiveMax("Words", 200_000)).toBe(200_000);
  });

  it("and the bound governs everywhere she has not spoken", () => {
    expect(effectiveMax("Pages")).toBe(400);
    expect(effectiveMax("Pages", null)).toBe(400);
    expect(effectiveMax("Pages", 50), "a lower stated figure is not a ceiling").toBe(400);
  });

  it("stepping up towards a stated 500 pages is not clamped at 400", () => {
    expect(stepQty("495", "Pages", 1, 500)).toBe(500);
    expect(stepQty("495", "Pages", 1), "and without her figure, 400 holds").toBe(400);
  });

  it("the pane passes her figure to the stepper rather than the bare bound", () => {
    expect(pane).toContain("stepQty(sample.amount, sample.unit, 1, statedSample)");
    expect(pane).toContain("canStep(sample.amount, sample.unit, -1, statedSample)");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ FROM AN OFF-STEP VALUE THE ARROWS MOVE TO THE NEXT CLEAN MULTIPLE. 37 pages going up is 40,
   never 42 — a stepper whose ladder depends on where you happened to start has no ladder, and
   after two presses the writer cannot predict the third.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the ladder is the ladder, wherever you join it", () => {
  it("37 → 40 up, 37 → 35 down", () => {
    expect(stepQty("37", "Pages", 1)).toBe(40);
    expect(stepQty("37", "Pages", -1)).toBe(35);
  });

  it("an on-step value moves by exactly one step", () => {
    expect(stepQty("40", "Pages", 1)).toBe(45);
    expect(stepQty("40", "Pages", -1)).toBe(35);
    expect(stepQty("5000", "Words", 1)).toBe(5500);
    expect(stepQty("3", "Chapters", -1)).toBe(2);
  });

  /* A control that does nothing and looks the same as one that worked teaches the writer to press
     harder. `canStep` disables the button; the clamp is the backstop behind it. */
  it("and it refuses at the bounds rather than pretending", () => {
    expect(canStep("400", "Pages", 1)).toBe(false);
    expect(canStep("400", "Pages", 1, 500), "her figure re-opens the ceiling").toBe(true);
    expect(canStep("5", "Pages", -1)).toBe(false);
    expect(canStep("5", "Pages", 1)).toBe(true);
    expect(stepQty("400", "Pages", 1)).toBe(400);
  });

  it("an empty field steps from the minimum, not from zero", () => {
    expect(stepQty("", "Pages", 1)).toBe(10);
    expect(stepQty("", "Words", 1)).toBe(1000);
  });
});

/* ⚠️ TYPING ALWAYS OVERRIDES — the ladder is what the ARROWS offer. A writer who types 37 sent
   37, and a stepper that "corrected" it would overwrite a fact with a convenience. */
describe("typed values survive, and read as numbers when not being typed", () => {
  it("nothing snaps a typed figure", () => {
    expect(parseQty("37")).toBe(37);
    expect(parseQty("12,500"), "separators are display, not data").toBe(12_500);
    expect(parseQty("")).toBe(0);
    expect(parseQty("abc")).toBe(0);
  });

  it("formatting is reapplied only when the field is not being typed into", () => {
    expect(formatQty(12_500)).toBe("12,500");
    expect(formatQty("12500")).toBe("12,500");
    expect(formatQty(0), "an empty field stays empty, never '0'").toBe("");
    expect(pane, "raw while focused, formatted otherwise")
      .toContain("value={qtyFocused ? sample.amount : formatQty(sample.amount)}");
    expect(pane).toContain("onChange={(e) => setRow(\"sample\", { amount: String(parseQty(e.target.value)) })}");
  });

  /* The keyboard is not a second-class way to use this control. */
  it("↑ and ↓ do what the arrows do", () => {
    expect(pane).toContain('if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;');
    expect(pane).toContain('const dir = e.key === "ArrowUp" ? 1 : -1;');
  });
});

/* ⚠️ THE APP REPORTS, IT NEVER APPRAISES. The sub-label states what the agent asked for and
   stops: sending something different is the writer's business, and this record says what you
   sent, not whether the app approves. */
describe("the row reports the requirement and passes no comment on it", () => {
  it("a sub-label and a Requested tag, from the seeded rows", () => {
    expect(pane).toContain("asks for");
    expect(pane).toContain('className="qc-matsub"');
    expect(pane).toContain('{requested(row.key) ? "Requested" : "Not requested"}');
  });

  /* Asking the agent again here would give two answers to one question the moment either changed;
     `materialRowsForDraft` already turned their record into rows. */
  it("read from the seeded rows, never a second parse of the agent record", () => {
    expect(pane).toContain("const asked = useMemo(() => materialRowsForDraft(agent), [agent]);");
  });

  it("and it never appraises what the writer actually sent", () => {
    const code = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    for (const word of ["less than requested", "more than requested", "doesn't match", "warning"]) {
      expect(code, `"${word}" is an opinion about the writer's own submission`).not.toContain(word);
    }
  });
});
