/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission-package performance — the DERIVED layer. Nothing here is stored: every number is
 * computed from the live queries + their attached package + the package's component versions.
 * No denormalised stat fields, no outcome logging.
 *
 * A query is linked to a package by the existing `Query.packageId` field (written today by the
 * log-query flow). Performance for a package is computed over the set S of queries whose
 * packageId === that package; performance for a single component version is computed over the
 * union of queries whose attached package references that version.
 *
 * Metric definitions (S = the query set):
 *   sent      = |S|
 *   responses = queries in S where the agent responded — the canonical derived flag
 *               `hasAgentResponded` (set by recomputeQuery from AGENT_RESPONSE_STATUSES).
 *   requests  = queries in S that reached an agent materials-request — "Partial Requested /
 *               Full Requested and beyond" (request-or-beyond status, OR a recorded
 *               partial/full request date so it still counts after a later rejection).
 *   requestRate  = requests / sent   (null when sent === 0 → rendered as "—")
 *   responseRate = responses / sent  (null when sent === 0 → rendered as "—")
 */
import { ManuscriptVersion, SubmissionPackage, Query, QueryStatus } from "../types";

/** Request-or-beyond statuses: the agent asked for materials (or went further). Exact enum strings. */
const REQUEST_OR_BEYOND: ReadonlySet<QueryStatus> = new Set<QueryStatus>([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
]);

/** Did the agent request materials at any point? Current status OR a recorded request date
 *  (the dates are derived by recomputeQuery and survive a later rejection/withdrawal). */
export const isRequest = (q: Query): boolean =>
  REQUEST_OR_BEYOND.has(q.status) || !!q.partialRequestedDate || !!q.fullRequestedDate;

/**
 * Did the agent respond? Defined LOCALLY as hasAgentResponded OR isRequest, so anything counted as
 * a request is guaranteed to count as a response (requests ⊆ responses). Without this, "Partial Sent"
 * / "Full Sent" count as requests but are absent from the global AGENT_RESPONSE_STATUSES set, so such
 * a query would be a request that isn't a response — under-counting responses and letting a package's
 * Requests bar render longer than its Responses bar. The global hasAgentResponded under-count is a
 * separate, known standing fix; this widening is intentionally scoped to the package engine only.
 */
export const isResponse = (q: Query): boolean => q.hasAgentResponded === true || isRequest(q);

export interface RateStat {
  sent: number;
  requests: number;
  responses: number;
  requestRate: number | null; // null === no data (sent 0) → render "—"
  responseRate: number | null;
}

const rate = (n: number, d: number): number | null => (d > 0 ? n / d : null);

const statsFor = (S: Query[]): RateStat => {
  const sent = S.length;
  const requests = S.filter(isRequest).length;
  const responses = S.filter(isResponse).length;
  return { sent, requests, responses, requestRate: rate(requests, sent), responseRate: rate(responses, sent) };
};

/** Performance for one package: queries whose packageId === pkgId. */
export function packageMetrics(pkgId: string, queries: Query[]): RateStat {
  return statsFor(queries.filter((q) => q.packageId === pkgId));
}

/** Active packages that reference a given component version (any of the three slots). */
export function packagesUsingVersion(versionId: string, packages: SubmissionPackage[]): SubmissionPackage[] {
  return packages.filter(
    (p) =>
      p.queryLetterVersionId === versionId ||
      p.synopsisVersionId === versionId ||
      p.samplePagesVersionId === versionId,
  );
}

/** Performance for one component version: union of queries whose attached package uses it. */
export function componentMetrics(versionId: string, packages: SubmissionPackage[], queries: Query[]): RateStat {
  const pkgIds = new Set(packagesUsingVersion(versionId, packages).map((p) => p.id));
  return statsFor(queries.filter((q) => !!q.packageId && pkgIds.has(q.packageId)));
}

/** "—" when there's no data, else a whole-percent string. */
export const formatRate = (r: number | null): string => (r === null ? "—" : `${Math.round(r * 100)}%`);

/** Bar width as a CSS percentage string; a 0%/null bar still shows a sliver so the track reads. */
export const barWidth = (r: number | null): string => (r === null ? "0%" : `${Math.max(2, Math.round(r * 100))}%`);

// ── Derived display strings — snippet/meta come from the version's own content, never stored ──

const WORD_RE = /\S+/g;

/** Short italic preview for a version row: the first line (or first ~120 chars) of its draft. */
export function versionSnippet(v: ManuscriptVersion): string | null {
  const text = (v.contentDraft ?? "").trim();
  if (!text) return null;
  const firstLine = text.split(/\r?\n/)[0].trim() || text;
  return firstLine.length > 120 ? `${firstLine.slice(0, 119).trimEnd()}…` : firstLine;
}

/** Derived meta for a version row: a word count from its draft, else its attached file name. */
export function versionMeta(v: ManuscriptVersion): string | null {
  const text = (v.contentDraft ?? "").trim();
  if (text) {
    const words = (text.match(WORD_RE) ?? []).length;
    if (words > 0) return `~${words.toLocaleString()} word${words === 1 ? "" : "s"}`;
  }
  if (v.fileAttached && v.fileName) return v.fileName;
  return null;
}
