/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboard — the pure layer's locks that survive Corkboard v2 (v1's board-layer cases retired with it; the v2
 * derivations are corkboardV2.test.ts). The rendered claims are tests/e2e/corkboardV2.measure.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chipCounts } from "./corkboard";

describe("the tag pills' counts", () => {
  it("chip counts read the list they are given: All is every note, a tag is the notes carrying it", () => {
    const notes = [{ tags: ["a", "b"] }, { tags: ["a"] }, { tags: undefined }, { tags: [] }, { tags: ["b", "b"] }];
    const c = chipCounts(notes);
    expect(c.get(null)).toBe(5);
    expect(c.get("a")).toBe(2);
    expect(c.get("b"), "a note carrying one tag twice is one note").toBe(2);
    expect(c.get("never")).toBeUndefined();
  });
});

describe("⚠️ the review aid is a dev build's alone", () => {
  it("the page calls it behind a statically replaced MODE, so a production build cannot reach the module", () => {
    const page = readFileSync(resolve(__dirname, "../components/todo/TodoNoteboardPage.tsx"), "utf8");
    expect(page).toContain('import.meta.env.MODE === "production" ? storedTasks : onlyForReview(storedTasks)');
    expect([...page.matchAll(/onlyForReview\(/g)].length).toBe(1);
  });
});
