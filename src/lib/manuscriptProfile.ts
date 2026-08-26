/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — the page's own derivations ═════════════════════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`.
 *
 * ⚠️ EVERYTHING HERE IS DERIVED AT READ TIME. No stored field, no cache, nothing written back to
 * Firestore. `recomputeQuery` remains the single writer of derived query state and this module
 * never goes near it.
 *
 * ⚠️ AND A COUNT OF NOUGHT IS NOT AN ABSENCE. `0 queries sent` is a true statement and is made;
 * `Querying since —` is not, because there is no date to state. The two look alike and are
 * opposites: one is a fact the writer needs, the other invents a fact from a missing one. Every
 * clause below decides which it is.
 */
import { Query } from "../types";

/** ISO / Timestamp / Date → epoch ms, or null. Mirrors `manuscriptPage.toMs`, kept local so this
 *  module can be read without following an import for a two-line coercion. */
const toMs = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === "object") {
    const o = v as { toDate?: () => Date; seconds?: number };
    if (typeof o.toDate === "function") { try { return o.toDate().getTime(); } catch { return null; } }
    if (typeof o.seconds === "number") return o.seconds * 1000;
  }
  return null;
};

/**
 * When the writer started querying this book — the EARLIEST send, not the manuscript's creation.
 *
 * ⚠️ AND NOT `createdDate`, WHICH IS THE TRAP THIS AVOIDS. That field is optional and the current
 * create path never writes it, so a plate that read it would have no data on most manuscripts; and
 * on an imported one the earliest activity is a first-QUERY date, which under an "Added" label is
 * a plausible number stating something untrue. This clause says what it measures.
 *
 * Null when nothing has been sent — the caller then states no clause at all.
 */
export const queryingSinceMs = (queries: readonly Query[]): number | null => {
  const sent = queries.map((q) => toMs(q.dateSent)).filter((t): t is number => t !== null);
  return sent.length ? Math.min(...sent) : null;
};

/** `14 Jan 2026` — the facts line's format. Day, short month, full year: this one IS a record. */
export const profileDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export interface HeroFact {
  key: string;
  /** The plain part of the clause. */
  label: string;
  /** The figure, set in the facts line's stronger ink. Absent where the clause is all label. */
  value?: string;
}

/**
 * The hero's derived clauses — the ones after genre and word count, which the identity block
 * already owns and which stay editable in place.
 *
 * ⚠️ THE COUNTS ARE STATED AT NOUGHT AND THE DATE IS NOT. A writer with no queries out reads
 * `0 queries sent · 0 responses` and nothing else: those are true, and `Querying since` has no
 * date behind it, so the clause is omitted rather than dashed. A dash there would be the app
 * asserting a start it does not know.
 */
export const heroFacts = (
  queriesSent: number,
  responses: number,
  sinceMs: number | null,
): HeroFact[] => {
  const out: HeroFact[] = [
    { key: "sent", label: queriesSent === 1 ? "query sent" : "queries sent", value: String(queriesSent) },
    { key: "responses", label: responses === 1 ? "response" : "responses", value: String(responses) },
  ];
  if (sinceMs !== null) out.push({ key: "since", label: "Querying since", value: profileDate(sinceMs) });
  return out;
};

/**
 * The shelf header's meta — `2 manuscripts · 26 queries`.
 *
 * ⚠️ BOTH FIGURES ARE STATED AT NOUGHT. An empty shelf reads `0 manuscripts · 0 queries`, which is
 * the truth; the zero-manuscript state renders its own panel instead, so in practice the first
 * number is at least one — but the function does not need to know that, and a guard here would be
 * a rule about a caller.
 */
export const shelfMeta = (manuscripts: number, queries: number): string =>
  `${manuscripts} manuscript${manuscripts === 1 ? "" : "s"} · ${queries} quer${queries === 1 ? "y" : "ies"}`;
