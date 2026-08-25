/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS IN THE QUERY CENTRE — everything derived, nothing stored ═════════════════════════
 *
 * Design authority: design-refs/query-centre-version-impact.html.
 *
 * ⚠️ NOTHING HERE IS STORED ON A QUERY (D5). "Opening read" is the version on the sample in the
 * package that went out; "Manuscript held" is the version on the last full or partial sent. Both are
 * reads over records that already exist, so a query cannot drift out of step with the package it
 * used or the log it owns — the one-edge rule, one surface further along.
 *
 * ⚠️ AND `recomputeQuery` IS UNTOUCHED (D10). A version is payload on an activity. Nothing in this
 * module is read by the derivation and nothing in it may become so — locked in the test.
 *
 * ⚠️ UNRECORDED IS NOT ABSENT (D9). Every send made before this feature carries no version, which
 * makes "unrecorded" the ORDINARY case rather than the edge. Each function below returns `null` for
 * it and every caller states it; none folds it into a known.
 */
import { QueryStatus } from "../types";
import type { Activity, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { bookVersionOf, bookVersionById, isSendStatus, versionsActive } from "./bookVersions";

/**
 * The version the agent READ — the sample in the package this query went out with.
 *
 * ⚠️ IT REACHES THE VERSION THROUGH THE SAMPLE, NEVER THROUGH THE PACKAGE. A package carries no
 * version field anywhere in this app; it inherits one from the material it holds. That is the single
 * edge, and it is what stops a query, a package and a sample ever disagreeing about one fact.
 */
export const openingRead = (
  query: Pick<Query, "packageId">,
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
  versions: readonly BookVersion[],
): BookVersion | null => {
  if (!query.packageId) return null;
  const pkg = packages.find((p) => p.id === query.packageId);
  const sampleId = pkg?.samplePagesVersionId;
  if (!sampleId) return null;
  const sample = materials.find((m) => m.id === sampleId);
  return sample ? bookVersionById(versions, bookVersionOf(sample)) : null;
};

/**
 * The version the agent HOLDS — from the last full or partial sent on this query's log.
 *
 * ⚠️ THE LATEST SEND, NOT THE FIRST. A query can send a partial and later a full; what they hold is
 * the last thing that went. Reading the first would answer a question nobody asked.
 *
 * ⚠️ AND IT IS NULL UNTIL SOMETHING HAS BEEN SENT — which is not the same as "they hold nothing
 * recorded". The caller distinguishes: no send at all renders no line; a send with no version
 * renders the line and says the version is unrecorded.
 */
export const manuscriptHeld = (
  queryId: string,
  activities: readonly Activity[],
  versions: readonly BookVersion[],
): { sent: true; version: BookVersion | null } | null => {
  const sends = activities
    .filter((a) => a.queryId === queryId && isSendStatus(a.resultingStatus))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const last = sends[sends.length - 1];
  if (!last) return null;
  return { sent: true, version: bookVersionById(versions, last.bookVersionId ?? null) };
};

/**
 * What the two lines say about each other.
 *
 * ⚠️ THREE OUTCOMES, AND THE THIRD IS THE COMMON ONE (D9). `match` and `differs` are both claims
 * about two known versions; `unknown` is what every send made before this feature produces, and it
 * must never collapse into either. A missing version is not a match and it is not a difference.
 */
export type VersionMatch = "match" | "differs" | "unknown";

export const versionMatch = (
  read: BookVersion | null,
  held: BookVersion | null,
): VersionMatch => (read && held ? (read.id === held.id ? "match" : "differs") : "unknown");

/** The mark beside "Manuscript held". A difference is STATED and nothing more (D7). */
export const MATCH_NOTE: Record<VersionMatch, string | null> = {
  match: "matches what they read",
  /* ⚠️ NO VERB, NO PROMPT. Sending a revision can be deliberate; the app reports and stops. */
  differs: "Differs from what they read",
  /* ⚠️ SAID, NOT GUESSED. Silence here would read as agreement. */
  unknown: "Version not recorded",
};

/**
 * The version chip for a row in the query list (D8).
 *
 * ⚠️ HELD WINS OVER READ, per the ref: "the chip shows the version HELD where one has been sent,
 * otherwise the version READ". They are different facts and the more recent one is the answer to
 * "what has this agent got".
 */
export const listVersion = (
  query: Pick<Query, "id" | "packageId">,
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
  activities: readonly Activity[],
  versions: readonly BookVersion[],
): BookVersion | null =>
  manuscriptHeld(query.id, activities, versions)?.version
  ?? openingRead(query, packages, materials, versions);

/**
 * ⚠️ ONE GATE, READ FROM THE SHARED DERIVATION (D12). A writer with fewer than two versions sees no
 * chip, no dropdown, no column and no filters. Re-exported rather than restated so this surface
 * cannot invent its own threshold — which is exactly how two surfaces come to disagree about
 * whether a feature is switched on.
 */
export { versionsActive };

/**
 * The send flow's pre-filled default (D6): what they read.
 *
 * ⚠️ IT IS A DEFAULT, NOT A RECORD. The writer can change it, and changing it records a deliberate
 * difference — a fact worth keeping, not a mistake. Returning `""` where nothing is known is what
 * stops the form seeding an answer nobody gave: the standing rule that a value invented to fill a
 * hole in the model is indistinguishable from one a person supplied.
 */
export const sendVersionDefault = (read: BookVersion | null): string => read?.id ?? "";

/** The two send statuses this feature touches, and no others (D6). */
export const VERSIONED_SENDS: readonly QueryStatus[] = [QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT];
