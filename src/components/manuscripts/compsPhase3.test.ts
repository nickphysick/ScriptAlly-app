/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 3 locks — add, edit and remove inside the card.
 *
 * ⚠️ SOURCE-READING, AND HONEST ABOUT IT. This repo has no jsdom, so none of this proves the flows
 * RAN — the page's render is proved by materialsPageSmoke. What these catch is the class of thing a
 * render cannot see: a modal creeping back, a receipt losing its consequence line, an undo that
 * appends instead of restoring, and copy that starts appraising again.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tsx = readFileSync(join(here, "ComparableTitlesPage.tsx"), "utf8");
const css = readFileSync(join(here, "comps.css"), "utf8");
/** comments stripped — an explained decision names the thing it removed (this has bitten twice) */
const src = tsx.replace(/\/\*[\s\S]*?\*\//g, "");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("Phase 3 — the journeys are inside the card", () => {
  /**
   * ⚠️ THE MODAL IS WITHDRAWN, NOT MERELY UNUSED. A writer adding comps is looking at the hero line
   * they are building and the rows already in it; a Form 11 shell covers exactly that.
   */
  it("mounts no Form 11 shell for add, edit or remove", () => {
    expect(src).not.toContain("FormShell");
  });

  /** ⚠️ THE FORM HOLDS THE EDITED ROW'S INDEX — the list must not reflow around an editor. */
  it("replaces the edited row in place", () => {
    expect(src).toContain("formState?.index === i");
    expect(src).toContain('mode="edit"');
  });

  it("takes the add row's place rather than opening beside it", () => {
    expect(src).toContain("formState?.index === null ? (");
  });

  /**
   * ⚠️ FOCUS RETURNS TO THE ADD ROW. A writer adds three comps in one sitting; without this, each
   * one costs a trip back to the mouse.
   */
  it("returns focus to the add row after a save", () => {
    expect(src).toContain("addRowRef.current?.focus()");
  });
});

describe("Phase 3 — every mutation issues an undoable receipt", () => {
  const receipts = src.match(/showToast\(\{/g) ?? [];

  it("add, edit and remove each fire one", () => {
    expect(receipts.length).toBe(3);
  });

  it("all three are undoable — an edit is reversible, not just a deletion", () => {
    expect((src.match(/undo:/g) ?? []).length).toBe(3);
  });

  /**
   * ⚠️ THE REMOVAL RECEIPT STATES THE CONSEQUENCE THE ROW CANNOT SHOW. The writer is looking at the
   * gap in the list, not at the sentence above it, so this is where the difference gets said — and
   * the two branches must stay distinct, or it states nothing.
   */
  it("the removal receipt names what happened to the query line, both ways", () => {
    expect(src).toContain("Your query line has been updated");
    expect(src).toContain("No change to your query line");
    expect(src).toMatch(/gone\.inQuery \?/);
  });

  /**
   * ⚠️ UNDO RESTORES AT THE ORIGINAL INDEX, NEVER APPENDED. Position IS the query line's order, so
   * putting a comp back at the end would quietly rewrite the sentence the undo was reversing.
   */
  it("a removed comp is spliced back where it was", () => {
    expect(src).toContain("back.splice(index, 0, gone)");
  });

  /**
   * ⚠️ AN UNDO INVERTS THE CURRENT LIST, NEVER THE ONE IT WAS BORN WITH. A receipt lives six
   * seconds — long enough for another edit to land first, which a captured closure would discard.
   */
  it("undo reads the live list through a ref, not a captured snapshot", () => {
    expect(src).toContain("compsRef.current = comps");
    for (const m of src.matchAll(/undo: \(\) => ([\s\S]{0,160})/g)) {
      expect(m[1], "an undo closed over a stale comps array").toContain("compsRef.current");
    }
  });
});

describe("Phase 3 — duplicates are reported, never refused", () => {
  it("matches case-insensitively and offers both outs", () => {
    expect(src).toContain("toLowerCase() === t.toLowerCase()");
    expect(src).toContain("Show me");
    expect(src).toContain("Add anyway");
  });

  it("states the collision as a fact, naming the title", () => {
    expect(src).toContain("is already on your list");
  });

  /** ⚠️ NEVER A HARD BLOCK — "Add anyway" commits the very draft the check stopped. */
  it("Add anyway commits rather than re-validating into the same wall", () => {
    expect(src).toMatch(/onClick=\{commit\}/);
  });
});

describe("Phase 3 — validation is presence-only, and there is no red", () => {
  it("blocks a save only on a missing title", () => {
    expect(src).toContain('if (!t) { setProblem({ kind: "empty" })');
    /* nothing may gate the save on a year, an age or a media type */
    const save = src.slice(src.indexOf("const save = () => {"), src.indexOf("return (\n    <div\n      className=\"ct-cform\""));
    expect(save).not.toMatch(/\byear\b/);
    expect(save).not.toMatch(/\bage\b/);
  });

  it("the invalid treatment is the amber hairline, never a red", () => {
    const warn = rules.slice(rules.indexOf(".ct-fld input.warn"));
    expect(warn.slice(0, 160)).toContain("--ct-warn");
    expect(rules).not.toContain(".ct-fld input.error");
  });

  /**
   * ⚠️ SCOPED TO THE NOTE, NOT THE FILE. A whole-source scan for scolding words fails on the Scout's
   * `phase === "error"` — unrelated machinery, matching the same letters. The rule is about the copy
   * a writer reads when a save is blocked, so that is what the slice covers, and the anchor is
   * asserted first: a missing marker would leave an empty string that passes every `not.toMatch`.
   */
  it("says what is needed rather than what went wrong", () => {
    const anchor = "{problem && (";
    expect(src, "the validation note moved — this lock is reading nothing").toContain(anchor);
    const note = sliceBetween(src, anchor, '<div className="ct-fbot">');
    expect(note).toContain("A title is needed to save this comp.");
    expect(note).not.toMatch(/\b(invalid|required|you must|please|error|failed|cannot)\b/i);
  });
});

describe("Phase 3 — the keyboard", () => {
  it("Escape cancels and Enter saves, from anywhere in the form", () => {
    expect(src).toContain('if (e.key === "Escape") { e.preventDefault(); onCancel(); }');
    expect(src).toContain('if (e.key === "Enter") { e.preventDefault(); save(); }');
  });

  it("states both keys where the writer can see them", () => {
    expect(src).toContain("Esc to cancel · ⌘↵ to save");
  });
});

describe("Phase 3 — the empty states are states, not failures", () => {
  /**
   * ⚠️ THE SLOTS STAY VISIBLY PROVISIONAL. The artwork is commissioned; a placeholder that looked
   * finished would quietly become the finished thing. The dashed frame and the mono stamp are the
   * mechanism, and `ILLUSTRATION SLOT` is what a reviewer sees rather than a half-drawn mark.
   */
  /**
   * ⚠️ THE STAMP NAMES THE SLOT NOW (v2 §5) — `attr(data-slot)` rather than the literal
   * "ILLUSTRATION SLOT", so the illustrator's brief and the markup cannot drift, and a slot added
   * without a name renders its own gap. The claim is stronger than the one it replaces: the old
   * lock proved a caption existed, this proves every slot is identified.
   */
  it("both carry a dashed slot, stamped with its own name", () => {
    expect(rules).toContain("attr(data-slot)");
    expect(rules.slice(rules.indexOf(".ct-islot"))).toContain("dashed");
    expect(src).toContain("<CompsEmptySketch />");
    expect(src).toContain("<ScoutEmptySketch />");
    /* ⚠️ AND EVERY RENDERED SLOT CARRIES A NAME, or the stamp reads "SLOT ·  · 200×150". Counting
       both sides catches a slot added without one — the population assertion this repo's negative
       checks are required to make. */
    const slots = src.match(/className="ct-islot"/g) ?? [];
    const named = src.match(/className="ct-islot" data-slot="[a-z-]+"/g) ?? [];
    expect(slots.length, "no slots rendered — the lock is measuring nothing").toBeGreaterThan(0);
    expect(named.length, "a slot renders without a data-slot name").toBe(slots.length);
  });

  it("carry no apology, no exclamation and no congratulation", () => {
    const states = [
      src.slice(src.indexOf("No comps yet."), src.indexOf("No comps yet.") + 400),
      src.slice(src.indexOf("Nothing left from this run."), src.indexOf("Nothing left from this run.") + 400),
    ];
    for (const block of states) {
      expect(block).not.toMatch(/!|sorry|oops|well done|congratulations|great|nice work/i);
    }
  });

  /** ⚠️ NO UPSELL IN YOUR COMPS — free comps are unlimited; the Pro boundary is the Scout alone. */
  it("the comps empty state sells nothing", () => {
    const block = src.slice(src.indexOf("No comps yet."), src.indexOf("No comps yet.") + 600);
    expect(block).not.toMatch(/upgrade|pro plan|unlock/i);
  });
});

/**
 * ⚠️ THE APPRAISAL HELPERS MUST NOT COME BACK TO THIS PAGE (v2 §3/§5).
 *
 * `compAge` returns null unless a book is MORE than five years old, and `compRole` sorts comps into
 * "Market comp" / "Tone comp" on the same boundary. Both are threshold classifications, and a mark
 * that lands on SOME of a writer's comps is an appraisal of their choices delivered by presence,
 * whatever its wording. §3 replaced them with `compAgeLine`, which has no cutoff at all.
 *
 * ⚠️ THIS IS A LOCK RATHER THAN A COMMENT ON PURPOSE. Both functions still exist in compsPage.ts
 * with their tests — they were kept rather than swept, which means they are one import away from
 * returning. A note in the file explaining why they went would stop nobody; this fails.
 *
 * ⚠️ AND IT STRIPS COMMENTS FIRST. The page carries a paragraph NAMING both functions to explain the
 * retirement — this repo's prose is unusually rich in exactly the tokens its locks forbid, because
 * every retirement here is documented by quoting what it retired. Asserting over raw source would
 * fail on the explanation.
 */
describe("v2 — the page reads no threshold classifier", () => {
  const decls = readFileSync(join(here, "ComparableTitlesPage.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  it("neither compAge nor compRole is imported or called", () => {
    /* ⚠️ BOUNDED, NOT A SUBSTRING — a bare `toContain("compAge")` matches `compAgeLine`, which is
       the replacement. That is the prefix trap this repo has hit twice, and here it would fire on
       the correct code. */
    expect(decls, "compAge is back — its chip appears only on older comps").not.toMatch(/\bcompAge\b/);
    expect(decls, "compRole is back — it classifies on a five-year cutoff").not.toMatch(/\bcompRole\b/);
    /* and the replacement really is there, so this cannot pass by the page losing its age chip */
    expect(decls, "the page states no age at all").toMatch(/\bcompAgeLine\b/);
  });
});
