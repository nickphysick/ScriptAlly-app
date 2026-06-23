import { describe, it, expect } from "vitest";
import { parseImportDate, DateResolution } from "./parseImportDate";

/**
 * Golden regression fixture: every raw "Date sent" value from query-tracker-messy.xlsx, as it
 * actually reaches the engine (verified by running the file through fileToCsv → SheetJS sheet_to_csv).
 * The oracle is the prompt's date rules. Year-less rows assert "most recent past occurrence" computed
 * relative to the test run date — never a hard-coded year — so the suite doesn't rot.
 */

// The file's other resolved dates (all 2024) — the span a serial is judged an outlier against.
const FILE_DATES_2024 = [
  "2024-03-02", "2024-03-14", "2024-04-18", "2024-05-01",
  "2024-05-09", "2024-05-20", "2024-05-22",
];

/** Mirror of the parser's year inference, so expectations track the run date. */
function inferredIso(month: number, day: number, now = new Date()): string {
  const y = now.getFullYear();
  const cand = Date.UTC(y, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const yy = cand <= today ? y : y - 1;
  return `${yy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const clean = (raw: string | number, expected: string) =>
  it(`${JSON.stringify(raw)} → ${expected}`, () => {
    expect(parseImportDate(raw, FILE_DATES_2024)).toEqual<DateResolution>({ date: expected, reason: null });
  });

describe("parseImportDate — query-tracker-messy.xlsx golden fixture", () => {
  describe("ISO / year-first", () => {
    clean("2024-03-02", "2024-03-02"); // Eleanor Whitcombe
    clean("2024/05/22", "2024-05-22"); // Clara Bennett
  });

  describe("month written out", () => {
    clean("14 March 2024", "2024-03-14"); // J. Carter
    clean("3 Mar 2024", "2024-03-03");    // Maria Okonkwo
    clean("6 May 2024", "2024-05-06");    // Saskia Vance
    clean("03-May-2024", "2024-05-03");   // Henry Okafor (dash-separated written)
  });

  describe("all-numeric, a component ≥ 13 → order forced", () => {
    clean("14/03/2024", "2024-03-14"); // Jamal Carter — 14 forces day-first
    clean("18/04/2024", "2024-04-18"); // Wren & Co / Daniel Mercer
    clean("18/4/24", "2024-04-18");    // Daniel Mercer dupe — 2-digit year
    clean("15/5/24", "2024-05-15");    // Marianne Webb — was dropped before
    clean("20/05/2024", "2024-05-20"); // Yusuf Demir
    clean("02/13/2024", "2024-02-13"); // Aisha Bello — US month-first (13 is the day)
  });

  describe("all-numeric, both ≤ 12 (ambiguous) → British day-first", () => {
    clean("02/03/2024", "2024-03-02"); // Bellweather no-name
    clean("12.4.24", "2024-04-12");    // Priya Raman — dots, 2-digit year
    clean("1/5/2024", "2024-05-01");   // Beatrice Lund
    clean("09/05/2024", "2024-05-09"); // Lena Fischer
    clean("12/05/24", "2024-05-12");   // Conor Walsh
  });

  describe("missing year → inferred silently (most-recent-past), no reason", () => {
    it('"5th Jan" → inferred Jan 5', () => {
      expect(parseImportDate("5th Jan", FILE_DATES_2024)).toEqual<DateResolution>({ date: inferredIso(1, 5), reason: null });
    });
    it('"21 Apr" → inferred Apr 21', () => {
      expect(parseImportDate("21 Apr", FILE_DATES_2024)).toEqual<DateResolution>({ date: inferredIso(4, 21), reason: null });
    });
    it('"25 May" → inferred May 25', () => {
      expect(parseImportDate("25 May", FILE_DATES_2024)).toEqual<DateResolution>({ date: inferredIso(5, 25), reason: null });
    });
  });

  describe("missing day → null + missing-day", () => {
    it('"March 2024" → missing-day', () => {
      expect(parseImportDate("March 2024", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "missing-day" });
    });
  });

  describe("excel serial", () => {
    it('"44621" → 1 Mar 2022, flagged serial-outlier vs the 2024 file', () => {
      expect(parseImportDate("44621", FILE_DATES_2024)).toEqual<DateResolution>({ date: "2022-03-01", reason: "serial-outlier" });
    });
    it("a serial inside the file's span resolves silently (no reason)", () => {
      // Serial for 2024-04-01 — within the 2024 span, so accepted quietly.
      const serial = Math.round((Date.UTC(2024, 3, 1) - Date.UTC(1899, 11, 30)) / 86_400_000);
      expect(parseImportDate(String(serial), FILE_DATES_2024)).toEqual<DateResolution>({ date: "2024-04-01", reason: null });
    });
    it("a serial with no other file dates to compare against is accepted quietly", () => {
      expect(parseImportDate("44621", [])).toEqual<DateResolution>({ date: "2022-03-01", reason: null });
    });
  });

  describe("blank or unreadable → null + no-date (unified)", () => {
    it('blank "" → no-date', () => expect(parseImportDate("", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" }));
    it("null → no-date", () => expect(parseImportDate(null, FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" }));
    it('"last spring" → no-date', () => expect(parseImportDate("last spring", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" }));
    it('"submitted via QueryManager" → no-date', () => expect(parseImportDate("submitted via QueryManager", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" }));
    it('"??" → no-date', () => expect(parseImportDate("??", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" }));
  });

  describe("anchor option (year-less event dates only)", () => {
    it("anchors a year-less date to the anchor's year", () => {
      expect(parseImportDate("20/3", [], { anchor: "2024-03-14" })).toEqual<DateResolution>({ date: "2024-03-20", reason: null });
    });
    it("rolls forward a year when the event would precede the anchor", () => {
      expect(parseImportDate("5/1", [], { anchor: "2023-12-20" })).toEqual<DateResolution>({ date: "2024-01-05", reason: null });
    });
    it("ignores the anchor for a year-bearing date", () => {
      expect(parseImportDate("6 May 2024", [], { anchor: "2030-01-01" })).toEqual<DateResolution>({ date: "2024-05-06", reason: null });
    });
    it("falls back to most-recent-past when no anchor is given", () => {
      expect(parseImportDate("20/3", [])).toEqual<DateResolution>({ date: inferredIso(3, 20), reason: null });
    });
  });

  describe("guards", () => {
    it("a bare year-like integer outside the serial band is not a date", () => {
      expect(parseImportDate("2024", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" });
    });
    it("rejects an impossible calendar day", () => {
      expect(parseImportDate("31/02/2024", FILE_DATES_2024)).toEqual<DateResolution>({ date: null, reason: "no-date" });
    });
    it("a note-style raw date parses too (drives timeline events) — '20/3' day-first, year inferred", () => {
      expect(parseImportDate("20/3", FILE_DATES_2024)).toEqual<DateResolution>({ date: inferredIso(3, 20), reason: null });
    });
  });
});
