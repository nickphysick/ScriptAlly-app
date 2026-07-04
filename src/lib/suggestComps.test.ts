import { describe, it, expect } from "vitest";
import {
  isProUser,
  validateSuggestionsPayload,
  suggestionCautions,
  visibleSuggestions,
  suggestionToComp,
  CompSuggestion,
} from "./suggestComps";
import { UserPlan } from "../types";

const sugg = (over: Partial<CompSuggestion> = {}): CompSuggestion => ({
  title: "Gilded",
  author: "Marissa Meyer",
  year: 2021,
  rationale: "Craft-guild magic with a darkening bargain.",
  cautions: [],
  ...over,
});

describe("isProUser (the Suggestions gate)", () => {
  it("passes Pro, blocks Free and signed-out", () => {
    expect(isProUser({ plan: UserPlan.PRO })).toBe(true);
    expect(isProUser({ plan: UserPlan.FREE })).toBe(false);
    expect(isProUser(null)).toBe(false);
    expect(isProUser(undefined)).toBe(false);
  });
});

describe("validateSuggestionsPayload", () => {
  it("accepts well-formed items", () => {
    const out = validateSuggestionsPayload({
      suggestions: [sugg(), sugg({ title: "Iron Widow", cautions: ["MEGA-BESTSELLER"] })],
    });
    expect(out).toHaveLength(2);
    expect(out[1].cautions).toEqual(["MEGA-BESTSELLER"]);
  });

  it("drops items missing title/author or with a nonsense year", () => {
    const out = validateSuggestionsPayload({
      suggestions: [
        sugg({ title: "" }),
        sugg({ author: "" }),
        sugg({ year: 12 }),
        sugg({ year: 2021.5 as unknown as number }),
        sugg({ title: "Keeper" }),
      ],
    });
    expect(out.map((s) => s.title)).toEqual(["Keeper"]);
  });

  it("filters caution values outside the allow-list", () => {
    const out = validateSuggestionsPayload({
      suggestions: [sugg({ cautions: ["MEGA-BESTSELLER", "SELF-PUBLISHED", "FRANCHISE-SCALE"] as string[] })],
    });
    expect(out[0].cautions).toEqual(["MEGA-BESTSELLER", "FRANCHISE-SCALE"]);
  });

  it("returns [] for a missing or non-array payload", () => {
    expect(validateSuggestionsPayload(undefined)).toEqual([]);
    expect(validateSuggestionsPayload({})).toEqual([]);
    expect(validateSuggestionsPayload({ suggestions: "nope" })).toEqual([]);
  });
});

describe("suggestionCautions", () => {
  it("appends the derived age flag past five years, after the scale flags", () => {
    expect(suggestionCautions(sugg({ year: 2021, cautions: ["MEGA-BESTSELLER"] }), 2026)).toEqual([
      "MEGA-BESTSELLER",
      "5 YEARS OLD",
    ]);
    expect(suggestionCautions(sugg({ year: 2001 }), 2026)).toEqual(["25 YEARS OLD"]);
  });
  it("adds nothing for a recent title", () => {
    expect(suggestionCautions(sugg({ year: 2024 }), 2026)).toEqual([]);
  });
});

describe("visibleSuggestions", () => {
  it("filters shelf titles (case-insensitive) and session dismissals", () => {
    const list = [sugg(), sugg({ title: "Iron Widow" }), sugg({ title: "Six of Crows" })];
    const out = visibleSuggestions(list, ["gilded"], ["SIX OF CROWS"]);
    expect(out.map((s) => s.title)).toEqual(["Iron Widow"]);
  });
});

describe("suggestionToComp", () => {
  it("writes a suggested-source comp with no undefined values", () => {
    const comp = suggestionToComp(sugg());
    expect(comp).toEqual({
      title: "Gilded",
      source: "suggested",
      author: "Marissa Meyer",
      year: 2021,
    });
    expect(Object.values(comp).some((v) => v === undefined)).toBe(false);
    expect("note" in comp).toBe(false);
  });
});
