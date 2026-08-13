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
import { isVerified } from "./comps";
import { CompTitle, UserPlan } from "../types";

const REC = { catalogue: "Google Books", checkedAt: "2026-08-13T09:41:00.000Z" };

const sugg = (over: Partial<CompSuggestion> = {}): CompSuggestion => ({
  title: "Gilded",
  author: "Marissa Meyer",
  year: 2021,
  media: "book",
  why: "Craft-guild magic with a darkening bargain.",
  verification: REC,
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

  it("defaults media to book, and keeps a valid non-book media", () => {
    const out = validateSuggestionsPayload({
      suggestions: [
        { title: "T", author: "A", year: 2020, why: "w", verification: REC },
        { title: "F", author: "A", year: 2006, why: "w", media: "film", verification: REC },
      ],
    });
    expect(out[0].media).toBe("book");
    expect(out[1].media).toBe("film");
  });

  /**
   * ⚠️ THE TRUST RULE, ASSERTED IN THE DIRECTION THAT CAN FABRICATE. Dropping the row is not
   * pedantry: the card footer promises every title was checked against a real catalogue, so a row
   * that survived WITHOUT a check makes that sentence false. Downgrading it to an unverified row
   * would keep a title the Scout cannot stand behind — which is the same claim, quieter.
   */
  it("drops a suggestion with no verification record at all", () => {
    const out = validateSuggestionsPayload({
      suggestions: [{ title: "T", author: "A", year: 2020, why: "w" }],
    });
    expect(out).toEqual([]);
  });

  it("REJECTS a payload claiming verified:true without a record — never downgrades it", () => {
    const out = validateSuggestionsPayload({
      suggestions: [{ title: "T", author: "A", year: 2020, why: "w", verified: true }],
    });
    expect(out).toEqual([]);
  });

  it("drops a half-written record, and never reads a stored boolean", () => {
    const out = validateSuggestionsPayload({
      suggestions: [
        { title: "A", author: "A", year: 2020, why: "w", verification: {} },
        { title: "B", author: "A", year: 2020, why: "w", verification: { catalogue: "Google Books" } },
        { title: "C", author: "A", year: 2020, why: "w", verification: { checkedAt: REC.checkedAt } },
        { title: "D", author: "A", year: 2020, why: "w", verification: REC, verified: false },
      ],
    });
    /* D survives on its RECORD, with `verified: false` sitting in the payload and ignored */
    expect(out.map((s) => s.title)).toEqual(["D"]);
    expect("verified" in out[0]).toBe(false);
  });

  it("carries the record through, omitting externalId when the catalogue gave none", () => {
    const out = validateSuggestionsPayload({
      suggestions: [
        sugg(),
        sugg({ title: "Z", verification: { ...REC, externalId: "gb-1" } }),
      ],
    });
    expect(out[0].verification).toEqual(REC);
    expect("externalId" in out[0].verification).toBe(false);
    expect(out[1].verification.externalId).toBe("gb-1");
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
      verification: REC,
      publisher: "Feiwel",
      matchAxis: "premise · voice",
    });
    expect("inQuery" in comp).toBe(false);
    expect(Object.values(comp).some((v) => v === undefined)).toBe(false);
  });

  /**
   * ⚠️ THE GAP THIS CLOSES: before the record was persisted, a Scout comp lost its verified
   * standing the moment it landed, so the chip could only ever exist in the right-hand column on a
   * suggestion still in flight. Asserted through `isVerified` rather than by field presence — the
   * chip's real predicate is what has to survive the write, not the key.
   */
  it("carries the verification record onto the comp, so the chip survives the landing", () => {
    expect(isVerified(suggestionToComp(sugg()))).toBe(true);
  });

  it("gives a manual comp no record and therefore no chip", () => {
    const manual: CompTitle = { title: "Typed by hand", source: "user" };
    expect(isVerified(manual)).toBe(false);
  });
  it("omits media when the suggestion is a book, keeps it otherwise", () => {
    expect("media" in suggestionToComp(sugg({ media: "book" }))).toBe(false);
    expect(suggestionToComp(sugg({ media: "film" })).media).toBe("film");
  });
});
