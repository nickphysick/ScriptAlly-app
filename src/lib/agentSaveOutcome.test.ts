/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The save notice's sentences. `saveOutcome`'s own cases retired with the function (v11 P3 —
 * the page derives survival and position against the v11 pipeline now, and THOSE derivations
 * are locked in contactList.test.ts); what still needs a lock here is the wording two surfaces
 * read, and the 1-based position a person counts.
 */
import { describe, expect, it } from "vitest";
import { saveNotice } from "./agentSaveOutcome";

describe("saveNotice — one wording for both outcomes", () => {
  it("a filtered-out save says so, without blaming the writer", () => {
    expect(saveNotice("Eleanor Whitfield", { kind: "filtered-out" }))
      .toBe("Eleanor Whitfield saved. Not shown under your current filters.");
  });

  it("a travelling save states a 1-based position under the named sort", () => {
    expect(saveNotice("Eleanor Whitfield", { kind: "travel", index: 3, total: 12, sortLabel: "Next action due" }))
      .toBe("Eleanor Whitfield saved. Moved to position 3 under Next action due.");
  });

  it("a nameless record still gets a subject", () => {
    expect(saveNotice("  ", { kind: "filtered-out" })).toMatch(/^That agent saved\./);
  });
});
