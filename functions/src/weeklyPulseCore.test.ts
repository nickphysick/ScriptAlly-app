import { describe, expect, it } from "vitest";
import { acceptedWeeks, isoWeekKeyUtc, validatePulse } from "./weeklyPulseCore";

describe("the weekly pulse's server-side validation", () => {
  const now = new Date(Date.UTC(2026, 9, 16, 12)); // Fri 16 Oct 2026 → 2026-W42

  it("names ISO weeks the way the client does", () => {
    expect(isoWeekKeyUtc(now)).toBe("2026-W42");
    expect(isoWeekKeyUtc(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-W01"); // a Thursday
    expect(isoWeekKeyUtc(new Date(Date.UTC(2027, 0, 1)))).toBe("2026-W53"); // a Friday in W53
    expect(isoWeekKeyUtc(new Date(Date.UTC(2024, 11, 30)))).toBe("2025-W01");
  });

  it("accepts this week and one either side, and nothing further", () => {
    expect(acceptedWeeks(now)).toEqual(["2026-W41", "2026-W42", "2026-W43"]);
    expect(validatePulse({ mood: 3, week: "2026-W42" }, now)).toEqual({ ok: true, value: { mood: 3, week: "2026-W42" } });
    expect(validatePulse({ mood: 3, week: "2026-W43" }, now).ok).toBe(true);
    expect(validatePulse({ mood: 3, week: "2026-W40" }, now).ok).toBe(false);
    expect(validatePulse({ mood: 3, week: "2027-W42" }, now).ok).toBe(false);
  });

  it("refuses anything that is not an integer 1–4, or not a week", () => {
    for (const mood of [0, 5, 2.5, "3", null, undefined]) expect(validatePulse({ mood, week: "2026-W42" }, now).ok).toBe(false);
    for (const week of ["2026-42", "2026-W54", "2026-W00", "", 42, null]) expect(validatePulse({ mood: 2, week }, now).ok).toBe(false);
    expect(validatePulse(null, now).ok).toBe(false);
  });

  it("takes the fields one at a time: nothing else in the payload survives", () => {
    const v = validatePulse({ mood: 4, week: "2026-W42", uid: "someone-else", extra: "x" }, now);
    expect(v).toEqual({ ok: true, value: { mood: 4, week: "2026-W42" } });
  });
});
