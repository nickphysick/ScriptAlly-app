import { describe, it, expect } from "vitest";
import { formatListRowDate } from "./listRowDate";

// Fixed "today" for determinism: Fri 3 July 2026.
const NOW = new Date(2026, 6, 3);

describe("formatListRowDate", () => {
  it("returns null for undefined (provisional imported records omit dateSent)", () => {
    expect(formatListRowDate(undefined, NOW)).toBeNull();
  });

  it("returns null for null", () => {
    expect(formatListRowDate(null, NOW)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(formatListRowDate("", NOW)).toBeNull();
  });

  it("returns null for an unparseable string", () => {
    expect(formatListRowDate("not-a-date", NOW)).toBeNull();
  });

  it("returns null for non-date object shapes", () => {
    expect(formatListRowDate({ seconds: 123 }, NOW)).toBeNull();
  });

  it("treats epoch 0 as a real date, not an error", () => {
    // new Date(0) = 1 Jan 1970 UTC — valid, so it formats (with its year; 1970 ≠ 2026).
    expect(formatListRowDate(0, NOW)).toMatch(/^1 Jan 1970$/);
  });

  it("formats a current-year date without the year", () => {
    expect(formatListRowDate("2026-03-14T10:00:00.000Z", NOW)).toBe("14 Mar");
  });

  it("appends the year for a non-current-year date", () => {
    expect(formatListRowDate("2024-06-30T10:00:00.000Z", NOW)).toBe("30 Jun 2024");
  });
});
