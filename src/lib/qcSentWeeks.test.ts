/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { barShare, sentWeeks, weekName } from "./qcSentWeeks";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe("sentWeeks — Monday-start weeks in the user's own zone", () => {
  /* Thursday 16 Oct 2026: this week began Monday 12 Oct */
  const now = at(2026, 10, 16);
  it("twelve weeks, oldest first, this week last, each starting on a Monday at midnight", () => {
    const w = sentWeeks([], now);
    expect(w).toHaveLength(12);
    expect(new Date(w[11].start).getDay()).toBe(1);
    expect(new Date(w[11].start).getDate()).toBe(12);
    expect(new Date(w[11].start).getHours()).toBe(0);
    expect(new Date(w[0].start).getDate()).toBe(27); /* Mon 27 Jul */
  });
  it("Monday's queries are this week's and Sunday's are last week's (a Sunday-start week would differ)", () => {
    const w = sentWeeks([at(2026, 10, 12, 0) + 1, at(2026, 10, 11, 23)], now);
    expect(w[11].n).toBe(1);
    expect(w[10].n).toBe(1);
  });
  it("undated and out-of-range queries count nowhere", () => {
    const w = sentWeeks([null, undefined, at(2026, 1, 5), at(2026, 10, 20)], now);
    expect(w.reduce((s, x) => s + x.n, 0)).toBe(0);
  });
  it("across the October clock change a week still lands where its Monday says", () => {
    /* the clocks went back on Sunday 25 Oct 2026; a query on Monday 26 Oct is that week's */
    const later = at(2026, 10, 29);
    const w = sentWeeks([at(2026, 10, 26, 9), at(2026, 10, 25, 9)], later);
    expect(w[11].n).toBe(1);
    expect(w[10].n).toBe(1);
  });
});

describe("weekName and barShare", () => {
  const w = sentWeeks([], at(2026, 10, 16));
  it("names this week, last week and the rest by their Monday", () => {
    expect(weekName(11, w)).toBe("This week");
    expect(weekName(10, w)).toBe("Last week");
    expect(weekName(0, w)).toBe("Week of 27 Jul");
  });
  it("a bar is n / max(2, the largest week), at least 8%, and nothing for an empty week", () => {
    const ws = [{ start: 0, n: 1 }, { start: 0, n: 0 }, { start: 0, n: 20 }];
    expect(barShare(20, ws)).toBe(1);
    expect(barShare(1, ws)).toBe(0.08);
    expect(barShare(0, ws)).toBe(0);
    expect(barShare(1, [{ start: 0, n: 1 }])).toBe(0.5);
  });
});
