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

/**
 * ⚠️ `atAGlance`, `glanceMeta` AND `GlanceCell` ARE RETIRED (amendment 2). They built the five-cell
 * stat row — queries sent, responses, still open, closed, agents holding — which the Overview no
 * longer has: three of those figures are the HERO's cells now and the other two went with the row.
 *
 * ⚠️ THE PARTITION PROPERTY THEY CARRIED IS NOT LOST, IT IS NO LONGER CLAIMED. `still open + closed
 * = queries sent` was worth a property test because the page ASSERTED all three at once; it states
 * neither of the two now, so there is nothing left to reconcile. The two sum invariants that remain
 * — the journey's tracks — are untouched and still locked as properties.
 */

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

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE PITCH AND THE SYNOPSIS — the two things on this page the writer composed
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ THE PLACEHOLDER IS A PROMPT, NOT A VALUE, and it reaches the field through the browser's own
 * `placeholder` attribute — so there is no code path by which it can be committed. The trap it
 * avoids is a `contenteditable` whose placeholder is rendered as text content and saved by the first
 * writer who clicks in and out again.
 *
 * The `Elevator pitch:` prefix from the brief is dropped: the section heading already says "The
 * pitch", and a placeholder that repeats its own label spends the writer's attention twice.
 */
export const PITCH_PLACEHOLDER =
  "If you were to describe your book to an agent in the space of a few seconds, what would you say?";

export const SYNOPSIS_PLACEHOLDER =
  "The whole story, ending included — what happens, to whom, and what it costs them.";

/**
 * ⚠️ IT SAYS "WORKING COPY" AND ASSERTS NO RELATIONSHIP, WHICH IS THE POINT. Submission packages
 * already holds synopsis MATERIALS — the "One-page" and "Two-page" items, which are
 * `ManuscriptVersion` documents a package reaches through `synopsisVersionId`. Whether this field is
 * the master those derive from or a genuinely separate scratch copy is an OPEN QUESTION and not one
 * this sentence settles. Saying nothing keeps both answers available; implying either would need
 * unpicking the day the other turns out to be right.
 */
export const SYNOPSIS_NOTE =
  "Your working copy, kept with the manuscript. The synopses you send are built in Submission packages.";

/** `1,240 words`, or null where there is nothing written to measure. */
export const synopsisMeta = (text: string | null): string | null => {
  if (!text) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${words.toLocaleString("en-GB")} word${words === 1 ? "" : "s"}`;
};
