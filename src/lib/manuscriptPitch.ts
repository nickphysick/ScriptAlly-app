/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pitch shelf — the four pieces of writing a writer stores and copies into a query.
 * Reference: design-refs/manuscript-library.html (the `.shelfmeter` on each library card, and the
 * `.assets` grid in the dossier).
 *
 * ⚠️ FOUR ASSETS, NOT FIVE, AND ONLY TWO OF THEM ARE NEW FIELDS.
 * The reframe prompt drew five cards — logline, elevator pitch, back-cover blurb, one-page synopsis
 * and full synopsis. Recon found synopsis prose ALREADY HAS A HOME: a `ManuscriptVersion` with
 * `componentType: SYNOPSIS` and a `contentDraft`, authored in the Package Workshop and pointed at by
 * a package's `synopsisVersionId`. Storing synopsis text on the manuscript as well would have made a
 * second store for one piece of prose, on a page that also renders the packages pane naming the
 * first — so the split into one-page/full is DROPPED (versions are how a writer holds both) and the
 * synopsis card SURFACES the version rather than storing anything.
 *
 *   Logline        → the existing `Manuscript.logline` (reused, never a second field)
 *   Elevator pitch → NEW `Manuscript.elevatorPitch`
 *   Back-cover blurb → NEW `Manuscript.backCoverBlurb`
 *   Synopsis       → READ-ONLY projection of the newest SYNOPSIS `ManuscriptVersion`
 *
 * PURE: no React, no Firebase, no clock. Word counts are derived at render and never stored.
 */
import { Manuscript, ManuscriptVersion, ComponentType } from "../types";

export type PitchAssetKey = "logline" | "elevator" | "blurb" | "synopsis";

export interface PitchAsset {
  key: PitchAssetKey;
  /** Card heading — "Logline". */
  label: string;
  /** Lower-case form for mid-sentence use in the meter caption — "back-cover blurb". */
  short: string;
  /** The length the piece is conventionally written to, stated as a fact, never as a target. */
  hint: string;
  written: boolean;
  /** The prose itself when written, else `null`. The synopsis's comes from its version. */
  text: string | null;
  /**
   * ⚠️ `true` FOR THE SYNOPSIS ONLY. The shelf stores nothing for it: Edit deep-links to the Package
   * Workshop, which stays the single editing home. A caller that ignores this would offer an
   * in-place editor writing to a field that does not exist.
   */
  readOnly: boolean;
}

/** How many SYNOPSIS versions exist — stated on the synopsis card as a derived fact. */
export interface PitchShelf {
  assets: PitchAsset[];
  synopsisVersionCount: number;
}

export const PITCH_TOTAL = 4;

/** Non-empty after trimming. Whitespace is not a written pitch. */
function has(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * SYNOPSIS versions, newest first.
 *
 * ⚠️ SORTED BY `createdDate`, WHICH EVERY VERSION CARRIES (it is required on the type) — so there is
 * no absent-date case to resolve here and no silent tie-break on document order.
 */
export function synopsisVersions(versions: ManuscriptVersion[]): ManuscriptVersion[] {
  return versions
    .filter((v) => v.componentType === ComponentType.SYNOPSIS)
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
}

/**
 * The four assets for one manuscript.
 *
 * ⚠️ A SYNOPSIS COUNTS AS WRITTEN ONLY WHEN IT HAS PROSE. A version in `link` mode carries a URL and
 * no `contentDraft`: there is nothing for the card to show and nothing for Copy to put on the
 * clipboard, so filling a segment for it would report a piece the shelf cannot produce. It reads as
 * unwritten here, which under-reports a writer who keeps their synopsis in a linked document —
 * recorded as an open item rather than silently split the difference.
 */
export function pitchAssets(ms: Manuscript, versions: ManuscriptVersion[]): PitchAsset[] {
  const syn = synopsisVersions(versions).find((v) => has(v.contentDraft)) ?? null;
  return [
    {
      key: "logline",
      label: "Logline",
      short: "logline",
      hint: "One sentence",
      written: has(ms.logline),
      text: has(ms.logline) ? ms.logline : null,
      readOnly: false,
    },
    {
      key: "elevator",
      label: "Elevator pitch",
      short: "elevator pitch",
      hint: "About 50 words",
      written: has(ms.elevatorPitch),
      text: has(ms.elevatorPitch) ? ms.elevatorPitch! : null,
      readOnly: false,
    },
    {
      key: "blurb",
      label: "Back-cover blurb",
      short: "back-cover blurb",
      hint: "100–150 words",
      written: has(ms.backCoverBlurb),
      text: has(ms.backCoverBlurb) ? ms.backCoverBlurb! : null,
      readOnly: false,
    },
    {
      key: "synopsis",
      label: "Synopsis",
      short: "synopsis",
      hint: "Held in your packages",
      written: syn !== null,
      text: syn?.contentDraft ?? null,
      readOnly: true,
    },
  ];
}

export function pitchShelf(ms: Manuscript, versions: ManuscriptVersion[]): PitchShelf {
  return {
    assets: pitchAssets(ms, versions),
    synopsisVersionCount: synopsisVersions(versions).length,
  };
}

/**
 * What each piece IS, in one factual sentence, shown on the empty card.
 *
 * ⚠️ THESE DESCRIBE THE ARTEFACT, NEVER THE WRITER. No "you should", no "don't forget", no
 * encouragement — a shelf states what belongs in an empty slot, it does not coach. Locked against an
 * imperative-and-appraisal list in `manuscriptPitch.test.ts`.
 */
export const PITCH_DESCRIPTION: Record<PitchAssetKey, string> = {
  logline: "The book in one sentence — the hook an agent reads first.",
  elevator: "A lift-length pitch: premise, character, and what is at stake.",
  blurb: "The back of the jacket — voice and situation, ending withheld.",
  synopsis: "The whole story, ending included — most agencies ask for this alongside the query letter.",
};

/**
 * Words in a piece of prose, derived at render.
 *
 * ⚠️ DERIVED, NEVER STORED. A stored count is a second fact about one string, and the two disagree
 * the first time anything writes the string without updating the count.
 */
export function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** "34 words" — and "1 word", because the count is the subject of the phrase. */
export function wordCountLabel(text: string | null | undefined): string {
  const n = wordCount(text);
  return `${n} ${n === 1 ? "word" : "words"}`;
}

/**
 * The live count while editing, against the piece's conventional length.
 *
 * ⚠️ IT STATES THE LENGTH, IT DOES NOT JUDGE THE DRAFT. "38 words · aim 100–150" reports two facts
 * side by side; "38 words · too short" would be the app having an opinion about someone's writing.
 */
export function liveCountLabel(text: string, hint: string): string {
  return `${wordCountLabel(text)} · aim ${hint.replace(/^About\s+/i, "").replace(/^~/, "")}`;
}

export interface PitchMeter {
  written: number;
  total: number;
  /** Segment fills, in asset order — the meter draws these, never a count it re-derives. */
  segments: boolean[];
  /** The caption's left half. Always present. */
  left: string;
  /** The right half, or `null` when there is nothing true to put there. */
  right: string | null;
}

/**
 * The shelf meter's fills and caption.
 *
 * ⚠️ IT REPORTS, IT NEVER APPRAISES. The caption states what is written and what is outstanding;
 * nothing in it says whether that is good, or late, or enough. `pitchMeterCopy.test.ts` holds the
 * adverb lock that keeps it that way.
 *
 * ⚠️ THE RIGHT CLAUSE NAMES WHAT IS MISSING UP TO TWO PIECES AND COUNTS BEYOND THAT. Three names in
 * an 8.5px mono line truncate, and a truncated list reads as a shorter list rather than as a clipped
 * one — so past two the honest form is the number.
 */
export function pitchMeter(assets: PitchAsset[]): PitchMeter {
  const segments = assets.map((a) => a.written);
  const written = segments.filter(Boolean).length;
  const total = assets.length;
  const missing = assets.filter((a) => !a.written);

  if (written === 0) {
    return { written, total, segments, left: "Pitch shelf empty", right: "Start with the logline" };
  }
  if (missing.length === 0) {
    return { written, total, segments, left: `All ${total} pitch pieces written`, right: null };
  }

  const names =
    missing.length === 1
      ? missing[0].short
      : missing.length === 2
        ? `${missing[0].short} and ${missing[1].short}`
        : null;

  const right = names
    ? `${names.charAt(0).toUpperCase()}${names.slice(1)} to go`
    : `${missing.length} pieces to go`;

  return { written, total, segments, left: `${written} of ${total} pitch pieces written`, right };
}
