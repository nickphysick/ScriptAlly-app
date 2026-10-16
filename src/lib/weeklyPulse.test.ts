import { describe, expect, it } from "vitest";
import { dotLabel, isoWeekKey, pulseDocId, pulseWeeks } from "./weeklyPulse";
/* ⚠️ THE CLIENT AND THE SERVER NAME A WEEK THE SAME WAY, OR EVERY ANSWER IS REFUSED. The server's
   half lives in functions/ (CommonJS), so the cross-check is held here, on the client's side. */
import { isoWeekKeyUtc } from "../../functions/src/weeklyPulseCore";

describe("the weekly pulse, the client's half", () => {
  it("names a local date's ISO week exactly as the server names that calendar date", () => {
    const days = [new Date(2026, 9, 16), new Date(2026, 0, 1), new Date(2027, 0, 1), new Date(2024, 11, 30), new Date(2026, 2, 29), new Date(2026, 9, 25), new Date(2026, 9, 26)];
    for (const d of days) expect(isoWeekKey(d)).toBe(isoWeekKeyUtc(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))));
    expect(isoWeekKey(new Date(2026, 9, 18))).toBe("2026-W42"); // Sunday: still the week that began Monday 12th
    expect(isoWeekKey(new Date(2026, 9, 19))).toBe("2026-W43");
  });

  it("draws five weeks, four weeks ago to this week, each a different week", () => {
    const w = pulseWeeks(new Date(2026, 9, 16));
    expect(w).toEqual(["2026-W38", "2026-W39", "2026-W40", "2026-W41", "2026-W42"]);
  });

  it("labels the dots in the reference's words", () => {
    expect(dotLabel(0, 2)).toBe("4 weeks ago: Meh");
    expect(dotLabel(3, 4)).toBe("Last week: Loving it");
    expect(dotLabel(4, null)).toBe("This week");
    expect(dotLabel(4, 3)).toBe("This week: Good");
  });

  it("files a week under one id per writer", () => {
    expect(pulseDocId("u1", "2026-W42")).toBe("u1_2026-W42");
  });
});
