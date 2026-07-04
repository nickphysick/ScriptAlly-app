import { describe, it, expect } from "vitest";
import {
  parseLegacyComps,
  manuscriptComps,
  compsSearchText,
  isOlderComp,
  pitchLine,
  pitchLineText,
  withCompAdded,
  withCompRemoved,
  MAX_COMPS,
} from "./comps";
import { CompTitle, Manuscript, ManuscriptStatus } from "../types";

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

describe("pitchLine", () => {
  const c = (title: string): CompTitle => ({ title, source: "user" });

  it("composes from the first two shelf comps in shelf order", () => {
    expect(pitchLine([c("Gearbreakers"), c("A Darker Shade of Magic"), c("Gilded")])).toEqual({
      kind: "two",
      a: "Gearbreakers",
      b: "A Darker Shade of Magic",
    });
    expect(pitchLineText([c("A"), c("B")])).toBe("A meets B");
  });

  it("returns the one-comp and empty variants", () => {
    expect(pitchLine([c("Gearbreakers")])).toEqual({ kind: "one", a: "Gearbreakers" });
    expect(pitchLine([])).toEqual({ kind: "none" });
    expect(pitchLineText([c("A")])).toBeNull();
    expect(pitchLineText([])).toBeNull();
  });
});

describe("isOlderComp", () => {
  it("is true at exactly five years old and older, false younger", () => {
    expect(isOlderComp(2021, 2026)).toBe(true);
    expect(isOlderComp(2001, 2026)).toBe(true);
    expect(isOlderComp(2022, 2026)).toBe(false);
    expect(isOlderComp(2026, 2026)).toBe(false);
  });
  it("is false when the year is unknown", () => {
    expect(isOlderComp(undefined, 2026)).toBe(false);
  });
});

describe("withCompAdded / withCompRemoved", () => {
  const c = (title: string): CompTitle => ({ title, source: "user" });

  it("appends and removes by index without mutating", () => {
    const shelf = [c("A"), c("B")];
    const grown = withCompAdded(shelf, c("C"));
    expect(grown.map((x) => x.title)).toEqual(["A", "B", "C"]);
    expect(shelf).toHaveLength(2);
    expect(withCompRemoved(grown, 1).map((x) => x.title)).toEqual(["A", "C"]);
  });

  it("refuses to grow past the shelf cap", () => {
    const full = Array.from({ length: MAX_COMPS }, (_, i) => c(`T${i}`));
    expect(withCompAdded(full, c("overflow"))).toBe(full);
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
