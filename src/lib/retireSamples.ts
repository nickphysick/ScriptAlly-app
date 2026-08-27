/**
 * ⚠️ RETIRING SAMPLE PAGES AS A MATERIAL TYPE (D9, D10) — and what "retire" is allowed to mean.
 *
 * A package is a covering letter, a synopsis and a version. The portion that actually went is the
 * agency's decision and is recorded on the QUERY, so the writer's own "sample pages" material has
 * nothing left to be: it is not a package slot, and it is not what any scorecard reads.
 *
 * ⚠️ THE MATERIALS ARE ARCHIVED, NEVER DELETED. The writer wrote that text. Archiving puts it in
 * the shelf's archive drawer where they can still read and restore it; deleting it would take a
 * piece of their own writing away to tidy a model.
 *
 * ⚠️ AND NO PACKAGE DOCUMENT IS REWRITTEN — D10 IS A SLOT-LEVEL RETIREMENT, NOT A MIGRATION. The
 * rules freeze a sent package's slots once `firstSentAt` exists, and the reason is the merits
 * rather than the mechanism: every query that used that package keeps reporting what the agent
 * actually received. Dropping the sample slot from a package that has gone out would change that
 * record — the one thing the lock exists to prevent — and on the dev fixture two of three packages
 * were locked, so most of the writes would have been denied as well as wrong.
 *
 * So the stored `samplePagesVersionId` stays exactly where it is on every package, and stops being
 * READ: it is not in `PACKAGE_SLOTS`, not in the builder, not in the ledger, not in any
 * aggregation. `isValidPackage` still requires the key, so the create path still writes `""`.
 */
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../types";
import { isSlotFilled } from "./packageMetrics";

export interface SampleRetirementPlan {
  /** Material ids to archive — samples not already retired. */
  archive: string[];
  /** Packages whose sample slot is filled: what they hold stops being read (nothing is written). */
  packagesAffected: string[];
  /** Already archived — reported so a second run is visibly a no-op rather than a silent one. */
  alreadyArchived: number;
}

/**
 * ⚠️ SAFE TO RUN TWICE. It only ever selects samples that are not already `Retired`, so a second
 * pass plans nothing; and because it writes no package, there is no package state to make
 * idempotent in the first place.
 */
export const planSampleRetirement = (
  materials: readonly ManuscriptVersion[],
  packages: readonly SubmissionPackage[],
): SampleRetirementPlan => {
  const samples = materials.filter((m) => m.componentType === ComponentType.SAMPLE_PAGES);
  return {
    archive: samples.filter((m) => m.status !== "Retired").map((m) => m.id),
    alreadyArchived: samples.filter((m) => m.status === "Retired").length,
    packagesAffected: packages.filter((p) => isSlotFilled(p.samplePagesVersionId)).map((p) => p.id),
  };
};

/** What the console prints, so a run can be checked against the recon's prediction (D10's gate). */
export const retirementReport = (p: SampleRetirementPlan): string =>
  `[ScriptAlly] sample-pages retirement — ${p.archive.length} material${p.archive.length === 1 ? "" : "s"} archived`
  + ` (${p.alreadyArchived} already), ${p.packagesAffected.length} package${p.packagesAffected.length === 1 ? "" : "s"}`
  + ` hold a sample slot that is no longer read (no package document is written)`;
