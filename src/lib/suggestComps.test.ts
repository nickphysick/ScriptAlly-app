import { describe, it, expect } from "vitest";
import {
  isProUser,
  scoutLive,
  SCOUT_LIVE,
  validateSuggestionsPayload,
  visibleSuggestions,
  suggestionToComp,
  CompSuggestion,
} from "./suggestComps";
import { UserPlan } from "../types";

const sugg = (over: Partial<CompSuggestion> = {}): CompSuggestion => ({
  title: "Gilded",
  author: "Marissa Meyer",
  year: 2021,
  media: "book",
  why: "Craft-guild magic with a darkening bargain.",
  verified: true,
  ...over,
});

describe("isProUser (the Scout gate)", () => {
  it("passes Pro, blocks Free and signed-out", () => {
    expect(isProUser({ plan: UserPlan.PRO })).toBe(true);
    expect(isProUser({ plan: UserPlan.FREE })).toBe(false);
    expect(isProUser(null)).toBe(false);
    expect(isProUser(undefined)).toBe(false);
  });
});

describe("SCOUT_LIVE flag", () => {
  it("defaults OFF", () => {
    expect(SCOUT_LIVE).toBe(false);
  });
  it("scoutLive() reflects the default without an override", () => {
    delete (globalThis as { __SA_SCOUT_LIVE?: boolean }).__SA_SCOUT_LIVE;
    expect(scoutLive()).toBe(false);
  });
  it("scoutLive() honours the global override, then restores", () => {
    (globalThis as { __SA_SCOUT_LIVE?: boolean }).__SA_SCOUT_LIVE = true;
    expect(scoutLive()).toBe(true);
    delete (globalThis as { __SA_SCOUT_LIVE?: boolean }).__SA_SCOUT_LIVE;
  });
});

describe("validateSuggestionsPayload", () => {
  it("accepts well-formed items with the full Scout shape", () => {
    const out = validateSuggestionsPayload({
      suggestions: [
        sugg(),
        sugg({
          title: "The Bone Shard Daughter",
          publisher: "Orbit",
          matchAxis: "bio-mechanical magic",
          links: { bookshop: "https://bookshop.org/x", googleBooks: "https://books.google/x" },
          agentMatch: 2,
        }),
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[1].publisher).toBe("Orbit");
    expect(out[1].links).toEqual({ bookshop: "https://bookshop.org/x", googleBooks: "https://books.google/x" });
    expect(out[1].agentMatch).toBe(2);
  });

  it("defaults media to book and verified to false", () => {
    const out = validateSuggestionsPayload({
      suggestions: [{ title: "T", author: "A", year: 2020, why: "w" }],
    });
    expect(out[0].media).toBe("book");
    expect(out[0].verified).toBe(false);
  });

  it("keeps a valid non-book media and a true verified", () => {
    const out = validateSuggestionsPayload({
      suggestions: [{ title: "T", author: "A", year: 2006, why: "w", media: "film", verified: true }],
    });
    expect(out[0].media).toBe("film");
    expect(out[0].verified).toBe(true);
  });

  it("drops items missing title/author/why or with a nonsense year", () => {
    const out = validateSuggestionsPayload({
      suggestions: [
        sugg({ title: "" }),
        sugg({ author: "" }),
        sugg({ why: "" }),
        sugg({ year: 12 }),
        sugg({ year: 2021.5 as unknown as number }),
        sugg({ title: "Keeper" }),
      ],
    });
    expect(out.map((s) => s.title)).toEqual(["Keeper"]);
  });

  it("omits agentMatch when absent or non-positive", () => {
    const out = validateSuggestionsPayload({
      suggestions: [sugg(), sugg({ title: "Z", agentMatch: 0 })],
    });
    expect("agentMatch" in out[0]).toBe(false);
    expect("agentMatch" in out[1]).toBe(false);
  });

  it("returns [] for a missing or non-array payload", () => {
    expect(validateSuggestionsPayload(undefined)).toEqual([]);
    expect(validateSuggestionsPayload({})).toEqual([]);
    expect(validateSuggestionsPayload({ suggestions: "nope" })).toEqual([]);
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
  it("writes an unticked suggested-source comp with no undefined values", () => {
    const comp = suggestionToComp(sugg({ publisher: "Feiwel", matchAxis: "premise · voice" }));
    expect(comp).toEqual({
      title: "Gilded",
      source: "suggested",
      author: "Marissa Meyer",
      year: 2021,
      publisher: "Feiwel",
      matchAxis: "premise · voice",
    });
    expect("inQuery" in comp).toBe(false);
    expect(Object.values(comp).some((v) => v === undefined)).toBe(false);
  });
  it("omits media when the suggestion is a book, keeps it otherwise", () => {
    expect("media" in suggestionToComp(sugg({ media: "book" }))).toBe(false);
    expect(suggestionToComp(sugg({ media: "film" })).media).toBe("film");
  });
});
