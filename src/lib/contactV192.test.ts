/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.2 — the row's words: the reply time spelled out (§C).
 */
import { describe, expect, it } from "vitest";
import { replyWeeksLabel } from "./contactList";

describe("v19.2 §C — the reply time reads ~N weeks, never wks", () => {
  it("spells the unit out, singular at one", () => {
    expect(replyWeeksLabel(6)).toBe("~6 weeks");
    expect(replyWeeksLabel(1)).toBe("~1 week");
    expect(replyWeeksLabel(12)).toBe("~12 weeks");
  });
  it("an absent, zero or nonsense window has no words (the cell reads Not stated)", () => {
    for (const w of [undefined, null, 0, -3, Number.NaN]) expect(replyWeeksLabel(w)).toBeNull();
  });
});
