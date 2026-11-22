/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS IN THE QUERY CENTRE — everything derived, nothing stored ═════════════════════════
 *
 * Design authority: design-refs/query-centre-version-impact.html.
 *
 * ⚠️ REVERSED BY VERSIONS v2 (D3/D4): A QUERY NOW STORES THE BOOK VERSION IT WENT WITH (`Query.bookVersionId`),
 * and `resolveQueryVersion` in lib/versionsV2.ts is the one reader of which version went. The lines below are the
 * pre-v2 reasoning, kept as history; `VersionLines` now reads the resolver for "Opening read".
 *
 * (History) NOTHING HERE IS STORED ON A QUERY (D5). "Opening read" is the version on the sample in the
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
import { bookVersionById, isSendStatus, readVersions, versionsActive } from "./bookVersions";
import { resolveQueryVersion } from "./versionsV2";

/**
 * The version that went with this query — VERSIONS v2: the shared resolver, `resolveQueryVersion` (D4: the query's
 * own `bookVersionId`, then its package's version, then Original by date, else unrecorded). The name "opening read"
 * is kept so every caller (the reading pane's "Opening read" line, the send flow's default) reads the one answer.
 *
 * (History) It used to reach the version only through the package's sample. That route is still inside the resolver,
 * third in its package step.
 */
export const openingRead = (
  query: Pick<Query, "packageId"> & Partial<Query>,
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
  versions: readonly BookVersion[],
): BookVersion | null => {
  const r = resolveQueryVersion(query as Query, readVersions({ bookVersions: versions as BookVersion[] }), packages, materials);
  return r ? bookVersionById(versions, r.id) : null;
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
 * The version chip for a row in the query list (D8), and the version filter's predicate (D11).
 *
 * ⚠️ VERSIONS v2 (D4) — IT IS THE SHARED RESOLVER NOW, NOT "HELD WINS OVER READ". The filter must keep exactly the
 * queries the Versions page counts for a version, and the chip must show the version the filter selects by; both read
 * `resolveQueryVersion`. What the agent HOLDS after a full or partial send is still its own line in the reading pane
 * (`manuscriptHeld`), a different fact. `activities` stays in the signature so no caller changes.
 */
export const listVersion = (
  query: Pick<Query, "id" | "packageId"> & Partial<Query>,
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
  _activities: readonly Activity[],
  versions: readonly BookVersion[],
): BookVersion | null => openingRead(query, packages, materials, versions);

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

/**
 * The filter's sentinel for "no version recorded" (D11).
 *
 * ⚠️ IT IS A NAMED CONSTANT, NOT `null` OR `""`. The filter's resting state is `null` — not
 * filtering at all — and a writer asking for the queries whose version is unknown is asking a real
 * question that deserves its own value. Collapsing the two would make the resting list mean "show me
 * the ones I know nothing about", which is the same fault class as folding an unknown into a known.
 */
export const UNRECORDED_VERSION = "__unrecorded__";
