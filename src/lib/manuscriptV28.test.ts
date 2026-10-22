/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — the pure halves of MSV28.
 */
import { describe, it, expect } from "vitest";
import { wordCountHint } from "./manuscriptV28";

describe("C1 — the word-count hint is silent unless the count is way off", () => {
  /* thriller is 70,000 – 90,000: under below 52,500, over above 112,500 */
  it.each([[80_000, null], [55_000, null], [52_500, null], [112_500, null], [50_000, "under"], [115_000, "over"]] as const)("%i words → %s", (w, side) => {
    expect(wordCountHint(w, "Thriller")?.side ?? null).toBe(side);
  });
  it("the words are the prompt's", () => {
    const h = wordCountHint(50_000, "thriller")!;
    expect(h.lead + h.rest).toBe("That’s well under the usual range for thriller (70,000 – 90,000 words). Some agents pass on length alone.");
    expect(wordCountHint(115_000, "Thriller")!.lead).toBe("That’s well over");
  });
  it("no count, no genre: no hint", () => {
    expect(wordCountHint(null, "Thriller")).toBeNull();
    expect(wordCountHint(10, "")).toBeNull();
  });
});
