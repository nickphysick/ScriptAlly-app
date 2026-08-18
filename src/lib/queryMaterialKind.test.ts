/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's material classifier — the fix for a live misreport.
 *
 * ⚠️ THE BUG WAS NOT A GAP, IT WAS A WRONG ANSWER. `isSampleMat` was a catch-all —
 * `!queryLetter && !synopsis` meant "sample" — so any free text a writer had entered came back to
 * them labelled as an opening sample. The app was misstating a fact about their own submission.
 *
 * ⚠️ AND THE INPUTS HERE ARE THE SHAPES THE SYSTEM ACTUALLY STORES: legacy plain strings from the
 * agent's `materialsWanted`, and the structured `QueryMaterial` the query's own writer emits.
 * A hand-written kind would be testing a shape nothing produces.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { classifyMaterial, classifyQueryMaterial, parseAgentMaterials, MAT_OPTS } from "./agentMaterials";

describe("classifyQueryMaterial — the four kinds, from what is stored", () => {
  it("the structured items the query's own writer emits", () => {
    expect(classifyQueryMaterial({ material: "Query Letter" })).toBe("queryLetter");
    expect(classifyQueryMaterial({ material: "Synopsis" })).toBe("synopsis");
    expect(classifyQueryMaterial({ material: "Sample Pages", type: "pages", quantity: 50 })).toBe("sample");
    expect(classifyQueryMaterial({ material: "Sample Pages", type: "chapters", quantity: 3 })).toBe("sample");
    expect(classifyQueryMaterial({ material: "Sample Pages", type: "words", quantity: 10000 })).toBe("sample");
  });

  /* ⚠️ THE FIX. `type: "other"` is checked FIRST, and `QueryMaterial` already carries it — so Other
     gets an identity with no schema change, only a reader that looks at it. */
  it("free text is OTHER, and was reported as an opening sample", () => {
    expect(classifyQueryMaterial({ material: "Other", type: "other", quantity: "A one-page pitch" })).toBe("other");
    expect(classifyQueryMaterial("A one-page pitch and two testimonials")).toBe("other");
    expect(classifyQueryMaterial("Author's note")).toBe("other");
    /* the old predicate's answer, kept as the thing this must never return again */
    const oldCatchAll = (s: string) => !s.toLowerCase().includes("query") && !s.toLowerCase().includes("synopsis");
    expect(oldCatchAll("A one-page pitch"), "the old predicate did call this a sample").toBe(true);
    expect(classifyQueryMaterial("A one-page pitch")).not.toBe("sample");
  });

  it("legacy plain strings read through the same patterns as the agent editor", () => {
    expect(classifyQueryMaterial("Query letter")).toBe("queryLetter");
    expect(classifyQueryMaterial("Synopsis (2 pages)")).toBe("synopsis");
    expect(classifyQueryMaterial("First 10 pages")).toBe("sample");
    expect(classifyQueryMaterial("First 3 chapters")).toBe("sample");
    expect(classifyQueryMaterial("10,000 words")).toBe("sample");
  });

  /* ⚠️ A RETIRED PILL READS AS `other` RATHER THAN VANISHING. A query that genuinely holds an
     author bio should say so in the writer's own words; dropping it from the card would be the app
     deciding a fact about their submission did not happen. */
  it("the two retired materials survive as free text on a query", () => {
    expect(classifyQueryMaterial("Author bio")).toBe("other");
    expect(classifyQueryMaterial("Full manuscript")).toBe("other");
  });

  /* the old `includes("query")` matched anything with the word in it */
  it("a free text mentioning a material is not that material", () => {
    expect(classifyQueryMaterial("Notes on the query process")).toBe("other");
  });
});

describe("classifyMaterial — one set of patterns, two callers", () => {
  /**
   * ⚠️ ASSERTED AGAINST THE ARRAY PARSER, NOT AGAINST LITERALS. `parseAgentMaterials` now reads
   * this function per item, so the two cannot disagree — and a test comparing two derivations is
   * what proves that, where a `toBe("Synopsis")` on both sides would go green the day someone
   * changed both in the same wrong direction.
   */
  it("every pill the array parser selects is the one the classifier names", () => {
    const cases = ["Query letter", "Synopsis", "Synopsis (2 pages)", "First 10 pages", "First 3 chapters",
                   "10,000 words", "Sample pages", "Sample chapters", "Sample words", "Chapters", "Word count",
                   "Author bio", "Full manuscript"];
    for (const c of cases) {
      const viaParser = parseAgentMaterials([c]).selected;
      const viaClass = classifyMaterial(c).pill;
      expect(viaClass, `${c} is not a recognised pill`).not.toBeNull();
      expect(viaParser, `${c}: the parser and the classifier disagree`).toEqual([viaClass]);
    }
  });

  it("the counts the parser stores are the counts the classifier reads", () => {
    for (const [raw, pill, count] of [["Synopsis (2 pages)", "Synopsis", "2"], ["First 10 pages", "Sample pages", "10"],
                                      ["First 3 chapters", "Sample chapters", "3"], ["10,000 words", "Sample words", "10000"]] as const) {
      expect(classifyMaterial(raw).count, `${raw}: wrong count`).toBe(count);
      expect(parseAgentMaterials([raw]).counts[pill], `${raw}: the parser stored something else`).toBe(count);
    }
  });

  it("unrecognised text is Other by definition, never dropped", () => {
    expect(classifyMaterial("A one-page pitch").pill).toBeNull();
    const s = parseAgentMaterials(["A one-page pitch"]);
    expect(s.selected).toContain("Other");
    expect(s.otherText, "the writer's own words were dropped").toBe("A one-page pitch");
  });

  it("every pill it can name is a real MAT_OPTS member", () => {
    for (const c of ["Query letter", "Synopsis", "First 10 pages", "Author bio"]) {
      const p = classifyMaterial(c).pill!;
      expect(MAT_OPTS as readonly string[], `${p} is not a MAT_OPTS pill`).toContain(p);
    }
  });
});

/**
 * ⚠️ THE QUERY CENTRE READS THE SHARED SOURCE, and this is asserted at source because the page has
 * no other way to be checked in a node environment. The three things that must not come back are a
 * local unit list, a local step, and a catch-all predicate.
 */
describe("§4 · the Query Centre stopped keeping its own copies", () => {
  const src = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8")
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the classifier, the unit set and the stepper all come from agentMaterials", () => {
    expect(src, "the page does not import the shared source")
      .toMatch(/import \{[^}]*classifyQueryMaterial[^}]*\} from "\.\.\/lib\/agentMaterials"/);
    for (const t of ["SAMPLE_UNITS", "snapToUnit", "stepAmount"]) {
      expect(src, `${t} is not used — the page kept its own`).toContain(t);
    }
  });

  /**
   * ⚠️ CLASSIFYING FREE TEXT CORRECTLY MEANS NOTHING IF NOTHING DRAWS IT. While the predicate was a
   * catch-all, an Other material appeared on the card wearing the sample chip's label — wrong, but
   * visible. Correctly classified and unrendered, the same material would VANISH: the app hiding a
   * fact about the writer's submission rather than mislabelling one, which is worse. The chip's
   * label is their own words, through the shared formatter.
   */
  it("free text renders as its own chip, in the writer's words", () => {
    expect(src, "nothing collects the Other items").toContain("const otherItems = base.filter(isOtherMat)");
    expect(src, "the Other items are collected and never drawn").toContain("otherItems.map(");
    /* ⚠️ THE CHIP GOES THROUGH THE SHARED RENDERER SINCE §2, so the writer's words arrive as its
       LABEL argument rather than as JSX of their own — which is the point of the move: its ×, its
       hover and its editor cannot drift from the other three pills'. The clause is unchanged: the
       label is what the writer typed, never a name of ours. */
    expect(src, "the Other chip imposes a label of ours").toContain("sampleMaterialText(it), null,");
  });

  it("the local unit triple and the catch-all predicate are gone", () => {
    expect(src, "the page kept its own lowercase unit list")
      .not.toMatch(/\["pages",\s*"chapters",\s*"words"\]/);
    expect(src, "the catch-all predicate came back — free text would report as a sample")
      .not.toContain("!isQueryLetterMat(it) && !isSynopsisMat(it)");
    /* ⚠️ AND `Other` HAS A READER NOW. Without one the kind exists and nothing asks for it. */
    expect(src, "nothing on the page can tell free text apart").toContain("isOtherMat");
  });

  /* ⚠️ ONE WRITER, AND NO ACTIVITY LOG — asserted so neither is "fixed" later. Editing what you
     sent is a correction to a factual record, not an event that happened. */
  it("writeMaterials is the only writer, and it logs nothing", () => {
    const w = src.slice(src.indexOf("const writeMaterials ="), src.indexOf("const toggleDocMaterial ="));
    expect(w, "the writer is missing").toContain("updateQuery(q.id, { materialsWanted: next })");
    expect(w, "the writer grew an activity entry").not.toMatch(/addActivity|logActivity|ActivityType/);
    /* ⚠️ `commitSample` REPLACES `saveSampleMaterial` (§1) — the editor commits on every change, so
       the Save button and its handler are gone. The clause is unchanged: every path that writes
       materials goes through the one writer. */
    for (const caller of ["toggleDocMaterial", "commitSample", "removeSampleMaterial"]) {
      const at = src.indexOf(`const ${caller} =`);
      expect(at, `${caller} is missing`).toBeGreaterThan(-1);
      const body = src.slice(at, src.indexOf("\n  const ", at + 10));
      expect(body, `${caller} writes without going through writeMaterials`).toContain("writeMaterials(");
    }
  });
});

/**
 * ⚠️ §2 · ONE EDITOR, BOTH ROUTES — and the two used to open different things. Clicking an `Other`
 * pill opened a popover; choosing `Other` from the Attach menu opened a text field BELOW the chips,
 * with no anchor and no removal in it. Two routes to one job is how they come to disagree about
 * what an editor is.
 *
 * ⚠️ THE CODE FOR §1 AND §2 IS ONE CHANGE, committed with §1 — the surface and the flows through it
 * are the same component. These are §2's own clauses over it.
 */
describe("§2 · the attach menu and the shared editor", () => {
  const page = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
  const decls = page.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the menu lists the four, and each row says what choosing it will do", () => {
    for (const label of ["Query letter", "Synopsis", "Opening sample", "Other…"]) {
      expect(decls, `the menu dropped ${label}`).toContain(`label: "${label}"`);
    }
    /* the two that hand over say so BEFORE the click; the two that attach and close say nothing */
    expect(decls, "Opening sample does not announce its editor").toContain('hint: "→ SIZE"');
    expect(decls, "Other does not announce its field").toContain('hint: "FREE TEXT"');
    /* ⚠️ `ATTACHED` IS THE HINT, NOT A SUFFIX ON THE LABEL — "Synopsis · Attached" read as a
       different material. */
    expect(decls, "the attached state is welded to the label").not.toContain("· Attached`");
    expect(decls, "the attached state is not stated").toContain('hint: on ? "ATTACHED"');
    expect(decls, "an attached type is still choosable").toContain("disabled: on");
  });

  /* ⚠️ ONE COMPONENT: both routes set `matPop` and render `F12Panel`. Asserted as the ABSENCE of the
     second editor as well, because the inline row is what a future pass would reach for again. */
  it("both routes open the same editor, and the inline row is gone", () => {
    expect((decls.match(/<F12Panel/g) ?? []).length, "there is more than one materials editor").toBe(1);
    expect(decls, "the attach route does not open the editor").toContain('openMatPop("smp", anchor)');
    expect(decls, "the Other route does not open the editor").toContain('openMatPop("oth", anchor)');
    expect(decls, "the pill route does not open the editor").toContain('openMatPop("smp", el)');
    expect(decls, "the inline Other row came back").not.toMatch(/["\s`]qc-msamp["\s`]/);
    expect(decls, "the inline row's state came back").not.toContain("setOtherOpen");
  });

  /**
   * ⚠️ THE AGENT'S PREFERENCE LIVES IN `agent.materialsWanted` — the same `string[]` the Add-Agent
   * form and the Edit drawer write, read back through `agentMaterials.ts` rather than parsed here.
   * It supplies the editor's DEFAULT and its hint line, and where the agency has stated nothing
   * neither renders: an agency that said nothing must not appear to have asked for ten pages.
   */
  it("the sample preference is read from the agent's own materials, never invented", () => {
    expect(decls, "the preference is not derived from the agent record").toContain("parseAgentMaterials(ag?.materialsWanted");
    expect(decls, "an agent with no stated sample still yields one").toContain("if (!pill) return null;");
    expect(decls, "the hint renders regardless of whether there is a preference").toContain("{pref && (");
    expect(decls, "the default does not prefer the agent's own size").toContain("pref?.unit ?? sampleUnit");
  });
});
