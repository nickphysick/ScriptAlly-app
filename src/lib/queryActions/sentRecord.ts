/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HOW A QUERY'S MATERIALS WERE RECORDED — the one reader of the §C3 fields
 * (docs/contracts/package-editions.md). Every surface that asks "was this sent as a package, and
 * which edition?" asks here: the card chip, Tracking, the Birds-eye tooltip, the review, and the
 * Packages page's results.
 *
 * ⚠️ AN UNMIGRATED QUERY READS EXACTLY AS A MIGRATED ONE. The migration (tests/e2e/migrateSentHow.mjs)
 * writes `sentHow: 'package'` and edition 1 where a `packageId` exists and `'unrecorded'` elsewhere;
 * this function supplies those same defaults when the fields are absent. So the migration is a
 * tidy-up rather than a precondition, and prod reads correctly before it has run anywhere.
 *
 * ⚠️ WHAT WAS SENT IS A FROZEN SNAPSHOT. Nothing here reads a live package: the id and edition say
 * WHICH one, and `materials` says what it contained on the day.
 */
import type { Query } from "../../types";
import { readSummary } from "./packages";

export type SentHow = "package" | "individual" | "unrecorded";

export interface SentRecord {
  how: SentHow;
  /** The attached package — only when `how === "package"`. */
  packageId: string | null;
  edition: number | null;
  /** The package the writer started from before changing a piece — only when `how === "individual"`. */
  basedOnId: string | null;
  basedOnEdition: number | null;
  changes: string[];
  /** The readable summary, as it was on the day. Empty when nothing was recorded. */
  materials: string;
  versions: string[];
  correctedAt: string | null;
  correctedFrom: string | null;
  /** True when the §C3 fields are absent and this record is the migration's defaults. */
  inferred: boolean;
}

const edition = (n: unknown): number => (typeof n === "number" && Number.isInteger(n) && n >= 1 ? n : 1);

export function sentRecordOf(q: Partial<Pick<Query, "packageId" | "sentHow" | "sentPackageId" | "sentPackageEdition" | "basedOnPackageId" | "basedOnPackageEdition" | "sentChanges" | "sentMaterials" | "sentVersions" | "sentCorrectedAt" | "sentCorrectedFrom">>): SentRecord {
  const inferred = q.sentHow == null;
  /* The migration's defaults (Nick, 28 Sep): a packageId is a package; a snapshot with no package
     is INDIVIDUAL — a v1 "Custom" log recorded what went piece by piece; only a query with no
     snapshot at all (an import, or one written before snapshots) is unrecorded. */
  const how: SentHow = q.sentHow ?? (q.packageId ? "package" : q.sentMaterials ? "individual" : "unrecorded");
  const pkgId = how === "package" ? (q.sentPackageId || q.packageId || null) : null;
  const basedOnId = how === "individual" ? (q.basedOnPackageId || null) : null;
  return {
    how,
    packageId: pkgId,
    edition: pkgId ? edition(q.sentPackageEdition) : null,
    basedOnId,
    basedOnEdition: basedOnId ? edition(q.basedOnPackageEdition) : null,
    changes: basedOnId ? (q.sentChanges ?? []) : [],
    materials: q.sentMaterials ?? "",
    versions: q.sentVersions ?? [],
    correctedAt: q.sentCorrectedAt || null,
    correctedFrom: q.sentCorrectedFrom ?? null,
    inferred,
  };
}

/** Credited to this package edition (§C4): a package send, that id, that edition. */
export function creditedTo(q: Parameters<typeof sentRecordOf>[0], packageId: string, ed?: number): boolean {
  const r = sentRecordOf(q);
  return r.how === "package" && r.packageId === packageId && (ed == null || r.edition === ed);
}

/**
 * The treatment in WORDS, for a surface that can only carry text (the Birds-eye row's native
 * tooltip). The same three cases, the same order, as the chip in components/queryActions/SentHow.
 */
export function sentHowWords(q: Parameters<typeof sentRecordOf>[0], liveName?: string | null): string {
  const r = sentRecordOf(q);
  const sum = readSummary(r.materials);
  if (r.how === "package") return `Sent as the ${sum.packageName ?? liveName ?? "attached"} package`;
  if (r.how === "individual") return `Materials logged individually${r.basedOnId && sum.basedOnName ? `, based on ${sum.basedOnName}` : ""}`;
  return "Materials not recorded";
}
