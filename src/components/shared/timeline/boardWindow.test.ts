/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `windowLeavesOf` — the window's two ends as calendar leaves (four-fixes §3).
 *
 * ⚠️ THE POINT OF THE FUNCTION IS THAT ITS OUTPUT DOES NOT VARY IN WIDTH, so the cases here are
 * about the two renderings naming the same days and about the one shape the header can draw. The
 * width itself is a measurement, not a source claim.
 */
import { describe, it, expect } from "vitest";
import { windowLeavesOf, windowRangeLabelOf } from "./boardWindow";
import { MON } from "../../../lib/queryCardFacts";

/** ninety days from a start, the way the board builds `visible` */
const window90 = (startYmd: string, days = 90): string[] => {
  const [y, m, d] = startYmd.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(y, m - 1, d + i);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
  }
  return out;
};

describe("the window's two ends, as leaves", () => {
  it("names the first and last day of the visible span", () => {
    const leaves = windowLeavesOf(window90("2026-07-30"));
    expect(leaves).toEqual({ from: { mon: "JUL", day: "30" }, to: { mon: "OCT", day: "27" } });
  });

  it("⚠️ the leaves and the sentence name the SAME two days — two renderings, one fact", () => {
    /* The winbar states the span in words and the Calendar header draws it as leaves. If they can
       disagree, one of them is lying about which ninety days the board is showing — so the case
       reconciles the two derivations against each other rather than against typed-out strings. */
    for (const start of ["2026-01-01", "2026-02-14", "2026-07-30", "2026-11-20", "2025-12-05"]) {
      const visible = window90(start);
      const leaves = windowLeavesOf(visible)!;
      const label = windowRangeLabelOf(visible);
      expect(leaves, `no leaves for ${start}`).not.toBeNull();
      /* "30 July – 27 October 2026" — the day numerals and the month initials, in order */
      const [a, b] = label.split(" – ");
      expect(a.startsWith(`${Number(leaves.from.day)} `), `"${a}" does not open on ${leaves.from.day}`).toBe(true);
      expect(a.toUpperCase().includes(leaves.from.mon), `"${a}" is not in ${leaves.from.mon}`).toBe(true);
      expect(b.startsWith(`${Number(leaves.to.day)} `), `"${b}" does not open on ${leaves.to.day}`).toBe(true);
      expect(b.toUpperCase().includes(leaves.to.mon), `"${b}" is not in ${leaves.to.mon}`).toBe(true);
    }
  });

  it("⚠️ the months come from `MON`, the table the cards' and the list's leaves already read", () => {
    /* A second array of month names is a second thing to keep in step, and these leaves sit on the
       same page as the ones that read this table. Every month the year can produce is checked, so
       an off-by-one in the month index cannot hide in a month nobody sampled. */
    for (let m = 1; m <= 12; m++) {
      const ymd = `2026-${String(m).padStart(2, "0")}-15`;
      const leaves = windowLeavesOf([ymd, ymd])!;
      expect(leaves.from.mon).toBe(MON[m - 1].toUpperCase());
      expect(leaves.from.day).toBe("15");
    }
  });

  it("an empty or unreadable window draws no leaves at all, rather than a wrong date", () => {
    expect(windowLeavesOf([])).toBeNull();
    expect(windowLeavesOf(["", ""])).toBeNull();
    expect(windowLeavesOf(["not-a-date", "2026-07-30"])).toBeNull();
  });

  it("a one-day window names that day twice — the arrow, not the function, says it is a span", () => {
    expect(windowLeavesOf(["2026-03-09"])).toEqual({ from: { mon: "MAR", day: "9" }, to: { mon: "MAR", day: "9" } });
  });
});
