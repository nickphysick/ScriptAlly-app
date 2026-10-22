/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS v1 — every figure the Versions page states, derived, nothing stored ═════════════════
 *
 * Design authority: design-refs/versions-v1/versions-v1.html (look and behaviour; its data is invented).
 *
 * ⚠️ ONE EDGE FROM A QUERY TO A BOOK VERSION, AND IT IS THE PACKAGES PAGE'S: `packageReplies.creditedSlot(q,
 *    "version", packages)` — the version the CREDITED EDITION of the package that went out stated. A query sent
 *    with no package, or whose edition stated no version, reaches NO version and is counted in no version's
 *    figures: only in the warning banner and the league's footer link. Folding it into a known version is the
 *    flattering, silent fault (lock B3).
 *    (`manuscriptSummary.queryVersionId` reads the package's CURRENT version instead; the two agree unless a
 *    package's version changed between editions.)
 * ⚠️ "ASKED FOR MORE" IS `packageResults.firstAnswer(...) === "request"`, read through `packageReplies.tally` — a
 *    request or an offer, the rule Analytics, Responses and the packages page all read. Never a status list here.
 * ⚠️ THE APP REPORTS, NEVER ADVISES: no sentence below tells a writer what to change in their book.
 */
import { QueryStatus } from "../types";
import type { BookVersion, Manuscript, Query, SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { bookVersionsOf, KIND_LABEL } from "./bookVersions";
import { creditedSlot, tally, MIN_SENDS_FOR_CLAIM, type Split } from "./packageReplies";
import { resolveActivePackage } from "./packageMetrics";
import { STATUS_ORDER } from "./statusOrder";
import { STAGE_NAME } from "./qcSummary";

export { MIN_SENDS_FOR_CLAIM };

/** The statuses a query is no longer live at (the StatusDot law folds them to one mark). */
export const CLOSED: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.SIGNED,
]);
export const isLive = (q: Pick<Query, "status">): boolean => !CLOSED.has(q.status);

/** The book version a query went out with, or null (no package, or its edition stated none). */
export const queryBookVersion = (q: Query, packages: SubmissionPackage[]): string | null =>
  creditedSlot(q, "version", packages)?.id ?? null;

/* ══ the versions, numbered ═══════════════════════════════════════════════════════════════════ */

export interface NumberedVersion { v: BookVersion; n: number; parent: BookVersion | null }

/**
 * Every saved version with its number (oldest is 1) and the one before it, NEWEST FIRST.
 * ⚠️ A version has no stored parent; "from {parent}" names the version saved before it, which is what the
 *    New version form offers as its base. The first one has none ("First version").
 */
export function numbered(ms: Pick<Manuscript, "bookVersions"> | null | undefined): NumberedVersion[] {
  const asc = [...bookVersionsOf(ms)].sort((a, b) => (a.createdDate < b.createdDate ? -1 : a.createdDate > b.createdDate ? 1 : 0));
  return asc.map((v, i) => ({ v, n: i + 1, parent: i > 0 ? asc[i - 1] : null })).reverse();
}

/** "Revision · from Fast-paced opening", or the kind alone for the first. */
export const kindLine = (nv: NumberedVersion): string =>
  nv.parent ? `${KIND_LABEL[nv.v.kind]} · from ${nv.parent.name}` : KIND_LABEL[nv.v.kind];

/* ══ the active version ═══════════════════════════════════════════════════════════════════════ */

/**
 * The version new queries send by default: the manuscript's ACTIVE PACKAGE (a live one, through
 * `resolveActivePackage`) and the version that package states. Nothing else is stored — and no field is added.
 */
export function activeVersionId(ms: Manuscript | null, packages: SubmissionPackage[]): string | null {
  return resolveActivePackage(ms, packages)?.bookVersionId || null;
}

/**
 * What choosing a version in the Change menu does: make a live package that states it the active package.
 * The newest such package, so a re-pick is stable. Null when no live package states it — the page then sends
 * the writer to Submission packages to make one (the package form lives on that page).
 */
export function packageForVersion(ms: Manuscript, versionId: string, packages: SubmissionPackage[]): SubmissionPackage | null {
  const mine = packages.filter((p) => p.manuscriptId === ms.id && p.status !== "Retired" && p.bookVersionId === versionId);
  if (!mine.length) return null;
  return [...mine].sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0))[0];
}

/* ══ per version ══════════════════════════════════════════════════════════════════════════════ */

export interface StatusGroup { status: QueryStatus; n: number; closed?: boolean; title: string }

/** One group per status present, in pipeline order, the closed set folded to one (StatusDot law). */
export function statusGroups(qs: readonly Query[]): StatusGroup[] {
  const out: StatusGroup[] = [];
  for (const s of STATUS_ORDER) {
    const n = qs.filter((q) => q.status === s).length;
    if (n) out.push({ status: s, n, title: STAGE_NAME[s] ?? s });
  }
  const closed = qs.filter((q) => CLOSED.has(q.status));
  if (closed.length) {
    const parts: string[] = [];
    const c = (s: QueryStatus) => closed.filter((q) => q.status === s).length;
    if (c(QueryStatus.REJECTED)) parts.push(`${c(QueryStatus.REJECTED)} passed`);
    if (c(QueryStatus.NO_RESPONSE)) parts.push(`${c(QueryStatus.NO_RESPONSE)} no reply`);
    if (c(QueryStatus.WITHDRAWN)) parts.push(`${c(QueryStatus.WITHDRAWN)} withdrawn`);
    if (c(QueryStatus.SIGNED)) parts.push(`${c(QueryStatus.SIGNED)} signed`);
    out.push({ status: QueryStatus.REJECTED, n: closed.length, closed: true, title: `Closed: ${parts.join(", ")}` });
  }
  return out;
}

export interface VersionStats {
  nv: NumberedVersion;
  queries: Query[];
  split: Split;
  /** requests ÷ sent, 0–100 rounded, or null when unsent */
  askedPct: number | null;
  /** mean days to the first reply over the replies that have a date, or null */
  avgReply: number | null;
  /** how many replies that mean is over */
  replyN: number;
  firstSentMs: number | null;
  groups: StatusGroup[];
}

export function versionStats(
  nvs: NumberedVersion[], packages: SubmissionPackage[], queries: Query[], rows: Map<string, AnalyticsRow>,
): VersionStats[] {
  return nvs.map((nv) => {
    const qs = queries.filter((q) => queryBookVersion(q, packages) === nv.v.id);
    const split = tally(qs, rows);
    const days = qs.map((q) => rows.get(q.id)?.replyDays).filter((d): d is number => typeof d === "number");
    const sentMs = qs.map((q) => rows.get(q.id)?.sentMs).filter((d): d is number => typeof d === "number");
    return {
      nv, queries: qs, split,
      askedPct: split.sent ? Math.round((split.requests / split.sent) * 100) : null,
      avgReply: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
      replyN: days.length,
      firstSentMs: sentMs.length ? Math.min(...sentMs) : null,
      groups: statusGroups(qs),
    };
  });
}

/**
 * The version "landing best": the highest request rate (requests ÷ sent) among versions with at least
 * MIN_SENDS_FOR_CLAIM answered. Null on a tie or when none qualifies — nothing is crowned on a small sample.
 */
export function leader(stats: VersionStats[]): VersionStats | null {
  const ok = stats.filter((s) => s.split.answered >= MIN_SENDS_FOR_CLAIM && s.split.sent > 0);
  if (!ok.length) return null;
  const rate = (s: VersionStats) => s.split.requests / s.split.sent;
  const best = Math.max(...ok.map(rate));
  const top = ok.filter((s) => rate(s) === best);
  return top.length === 1 ? top[0] : null;
}

/** The cards' order: sent versions by requests (then rate, then newest), unsent last (newest first). */
export function cardOrder(stats: VersionStats[]): VersionStats[] {
  const sent = stats.filter((s) => s.split.sent > 0);
  const unsent = stats.filter((s) => s.split.sent === 0);
  const r = (s: VersionStats) => (s.split.sent ? s.split.requests / s.split.sent : 0);
  sent.sort((a, b) => b.split.requests - a.split.requests || r(b) - r(a) || b.nv.n - a.nv.n);
  return [...sent, ...unsent];
}

/* ══ the league ═══════════════════════════════════════════════════════════════════════════════ */

export type LeagueKey = "sent" | "replies" | "rate" | "requests" | "avg";

/**
 * Sort the league. Rows under MIN_SENDS_FOR_CLAIM answered ALWAYS come after the rest whatever the key — a rate
 * on three answers is listed, never compared. Within each part, descending (avg: ascending — faster first),
 * missing values last.
 */
export function leagueSort(stats: VersionStats[], key: LeagueKey): VersionStats[] {
  const val = (s: VersionStats): number | null => {
    if (key === "sent") return s.split.sent || null;
    if (key === "replies") return s.split.sent ? s.split.replies : null;
    if (key === "rate") return s.split.rate;
    if (key === "requests") return s.split.sent ? s.split.requests : null;
    return s.avgReply;
  };
  const cmp = (a: VersionStats, b: VersionStats) => {
    const x = val(a), y = val(b);
    if (x == null && y == null) return b.nv.n - a.nv.n;
    if (x == null) return 1;
    if (y == null) return -1;
    return key === "avg" ? x - y : y - x || b.nv.n - a.nv.n;
  };
  const full = stats.filter((s) => s.split.answered >= MIN_SENDS_FOR_CLAIM).sort(cmp);
  const thin = stats.filter((s) => s.split.answered < MIN_SENDS_FOR_CLAIM).sort(cmp);
  return [...full, ...thin];
}

export interface LeagueLead {
  requests: number; sent: number; ratePct: number | null;
  highest: VersionStats | null; fastest: VersionStats | null; mostSent: VersionStats | null;
}

/** The four lead cells — every figure the sum of the rows below them (lock D3). */
export function leagueLead(stats: VersionStats[]): LeagueLead {
  const requests = stats.reduce((a, s) => a + s.split.requests, 0);
  const sent = stats.reduce((a, s) => a + s.split.sent, 0);
  const ok = stats.filter((s) => s.split.answered >= MIN_SENDS_FOR_CLAIM && s.split.sent > 0);
  const pick = (xs: VersionStats[], f: (s: VersionStats) => number, low = false) => {
    if (!xs.length) return null;
    const best = low ? Math.min(...xs.map(f)) : Math.max(...xs.map(f));
    const top = xs.filter((s) => f(s) === best);
    return top.length === 1 ? top[0] : null;
  };
  return {
    requests, sent, ratePct: sent ? Math.round((requests / sent) * 100) : null,
    highest: pick(ok, (s) => s.split.requests / s.split.sent),
    fastest: pick(stats.filter((s) => s.avgReply != null && s.replyN >= 1), (s) => s.avgReply!, true),
    mostSent: pick(stats.filter((s) => s.split.sent > 0), (s) => s.split.sent),
  };
}

/* ══ the banner ═══════════════════════════════════════════════════════════════════════════════ */

/** The manuscript's LIVE queries that reach no version — the warning banner's figure. */
export const unversionedLive = (queries: Query[], packages: SubmissionPackage[]): Query[] =>
  queries.filter((q) => isLive(q) && queryBookVersion(q, packages) === null);

/** "2 queries are" / "1 query is". */
export const bannerLead = (n: number): string => (n === 1 ? "1 query is" : `${n} queries are`);

/* ══ copy ═════════════════════════════════════════════════════════════════════════════════════ */

export const headerTitle = (n: number): string =>
  n === 0 ? "No versions yet" : n === 1 ? "1 version on file" : `${n} versions on file`;

/** The drawer's one sentence: a fixed sentence per state, no advice (sent and leading · sent · unsent). */
export function insightSay(s: VersionStats, lead: VersionStats | null): string {
  if (!s.split.sent) return "Nothing has gone out with this version yet. It counts once it goes out with a query.";
  const pct = s.askedPct ?? 0;
  const of = `${s.split.requests} of ${s.split.sent}`;
  if (lead && lead.nv.v.id === s.nv.v.id) return `Most asked for. ${pct}% of the queries it went out with were asked for more (${of}).`;
  return `${pct}% of the queries it went out with were asked for more (${of}).`;
}
