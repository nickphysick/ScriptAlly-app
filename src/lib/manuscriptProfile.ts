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

export interface HeroFigure {
  key: string;
  /** The figure itself — a count, or a date already formatted. */
  value: string;
  label: string;
  /** A date sets smaller than a numeral, so the three cells stay optically level. */
  date?: boolean;
}

/**
 * ⚠️ `heroFacts` AND `HeroFact` ARE RETIRED (amendment 2), NOT RENAMED. They built the three
 * derived CLAUSES that sat in the facts line under the title — `26 queries sent · 12 responses ·
 * Querying since …`. Those three are the hero's right-hand stat CELLS now, and the facts line keeps
 * only genre chips and word count, so nothing on that row of the page states them twice.
 *
 * ⚠️ THE ONE RULE THE BUILDER EXISTED TO HOLD SURVIVES, AND IT MOVED RATHER THAN LAPSED: a count of
 * nought is stated, a date nobody has is not. `0 queries sent` is a fact the writer needs;
 * `Querying since —` is the app asserting a start it does not know, and this page has shipped that
 * exact shape before as an "Added" date derived from an imported query's send. The cell is now
 * OMITTED when `queryingSinceMs` returns null — which takes its hairline divider with it, because
 * the divider is a `border-left` on the cell rather than an element between cells.
 */


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

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   NOTES — the manuscript's own
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The notes a writer has written ABOUT this book.
 *
 * ⚠️ NOTES, NOT TASKS — and the app already decides which is which. The two natures are DERIVED
 * from `dueDate`: absent is a NOTE (dateless, nothing chases you), present is a TASK (dated, joins
 * the work). A dated task scoped to this manuscript belongs on the To-do list, which is where it
 * will surface on its day; showing it here as well would give one item two homes that disagree the
 * moment it is completed in one of them.
 *
 * ⚠️ AND `manuscriptId` IS AN EXACT MATCH, NOT `scopeTasks`'s RULE. That helper deliberately keeps
 * UNSCOPED items in view — an unattached note floats and belongs to every scope — which is right
 * for a page filtering the whole board and wrong here: a note about nothing in particular is not a
 * note about THIS book, and listing it under a manuscript would claim the writer said something
 * about it that they did not.
 *
 * ⚠️ DONE NOTES ARE OUT. A note the writer has ticked off is finished; the Noteboard is where the
 * completed ones live.
 *
 * Newest first, undated last — the same ordering rule the rest of the app uses for a written record.
 */
export const manuscriptNotes = <T extends {
  manuscriptId?: string; dueDate?: string; done?: boolean; createdAt?: string;
}>(tasks: readonly T[], manuscriptId: string): T[] =>
  tasks
    .filter((t) => t.manuscriptId === manuscriptId && !t.dueDate && !t.done)
    .slice()
    .sort((a, b) => (a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : (a.createdAt ?? "") > (b.createdAt ?? "") ? -1 : 0);

/** `4 on this manuscript` — the Notes header's meta. */
export const notesMeta = (n: number): string => `${n} on this manuscript`;

/** `14 Jun 2026` from an ISO datetime, or null where there is none to state. */
export const noteDay = (createdAt: string | undefined): string | null => {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  return Number.isNaN(t) ? null : profileDate(t);
};
