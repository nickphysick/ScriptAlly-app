/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A PACKAGE EDITION'S RESULTS (docs/contracts/package-editions.md §C4; Part B, 28 Sep).
 *
 * Over the queries CREDITED to the edition — `sentHow === 'package'`, that package, that edition,
 * read through `sentRecordOf`, so an unmigrated query counts exactly as a migrated one:
 *
 *   Sent       — how many.
 *   The FIRST ANSWER decides each query's column: a request (partial, full, R&R — and an offer that
 *              arrived with no request before it, which only a read book can produce), a pass, or
 *              closed as no reply. Taken from `buildRows`' `respondedStatus` — the first incoming rung
 *              of the log — so this page and Analytics cannot disagree about what came first.
 *   Offers     — queries that EVER reached an offer: a subset shown alongside, never a column.
 *   Still out  — no answer yet, and live.
 *   Withdrawn before any answer — in neither answered nor still out; counted for a note.
 *   Rate       — "N in M answered", M = Requests + Passes + No reply. Still out never enters it.
 *
 * ⚠️ NOTHING IS STORED. Results are worked out from the queries on every render, so undo, a
 * correction, a moved entry, a late reply and a delete all move them by themselves (PE5).
 */
import type { Query } from "../types";
import { QueryStatus } from "../types";
import type { AnalyticsRow } from "./analytics";
import { sentRecordOf } from "./queryActions/sentRecord";

export type FirstAnswer = "request" | "pass" | "noreply" | "out" | "withdrawn";

const REQUEST_STATUSES = new Set<QueryStatus>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER]);

/** Which column a query's FIRST answer puts it in. */
export function firstAnswer(q: Pick<Query, "status">, row: Pick<AnalyticsRow, "respondedStatus" | "reachedRequest" | "reachedOffer"> | undefined): FirstAnswer {
  const first = row?.respondedStatus ?? null;
  if (first === QueryStatus.REJECTED) return "pass";
  if (first === QueryStatus.NO_RESPONSE) return "noreply";
  if (first && REQUEST_STATUSES.has(first)) return "request";
  /* no dated first answer: read what the query says it reached */
  if (row?.reachedRequest || row?.reachedOffer) return "request";
  if (q.status === QueryStatus.REJECTED) return "pass";
  if (q.status === QueryStatus.NO_RESPONSE) return "noreply";
  if (q.status === QueryStatus.WITHDRAWN) return "withdrawn";
  return "out";
}

export interface ResultRow { id: string; status: QueryStatus; latestMs: number | null }

export interface EditionResults {
  sent: number;
  out: number;
  requests: number;
  offers: number;
  passes: number;
  noReply: number;
  /** Requests + Passes + No reply — the rate's denominator. */
  answered: number;
  withdrawnEarly: number;
  /** Earliest and latest send dates among the credited queries. */
  firstSentMs: number | null;
  lastSentMs: number | null;
  rows: ResultRow[];
  /** Queries sent with changes, BASED ON this package (and edition) — listed, never counted. */
  withChanges: string[];
  /** Every credited query was logged before editions existed (no snapshot of its own). */
  onlyMigrated: boolean;
}

/**
 * @param edition a number for one edition, or null for "All editions" (the big picture).
 */
export function packageResults(pkgId: string, edition: number | null, queries: Query[], rowsById: Map<string, AnalyticsRow>): EditionResults {
  const credited = queries.filter((q) => {
    const r = sentRecordOf(q);
    return r.how === "package" && r.packageId === pkgId && (edition == null || r.edition === edition);
  });
  const out: EditionResults = {
    sent: credited.length, out: 0, requests: 0, offers: 0, passes: 0, noReply: 0, answered: 0, withdrawnEarly: 0,
    firstSentMs: null, lastSentMs: null, rows: [], withChanges: [], onlyMigrated: credited.length > 0,
  };
  for (const q of credited) {
    const row = rowsById.get(q.id);
    const a = firstAnswer(q, row);
    if (a === "request") out.requests++;
    else if (a === "pass") out.passes++;
    else if (a === "noreply") out.noReply++;
    else if (a === "withdrawn") out.withdrawnEarly++;
    else out.out++;
    if (row?.reachedOffer) out.offers++;
    const s = row?.sentMs ?? null;
    if (s != null) {
      out.firstSentMs = out.firstSentMs == null ? s : Math.min(out.firstSentMs, s);
      out.lastSentMs = out.lastSentMs == null ? s : Math.max(out.lastSentMs, s);
    }
    if (q.sentMaterials) out.onlyMigrated = false;
    const stamps = Object.values(row?.stageMs ?? {}).filter((x): x is number => typeof x === "number");
    out.rows.push({ id: q.id, status: q.status as QueryStatus, latestMs: stamps.length ? Math.max(...stamps, s ?? 0) : s });
  }
  out.answered = out.requests + out.passes + out.noReply;
  out.rows.sort((a, b) => (b.latestMs ?? 0) - (a.latestMs ?? 0));
  out.withChanges = queries.filter((q) => {
    const r = sentRecordOf(q);
    return r.how === "individual" && r.basedOnId === pkgId && (edition == null || r.basedOnEdition === edition);
  }).map((q) => q.id);
  return out;
}

/** The word a result row's date is stated with — "SENT", "REQUEST", "PASSED", … */
export function rowWord(status: QueryStatus): string {
  switch (status) {
    case QueryStatus.QUERIED: return "SENT";
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT: return "REQUEST";
    case QueryStatus.PARTIAL_SENT: return "PARTIAL SENT";
    case QueryStatus.FULL_SENT: return "FULL SENT";
    case QueryStatus.RESUBMITTED: return "RESUBMITTED";
    case QueryStatus.OFFER: return "OFFER";
    case QueryStatus.SIGNED: return "SIGNED";
    case QueryStatus.REJECTED: return "PASSED";
    default: return "CLOSED";
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2 Sep" — a fixed month table, because en-GB's short month is "Sept" in some engines. */
export function dayMonth(at: number | string | null | undefined): string {
  if (at == null || at === "") return "";
  const d = typeof at === "number" ? new Date(at) : new Date(at);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** The SENT tile's subline: "SINCE 2 SEP" for the current edition or all, a range for a past one. */
export function sentSpan(r: Pick<EditionResults, "sent" | "firstSentMs" | "lastSentMs">, past: boolean): string {
  if (!r.sent || r.firstSentMs == null) return "None yet";
  if (!past) return `Since ${dayMonth(r.firstSentMs)}`;
  const a = dayMonth(r.firstSentMs), b = dayMonth(r.lastSentMs);
  return a === b ? a : `${a} – ${b}`;
}

/** The REQUESTS tile's subline — the fair rate (§C4): only queries with an answer are counted. */
export function rateLine(r: Pick<EditionResults, "requests" | "answered">): string {
  return r.answered ? `${r.requests} in ${r.answered} answered` : "None answered yet";
}
