import { describe, it, expect, vi } from "vitest";
import {
  validateSuggestions,
  suggestFromModel,
  buildUserMessage,
  MalformedSuggestionsError,
  MAX_SUGGESTIONS,
  MAX_RATIONALE_CHARS,
  AnthropicLike,
} from "./suggestCompsCore";

const item = (over: Record<string, unknown> = {}) => ({
  title: "Gilded",
  author: "Marissa Meyer",
  year: 2021,
  rationale: "Craft-guild magic with a darkening bargain.",
  cautions: [],
  ...over,
});

const payload = (items: unknown[]) => ({ suggestions: items });

describe("validateSuggestions", () => {
  it("accepts well-formed items and normalises strings", () => {
    const out = validateSuggestions(payload([item({ title: "  Gilded  ", author: " Marissa Meyer " })]), []);
    expect(out).toEqual([item()]);
  });

  it("throws MalformedSuggestionsError when suggestions is not an array", () => {
    expect(() => validateSuggestions({}, [])).toThrow(MalformedSuggestionsError);
    expect(() => validateSuggestions(null, [])).toThrow(MalformedSuggestionsError);
    expect(() => validateSuggestions({ suggestions: "nope" }, [])).toThrow(MalformedSuggestionsError);
  });

  it("drops malformed items rather than failing", () => {
    const out = validateSuggestions(
      payload([item({ title: "" }), item({ author: "" }), item({ year: "2021" }), item({ year: 99 }), item()]),
      []
    );
    expect(out).toHaveLength(1);
  });

  it("filters cautions to the allow-list", () => {
    const out = validateSuggestions(
      payload([item({ cautions: ["MEGA-BESTSELLER", "TOO-OLD", "FRANCHISE-SCALE", 7] })]),
      []
    );
    expect(out[0].cautions).toEqual(["MEGA-BESTSELLER", "FRANCHISE-SCALE"]);
  });

  it("de-duplicates against the shelf and within the list, case-insensitively", () => {
    const out = validateSuggestions(
      payload([item(), item({ title: "GILDED" }), item({ title: "Iron Widow" })]),
      ["gilded"]
    );
    expect(out.map((s) => s.title)).toEqual(["Iron Widow"]);
  });

  it("caps the list and truncates over-long rationales", () => {
    const many = Array.from({ length: 10 }, (_, i) => item({ title: `Book ${i}` }));
    const out = validateSuggestions(payload(many), []);
    expect(out).toHaveLength(MAX_SUGGESTIONS);

    const long = validateSuggestions(payload([item({ rationale: "x".repeat(400) })]), []);
    expect(long[0].rationale).toHaveLength(MAX_RATIONALE_CHARS);
  });
});

describe("buildUserMessage", () => {
  it("carries the pitch facts and the shelf exclusions", () => {
    const msg = buildUserMessage({
      manuscriptTitle: "The Clockwork Citadel",
      ageCategory: "Young Adult",
      genre: "Steampunk fantasy",
      logline: "A guild clockmaker rebuilds her dying sibling into an engine.",
      shelfTitles: ["Gearbreakers", "A Darker Shade of Magic"],
    });
    expect(msg).toContain("The Clockwork Citadel");
    expect(msg).toContain("Gearbreakers · A Darker Shade of Magic");
    expect(msg).not.toContain("SYNOPSIS");
  });

  it("includes the synopsis block only when provided", () => {
    const msg = buildUserMessage({
      manuscriptTitle: "T",
      ageCategory: "Adult",
      genre: "Gothic mystery",
      logline: "",
      synopsis: "Three acts of dread.",
      shelfTitles: [],
    });
    expect(msg).toContain("=== SYNOPSIS ===");
    expect(msg).toContain("(none provided)");
  });
});

describe("suggestFromModel", () => {
  const input = {
    manuscriptTitle: "T",
    ageCategory: "Adult",
    genre: "Gothic mystery",
    logline: "L",
    shelfTitles: [],
  };
  const textResponse = (text: string) => ({
    content: [{ type: "text", text }],
    usage: { input_tokens: 10, output_tokens: 20 },
  });

  it("parses a clean response, stripping code fences", async () => {
    const client: AnthropicLike = {
      messages: {
        create: vi.fn().mockResolvedValue(
          textResponse("```json\n" + JSON.stringify(payload([item()])) + "\n```")
        ),
      },
    };
    const out = await suggestFromModel(client, input);
    expect(out.map((s) => s.title)).toEqual(["Gilded"]);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed output, then succeeds", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse("Here are some ideas: Gilded, Iron Widow!"))
      .mockResolvedValueOnce(textResponse(JSON.stringify(payload([item()]))));
    const out = await suggestFromModel({ messages: { create } }, input);
    expect(out).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("throws MalformedSuggestionsError when the retry is also invalid", async () => {
    const create = vi.fn().mockResolvedValue(textResponse("still not json"));
    await expect(suggestFromModel({ messages: { create } }, input)).rejects.toBeInstanceOf(
      MalformedSuggestionsError
    );
    expect(create).toHaveBeenCalledTimes(2);
  });
});
