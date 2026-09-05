/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CREATE-MODE SAMPLE BOUNDS — the fork, and the one rule that makes it safe.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import { CREATE_QTY, askPhrase, asksSentence, canStep, effectiveMax, formatQty, parseQty, serialJoin, stepLabel, stepQty } from "./createQty";
import { MAT_QTY, snapToUnit } from "./agentMaterials";
import { materialRowsForDraft } from "./queryDraft";
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
    /* Pages' floor is 1 since the log-sheet run (brief + ref agree): "first page" is a real
       sample, and a floor of one whole step made the smallest honest answer illegal. */
    expect(CREATE_QTY.Pages).toEqual({ step: 5, min: 1, max: 400 });
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
    expect(canStep("400", "Pages", 1, 500), "their figure re-opens the ceiling").toBe(true);
    /* floor 1 now — 5 steps down to the floor; only the floor itself refuses */
    expect(canStep("5", "Pages", -1)).toBe(true);
    expect(stepQty("5", "Pages", -1)).toBe(1);
    expect(canStep("1", "Pages", -1)).toBe(false);
    expect(canStep("5", "Pages", 1)).toBe(true);
    expect(stepQty("400", "Pages", 1)).toBe(400);
  });

  it("an empty field steps from the minimum, not from zero", () => {
    /* from empty, one press lands on the first clean multiple above the floor */
    expect(stepQty("", "Pages", 1)).toBe(5);
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
  /* ⚠️ ONE SENTENCE REPLACED FIVE TAGS. "NOT REQUESTED" repeated on every material row and "ONLY
     MANUSCRIPT" said the same thing a fifth time on the manuscript row — five tags restating one
     fact about the agent, in a step that was 800px tall partly to hold them. */
  it("the requirement is stated once, in the head, and nowhere else", () => {
    expect(pane).toContain('<span className="qc-asks">{asksLine}</span>');
    expect(pane, "the per-row sub-label came back").not.toContain('className="qc-matsub"');
    expect(pane, "the per-row tag came back").not.toContain('"Requested" : "Not requested"');
    expect(pane, "and the manuscript row's tag went with them").not.toContain("Only manuscript");
  });

  it("the sentence is right for one, two, three and no requirements", () => {
    expect(asksSentence("Eleanor", ["a query letter"])).toBe("Eleanor asks for a query letter");
    expect(asksSentence("Eleanor", ["a query letter", "a synopsis"]))
      .toBe("Eleanor asks for a query letter and a synopsis");
    expect(asksSentence("Eleanor", ["a query letter", "a synopsis", "50 pages"]))
      .toBe("Eleanor asks for a query letter, a synopsis and 50 pages");
    /* ⚠️ THE EMPTY CASE IS A REAL SENTENCE. An agent listing no materials is asking for the
       manuscript only — the fact the retired "ONLY MANUSCRIPT" tag was clumsily making. */
    expect(asksSentence("Dermot", [])).toBe("Dermot asks for the manuscript only.");
    expect(asksSentence("", []), "a nameless agent still reads as a sentence")
      .toBe("They asks for the manuscript only.");
  });

  it("and the phrases carry their units and separators", () => {
    expect(askPhrase({ key: "queryLetter", name: "Query letter" })).toBe("a query letter");
    expect(askPhrase({ key: "sample", name: "Opening sample", amount: "3", unit: "Chapters" })).toBe("3 chapters");
    expect(askPhrase({ key: "sample", name: "Opening sample", amount: "5000", unit: "Words" }),
      "a five-figure number needs its separator").toBe("5,000 words");
    expect(askPhrase({ key: "synopsis", name: "Synopsis", pages: "2" })).toBe("a 2-page synopsis");
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

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ PARITY — NOTHING MAY BE LOST IN THE MOVE INTO A CHIP. The stepper already worked; relocating
   it is exactly the kind of change that quietly simplifies a control, so each behaviour below has
   an assertion that would fail if it were dropped rather than a comment saying it should not be.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the stepper survived the move into the chip", () => {
  /* ⚠️ SNAP, NEVER CONVERT — the locked law in agentMaterials. The test value is chosen so a
     reintroduced conversion FAILS LOUDLY: 50 pages at the conventional 250 words/page is 12,500,
     a thoroughly plausible number that would look correct in the field and be a figure the writer
     never chose, written into a record of what they actually sent. */
  it("switching unit snaps to that unit's default and never converts", () => {
    expect(snapToUnit("Words")).toBe("5000");
    expect(snapToUnit("Words"), "50 pages 'converted' would be 12,500 — a plausible lie").not.toBe("12500");
    expect(snapToUnit("Chapters"), "3 chapters must not become 3 words").toBe("3");
    expect(snapToUnit("Pages")).toBe("10");
    expect(pane, "the unit menu must snap, not compute")
      .toContain('setRow("sample", { unit: u, amount: snapToUnit(u) })');
    const code = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    for (const n of ["250", "* 250", "/ 250", "wordsPerPage", "pagesPerChapter"]) {
      expect(code, `a conversion constant (${n}) reappeared`).not.toContain(n);
    }
  });

  /* Every snapped value is itself on-step and inside its own unit's range — switching cannot land
     the field somewhere the arrows would then refuse to move from. */
  it("and the snapped value is legal in the unit it lands in", () => {
    for (const u of ["Pages", "Words", "Chapters"] as const) {
      const v = parseQty(snapToUnit(u));
      expect(v, `${u} default is below its own minimum`).toBeGreaterThanOrEqual(CREATE_QTY[u].min);
      expect(v, `${u} default is above its own bound`).toBeLessThanOrEqual(CREATE_QTY[u].max);
      expect(v % CREATE_QTY[u].step, `${u} default is off its own ladder`).toBe(0);
    }
  });

  /* ⚠️ THE CHIP IS A BUTTON AND THE STEPPER IS INSIDE IT. Without stopPropagation, ticking Sample
     and then pressing an arrow toggles the chip back off — the control the writer aimed at is
     nested inside the control they did not. */
  it("controls inside an expanded chip do not toggle the chip", () => {
    const body = sliceBetween(pane, 'className="qc-chipbody"', "{isOther && on");
    expect(body).toContain("onClick={(e) => e.stopPropagation()}");
    expect(body, "the arrows must not bubble").toContain("e.stopPropagation(); setRow(\"sample\"");
    expect(body, "nor the unit menu").toContain("e.stopPropagation(); setUnitMenuOpen");
    expect(body, "nor ↑/↓ in the field").toMatch(/e\.preventDefault\(\); e\.stopPropagation\(\);[\s\S]{0,80}ArrowUp/);
  });

  /* Pre-ticking from the agent's own requirements, including the case with exactly one. */
  it("pre-ticks from the agent's requirements, query-letter-only included", () => {
    const only = materialRowsForDraft({ materialsWanted: ["Query letter"] } as never);
    expect(only.filter((r) => r.on).map((r) => r.key)).toEqual(["queryLetter"]);
    /* ⚠️ THE ARRAY IS THE DELIMITER and each material is its own element — "Sample pages", not a
       formatted label. A label-shaped string falls through to Other by whole-string match, which
       is the documented parser behaviour and was this fixture's first mistake. */
    const three = materialRowsForDraft({
      materialsWanted: ["Query letter", "Synopsis", "Sample pages"],
    } as never);
    expect(three.filter((r) => r.on).map((r) => r.key)).toContain("sample");
    expect(materialRowsForDraft(null).some((r) => r.on), "no agent pre-ticks nothing").toBe(false);
  });

  /* ⚠️ ENTER COMMITS TO A REMOVABLE CHIP — it used to blur, which left the writer unsure whether
     anything had been recorded. The chips are pane-local and mirrored into `other.text`, so the
     SAVED value is unchanged and `materialsPhrase` needs no knowledge of them. */
  it("Other commits on Enter to a removable chip, and the draft keeps one field", () => {
    expect(pane).toContain("commitOther([...otherChips, v]);");
    expect(pane).toContain("commitOther(otherChips.filter((_, j) => j !== i))");
    expect(pane, "the chips must mirror into the draft's single text field")
      .toContain('setRow("other", { text: chips.join(", ") })');
    const rows = materialRowsForDraft(null);
    expect(Object.keys(rows.find((r) => r.key === "other")!).sort(),
      "the shared MaterialRow must not have grown a committed[]")
      .toEqual(["key", "kind", "name", "on", "text"]);
  });
});
