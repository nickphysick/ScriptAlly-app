/**
 * ⚠️ THE PLAN IS THE THING THAT MUST BE RIGHT, BECAUSE IT WRITES TO REAL DOCUMENTS.
 *
 * Two claims, and they pull in opposite directions on purpose: every sample the writer wrote is
 * ARCHIVED (never dropped, never deleted), and NO package is written at all. A test that only
 * counted the archive list would pass on a plan that also rewrote every package.
 */
import { describe, it, expect } from "vitest";
import { planSampleRetirement, retirementReport } from "./retireSamples";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../types";

const mat = (id: string, type: ComponentType, status?: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: type, versionName: id,
     fileAttached: false, createdDate: "", ...(status ? { status } : {}) } as ManuscriptVersion);

const pkg = (id: string, sample: string): SubmissionPackage =>
  ({ id, userId: "u", manuscriptId: "m1", packageName: id, queryLetterVersionId: "ql",
     synopsisVersionId: "", samplePagesVersionId: sample, createdDate: "" } as SubmissionPackage);

const MATS = [
  mat("ql1", ComponentType.QUERY_LETTER),
  mat("syn1", ComponentType.SYNOPSIS),
  mat("pag1", ComponentType.SAMPLE_PAGES),
  mat("pag2", ComponentType.SAMPLE_PAGES),
  mat("pag3", ComponentType.SAMPLE_PAGES, "Retired"),
];
const PKGS = [pkg("p1", "pag1"), pkg("p2", ""), pkg("p3", "pag2")];

describe("planSampleRetirement", () => {
  it("archives every sample that is not already archived, and nothing else", () => {
    const p = planSampleRetirement(MATS, PKGS);
    expect(p.archive).toEqual(["pag1", "pag2"]);
    /* the letter and the synopsis are the writer's too, and are not this change's business */
    expect(p.archive).not.toContain("ql1");
    expect(p.archive).not.toContain("syn1");
  });

  it("⚠️ counts the already-archived rather than silently skipping them", () => {
    /* A plan that just filtered them out would report the same number on a first and a second run,
       so nothing would say whether the run had done anything. */
    expect(planSampleRetirement(MATS, PKGS).alreadyArchived).toBe(1);
  });

  it("⚠️ is safe to run twice — a second pass plans no writes", () => {
    const after = MATS.map((m) =>
      m.componentType === ComponentType.SAMPLE_PAGES
        ? ({ ...m, status: "Retired" } as ManuscriptVersion) : m);
    expect(planSampleRetirement(after, PKGS).archive).toEqual([]);
    expect(planSampleRetirement(after, PKGS).alreadyArchived).toBe(3);
  });

  it("⚠️ REPORTS the packages holding a sample slot and writes none of them (D10)", () => {
    /**
     * The count exists so a run can be checked against the recon's prediction — D10's red gate.
     * The absence of a write is the actual guarantee, and it is structural: the plan has no field
     * in which to put a package mutation. `""` is the unfilled sentinel, so p2 is not affected.
     */
    const p = planSampleRetirement(MATS, PKGS);
    expect(p.packagesAffected).toEqual(["p1", "p3"]);
    expect(Object.keys(p).sort()).toEqual(["alreadyArchived", "archive", "packagesAffected"]);
  });

  it("the report states both figures, and says no package is written", () => {
    const line = retirementReport(planSampleRetirement(MATS, PKGS));
    expect(line).toContain("2 materials archived");
    expect(line).toContain("(1 already)");
    expect(line).toContain("2 packages");
    expect(line).toContain("no package document is written");
  });

  it("singulars agree with their verbs", () => {
    const one = [mat("pag1", ComponentType.SAMPLE_PAGES)];
    expect(retirementReport(planSampleRetirement(one, [pkg("p1", "pag1")])))
      .toContain("1 material archived");
    expect(retirementReport(planSampleRetirement(one, [pkg("p1", "pag1")])))
      .toContain("1 package");
  });
});
