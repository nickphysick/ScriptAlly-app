/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 §B — the Cards view's arithmetic: never a card under 340px, never more than three across.
 */
import { describe, expect, it } from "vitest";
import { CARD_GAP_COL, CARD_MIN, cardColumns } from "./contactCards";

describe("cardColumns", () => {
  it("fits as many 340px cards as the width holds, 1 to 3", () => {
    expect(cardColumns(0)).toBe(1);
    expect(cardColumns(339)).toBe(1);
    expect(cardColumns(CARD_MIN * 2 + CARD_GAP_COL - 1)).toBe(1);
    expect(cardColumns(CARD_MIN * 2 + CARD_GAP_COL)).toBe(2);
    expect(cardColumns(CARD_MIN * 3 + CARD_GAP_COL * 2)).toBe(3);
    expect(cardColumns(5000)).toBe(3);
  });
  it("never leaves a card narrower than 340", () => {
    for (let w = 340; w <= 2400; w += 7) {
      const n = cardColumns(w);
      expect((w - CARD_GAP_COL * (n - 1)) / n).toBeGreaterThanOrEqual(CARD_MIN);
    }
  });
});
