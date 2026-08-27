/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SAMPLES REFERENCE A VERSION (Part C) ══════════════════════════════════════════════════════
 *
 * Design authority: design-refs/manuscript-loop-design.html §3.
 *
 * ⚠️ D13 IS THE CONSTRAINT MOST LIKELY TO SLIP, AND MOST OF THIS FILE DEFENDS IT. Packages take NO
 * version field — not on the model, not in the builder, not on the card. They inherit through the
 * sample, so there is exactly ONE edge and the two can never disagree. The pull towards a second
 * edge is real: "versions inside packages" was the original suggestion, and adding a field there
 * would look like a convenience rather than the model breaking.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { materialColumns, materialShelf } from "./packagesOverview";
import { createPayload, updatePayload } from "./materialDraft";
import { ComponentType } from "../types";
import type { BookVersion, ManuscriptVersion, SubmissionPackage } from "../types";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const bv = (id: string, name: string): BookVersion =>
  ({ id, name, kind: "reordering", createdDate: "2026-05-01" });
const TWO = [bv("bv-a", "Prologue-first"), bv("bv-b", "Worldbuilding-first")];

const mat = (id: string, type: ComponentType, bookVersionId?: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: type, versionName: id,
     fileAttached: false, createdDate: "2026-03-01T00:00:00.000Z", bookVersionId } as ManuscriptVersion);

const sheetsFor = (mats: ManuscriptVersion[], versions: readonly BookVersion[]) =>
  materialShelf(mats, [] as SubmissionPackage[], versions);

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ D12 IS SUPERSEDED — the version chip belongs to the PACKAGE, not to a sample", () => {
  /**
   * ⚠️ RETARGETED, AND THE LAW IT NOW ASSERTS. These five cases guarded a chip on a SAMPLE's shelf
   * card, naming the ordering that sample excerpted, reached through `bookVersionOf(material)`.
   * Both halves of that construction have gone: sample pages is no longer a material type (D9), so
   * there is no card to hang it on, and the package states its version directly (D1), so there is
   * nothing left to inherit. The edge runs the short way round now.
   *
   * What survives — and is the part that would actually cause harm if lost — is that a version is
   * stated ONCE, from one source. `linkedChips` reads `pkg.bookVersionId`; nothing reads a
   * material's stored id to decide what a package carries.
   */
  it("the strip's chips come from the package's own slots, never through a material", () => {
    const src = decls(read("src/lib/packageAttach.ts"));
    const i = src.indexOf("export function linkedChips");
    expect(i, "linkedChips is gone").toBeGreaterThan(-1);
    const body = src.slice(i, src.indexOf("\n}", i));
    expect(body).toContain("pkg.bookVersionId");
    /* the inheritance is what must not come back */
    expect(body).not.toMatch(/bookVersionOf\s*\(/);
  });

  it("⚠️ a versionless package yields no version chip, rather than one reading Not recorded", () => {
    const src = decls(read("src/lib/packageAttach.ts"));
    const i = src.indexOf("export function linkedChips");
    const body = src.slice(i, src.indexOf("\n}", i));
    expect(body).toMatch(/if \(!pkg\.bookVersionId\) return items;/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ D11/D14 IS SUPERSEDED — the material editor's version field is permanently off", () => {
  /**
   * ⚠️ RETARGETED. The field asked which ordering a pasted SAMPLE excerpted, and appeared on sample
   * pages only, above two versions. Sample pages is not a material type any more (D9), so no path
   * can open the editor on one and the branch is unreachable.
   *
   * It is a named constant rather than deleted markup, deliberately: whoever removes the vestigial
   * `bookVersionId` from `ManuscriptVersion` (F-BH) needs to see what used to write it. Archived
   * samples still carry the stored id and are harmless; a migration that rewrites archived data is
   * not, which is why nothing cleans it up.
   */
  it("the branch is unreachable, and says so", () => {
    const src = decls(read("src/components/packages/MaterialModal.tsx"));
    expect(src).toMatch(/const showVersionField = false;/);
    expect(src).not.toMatch(/showVersionField\s*=\s*type === ComponentType\.SAMPLE_PAGES/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the aggregation's route from a package to a version", () => {
  /**
   * ⚠️ THIS CASE WAS ORPHANED — its `describe` had been consumed by an earlier edit, so it was not
   * collected and asserted nothing. Restored inside one, which is the only reason it is here in
   * this commit rather than in Part D's.
   *
   * ⚠️ AND IT IS ABOUT TO INVERT. Today `requestsByVersion` still walks sample material -> package
   * -> query, which is the three-hop route Part C leaves standing and D15 replaces with a direct
   * read of `pkg.bookVersionId`. The assertion is stated as it is TODAY so the flip is visible in
   * D15's diff rather than absorbed into it.
   */
  it("still reaches a package through its sample slot — until D15 repoints it", () => {
    const src2 = decls(read("src/lib/bookVersions.ts"));
    expect(src2).toContain("p.samplePagesVersionId");
    expect(src2).not.toMatch(/\bp\.bookVersionId\b/);
  });
});
