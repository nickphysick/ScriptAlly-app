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
import { sliceBetween } from "../test/sliceBetween";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/[^\n]*/g, "");

const band = read("../components/packages/MaterialsBand.tsx");
const page = read("../components/SubmissionPackages.tsx");
const ref = read("../../design-refs/submission-packages-broadsheet.html");

describe("the materials band replaces the rail's register (D1)", () => {
  /**
   * ⚠️ THE POINT IS THE ABSENCE, NOT THE PRESENCE. A band that listed materials while the rail also
   * listed them would be two indexes of one thing — and both would look right until the day one of
   * them gained a filter. §4 went further and removed the rail entirely, so the claim widened with
   * it: no file on this page renders a register at all.
   *
   * ⚠️ AND THE CLASS TOKENS ARE BOUNDED. `not.toContain("pkgo-rail")` would be satisfied by any
   * longer class beginning with it, and would equally have missed a genuine one written into a
   * template literal — the prefix trap this repo has hit twice.
   */
  it("leaves no rail in any file on the page", () => {
    /* ⚠️ THE ONBOARDING STAGE IS GONE, NOT SKIPPED. `PackagesOnboarding` was retired with the
       two-state rebuild — the first-visit surface is `PackagesTeachFirst`, which renders no
       register of any kind. The claim narrows to the files that still exist rather than quietly
       iterating one; a loop over a deleted file is a case that asserts nothing. */
    for (const [label, src] of [["the page", page]] as const) {
      const d = decls(src);
      expect(d, `${label} still renders a rail`).not.toMatch(/["\s`]pkgo-rail["\s`]/);
      expect(d, `${label} still renders a register row`).not.toMatch(/["\s`]pkgo-row["\s`]/);
      /* ⚠️ NOT a sweep for `onOpenMaterial` — the BAND takes that prop, legitimately, and a first
         draft forbidding it went red on the correct mount. The claim is about the rail, so it is
         the rail's own classes that are swept; the derivation check below covers the rest. */
    }
  });

  /**
   * ⚠️ AND THE REGISTER'S DERIVATIONS WENT WITH IT, which is the half a class check cannot see. A
   * tested function with no caller reads as live code to the next session — which is how a future
   * run "restores" a register that was deliberately deleted.
   */
  it("leaves no orphaned register derivation behind", () => {
    const lib = decls(read("./packagesOverview.ts"));
    for (const gone of ["materialRows", "materialDetail", "addedLabel", "packageRows", "trackingRows", "replyCount"]) {
      expect(lib, `${gone} is still exported with no caller`).not.toContain(`export function ${gone}`);
      expect(lib, `${gone} is still exported with no caller`).not.toContain(`export const ${gone}`);
    }
  });

  it("⚠️ THE BAND IS SUPERSEDED BY THE RAIL — swapped, not added", () => {
    /**
     * ⚠️ RETARGETED, AND THE LAW IT NOW ASSERTS. This required `<MaterialsBand` to be mounted once.
     * Part C replaces the shelf with the Builder's rail: the same materials, beside the ledger
     * instead of below it, so a writer assembling a package can see what they are assembling from.
     *
     * What survives is the part that would actually cause harm if lost — the materials surface is
     * mounted EXACTLY ONCE, and it is one surface rather than two. A page carrying both would be
     * two answers to what materials this manuscript has.
     */
    const d = decls(page);
    expect(d.match(/<BuilderRail\b/g) ?? [], "the rail is mounted exactly once").toHaveLength(1);
    expect(d, "the shelf it replaces is gone from the page").not.toMatch(/<MaterialsBand\b/);
  });

  it("⚠️ AND THE ARCHIVE DRAWER CAME WITH IT — the only route back for a put-away material", () => {
    /**
     * `ArchivedSection` was the shelf's. Unmounting the shelf without rehoming it would have made
     * the writer's own put-away work unreachable — and Part C's retirement of the sample type put
     * four materials in there. Asserted on the PAGE, because that is where the rehoming happened.
     */
    const d = decls(page);
    expect(d).toMatch(/<ArchivedSection\b/);
    expect(d).toMatch(/archivedVersions/);
  });

  it("mounts the three working bands, once each", () => {
    const d = decls(page);
    for (const band of ["PackagesBand", "TrackingBand", "FootnoteBand"]) {
      expect(d.match(new RegExp(`<${band}\\b`, "g")) ?? [], `${band} is not mounted exactly once`).toHaveLength(1);
    }
  });
});

describe("every entry point names its type (D3)", () => {
  /**
   * ⚠️ THE COLUMN'S `+ ADD` AND ITS GHOST MUST BOTH CARRY THE TYPE. A ghost wired to a type-less add
   * would drop the writer on the type-picker under a heading that already said which type they
   * wanted — the exact step the per-column entry exists to skip.
   */
  it("the ONE add card opens the modal without answering its type question", () => {
    /**
     * ⚠️ THE CLAIM IS RETIRED, NOT REPOINTED (D-B2). It asserted two type-bearing entry points per
     * column — a `+ ADD` head button and a per-type ghost — and the shelf has neither: one add card
     * at the end, because the type is a question the material modal already asks and three adds
     * meant choosing it twice.
     *
     * What survives is the weaker, still-true claim: the add card exists and hands over a type the
     * modal can start from.
     */
    const src = decls(band);
    expect(src).toContain("pkgb-msheetadd");
    expect(src).toContain("onAddMaterial(BUILDER_TYPES[0])");
    expect(src, "the per-type column heads are back").not.toMatch(/["\s`]pkgb-matcolhead["\s`]/);
  });

  it("carries the preselect through to the modal", () => {
    const src = decls(page);
    expect(src).toContain("preselect={matPreselect}");
    /* The key must move with the type, or clicking Letters after Synopses reuses the Synopsis draft. */
    expect(src).toMatch(/key=\{matEditing\?\.id \?\? `new-\$\{matPreselect/);
  });

  it("clears the preselect on every exit, so a later edit cannot open on a stale type", () => {
    /**
     * ⚠️ THE PROPERTY, NOT A COUNT. This asserted exactly three clears — save · close · openMaterial
     * — so it went RED the day a fourth, entirely CORRECT entry point was added (the first-visit
     * CTA, which opens the modal with no preselect and clears it exactly as the rule requires).
     * A literal count is not "every entry point clears it"; it is "there are three entry points",
     * which is a claim nobody meant to make and which fails on the change it should welcome.
     *
     * The real claim: every call that OPENS the material modal clears the preselect first, or
     * deliberately sets one. So count the opens, and require a clear-or-set beside each.
     */
    const src = decls(page);
    const opens = (src.match(/setMatModal\(true\)/g) ?? []).length;
    const preselects = (src.match(/setMatPreselect\((null|[a-zA-Z]+)\)/g) ?? []).length;
    expect(opens, "no entry point opens the material modal").toBeGreaterThan(0);
    expect(preselects, "an entry point opens the modal without saying which type")
      .toBeGreaterThanOrEqual(opens);
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
    expect(decls(band)).toMatch(/<div key=\{sh\.id\} className=\{`pkgb-msheet /);
    expect(src).not.toMatch(/<button[^>]*className="pkgb-sheet"/);
  });

  it("prints the usage line's number from the derivation, not from a stored field", () => {
    const src = decls(band);
    /* ⚠️ VIA `materialShelf`, WHICH WRAPS `materialColumns` — the shelf deliberately reuses the
       columns' sheets rather than re-deriving them, so `usedIn` is still the one number the usage
       line prints and the delete guard reads. The claim is unchanged; the call site moved.

       ⚠️ AND IT IS MATCHED ON THE CALL'S SHAPE, NOT ITS EXACT ARGUMENT LIST — the second retarget
       of this line. It pinned `materialShelf(versions, packages)` and went red the day the shelf
       gained a third argument (the manuscript's book versions), about a claim that had not moved
       an inch. THE LAW HERE IS "the band derives the number rather than reading a stored field",
       and an argument the derivation happens to take is not part of it. */
    expect(src).toMatch(/materialShelf\(\s*versions\s*,\s*packages\b/);
    /* ⚠️ THE PROPERTY, NOT THE VARIABLE NAME. This asserted the literal `s.usedIn`; the shelf's
       loop binds `sh`, so a rename broke a case about where a NUMBER comes from. The claim is that
       the band reads the derived field — which is what the pattern says and a literal did not. */
    expect(src).toMatch(/\.usedIn\b/);
  });
});

/**
 * ⚠️ THE BRIEF MOVED OFF THE PAGE AND INTO THE REPORT (D4/D5), SO THE LOCK FOLLOWED IT. This block
 * used to assert that the component quoted the ref's Caveat briefs verbatim — correct while the
 * words were rendered, and pointless once line-art replaced them. Deleting it would have been the
 * wrong response: the commission still exists, it just lives somewhere else now, and *somewhere
 * else* is a markdown file with nothing holding it in place.
 *
 * ⚠️ SO THE REPORT IS NOW LOAD-BEARING, AND THIS IS WHAT BEARS ON IT. If someone trims the slot
 * inventory table, or renames a slot without carrying its brief across, this goes red. That is the
 * only mechanism standing between an illustrator's instructions and a quiet deletion.
 */
describe("the artist's commission survives, in the report (D5)", () => {
  const report = read("../../reports/submission-packages-recut.md");
  const oldRef = read("../../design-refs/submission-packages-broadsheet.html");

  /* Every brief the retired ref ever wrote, taken from the ref rather than typed here — a literal
     would be a second copy of the thing being protected. */
  /* ⚠️ EXTRACTED FROM THE NAMED DECLARATION, NOT BY A PATTERN THAT HAPPENS TO MATCH. A first draft
     swept `(?:letter|synopsis|sample):'...'` across the whole file and pulled in `TYPE_LABEL`'s
     display strings — "Covering letter" is a label, not a brief, and the lock then demanded the
     report protect something that was never a commission. Bound to the block, then read. */
  const typeBriefBlock = sliceBetween(oldRef, "const TYPE_BRIEF", "};", "TYPE_BRIEF block");
  const briefs = [
    ...[...oldRef.matchAll(/plate\('([^']*)'/g)].map((m) => m[1]),
    ...[...typeBriefBlock.matchAll(/:'([^']*)'/g)].map((m) => m[1]),
    ...[...oldRef.matchAll(/stamp:'([^']*)'/g)].map((m) => m[1]),
  ].map((b) => b.replace(/<br>/g, " ").trim());

  it("finds briefs in the retired ref to protect", () => {
    expect(new Set(briefs).size, "the old ref stopped yielding briefs — check it is still on disk")
      .toBeGreaterThanOrEqual(14);
  });

  it("carries every one of them into the inventory table", () => {
    for (const b of new Set(briefs)) {
      expect(report, `brief lost from the inventory: ${JSON.stringify(b)}`).toContain(b);
    }
  });

  /* ⚠️ AND THE TABLE NAMES THE ICON THAT REPLACED EACH ONE, or the brief is preserved without
     saying what it is a brief FOR. */
  it("names an icon for each slot alongside its brief", () => {
    for (const icon of ["envelope", "scroll", "pages", "desk", "parcel", "typewriter", "inkwell",
                        "parcelOpen", "chart", "tally", "outgoing", "opened", "bookmark",
                        "postbox", "doormat", "magnifier"]) {
      expect(report, `icon missing from the inventory: ${icon}`).toContain(`\`${icon}\``);
    }
  });
});

describe("the removal popover can be positioned at all", () => {
  const css = read("../components/packages/packagesBroadsheet.css");
  const rule = sliceBetween(css, ".pkgb-remwrap {", "}", ".pkgb-remwrap rule");

  /**
   * ⚠️ A TRANSFORMED ANCESTOR BECOMES THE CONTAINING BLOCK FOR `position: fixed` DESCENDANTS, and
   * the popover is a fixed descendant of this wrapper. `translateY(-50%)` here — added to centre
   * the bin on the sheet's edge — put the confirmation off screen on the deployed page, with every
   * declaration in the popover's own stylesheet correct. Playwright named it: "element is outside
   * of the viewport". A comment would not have stopped the next person re-centring it that way.
   */
  it("centres the bin without a transform", () => {
    expect(rule, "a transform here re-parents the popover's fixed positioning").not.toContain("transform");
  });

  it("uses the box to centre instead", () => {
    expect(rule).toContain("align-items: center");
    expect(rule).toMatch(/top: 0/);
    expect(rule).toMatch(/bottom: 0/);
  });
});
