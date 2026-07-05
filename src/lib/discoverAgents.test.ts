/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Discover-page derivations: fit tiers on the /75 engine score, the /100 display
 * normalisation, candidate threshold gating, per-lens ranking (missing reply times sink last),
 * lens availability from catalogue coverage, readiness parsing, display-only highlight
 * segmentation (generic genre words stay unlit; regex metacharacters escaped), and the
 * truthful trust-banner meta (no date → no label, never fabricated).
 */
import { describe, it, expect } from "vitest";
import {
  fitTier,
  score100,
  ENGINE_MAX,
  buildDiscoverEntries,
  availableLenses,
  responseTimeCoverage,
  locationCoverage,
  isUkIreland,
  rankEntries,
  parseWordRange,
  manuscriptReadiness,
  displayTerms,
  highlightSegments,
  topHookTerm,
  monthYearLabel,
  catalogueMeta,
  DiscoverEntry,
} from "./discoverAgents";
import { MATCH_THRESHOLD } from "./communityMatch";
import { CommunityAgent, Manuscript, ManuscriptStatus, SubmissionStatus, SubmissionMethod } from "../types";

const mkCommunity = (over: Partial<CommunityAgent>): CommunityAgent => ({
  id: "ca1",
  name: "Helena Marsh",
  agency: "Northlight Literary",
  email: "h@northlight.com",
  website: "northlight.com",
  genres: ["Fantasy", "Adult"],
  mswlNotes: "Seeking gothic clockwork fantasy with Victorian settings.",
  starRating: 4,
  submissionStatus: SubmissionStatus.OPEN,
  responseTimeWeeks: 10,
  noResponseMeansNo: false,
  submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: ["Query Letter"],
  dateAdded: "2026-01-01T00:00:00Z",
  lastCheckedDate: "2026-03-01T00:00:00Z",
  notes: "",
  contributedByCount: 0,
  lastVerifiedDate: "2026-03-01T00:00:00Z",
  dataSource: "seed",
  communityQueryCount: 0,
  ...over,
});

const mkManuscript = (over: Partial<Manuscript>): Manuscript => ({
  id: "m1",
  userId: "u1",
  title: "The Clockmaker's Apprentice",
  genre: "Fantasy",
  ageCategory: "Adult",
  wordCount: 95000,
  logline: "A clockwork apprentice in Victorian London discovers gothic secrets.",
  comps: [],
  status: ManuscriptStatus.QUERYING,
  statusChangedDate: "2026-01-01T00:00:00Z",
  ...over,
});

const mkEntry = (over: Partial<DiscoverEntry> & { agent: CommunityAgent }): DiscoverEntry => ({
  score: 50,
  breakdown: { mswlScore: 15, genreScore: 20, ageScore: 15, overlappingWords: [], ageMatchedCategory: "Adult" },
  tier: "possible",
  ...over,
});

describe("fitTier / score100", () => {
  it("uses the same /75 cutoffs as the suggestions panel", () => {
    expect(fitTier(75)).toBe("strong");
    expect(fitTier(62)).toBe("strong");
    expect(fitTier(61)).toBe("good");
    expect(fitTier(52)).toBe("good");
    expect(fitTier(51)).toBe("possible");
    expect(fitTier(MATCH_THRESHOLD)).toBe("possible");
  });

  it("normalises the engine total to /100 for display only", () => {
    expect(score100(ENGINE_MAX)).toBe(100);
    expect(score100(0)).toBe(0);
    expect(score100(62)).toBe(83);
    expect(score100(42)).toBe(56);
    // Clamped — a hypothetical out-of-range input can't display over 100.
    expect(score100(90)).toBe(100);
  });
});

describe("buildDiscoverEntries", () => {
  it("keeps only candidates at or over MATCH_THRESHOLD and never sorts", () => {
    const ms = mkManuscript({});
    const strong = mkCommunity({ id: "s", genres: ["Fantasy", "Adult"] });
    const noMatch = mkCommunity({ id: "n", genres: ["Crime"], mswlNotes: "Procedural police work only." });
    const entries = buildDiscoverEntries([noMatch, strong], ms);
    expect(entries.map((e) => e.agent.id)).toEqual(["s"]);
    expect(entries[0].score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    expect(entries[0].tier).toBe(fitTier(entries[0].score));
  });
});

describe("lens availability", () => {
  it("offers fast responders only when responseTimeWeeks is populated on ≥60% of the catalogue", () => {
    const populated = mkCommunity({ id: "p", responseTimeWeeks: 8 });
    const missing = mkCommunity({ id: "m", responseTimeWeeks: 0 });
    expect(availableLenses([populated, populated, populated, missing])).toContain("fast");
    expect(availableLenses([populated, missing, missing, missing])).not.toContain("fast");
    expect(responseTimeCoverage([])).toBe(0);
  });

  it("always offers best, wish-list and open; fast/local need coverage (empty catalogue → neither)", () => {
    const lenses = availableLenses([]);
    expect(lenses).toEqual(["best", "mswl", "open"]);
  });

  it("offers Local first only when at least one record has a resolvable country", () => {
    const located = mkCommunity({ id: "l", country: "GB" });
    const bare = mkCommunity({ id: "b" });
    expect(availableLenses([located, bare])).toContain("local");
    expect(availableLenses([bare, bare])).not.toContain("local");
    expect(locationCoverage([located, bare])).toBe(0.5);
    expect(locationCoverage([])).toBe(0);
  });
});

describe("isUkIreland (the UK & Ireland filter predicate)", () => {
  it("accepts GB/IE as codes or legacy names", () => {
    expect(isUkIreland("GB")).toBe(true);
    expect(isUkIreland("IE")).toBe(true);
    expect(isUkIreland("United Kingdom")).toBe(true);
    expect(isUkIreland("Ireland")).toBe(true);
  });

  it("rejects other markets and never claims unknown as local", () => {
    expect(isUkIreland("US")).toBe(false);
    expect(isUkIreland("Atlantis")).toBe(false);
    expect(isUkIreland("")).toBe(false);
    expect(isUkIreland(undefined)).toBe(false);
  });
});

describe("rankEntries", () => {
  const a = mkEntry({
    agent: mkCommunity({ id: "a", name: "Aaron", responseTimeWeeks: 12 }),
    score: 70,
    breakdown: { mswlScore: 35, genreScore: 20, ageScore: 15, overlappingWords: [], ageMatchedCategory: "" },
  });
  const b = mkEntry({
    agent: mkCommunity({ id: "b", name: "Beth", responseTimeWeeks: 6 }),
    score: 60,
    breakdown: { mswlScore: 40, genreScore: 20, ageScore: 0, overlappingWords: [], ageMatchedCategory: "" },
  });
  const c = mkEntry({
    agent: mkCommunity({ id: "c", name: "Cora", responseTimeWeeks: 0, submissionStatus: SubmissionStatus.UNKNOWN }),
    score: 65,
    breakdown: { mswlScore: 30, genreScore: 20, ageScore: 15, overlappingWords: [], ageMatchedCategory: "" },
  });

  it("best = engine total descending", () => {
    expect(rankEntries([b, c, a], "best").map((e) => e.agent.id)).toEqual(["a", "c", "b"]);
  });

  it("mswl = wish-list sub-score descending", () => {
    expect(rankEntries([a, c, b], "mswl").map((e) => e.agent.id)).toEqual(["b", "a", "c"]);
  });

  it("fast = reply weeks ascending with unpopulated reply times last", () => {
    expect(rankEntries([c, a, b], "fast").map((e) => e.agent.id)).toEqual(["b", "a", "c"]);
  });

  it("open = open status first, then engine total", () => {
    expect(rankEntries([c, b, a], "open").map((e) => e.agent.id)).toEqual(["a", "b", "c"]);
  });

  it("local = home-market agents first (strict; unknown never local), fit within partitions", () => {
    const homeStrong = mkEntry({ agent: mkCommunity({ id: "hs", name: "Hana", country: "GB" }), score: 60 });
    const homeWeak = mkEntry({ agent: mkCommunity({ id: "hw", name: "Hugh", country: "United Kingdom" }), score: 45 });
    const abroad = mkEntry({ agent: mkCommunity({ id: "ab", name: "Abe", country: "US" }), score: 70 });
    const unknown = mkEntry({ agent: mkCommunity({ id: "un", name: "Una" }), score: 65 });
    expect(rankEntries([abroad, unknown, homeWeak, homeStrong], "local", "GB").map((e) => e.agent.id))
      .toEqual(["hs", "hw", "ab", "un"]);
    // A different home market re-partitions — nothing is hardcoded to the UK.
    expect(rankEntries([abroad, homeStrong], "local", "US").map((e) => e.agent.id)).toEqual(["ab", "hs"]);
  });

  it("never mutates the input", () => {
    const input = [c, a, b];
    rankEntries(input, "best");
    expect(input.map((e) => e.agent.id)).toEqual(["c", "a", "b"]);
  });
});

describe("readiness", () => {
  it("parses the genre range display string", () => {
    expect(parseWordRange("90,000 – 120,000")).toEqual({ min: 90000, max: 120000 });
    expect(parseWordRange("300 – 800")).toEqual({ min: 300, max: 800 });
    expect(parseWordRange(null)).toBeNull();
    expect(parseWordRange("no numbers here")).toBeNull();
  });

  it("classifies word count against the range and reports material presence", () => {
    const ms = mkManuscript({
      wordCount: 95000,
      comps: [{ title: "The Watchmaker of Filigree Street", source: "user" }],
    });
    const r = manuscriptReadiness(ms, "90,000 – 120,000");
    expect(r.fit).toBe("in");
    expect(r.hasLogline).toBe(true);
    expect(r.hasComps).toBe(true);
    expect(manuscriptReadiness(mkManuscript({ wordCount: 130000 }), "90,000 – 120,000").fit).toBe("long");
    expect(manuscriptReadiness(mkManuscript({ wordCount: 60000 }), "90,000 – 120,000").fit).toBe("short");
  });

  it("never invents a verdict when the word count or range is missing", () => {
    expect(manuscriptReadiness(mkManuscript({ wordCount: 0 }), "90,000 – 120,000").fit).toBeNull();
    const noRange = manuscriptReadiness(mkManuscript({}), null);
    expect(noRange.fit).toBeNull();
    expect(noRange.rangeLabel).toBeNull();
  });
});

describe("wish-list highlighting (display only)", () => {
  it("suppresses bare genre/age words but keeps distinctive terms", () => {
    expect(displayTerms(["fantasy", "gothic", "adult", "clockwork", "gothic"])).toEqual(["gothic", "clockwork"]);
  });

  it("segments notes with matched terms flagged, case-insensitively", () => {
    const segs = highlightSegments("Loves Gothic clockwork tales.", ["gothic", "clockwork", "fantasy"]);
    expect(segs).toEqual([
      { text: "Loves ", hit: false },
      { text: "Gothic", hit: true },
      { text: " ", hit: false },
      { text: "clockwork", hit: true },
      { text: " tales.", hit: false },
    ]);
  });

  it("returns one unlit segment when every overlap is generic", () => {
    expect(highlightSegments("Seeking fantasy novels.", ["fantasy"])).toEqual([
      { text: "Seeking fantasy novels.", hit: false },
    ]);
  });

  it("escapes regex metacharacters in terms", () => {
    expect(() => highlightSegments("A c++ story", ["c++"])).not.toThrow();
  });

  it("picks the first distinctive term as the personalisation hook", () => {
    expect(topHookTerm(["fantasy", "steampunk", "victorian"])).toBe("steampunk");
    expect(topHookTerm(["fantasy", "adult"])).toBeNull();
  });
});

describe("truthful labels", () => {
  it("formats Mon YYYY and refuses invalid dates", () => {
    expect(monthYearLabel("2026-03-15T00:00:00Z")).toBe("Mar 2026");
    expect(monthYearLabel("not-a-date")).toBeNull();
    expect(monthYearLabel(undefined)).toBeNull();
  });

  it("derives catalogue meta from real lastCheckedDate values only", () => {
    const older = mkCommunity({ id: "o", lastCheckedDate: "2026-01-01T00:00:00Z" });
    const newer = mkCommunity({ id: "n", lastCheckedDate: "2026-04-10T00:00:00Z" });
    expect(catalogueMeta([older, newer])).toEqual({ count: 2, lastCheckedLabel: "Apr 2026" });
    expect(catalogueMeta([mkCommunity({ lastCheckedDate: "" })]).lastCheckedLabel).toBeNull();
    expect(catalogueMeta([]).count).toBe(0);
  });
});
