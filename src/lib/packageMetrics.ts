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
import { Manuscript, ManuscriptVersion, SubmissionPackage, Query, QueryStatus, QueryMaterial, ComponentType } from "../types";

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

/**
 * "In flight" = the send is still awaiting the agent's first move — Queried, with no request or
 * response recorded yet. The moment any outcome lands (a request, a rejection, a withdrawal, or a
 * no-response close) the query is "resolved". Per the redesign's locked decision, in-flight queries
 * are shown separately and EXCLUDED from rate denominators, so a package isn't dragged down by sends
 * that simply haven't had time to come back. (A Partial/Full Sent already counts as a request, so it
 * is resolved, not in flight — isResponse short-circuits it here.)
 */
export const isInFlight = (q: Query): boolean => q.status === QueryStatus.QUERIED && !isResponse(q);

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

/**
 * Resolved-aware performance for a package — the shape the redesign's spotlight, shelf and per-package
 * funnel consume. Same raw counts as packageMetrics, plus the in-flight split: `inFlight` Queried sends
 * are held back, and the *Resolved rates divide requests/responses by `resolved` (= sent − inFlight)
 * rather than by every send. This is the single source of truth for the locked "rates over resolved
 * queries only" decision; the legacy Performance view still reads packageMetrics' sent-denominator
 * rates, so the two are intentionally distinct (see RECON note).
 */
export interface PackageFunnel extends RateStat {
  inFlight: number; // Queried, awaiting the agent's first move — excluded from the resolved rates
  resolved: number; // sent − inFlight
  requestRateResolved: number | null; // requests / resolved  (null when resolved === 0)
  responseRateResolved: number | null; // responses / resolved
}

const funnelFor = (S: Query[]): PackageFunnel => {
  const base = statsFor(S);
  const inFlight = S.filter(isInFlight).length;
  const resolved = base.sent - inFlight;
  return {
    ...base,
    inFlight,
    resolved,
    requestRateResolved: rate(base.requests, resolved),
    responseRateResolved: rate(base.responses, resolved),
  };
};

/** Resolved-aware performance for one package (queries whose packageId === pkgId). */
export function packageFunnel(pkgId: string, queries: Query[]): PackageFunnel {
  return funnelFor(queries.filter((q) => q.packageId === pkgId));
}

/** Full-or-beyond: the agent asked for the full manuscript (or went further). Exact enum strings. */
const FULL_OR_BEYOND: ReadonlySet<QueryStatus> = new Set<QueryStatus>([
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
]);
/** Did this query reach a full request (or beyond)? Current status OR a recorded full-request date. */
export const reachedFull = (q: Query): boolean => FULL_OR_BEYOND.has(q.status) || !!q.fullRequestedDate;

export interface PackageStages {
  queried: number; // resolved sends (in-flight held out) — the funnel's mouth
  responded: number; // the agent replied
  partial: number; // reached a partial request (or beyond)
  full: number; // reached a full request (or beyond)
  offer: number; // reached an offer
}

/**
 * Cumulative pipeline counts over a package's RESOLVED queries, for the detail-screen funnel. Each
 * stage counts queries that reached AT LEAST that depth, so the series is monotonically non-increasing
 * (queried ≥ responded ≥ partial ≥ full ≥ offer) and the funnel never widens. In-flight (Queried,
 * unanswered) sends are excluded — they join the funnel once an outcome lands.
 */
export function packageStages(pkgId: string, queries: Query[]): PackageStages {
  const S = queries.filter((q) => q.packageId === pkgId && !isInFlight(q));
  return {
    queried: S.length,
    responded: S.filter(isResponse).length,
    partial: S.filter(isRequest).length,
    full: S.filter(reachedFull).length,
    offer: S.filter((q) => q.status === QueryStatus.OFFER).length,
  };
}

/**
 * Average whole-days from send to the agent's FIRST move (a partial/full request or a rejection),
 * over a package's responded queries that carry both a send date and a first-move date. null when none
 * qualify. Uses Date.parse (not Date.now) so it stays pure/deterministic.
 */
export function avgReplyDays(pkgId: string, queries: Query[]): number | null {
  const spans: number[] = [];
  for (const q of queries) {
    if (q.packageId !== pkgId || !isResponse(q) || !q.dateSent) continue;
    const acts = [q.partialRequestedDate, q.fullRequestedDate, q.rejectedDate].filter(Boolean) as string[];
    if (!acts.length) continue;
    const sent = Date.parse(q.dateSent);
    const first = Math.min(...acts.map((d) => Date.parse(d)));
    if (!Number.isFinite(sent) || !Number.isFinite(first) || first < sent) continue;
    spans.push((first - sent) / 86400000);
  }
  return spans.length ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : null;
}

/** A package slot (`queryLetterVersionId` / `synopsisVersionId` / `samplePagesVersionId`) holds a
 *  version-id reference, or the empty string when unfilled. `isValidPackage` (firestore.rules) requires
 *  all three slot keys to be PRESENT, so a package write must send `UNFILLED_SLOT` for an empty slot —
 *  never omit the key. Single source of the sentinel: the composer and the future attach-flow read /
 *  write through it rather than rediscovering `""`. */
export const UNFILLED_SLOT = "";
export const isSlotFilled = (id: string | null | undefined): id is string => !!id && id !== UNFILLED_SLOT;

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

/** Minimum sends before a package/version earns a "best" / "Top performer" crown or a directional
 *  insight. Below this a lucky 1-of-1 reads as 100% and would crown itself — worse than silence for a
 *  feature whose pitch is trustworthy strategy. Below the threshold: still show the rate, withhold the
 *  crown/recommendation (label it "early"). Used by the Performance tab; the raw rates are unaffected. */
export const MIN_SENDS_FOR_CLAIM = 4;
export const meetsSampleThreshold = (sent: number): boolean => sent >= MIN_SENDS_FOR_CLAIM;

/** "—" when there's no data, else a whole-percent string. */
export const formatRate = (r: number | null): string => (r === null ? "—" : `${Math.round(r * 100)}%`);

/** Bar width as a CSS percentage string; a 0%/null bar still shows a sliver so the track reads. */
export const barWidth = (r: number | null): string => (r === null ? "0%" : `${Math.max(2, Math.round(r * 100))}%`);

// ── Cross-package leaderboard — the "See what wins" analytics. All derived at read time from the
//    same queries/packages/versions; nothing here is stored, and MIN_SENDS_FOR_CLAIM gates every claim.

/** Aggregate performance over every query attached to ANY of the given packages — the page headline. */
export function overallAttachStats(packages: SubmissionPackage[], queries: Query[]): RateStat {
  const ids = new Set(packages.map((p) => p.id));
  return statsFor(queries.filter((q) => !!q.packageId && ids.has(q.packageId)));
}

export interface RankedPackage {
  pkg: SubmissionPackage;
  stat: RateStat;
  /** True once this package has enough sends (MIN_SENDS_FOR_CLAIM) to carry a "best" claim. */
  ranked: boolean;
}

/**
 * Packages ordered by request rate (desc), then sent (desc), then name — the leaderboard. A package
 * with no sends (null rate) sinks below any that has data. `ranked` flags whether each meets the
 * sample threshold so the view can crown only trustworthy leaders. Pure — never mutates the input.
 */
export function rankPackagesByRequests(packages: SubmissionPackage[], queries: Query[]): RankedPackage[] {
  return packages
    .map((pkg) => {
      const stat = packageMetrics(pkg.id, queries);
      return { pkg, stat, ranked: meetsSampleThreshold(stat.sent) };
    })
    .sort((a, b) => {
      const ra = a.stat.requestRate;
      const rb = b.stat.requestRate;
      const byRate = ra === null && rb === null ? 0 : ra === null ? 1 : rb === null ? -1 : rb - ra;
      return byRate || b.stat.sent - a.stat.sent || a.pkg.packageName.localeCompare(b.pkg.packageName);
    });
}

/** The strongest package: the highest-request-rate package that MEETS the sample threshold. Null when
 *  none has enough sends to crown — the view then stays in its "keep attaching" state. */
export function strongestPackage(packages: SubmissionPackage[], queries: Query[]): RankedPackage | null {
  const top = rankPackagesByRequests(packages, queries).find((r) => r.ranked && r.stat.requestRate !== null);
  return top ?? null;
}

export interface BestOfType {
  version: ManuscriptVersion;
  stat: RateStat;
}

/** The best-performing version of one type by request rate, among versions with enough sends. Null
 *  when the type has no threshold-meeting version yet (so the view shows "not enough sends" for it). */
export function bestVersionOfType(
  type: ComponentType,
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
  queries: Query[],
): BestOfType | null {
  let best: BestOfType | null = null;
  let bestRate = -1;
  for (const v of versions) {
    if (v.componentType !== type) continue;
    const stat = componentMetrics(v.id, packages, queries);
    if (!meetsSampleThreshold(stat.sent) || stat.requestRate === null) continue;
    if (stat.requestRate > bestRate || (best !== null && stat.requestRate === bestRate && stat.sent > best.stat.sent)) {
      best = { version: v, stat };
      bestRate = stat.requestRate;
    }
  }
  return best;
}

/** The version of a type used in the most packages — the de-facto "default" material (the one reached
 *  for most). Null when no version of the type is used anywhere, or when the top usage is TIED (no
 *  single default to star). Derived from package membership, not a stored flag. */
export function mostUsedVersionOfType(
  type: ComponentType,
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
): ManuscriptVersion | null {
  const scored = versions
    .filter((v) => v.componentType === type)
    .map((v) => ({ v, n: packagesUsingVersion(v.id, packages).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[1].n === scored[0].n) return null; // tie → no single default
  return scored[0].v;
}

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

/**
 * Guard #1 — persist exactly ONE source of truth for a query's materials. An attached package and
 * free-text materials are mutually exclusive: write the package link OR the free-text materials,
 * never both, and always clear the other. Every query-log save path runs through this so an
 * agent-seeded materialsWanted can never sit stale behind a packageId.
 */
export function materialsLinkWrites(args: { packageId: string; materials: (string | QueryMaterial)[] }): {
  packageId: string;
  materialsWanted: (string | QueryMaterial)[];
} {
  return args.packageId
    ? { packageId: args.packageId, materialsWanted: [] } // package attached → clear free text
    : { packageId: "", materialsWanted: args.materials }; // free text → clear the package link
}

/**
 * Edit-save gating. When the user touched the materials OR the package link this session, persist
 * guard #1 (materialsLinkWrites — write one, clear the other). When UNtouched, return {} so the edit
 * omits both keys entirely and the stored values are preserved verbatim (updateQuery merges) — this
 * is what makes a status-only / notes-only edit of a packaged query keep its packageId, and a
 * touch-nothing edit keep both.
 */
export function editMaterialsUpdate(args: { touched: boolean; packageId: string; materials: (string | QueryMaterial)[] }): Partial<{
  packageId: string;
  materialsWanted: (string | QueryMaterial)[];
}> {
  return args.touched ? materialsLinkWrites({ packageId: args.packageId, materials: args.materials }) : {};
}

/**
 * Resolve a manuscript's chosen active package to a live SubmissionPackage. Returns null when there
 * is none, or when the stored activePackageId points at a package that is retired, missing, or belongs
 * to a different manuscript — so the UI/prefill degrade gracefully ("no active yet") and never link a
 * stale or cross-manuscript package. The app never sets active automatically; this only reads it.
 */
export function resolveActivePackage(manuscript: Manuscript | null | undefined, packages: SubmissionPackage[]): SubmissionPackage | null {
  const id = manuscript?.activePackageId;
  if (!id) return null;
  return packages.find((p) => p.id === id && p.manuscriptId === manuscript!.id && p.status !== "Retired") ?? null;
}
