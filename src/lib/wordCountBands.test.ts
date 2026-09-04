/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from "vitest";
import { parseRange, unparseableRanges, bandFor, markerClass, markerFraction, axisFor, rangeLabel, axisTicks } from "./wordCountBands";
import { CANONICAL_GENRES, GENERIC_WORD_COUNT_RANGE } from "./genres";

describe("the word-count ranges are parsed, not copied", () => {
  it("reads the data's own format, en-dash and commas", () => {
    expect(parseRange("90,000 – 120,000")).toEqual({ min: 90000, max: 120000 });
    expect(parseRange("70,000 - 100,000"), "a hyphen is accepted on read").toEqual({ min: 70000, max: 100000 });
  });

  /** ⚠️ STRICT: unreadable is null, never a guess. */
  it("refuses what it cannot read", () => {
    for (const bad of ["", "lots", "90,000+", "90,000 – ", "120,000 – 90,000", "0 – 100"]) {
      expect(parseRange(bad), `${bad} was parsed`).toBeNull();
    }
  });

  /**
   * ⚠️ THE WHOLE TAXONOMY PARSES. This is the assertion that keeps the parser and the data in step:
   * a range added in `genres.ts` in a format this cannot read fails HERE rather than rendering as a
   * silently generic band.
   */
  it("every stated range in the taxonomy is readable", () => {
    expect(unparseableRanges()).toEqual([]);
    /* And the population is real — a taxonomy that lost its ranges would pass the line above. */
    expect(CANONICAL_GENRES.filter((g) => g.wordCountRange).length).toBeGreaterThan(20);
    expect(parseRange(GENERIC_WORD_COUNT_RANGE)).not.toBeNull();
  });
});

describe("bands", () => {
  it("gives a canonical genre its own range, not marked generic", () => {
    const b = bandFor("fantasy")!;
    expect(b.label).toBe("Fantasy");
    expect(b.generic).toBe(false);
    expect(b.max).toBeGreaterThan(b.min);
  });

  /**
   * ⚠️ A PERSONAL GENRE TAKES THE FALLBACK AND IS MARKED GENERIC, so the chart can render it
   * lighter — otherwise it looks as though it has specific guidance it does not have.
   */
  it("marks a personal genre's band generic", () => {
    const b = bandFor("u:uid:my-thing", [{ id: "u:uid:my-thing", label: "My thing" }])!;
    expect(b.label).toBe("My thing");
    expect(b.generic).toBe(true);
    expect(b).toMatchObject(parseRange(GENERIC_WORD_COUNT_RANGE)!);
  });

  /** ⚠️ REPORTED, NOT SWALLOWED — a genre with an unreadable range must not render as generic. */
  it("reports rather than falling back when a range cannot be read", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const genre = CANONICAL_GENRES.find((g) => g.wordCountRange)!;
    const saved = genre.wordCountRange;
    (genre as { wordCountRange?: string }).wordCountRange = "who knows";
    expect(bandFor(genre.id)).toBeNull();
    expect(spy).toHaveBeenCalled();
    (genre as { wordCountRange?: string }).wordCountRange = saved;
    spy.mockRestore();
  });

  it("returns nothing for an unknown genre rather than inventing a band", () => {
    expect(bandFor("not-a-genre")).toBeNull();
    expect(bandFor(undefined)).toBeNull();
  });
});

describe("the marker carries no state — this is reference, not a meter", () => {
  /**
   * ⚠️ THE ASSERTION THIS TILE EXISTS TO SURVIVE. A marker whose class changes with its position is
   * a verdict wearing a colour: "you are short", "you are over". It is IDENTICAL wherever it falls —
   * below every band, inside one, above them all — and `markerClass` takes no arguments at all,
   * so there is nothing it could vary by.
   */
  it("is the same class far below, inside, and far above every band", () => {
    const seen = new Set([markerClass(), markerClass(), markerClass()]);
    expect(seen.size).toBe(1);
    expect(markerClass.length, "markerClass grew a parameter it could judge by").toBe(0);
  });

  /** The position is a number and nothing else — clamped so an outlier stays on the chart. */
  it("positions by fraction, clamped, with no verdict attached", () => {
    expect(markerFraction(50000, 0, 100000)).toBeCloseTo(0.5);
    expect(markerFraction(-10, 0, 100000)).toBe(0);
    expect(markerFraction(999999, 0, 100000)).toBe(1);
  });

  it("the axis covers every band and the writer's own count", () => {
    const bands = [bandFor("fantasy")!, bandFor("literary-fiction")!];
    const axis = axisFor(bands, 250000);
    expect(axis.min).toBeLessThanOrEqual(Math.min(...bands.map((b) => b.min)));
    expect(axis.max).toBeGreaterThanOrEqual(250000);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ A STORED GENRE IS AN ID ON NEW MANUSCRIPTS AND A LEGACY LABEL ON OLDER ONES, and the first
   version of `bandFor` matched raw against `id` — so a book storing "Literary Fiction" got no band,
   no "Yours" row and NO MARKER AT ALL. Found by measuring the rendered page, not by reading.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe("a stored genre resolves the way the rest of the app resolves it", () => {
  it("reads a legacy label, not only a canonical id", () => {
    const byId = bandFor("literary-fiction");
    const byLabel = bandFor("Literary Fiction");
    expect(byId, "the canonical id stopped resolving").not.toBeNull();
    expect(byLabel, "a legacy label yields no band — the marker will not render").not.toBeNull();
    expect(byLabel).toEqual(byId);
  });

  it("reads an alias too", () => {
    expect(bandFor("litfic")).toEqual(bandFor("literary-fiction"));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE CHART WAS A DECORATION WITHOUT THESE. Bands with no axis and no figures cannot be read:
   you cannot get a number off them, which is the only thing a reference is for.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe("the chart states figures, not just bars", () => {
  it("labels each band with its range in the writer's units", () => {
    expect(rangeLabel({ label: "x", min: 55000, max: 90000, generic: false })).toBe("55–90k");
    expect(rangeLabel({ label: "x", min: 90000, max: 120000, generic: false })).toBe("90–120k");
  });

  /** ⚠️ ROUND TICKS A READER RECOGNISES, not one per band wherever the genres happen to fall. */
  it("puts an axis across the drawn range, on round numbers", () => {
    const ticks = axisTicks({ min: 0, max: 150000 });
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const t of ticks) expect(t % 25000, `${t} is not a round tick`).toBe(0);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(150000);
  });

  /** ⚠️ ROUGHLY FOUR LABELS. Seven ticks across a tile a third of a page wide is a crowded ruler. */
  it("widens the interval rather than crowding the axis", () => {
    for (const max of [100000, 150000, 300000, 700000]) {
      const n = axisTicks({ min: 0, max }).length;
      expect(n, `${max} drew ${n} ticks`).toBeLessThanOrEqual(5);
      expect(n, `${max} drew too few ticks to be a scale`).toBeGreaterThanOrEqual(3);
    }
    /* The scale the brief names, for the everyday case. */
    expect(axisTicks({ min: 0, max: 150000 })).toEqual([0, 50000, 100000, 150000]);
  });

  it("returns no ticks for a degenerate axis rather than looping", () => {
    expect(axisTicks({ min: 10, max: 10 })).toEqual([]);
  });
});

describe("the axis starts where a reader counts from", () => {
  /**
   * ⚠️ FROM ZERO. Padding around the data gave 64k–128k and ticks at 75/100/125 — arithmetically
   * fine and unreadable: a band starting two-thirds along a track that begins at 64k tells a reader
   * the opposite of the truth about how long the book is.
   */
  it("begins at 0 and ends on a round tick", () => {
    const axis = axisFor([{ label: "x", min: 70000, max: 100000, generic: false }], 92000);
    expect(axis.min).toBe(0);
    expect(axis.max % 25000).toBe(0);
    expect(axis.max).toBeGreaterThanOrEqual(100000);
  });

  it("gives a readable scale rather than one tick per band", () => {
    const ticks = axisTicks(axisFor([{ label: "x", min: 70000, max: 120000, generic: false }], 92000));
    expect(ticks).toContain(50000);
    expect(ticks).toContain(100000);
  });
});
