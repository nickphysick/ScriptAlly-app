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

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   OVERVIEW — the at-a-glance row
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

export interface GlanceCell {
  key: string;
  label: string;
  value: number;
  /** Drawn in the quieter ink. Closed is a fact about the past, not a figure to lead with. */
  soft?: boolean;
}

/**
 * The five figures over the manuscript's own queries.
 *
 * ⚠️ `stillOpen` AND `closed` PARTITION THE SET, so the two always sum to `queriesSent`. They are
 * derived from the ONE closed set (`CLOSED_STATUSES` in manuscriptPage) rather than from two
 * hand-written status lists, which is how two figures on one card come to disagree.
 *
 * ⚠️ `responses` COUNTS THROUGH `plateStats`, WHICH COUNTS THROUGH `isResponse` — the canonical
 * predicate the package maths uses. It is deliberately NOT recomputed here: a local "has the agent
 * replied" test would eventually disagree with the rest of the app about what a response is.
 *
 * ⚠️ AND `agentsHolding` COUNTS AGENTS, NOT QUERIES. Two live sends to one agent is one agent
 * holding something; counting rows would state a number of people that does not exist. Holding
 * comes from `HOLDING_STATUSES` — the two send statuses — never a hand-kept "active" list.
 *
 * ⚠️ NO VERDICT ANYWHERE. Five counts, five nouns, no ordering by outcome, no colour that means
 * good or bad. `closed` is quieter than the rest and that is a reading weight, not a judgement.
 */
export const atAGlance = (
  queriesSent: number,
  responses: number,
  closed: number,
  agentsHolding: number,
): GlanceCell[] => [
  { key: "sent", label: "Queries sent", value: queriesSent },
  { key: "responses", label: "Responses", value: responses },
  { key: "open", label: "Still open", value: queriesSent - closed },
  { key: "closed", label: "Closed", value: closed, soft: true },
  { key: "holding", label: "Agents holding", value: agentsHolding },
];

/** The Overview header's meta — `26 queries · 4 agents holding`. */
export const glanceMeta = (queriesSent: number, agentsHolding: number): string =>
  `${queriesSent} quer${queriesSent === 1 ? "y" : "ies"} · ${agentsHolding} agent${agentsHolding === 1 ? "" : "s"} holding`;

/**
 * The pitch header's meta — `38 words`.
 *
 * ⚠️ THE REF ALSO STATES `last edited 2 Jun` AND THAT IS NOT BUILT. No field on the manuscript
 * records when the elevator pitch was last written; the nearest thing is the document's own
 * `statusChangedDate`, which is about the STATUS and would be a plausible number labelled with
 * something it does not measure. Null where there is no pitch, so the caller states no meta at all.
 */
export const pitchMeta = (text: string | null): string | null => {
  if (!text) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${words} word${words === 1 ? "" : "s"}`;
};
