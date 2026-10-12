/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboard — the pure layer's locks (Corkboard v1). The rendered claims are tests/e2e/corkboardV1.measure.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CORKBOARD_SUBLINE, PAD_LABEL, chipCounts, corkboardHeaderCopy } from "./corkboard";
import { NOTE_COLOURS } from "./noteboard";
import { wordsOf } from "../components/shell/PanelHeader";

const ref = readFileSync(resolve(__dirname, "../../design-refs/corkboard-v4/corkboard-v4.html"), "utf8");

describe("the header is a number page: the count, then its words", () => {
  it("the words are the ref's, and one note is singular", () => {
    expect(wordsOf(corkboardHeaderCopy(8).headline)).toBe("notes pinned to your corkboard");
    expect(wordsOf(corkboardHeaderCopy(1).headline)).toBe("note pinned to your corkboard");
    expect(wordsOf(corkboardHeaderCopy(2).headline)).toBe("notes pinned to your corkboard");
    /* the ref breaks the words over two lines with a <br>; the words are the same */
    expect(ref.replace(/<br>/g, " ")).toContain("notes pinned to your corkboard");
    expect(ref).toContain(CORKBOARD_SUBLINE);
    for (const n of [1, 2, 8, 40]) expect(corkboardHeaderCopy(n).subline).toEqual([CORKBOARD_SUBLINE]);
  });

  it("⚠️ every count yields a headline the panel can split — a headline with no number would render as a TITLE", () => {
    for (const n of [1, 2, 3, 10, 99, 100]) expect(wordsOf(corkboardHeaderCopy(n).headline), String(n)).not.toBeNull();
  });
});

describe("the filter row", () => {
  it("chip counts read the list they are given: All is every note, a tag is the notes carrying it", () => {
    const notes = [{ tags: ["a", "b"] }, { tags: ["a"] }, { tags: undefined }, { tags: [] }, { tags: ["b", "b"] }];
    const c = chipCounts(notes);
    expect(c.get(null)).toBe(5);
    expect(c.get("a")).toBe(2);
    expect(c.get("b"), "a note carrying one tag twice is one note").toBe(2);
    expect(c.get("never")).toBeUndefined();
  });

  it("the three paper squares are the composer's three papers, in its order, each named", () => {
    expect(Object.keys(PAD_LABEL)).toEqual([...NOTE_COLOURS]);
    for (const c of NOTE_COLOURS) expect(ref, c).toContain(`aria-label="${PAD_LABEL[c]}"`);
  });
});

describe("⚠️ the review aid is a dev build's alone", () => {
  it("the page calls it behind a statically replaced MODE, so a production build cannot reach the module", () => {
    const page = readFileSync(resolve(__dirname, "../components/todo/TodoNoteboardPage.tsx"), "utf8");
    expect(page).toContain('import.meta.env.MODE === "production" ? storedTasks : onlyForReview(storedTasks)');
    expect([...page.matchAll(/onlyForReview\(/g)].length).toBe(1);
  });
});
