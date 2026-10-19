/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.2 — the row's words: the reply time spelled out (§C), and a long-overdue reply read plainly (§D).
 */
import { describe, expect, it } from "vitest";
import { LONG_OVER, replyWeeksLabel, rowDateLine } from "./contactList";
import type { QcRow } from "./qcSummary";

describe("v19.2 §C — the reply time reads ~N weeks, never wks", () => {
  it("spells the unit out, singular at one", () => {
    expect(replyWeeksLabel(6)).toBe("~6 weeks");
    expect(replyWeeksLabel(1)).toBe("~1 week");
    expect(replyWeeksLabel(12)).toBe("~12 weeks");
  });
  it("an absent, zero or nonsense window has no words (the cell reads Not stated)", () => {
    for (const w of [undefined, null, 0, -3, Number.NaN]) expect(replyWeeksLabel(w)).toBeNull();
  });
});

describe("v19.2 §D — past the expected date: a count up to 30 days, then the date it has been overdue since", () => {
  const DAY = 86_400_000;
  const NOW = Date.UTC(2026, 9, 19, 12); // 19 Oct 2026
  const line = (daysOver: number) => rowDateLine({ court: "agent", expectedMs: NOW - daysOver * DAY } as unknown as QcRow, NOW)!;
  it("10 and 30 days over keep the count", () => {
    expect(line(10)).toEqual({ text: "Expected 9 Oct · 10d over", over: true });
    expect(line(30)).toEqual({ text: "Expected 19 Sep · 30d over", over: true });
  });
  it("31 days over reads Overdue since, with no year in the current year", () => {
    expect(line(31)).toEqual({ text: "Overdue since 18 Sep", over: true });
  });
  it("400 days over adds the year, because it is not this year's", () => {
    expect(line(400)).toEqual({ text: "Overdue since 14 Sep 2025", over: true });
  });
  it("the threshold is 30, and the writer's own send-by line is untouched", () => {
    expect(LONG_OVER).toBe(30);
    const send = rowDateLine({ court: "you", expectedMs: NOW - 400 * DAY } as unknown as QcRow, NOW)!;
    expect(send.text).toBe("Send by 14 Sep · 400d over");
  });
  it("a reply still to come is unchanged", () => {
    expect(rowDateLine({ court: "agent", expectedMs: NOW + 5 * DAY } as unknown as QcRow, NOW)!.text).toBe("Reply by 24 Oct · in 5d");
  });
});
