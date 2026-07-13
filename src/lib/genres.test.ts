import { describe, it, expect } from "vitest";
import {
  CANONICAL_GENRES,
  GENERIC_WORD_COUNT_RANGE,
  MAX_PERSONAL_GENRES,
  matchKey,
  cleanGenreLabel,
  isJunkGenre,
  isPersonalId,
  personalGenreId,
  resolveGenre,
  genreLabel,
  wordCountRangeForGenre,
  mapLegacyGenre,
  canonicalGenreById,
  normaliseStoredGenre,
  genreDisplay,
  type PersonalGenre,
} from "./genres";
import { PREDEFINED_GENRES } from "./manuscripts";
import { AGENT_GENRES } from "./agentOptions";

const UID = "user123";

describe("matchKey — the comparison normaliser", () => {
  it("folds casing, punctuation and & so spelling variants collapse", () => {
    expect(matchKey("Sci-Fi")).toBe("sci fi");
    expect(matchKey("sci fi")).toBe("sci fi");
    expect(matchKey("Action & Adventure")).toBe("action and adventure");
    expect(matchKey("  Literary   Fiction ")).toBe("literary fiction");
    expect(matchKey("Children’s")).toBe("children s");
  });
});

describe("canonical taxonomy integrity", () => {
  it("has unique ids", () => {
    const ids = CANONICAL_GENRES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("stores kebab-case ids, never a display label", () => {
    for (const g of CANONICAL_GENRES) {
      expect(g.id).toMatch(/^[a-z][a-z-]*[a-z]$/);
      expect(g.id).not.toContain(" ");
    }
  });
  it("resolves every one of its own labels + aliases to its id", () => {
    for (const g of CANONICAL_GENRES) {
      expect(resolveGenre(g.label, UID)).toMatchObject({ status: "canonical", id: g.id });
      for (const a of g.aliases) {
        expect(resolveGenre(a, UID)).toMatchObject({ status: "canonical", id: g.id });
      }
    }
  });
});

describe("union completeness — no legacy label is orphaned (migration safety)", () => {
  it("every PREDEFINED_GENRES (manuscript) label maps to a canonical id", () => {
    for (const label of PREDEFINED_GENRES) {
      expect(mapLegacyGenre(label)).toHaveProperty("id");
    }
  });
  it("every AGENT_GENRES label maps to a canonical id", () => {
    for (const label of AGENT_GENRES) {
      expect(mapLegacyGenre(label)).toHaveProperty("id");
    }
  });
});

describe("resolveGenre — the guardrail pipeline (3b)", () => {
  it("canonical hit via a messy alias", () => {
    expect(resolveGenre("  LITFIC ", UID)).toEqual({ status: "canonical", id: "literary-fiction", label: "Literary fiction" });
    expect(resolveGenre("romantic fantasy", UID)).toMatchObject({ status: "canonical", id: "romantasy" });
  });
  it("returns an existing personal genre before offering to create a new one", () => {
    const personal: PersonalGenre[] = [{ id: "u:user123:northern-gothic", label: "Northern gothic" }];
    expect(resolveGenre("northern gothic", UID, personal)).toEqual({
      status: "personal",
      id: "u:user123:northern-gothic",
      label: "Northern gothic",
    });
  });
  it("offers a new personal genre only when all three tiers miss", () => {
    const r = resolveGenre("Northern gothic", UID);
    expect(r).toEqual({ status: "new-personal", id: "u:user123:northern-gothic", label: "Northern gothic" });
  });
  it("rejects junk", () => {
    expect(resolveGenre("x", UID).status).toBe("rejected");
    expect(resolveGenre("123", UID).status).toBe("rejected");
    expect(resolveGenre("   ", UID).status).toBe("rejected");
    expect(resolveGenre("!!!", UID).status).toBe("rejected");
  });
  it("blocks a new personal genre once the cap is reached", () => {
    const personal: PersonalGenre[] = Array.from({ length: MAX_PERSONAL_GENRES }, (_, i) => ({
      id: `u:user123:custom-${i}`,
      label: `Custom ${i}`,
    }));
    expect(resolveGenre("Brand new", UID, personal).status).toBe("at-limit");
    // ...but an existing personal genre still resolves at the cap.
    expect(resolveGenre("Custom 0", UID, personal).status).toBe("personal");
  });
});

describe("ids and labels", () => {
  it("personalGenreId is u:{uid}:{slug}", () => {
    expect(personalGenreId(UID, "Northern Gothic")).toBe("u:user123:northern-gothic");
    expect(isPersonalId("u:user123:northern-gothic")).toBe(true);
    expect(isPersonalId("literary-fiction")).toBe(false);
  });
  it("genreLabel resolves canonical, personal, and orphaned personal ids", () => {
    expect(genreLabel("literary-fiction")).toBe("Literary fiction");
    expect(genreLabel("u:user123:northern-gothic", [{ id: "u:user123:northern-gothic", label: "Northern gothic" }])).toBe("Northern gothic");
    // orphan (id present in data, registry entry missing) → slug-derived, never raw machine text
    expect(genreLabel("u:user123:northern-gothic")).toBe("Northern gothic");
  });
  it("cleanGenreLabel tidies without changing the user's words; caps length", () => {
    expect(cleanGenreLabel("  Northern   Gothic  ")).toBe("Northern Gothic");
    expect(cleanGenreLabel("a".repeat(60)).length).toBe(40);
  });
});

describe("word-count range (3f) — always usable", () => {
  it("canonical genres carry their range", () => {
    expect(wordCountRangeForGenre("fantasy")).toBe("90,000 – 120,000");
    expect(canonicalGenreById("fantasy")?.wordCountRange).toBe("90,000 – 120,000");
  });
  it("a personal genre falls back to the generic range, never blank", () => {
    expect(wordCountRangeForGenre("u:user123:northern-gothic")).toBe(GENERIC_WORD_COUNT_RANGE);
  });
  it("an undefined id and a rangeless canonical genre both fall back", () => {
    expect(wordCountRangeForGenre(undefined)).toBe(GENERIC_WORD_COUNT_RANGE);
    expect(wordCountRangeForGenre("childrens")).toBe(GENERIC_WORD_COUNT_RANGE);
  });
});

describe("mapLegacyGenre — never invents", () => {
  it("maps a known alias, reports an unknown", () => {
    expect(mapLegacyGenre("Sci-Fi")).toEqual({ id: "science-fiction", label: "Science fiction" });
    expect(mapLegacyGenre("Steampunk pirate saga")).toEqual({ unmapped: "Steampunk pirate saga" });
  });
  it("junk is unmapped, not crashed", () => {
    expect(mapLegacyGenre("")).toHaveProperty("unmapped");
  });
});

describe("read-time tolerance (3e) — ids and legacy labels both resolve", () => {
  const personal: PersonalGenre[] = [{ id: "u:user123:northern-gothic", label: "Northern gothic" }];

  it("normaliseStoredGenre passes canonical + personal ids through", () => {
    expect(normaliseStoredGenre("fantasy")).toBe("fantasy");
    expect(normaliseStoredGenre("u:user123:northern-gothic", personal)).toBe("u:user123:northern-gothic");
  });
  it("normaliseStoredGenre folds a legacy label to its canonical id", () => {
    expect(normaliseStoredGenre("Science Fiction")).toBe("science-fiction");
    expect(normaliseStoredGenre("Sci-Fi")).toBe("science-fiction");
  });
  it("auto-upgrades a personal id once its slug matches a (promoted) canonical genre", () => {
    // a personal 'u:*:horror' resolves to canonical 'horror' — the promotion path, no re-tagging
    expect(normaliseStoredGenre("u:user123:horror")).toBe("horror");
  });
  it("keeps an unmapped legacy label verbatim (never dropped, never invented)", () => {
    expect(normaliseStoredGenre("Steampunk pirate saga")).toBe("Steampunk pirate saga");
  });
  it("genreDisplay renders a label for every form", () => {
    expect(genreDisplay("fantasy")).toBe("Fantasy");
    expect(genreDisplay("Sci-Fi")).toBe("Science fiction");
    expect(genreDisplay("u:user123:northern-gothic", personal)).toBe("Northern gothic");
    expect(genreDisplay("Steampunk pirate saga")).toBe("Steampunk pirate saga");
  });
});

describe("isJunkGenre", () => {
  it("flags too-short / letterless input only", () => {
    expect(isJunkGenre("x")).toBe(true);
    expect(isJunkGenre("42")).toBe(true);
    expect(isJunkGenre("YA")).toBe(false);
    expect(isJunkGenre("Horror")).toBe(false);
  });
});
