/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comp edits write no feed item; every other manuscript write keeps its item (Nick, 27 Sep).
 * The rendered half is compsMat.measure.ts C10 (a real reorder adds zero feed items).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { narratesManuscriptWrite } from "./manuscriptFeed";

describe("narratesManuscriptWrite", () => {
  const comps = [{ title: "Salt Road", inQuery: true }, { title: "The Tidewater Line" }];

  it("a write that changes `comps` alone narrates nothing — add, edit, remove, reorder, the switch all send exactly { comps }", () => {
    expect(narratesManuscriptWrite({ comps })).toBe(false);
    expect(narratesManuscriptWrite({ comps: [] })).toBe(false);
  });

  it("an edit to the manuscript's title still narrates — as does any write carrying another field", () => {
    expect(narratesManuscriptWrite({ title: "Murphy's Day Out" })).toBe(true);
    expect(narratesManuscriptWrite({ comps, title: "Murphy's Day Out" })).toBe(true);
    expect(narratesManuscriptWrite({ comps, status: "Querying" as never })).toBe(true);
    expect(narratesManuscriptWrite({ wordCount: 50000 })).toBe(true);
  });

  it("an empty write narrates as before (unchanged behaviour, not a comps write)", () => {
    expect(narratesManuscriptWrite({})).toBe(true);
  });

  it("updateManuscript gates its MANUSCRIPT_UPDATED item on it, and only that item", () => {
    const db = readFileSync(resolve(__dirname, "db.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const at = db.indexOf("const updateManuscript = async");
    const end = db.indexOf("const updateManuscriptQuiet = async");
    expect(at, "updateManuscript moved").toBeGreaterThan(-1);
    expect(end, "updateManuscriptQuiet moved").toBeGreaterThan(at);
    const body = db.slice(at, end);
    expect(body).toMatch(/if \(writeSuccess && narratesManuscriptWrite\(fields\)\)/);
    expect(body).toContain("ActivityType.MANUSCRIPT_UPDATED");
  });
});
