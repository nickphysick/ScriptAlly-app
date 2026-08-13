import { describe, it, expect } from "vitest";
import {
  parseLegacyComps,
  manuscriptComps,
  compsSearchText,
  isOlderComp,
  pitchLine,
  pitchLineText,
  isVerified,
  normalizeComp,
  withCompAdded,
  withCompEdited,
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

/**
 * ⚠️ THE REGRESSION THESE GUARD IS SILENT AND CROSS-PAGE. The comps page used to rebuild an edited
 * comp from the draft alone, so `note` — which that page neither writes nor renders — was destroyed
 * on every save, and the only place it shows is the Manuscripts card. Nothing on screen changed at
 * the moment the data went. Verified red against the old `{ ...draft, source, inQuery }` shape
 * before the fix was believed.
 */
describe("withCompEdited", () => {
  const stored: CompTitle = {
    title: "Piranesi",
    author: "Susanna Clarke",
    publisher: "Bloomsbury",
    year: 2020,
    note: "the corridors, the tides",
    matchAxis: "tone · atmosphere",
    inQuery: true,
    source: "suggested",
  };
  const shelf: CompTitle[] = [{ title: "Gideon the Ninth", source: "user" }, stored];

  it("round-trips a note through an edit that changes another field", () => {
    /* the draft the form actually builds — it carries the stored note through untouched */
    const edited = withCompEdited(shelf, 1, {
      title: "Piranesi",
      author: "Susanna Clarke",
      publisher: "Bloomsbury",
      year: 2021,
      note: stored.note,
      media: "book",
      matchAxis: "tone · atmosphere",
    });
    expect(edited[1].note).toBe("the corridors, the tides");
    expect(edited[1].year).toBe(2021);
  });

  it("keeps a note the draft does not carry at all — the shape the bug had", () => {
    const edited = withCompEdited(shelf, 1, { title: "Piranesi" });
    expect(edited[1].note).toBe("the corridors, the tides");
  });

  it("keeps inQuery and source, which are the writer's and the shelf's, never the form's", () => {
    const edited = withCompEdited(shelf, 1, { title: "Piranesi", note: stored.note });
    expect(edited[1].inQuery).toBe(true);
    expect(edited[1].source).toBe("suggested");
  });

  it("defaults an absent source to user rather than letting it go absent", () => {
    const edited = withCompEdited([{ title: "Legacy" }], 0, { title: "Legacy" });
    expect(edited[0].source).toBe("user");
  });

  it("still lets the form clear a field it does carry", () => {
    const edited = withCompEdited(shelf, 1, { title: "Piranesi", publisher: undefined });
    expect(edited[1].publisher).toBeUndefined();
  });

  it("leaves the other rows alone and does not mutate the input", () => {
    const edited = withCompEdited(shelf, 1, { title: "Renamed", note: stored.note });
    expect(edited[0]).toBe(shelf[0]);
    expect(shelf[1].title).toBe("Piranesi");
  });
});

/**
 * ⚠️ BOTH DIRECTIONS, DELIBERATELY (baked decision 23 + the pack's trust rule). A one-way test —
 * "a record lights the chip" — would pass just as happily against a stored boolean, which is the
 * thing this model exists to abolish. The direction that matters is that NOTHING lights it without
 * evidence, including a half-written record.
 */
describe("isVerified", () => {
  const rec = { catalogue: "Google Books", checkedAt: "2026-08-13T09:41:00.000Z" };

  it("is true only with a complete record", () => {
    expect(isVerified({ verification: rec })).toBe(true);
    expect(isVerified({ verification: { ...rec, externalId: "gb-1" } })).toBe(true);
  });

  it("is false for a manual comp, which has no record and should have no chip", () => {
    expect(isVerified({})).toBe(false);
    expect(isVerified({ verification: undefined })).toBe(false);
  });

  it("is false for a half-written record, which would otherwise name nothing", () => {
    expect(isVerified({ verification: {} as never })).toBe(false);
    expect(isVerified({ verification: { catalogue: "  ", checkedAt: rec.checkedAt } })).toBe(false);
    expect(isVerified({ verification: { catalogue: "Google Books", checkedAt: "" } })).toBe(false);
  });

  it("cannot be lit by a stored boolean — there is no such field to read", () => {
    expect(isVerified({ verified: true } as never)).toBe(false);
  });
});

describe("normalizeComp", () => {
  const rec = { catalogue: "Google Books", checkedAt: "2026-08-13T09:41:00.000Z" };

  it("carries a valid verification record through a write", () => {
    const out = normalizeComp({ title: "Piranesi", source: "suggested", verification: rec });
    expect(out.verification).toEqual(rec);
  });

  it("drops a malformed record rather than storing one that would light the chip", () => {
    const out = normalizeComp({ title: "Piranesi", verification: { catalogue: "", checkedAt: "" } });
    expect("verification" in out).toBe(false);
  });

  it("omits externalId when the catalogue gave none, and keeps it when it did", () => {
    expect("externalId" in (normalizeComp({ title: "T", verification: rec }).verification ?? {})).toBe(false);
    expect(normalizeComp({ title: "T", verification: { ...rec, externalId: "gb-1" } }).verification?.externalId).toBe("gb-1");
  });

  it("writes no undefined values — Firestore rejects them inside a map", () => {
    const out = normalizeComp({ title: " Piranesi ", author: "  ", year: NaN, note: "", verification: rec });
    expect(Object.values(out).some((v) => v === undefined)).toBe(false);
    expect(out.title).toBe("Piranesi");
    expect("author" in out).toBe(false);
    expect("year" in out).toBe(false);
    expect("note" in out).toBe(false);
  });

  it("keeps note, matchAxis and inQuery, and omits a redundant book media", () => {
    const out = normalizeComp({
      title: "T", note: "the tides", matchAxis: "tone", inQuery: true, media: "book",
    });
    expect(out.note).toBe("the tides");
    expect(out.matchAxis).toBe("tone");
    expect(out.inQuery).toBe(true);
    expect("media" in out).toBe(false);
    expect(normalizeComp({ title: "T", media: "film" }).media).toBe("film");
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
