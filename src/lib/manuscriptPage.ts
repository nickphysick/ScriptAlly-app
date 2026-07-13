/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts-page derivations — all read-time, nothing stored.
 *
 *  · isShelvedPresentation — the ONE predicate for the page's shelved treatment (grey pill reading
 *    "Shelved", dimmed spine + SHELVED micro-label, hidden Send-a-query). True for the Shelved
 *    workflow status OR the reversible `shelved` lifecycle overlay — an overlay-shelved book is
 *    hidden from the Log-a-Query picker, so its send affordances hide with it.
 *  · stageRows — the "In the field" rows: zero-suppressed counts in canonical pipeline order.
 *    Revise & Resubmit is an active working state, never folded into Closed; Closed is one
 *    aggregate row over Rejected / Withdrawn / No Response (drawn with the Rejected dot).
 *  · wordCountWhisper — the hero's italic range note, derived from the SHARED
 *    genreWordCountRange() (manuscripts.ts) — consumed, never forked.
 */
import { Manuscript, ManuscriptStatus, Query, QueryStatus } from "../types";
import { genreWordCountRange } from "./manuscripts";
import { genreDisplay } from "./genres";

export function isShelvedPresentation(m: Pick<Manuscript, "status" | "shelved">): boolean {
  return m.status === ManuscriptStatus.SHELVED || m.shelved === true;
}

/** Canonical pipeline order for the active (non-closed) statuses. Offer is live — you're deciding. */
const ACTIVE_ORDER: QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
];

export const CLOSED_STATUSES: QueryStatus[] = [
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
];

export interface StageRow {
  key: string;
  /** Exact QueryStatus enum label, or "Closed" for the aggregate row. */
  label: string;
  /** The status the row's StatusDot renders — the aggregate row uses Rejected (the cross glyph). */
  dotStatus: QueryStatus;
  count: number;
}

export function stageRows(queries: Query[]): StageRow[] {
  const rows: StageRow[] = [];
  for (const status of ACTIVE_ORDER) {
    const count = queries.filter((q) => q.status === status).length;
    if (count > 0) rows.push({ key: status, label: status, dotStatus: status, count });
  }
  const closed = queries.filter((q) => CLOSED_STATUSES.includes(q.status)).length;
  if (closed > 0) {
    rows.push({ key: "closed", label: "Closed", dotStatus: QueryStatus.REJECTED, count: closed });
  }
  return rows;
}

export function activeQueryCount(queries: Query[]): number {
  return queries.filter((q) => !CLOSED_STATUSES.includes(q.status)).length;
}

/** Coerce a Firestore Timestamp | Date | ISO string to epoch ms, or null. */
function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === "object") {
    const anyV = v as { toDate?: () => Date; seconds?: number };
    if (typeof anyV.toDate === "function") {
      try { return anyV.toDate().getTime(); } catch { return null; }
    }
    if (typeof anyV.seconds === "number") return anyV.seconds * 1000;
  }
  return null;
}

/**
 * A query's "last activity" epoch ms — the most recent dated event across its status/response
 * fields, falling back to when it was sent. Null when nothing is dated. Drives the reveal
 * roster's ordering and its per-row date.
 */
export function lastActivityMs(q: Query): number | null {
  const candidates = [
    q.responseReceivedAt, q.lastStatusChange, q.offerDate, q.rejectedDate,
    q.fullSentDate, q.fullRequestedDate, q.partialSentDate, q.partialRequestedDate,
    q.dateSent,
  ].map(toMs).filter((n): n is number => n != null);
  return candidates.length ? Math.max(...candidates) : null;
}

/** The n most-recently-active queries, newest first (undated sink to the end). */
export function recentQueries(queries: Query[], n: number): Query[] {
  return [...queries]
    .sort((a, b) => (lastActivityMs(b) ?? -Infinity) - (lastActivityMs(a) ?? -Infinity))
    .slice(0, n);
}

/** "70,000 – 100,000" → "70–100k" · "300 – 800" → "300–800" · "5,000 – 10,000" → "5–10k". */
export function compactRange(range: string): string {
  const nums = range.split("–").map((s) => parseInt(s.replace(/[^0-9]/g, ""), 10));
  if (nums.length !== 2 || nums.some((n) => !Number.isFinite(n))) return range;
  const [lo, hi] = nums;
  const k = (n: number) => {
    const v = n / 1000;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };
  if (lo >= 1000 && hi >= 1000) return `${k(lo)}–${k(hi)}k`;
  if (lo < 1000 && hi < 1000) return `${lo}–${hi}`;
  return `${lo >= 1000 ? `${k(lo)}k` : lo}–${hi >= 1000 ? `${k(hi)}k` : hi}`;
}

const AGE_SHORT: Record<string, string> = {
  "Young Adult": "YA",
  "Middle Grade": "MG",
  Adult: "adult",
  "Picture Book": "picture book",
  "Early Reader": "early reader",
};

/**
 * The hero's italic whisper, e.g. "YA steampunk fantasy typically runs 50–80k".
 * Null when the shared range lookup has nothing sensible to say.
 */
export function wordCountWhisper(ageCategory?: string, genre?: string): string | null {
  // Tolerant of the stored form: a genre id / legacy label both resolve to a display label, so
  // the range lookup (substring-keyed on the label) and the phrase read naturally either way.
  const g = genre ? genreDisplay(genre).trim() : "";
  const range = genreWordCountRange(ageCategory, g);
  if (!range) return null;
  const a = (ageCategory || "").trim();
  let phrase: string;
  if (!g) {
    phrase = AGE_SHORT[a] ?? a.toLowerCase();
  } else if (!a || g.toLowerCase().includes(a.toLowerCase())) {
    phrase = g.toLowerCase();
  } else {
    phrase = `${AGE_SHORT[a] ?? a} ${g.toLowerCase()}`;
  }
  if (!phrase.trim()) return null;
  return `${phrase} typically runs ${compactRange(range)}`;
}
