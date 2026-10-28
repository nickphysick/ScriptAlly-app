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

  /* ⚠️ RETARGETED ONTO PACKAGES v26 (25 Oct). The materials live in TWO views by design (the ref draws both): Your
     materials beside the open package, to drag from, and the Query letters / Synopses tables, to read and edit. Your
     materials is mounted ONCE, inside the builder; none of the retired surfaces is back; and a put-away material keeps
     its way back — the tables list put-away ones last, tagged, and their drawer offers "Bring it back". */
  it("⚠️ Your materials once, inside the builder — and none of the retired surfaces", () => {
    const d = decls(page);
    expect(d.match(/<Pk26Builder\b/g) ?? [], "the builder is mounted exactly once").toHaveLength(1);
    const builder = decls(read("../components/packages/v26/Pk26Builder.tsx"));
    expect(builder.match(/data-pk26="lib"/g) ?? [], "Your materials is drawn exactly once").toHaveLength(1);
    for (const gone of ["MaterialsSheet", "PkgMaterials", "PageRail", "MaterialsBand", "BuilderRail", "PackagesBand", "TrackingBand", "FootnoteBand"]) {
      expect(d, `${gone} is back on the page`).not.toMatch(new RegExp(`<${gone}\\b`));
    }
  });

  it("⚠️ AND A PUT-AWAY MATERIAL STILL HAS A WAY BACK", () => {
    /* v38: the Query letters / Synopses tables are gone; Your materials (the builder) lists put-away ones on request */
    const table = decls(read("../components/packages/v26/Pk26Builder.tsx"));
    expect(table).toContain("model.lettersAll.filter((m) => m.retired)");
    expect(table).toContain("model.synopsesAll.filter((m) => m.retired)");
    expect(table).toContain("<em>Put away</em>");
    expect(table).toContain("onOpenMaterial(lib as \"let\" | \"syn\", m.id)");
    const drawer = decls(read("../components/packages/v26/Pk26Drawer.tsx"));
    expect(drawer).toMatch(/data-pk26=\{m\.retired \? "restore" : "put-away"\}/);
    expect(drawer).toContain("if (m.retired) await model.bringBack(m)");
  });
});

describe("every entry point names its type (D3)", () => {
  /**
   * ⚠️ THE COLUMN'S `+ ADD` AND ITS GHOST MUST BOTH CARRY THE TYPE. A ghost wired to a type-less add
   * would drop the writer on the type-picker under a heading that already said which type they
   * wanted — the exact step the per-column entry exists to skip.
   */

  /* ⚠️ RETARGETED ONTO PACKAGES v2: every `+ Add` names its kind, and the modal is keyed on it, so
     a Letters add after a Synopses add is a fresh mount, never a stale draft. */
  /* v26 (25 Oct): Your materials' "+ Write or paste…" and the tables' "+ Add" both name their kind, and the drawer's
     form is keyed on the material it edits (or on the kind it adds), so a second letter is a fresh mount. */
  it("every + Add names its kind, and the drawer's form is keyed on it", () => {
    expect(decls(read("../components/packages/v26/Pk26Builder.tsx"))).toContain("onClick={() => onNewMaterial(lib)}");
    /* v38: the Query letters / Synopses tables (and their + Add) are gone; Your materials' + Add is the one route */
    expect(decls(page)).toContain('setDrawer(k === "ver" ? { m: "newver", parentId: null } : { m: "newmat", kind: k })');
    expect(decls(read("../components/packages/v26/Pk26Drawer.tsx"))).toContain("key={view.m === \"mat\" ? view.id : `new-${view.kind}`}");
  });
});


