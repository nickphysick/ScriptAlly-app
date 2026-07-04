import { describe, it, expect } from "vitest";
import { parseLegacyComps, manuscriptComps, compsSearchText } from "./comps";
import { Manuscript, ManuscriptStatus } from "../types";

const baseMs = (over: Partial<Manuscript> & Record<string, unknown> = {}): Manuscript =>
  ({
    id: "ms-1",
    userId: "u-1",
    title: "Test",
    genre: "Fantasy",
    ageCategory: "Adult",
    wordCount: 90000,
    logline: "",
    comps: [],
    status: ManuscriptStatus.QUERYING,
    statusChangedDate: "2026-01-01T00:00:00.000Z",
    ...over,
  }) as Manuscript;

describe("parseLegacyComps", () => {
  it("returns [] for empty, undefined and whitespace input", () => {
    expect(parseLegacyComps(undefined)).toEqual([]);
    expect(parseLegacyComps(null)).toEqual([]);
    expect(parseLegacyComps("")).toEqual([]);
    expect(parseLegacyComps("   ")).toEqual([]);
  });

  it("splits on ' meets ' into titles-only user comps", () => {
    expect(parseLegacyComps("The Starless Sea meets Jonathan Strange & Mr Norrell")).toEqual([
      { title: "The Starless Sea", source: "user" },
      { title: "Jonathan Strange & Mr Norrell", source: "user" },
    ]);
  });

  it("splits on commas, and on ' meets ' then commas combined", () => {
    expect(parseLegacyComps("Gideon the Ninth, Piranesi")).toEqual([
      { title: "Gideon the Ninth", source: "user" },
      { title: "Piranesi", source: "user" },
    ]);
    expect(parseLegacyComps("A meets B, C")).toEqual([
      { title: "A", source: "user" },
      { title: "B", source: "user" },
      { title: "C", source: "user" },
    ]);
  });

  it("is case-insensitive on MEETS and trims whitespace / drops empty tokens", () => {
    expect(parseLegacyComps("  Dune  MEETS  Hyperion , ")).toEqual([
      { title: "Dune", source: "user" },
      { title: "Hyperion", source: "user" },
    ]);
  });

  it("does not split a title merely containing 'meets' without spaces around it", () => {
    expect(parseLegacyComps("When Charlie Meetsworth")).toEqual([
      { title: "When Charlie Meetsworth", source: "user" },
    ]);
  });
});

describe("manuscriptComps", () => {
  it("prefers the structured array when present", () => {
    const ms = baseMs({ comps: [{ title: "Piranesi", author: "Susanna Clarke", year: 2020, source: "user" }] });
    expect(manuscriptComps(ms)).toEqual([{ title: "Piranesi", author: "Susanna Clarke", year: 2020, source: "user" }]);
  });

  it("falls back to parsing a stray legacy string when comps is absent", () => {
    const ms = baseMs({ comps: undefined as unknown as [], comparableTitles: "A meets B" });
    expect(manuscriptComps(ms)).toEqual([
      { title: "A", source: "user" },
      { title: "B", source: "user" },
    ]);
  });

  it("returns [] when both are absent", () => {
    const ms = baseMs({ comps: undefined as unknown as [] });
    expect(manuscriptComps(ms)).toEqual([]);
  });

  it("prefers an empty structured array over a lingering legacy string (never resurrects removed comps)", () => {
    const ms = baseMs({ comps: [], comparableTitles: "A meets B" });
    expect(manuscriptComps(ms)).toEqual([]);
  });
});

describe("compsSearchText", () => {
  it("joins comp titles with spaces (titles only — notes/authors excluded)", () => {
    const ms = baseMs({
      comps: [
        { title: "The Starless Sea", note: "atmosphere", source: "user" },
        { title: "Piranesi", author: "Susanna Clarke", source: "suggested" },
      ],
    });
    expect(compsSearchText(ms)).toBe("The Starless Sea Piranesi");
  });

  it("reads through the legacy fallback", () => {
    const ms = baseMs({ comps: undefined as unknown as [], comparableTitles: "A meets B" });
    expect(compsSearchText(ms)).toBe("A B");
  });
});
