/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE CONSEQUENCE PREVIEW — the engine run twice, and diffed ═══════════════════════════════
 *
 * A correction changes the LOG; everything a writer can see is derived from it. So the only honest
 * preview is the real derivation run against the proposed log and compared with the current one.
 *
 * ⚠️ THERE IS NO SECOND DERIVATION HERE, AND THAT IS THE WHOLE DESIGN. `computeRecomputedFields` is
 * already pure — it takes raw activity docs and returns exactly what `recomputeQuery` would write,
 * with no Firestore — so the preview costs nothing to detach and CANNOT drift from the outcome. A
 * hand-written list of consequences would be a second model of the same rules, correct on the day
 * it was written and wrong the first time either side moved.
 *
 * ⚠️ THE ROW BUILDER IS INJECTED RATHER THAN IMPORTED. Timeline membership and order are the
 * timeline's own answer (`buildTimelineRows`, in a component file) and must be, or the preview
 * would model what the timeline shows instead of asking it. Injecting keeps this module pure and
 * still leaves exactly one builder — the caller passes the same function the page renders with.
 *
 * ⚠️ AND THE ORDER IS COMPARABLE AT ALL ONLY BECAUSE OF `byEventOrder`. Both sides sort a proposed
 * array that never came from Firestore; without one stated rule the preview would be comparing its
 * own arbitrary order against `orderBy`'s, and would diverge on precisely the case corrections most
 * often create — moving an event onto a day that already holds one.
 */
import type { QueryStatus } from "../types";
import { computeRecomputedFields, type RawActivityDoc, type RecomputedFields } from "./recomputeQuery";
import { chapterise, type ChapterableRow } from "./timelineChapters";
import { waitAnchor, type StoredHoldingReply } from "./holdingReply";
import { resolveExpectedDate, type ExpectedSource } from "./expectedDate";

/** The minimum a timeline row must expose for the preview to compare two of them. */
export interface PreviewRow extends ChapterableRow {
  /** The document behind the row, when there is one. A synthesised root has none. */
  activityId?: string;
  title: string;
  timeMs?: number;
}

/** One human-readable consequence, in the writer's terms rather than the model's. */
export interface SurfaceChange {
  /** Which surface moved — the sheet groups by this. */
  surface: "status" | "timeline" | "chapters" | "anchor" | "window";
  before: string;
  after: string;
}

export interface CorrectionDiff {
  /**
   * ⚠️ EMPTY MEANS NO SHEET (ref 170, card 6) — an edit that changes nothing a writer can see saves
   * with just the toast. Asking someone to confirm consequences that do not exist trains them to
   * dismiss the sheet without reading it, which is exactly what it must never become.
   */
  empty: boolean;
  /** Rows on the timeline now and not after — struck and faded in the preview body. */
  removed: PreviewRow[];
  /** Rows after and not now. */
  added: PreviewRow[];
  /** The surviving rows changed places. */
  reordered: boolean;
  /** The proposed timeline, in order, for the preview body to render. */
  rowsAfter: PreviewRow[];
  /** Everything that is not a timeline row — the sheet's summary line, or the ledger body. */
  changes: SurfaceChange[];
  /** The derived fields either side, for callers that want the raw pair. */
  fieldsBefore: RecomputedFields;
  fieldsAfter: RecomputedFields;
}

export interface PreviewInput {
  current: RawActivityDoc[];
  proposed: RawActivityDoc[];
  /** The page's own row builder, applied to each side. */
  buildRows: (docs: RawActivityDoc[]) => PreviewRow[];
  /** The agency's stated weeks, for the window attribution. Absent = they state none. */
  agencyWeeks?: number | null;
  /** The query, for the writer's own expected date. Only its id and stored fields are read. */
  query: { id: string };
}

const rowKey = (r: PreviewRow): string => r.activityId ?? `${r.status}@${r.timeMs ?? 0}`;

/** The events shape the anchor derivation reads, from raw docs. */
const asStored = (docs: RawActivityDoc[]): StoredHoldingReply[] =>
  docs.map((d) => ({ type: d.data.type, createdAt: d.data.createdAt, replyWeeks: d.data.replyWeeks }));

const fmt = (ms: number | null): string =>
  ms == null ? "none" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const SOURCE_WORD: Record<Exclude<ExpectedSource, null>, string> = {
  agent: "the agency's window",
  writer: "your estimate",
  reply: "what they said in their reply",
};
const sourceWord = (s: ExpectedSource): string => (s === null ? "nobody's — the house assumption" : SOURCE_WORD[s]);

/**
 * Run the engine against both logs and describe the difference.
 *
 * ⚠️ EVERY CLAIM BELOW IS A COMPARISON OF TWO REAL DERIVATIONS, never an inference about what an
 * edit "should" do. That is what lets the sheet promise the outcome rather than predict it.
 */
export function previewCorrection(input: PreviewInput): CorrectionDiff {
  const { current, proposed, buildRows, agencyWeeks, query } = input;

  const fieldsBefore = computeRecomputedFields(current);
  const fieldsAfter = computeRecomputedFields(proposed);

  const rowsBefore = buildRows(current);
  const rowsAfter = buildRows(proposed);

  const keysBefore = rowsBefore.map(rowKey);
  const keysAfter = rowsAfter.map(rowKey);
  const setAfter = new Set(keysAfter);
  const setBefore = new Set(keysBefore);

  const removed = rowsBefore.filter((r) => !setAfter.has(rowKey(r)));
  const added = rowsAfter.filter((r) => !setBefore.has(rowKey(r)));

  /* ⚠️ REORDER IS JUDGED ON THE SURVIVORS ONLY. Comparing the full sequences would call every
     removal a reorder, which is true and useless — the struck rows already say that. */
  const survivorsBefore = keysBefore.filter((k) => setAfter.has(k));
  const survivorsAfter = keysAfter.filter((k) => setBefore.has(k));
  const reordered = survivorsBefore.join("|") !== survivorsAfter.join("|");

  const changes: SurfaceChange[] = [];

  if (fieldsBefore.status !== fieldsAfter.status) {
    changes.push({ surface: "status", before: fieldsBefore.status, after: fieldsAfter.status });
  }

  /**
   * ⚠️ CHAPTER LABELS INCLUDE THEIR ORDINALS, which is the case a writer would never predict:
   * deleting the FIRST partial round renames "The second partial" to "The partial". `chapterise`
   * numbers repeats itself, so comparing its output catches renumbering for free — a hand-written
   * consequence list would have had to know the rule.
   */
  const chaptersBefore = chapterise(rowsBefore).chapters.map((c) => c.label);
  const chaptersAfter = chapterise(rowsAfter).chapters.map((c) => c.label);
  if (chaptersBefore.join(" · ") !== chaptersAfter.join(" · ")) {
    changes.push({ surface: "chapters", before: chaptersBefore.join(" · ") || "none", after: chaptersAfter.join(" · ") || "none" });
  }

  /**
   * ⚠️ A CHANGE IS SOMETHING THE WRITER CAN SEE — compare the SENTENCE, never the milliseconds
   * behind it.
   *
   * Measured on the deployed page: a note-only edit raised a sheet listing two changes whose before
   * and after were the SAME WORDS — "your send on 16 Jul 2026 → your send on 16 Jul 2026". The
   * derivation was right and the comparison was too fine: saving normalises the event's time to
   * midday, which moves the anchor by hours while leaving the day it states untouched. Comparing
   * `ms` therefore reported a consequence that did not exist.
   *
   * ⚠️ AND THAT DEFEATS THE RULE THE WHOLE SHEET RESTS ON — "an empty diff raises no sheet". A sheet
   * that appears to say nothing changed is how a writer learns to dismiss it without reading, which
   * is precisely what this surface must never become. These two facts are stated to the day; if two
   * states are stated identically, there is no consequence to show.
   */
  const anchorBefore = waitAnchor(asStored(current), null);
  const anchorAfter = waitAnchor(asStored(proposed), null);
  const sayAnchor = (a: typeof anchorBefore) =>
    a == null ? "nothing to count from" : `${a.kind === "reply" ? "their reply" : "your send"} on ${fmt(a.ms)}`;
  const anchorSaid = { before: sayAnchor(anchorBefore), after: sayAnchor(anchorAfter) };
  if (anchorSaid.before !== anchorSaid.after) changes.push({ surface: "anchor", ...anchorSaid });

  /* whose window wins — the attribution the bar and the sentence both read */
  const winBefore = resolveExpectedDate(query, anchorBefore?.ms ?? null, agencyWeeks, null);
  const winAfter = resolveExpectedDate(query, anchorAfter?.ms ?? null, agencyWeeks, null);
  const winSaid = {
    before: `${sourceWord(winBefore.source)} · ${fmt(winBefore.ms)}`,
    after: `${sourceWord(winAfter.source)} · ${fmt(winAfter.ms)}`,
  };
  if (winSaid.before !== winSaid.after) changes.push({ surface: "window", ...winSaid });

  return {
    empty: removed.length === 0 && added.length === 0 && !reordered && changes.length === 0,
    removed,
    added,
    reordered,
    rowsAfter,
    changes,
    fieldsBefore,
    fieldsAfter,
  };
}

/**
 * ⚠️ THE SHEET'S BODY IS THE TIMELINE PREVIEW WHERE THE DIFF TOUCHES ROWS, AND THE LEDGER WHERE IT
 * DOES NOT (ref 171, B with A as fallback). Stated here rather than in the component so the two
 * bodies cannot come to disagree about which case they are for.
 */
export const previewBody = (d: CorrectionDiff): "timeline" | "ledger" =>
  d.removed.length || d.added.length || d.reordered ? "timeline" : "ledger";
