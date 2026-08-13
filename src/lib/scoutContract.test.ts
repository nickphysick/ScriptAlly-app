/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Scout's contract — Prompt 2. The verification half is locked in suggestComps.test.ts; this
 * covers what Prompt 2 added: the run envelope, the composed facts chip, and the Pro gate's client
 * half.
 */
import { describe, it, expect } from "vitest";
import {
  ScoutRun,
  SuggestCompsError,
  factsChip,
  fetchCompRun,
  validateRunPayload,
} from "./suggestComps";

const REC = { catalogue: "Google Books", checkedAt: "2026-08-13T09:41:00.000Z" };
const sug = (over: Record<string, unknown> = {}) => ({
  title: "Gilded", author: "Marissa Meyer", year: 2021, media: "book",
  why: "Craft-guild magic with a darkening bargain.", verification: REC, ...over,
});

describe("validateRunPayload — the run envelope", () => {
  it("carries the server's runAt through", () => {
    const r = validateRunPayload({ runAt: REC.checkedAt, suggestions: [sug()] });
    expect(r.runAt).toBe(REC.checkedAt);
    expect(r.suggestions).toHaveLength(1);
  });

  /**
   * ⚠️ A BAD `runAt` COSTS THE CLAIM, NEVER THE RUN. The suggestions are real and verified; only the
   * status strip loses its timestamp. Discarding six checked titles because a date field was
   * malformed would be the tail wagging the dog — and the strip has a wording for "been out, don't
   * know when".
   */
  it("drops an unusable timestamp and keeps the suggestions", () => {
    for (const bad of [undefined, null, "", "not a date", 12345, {}]) {
      const r: ScoutRun = validateRunPayload({ runAt: bad, suggestions: [sug()] });
      expect(r.runAt, `runAt ${JSON.stringify(bad)} survived`).toBe("");
      expect(r.suggestions, "a bad date discarded the run").toHaveLength(1);
    }
  });

  it("still drops a suggestion with no verification, envelope or not", () => {
    const r = validateRunPayload({ runAt: REC.checkedAt, suggestions: [sug({ verification: undefined })] });
    expect(r.suggestions).toEqual([]);
  });
});

describe("factsChip — composed at render, never sent as prose", () => {
  /**
   * ⚠️ THE PACK'S `facts` STRING IS DELIBERATELY NOT IN THE CONTRACT (baked decision 20). A
   * model-composed display line rendering as a factual-looking chip is exactly the shape the trust
   * rule exists to stop: nothing stands behind "THRILLER · DEBUT · 2024" but the model's word.
   */
  it("states the medium and the year for a non-book", () => {
    expect(factsChip({ media: "film", year: 2019 })).toBe("film · 2019");
    expect(factsChip({ media: "tv", year: 2024 })).toBe("tv · 2024");
  });

  /**
   * ⚠️ IT OMITS ITSELF FOR A BOOK. `media` absent means book, and the year is already on the line
   * above — a `BOOK · 2024` chip would restate one fact and assert a second that is only the
   * default. Rows omit themselves when they have nothing to add; so does this.
   */
  it("omits itself for a book, stated or defaulted", () => {
    expect(factsChip({ media: "book", year: 2024 })).toBeNull();
    expect(factsChip({ media: undefined, year: 2024 })).toBeNull();
  });

  /** it can only compose from structured fields — no genre, no debut flag, because we have neither */
  it("never invents a genre or a debut claim", () => {
    const out = factsChip({ media: "film", year: 2019 }) ?? "";
    expect(out).not.toMatch(/debut|thriller|mystery|romance|fantasy/i);
  });
});

describe("the Pro gate — the client half of two", () => {
  /**
   * ⚠️ THIS REFUSAL IS A COURTESY, NOT A CONTROL. It stops the UI dispatching; anyone can call the
   * callable directly. The FUNCTION must reject a non-Pro caller server-side, and that lands with
   * `scoutComps` in Prompt 3 — client gating alone is not a gate on a paid API.
   */
  it("refuses to dispatch for a free user, before any network call", async () => {
    await expect(fetchCompRun({
      manuscriptId: "m", manuscriptTitle: "T", ageCategory: "Adult", genre: "Crime",
      logline: "", shelfTitles: [],
    }, false)).rejects.toBeInstanceOf(SuggestCompsError);
  });

  it("reports it as a permission refusal rather than a network fault", async () => {
    try {
      await fetchCompRun({
        manuscriptId: "m", manuscriptTitle: "T", ageCategory: "Adult", genre: "Crime",
        logline: "", shelfTitles: [],
      }, false);
      throw new Error("expected a refusal");
    } catch (e) {
      expect((e as SuggestCompsError).code).toBe("permission-denied");
    }
  });
});
