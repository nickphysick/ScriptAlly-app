/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The materials band's contracts (broadsheet Phase 2, D1/D3/D7).
 *
 * ⚠️ THIS ASSERTS WHAT SOURCE CAN HONESTLY CARRY, AND NOTHING ABOUT LAYOUT. Whether three columns
 * come out equal, whether a sheet's dog-ear renders, whether the band clears the hero — those are
 * claims about a rendered page and are measured by `tests/e2e/pkgBroadsheet.measure.ts`. What lives
 * here is the wiring: that the rail's register is gone rather than sitting beside the band, that
 * every entry point names a type, and that the briefs are the ref's own words.
 *
 * ⚠️ COMMENTS ARE STRIPPED BEFORE ANY ASSERTION. This codebase documents a retirement by quoting
 * what it retired, so `not.toContain("Materials")` finds the paragraph explaining the removal and
 * goes red on a correct file. That has cost seven false reds in one session before.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/[^\n]*/g, "");

const band = read("../components/packages/MaterialsBand.tsx");
const overview = read("../components/packages/PackagesOverview.tsx");
const page = read("../components/SubmissionPackages.tsx");
const ref = read("../../design-refs/submission-packages-broadsheet.html");

describe("the materials band replaces the rail's register (D1)", () => {
  /**
   * ⚠️ THE POINT IS THE ABSENCE, NOT THE PRESENCE. A band that listed materials while the rail also
   * listed them would be two indexes of one thing — and both would look right until the day one of
   * them gained a filter. This is the assertion that fails if the panel comes back.
   */
  it("leaves no Materials panel in the rail", () => {
    const src = decls(overview);
    expect(src).not.toContain('<Panel label="Materials"');
    expect(src).not.toContain("onOpenMaterial");
    expect(src).not.toContain("onAddMaterial");
  });

  it("still renders the Packages panel — only the Materials register went", () => {
    expect(decls(overview)).toContain('label="Packages"');
  });

  it("mounts the band on the page, once", () => {
    expect(decls(page).match(/<MaterialsBand\b/g) ?? []).toHaveLength(1);
  });
});

describe("every entry point names its type (D3)", () => {
  /**
   * ⚠️ THE COLUMN'S `+ ADD` AND ITS GHOST MUST BOTH CARRY THE TYPE. A ghost wired to a type-less add
   * would drop the writer on the type-picker under a heading that already said which type they
   * wanted — the exact step the per-column entry exists to skip.
   */
  it("passes a type from both the add button and the ghost", () => {
    const src = decls(band);
    expect(src.match(/onAddMaterial\(col\.type\)/g) ?? []).toHaveLength(2);
    expect(src).not.toMatch(/onAddMaterial\(\s*\)/);
  });

  it("carries the preselect through to the modal", () => {
    const src = decls(page);
    expect(src).toContain("preselect={matPreselect}");
    /* The key must move with the type, or clicking Letters after Synopses reuses the Synopsis draft. */
    expect(src).toMatch(/key=\{matEditing\?\.id \?\? `new-\$\{matPreselect/);
  });

  it("clears the preselect on every exit, so a later edit cannot open on a stale type", () => {
    const src = decls(page);
    expect(src.match(/setMatPreselect\(null\)/g) ?? []).toHaveLength(3); // save · close · openMaterial
  });
});

describe("the sheets (D3)", () => {
  /**
   * ⚠️ THE BAND HANDS BOTH WRITERS OVER AND CHOOSES NEITHER (Ruling 2). If this component ever
   * branched on `usedIn` itself there would be two places deciding what removal means — one in the
   * band and one in `removalChoice` — and the sheet could then offer "Archive" while something
   * downstream deleted. Passing both handlers straight through is what makes that impossible.
   */
  it("delegates the removal branch rather than choosing it", () => {
    const src = decls(band);
    expect(src).toContain("<RemovePopover");
    expect(src).toContain("onDelete={onDeleteMaterial}");
    expect(src).toContain("onArchive={onArchiveMaterial}");
    /* ⚠️ NOT a sweep for `usedIn` — the band reads it legitimately, to bold the number in "In 2
       packages". A first draft forbade the identifier outright and went red on that display branch,
       which is the too-broad-assertion fault: it would have been "fixed" by weakening the render.
       The claim is about the ACT, so the sweep is for the things that perform one. */
    expect(src, "the band named an act").not.toMatch(/removalChoice|archiveVersion|deleteVersion/);
  });

  /**
   * ⚠️ A `button` INSIDE A `button` IS INVALID HTML, and the sheet holds two controls now. The
   * browser closes the outer one and the parse recovers in a way nothing here tests, so the check
   * is that the sheet is not a button at all.
   */
  it("keeps the sheet a div so it can hold two controls", () => {
    const src = decls(band);
    expect(src).toMatch(/<div key=\{s\.id\} className="pkgb-sheet"/);
    expect(src).not.toMatch(/<button[^>]*className="pkgb-sheet"/);
  });

  it("prints the usage line's number from the derivation, not from a stored field", () => {
    const src = decls(band);
    expect(src).toContain("materialColumns(versions, packages)");
    expect(src).toContain("s.usedIn");
  });
});

describe("the illustration briefs are the ref's own words (D7)", () => {
  /**
   * ⚠️ ASSERTED AGAINST THE REF FILE, NOT AGAINST A LITERAL TYPED TWICE. The brief is a commission
   * to whoever draws these, so a paraphrase is a different instruction — and a copy of the words in
   * this test would pass on the day the component's copy drifted from the ref's.
   */
  it("quotes each of the three column briefs verbatim", () => {
    const line = ref.split("\n").find((l) => l.includes("TYPE_BRIEF"));
    expect(line, "the ref no longer declares TYPE_BRIEF").toBeTruthy();
    const briefs = [...line!.matchAll(/'([^']*<br>[^']*)'/g)].map((m) => m[1].replace(/<br>/g, "\n"));
    expect(briefs, "expected the ref's three column briefs").toHaveLength(3);
    for (const b of briefs) {
      expect(band, `brief not quoted: ${JSON.stringify(b)}`).toContain(JSON.stringify(b).slice(1, -1));
    }
  });
});
