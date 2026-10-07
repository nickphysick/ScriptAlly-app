/**
 * QC5 — the desk's London weeks (Query Centre v131 §2): Monday-start weeks by the London calendar. The
 * bars' counting cases RETIRED with v131.1, which replaced the bars with the running-count trend
 * (D6, `qcCourtHistory.test.ts`). The fixture straddles the clock
 * change of Sunday 26 October 2025 (BST → GMT at 02:00), and the now sits a week after it.
 */
import { describe, it, expect } from "vitest";
import { deskWeeks, weekLabel, weekStart, londonMidnight } from "./qcDeskWeeks";

/** Mon 3 Nov 2025, 12:00 GMT — the week after the clock change. */
const NOW = Date.parse("2025-11-03T12:00:00Z");
const at = (iso: string) => Date.parse(iso);

describe("QC5 · weeks start on Monday by the London calendar", () => {
  it("the week holding a moment starts at London Monday 00:00 — across BST and GMT", () => {
    /* Sun 26 Oct 2025 23:30 GMT is still the week of Mon 20 Oct; Mon 27 Oct 00:30 GMT starts the next */
    expect(weekStart(at("2025-10-26T23:30:00Z"))).toBe(at("2025-10-19T23:00:00Z")); // Mon 20 Oct 00:00 BST
    expect(weekStart(at("2025-10-27T00:30:00Z"))).toBe(at("2025-10-27T00:00:00Z")); // Mon 27 Oct 00:00 GMT
    /* 00:30 BST on a Monday is still SUNDAY in UTC — and it belongs to Monday's week */
    expect(weekStart(at("2025-10-19T23:30:00Z"))).toBe(at("2025-10-19T23:00:00Z"));
  });
  it("London midnight resolves the offset rather than assuming one", () => {
    expect(londonMidnight(2025, 10, 20)).toBe(at("2025-10-19T23:00:00Z")); // BST
    expect(londonMidnight(2025, 10, 27)).toBe(at("2025-10-27T00:00:00Z")); // GMT
  });
  it("twelve weeks, oldest first, the current week last, each a London Monday", () => {
    const w = deskWeeks(NOW);
    expect(w.length).toBe(12);
    expect(w[11]).toBe(at("2025-11-03T00:00:00Z"));
    expect(w[10]).toBe(at("2025-10-27T00:00:00Z"));
    expect(w[9]).toBe(at("2025-10-19T23:00:00Z")); // the week before the change: 169 hours long
    expect(w[0]).toBe(at("2025-08-17T23:00:00Z")); // Mon 18 Aug, BST — eleven calendar weeks back
    expect(weekLabel(w[0])).toBe("W/C 18 AUG");
    expect(weekLabel(w[11])).toBe("W/C 3 NOV");
  });
});
