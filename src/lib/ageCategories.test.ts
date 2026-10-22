/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 Part E — the UK age categories and the read-time normaliser (MSV28 E1/E2, unit halves).
 */
import { describe, it, expect } from "vitest";
import { AGE_LIST, DEFAULT_AGE, ageDisplay, agentAgeCategories, importAgeCategory, normaliseAgeCategory, sameAgeCategory } from "./ageCategories";
import { AGE_CATEGORIES, genreWordCountRange } from "./manuscripts";
import { commonGenresFor } from "./genres";
import { calculateCommunityAgentMatch } from "./communityMatch";
import type { CommunityAgent, Manuscript } from "../types";

describe("E1 — the list", () => {
  it("Adult, Young adult, Middle grade; then Young fiction, Picture book, New adult under Other; Adult the default", () => {
    expect(AGE_LIST.filter((a) => a.main).map((a) => [a.label, a.range])).toEqual([["Adult", "18+"], ["Young adult", "12–18"], ["Middle grade", "9–12"]]);
    expect(AGE_LIST.filter((a) => !a.main).map((a) => [a.label, a.range, a.note])).toEqual([
      ["Young fiction", "5–8", "First chapter books"], ["Picture book", "0–6", "Text, or written and illustrated"], ["New adult", "18–25", "Some agents list it; most query as adult"],
    ]);
    expect(AGE_CATEGORIES).toEqual(["Adult", "Young adult", "Middle grade", "Young fiction", "Picture book", "New adult"]);
    expect(DEFAULT_AGE).toBe("Adult");
  });
});

describe("E2 — old values read, display and match as the new ones", () => {
  it.each([["Picture Book", "Picture book"], ["Early Reader", "Young fiction"], ["Middle Grade", "Middle grade"], ["Young Adult", "Young adult"], ["New Adult", "New adult"], ["Adult", "Adult"],
    ["young-adult", "Young adult"], ["YA", "Young adult"], ["mg", "Middle grade"], ["picture-book", "Picture book"]] as const)("%s → %s", (old, now) => {
    expect(normaliseAgeCategory(old)).toBe(now);
    expect(ageDisplay(old)).toBe(now);
  });
  it("a value that maps to nothing is shown as stored, and never matches", () => {
    expect(normaliseAgeCategory("General Adult")).toBeNull();
    expect(ageDisplay("General Adult")).toBe("General Adult");
    expect(sameAgeCategory("General Adult", "Adult")).toBe(false);
  });
  it("matches agents stored with either spelling, in the Discover score", () => {
    const agent = (genres: string[]) => ({ id: "a", name: "A", agency: "B", email: "", website: "", genres, mswl: "" }) as unknown as CommunityAgent;
    const ms = (ageCategory: string) => ({ id: "m", title: "T", genre: "Fantasy", subGenres: [], ageCategory, wordCount: 1, logline: "", comps: [] }) as unknown as Manuscript;
    for (const stored of ["Young Adult", "Young adult"]) for (const listed of ["Young Adult", "Young adult", "young-adult", "YA"]) {
      expect(calculateCommunityAgentMatch(agent([listed]), ms(stored)).ageScore, `${stored} vs ${listed}`).toBe(15);
    }
    expect(calculateCommunityAgentMatch(agent(["Middle Grade"]), ms("Early Reader")).ageScore).toBe(0);
    expect(agentAgeCategories(["Thriller", "young-adult", "Middle Grade"])).toEqual(["Young adult", "Middle grade"]);
  });
  it("Smart Import and CSV import accept old and new spellings", () => {
    expect(importAgeCategory("Young Adult")).toBe("Young adult");
    expect(importAgeCategory("young adult")).toBe("Young adult");
    expect(importAgeCategory("Early Reader")).toBe("Young fiction");
    expect(importAgeCategory("Literary")).toBe("Literary");
  });
  it("the age-keyed tables read either spelling", () => {
    expect(commonGenresFor("Young Adult")).toEqual(commonGenresFor("Young adult"));
    expect(commonGenresFor("Young adult").length).toBeGreaterThan(0);
    expect(genreWordCountRange("Early Reader", "")).toBe(genreWordCountRange("Young fiction", ""));
    expect(genreWordCountRange("Middle Grade", "")).toBe("30,000 – 55,000");
  });
});
