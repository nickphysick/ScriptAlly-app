/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE "WHAT WAS SENT" CORRECTION — moved out of EditJourney's commit (D7 §A4) for Query Centre v149, so the journey and
 * the query card's edit mode (C4: the package select and the pieces) write the same fields. The snapshot is REPLACED and
 * the old summary kept beside the correction; results move by themselves (worked out from the query, never stored on an
 * entry). The caller writes the returned fields with any others in one `updateQuery`, then reconciles the old package.
 */
import { deleteField } from "firebase/firestore";
import type { useScriptAllyDb } from "../db";
import type { Manuscript, Query } from "../../types";
import { packageVersion } from "../versionsV2";
import { blankSample, type Materials } from "./sample";
import { sentPieces, summaryWith, type EditionChoice } from "./packages";

type Db = ReturnType<typeof useScriptAllyDb>;
/** the new record: a package (id, edition, name) or chosen individually, with its frozen summary and versions */
export interface SentNext { sentHow: "package" | "individual"; id: string | null; edition: number | null; name: string | null; summary: string; versions: string[] }

export function sentCorrectionFields(db: Db, q: Query, ms: Manuscript | null, next: SentNext): Record<string, unknown> {
  const none = deleteField() as unknown as undefined;
  const extra: Record<string, unknown> = {
    sentHow: next.sentHow,
    packageId: next.id ?? "",
    sentPackageId: next.id ?? none,
    sentPackageEdition: next.edition ?? none,
    sentPackageName: next.id ? (next.name ?? none) : none,
    basedOnPackageId: none, basedOnPackageEdition: none, sentChanges: none,
    sentMaterials: next.summary,
    sentVersions: next.versions,
    sentCorrectedAt: new Date().toISOString(),
    sentCorrectedFrom: q.sentMaterials ?? "",
  };
  /* Versions v2 (D3) — a correction of what was sent is a correction of which book version went: the corrected
     package's version replaces the stored one. With no package, or a package stating none, the record stands. */
  if (next.id) {
    const pv = packageVersion({ ...q, sentHow: "package", packageId: next.id, sentPackageId: next.id, sentPackageEdition: next.edition ?? undefined } as Query, db.packages, db.versions);
    if (pv && (ms?.bookVersions ?? []).some((v) => v.id === pv)) extra.bookVersionId = pv;
  }
  return extra;
}

/* ── the new record, built once for the journey and the card ── */

/** a package edition chosen: its own pieces (never the live package's), the recorded sample portion kept */
export function packageNext(picked: EditionChoice, recordedPortion: string): SentNext {
  return {
    sentHow: "package", id: picked.id, edition: picked.edition, name: picked.name,
    summary: summaryWith([
      ...sentPieces({ ql: picked.ql, syn: picked.syn, s: { ...blankSample(), unit: "none" } }, { ...picked, bookVersion: null }).filter((x) => x.key !== "other"),
      ...(recordedPortion || picked.bookVersion ? [{ key: "sample" as const, label: "Sample", value: [recordedPortion, picked.bookVersion].filter(Boolean).join(" · ") }] : []),
      ...(picked.other ? [{ key: "other" as const, label: "Also", value: picked.other }] : []),
    ], picked.name, null),
    versions: [picked.qlId, picked.synId].filter((x): x is string => !!x),
  };
}

/** chosen individually: the pieces as answered, with the current letter and synopsis versions named */
export function individualNext(mat: Materials, qlV: { id: string; versionName?: string | null } | null | undefined, synV: { id: string; versionName?: string | null } | null | undefined, samplePortion?: string): SentNext {
  const pieces = sentPieces(mat, { qlVersion: qlV?.versionName ?? null, synVersion: synV?.versionName ?? null, bookVersion: null, other: null });
  /* the card keeps a recorded sample's own words (it cannot rebuild the Sample it was written from) */
  const withSample = samplePortion != null ? [...pieces.filter((x) => x.key !== "sample"), ...(samplePortion ? [{ key: "sample" as const, label: "Sample", value: samplePortion }] : [])] : pieces;
  return {
    sentHow: "individual", id: null, edition: null, name: null,
    summary: summaryWith(withSample, null, null),
    versions: [mat.ql ? qlV?.id : null, mat.syn ? synV?.id : null].filter((x): x is string => !!x),
  };
}
