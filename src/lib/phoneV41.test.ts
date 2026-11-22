import { describe, it, expect } from "vitest";
import { changeWords, needWords, shortSay, weekChange, PHONE_GROUP_LABEL } from "./phoneV41";
import type { QcRow } from "./qcSummary";
import { QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-12T12:00:00Z");
const row = (o: Partial<QcRow>): QcRow => ({ status: QueryStatus.QUERIED, expectedMs: null, expectedKind: null, ...o }) as QcRow;

describe("phone v4.1 words and figures", () => {
  it("the change on last week: last minus the one before, hidden at 0 or under two weeks", () => {
    expect(weekChange([{ endMs: 1, active: 10 }, { endMs: 2, active: 12 }])).toBe(2);
    expect(weekChange([{ endMs: 1, active: 12 }, { endMs: 2, active: 11 }])).toBe(-1);
    expect(weekChange([{ endMs: 1, active: 3 }, { endMs: 2, active: 3 }])).toBeNull();
    expect(weekChange([{ endMs: 1, active: 3 }])).toBeNull();
    expect(changeWords(-1)).toBe("▼ 1 on last week");
    expect(changeWords(2)).toBe("▲ 2 on last week");
  });
  it("one thing / N things need you", () => {
    expect(needWords(1)).toBe("1 thing needs you");
    expect(needWords(7)).toBe("7 things need you");
  });
  it("the short line: whose move, and a passed date said without verdict words", () => {
    expect(shortSay(row({ expectedMs: NOW + 7 * DAY, expectedKind: "sendBy" }), NOW).text).toBe("Send in 7 days");
    expect(shortSay(row({ expectedMs: NOW + 8 * DAY, expectedKind: "offer" }), NOW).text).toBe("Decide in 8 days");
    expect(shortSay(row({ expectedMs: NOW + 21 * DAY, expectedKind: "reply" as never }), NOW).text).toBe("Reply in 3 wks");
    const past = shortSay(row({ expectedMs: NOW - 21 * DAY }), NOW);
    expect(past).toEqual({ text: "3 wks past its date", past: true });
    expect(past.text).not.toMatch(/overdue|late/i);
    expect(shortSay(row({}), NOW).text).toBe("No date");
  });
  it("the drawer's first group is never called Overdue on the phone", () => {
    expect(PHONE_GROUP_LABEL.overdue).toBe("Past its date");
  });
});
