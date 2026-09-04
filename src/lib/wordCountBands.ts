/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE WORD-COUNT REFERENCE — bands parsed from the one source ═══════════════════════════════
 *
 * ⚠️ THERE IS NO SECOND COPY OF THE RANGES. `genres.ts` holds them as DISPLAY STRINGS
 * ("90,000 – 120,000", en-dash) and this parses those at read time. Numeric fields beside the
 * strings would be a second copy that drifts; a parser is derivation.
 *
 * ⚠️ AND IT IS STRICT. An unparseable range is REPORTED, never silently treated as generic —
 * a genre quietly rendering the fallback band looks exactly like a genre whose guidance is generic,
 * and the difference is the whole point of the lighter treatment below.
 *
 * ⚠️ THIS IS REFERENCE, NOT A METER. The free plan never shows a usage meter, and this is not one:
 * no colour by position, no "within range", no verdict. See `markerClass`.
 */
import { CANONICAL_GENRES, GENERIC_WORD_COUNT_RANGE, PersonalGenre, normaliseStoredGenre } from "./genres";

export interface Band {
  label: string;
  min: number;
  max: number;
  /** True when the range is the shared fallback rather than guidance for this genre. */
  generic: boolean;
}

/**
 * `"90,000 – 120,000"` → `{ min: 90000, max: 120000 }`, or null when it cannot be read.
 *
 * ⚠️ THE SEPARATOR IS AN EN-DASH IN THE DATA AND A HYPHEN IN NOBODY'S HEAD. Both are accepted on
 * read; neither is written here, because nothing here writes.
 */
export const parseRange = (raw: string): { min: number; max: number } | null => {
  const m = /^\s*([\d,]+)\s*[–-]\s*([\d,]+)\s*$/.exec(raw);
  if (!m) return null;
  const min = Number(m[1].replace(/,/g, ""));
  const max = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= min) return null;
  return { min, max };
};

/** Every range in the taxonomy that cannot be read — empty is the expected state. */
export const unparseableRanges = (): string[] =>
  CANONICAL_GENRES.filter((g) => g.wordCountRange && !parseRange(g.wordCountRange))
    .map((g) => `${g.id}: ${g.wordCountRange}`);

/**
 * The band for one genre id. A personal genre — or any genre with no stated range — takes the
 * shared fallback and is marked `generic`, so the chart can render it lighter.
 */
export const bandFor = (genreId: string | undefined, personal: PersonalGenre[] = []): Band | null => {
  if (!genreId) return null;
  /**
   * ⚠️ NORMALISED FIRST, THROUGH THE APP'S OWN RESOLVER. A stored genre is an id on new manuscripts
   * and a legacy LABEL on older ones ("Literary Fiction"), and matching raw against `id` finds
   * neither the label nor an alias — measured: the marker did not render at all on the harness
   * account, because its book stores a label. `genreDisplay` normalises for exactly this reason;
   * re-deriving it here would have been a second, worse answer to a question already answered.
   */
  const id = normaliseStoredGenre(genreId, personal);
  const canonical = CANONICAL_GENRES.find((g) => g.id === id);
  const label = canonical?.label ?? personal.find((p) => p.id === id)?.label ?? null;
  if (!label) return null;
  const raw = canonical?.wordCountRange;
  const parsed = raw ? parseRange(raw) : null;
  if (raw && !parsed) {
    /* ⚠️ REPORTED, NOT SWALLOWED. A genre whose range cannot be read must not quietly render the
       fallback: it would be indistinguishable from a genre that genuinely has generic guidance. */
    console.error(`[wordCountBands] unreadable range for ${id}: ${raw}`);
    return null;
  }
  const fallback = parseRange(GENERIC_WORD_COUNT_RANGE);
  const bounds = parsed ?? fallback;
  if (!bounds) return null;
  return { label, min: bounds.min, max: bounds.max, generic: !parsed };
};

/**
 * ⚠️ ONE CLASS, WHEREVER IT FALLS. A marker whose class changes with its position is a verdict
 * wearing a colour — "you are short", "you are over" — and this page reports rather than appraises.
 * The function takes no arguments ON PURPOSE: there is nothing it could vary by.
 */
export const markerClass = (): string => "wcb-marker";

/** Where the marker sits on a track, 0–1, clamped so an outlier stays on the chart. */
export const markerFraction = (wordCount: number, axisMin: number, axisMax: number): number => {
  if (axisMax <= axisMin) return 0;
  return Math.min(1, Math.max(0, (wordCount - axisMin) / (axisMax - axisMin)));
};

/**
 * ⚠️ THE RANGE, IN THE WRITER'S UNITS. `55–90k` beside each row is what makes the chart a
 * REFERENCE: three bars and a stick with no figures is a decoration — you cannot read a number off
 * it, which is the only thing anybody wants from it.
 */
export const rangeLabel = (band: Band): string => {
  const k = (n: number) => (n % 1000 === 0 ? `${n / 1000}` : (n / 1000).toFixed(1));
  return `${k(band.min)}–${k(band.max)}k`;
};

/**
 * ⚠️ AND AN AXIS, because a band without a scale says nothing about how long a book is. Round ticks
 * at a readable interval across the drawn range — never one per band, which would put the ticks
 * wherever the genres happen to fall rather than where a reader counts.
 */
export const axisTicks = (axis: { min: number; max: number }): number[] => {
  const span = axis.max - axis.min;
  if (span <= 0) return [];
  /**
   * ⚠️ ROUGHLY FOUR LABELS, NOT AS MANY AS FIT. A 150k axis at 25k gives SEVEN ticks across a tile
   * a third of a page wide, which is a crowded ruler rather than a scale — 0 / 50k / 100k / 150k is
   * what a reader recognises. The step is chosen from the span rather than fixed, so a very long
   * book widens the interval instead of adding labels.
   */
  const step = [25000, 50000, 100000, 200000].find((c) => span / c <= 4) ?? 200000;
  const ticks: number[] = [];
  for (let t = Math.ceil(axis.min / step) * step; t <= axis.max; t += step) ticks.push(t);
  return ticks;
};

/**
 * The shared axis.
 *
 * ⚠️ IT STARTS AT ZERO, AND THE FIRST VERSION DID NOT. Padding around the data gave an axis from
 * roughly 64k to 128k and ticks at 75k / 100k / 125k — arithmetically fine and unreadable: a reader
 * comparing book lengths counts from nothing, so a band starting two-thirds along a track that
 * starts at 64k tells them the opposite of the truth about how long the book is.
 *
 * ⚠️ AND THE TOP ROUNDS UP TO A TICK, so the last label sits at the end of the axis rather than
 * floating short of it.
 */
export const axisFor = (bands: Band[], wordCount?: number): { min: number; max: number } => {
  const highs = bands.map((b) => b.max).concat(wordCount ? [wordCount] : []);
  if (!highs.length) return { min: 0, max: 1 };
  const raw = Math.max(...highs) * 1.06;
  const step = raw > 320000 ? 100000 : raw > 160000 ? 50000 : 25000;
  return { min: 0, max: Math.ceil(raw / step) * step };
};
