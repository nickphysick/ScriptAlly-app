/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.1 · Phase 5 — A QUERY SENT TODAY COUNTS TODAY. Sent dates are stored at noon of their day (the log
 * save's `dateSent`), and the Dashboard's sent figures compared them with the current instant, so a query logged this
 * morning was not counted until midday. They compare with the end of today now; a query dated tomorrow still does not
 * count.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query } from "../types";
import { sentAllTime, sentThisWeek, sentWeeks, wholeWeeksQuerying } from "./dash2";
import { activeAt } from "./dashWeekMix";
import { isoWeekStart } from "./dashboardStats";

const at = (h: number, m = 0) => new Date(2026, 10, 23, h, m); // Monday 23 Nov 2026
const noon = (y: number, mo: number, d: number) => new Date(y, mo, d, 12).toISOString();
const q = (id: string, dateSent: string): Query => ({ id, agentId: "a", manuscriptId: "m", status: QueryStatus.QUERIED, dateSent } as Query);
const TODAY = q("today", noon(2026, 10, 23));
const TOMORROW = q("tomorrow", noon(2026, 10, 24));

describe("v2.1 · Phase 5 — sent today at noon", () => {
  for (const [label, now] of [["09:00", at(9)], ["00:05", at(0, 5)], ["23:55", at(23, 55)]] as const) {
    it(`now ${label}: counted by every sent figure`, () => {
      expect(sentAllTime([TODAY], now)).toBe(1);
      expect(sentThisWeek([TODAY], now)).toBe(1);
      expect(wholeWeeksQuerying([TODAY], now)).toBe(0);
      expect(sentWeeks([TODAY], [{ start: isoWeekStart(now) }], now)[0].n).toBe(1);
      expect(activeAt(TODAY, now.getTime())).toBe(true);
    });
  }
  it("sent tomorrow: still not counted", () => {
    const now = at(9);
    expect(sentAllTime([TOMORROW], now)).toBe(0);
    expect(sentThisWeek([TOMORROW], now)).toBe(0);
    expect(wholeWeeksQuerying([TOMORROW], now)).toBeNull();
    expect(sentWeeks([TOMORROW], [{ start: isoWeekStart(now) }], now)[0].n).toBe(0);
    expect(activeAt(TOMORROW, now.getTime())).toBe(false);
  });
});
